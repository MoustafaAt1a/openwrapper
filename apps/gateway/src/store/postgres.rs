//! The Postgres-backed store — the second `PaymentStore` implementation
//! (see `store/mod.rs`), and the one that makes running **multiple**
//! gateway instances behind a load balancer a supported configuration.
//!
//! # Why this exists (and why it didn't in the original v0.1.0)
//! SQLite's single-file, single-writer model is genuinely correct for one
//! process (proven — see `sqlite.rs`'s concurrent-threads test) but
//! cannot coordinate *multiple separate processes* each holding their own
//! connection to their own copy of the state. A real "host this for
//! people to test" deployment often wants more than one replica for
//! availability. Postgres solves exactly this: multiple gateway
//! instances, each with their own `sqlx::PgPool`, share one true source
//! of truth, and the same `UNIQUE` constraint that made SQLite's
//! single-process idempotency correct (§11) continues to correctly
//! serialize concurrent `INSERT`s **across process boundaries** — that's
//! not a new mechanism, it's the same one, just now enforced by a server
//! multiple clients can see instead of a file only one process has open.
//!
//! # Why `sqlx` here but plain `rusqlite` for SQLite
//! A single mutex-guarded connection is the *correct minimal* mechanism
//! for an embedded, single-writer database. It is not the correct
//! mechanism for a networked server multiple concurrent requests (and,
//! with multiple replicas, multiple processes) need to talk to
//! concurrently — that needs a real connection pool with health-checking
//! and reconnection, which is exactly what `sqlx::PgPool` is. Hand-rolling
//! a pool would be reinventing well-tested infrastructure for no benefit;
//! see `docs/DECISIONS.md`.

