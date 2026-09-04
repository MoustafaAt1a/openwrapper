//! `openwrapper-provider-stripe`: the Stripe adapter.
//!
//! Implements `openwrapper_core::Provider` using Stripe Checkout Sessions
//! (`POST /v1/checkout/sessions`) for payment creation and hosted checkout,
//! ensuring no raw credit card data routes through OpenWrapper (product scope §1, PCI DSS SAQ-A).

mod client;
mod config;
mod signature;
mod webhook;

pub use config::StripeConfig;

use async_trait::async_trait;
use client::StripeClient;
use openwrapper_core::{
    Capability, CreationStatus, OpenWrapperError, PaymentId, PaymentNextAction, PaymentRequest,
    PaymentResult, PaymentStatus, Provider, ProviderId, ProviderReference, RawWebhookRequest,
    WebhookError, WebhookEvent,
};
use time::OffsetDateTime;

pub const PROVIDER_ID: &str = "stripe";

const CAPABILITIES: &[Capability] = &[
    Capability::CreatePayment,
    Capability::InquireStatus,
    Capability::Webhook,
];

pub struct StripeProvider {
    client: StripeClient,
}

impl StripeProvider {
    pub fn new(config: StripeConfig) -> Result<Self, OpenWrapperError> {
        Ok(Self {
            client: StripeClient::new(config)?,
        })
    }

    pub fn with_http(
        http: reqwest::Client,
        config: StripeConfig,
    ) -> Result<Self, OpenWrapperError> {
        Ok(Self {
            client: StripeClient::with_http(http, config)?,
        })
    }
}

#[async_trait]
impl Provider for StripeProvider {
    fn id(&self) -> ProviderId {
        ProviderId::parse(PROVIDER_ID).expect("static id is valid")
    }

    fn capabilities(&self) -> &'static [Capability] {
        CAPABILITIES
    }

    async fn create_payment(
        &self,
        payment_id: &PaymentId,
        request: &PaymentRequest,
    ) -> Result<PaymentResult, OpenWrapperError> {
        self.ensure_capability(Capability::CreatePayment)?;
        request.validate()?;

        let session = self
            .client
            .create_checkout_session(request, payment_id)
            .await?;
        let checkout_url = session.url.ok_or_else(|| OpenWrapperError::Provider {
            provider: "stripe".into(),
            provider_code: None,
            message: "Stripe checkout session response omitted checkout URL".into(),
        })?;

        Ok(PaymentResult {
            provider: self.id(),
            provider_reference: ProviderReference::new(session.id),
            status: CreationStatus::Pending,
            next_action: Some(PaymentNextAction::RedirectToUrl { url: checkout_url }),
            amount: request.amount,
            created_at: OffsetDateTime::now_utc(),
        })
    }

    async fn inquire_status(
        &self,
        provider_reference: &ProviderReference,
    ) -> Result<PaymentStatus, OpenWrapperError> {
        self.ensure_capability(Capability::InquireStatus)?;
        self.client
            .inquire_status(provider_reference.as_str())
            .await
    }

    fn verify_and_parse_webhook(
        &self,
        raw: &RawWebhookRequest,
    ) -> Result<WebhookEvent, WebhookError> {
        webhook::verify_and_parse(self.client.config(), raw)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use secrecy::Secret;

    #[test]
    fn provider_id_and_capabilities() {
        let config = StripeConfig::new(Secret::new("sk_test_123".into()));
        let provider = StripeProvider::new(config).unwrap();

        assert_eq!(provider.id().as_str(), "stripe");
        assert!(provider.capabilities().contains(&Capability::CreatePayment));
        assert!(provider.capabilities().contains(&Capability::InquireStatus));
        assert!(provider.capabilities().contains(&Capability::Webhook));
        assert!(provider
            .ensure_capability(Capability::CreatePayment)
            .is_ok());
    }
}
