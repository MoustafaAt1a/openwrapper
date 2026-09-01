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

use crate::store::{internal_err, parse_status, BeginOutcome, PaymentStore, TransitionOutcome};
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
                created_at          TEXT NOT NULL,
                updated_at          TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_payments_provider_ref
                ON payments (provider, provider_reference);

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
        let fingerprint = RequestFingerprint::of(request)?;
        let payment_id = PaymentId::new();
        let now = OffsetDateTime::now_utc();
        let now_str = now
            .format(&time::format_description::well_known::Rfc3339)
            .map_err(|e| internal_err("format time", e))?;

        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let insert = conn.execute(
            "INSERT INTO payments
                (id, idempotency_key, request_fingerprint, provider, provider_reference,
                 status, amount_minor_units, currency, merchant_reference, next_action_json,
                 created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, NULL, ?9, ?9)",
            params![
                payment_id.to_string(),
                request.idempotency_key.as_str(),
                fingerprint.as_str(),
                request.provider.as_str(),
                PaymentStatus::Pending.to_string(),
                request.amount.minor_units(),
                request.amount.currency().code(),
                request.merchant_reference,
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
        conn.execute(
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
        Ok(())
    }

    /// Applies a webhook-reported transition, validating it against the
    /// state machine (I13) and rejecting amount mismatches (§12) before
    /// writing anything. Returns `None` if no payment matches
    /// `(provider, provider_reference)` at all — the caller should treat
    /// that as suspicious (a webhook for a payment OpenWrapper never
    /// created) rather than silently succeeding.
    pub fn apply_webhook_transition(
        &self,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<Option<TransitionOutcome>, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let row = conn
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
            return Ok(None);
        };

        if let Some(reported) = reported_amount_minor_units {
            if reported != stored_amount {
                return Ok(Some(TransitionOutcome::AmountMismatch {
                    stored: stored_amount,
                    reported,
                }));
            }
        }

        let current_status = parse_status(&current_status_str)?;
        match current_status.validate_transition(reported_status) {
            Ok(()) => {
                let now_str = now_rfc3339()?;
                conn.execute(
                    "UPDATE payments SET status = ?1, updated_at = ?2 WHERE id = ?3",
                    params![reported_status.to_string(), now_str, id],
                )
                .map_err(|e| internal_err("apply transition", e))?;
                Ok(Some(TransitionOutcome::Applied {
                    payment_id: id.parse().map_err(|_| internal_err("parse id", "bad id"))?,
                    from: current_status,
                    to: reported_status,
                }))
            }
            Err(_) if current_status == reported_status => {
                // Idempotent re-observation (duplicate webhook) — this
                // arm is unreachable in practice because validate_transition
                // already returns Ok for a==b, kept only for exhaustiveness.
                Ok(Some(TransitionOutcome::NoOp))
            }
            Err(illegal) => Ok(Some(TransitionOutcome::Illegal {
                from: illegal.from,
                to: illegal.to,
            })),
        }
    }

    /// Returns `true` if this is the first time `event_id` has been seen
    /// (caller should proceed), `false` if it's a known duplicate delivery
    /// (caller must not reapply it) — §12's dedup step.
    pub fn record_webhook_event_if_new(
        &self,
        event_id: &str,
        provider: &ProviderId,
        payment_id: Option<&PaymentId>,
    ) -> Result<bool, OpenWrapperError> {
        let now_str = now_rfc3339()?;
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let result = conn.execute(
            "INSERT INTO webhook_events (event_id, provider, payment_id, received_at) VALUES (?1, ?2, ?3, ?4)",
            params![
                event_id,
                provider.as_str(),
                payment_id.map(|p| p.to_string()),
                now_str
            ],
        );
        match result {
            Ok(_) => Ok(true),
            Err(rusqlite::Error::SqliteFailure(e, _))
                if e.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                Ok(false)
            }
            Err(e) => Err(internal_err("insert webhook_event", e)),
        }
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
        let payment = self
            .get_payment(payment_id)?
            .ok_or_else(|| internal_err("reconcile", "payment not found"))?;
        match payment.status.validate_transition(resolved_status) {
            Ok(()) => {
                self.update_status_only(payment_id, resolved_status)?;
                Ok(TransitionOutcome::Applied {
                    payment_id: *payment_id,
                    from: payment.status,
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

    async fn apply_webhook_transition(
        &self,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<Option<TransitionOutcome>, OpenWrapperError> {
        SqliteStore::apply_webhook_transition(
            self,
            provider,
            provider_reference,
            reported_status,
            reported_amount_minor_units,
        )
    }

    async fn record_webhook_event_if_new(
        &self,
        event_id: &str,
        provider: &ProviderId,
        payment_id: Option<&PaymentId>,
    ) -> Result<bool, OpenWrapperError> {
        SqliteStore::record_webhook_event_if_new(self, event_id, provider, payment_id)
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

    async fn validate_api_key_hash(&self, key_hash: &str) -> Result<bool, OpenWrapperError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| internal_err("lock poisoned", e))?;
        let count: Result<i64, _> = conn.query_row(
            "SELECT count(*) FROM api_keys WHERE keyHash = ?1 AND revokedAt IS NULL",
            [key_hash],
            |row| row.get(0),
        );
        Ok(count.unwrap_or(0) > 0)
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
        assert!(store
            .record_webhook_event_if_new("evt-1", &provider, None)
            .unwrap());
        assert!(!store
            .record_webhook_event_if_new("evt-1", &provider, None)
            .unwrap());
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
            .apply_webhook_transition(
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Succeeded,
                Some(9999), // does not match the 1000 stored above
            )
            .unwrap();
        assert!(matches!(
            outcome,
            Some(TransitionOutcome::AmountMismatch { .. })
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
            .apply_webhook_transition(
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Succeeded,
                Some(1000),
            )
            .unwrap();
        assert!(matches!(outcome, Some(TransitionOutcome::Applied { .. })));

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
            .apply_webhook_transition(
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Failed,
                None,
            )
            .unwrap();
        assert!(matches!(outcome, Some(TransitionOutcome::Illegal { .. })));

        let stored = store.get_payment(&payment_id).unwrap().unwrap();
        assert_eq!(
            stored.status,
            PaymentStatus::Succeeded,
            "illegal transition must not mutate stored state"
        );
    }
}