use crate::store::{
    internal_err, parse_status, BeginOutcome, PaymentStore, TransitionOutcome, WebhookApplyOutcome,
};
use async_trait::async_trait;
use openwrapper_core::idempotency::RequestFingerprint;
use openwrapper_core::{
    Currency, IdempotencyKey, Money, OpenWrapperError, Payment, PaymentId, PaymentNextAction,
    PaymentRequest, PaymentStatus, ProviderId, ProviderReference,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use time::OffsetDateTime;

pub struct PostgresStore {
    pool: PgPool,
}

/// PgBouncer transaction mode does not support prepared statement caching.
fn with_pgbouncer_params(database_url: &str) -> String {
    let via_pooler = database_url.contains("pgbouncer") || database_url.contains(":6432");
    if !via_pooler {
        return database_url.to_string();
    }
    if database_url.contains("statement_cache_mode=") {
        return database_url.to_string();
    }
    if database_url.contains('?') {
        format!("{database_url}&statement_cache_mode=describe")
    } else {
        format!("{database_url}?statement_cache_mode=describe")
    }
}

impl PostgresStore {
    /// Connects and runs schema setup. `database_url` is a standard
    /// `postgres://user:pass@host:port/dbname` URL.
    ///
    /// Schema setup is serialized with a Postgres advisory lock, held on
    /// one explicitly-checked-out connection for the duration. This is
    /// not defensive paranoia: a live test in this project — starting two
    /// gateway processes against the same fresh database at the same
    /// time, exactly the multi-replica startup scenario this backend
    /// exists for — reproduced the well-documented Postgres race where
    /// concurrent `CREATE TABLE IF NOT EXISTS` for the same table can let
    /// both sessions pass the existence check before either commits, and
    /// one loses with a low-level catalog constraint violation instead of
    /// a graceful no-op. The advisory lock must be acquired and released
    /// on the *same* session (`pg_advisory_lock` is session-scoped), so
    /// this explicitly holds one `PoolConnection` for the whole sequence
    /// rather than letting the pool hand out a different connection per
    /// query, which would make the lock a no-op.
    pub async fn connect(database_url: &str) -> Result<Self, OpenWrapperError> {
        let pool = PgPoolOptions::new()
            .max_connections(20)
            .min_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .idle_timeout(std::time::Duration::from_secs(30))
            .max_lifetime(std::time::Duration::from_secs(3600))
            .connect(&with_pgbouncer_params(database_url))
            .await
            .map_err(|e| internal_err("connect postgres", e))?;

        Self::init_schema(&pool).await?;

        Ok(Self { pool })
    }

    async fn init_schema(pool: &PgPool) -> Result<(), OpenWrapperError> {
        // Arbitrary, fixed lock key — any two OpenWrapper instances
        // pointed at the same database must use the same constant so
        // they actually contend on the same lock.
        const SCHEMA_LOCK_KEY: i64 = 0x4f57_5343_4845_4d41; // "OWSCHEMA" in hex-ish

        let mut conn = pool
            .acquire()
            .await
            .map_err(|e| internal_err("acquire connection for schema init", e))?;

        sqlx::query("SELECT pg_advisory_lock($1)")
            .bind(SCHEMA_LOCK_KEY)
            .execute(&mut *conn)
            .await
            .map_err(|e| internal_err("acquire schema advisory lock", e))?;

        // Ensure the lock is released even if a statement below fails,
        // by doing the fallible work in a closure and always unlocking
        // afterward rather than using `?` directly through this block.
        let result: Result<(), OpenWrapperError> = async {
            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS payments (
                    id                  TEXT PRIMARY KEY,
                    idempotency_key     TEXT NOT NULL UNIQUE,
                    request_fingerprint TEXT NOT NULL,
                    provider            TEXT NOT NULL,
                    provider_reference  TEXT,
                    status              TEXT NOT NULL,
                    amount_minor_units  BIGINT NOT NULL,
                    currency            TEXT NOT NULL,
                    merchant_reference  TEXT,
                    next_action_json    TEXT,
                    created_at          TIMESTAMPTZ NOT NULL,
                    updated_at          TIMESTAMPTZ NOT NULL
                )
                "#,
            )
            .execute(&mut *conn)
            .await
            .map_err(|e| internal_err("create payments table", e))?;

            sqlx::query(
                "CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON payments (provider, provider_reference)",
            )
            .execute(&mut *conn)
            .await
            .map_err(|e| internal_err("create index", e))?;

            sqlx::query(
                "CREATE INDEX IF NOT EXISTS idx_payments_status_updated ON payments (status, updated_at)",
            )
            .execute(&mut *conn)
            .await
            .map_err(|e| internal_err("create status_updated index", e))?;

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS webhook_events (
                    event_id     TEXT PRIMARY KEY,
                    provider     TEXT NOT NULL,
                    payment_id   TEXT,
                    received_at  TIMESTAMPTZ NOT NULL
                )
                "#,
            )
            .execute(&mut *conn)
            .await
            .map_err(|e| internal_err("create webhook_events table", e))?;

            Ok(())
        }
        .await;

        // Always attempt to unlock, regardless of whether schema setup
        // succeeded — an error here is logged but does not shadow the
        // original error from `result`, since leaving a stale advisory
        // lock is a lesser problem than losing the real failure reason.
        if let Err(e) = sqlx::query("SELECT pg_advisory_unlock($1)")
            .bind(SCHEMA_LOCK_KEY)
            .execute(&mut *conn)
            .await
        {
            tracing::warn!(error = %e, "failed to release schema advisory lock");
        }

        result
    }

    #[cfg(test)]
    async fn wipe_for_test(&self) {
        sqlx::query("TRUNCATE payments, webhook_events")
            .execute(&self.pool)
            .await
            .expect("truncate for test");
    }
}

/// Postgres's `SQLSTATE` for a `UNIQUE` constraint violation. Used
/// instead of string-matching the error message, which is not a stable
/// contract across Postgres versions.
const UNIQUE_VIOLATION: &str = "23505";

fn row_to_payment(row: &sqlx::postgres::PgRow) -> Result<Payment, OpenWrapperError> {
    let id: String = row.try_get("id").map_err(|e| internal_err("row id", e))?;
    let idempotency_key: String = row
        .try_get("idempotency_key")
        .map_err(|e| internal_err("row idempotency_key", e))?;
    let provider: String = row
        .try_get("provider")
        .map_err(|e| internal_err("row provider", e))?;
    let provider_reference: Option<String> = row
        .try_get("provider_reference")
        .map_err(|e| internal_err("row provider_reference", e))?;
    let status: String = row
        .try_get("status")
        .map_err(|e| internal_err("row status", e))?;
    let amount_minor_units: i64 = row
        .try_get("amount_minor_units")
        .map_err(|e| internal_err("row amount_minor_units", e))?;
    let currency: String = row
        .try_get("currency")
        .map_err(|e| internal_err("row currency", e))?;
    let merchant_reference: Option<String> = row
        .try_get("merchant_reference")
        .map_err(|e| internal_err("row merchant_reference", e))?;
    let created_at: OffsetDateTime = row
        .try_get("created_at")
        .map_err(|e| internal_err("row created_at", e))?;
    let updated_at: OffsetDateTime = row
        .try_get("updated_at")
        .map_err(|e| internal_err("row updated_at", e))?;

    let currency_parsed =
        Currency::parse(&currency).map_err(|e| internal_err("corrupt currency", e))?;
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
        created_at,
        updated_at,
    })
}

