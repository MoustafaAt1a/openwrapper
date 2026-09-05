//! The SQLite-backed store — one of two `PaymentStore` implementations
//! (see `store/mod.rs`). Correct and sufficient for a **single gateway
//! process**.
//!
//! # Why SQLite was v0.1.0's original (and remains a supported) choice
//! §11 is explicit: "do not use an in-memory map as production-grade
//! durable idempotency. Do not introduce a distributed database or Redis
//! merely to solve this. First define the invariant; then choose the
//! smallest persistence mechanism required." The invariant (see
//! `begin_payment`) is: under concurrent callers using the *same*
//! idempotency key, exactly one may proceed. A single `SQLite` database
//! file with a `UNIQUE` constraint on `idempotency_key`, accessed through
//! one connection guarded by a mutex, gives us that atomicity for free
//! from the database engine itself — no application-level locking, no
//! separate coordination service, and it survives a process restart
//! (which an in-memory `HashMap` cannot). `rusqlite`'s `bundled` feature
//! vendors SQLite itself, so there's no system dependency.
//!
//! This remains the right default for anyone running a single gateway
//! instance (the common case for someone trying this project out): zero
//! extra infrastructure to stand up. It genuinely does not coordinate
//! multiple gateway replicas sharing one file — for that, use
//! [`super::postgres::PostgresStore`] instead. Which one to use is an
//! operator's deployment-topology decision, not a code change — see
//! `main.rs::open_store` and `docs/DEPLOYMENT.md`.

use crate::store::{
    internal_err, parse_status, BeginOutcome, PaymentStore, TransitionOutcome, WebhookApplyOutcome,
};
use async_trait::async_trait;
use openwrapper_core::idempotency::{IdempotencyDecision, IdempotencyRecord, RequestFingerprint};
use openwrapper_core::{
    Currency, IdempotencyKey, IdempotencyStore, Money, OpenWrapperError, Payment, PaymentId,
    PaymentNextAction, PaymentRequest, PaymentStatus, ProviderId, ProviderReference,
};
use rusqlite::{params, Connection, OptionalExtension};
use std::sync::Mutex;
use time::OffsetDateTime;

pub struct SqliteStore {
    conn: Mutex<Connection>,
}

