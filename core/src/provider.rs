//! The provider contract. This is the one boundary a new payment provider
//! must implement; nothing else in core should need to change to add a
//! provider (§5: "Adding a new provider should primarily require
//! implementing the provider contract rather than modifying the core
//! domain"). See tests/architecture for an automated check that no
//! provider crate is referenced from core's own dependency graph.

use crate::error::OpenWrapperError;
use crate::ids::{PaymentId, ProviderId, ProviderReference};
use crate::payment::{PaymentRequest, PaymentResult, PaymentStatus};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Operations a provider adapter may support. Only capabilities actually
/// implemented in v0.1.0 exist here (§9). Extending this in a future
/// version means: add a variant here, add a corresponding method to
/// `Provider` with a default that returns `UnsupportedCapability`, then
/// have adapters opt in — never silently emulate a capability a provider
/// doesn't really have (§9, I10).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    CreatePayment,
    /// Actively ask the provider "what is the true status of this
    /// payment?" — the mechanism invariant I5/§13 rely on to resolve
    /// `Unknown` outcomes.
    InquireStatus,
    Webhook,
}

impl std::fmt::Display for Capability {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Capability::CreatePayment => "create_payment",
            Capability::InquireStatus => "inquire_status",
            Capability::Webhook => "webhook",
        };
        f.write_str(s)
    }
}

/// An unprocessed inbound webhook delivery, as received by the HTTP layer,
/// before any verification has happened. Adapters receive this and must
/// authenticate it before anything in it is trusted (I7).
///
/// Carrying the *raw* body (rather than a pre-parsed `serde_json::Value`)
/// matters: signature schemes are computed over specific byte/field
/// representations, and re-serializing JSON before verifying a signature
/// over it is a classic way to accidentally break or bypass verification.
pub struct RawWebhookRequest {
    pub raw_body: Vec<u8>,
    pub headers: BTreeMap<String, String>,
    pub query: BTreeMap<String, String>,
}

/// The result of successfully verifying and parsing a webhook delivery.
/// There is deliberately no public constructor outside this crate other
/// than through `Provider::verify_and_parse_webhook` — a caller cannot
/// obtain a `WebhookEvent` without going through verification, which is how
/// this codebase enforces I7 ("webhooks cannot mutate state before
/// verification") at the type level rather than by convention.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub provider: ProviderId,
    /// A provider-scoped identity for this specific delivery, used by the
    /// gateway to deduplicate retried/replayed deliveries. Adapters must
    /// derive this from something the provider itself considers unique to
    /// the event (not just the payment), documented per adapter in
    /// docs/WEBHOOKS.md.
    pub event_id: String,
    pub provider_reference: ProviderReference,
    pub merchant_reference: Option<String>,
    pub reported_status: PaymentStatus,
    /// Present when the provider's payload included an amount, so the
    /// gateway can perform the amount/currency consistency check described
    /// in §12 before applying the transition.
    pub reported_amount_minor_units: Option<i64>,
    /// Diagnostic-only projection of the payload. Adapters guarantee this
    /// never contains secrets (HMAC keys, API keys) — it may contain
    /// provider-assigned identifiers and non-sensitive transaction
    /// metadata that already appear elsewhere in the payload. See
    /// docs/DATA_BOUNDARY.md.
    pub raw_for_diagnostics: serde_json::Value,
}

#[derive(Debug, thiserror::Error)]
pub enum WebhookError {
    #[error("webhook signature missing")]
    SignatureMissing,
    #[error("webhook signature invalid")]
    SignatureInvalid,
    #[error("webhook payload malformed: {detail}")]
    MalformedPayload { detail: String },
    #[error("webhook event type not recognized: {event_type}")]
    UnrecognizedEventType { event_type: String },
}

/// The contract every payment provider adapter implements. Core depends on
/// this trait; provider crates depend on core and implement it. The
/// dependency arrow only ever points one way (I1).
#[async_trait]
pub trait Provider: Send + Sync {
    /// Stable identifier for this provider, e.g. `"paymob"`.
    fn id(&self) -> ProviderId;

    /// Capabilities this adapter actually implements. The gateway consults
    /// this before dispatching, and adapters should also self-check via
    /// `ensure_capability` at the top of each method for defense in depth.
    fn capabilities(&self) -> &'static [Capability];

    fn ensure_capability(&self, cap: Capability) -> Result<(), OpenWrapperError> {
        if self.capabilities().contains(&cap) {
            Ok(())
        } else {
            Err(OpenWrapperError::UnsupportedCapability {
                provider: self.id().to_string(),
                capability: cap.to_string(),
            })
        }
    }

    /// Create a payment with the provider. Implementations own: building
    /// the provider-specific request, authenticating, calling the
    /// provider, and mapping the provider's response into
    /// `PaymentResult`/`OpenWrapperError` (I2, I3).
    ///
    /// `payment_id` is OpenWrapper's own identifier, already assigned by
    /// the caller (the gateway, at the moment it claimed the idempotency
    /// key — see docs/IDEMPOTENCY.md) *before* this call. Adapters must
    /// use it wherever a stable OpenWrapper-side identifier is useful
    /// (e.g. Fawry's `merchantRefNum`) rather than generating their own:
    /// a provider adapter minting its own id here would let the same
    /// logical payment end up with two different ids — one the store
    /// assigned, one the adapter assigned — which is exactly the kind of
    /// identity bug idempotency exists to prevent.
    async fn create_payment(
        &self,
        payment_id: &PaymentId,
        request: &PaymentRequest,
    ) -> Result<PaymentResult, OpenWrapperError>;

    /// Ask the provider for the authoritative current status of a payment
    /// by its provider reference. This is the mechanism used to resolve an
    /// `Unknown` outcome (§13) — it must never be implemented by guessing
    /// or by re-issuing the create-payment call.
    async fn inquire_status(
        &self,
        provider_reference: &ProviderReference,
    ) -> Result<PaymentStatus, OpenWrapperError>;

    /// Verify an inbound webhook delivery and, only if verification
    /// succeeds, parse it into a `WebhookEvent`. See `WebhookEvent`'s docs
    /// for why these two steps are one non-separable function.
    fn verify_and_parse_webhook(
        &self,
        raw: &RawWebhookRequest,
    ) -> Result<WebhookEvent, WebhookError>;
}
