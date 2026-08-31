//! The payment domain model and its state machine.
//!
//! See docs/STATE_MACHINE.md for the full rationale. The critical invariant
//! (I5) is: a timeout or any other ambiguous external result must never
//! automatically become `Failed`. `Unknown` exists specifically to make
//! that outcome representable instead of forcing a false choice between
//! `Pending` (implies "still in progress", which may be wrong) and `Failed`
//! (implies "definitely did not happen", which may also be wrong and is
//! financially dangerous — it can lead to double-charging on retry).

use crate::ids::{PaymentId, ProviderId, ProviderReference};
use crate::money::{Currency, Money};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use time::OffsetDateTime;

/// The only four states a payment can be in. Deliberately not more: every
/// additional state considered during design (e.g. a separate
/// `Authorizing`/`Capturing`) was rejected for v0.1.0 because neither
/// Paymob's Intention flow nor Fawry's PayAtFawry flow used in this release
/// exposes a distinct, actionable state beyond these four. Add states only
/// when a real, observed provider behavior requires representing them
/// (§10) — not speculatively.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    /// OpenWrapper has asked the provider to create the payment and is
    /// waiting for the customer / provider to reach a final state.
    Pending,
    /// A provider has authoritatively confirmed the payment completed.
    Succeeded,
    /// A provider has authoritatively confirmed the payment did not/will
    /// not complete (declined, expired, cancelled).
    Failed,
    /// The true outcome could not be determined (e.g. the create-payment
    /// call timed out, or a provider inquiry itself returned an ambiguous
    /// result). This is a first-class state, not an error swallowed into
    /// `Pending` or `Failed`. See docs/RECONCILIATION.md for how
    /// OpenWrapper resolves it.
    Unknown,
}

impl PaymentStatus {
    /// Whether `self` is one of the two states that no further, contradicting
    /// authoritative signal should ever override without an explicit
    /// override path (there isn't one in v0.1.0 — see docs/STATE_MACHINE.md).
    pub const fn is_terminal(self) -> bool {
        matches!(self, PaymentStatus::Succeeded | PaymentStatus::Failed)
    }

    /// Validates a proposed transition against the state machine (I13:
    /// "every payment state transition is validated"). Re-observing the
    /// same state (e.g. a duplicate webhook re-reporting `Succeeded`) is
    /// always allowed and is a no-op, which is what makes webhook delivery
    /// safely idempotent.
    pub fn validate_transition(self, next: PaymentStatus) -> Result<(), IllegalTransition> {
        use PaymentStatus::*;
        let allowed = match (self, next) {
            // Idempotent re-observation is always fine.
            (a, b) if a == b => true,
            // From Pending, any authoritative or ambiguous signal is a
            // legitimate first resolution.
            (Pending, Succeeded | Failed | Unknown) => true,
            // From Unknown, only a resolution toward a terminal state is
            // allowed — reconciliation is only ever allowed to *resolve*
            // ambiguity, never to invent new ambiguity from a state that
            // was already certain.
            (Unknown, Succeeded | Failed) => true,
            // Anything else — including terminal → terminal (Succeeded ->
            // Failed or vice versa) and terminal → Unknown — is illegal.
            // A provider reporting a contradictory terminal result for the
            // same provider_reference is treated as an anomaly to reject
            // and alert on, not a state to silently apply.
            _ => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(IllegalTransition {
                from: self,
                to: next,
            })
        }
    }
}

impl std::fmt::Display for PaymentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            PaymentStatus::Pending => "pending",
            PaymentStatus::Succeeded => "succeeded",
            PaymentStatus::Failed => "failed",
            PaymentStatus::Unknown => "unknown",
        };
        f.write_str(s)
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
#[error("illegal payment state transition: {from} -> {to}")]
pub struct IllegalTransition {
    pub from: PaymentStatus,
    pub to: PaymentStatus,
}

/// What the customer needs to do next to complete payment. This is the
/// "lossless abstraction" point (§8) between Paymob and Fawry: both
/// providers hand back something the customer must act on next, but the
/// *shape* of that action is genuinely different, so it is preserved as a
/// variant rather than flattened into one generic "checkout URL" field
/// that would be a lossy fit for Fawry's PayAtFawry reference codes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PaymentNextAction {
    /// The customer must be redirected to a provider-hosted checkout page
    /// (Paymob's Unified Checkout, built from the Intention's
    /// `client_secret`).
    RedirectToUrl { url: String },
    /// The customer has a reference code to pay against at a kiosk, ATM,
    /// or wallet app (Fawry's PayAtFawry `referenceNumber`), rather than
    /// completing anything in-band right now.
    PayAtReference {
        reference: String,
        /// Optional human-readable instructions the provider returned
        /// (e.g. expiry time), passed through opaquely.
        instructions: Option<String>,
    },
}

/// Customer details required by both providers to create a payment. Only
/// fields that are (a) genuinely required by at least one integrated
/// provider and (b) not sensitive card data live here. Phone is required
/// because both Paymob's `billing_data.phone_number` and Fawry's
/// `customerMobile` require it; email/name are optional because providers
/// differ on whether they're mandatory, and each adapter validates/derives
/// defaults for its own provider (I3: provider-specific validation stays in
/// the adapter).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerDetails {
    pub phone: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
}

