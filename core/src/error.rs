//! OpenWrapper's stable error model.
//!
//! Design rules (see docs/ERROR_MODEL.md):
//! - Every variant is something a caller can make a decision on (retry, don't
//!   retry, fix input, contact support, escalate).
//! - `diagnostic` fields hold non-secret, human-readable detail for logs.
//!   Adapters are responsible for ensuring nothing secret ever lands there;
//!   see docs/DATA_BOUNDARY.md. Core cannot enforce this by itself, so it is
//!   an architecture rule enforced by review + the `no_secrets_in_errors`
//!   test in `tests/architecture`.
//! - No variant wraps a raw third-party error type in the public API, so the
//!   public contract never breaks because a dependency changed its error
//!   shape.

use std::fmt;

/// Stable, documented error type returned across the entire OpenWrapper
/// public contract (core, provider adapters, gateway HTTP layer).
#[derive(Debug, thiserror::Error)]
pub enum OpenWrapperError {
    /// The caller-supplied request was structurally or semantically invalid
    /// (bad amount, unsupported currency, malformed idempotency key, ...).
    /// Never retryable without changing the request.
    #[error("validation error: {message}")]
    Validation { message: String },

    /// OpenWrapper could not authenticate to the provider (bad/expired
    /// credentials). Never caused by the end customer.
    #[error("authentication error talking to provider {provider}: {message}")]
    Authentication { provider: String, message: String },

    /// The caller is not authorized to perform the requested operation
    /// against OpenWrapper itself (distinct from provider authentication).
    #[error("authorization error: {message}")]
    Authorization { message: String },

    /// OpenWrapper or a provider adapter is misconfigured (missing secret,
    /// invalid base URL, mismatched test/live keys, ...). Always an
    /// operator-fixable problem, never a customer-fixable one.
    #[error("configuration error: {message}")]
    Configuration { message: String },

    /// A transport-level failure talking to a provider (DNS, TCP, TLS).
    /// Distinct from `Timeout` because the outcome is unambiguous: the
    /// request is known not to have been delivered.
    #[error("network error talking to provider {provider}: {message}")]
    Network { provider: String, message: String },

    /// The request to a provider exceeded its deadline. Critically, this is
    /// **not** the same as failure: the provider may still have accepted and
    /// executed the operation. See invariant I5 / docs/STATE_MACHINE.md.
    #[error("timeout talking to provider {provider} after {elapsed_ms}ms")]
    Timeout { provider: String, elapsed_ms: u64 },

    /// The provider was reached and responded, but with an error it
    /// attributes to itself (5xx, documented business error, ...).
    /// `provider_code` is the provider's own diagnostic code, retained only
    /// for support/debugging — never a secret.
    #[error("provider {provider} error ({provider_code:?}): {message}")]
    Provider {
        provider: String,
        provider_code: Option<String>,
        message: String,
    },

    /// The provider rejected the request due to rate limiting.
    #[error("rate limited by provider {provider}, retry_after_ms={retry_after_ms:?}")]
    RateLimit {
        provider: String,
        retry_after_ms: Option<u64>,
    },

    /// The requested operation is not a capability the selected provider
    /// implements. See invariant I10 — this is always explicit, never a
    /// silently emulated behavior.
    #[error("provider {provider} does not support capability {capability}")]
    UnsupportedCapability {
        provider: String,
        capability: String,
    },

    /// A security boundary was violated or could not be verified: invalid
    /// webhook signature, replay suspected, TLS/identity failure, etc.
    /// Handling code must fail closed on this variant.
    #[error("security error: {message}")]
    Security { message: String },

    /// The true outcome of a payment could not be determined from the
    /// information available (e.g. provider call timed out with no
    /// confirmed result, or the provider itself reports an ambiguous
    /// state). Callers must not treat this as `Failed`. See invariant I5.
    #[error("payment outcome unknown for provider_reference={provider_reference:?}: {message}")]
    UnknownOutcome {
        provider_reference: Option<String>,
        message: String,
    },

    /// A defect inside OpenWrapper itself (should not normally be
    /// reachable). Never exposes internal detail beyond a correlation id.
    #[error("internal error (correlation_id={correlation_id})")]
    Internal { correlation_id: String },
}

impl OpenWrapperError {
    /// A coarse, stable machine-readable code safe to hand to SDKs so they
    /// can build typed exception hierarchies without string-matching
    /// `Display` output (which is documentation, not a contract).
    pub fn code(&self) -> &'static str {
        match self {
            Self::Validation { .. } => "validation_error",
            Self::Authentication { .. } => "authentication_error",
            Self::Authorization { .. } => "authorization_error",
            Self::Configuration { .. } => "configuration_error",
            Self::Network { .. } => "network_error",
            Self::Timeout { .. } => "timeout",
            Self::Provider { .. } => "provider_error",
            Self::RateLimit { .. } => "rate_limit",
            Self::UnsupportedCapability { .. } => "unsupported_capability",
            Self::Security { .. } => "security_error",
            Self::UnknownOutcome { .. } => "unknown_outcome",
            Self::Internal { .. } => "internal_error",
        }
    }

    /// Whether this error, taken in isolation, describes a request that is
    /// inherently safe to retry with the *same* idempotency key. This is
    /// intentionally conservative: `Provider` and `Timeout` are NOT
    /// automatically retryable here, because whether a retry is safe
    /// depends on the operation and the idempotency boundary it crossed —
    /// see docs/IDEMPOTENCY.md. This flag only rules out the categories
    /// that are *never* safe to retry blindly (I6).
    pub fn is_definitely_not_retryable(&self) -> bool {
        matches!(
            self,
            Self::Validation { .. }
                | Self::Authorization { .. }
                | Self::UnsupportedCapability { .. }
                | Self::Security { .. }
        )
    }

    /// Whether this error is *certain* to mean the provider never began
    /// processing the payment at all — as opposed to an ambiguous outcome
    /// where the provider may have received and be acting on the request
    /// despite OpenWrapper not getting a confirmed response.
    ///
    /// This is the concrete mechanism behind invariant I5. It is
    /// deliberately conservative: only pre-flight/deterministic rejections
    /// (bad input, bad credentials, misconfiguration, an explicit
    /// capability/rate-limit refusal) count as "definitely didn't happen".
    /// `Timeout` and `Network` are the obvious ambiguous cases,  but a
    /// `Provider` error is *also* treated as ambiguous here rather than
    /// safe-to-fail: a provider that responds with a 5xx may still have
    /// durably recorded the attempt on its side even though the response
    /// to us was an error. A caller (the gateway) should mark a payment
    /// `Unknown`, never `Failed`, when this returns `false`.
    pub fn is_definite_non_occurrence(&self) -> bool {
        matches!(
            self,
            Self::Validation { .. }
                | Self::Authentication { .. }
                | Self::Authorization { .. }
                | Self::Configuration { .. }
                | Self::UnsupportedCapability { .. }
                | Self::RateLimit { .. }
        )
    }
}

/// A correlation id used only in `Internal` errors so operators can find the
/// corresponding log line without OpenWrapper ever exposing internal detail
/// in its public contract.
pub fn new_correlation_id() -> String {
    ulid::Ulid::new().to_string()
}

impl fmt::Debug for RedactedSecret {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("RedactedSecret(..)")
    }
}

/// Marker used in doctests / architecture tests to prove a type cannot leak
/// its contents via `{:?}`. Not used in the public domain model itself
/// (which uses `secrecy::Secret` — see `provider.rs`), kept here only as a
/// minimal example the architecture test can point at.
pub struct RedactedSecret;