impl SqliteStore {
    pub fn open(path: &str) -> Result<Self, OpenWrapperError> {
        let conn = Connection::open(path).map_err(|e| internal_err("open sqlite", e))?;
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| internal_err("set WAL", e))?;
        conn.pragma_update(None, "synchronous", "NORMAL")
            .map_err(|e| internal_err("set synchronous NORMAL", e))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|e| internal_err("enable fk", e))?;
        // Our own Mutex<Connection> already serializes access from within
        // this process, but a busy_timeout is cheap insurance against
        // "database is locked" errors from any external process that
        // might briefly open the same file (a backup tool, `sqlite3` for
        // manual inspection, etc.) — real-world hosting hygiene, not a
        // correctness requirement of the idempotency invariant itself.
        conn.pragma_update(None, "busy_timeout", 5000)
            .map_err(|e| internal_err("set busy_timeout", e))?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS payments (
                id                  TEXT PRIMARY KEY,
                idempotency_key     TEXT NOT NULL UNIQUE,
                request_fingerprint TEXT NOT NULL,
                provider            TEXT NOT NULL,
                provider_reference  TEXT,
                status              TEXT NOT NULL,
                amount_minor_units  INTEGER NOT NULL,
                currency            TEXT NOT NULL,
                merchant_reference  TEXT,
                next_action_json    TEXT,
                user_id             TEXT,
                api_key_id          INTEGER,
                created_at          TEXT NOT NULL,
                updated_at          TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_payments_user_id
                ON payments (user_id);

            CREATE INDEX IF NOT EXISTS idx_payments_provider_ref
                ON payments (provider, provider_reference);

            CREATE INDEX IF NOT EXISTS idx_payments_status_updated
                ON payments (status, updated_at);

            -- Webhook delivery deduplication (§12). Primary key on
            -- event_id is the entire mechanism: a second delivery with the
            -- same event_id fails the INSERT and is treated as a
            -- known-duplicate, never reapplied.
            CREATE TABLE IF NOT EXISTS webhook_events (
                event_id     TEXT PRIMARY KEY,
                provider     TEXT NOT NULL,
                payment_id   TEXT,
                received_at  TEXT NOT NULL
            );

            -- Hashed API key authentication table
            CREATE TABLE IF NOT EXISTS api_keys (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                userId       TEXT,
                name         TEXT,
                keyHash      TEXT NOT NULL UNIQUE,
                prefix       TEXT,
                lastFour     TEXT,
                createdAt    TEXT NOT NULL,
                lastUsedAt   TEXT,
                revokedAt    TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_api_keys_hash
                ON api_keys (keyHash);
            "#,
        )
        .map_err(|e| internal_err("create schema", e))?;

        let _ = conn.execute("ALTER TABLE payments ADD COLUMN user_id TEXT", []);
        let _ = conn.execute("ALTER TABLE payments ADD COLUMN api_key_id INTEGER", []);

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    #[cfg(test)]
    pub fn open_in_memory() -> Self {
        Self::open(":memory:").expect("in-memory sqlite always opens")
    }

    /// Atomically claims an idempotency key and, on first use, persists a
    /// full "pending" payment shell built from `request` — not just
    /// idempotency bookkeeping, since every field needed is already known
    /// at request time. Implements §11's required invariant: same key +
    /// same fingerprint -> the existing record; same key + different
    /// fingerprint -> deterministic conflict; concurrent same-key callers
    /// -> exactly one wins the `UNIQUE` insert.
    pub fn begin_payment(
        &self,
        request: &PaymentRequest,
    ) -> Result<BeginOutcome, OpenWrapperError> {
        self.begin_payment_with_owner(request, None)
    }

    pub fn begin_payment_with_owner(
        &self,
        request: &PaymentRequest,
        owner: Option<&crate::store::ApiKeyInfo>,
    ) -> Result<BeginOutcome, OpenWrapperError> {
        let fingerprint = RequestFingerprint::of(request)?;
        let payment_id = PaymentId::new();
        let now = OffsetDateTime::now_utc();
        let now_str = now
            .format(&time::format_description::well_known::Rfc3339)
            .map_err(|e| internal_err("format time", e))?;
        let user_id = owner.and_then(|o| o.user_id.as_deref());
        let api_key_id = owner.map(|o| o.id);

        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let insert = conn.execute(
            "INSERT INTO payments
                (id, idempotency_key, request_fingerprint, provider, provider_reference,
                 status, amount_minor_units, currency, merchant_reference, next_action_json,
                 user_id, api_key_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, NULL, ?9, ?10, ?11, ?11)",
            params![
                payment_id.to_string(),
                request.idempotency_key.as_str(),
                fingerprint.as_str(),
                request.provider.as_str(),
                PaymentStatus::Pending.to_string(),
                request.amount.minor_units(),
                request.amount.currency().code(),
                request.merchant_reference,
                user_id,
                api_key_id,
                now_str,
            ],
        );

        match insert {
            Ok(_) => Ok(BeginOutcome::Proceed { payment_id }),
            Err(rusqlite::Error::SqliteFailure(e, _))
                if e.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                let existing = self
                    .get_by_idempotency_key(&conn, &request.idempotency_key)?
                    .ok_or_else(|| {
                        internal_err("constraint violated but row missing", "unreachable")
                    })?;
                if existing.1.as_str() == fingerprint.as_str() {
                    Ok(BeginOutcome::ReturnExisting(existing.0))
                } else {
                    Ok(BeginOutcome::Conflict)
                }
            }
            Err(e) => Err(internal_err("insert payment", e)),
        }
    }

    pub fn record_creation_result(
        &self,
        payment_id: &PaymentId,
        provider_reference: &ProviderReference,
        status: PaymentStatus,
        next_action: Option<&PaymentNextAction>,
    ) -> Result<(), OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let next_action_json = next_action
            .map(serde_json::to_string)
            .transpose()
            .map_err(|e| internal_err("serialize next_action", e))?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let current: Option<(String, Option<String>)> = conn
            .query_row(
                "SELECT status, provider_reference FROM payments WHERE id = ?1",
                params![payment_id.to_string()],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|e| internal_err("select payment before creation result", e))?;
        let Some((current_status, current_reference)) = current else {
            return Err(internal_err("record creation result", "payment not found"));
        };
        let current_status = parse_status(&current_status)?;
        current_status
            .validate_transition(status)
            .map_err(|e| internal_err("invalid creation transition", e))?;
        if current_reference
            .as_deref()
            .is_some_and(|r| r != provider_reference.as_str())
        {
            return Err(internal_err(
                "record creation result",
                "provider reference already differs",
            ));
        }

        let updated = conn
            .execute(
                "UPDATE payments SET provider_reference = ?1, status = ?2, next_action_json = ?3, updated_at = ?4 WHERE id = ?5",
                params![
                    provider_reference.as_str(),
                    status.to_string(),
                    next_action_json,
                    now_str,
                    payment_id.to_string(),
                ],
            )
            .map_err(|e| internal_err("update payment", e))?;
        if updated != 1 {
            return Err(internal_err("record creation result", "payment vanished"));
        }
        Ok(())
    }

    /// Atomically deduplicates and applies a verified webhook. The event id
    /// is committed only when a matching payment exists, preventing an early
    /// delivery from being permanently consumed before payment creation is
    /// stored.
    pub fn apply_webhook_event(
        &self,
        event_id: &str,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<WebhookApplyOutcome, OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let mut conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let tx = conn
            .transaction()
            .map_err(|e| internal_err("begin webhook transaction", e))?;

        let row = tx
            .query_row(
                "SELECT id, status, amount_minor_units FROM payments WHERE provider = ?1 AND provider_reference = ?2",
                params![provider.as_str(), provider_reference.as_str()],
                |r| {
                    let id: String = r.get(0)?;
                    let status: String = r.get(1)?;
                    let amount: i64 = r.get(2)?;
                    Ok((id, status, amount))
                },
            )
            .optional()
            .map_err(|e| internal_err("select payment for webhook", e))?;

        let Some((id, current_status_str, stored_amount)) = row else {
            return Ok(WebhookApplyOutcome::PaymentNotFound);
        };

        let inserted = match tx.execute(
            "INSERT INTO webhook_events (event_id, provider, payment_id, received_at) VALUES (?1, ?2, ?3, ?4)",
            params![event_id, provider.as_str(), &id, &now_str],
        ) {
            Ok(rows) => rows,
            Err(rusqlite::Error::SqliteFailure(e, _))
                if e.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                return Ok(WebhookApplyOutcome::Duplicate);
            }
            Err(e) => return Err(internal_err("insert webhook_event", e)),
        };
        debug_assert_eq!(inserted, 1);

        let current_status = parse_status(&current_status_str)?;
        let outcome = if let Some(reported) = reported_amount_minor_units {
            if reported != stored_amount {
                TransitionOutcome::AmountMismatch {
                    stored: stored_amount,
                    reported,
                }
            } else {
                apply_sqlite_transition(&tx, &id, current_status, reported_status, &now_str)?
            }
        } else {
            apply_sqlite_transition(&tx, &id, current_status, reported_status, &now_str)?
        };

        tx.commit()
            .map_err(|e| internal_err("commit webhook transaction", e))?;
        Ok(WebhookApplyOutcome::Transition(outcome))
    }

    /// Moves a still-`Pending` payment straight to a terminal status with
    /// no provider reference, for the case where `create_payment` failed
    /// in a way that is *certain* to mean the provider never processed it
    /// (see `OpenWrapperError::is_definite_non_occurrence`). Goes through
    /// the same `validate_transition` check as every other write — this
    /// is not a bypass, just a call site that doesn't have a
    /// `provider_reference` or reported amount to also persist.
    pub fn mark_terminal_without_provider_reference(
        &self,
        payment_id: &PaymentId,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError> {
        assert!(
            status.is_terminal(),
            "this helper is only for Failed; use mark_unknown for the ambiguous case"
        );
        self.update_status_only(payment_id, status)
    }

    /// Moves a still-`Pending` payment to `Unknown` when `create_payment`
    /// failed ambiguously (timeout, network error, or a provider-side
    /// error that doesn't rule out the provider having received the
    /// request). This is invariant I5 made concrete: the payment is never
    /// silently left `Pending` forever nor incorrectly marked `Failed`.
    pub fn mark_unknown(&self, payment_id: &PaymentId) -> Result<(), OpenWrapperError> {
        self.update_status_only(payment_id, PaymentStatus::Unknown)
    }

    /// Used by reconciliation (§13, GET /v1/payments/:id): applies the
    /// result of an authenticated provider status inquiry — an operation
    /// OpenWrapper itself initiated over TLS with its own credentials, not
    /// attacker-suppliable input — so unlike webhook transitions this does
    /// not require an amount cross-check.
    pub fn apply_reconciliation_result(
        &self,
        payment_id: &PaymentId,
        resolved_status: PaymentStatus,
    ) -> Result<TransitionOutcome, OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let current_status: Option<String> = conn
            .query_row(
                "SELECT status FROM payments WHERE id = ?1",
                params![payment_id.to_string()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| internal_err("select payment for reconciliation", e))?;
        let current_status = parse_status(
            &current_status.ok_or_else(|| internal_err("reconcile", "payment not found"))?,
        )?;

        match current_status.validate_transition(resolved_status) {
            Ok(()) if current_status == resolved_status => Ok(TransitionOutcome::NoOp),
            Ok(()) => {
                conn.execute(
                    "UPDATE payments SET status = ?1, updated_at = ?2 WHERE id = ?3",
                    params![resolved_status.to_string(), now_str, payment_id.to_string()],
                )
                .map_err(|e| internal_err("apply reconciliation result", e))?;
                Ok(TransitionOutcome::Applied {
                    payment_id: *payment_id,
                    from: current_status,
                    to: resolved_status,
                })
            }
            Err(illegal) => Ok(TransitionOutcome::Illegal {
                from: illegal.from,
                to: illegal.to,
            }),
        }
    }

    fn update_status_only(
        &self,
        payment_id: &PaymentId,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let current_status: Option<String> = conn
            .query_row(
                "SELECT status FROM payments WHERE id = ?1",
                params![payment_id.to_string()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| internal_err("select payment before status update", e))?;
        let current_status = parse_status(
            &current_status.ok_or_else(|| internal_err("update status", "payment not found"))?,
        )?;
        current_status
            .validate_transition(status)
            .map_err(|e| internal_err("invalid status transition", e))?;
        conn.execute(
            "UPDATE payments SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status.to_string(), now_str, payment_id.to_string()],
        )
        .map_err(|e| internal_err("update status", e))?;
        Ok(())
    }

    /// Cheapest possible proof the store is actually usable — for
    /// `GET /v1/ready`, distinct from `/v1/health`'s "is the process up at
    /// all" check. A real hosting platform (Docker healthcheck, k8s
    /// readiness probe, a load balancer) should point at `/v1/ready`, not
    /// `/v1/health`, before routing traffic to this instance.
    pub fn ping(&self) -> Result<(), OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        conn.query_row("SELECT 1", [], |_| Ok(()))
            .map_err(|e| internal_err("ping", e))
    }

    /// Payments still `Unknown` after at least `min_age` — the query
    /// behind the background reconciliation loop (`reconciler.rs`). The
    /// age floor exists so a payment that became `Unknown` a millisecond
    /// ago isn't immediately re-queried in the same tick it was created —
    /// give the normal `GET /v1/payments/:id`-triggered reconciliation (or
    /// an imminent webhook) a chance first.
    pub fn list_stale_unknown_payments(
        &self,
        min_age: time::Duration,
        limit: i64,
    ) -> Result<Vec<Payment>, OpenWrapperError> {
        let cutoff = (OffsetDateTime::now_utc() - min_age)
            .format(&time::format_description::well_known::Rfc3339)
            .map_err(|e| internal_err("format cutoff", e))?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, idempotency_key, provider, provider_reference, status,
                        amount_minor_units, currency, merchant_reference, created_at, updated_at
                 FROM payments
                 WHERE status = 'unknown' AND updated_at < ?1 AND provider_reference IS NOT NULL
                 ORDER BY updated_at ASC
                 LIMIT ?2",
            )
            .map_err(|e| internal_err("prepare list_stale_unknown", e))?;

        let rows = stmt
            .query_map(params![cutoff, limit], row_to_payment)
            .map_err(|e| internal_err("query list_stale_unknown", e))?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| internal_err("read payment row", e))?);
        }
        Ok(out)
    }

    pub fn touch_reconciliation_attempt(
        &self,
        payment_id: &PaymentId,
    ) -> Result<(), OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        conn.execute(
            "UPDATE payments SET updated_at = ?1 WHERE id = ?2 AND status = 'unknown'",
            params![now_str, payment_id.to_string()],
        )
        .map_err(|e| internal_err("touch reconciliation attempt", e))?;
        Ok(())
    }

    pub fn get_payment(&self, payment_id: &PaymentId) -> Result<Option<Payment>, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        conn.query_row(
            "SELECT id, idempotency_key, provider, provider_reference, status,
                    amount_minor_units, currency, merchant_reference, created_at, updated_at
             FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            row_to_payment,
        )
        .optional()
        .map_err(|e| internal_err("select payment", e))
    }

    pub fn get_next_action(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<PaymentNextAction>, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let serialized: Option<String> = conn
            .query_row(
                "SELECT next_action_json FROM payments WHERE id = ?1",
                params![payment_id.to_string()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| internal_err("select next action", e))?
            .flatten();
        serialized
            .map(|value| {
                serde_json::from_str(&value).map_err(|e| internal_err("parse next action", e))
            })
            .transpose()
    }

    pub fn find_api_key(
        &self,
        key_hash: &str,
    ) -> Result<Option<crate::store::ApiKeyInfo>, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let row: Option<(i64, Option<String>)> = conn
            .query_row(
                "SELECT id, userId FROM api_keys WHERE keyHash = ?1 AND revokedAt IS NULL LIMIT 1",
                params![key_hash],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .map_err(|e| internal_err("find_api_key", e))?;

        if let Some((id, user_id)) = row {
            let now_str = now_rfc3339()?;
            let _ = conn.execute(
                "UPDATE api_keys SET lastUsedAt = ?1 WHERE id = ?2",
                params![now_str, id],
            );
            return Ok(Some(crate::store::ApiKeyInfo { id, user_id }));
        }

        Ok(None)
    }

    fn get_by_idempotency_key(
        &self,
        conn: &Connection,
        key: &IdempotencyKey,
    ) -> Result<Option<(Payment, RequestFingerprint)>, OpenWrapperError> {
        conn.query_row(
            "SELECT id, idempotency_key, provider, provider_reference, status,
                    amount_minor_units, currency, merchant_reference, created_at, updated_at,
                    request_fingerprint
             FROM payments WHERE idempotency_key = ?1",
            params![key.as_str()],
            |r| {
                let payment = row_to_payment(r)?;
                let fingerprint: String = r.get(10)?;
                Ok((payment, RequestFingerprint::from_stored(fingerprint)))
            },
        )
        .optional()
        .map_err(|e| internal_err("select by idempotency key", e))
    }
}