#[async_trait]
impl PaymentStore for PostgresStore {
    async fn begin_payment(
        &self,
        request: &PaymentRequest,
    ) -> Result<BeginOutcome, OpenWrapperError> {
        let fingerprint = RequestFingerprint::of(request)?;
        let payment_id = PaymentId::new();
        let now = OffsetDateTime::now_utc();

        let insert = sqlx::query(
            "INSERT INTO payments
                (id, idempotency_key, request_fingerprint, provider, provider_reference,
                 status, amount_minor_units, currency, merchant_reference, next_action_json,
                 created_at, updated_at)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, NULL, $9, $9)",
        )
        .bind(payment_id.to_string())
        .bind(request.idempotency_key.as_str())
        .bind(fingerprint.as_str())
        .bind(request.provider.as_str())
        .bind(PaymentStatus::Pending.to_string())
        .bind(request.amount.minor_units())
        .bind(request.amount.currency().code())
        .bind(&request.merchant_reference)
        .bind(now)
        .execute(&self.pool)
        .await;

        match insert {
            Ok(_) => Ok(BeginOutcome::Proceed { payment_id }),
            Err(sqlx::Error::Database(db_err))
                if db_err.code().as_deref() == Some(UNIQUE_VIOLATION) =>
            {
                let existing = self
                    .get_by_idempotency_key(&request.idempotency_key)
                    .await?
                    .ok_or_else(|| {
                        internal_err("constraint violated but row missing", "unreachable")
                    })?;
                if existing.1 == fingerprint.as_str() {
                    Ok(BeginOutcome::ReturnExisting(existing.0))
                } else {
                    Ok(BeginOutcome::Conflict)
                }
            }
            Err(e) => Err(internal_err("insert payment", e)),
        }
    }

    async fn record_creation_result(
        &self,
        payment_id: &PaymentId,
        provider_reference: &ProviderReference,
        status: PaymentStatus,
        next_action: Option<&PaymentNextAction>,
    ) -> Result<(), OpenWrapperError> {
        let next_action_json = next_action
            .map(serde_json::to_string)
            .transpose()
            .map_err(|e| internal_err("serialize next_action", e))?;
        sqlx::query(
            "UPDATE payments SET provider_reference = $1, status = $2, next_action_json = $3, updated_at = $4 WHERE id = $5",
        )
        .bind(provider_reference.as_str())
        .bind(status.to_string())
        .bind(next_action_json)
        .bind(OffsetDateTime::now_utc())
        .bind(payment_id.to_string())
        .execute(&self.pool)
        .await
        .map_err(|e| internal_err("update payment", e))?;
        Ok(())
    }

    async fn apply_webhook_event(
        &self,
        event_id: &str,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<WebhookApplyOutcome, OpenWrapperError> {
        let row = sqlx::query(
            "SELECT id, status, amount_minor_units FROM payments WHERE provider = $1 AND provider_reference = $2",
        )
        .bind(provider.as_str())
        .bind(provider_reference.as_str())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| internal_err("select payment for webhook", e))?;

        let Some(row) = row else {
            return Ok(WebhookApplyOutcome::PaymentNotFound);
        };
        let id: String = row.try_get("id").map_err(|e| internal_err("row id", e))?;
        let current_status_str: String = row
            .try_get("status")
            .map_err(|e| internal_err("row status", e))?;
        let stored_amount: i64 = row
            .try_get("amount_minor_units")
            .map_err(|e| internal_err("row amount_minor_units", e))?;

        let insert = sqlx::query(
            "INSERT INTO webhook_events (event_id, provider, payment_id, received_at) VALUES ($1, $2, $3, $4)",
        )
        .bind(event_id)
        .bind(provider.as_str())
        .bind(&id)
        .bind(OffsetDateTime::now_utc())
        .execute(&self.pool)
        .await;

        match insert {
            Ok(_) => {}
            Err(sqlx::Error::Database(db_err))
                if db_err.code().as_deref() == Some(UNIQUE_VIOLATION) =>
            {
                return Ok(WebhookApplyOutcome::Duplicate);
            }
            Err(e) => return Err(internal_err("insert webhook_event", e)),
        }

        let current_status = parse_status(&current_status_str)?;
        if let Some(reported) = reported_amount_minor_units {
            if reported != stored_amount {
                return Ok(WebhookApplyOutcome::Transition(
                    TransitionOutcome::AmountMismatch {
                        stored: stored_amount,
                        reported,
                    },
                ));
            }
        }

        match current_status.validate_transition(reported_status) {
            Ok(()) => {
                sqlx::query("UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3")
                    .bind(reported_status.to_string())
                    .bind(OffsetDateTime::now_utc())
                    .bind(&id)
                    .execute(&self.pool)
                    .await
                    .map_err(|e| internal_err("apply transition", e))?;
                Ok(WebhookApplyOutcome::Transition(
                    TransitionOutcome::Applied {
                        payment_id: id.parse().map_err(|_| internal_err("parse id", "bad id"))?,
                        from: current_status,
                        to: reported_status,
                    },
                ))
            }
            Err(illegal) => Ok(WebhookApplyOutcome::Transition(
                TransitionOutcome::Illegal {
                    from: illegal.from,
                    to: illegal.to,
                },
            )),
        }
    }

    async fn mark_terminal_without_provider_reference(
        &self,
        payment_id: &PaymentId,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError> {
        debug_assert!(status.is_terminal());
        self.update_status_only(payment_id, status).await
    }

    async fn mark_unknown(&self, payment_id: &PaymentId) -> Result<(), OpenWrapperError> {
        self.update_status_only(payment_id, PaymentStatus::Unknown)
            .await
    }

    async fn apply_reconciliation_result(
        &self,
        payment_id: &PaymentId,
        resolved_status: PaymentStatus,
    ) -> Result<TransitionOutcome, OpenWrapperError> {
        let payment = self
            .get_payment(payment_id)
            .await?
            .ok_or_else(|| internal_err("reconcile", "payment not found"))?;
        match payment.status.validate_transition(resolved_status) {
            Ok(()) => {
                self.update_status_only(payment_id, resolved_status).await?;
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

    async fn get_payment(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<Payment>, OpenWrapperError> {
        let row = sqlx::query(
            "SELECT id, idempotency_key, provider, provider_reference, status,
                    amount_minor_units, currency, merchant_reference, created_at, updated_at
             FROM payments WHERE id = $1",
        )
        .bind(payment_id.to_string())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| internal_err("select payment", e))?;

        row.map(|r| row_to_payment(&r)).transpose()
    }

    async fn get_next_action(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<PaymentNextAction>, OpenWrapperError> {
        let row = sqlx::query("SELECT next_action_json FROM payments WHERE id = $1")
            .bind(payment_id.to_string())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| internal_err("select next action", e))?;

        match row {
            Some(row) => {
                let serialized: Option<String> = row
                    .try_get("next_action_json")
                    .map_err(|e| internal_err("row next_action_json", e))?;
                match serialized {
                    Some(value) => serde_json::from_str(&value)
                        .map(Some)
                        .map_err(|e| internal_err("parse next action", e)),
                    None => Ok(None),
                }
            }
            None => Ok(None),
        }
    }

    async fn list_stale_unknown_payments(
        &self,
        min_age: time::Duration,
        limit: i64,
    ) -> Result<Vec<Payment>, OpenWrapperError> {
        let cutoff = OffsetDateTime::now_utc() - min_age;
        let rows = sqlx::query(
            "SELECT id, idempotency_key, provider, provider_reference, status,
                    amount_minor_units, currency, merchant_reference, created_at, updated_at
             FROM payments
             WHERE status = 'unknown' AND updated_at < $1 AND provider_reference IS NOT NULL
             ORDER BY updated_at ASC
             LIMIT $2",
        )
        .bind(cutoff)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| internal_err("list stale unknown", e))?;

        rows.iter().map(row_to_payment).collect()
    }

    async fn touch_reconciliation_attempt(
        &self,
        payment_id: &PaymentId,
    ) -> Result<(), OpenWrapperError> {
        sqlx::query("UPDATE payments SET updated_at = $1 WHERE id = $2 AND status = 'unknown'")
            .bind(OffsetDateTime::now_utc())
            .bind(payment_id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| internal_err("touch reconciliation attempt", e))?;
        Ok(())
    }

    async fn validate_api_key_hash(&self, key_hash: &str) -> Result<bool, OpenWrapperError> {
        let row = sqlx::query(
            "SELECT 1 FROM api_keys WHERE (key_hash = $1 OR \"keyHash\" = $1) AND revoked_at IS NULL LIMIT 1",
        )
        .bind(key_hash)
        .fetch_optional(&self.pool)
        .await;

        match row {
            Ok(Some(_)) => Ok(true),
            _ => Ok(false),
        }
    }

    async fn ping(&self) -> Result<(), OpenWrapperError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| internal_err("ping", e))?;
        Ok(())
    }
}

