//! Fawry adapter configuration.
//!
//! Unlike Paymob, Fawry uses genuinely separate hostnames for its staging
//! and production environments (source: Fawry Server Notification V2 docs,
//! fetched from developer.fawrystaging.com — see research/fawry.md). The
//! production hostname must be confirmed with Fawry during merchant
//! onboarding; it is not defaulted here.

use secrecy::Secret;

#[derive(Clone)]
pub struct FawryConfig {
    /// Fawry-assigned merchant code.
    pub merchant_code: String,
    /// Used both to sign outgoing requests and to verify inbound
    /// notification signatures. Never logged (§16, I8).
    pub secure_key: Secret<String>,
    /// e.g. `https://atfawry.fawrystaging.com` for staging. No default:
    /// callers must set this explicitly so a misconfigured environment
    /// fails at startup (Configuration error) rather than silently
    /// pointing at the wrong environment.
    pub base_url: String,
    /// When `true`, logs the non-secret inputs to the PayAtFawry
    /// charge-creation signature (`merchantCode`, `merchantRefNum`,
    /// `paymentMethod`, `amount`, and the resulting signature — **never**
    /// `secure_key` itself) at `DEBUG` level whenever a charge is created.
    /// This exists specifically because that signature's exact field
    /// order is the single highest-risk unverified detail in this
    /// codebase (see docs/LIMITATIONS.md) — if real charges start failing
    /// with a signature error, an operator can compare these logged
    /// values against Fawry's own Signature Tool
    /// (developer.fawrystaging.com/public/signatureTool) to pinpoint the
    /// mismatch quickly, and report back what the correct field order
    /// turned out to be. Off by default.
    pub debug_signatures: bool,
}