fn now_rfc3339() -> Result<String, OpenWrapperError> {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .map_err(|e| internal_err("format time", e))
}

fn apply_sqlite_transition(
    tx: &rusqlite::Transaction<'_>,
    id: &str,
    current_status: PaymentStatus,
    reported_status: PaymentStatus,
    now: &str,
) -> Result<TransitionOutcome, OpenWrapperError> {
    if current_status == reported_status {
        return Ok(TransitionOutcome::NoOp);
    }
    match current_status.validate_transition(reported_status) {
        Ok(()) => {
            let updated = tx
                .execute(
                    "UPDATE payments SET status = ?1, updated_at = ?2 WHERE id = ?3",
                    params![reported_status.to_string(), now, id],
                )
                .map_err(|e| internal_err("apply webhook transition", e))?;
            if updated != 1 {
                return Err(internal_err("apply webhook transition", "payment vanished"));
            }
            Ok(TransitionOutcome::Applied {
                payment_id: id.parse().map_err(|_| internal_err("parse id", "bad id"))?,
                from: current_status,
                to: reported_status,
            })
        }
        Err(illegal) => Ok(TransitionOutcome::Illegal {
            from: illegal.from,
            to: illegal.to,
        }),
    }
}

fn row_to_payment(r: &rusqlite::Row) -> rusqlite::Result<Payment> {
    parse_payment_row(r).map_err(|e| {
        rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            e.to_string(),
        )))
    })
}

