//! Paymob adapter configuration.
//!
//! Paymob does not use a separate sandbox hostname: test vs. live mode is
//! determined entirely by which secret key you authenticate with against
//! the *same* production host (source: Create Intention docs, "Using a
//! wrong or not well-configured integration ID" error guidance — "Has the
//! same status as the used secret key (Test/Live)"). See research/paymob.md.

use secrecy::Secret;

#[derive(Clone)]
pub struct PaymobConfig {
    /// `Authorization: Token <secret_key>` on the Intentions API.
    pub secret_key: Secret<String>,
    /// Used to verify HMAC-SHA512 signatures on inbound webhooks. Never
    /// logged, never included in any error message (§16, I8).
    pub hmac_secret: Secret<String>,
    /// Needed to build the Unified Checkout redirect URL handed back to
    /// the customer.
    pub public_key: String,
    /// Defaults to Paymob's Egypt production host, since test/live is a
    /// property of the secret key, not the host.
    pub base_url: String,
    /// Which payment methods to offer at checkout, as configured in the
    /// Paymob dashboard (integration IDs, or named methods like `"card"`).
    /// This is deliberately adapter configuration, not a per-request field
    /// on the neutral `PaymentRequest` — which methods are offered is a
    /// merchant-account-level Paymob concept, not something that varies
    /// per OpenWrapper caller in v0.1.0.
    pub payment_methods: Vec<PaymobPaymentMethod>,
    /// Where Paymob should POST the transaction-processed callback. Must
    /// point at this OpenWrapper gateway's `/v1/webhooks/paymob` endpoint.
    pub notification_url: String,
    /// Template for the transaction-inquiry request path, with `{id}`
    /// substituted for the transaction id. Overridable because the
    /// default value is a documented guess — see research/paymob.md's
    /// "reconstructed with lower confidence" section and
    /// docs/LIMITATIONS.md. If Paymob's real endpoint turns out to
    /// differ, an operator can fix this via configuration without
    /// waiting on a code change.
    pub inquiry_path_template: String,
    /// Template for the Unified Checkout redirect URL, with
    /// `{base_url}`, `{public_key}` and `{client_secret}` substituted.
    /// Same rationale as `inquiry_path_template`.
    pub checkout_url_template: String,
}

#[derive(Clone, Debug)]
pub enum PaymobPaymentMethod {
    IntegrationId(i64),
    Named(String),
}

impl PaymobConfig {
    pub const DEFAULT_BASE_URL: &'static str = "https://accept.paymob.com";
    pub const DEFAULT_INQUIRY_PATH_TEMPLATE: &'static str = "/api/acceptance/transactions/{id}";
    pub const DEFAULT_CHECKOUT_URL_TEMPLATE: &'static str =
        "{base_url}/unifiedcheckout/?publicKey={public_key}&clientSecret={client_secret}";
}
