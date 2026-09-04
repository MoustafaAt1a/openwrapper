//! `openwrapper-provider-fawry`: the Fawry adapter.
//!
//! Implements `openwrapper_core::Provider` using Fawry's PayAtFawry
//! reference-code flow only (see `client.rs` module docs for why the CARD
//! method is deliberately excluded from v0.1.0).
//!
//! ## `ProviderReference` semantics for this adapter
//! Core documents `ProviderReference` generically as "an opaque reference
//! issued by a provider." For Fawry specifically, this adapter stores
//! `merchantRefNumber` — a value OpenWrapper itself generates (or takes
//! from the caller's `merchant_reference`) — rather than Fawry's own
//! `referenceNumber`, because Fawry's status-inquiry API
//! (`inquire_status`, §13's mechanism for resolving `Unknown` outcomes) is
//! keyed on `merchantRefNumber`, not on Fawry's reference. This is a
//! deliberate, documented per-adapter choice (core treats
//! `ProviderReference` as opaque either way — see ids.rs) rather than an
//! oversight. The customer-facing code the customer actually pays with at
//! a Fawry outlet is still surfaced correctly, via
//! `PaymentNextAction::PayAtReference { reference, .. }`, populated from
//! Fawry's `referenceNumber`.

mod client;
mod config;
mod decimal;
mod signature;
mod status;
mod webhook;

pub use config::FawryConfig;

use async_trait::async_trait;
use client::FawryClient;
use openwrapper_core::{
    Capability, CreationStatus, OpenWrapperError, PaymentId, PaymentNextAction, PaymentRequest,
    PaymentResult, PaymentStatus, Provider, ProviderId, ProviderReference, RawWebhookRequest,
    WebhookError, WebhookEvent,
};
use time::OffsetDateTime;

pub const PROVIDER_ID: &str = "fawry";

const CAPABILITIES: &[Capability] = &[
    Capability::CreatePayment,
    Capability::InquireStatus,
    Capability::Webhook,
];

pub struct FawryProvider {
    client: FawryClient,
}

impl FawryProvider {
    pub fn new(config: FawryConfig) -> Result<Self, OpenWrapperError> {
        Ok(Self {
            client: FawryClient::new(config)?,
        })
    }

    pub fn with_http(http: reqwest::Client, config: FawryConfig) -> Result<Self, OpenWrapperError> {
        Ok(Self {
            client: FawryClient::with_http(http, config)?,
        })
    }
}

#[async_trait]
impl Provider for FawryProvider {
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
        if request.customer.phone.trim().is_empty() {
            return Err(OpenWrapperError::Validation {
                message: "Fawry requires customer.phone (customerMobile)".into(),
            });
        }

        let merchant_ref_num = client::derive_merchant_ref_num(request, payment_id);

        let charge = self
            .client
            .create_charge(request, &merchant_ref_num)
            .await?;

        let reference_number =
            charge
                .reference_number
                .ok_or_else(|| OpenWrapperError::Provider {
                    provider: "fawry".into(),
                    provider_code: None,
                    message: "Fawry accepted the charge but returned no referenceNumber".into(),
                })?;

        Ok(PaymentResult {
            provider: self.id(),
            provider_reference: ProviderReference::new(merchant_ref_num),
            status: CreationStatus::Pending,
            next_action: Some(PaymentNextAction::PayAtReference {
                reference: reference_number,
                instructions: Some(
                    "Pay this reference number at any Fawry outlet, ATM, or via the Fawry app."
                        .to_string(),
                ),
            }),
            amount: request.amount,
            created_at: OffsetDateTime::now_utc(),
        })
    }

    async fn inquire_status(
        &self,
        provider_reference: &ProviderReference,
    ) -> Result<PaymentStatus, OpenWrapperError> {
        self.ensure_capability(Capability::InquireStatus)?;
        // See module docs: for this adapter, `provider_reference` holds
        // `merchantRefNumber`, which is exactly what Get Payment Status V2
        // is keyed on.
        let body = self.client.get_status(provider_reference.as_str()).await?;
        let order_status = body
            .get("orderStatus")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        Ok(status::map_order_status(order_status))
    }

    fn verify_and_parse_webhook(
        &self,
        raw: &RawWebhookRequest,
    ) -> Result<WebhookEvent, WebhookError> {
        webhook::verify_and_parse(self.client.config(), raw)
    }
}