fn parse_payment_row(r: &rusqlite::Row) -> Result<Payment, OpenWrapperError> {
    let id: String = r.get(0).map_err(|e| internal_err("row id", e))?;
    let idempotency_key: String = r
        .get(1)
        .map_err(|e| internal_err("row idempotency_key", e))?;
    let provider: String = r.get(2).map_err(|e| internal_err("row provider", e))?;
    let provider_reference: Option<String> = r
        .get(3)
        .map_err(|e| internal_err("row provider_reference", e))?;
    let status: String = r.get(4).map_err(|e| internal_err("row status", e))?;
    let amount_minor_units: i64 = r
        .get(5)
        .map_err(|e| internal_err("row amount_minor_units", e))?;
    let currency: String = r.get(6).map_err(|e| internal_err("row currency", e))?;
    let merchant_reference: Option<String> = r
        .get(7)
        .map_err(|e| internal_err("row merchant_reference", e))?;
    let created_at: String = r.get(8).map_err(|e| internal_err("row created_at", e))?;
    let updated_at: String = r.get(9).map_err(|e| internal_err("row updated_at", e))?;

    let currency_parsed =
        Currency::parse(&currency).map_err(|e| internal_err("corrupt currency column", e))?;

    Ok(Payment {
        id: id
            .parse()
            .map_err(|e| internal_err("corrupt payment id", e))?,
        idempotency_key: IdempotencyKey::parse(&idempotency_key)
            .map_err(|e| internal_err("corrupt idempotency_key", e))?,
        provider: ProviderId::parse(&provider).map_err(|e| internal_err("corrupt provider", e))?,
        provider_reference: provider_reference.map(ProviderReference::new),
        status: parse_status(&status).map_err(|e| internal_err("corrupt status", e))?,
        amount: Money::from_minor_units(amount_minor_units, currency_parsed)
            .map_err(|e| internal_err("corrupt amount", e))?,
        currency: currency_parsed,
        merchant_reference,
        created_at: OffsetDateTime::parse(
            &created_at,
            &time::format_description::well_known::Rfc3339,
        )
        .map_err(|e| internal_err("corrupt created_at", e))?,
        updated_at: OffsetDateTime::parse(
            &updated_at,
            &time::format_description::well_known::Rfc3339,
        )
        .map_err(|e| internal_err("corrupt updated_at", e))?,
    })
}

