//! The gateway's persistence contract, and the two backends that
//! implement it.
//!
//! # Two backends, one contract
//! `openwrapper-core` defines `IdempotencyStore` as a narrow trait (§11).
//! This module defines a second, gateway-local trait, `PaymentStore`,
//! that's richer — it also owns durable payment records, webhook
//! deduplication, and reconciliation — because those are gateway
//! concerns, not core domain concerns (core stays free of any database
//! dependency, per I1's spirit extended to infrastructure, not just
//! providers).
//!
//! Two implementations exist:
//! - [`sqlite::SqliteStore`] — a single embedded file. Correct and
//!   sufficient for a single gateway process (see its own module docs for
//!   why this was the original v0.1.0 choice), but does not coordinate
//!   multiple replicas sharing state.
//! - [`postgres::PostgresStore`] — a real server multiple gateway
//!   instances can share. This is what makes horizontal scaling
//!   (multiple replicas behind a load balancer) a supported
//!   configuration rather than a documented limitation — see
//!   `docs/DECISIONS.md` for the full reasoning and
//!   `docs/LIMITATIONS.md` for what changed.
//!
//! An operator picks one via `OPENWRAPPER_DATABASE_URL` (see
//! `main.rs::open_store`) — a `postgres://`/`postgresql://` URL selects
//! Postgres, anything else is treated as a SQLite file path. There is no
//! third "use both" mode: a deployment is either single-instance (SQLite
//! is fine, simpler to operate) or multi-instance (Postgres is required),
//! never a mix.

pub mod postgres;
pub mod sqlite;

use async_trait::async_trait;
use openwrapper_core::{
    OpenWrapperError, Payment, PaymentId, PaymentNextAction, PaymentRequest, PaymentStatus,
    ProviderId, ProviderReference,
};

pub enum BeginOutcome {
    Proceed { payment_id: PaymentId },
    ReturnExisting(Payment),
    Conflict,
}

pub enum TransitionOutcome {
    Applied {
        payment_id: PaymentId,
        from: PaymentStatus,
        to: PaymentStatus,
    },
    NoOp,
    Illegal {
        from: PaymentStatus,
        to: PaymentStatus,
    },
    AmountMismatch {
        stored: i64,
        reported: i64,
    },
}

/// The full set of operations the HTTP handlers and the background
/// reconciler need from a durable store. Both backends implement this
/// identically in observable behavior — the architecture tests
/// (`tests/architecture`) and the shared behavioral test suite in
/// `store/tests.rs` run against both to prove that, rather than relying
/// on the trait signature alone to guarantee it.
#[async_trait]
pub trait PaymentStore: Send + Sync {
    async fn begin_payment(
        &self,
        request: &PaymentRequest,
    ) -> Result<BeginOutcome, OpenWrapperError>;

    async fn record_creation_result(
        &self,
        payment_id: &PaymentId,
        provider_reference: &ProviderReference,
        status: PaymentStatus,
        next_action: Option<&PaymentNextAction>,
    ) -> Result<(), OpenWrapperError>;

    async fn apply_webhook_transition(
        &self,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<Option<TransitionOutcome>, OpenWrapperError>;

    async fn record_webhook_event_if_new(
        &self,
        event_id: &str,
        provider: &ProviderId,
        payment_id: Option<&PaymentId>,
    ) -> Result<bool, OpenWrapperError>;

    async fn mark_terminal_without_provider_reference(
        &self,
        payment_id: &PaymentId,
        status: PaymentStatus,
    ) -> Result<(), OpenWrapperError>;

    async fn mark_unknown(&self, payment_id: &PaymentId) -> Result<(), OpenWrapperError>;

    async fn apply_reconciliation_result(
        &self,
        payment_id: &PaymentId,
        resolved_status: PaymentStatus,
    ) -> Result<TransitionOutcome, OpenWrapperError>;

    async fn get_payment(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<Payment>, OpenWrapperError>;

    async fn list_stale_unknown_payments(
        &self,
        min_age: time::Duration,
        limit: i64,
    ) -> Result<Vec<Payment>, OpenWrapperError>;

    /// Advances `updated_at` on an `Unknown` payment when a reconciliation inquiry
    /// was attempted but did not resolve to a terminal status (e.g. provider returned
    /// Unknown or temporary network error). This ensures fair round-robin scheduling
    /// without starvation across stale payments.
    async fn touch_reconciliation_attempt(
        &self,
        payment_id: &PaymentId,
    ) -> Result<(), OpenWrapperError>;

    /// Validates whether a SHA256-hashed API key exists and is not revoked in the store.
    async fn validate_api_key_hash(&self, _key_hash: &str) -> Result<bool, OpenWrapperError> {
        Ok(false)
    }

    /// Cheapest possible proof the store is actually usable — backs
    /// `GET /v1/ready`.
    async fn ping(&self) -> Result<(), OpenWrapperError>;
}

pub(crate) fn internal_err(context: &str, e: impl std::fmt::Display) -> OpenWrapperError {
    tracing::error!(context, error = %e, "store error");
    OpenWrapperError::Internal {
        correlation_id: openwrapper_core::error::new_correlation_id(),
    }
}

fn parse_status(s: &str) -> Result<PaymentStatus, OpenWrapperError> {
    match s {
        "pending" => Ok(PaymentStatus::Pending),
        "succeeded" => Ok(PaymentStatus::Succeeded),
        "failed" => Ok(PaymentStatus::Failed),
        "unknown" => Ok(PaymentStatus::Unknown),
        other => Err(internal_err("parse_status", format!("bad status {other}"))),
    }
}