impl PostgresStore {
    pub async fn apply_webhook_transition(
        &self,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<Option<TransitionOutcome>, OpenWrapperError> {
        let row = sqlx::query("SELECT id, status, amount_minor_units FROM payments WHERE provider = $1 AND provider_reference = $2")
            .bind(provider.as_str())
            .bind(provider_reference.as_str())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| internal_err("select payment for webhook", e))?;

        let Some(row) = row else { return Ok(None) };
        let id: String = row.try_get("id").map_err(|e| internal_err("row id", e))?;
        let current_status_str: String = row
            .try_get("status")
            .map_err(|e| internal_err("row status", e))?;
        let stored_amount: i64 = row
            .try_get("amount_minor_units")
            .map_err(|e| internal_err("row amount_minor_units", e))?;

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
                sqlx::query("UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3")
                    .bind(reported_status.to_string())
                    .bind(OffsetDateTime::now_utc())
                    .bind(&id)
                    .execute(&self.pool)
                    .await
                    .map_err(|e| internal_err("apply transition", e))?;
                Ok(Some(TransitionOutcome::Applied {
                    payment_id: id.parse().map_err(|_| internal_err("parse id", "bad id"))?,
                    from: current_status,
                    to: reported_status,
                }))
            }
            Err(illegal) => Ok(Some(TransitionOutcome::Illegal {
                from: illegal.from,
                to: illegal.to,
            })),
        }
    }

    pub async fn record_webhook_event_if_new(
        &self,
        event_id: &str,
        provider: &ProviderId,
        payment_id: Option<&PaymentId>,
    ) -> Result<bool, OpenWrapperError> {
        let result = sqlx::query(
            "INSERT INTO webhook_events (event_id, provider, payment_id, received_at) VALUES ($1, $2, $3, $4)",
        )
        .bind(event_id)
        .bind(provider.as_str())
        .bind(payment_id.map(|p| p.to_string()))
        .bind(OffsetDateTime::now_utc())
        .execute(&self.pool)
        .await;

        match result {
            Ok(_) => Ok(true),
            Err(sqlx::Error::Database(db_err))
                if db_err.code().as_deref() == Some(UNIQUE_VIOLATION) =>
            {
                Ok(false)
            }
            Err(e) => Err(internal_err("insert webhook_event", e)),
        }
    }

    async fn update_status_only(
        &self,
        payment_id: &PaymentId,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError> {
        sqlx::query("UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3")
            .bind(status.to_string())
            .bind(OffsetDateTime::now_utc())
            .bind(payment_id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| internal_err("update status", e))?;
        Ok(())
    }

    async fn get_by_idempotency_key(
        &self,
        key: &IdempotencyKey,
    ) -> Result<Option<(Payment, String)>, OpenWrapperError> {
        let row = sqlx::query(
            "SELECT id, idempotency_key, provider, provider_reference, status,
                    amount_minor_units, currency, merchant_reference, created_at, updated_at,
                    request_fingerprint
             FROM payments WHERE idempotency_key = $1",
        )
        .bind(key.as_str())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| internal_err("select by idempotency key", e))?;

        let Some(row) = row else { return Ok(None) };
        let payment = row_to_payment(&row)?;
        let fingerprint: String = row
            .try_get("request_fingerprint")
            .map_err(|e| internal_err("row request_fingerprint", e))?;
        Ok(Some((payment, fingerprint)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openwrapper_core::CustomerDetails;

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

    /// These tests run against a real local Postgres and are `#[ignore]`d
    /// by default so `cargo test --workspace` doesn't require one to be
    /// running. Run with:
    /// `OPENWRAPPER_TEST_DATABASE_URL=postgres://... cargo test -p openwrapper-gateway -- --ignored`
    async fn test_store() -> PostgresStore {
        let url = std::env::var("OPENWRAPPER_TEST_DATABASE_URL")
            .expect("set OPENWRAPPER_TEST_DATABASE_URL to run Postgres store tests");
        let store = PostgresStore::connect(&url)
            .await
            .expect("connect to test postgres");
        store.wipe_for_test().await;
        store
    }

    #[tokio::test]
    #[ignore]
    async fn first_call_proceeds_second_identical_call_returns_existing() {
        let store = test_store().await;
        let req = sample_request("pg-k1", 1000);

        let first = store.begin_payment(&req).await.unwrap();
        let payment_id = match first {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => panic!("expected Proceed on first call"),
        };

        let second = store.begin_payment(&req).await.unwrap();
        match second {
            BeginOutcome::ReturnExisting(payment) => assert_eq!(payment.id, payment_id),
            _ => panic!("expected ReturnExisting on retry with identical body"),
        }
    }

    #[tokio::test]
    #[ignore]
    async fn same_key_different_body_is_a_deterministic_conflict() {
        let store = test_store().await;
        store
            .begin_payment(&sample_request("pg-k2", 1000))
            .await
            .unwrap();
        let second = store
            .begin_payment(&sample_request("pg-k2", 2000))
            .await
            .unwrap();
        assert!(matches!(second, BeginOutcome::Conflict));
    }

    #[tokio::test]
    #[ignore]
    async fn concurrent_identical_requests_across_real_connections_only_one_proceeds() {
        // The point of this test: unlike SQLite's in-process Mutex, there
        // is no application-level lock serializing these — correctness
        // here depends entirely on Postgres's own UNIQUE constraint
        // enforcement across genuinely independent pooled connections,
        // which is exactly the property that makes multi-replica
        // deployment safe (see this module's docs).
        let store = std::sync::Arc::new(test_store().await);
        let mut handles = vec![];
        for _ in 0..8 {
            let store = std::sync::Arc::clone(&store);
            handles.push(tokio::spawn(async move {
                store
                    .begin_payment(&sample_request("pg-concurrent", 500))
                    .await
                    .unwrap()
            }));
        }
        let mut proceed_count = 0;
        for h in handles {
            if matches!(h.await.unwrap(), BeginOutcome::Proceed { .. }) {
                proceed_count += 1;
            }
        }
        assert_eq!(proceed_count, 1);
    }

    #[tokio::test]
    #[ignore]
    async fn webhook_transition_rejects_amount_mismatch_and_illegal_transition() {
        let store = test_store().await;
        let req = sample_request("pg-k3", 1000);
        let payment_id = match store.begin_payment(&req).await.unwrap() {
            BeginOutcome::Proceed { payment_id } => payment_id,
            _ => unreachable!(),
        };
        let reference = ProviderReference::new("txn-pg-1");
        store
            .record_creation_result(&payment_id, &reference, PaymentStatus::Pending, None)
            .await
            .unwrap();

        let mismatch = store
            .apply_webhook_transition(
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Succeeded,
                Some(9999),
            )
            .await
            .unwrap();
        assert!(matches!(
            mismatch,
            Some(TransitionOutcome::AmountMismatch { .. })
        ));

        let applied = store
            .apply_webhook_transition(
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Succeeded,
                Some(1000),
            )
            .await
            .unwrap();
        assert!(matches!(applied, Some(TransitionOutcome::Applied { .. })));

        let illegal = store
            .apply_webhook_transition(
                &ProviderId::parse("paymob").unwrap(),
                &reference,
                PaymentStatus::Failed,
                None,
            )
            .await
            .unwrap();
        assert!(matches!(illegal, Some(TransitionOutcome::Illegal { .. })));

        let stored = store.get_payment(&payment_id).await.unwrap().unwrap();
        assert_eq!(
            stored.status,
            PaymentStatus::Succeeded,
            "illegal transition must not mutate state"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn concurrent_schema_init_from_simulated_replicas_does_not_race() {
        // Regression test for a real bug found via live testing: two
        // gateway processes starting simultaneously against a freshly
        // created, empty database both attempting `CREATE TABLE IF NOT
        // EXISTS` raced at the Postgres catalog level, and one crashed.
        // This reproduces that exact scenario in-process instead
        // (multiple concurrent `PostgresStore::connect` calls against
        // the same fresh database) and asserts all of them succeed.
        let url = std::env::var("OPENWRAPPER_TEST_DATABASE_URL")
            .expect("set OPENWRAPPER_TEST_DATABASE_URL to run Postgres store tests");

        let mut handles = vec![];
        for _ in 0..5 {
            let url = url.clone();
            handles.push(tokio::spawn(
                async move { PostgresStore::connect(&url).await },
            ));
        }
        for h in handles {
            h.await
                .unwrap()
                .expect("every concurrent connect+schema-init must succeed, not race");
        }
    }
}