/// Conformance to core's `IdempotencyStore` contract, so the trait defined
/// in `openwrapper-core` has at least one real implementation proving it's
/// satisfiable — not just an interface nothing implements. The gateway's
/// HTTP handler uses the richer `PaymentStore` methods below directly (they
/// carry the full `PaymentRequest`, which `IdempotencyStore`'s narrower
/// signature intentionally does not require of every possible store).
#[async_trait]
impl IdempotencyStore for SqliteStore {
    async fn begin(
        &self,
        key: &IdempotencyKey,
        fingerprint: &RequestFingerprint,
    ) -> Result<IdempotencyDecision, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        if let Some((payment, existing_fp)) = self.get_by_idempotency_key(&conn, key)? {
            return Ok(if existing_fp.as_str() == fingerprint.as_str() {
                IdempotencyDecision::ReturnExisting(IdempotencyRecord {
                    key: key.clone(),
                    payment_id: payment.id,
                    fingerprint: fingerprint.clone(),
                    status: payment.status,
                })
            } else {
                IdempotencyDecision::Conflict
            });
        }
        // No existing minimal-shell row for a bare trait-level `begin` —
        // this path is intentionally unused by the gateway's real handler
        // (which calls `begin_payment` with the full request instead) and
        // exists only so `SqliteStore` type-checks as a complete
        // `IdempotencyStore`. Returns an error rather than silently
        // inserting a schema-incomplete row.
        Err(OpenWrapperError::Internal {
            correlation_id: openwrapper_core::error::new_correlation_id(),
        })
    }

    async fn complete(
        &self,
        key: &IdempotencyKey,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        conn.execute(
            "UPDATE payments SET status = ?1, updated_at = ?2 WHERE idempotency_key = ?3",
            params![status.to_string(), now_str, key.as_str()],
        )
        .map_err(|e| internal_err("complete", e))?;
        Ok(())
    }

    async fn get(
        &self,
        key: &IdempotencyKey,
    ) -> Result<Option<IdempotencyRecord>, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        Ok(self
            .get_by_idempotency_key(&conn, key)?
            .map(|(payment, fp)| IdempotencyRecord {
                key: key.clone(),
                payment_id: payment.id,
                fingerprint: fp,
                status: payment.status,
            }))
    }
}