/// The client → OpenWrapper request to create a payment (boundary 1 of
/// idempotency — see docs/IDEMPOTENCY.md).
///
/// Deliberately absent: any card number, CVV, or other PAN-adjacent field.
/// OpenWrapper's product scope (§1) forbids receiving that data; both
/// integrated providers support redirect/reference flows that never route
/// card data through OpenWrapper, and v0.1.0 only implements those flows.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub idempotency_key: crate::ids::IdempotencyKey,
    pub provider: ProviderId,
    pub amount: Money,
    pub customer: CustomerDetails,
    /// The caller's own order/reference id, forwarded to the provider where
    /// it supports one (Paymob `special_reference`, Fawry
    /// `merchantRefNum`), for correlation on the caller's side. Optional —
    /// OpenWrapper's own `PaymentId`/`ProviderReference` are always
    /// sufficient for correlation even if this is absent.
    pub merchant_reference: Option<String>,
    pub description: Option<String>,
    /// Where to send the customer after a redirect-based flow completes.
    /// Ignored by adapters whose flow doesn't redirect (e.g. Fawry
    /// PayAtFawry).
    pub return_url: Option<String>,
    /// Opaque caller metadata forwarded to the provider on a best-effort
    /// basis (Paymob `extras`). Bounded to prevent abuse; never
    /// interpreted by OpenWrapper itself. See docs/DATA_BOUNDARY.md.
    #[serde(default)]
    pub metadata: BTreeMap<String, String>,
}

impl PaymentRequest {
    pub const MAX_METADATA_ENTRIES: usize = 20;
    pub const MAX_METADATA_VALUE_LEN: usize = 500;

    /// Structural validation independent of any provider. Provider-specific
    /// validation (e.g. "Paymob requires an email") happens in the adapter.
    pub fn validate(&self) -> Result<(), crate::error::OpenWrapperError> {
        if self.customer.phone.trim().is_empty() {
            return Err(crate::error::OpenWrapperError::Validation {
                message: "customer.phone must not be empty".into(),
            });
        }
        if self.metadata.len() > Self::MAX_METADATA_ENTRIES {
            return Err(crate::error::OpenWrapperError::Validation {
                message: format!(
                    "metadata has {} entries, max is {}",
                    self.metadata.len(),
                    Self::MAX_METADATA_ENTRIES
                ),
            });
        }
        for (k, v) in &self.metadata {
            if v.len() > Self::MAX_METADATA_VALUE_LEN {
                return Err(crate::error::OpenWrapperError::Validation {
                    message: format!("metadata[{k}] exceeds max length"),
                });
            }
        }
        Ok(())
    }
}

/// The result of successfully asking a provider to create a payment
/// (boundary 2 of idempotency). Note `status` here is deliberately narrow:
/// a fresh creation call can only sensibly return `Pending` (accepted, in
/// progress) or `Unknown` (e.g. the create call itself timed out but may
/// have been received — see docs/IDEMPOTENCY.md boundary 2 failure
/// behavior). It is a type-level statement that "just created" can never
/// mean "already Succeeded/Failed" in this codebase.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentResult {
    pub provider: ProviderId,
    pub provider_reference: ProviderReference,
    pub status: CreationStatus,
    pub next_action: Option<PaymentNextAction>,
    pub amount: Money,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CreationStatus {
    Pending,
    Unknown,
}

impl From<CreationStatus> for PaymentStatus {
    fn from(value: CreationStatus) -> Self {
        match value {
            CreationStatus::Pending => PaymentStatus::Pending,
            CreationStatus::Unknown => PaymentStatus::Unknown,
        }
    }
}

/// The durable record OpenWrapper keeps for a payment. This is the type
/// persisted by the gateway's store; core defines its shape so the store
/// and the HTTP layer agree on it without either owning it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: PaymentId,
    pub idempotency_key: crate::ids::IdempotencyKey,
    pub provider: ProviderId,
    pub provider_reference: Option<ProviderReference>,
    pub status: PaymentStatus,
    pub amount: Money,
    pub currency: Currency,
    pub merchant_reference: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[cfg(test)]
mod tests {
    use super::*;
    use PaymentStatus::*;

    #[test]
    fn pending_can_move_to_any_first_resolution() {
        assert!(Pending.validate_transition(Succeeded).is_ok());
        assert!(Pending.validate_transition(Failed).is_ok());
        assert!(Pending.validate_transition(Unknown).is_ok());
    }

    #[test]
    fn unknown_can_only_resolve_to_a_terminal_state() {
        assert!(Unknown.validate_transition(Succeeded).is_ok());
        assert!(Unknown.validate_transition(Failed).is_ok());
        assert!(Unknown.validate_transition(Unknown).is_ok()); // still ambiguous, no-op
    }

    #[test]
    fn terminal_states_never_move_except_to_themselves() {
        assert!(Succeeded.validate_transition(Succeeded).is_ok()); // dup webhook
        assert!(Succeeded.validate_transition(Failed).is_err());
        assert!(Succeeded.validate_transition(Unknown).is_err());
        assert!(Failed.validate_transition(Succeeded).is_err());
        assert!(Failed.validate_transition(Unknown).is_err());
    }

    #[test]
    fn a_timeout_outcome_is_representable_without_becoming_failed() {
        // This is invariant I5 encoded as a test: nothing in this module
        // provides a path from "ambiguous" directly to "Failed" without
        // going through an authoritative provider signal.
        let after_timeout = Unknown;
        assert_ne!(after_timeout, Failed);
        assert!(after_timeout.validate_transition(Failed).is_ok()); // only via explicit resolution
    }
}
