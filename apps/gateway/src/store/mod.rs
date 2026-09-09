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
    Currency, OpenWrapperError, Payment, PaymentId, PaymentNextAction, PaymentRequest,
    PaymentStatus, ProviderId, ProviderReference, RefundStatus,
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

pub enum WebhookApplyOutcome {
    Duplicate,
    PaymentNotFound,
    Transition(TransitionOutcome),
}

#[derive(Debug, Clone)]
pub struct ApiKeyInfo {
    pub id: i64,
    pub user_id: Option<String>,
    pub environment: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RefundRecord {
    pub id: String,
    pub payment_id: PaymentId,
    pub amount_minor_units: i64,
    pub currency: Currency,
    pub status: RefundStatus,
    pub reason: Option<String>,
    pub provider_refund_ref: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventRecord {
    pub id: String,
    pub user_id: Option<String>,
    pub event_type: String,
    pub resource_id: String,
    pub payload: serde_json::Value,
    pub created_at: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WebhookEndpointRecord {
    pub id: String,
    pub user_id: Option<String>,
    pub url: String,
    pub secret: String,
    pub events: Vec<String>,
    pub is_active: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WebhookDeliveryRecord {
    pub id: String,
    pub endpoint_id: String,
    pub event_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub response_status: Option<i32>,
    pub status: String,
    pub attempt_count: i32,
    pub next_retry_at: Option<i64>,
    pub created_at: i64,
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
    ) -> Result<BeginOutcome, OpenWrapperError> {
        self.begin_payment_with_owner(request, None).await
    }

    async fn begin_payment_with_owner(
        &self,
        request: &PaymentRequest,
        _owner: Option<&ApiKeyInfo>,
    ) -> Result<BeginOutcome, OpenWrapperError>;

    async fn record_creation_result(
        &self,
        payment_id: &PaymentId,
        provider_reference: &ProviderReference,
        status: PaymentStatus,
        next_action: Option<&PaymentNextAction>,
    ) -> Result<(), OpenWrapperError>;

    /// Atomically deduplicates and applies a verified webhook. A missing
    /// payment must not consume the event id, so a later retry can succeed
    /// after payment creation has been persisted.
    async fn apply_webhook_event(
        &self,
        event_id: &str,
        provider: &ProviderId,
        provider_reference: &ProviderReference,
        reported_status: PaymentStatus,
        reported_amount_minor_units: Option<i64>,
    ) -> Result<WebhookApplyOutcome, OpenWrapperError>;

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

    async fn find_payment_by_reference(
        &self,
        reference: &str,
    ) -> Result<Option<Payment>, OpenWrapperError>;

    async fn get_next_action(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Option<PaymentNextAction>, OpenWrapperError>;

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

    /// Finds API key metadata by SHA256-hashed key string.
    async fn find_api_key(&self, _key_hash: &str) -> Result<Option<ApiKeyInfo>, OpenWrapperError> {
        Ok(None)
    }

    /// Validates whether a SHA256-hashed API key exists and is not revoked in the store.
    async fn validate_api_key_hash(&self, key_hash: &str) -> Result<bool, OpenWrapperError> {
        Ok(self.find_api_key(key_hash).await?.is_some())
    }

    /// Record a refund and update payment status atomically.
    async fn record_refund(
        &self,
        refund: &RefundRecord,
        new_payment_status: PaymentStatus,
    ) -> Result<(), OpenWrapperError>;

    /// Calculates the sum of all successful minor units refunded for a payment.
    async fn get_total_refunded_minor_units(
        &self,
        payment_id: &PaymentId,
    ) -> Result<i64, OpenWrapperError>;

    /// Lists all refunds associated with a payment.
    async fn list_refunds_for_payment(
        &self,
        payment_id: &PaymentId,
    ) -> Result<Vec<RefundRecord>, OpenWrapperError>;

    /// Record an immutable event in the event log.
    async fn record_event(&self, event: &EventRecord) -> Result<(), OpenWrapperError>;

    /// Query paginated events for a merchant user.
    async fn list_events(
        &self,
        user_id: Option<&str>,
        limit: i64,
        starting_after: Option<&str>,
    ) -> Result<Vec<EventRecord>, OpenWrapperError>;

    /// Retrieve an individual event by ID.
    async fn get_event(&self, event_id: &str) -> Result<Option<EventRecord>, OpenWrapperError>;

    /// Register a merchant webhook endpoint.
    async fn create_webhook_endpoint(
        &self,
        endpoint: &WebhookEndpointRecord,
    ) -> Result<(), OpenWrapperError>;

    /// List merchant webhook endpoints.
    async fn list_webhook_endpoints(
        &self,
        user_id: Option<&str>,
    ) -> Result<Vec<WebhookEndpointRecord>, OpenWrapperError>;

    /// Delete a merchant webhook endpoint by ID.
    async fn delete_webhook_endpoint(
        &self,
        endpoint_id: &str,
        user_id: Option<&str>,
    ) -> Result<bool, OpenWrapperError>;

    /// Retrieve all active webhook endpoints matching an optional user ID.
    async fn get_active_webhook_endpoints(
        &self,
        user_id: Option<&str>,
    ) -> Result<Vec<WebhookEndpointRecord>, OpenWrapperError>;

    /// Record a webhook delivery attempt.
    async fn record_webhook_delivery(
        &self,
        delivery: &WebhookDeliveryRecord,
    ) -> Result<(), OpenWrapperError>;

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
        "partially_refunded" => Ok(PaymentStatus::PartiallyRefunded),
        "refunded" => Ok(PaymentStatus::Refunded),
        other => Err(internal_err("parse_status", format!("bad status {other}"))),
    }
}