/// `PaymentStore` conformance. Every method here is a thin `async`
/// wrapper around the synchronous inherent method of the same name
/// defined above (rusqlite is a synchronous API — see this module's docs
/// for why that's an accepted trade-off at this scale). This is legal and
/// unambiguous in Rust: a direct call like `store.begin_payment(..)` on a
/// concrete `SqliteStore` (as this file's own `#[test]`s do, synchronously,
/// unchanged) resolves to the inherent method; a call through
/// `Arc<dyn PaymentStore>` (as `handlers.rs`/`reconciler.rs` do, with
/// `.await`) resolves to this trait method. Both paths run the exact same
/// code — there is no behavioral difference, only a calling-convention one.
#[async_trait]
impl PaymentStore for SqliteStore {
    async fn begin_payment(
        &self,
        request: &PaymentRequest,
    ) -> Result<BeginOutcome, OpenWrapperError> {
        SqliteStore::begin_payment(self, request)
    }

    async fn begin_payment_with_owner(
        &self,
        request: &PaymentRequest,
        owner: Option<&crate::store::ApiKeyInfo>,
    ) -> Result<BeginOutcome, OpenWrapperError> {
        SqliteStore::begin_payment_with_owner(self, request, owner)
    }

    async fn record_creation_result(
        &self,
        payment_id: &PaymentId,
        provider_reference: &ProviderReference,
        status: PaymentStatus,
        next_action: Option<&PaymentNextAction>,
    ) -> Result<(), OpenWrapperError> {
        SqliteStore::record_creation_result(
            self,
            payment_id,
            provider_reference,
            status,
            next_action,
        )
    }

