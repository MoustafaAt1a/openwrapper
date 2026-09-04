//! Configuration for the Stripe provider adapter.

use secrecy::Secret;

#[derive(Clone)]
pub struct StripeConfig {
    /// Secret API key (`sk_live_...` or `sk_test_...`).
    pub secret_key: Secret<String>,
    /// Optional webhook endpoint secret (`whsec_...`) used to verify `Stripe-Signature`.
    pub webhook_secret: Option<Secret<String>>,
    /// Base URL for Stripe API. Defaults to `https://api.stripe.com`.
    pub base_url: String,
    /// Maximum allowed age of an inbound webhook delivery in seconds (defaults to 300).
    pub webhook_tolerance_secs: u64,
}

impl StripeConfig {
    pub const DEFAULT_BASE_URL: &'static str = "https://api.stripe.com";
    pub const DEFAULT_WEBHOOK_TOLERANCE_SECS: u64 = 300;

    pub fn new(secret_key: Secret<String>) -> Self {
        Self {
            secret_key,
            webhook_secret: None,
            base_url: Self::DEFAULT_BASE_URL.to_string(),
            webhook_tolerance_secs: Self::DEFAULT_WEBHOOK_TOLERANCE_SECS,
        }
    }
}
