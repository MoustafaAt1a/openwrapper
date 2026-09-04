//! `openwrapper-provider-paymob`: the Paymob adapter.
//!
//! Implements `openwrapper_core::Provider` using Paymob's v1 Intention API
//! for payment creation and Unified Checkout for the customer-facing flow,
//! which never routes card data through OpenWrapper (product scope §1).
//! See research/paymob.md for citations backing every provider-specific
//! behavior encoded here.

mod client;
mod config;
mod signature;
mod webhook;

pub use config::{PaymobConfig, PaymobPaymentMethod};

use async_trait::async_trait;
use client::PaymobClient;
use openwrapper_core::{
    Capability, CreationStatus, OpenWrapperError, PaymentId, PaymentNextAction, PaymentRequest,
    PaymentResult, PaymentStatus, Provider, ProviderId, ProviderReference, RawWebhookRequest,
    WebhookError, WebhookEvent,
};
use time::OffsetDateTime;

pub const PROVIDER_ID: &str = "paymob";

const CAPABILITIES: &[Capability] = &[
    Capability::CreatePayment,
    Capability::InquireStatus,
    Capability::Webhook,
];

pub struct PaymobProvider {
    client: PaymobClient,
}

impl PaymobProvider {
    pub fn new(config: PaymobConfig) -> Result<Self, OpenWrapperError> {
        Ok(Self {
            client: PaymobClient::new(config)?,
        })
    }

    pub fn with_http(
        http: reqwest::Client,
        config: PaymobConfig,
    ) -> Result<Self, OpenWrapperError> {
        Ok(Self {
            client: PaymobClient::with_http(http, config)?,
        })
    }
}

#[async_trait]
impl Provider for PaymobProvider {
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

        let intention = self.client.create_intention(request, payment_id).await?;
        let checkout_url = self.client.unified_checkout_url(&intention.client_secret);

        Ok(PaymentResult {
            provider: self.id(),
            provider_reference: ProviderReference::new(intention.id),
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
        let obj = self
            .client
            .inquire_transaction(provider_reference.as_str())
            .await?;
        Ok(map_inquiry_status(&obj))
    }

    fn verify_and_parse_webhook(
        &self,
        raw: &RawWebhookRequest,
    ) -> Result<WebhookEvent, WebhookError> {
        webhook::verify_and_parse(self.client.config(), raw)
    }
}

fn map_inquiry_status(obj: &serde_json::Value) -> PaymentStatus {
    if obj.get("pending").and_then(|value| value.as_bool()) == Some(true) {
        PaymentStatus::Pending
    } else {
        match obj.get("success").and_then(|value| value.as_bool()) {
            Some(true) => PaymentStatus::Succeeded,
            Some(false) => PaymentStatus::Failed,
            None => PaymentStatus::Unknown,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inquiry_does_not_turn_null_or_malformed_success_into_failure() {
        assert_eq!(
            map_inquiry_status(&serde_json::json!({"success": null, "pending": false})),
            PaymentStatus::Unknown
        );
        assert_eq!(
            map_inquiry_status(&serde_json::json!({"success": "false"})),
            PaymentStatus::Unknown
        );
        assert_eq!(
            map_inquiry_status(&serde_json::json!({"success": false})),
            PaymentStatus::Failed
        );
    }
}