    async fn apply_webhook_event(
        &self,
        event_id: &str,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<WebhookApplyOutcome, OpenWrapperError> {
        SqliteStore::apply_webhook_event(
            self,
            event_id,
            provider,
            provider_reference,
            reported_status,
            reported_amount_minor_units,
        )
    }

    async fn mark_terminal_without_provider_reference(
        &self,
        payment_id: &PaymentId,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError> {
        SqliteStore::mark_terminal_without_provider_reference(self, payment_id, status)
    }

    async fn mark_unknown(&self, payment_id: &PaymentId) -> Result<(), OpenWrapperError> {
        SqliteStore::mark_unknown(self, payment_id)
    }

    async fn apply_reconciliation_result(
        &self,
        payment_id: &PaymentId,
        resolved_status: PaymentStatus,
    ) -> Result<TransitionOutcome, OpenWrapperError> {
        SqliteStore::apply_reconciliation_result(self, payment_id, resolved_status)
    }

    async fn get_payment(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<Payment>, OpenWrapperError> {
        SqliteStore::get_payment(self, payment_id)
    }

    async fn get_next_action(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<PaymentNextAction>, OpenWrapperError> {
        SqliteStore::get_next_action(self, payment_id)
    }

    async fn list_stale_unknown_payments(
        &self,
        min_age: time::Duration,
        limit: i64,
    ) -> Result<Vec<Payment>, OpenWrapperError> {
        SqliteStore::list_stale_unknown_payments(self, min_age, limit)
    }

    async fn touch_reconciliation_attempt(
        &self,
        payment_id: &PaymentId,
    ) -> Result<(), OpenWrapperError> {
        SqliteStore::touch_reconciliation_attempt(self, payment_id)
    }

    async fn find_api_key(
        &self,
        key_hash: &str,
    ) -> Result<Option<crate::store::ApiKeyInfo>, OpenWrapperError> {
        SqliteStore::find_api_key(self, key_hash)
    }

    async fn validate_api_key_hash(&self, key_hash: &str) -> Result<bool, OpenWrapperError> {
        Ok(SqliteStore::find_api_key(self, key_hash)?.is_some())
    }

    async fn ping(&self) -> Result<(), OpenWrapperError> {
        SqliteStore::ping(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openwrapper_core::{Currency, CustomerDetails, Money};

    fn sample_request(idem: &str, amount_minor: i64) -> PaymentRequest {
        PaymentRequest {
            idempotency_key: IdempotencyKey::parse(idem).unwrap(),
            provider: ProviderId::parse("paymob").unwrap(),
            amount: Money::from_minor_units(amount_minor, Currency::Egp).unwrap(),
            customer: CustomerDetails {
                phone: "+201234567890".into(),
                email: None,
                full_name: None,
            },
            merchant_reference: None,
            description: None,
            return_url: None,
            metadata: Default::default(),
        }
    }

    #[test]
    fn first_call_proceeds_second_identical_call_returns_existing() {
        let store = SqliteStore::open_in_memory();
        let req = sample_request("k1", 1000);

        let first = store.begin_payment(&req).unwrap();
        let payment_id = match first {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => panic!("expected Proceed on first call"),
        };

        // Same key, same body again — simulates a client retry.
        let second = store.begin_payment(&req).unwrap();
        match second {
            BeginOutcome::ReturnExisting(payment) => assert_eq!(payment.id, payment_id),
            _ => panic!("expected ReturnExisting on retry with identical body"),
        }
    }

    #[test]
    fn same_key_different_body_is_a_deterministic_conflict() {
        let store = SqliteStore::open_in_memory();
        store.begin_payment(&sample_request("k1", 1000)).unwrap();
        let second = store.begin_payment(&sample_request("k1", 2000)).unwrap();
        assert!(matches!(second, BeginOutcome::Conflict));
    }

    #[test]
    fn concurrent_identical_requests_only_one_proceeds() {
        use std::sync::Arc;
        use std::thread;

        let store = Arc::new(SqliteStore::open_in_memory());
        let mut handles = vec![];
        for _ in 0..8 {
            let store = Arc::clone(&store);
            handles.push(thread::spawn(move || {
                store
                    .begin_payment(&sample_request("concurrent-key", 500))
                    .unwrap()
            }));
        }
        let outcomes: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
        let proceed_count = outcomes
            .iter()
            .filter(|o| matches!(o, BeginOutcome::Proceed { .. }))
            .count();
        assert_eq!(
            proceed_count, 1,
            "exactly one concurrent caller with the same idempotency key must proceed"
        );
    }

    #[test]
    fn webhook_event_dedup_only_admits_first_delivery() {
        let store = SqliteStore::open_in_memory();
        let provider = ProviderId::parse("paymob").unwrap();
        let payment_id = match store.begin_payment(&sample_request("dedup", 1000)).unwrap() {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => unreachable!(),
        };
        let reference = ProviderReference::new("txn-dedup");
        store
            .record_creation_result(&payment_id, &reference, PaymentStatus::Pending, None)
            .unwrap();

        assert!(matches!(
            store
                .apply_webhook_event(
                    "evt-1",
                    &provider,
                    &reference,
                    PaymentStatus::Succeeded,
                    Some(1000),
                )
                .unwrap(),
            WebhookApplyOutcome::Transition(TransitionOutcome::Applied { .. })
        ));
        assert!(matches!(
            store
                .apply_webhook_event(
                    "evt-1",
                    &provider,
                    &reference,
                    PaymentStatus::Succeeded,
                    Some(1000),
                )
                .unwrap(),
            WebhookApplyOutcome::Duplicate
        ));
    }

    #[test]
    fn webhook_for_missing_payment_does_not_consume_event_id() {
        let store = SqliteStore::open_in_memory();
        let provider = ProviderId::parse("paymob").unwrap();
        let reference = ProviderReference::new("txn-late");
        assert!(matches!(
            store
                .apply_webhook_event(
                    "evt-late",
                    &provider,
                    &reference,
                    PaymentStatus::Succeeded,
                    Some(1000),
                )
                .unwrap(),
            WebhookApplyOutcome::PaymentNotFound
        ));

        let payment_id = match store.begin_payment(&sample_request("late", 1000)).unwrap() {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => unreachable!(),
        };
        store
            .record_creation_result(&payment_id, &reference, PaymentStatus::Pending, None)
            .unwrap();
        assert!(matches!(
            store
                .apply_webhook_event(
                    "evt-late",
                    &provider,
                    &reference,
                    PaymentStatus::Succeeded,
                    Some(1000),
                )
                .unwrap(),
            WebhookApplyOutcome::Transition(TransitionOutcome::Applied { .. })
        ));
    }

    #[test]
    fn webhook_transition_is_rejected_when_amount_does_not_match_stored_payment() {
        let store = SqliteStore::open_in_memory();
        let req = sample_request("k1", 1000);
        let payment_id = match store.begin_payment(&req).unwrap() {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => unreachable!(),
        };
        let reference = ProviderReference::new("txn-abc");
        store
            .record_creation_result(&payment_id, &reference, PaymentStatus::Pending, None)
            .unwrap();

        let outcome = store
            .apply_webhook_event(
                "evt-mismatch",
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Succeeded,
                Some(9999), // does not match the 1000 stored above
            )
            .unwrap();
        assert!(matches!(
            outcome,
            WebhookApplyOutcome::Transition(TransitionOutcome::AmountMismatch { .. })
        ));
    }

    #[test]
    fn webhook_transition_applies_when_amount_matches_and_transition_is_legal() {
        let store = SqliteStore::open_in_memory();
        let req = sample_request("k1", 1000);
        let payment_id = match store.begin_payment(&req).unwrap() {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => unreachable!(),
        };
        let reference = ProviderReference::new("txn-abc");
        store
            .record_creation_result(&payment_id, &reference, PaymentStatus::Pending, None)
            .unwrap();

        let outcome = store
            .apply_webhook_event(
                "evt-applied",
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Succeeded,
                Some(1000),
            )
            .unwrap();
        assert!(matches!(
            outcome,
            WebhookApplyOutcome::Transition(TransitionOutcome::Applied { .. })
        ));

        let stored = store.get_payment(&payment_id).unwrap().unwrap();
        assert_eq!(stored.status, PaymentStatus::Succeeded);
    }

    #[test]
    fn illegal_transition_is_reported_not_silently_applied() {
        let store = SqliteStore::open_in_memory();
        let req = sample_request("k1", 1000);
        let payment_id = match store.begin_payment(&req).unwrap() {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => unreachable!(),
        };
        let reference = ProviderReference::new("txn-abc");
        store
            .record_creation_result(&payment_id, &reference, PaymentStatus::Succeeded, None)
            .unwrap();

        // A provider claiming a previously-Succeeded payment is now
        // Failed is exactly the anomaly I13 requires rejecting outright.
        let outcome = store
            .apply_webhook_event(
                "evt-illegal",
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Failed,
                None,
            )
            .unwrap();
        assert!(matches!(
            outcome,
            WebhookApplyOutcome::Transition(TransitionOutcome::Illegal { .. })
        ));

        let stored = store.get_payment(&payment_id).unwrap().unwrap();
        assert_eq!(
            stored.status,
            PaymentStatus::Succeeded,
            "illegal transition must not mutate stored state"
        );
    }

    #[test]
    fn find_api_key_finds_unrevoked_key_and_updates_last_used() {
        let store = SqliteStore::open_in_memory();
        let key_hash = "abc123hash";
        {
            let conn = store.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO api_keys (userId, name, keyHash, prefix, lastFour, createdAt)
                 VALUES ('user_test_42', 'Test Key', ?1, 'ow_live', '1234', '2026-09-05T00:00:00Z')",
                [key_hash],
            )
            .unwrap();
        }

        let found = store
            .find_api_key(key_hash)
            .unwrap()
            .expect("key must be found");
        assert_eq!(found.user_id.as_deref(), Some("user_test_42"));
        assert!(found.id > 0);

        // Missing or revoked keys return None
        assert!(store.find_api_key("nonexistent").unwrap().is_none());
    }

    #[test]
    fn begin_payment_with_owner_persists_user_id_and_api_key_id() {
        let store = SqliteStore::open_in_memory();
        let req = sample_request("key_with_owner", 2500);
        let owner = crate::store::ApiKeyInfo {
            id: 99,
            user_id: Some("user_abc".to_string()),
        };

        let outcome = store.begin_payment_with_owner(&req, Some(&owner)).unwrap();
        let payment_id = match outcome {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => panic!("expected proceed"),
        };

        let conn = store.conn.lock().unwrap();
        let (user_id, api_key_id): (Option<String>, Option<i64>) = conn
            .query_row(
                "SELECT user_id, api_key_id FROM payments WHERE id = ?1",
                [payment_id.to_string()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();

        assert_eq!(user_id.as_deref(), Some("user_abc"));
        assert_eq!(api_key_id, Some(99));
    }
}
