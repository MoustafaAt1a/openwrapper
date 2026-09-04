//! `openwrapper-core`: the provider-neutral payment domain model.
//!
//! # What lives here
//! - The domain model (`money`, `ids`, `payment`)
//! - The provider contract (`provider`)
//! - The stable error model (`error`)
//! - The idempotency contract (`idempotency`)
//!
//! # What must never live here
//! Anything that knows about Paymob or Fawry specifically. This crate's
//! `Cargo.toml` has no dependency on either provider crate, and
//! `tests/architecture` enforces that this stays true automatically rather
//! than relying on review discipline alone (I1, §24).
//!
//! This crate also has no HTTP server, no database driver, and no async
//! runtime dependency beyond the `async-trait` macro used to define
//! `Provider`/`IdempotencyStore` as object-safe traits — persistence and
//! transport are infrastructure concerns that live in `gateway` and the
//! provider crates (§4, §11).

pub mod error;
pub mod idempotency;
pub mod ids;
pub mod money;
pub mod payment;
pub mod provider;
pub mod retry;

pub use error::OpenWrapperError;
pub use idempotency::IdempotencyStore;
pub use ids::{IdempotencyKey, PaymentId, ProviderId, ProviderReference};
pub use money::{Currency, Money};
pub use payment::{
    CreationStatus, CustomerDetails, Payment, PaymentNextAction, PaymentRequest, PaymentResult,
    PaymentStatus,
};
pub use provider::{Capability, Provider, RawWebhookRequest, WebhookError, WebhookEvent};
pub use retry::{retry_async, RetryPolicy};

/// The crate version, exposed so the gateway can report it in its
/// `/v1/version` endpoint without duplicating the number (§27: v0.1.0 has a
/// strict public contract, including "versioning").
pub const OPENWRAPPER_VERSION: &str = env!("CARGO_PKG_VERSION");
