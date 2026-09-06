//! `openwrapper-provider-mock`: Deterministic mock payment provider rail.
//!
//! Provides a zero-network, fully reproducible adapter for local development,
//! continuous integration, and architectural verification.
//!
//! # Invariants:
//! - I1: Core never depends on this crate; this crate implements `openwrapper_core::Provider`.
//! - I3: Credentials and secrets are never logged or persisted.
//! - I5: Ambiguous outcomes (amount % 100 == 88) produce `Timeout` errors to test reconciliation.

use async_trait::async_trait;
use hmac::{Hmac, Mac};
use openwrapper_core::{
    Capability, CreationStatus, OpenWrapperError, PaymentId, PaymentNextAction, PaymentRequest,
    PaymentResult, PaymentStatus, Provider, ProviderId, ProviderReference, RawWebhookRequest,
    WebhookError, WebhookEvent,
};
use secrecy::{ExposeSecret, Secret};
use serde::Deserialize;
use sha2::Sha256;
use std::sync::Arc;
use time::OffsetDateTime;

pub const PROVIDER_ID: &str = "mock";

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
pub struct MockConfig {
    pub hmac_secret: Secret<String>,
}

impl Default for MockConfig {
    fn default() -> Self {
        Self {
            hmac_secret: Secret::new("mock_default_secret_key_for_testing_purposes".to_string()),
        }
    }
}

pub struct MockProvider {
    config: MockConfig,
    provider_id: ProviderId,
}

impl MockProvider {
    pub fn new(config: MockConfig) -> Result<Self, OpenWrapperError> {
        let provider_id =
            ProviderId::parse(PROVIDER_ID).map_err(|e| OpenWrapperError::Configuration {
                message: format!("invalid mock provider ID: {e}"),
            })?;
        Ok(Self {
            config,
            provider_id,
        })
    }

    pub fn default_provider() -> Arc<Self> {
        Arc::new(Self::new(MockConfig::default()).expect("default mock provider"))
    }

    /// Computes the expected HMAC-SHA256 hex digest for a webhook payload.
    pub fn compute_signature(&self, payload: &[u8]) -> String {
        let mut mac =
            HmacSha256::new_from_slice(self.config.hmac_secret.expose_secret().as_bytes())
                .expect("HMAC initialization failed");
        mac.update(payload);
        hex::encode(mac.finalize().into_bytes())
    }
}

#[async_trait]
impl Provider for MockProvider {
    fn id(&self) -> ProviderId {
        self.provider_id.clone()
    }

    fn capabilities(&self) -> &'static [Capability] {
        static CAPABILITIES: [Capability; 3] = [
            Capability::CreatePayment,
            Capability::InquireStatus,
            Capability::Webhook,
        ];
        &CAPABILITIES
    }

    async fn create_payment(
        &self,
        payment_id: &PaymentId,
        request: &PaymentRequest,
    ) -> Result<PaymentResult, OpenWrapperError> {
        self.ensure_capability(Capability::CreatePayment)?;

        let minor_units = request.amount.minor_units();

        // Deterministic simulation based on amount minor units:
        // 1. Ending in 99 -> immediate card/provider decline
        if minor_units % 100 == 99 {
            return Err(OpenWrapperError::Provider {
                provider: PROVIDER_ID.to_string(),
                provider_code: Some("card_declined".to_string()),
                message: "Simulated card decline (amount ends in 99)".to_string(),
            });
        }

        // 2. Ending in 88 -> simulated network/provider timeout (ambiguous outcome)
        if minor_units % 100 == 88 {
            return Err(OpenWrapperError::Timeout {
                provider: PROVIDER_ID.to_string(),
                elapsed_ms: 10_000,
            });
        }

        let provider_ref = ProviderReference::new(format!("mock_ref_{payment_id}"));

        // Generate next action: kiosk code if phone starts with +20 and no return_url, else redirect URL
        let next_action = if request.customer.phone.starts_with("+20")
            && request.return_url.is_none()
        {
            let id_str = payment_id.to_string();
            let prefix = if id_str.len() >= 8 {
                &id_str[..8]
            } else {
                &id_str
            };
            Some(PaymentNextAction::PayAtReference {
                reference: format!("MOCK-{prefix}"),
                instructions: Some("Pay at any partner kiosk with this reference code".to_string()),
            })
        } else {
            Some(PaymentNextAction::RedirectToUrl {
                url: format!("https://checkout.openwrapper.internal/mock/pay/{payment_id}"),
            })
        };

        Ok(PaymentResult {
            provider: self.provider_id.clone(),
            provider_reference: provider_ref,
            status: CreationStatus::Pending,
            next_action,
            amount: request.amount,
            created_at: OffsetDateTime::now_utc(),
        })
    }

    async fn inquire_status(
        &self,
        provider_reference: &ProviderReference,
    ) -> Result<PaymentStatus, OpenWrapperError> {
        self.ensure_capability(Capability::InquireStatus)?;

        let s = provider_reference.as_str();
        if s.contains("failed") || s.contains("decline") {
            Ok(PaymentStatus::Failed)
        } else if s.contains("unknown") || s.contains("ambiguous") {
            Ok(PaymentStatus::Unknown)
        } else if s.contains("pending") {
            Ok(PaymentStatus::Pending)
        } else {
            Ok(PaymentStatus::Succeeded)
        }
    }

    fn verify_and_parse_webhook(
        &self,
        raw: &RawWebhookRequest,
    ) -> Result<WebhookEvent, WebhookError> {
        let sig_header = raw
            .headers
            .get("x-mock-signature")
            .ok_or(WebhookError::SignatureMissing)?;

        let sig_clean = sig_header.strip_prefix("sha256=").unwrap_or(sig_header);

        let mut mac =
            HmacSha256::new_from_slice(self.config.hmac_secret.expose_secret().as_bytes())
                .map_err(|_| WebhookError::SignatureInvalid)?;
        mac.update(&raw.raw_body);

        let sig_bytes = hex::decode(sig_clean).map_err(|_| WebhookError::SignatureInvalid)?;
        mac.verify_slice(&sig_bytes)
            .map_err(|_| WebhookError::SignatureInvalid)?;

        #[derive(Deserialize)]
        struct MockWebhookPayload {
            event_id: String,
            provider_reference: String,
            merchant_reference: Option<String>,
            status: String,
            amount_minor_units: Option<i64>,
        }

        let payload: MockWebhookPayload =
            serde_json::from_slice(&raw.raw_body).map_err(|e| WebhookError::MalformedPayload {
                detail: e.to_string(),
            })?;

        let status = match payload.status.to_ascii_lowercase().as_str() {
            "succeeded" | "success" | "paid" => PaymentStatus::Succeeded,
            "failed" | "declined" | "canceled" => PaymentStatus::Failed,
            "pending" => PaymentStatus::Pending,
            _ => {
                return Err(WebhookError::UnrecognizedEventType {
                    event_type: payload.status,
                })
            }
        };

        Ok(WebhookEvent {
            provider: self.provider_id.clone(),
            event_id: payload.event_id,
            provider_reference: ProviderReference::new(payload.provider_reference),
            merchant_reference: payload.merchant_reference,
            reported_status: status,
            reported_amount_minor_units: payload.amount_minor_units,
            raw_for_diagnostics: serde_json::json!({
                "provider": "mock",
                "verified": true,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openwrapper_core::{Currency, CustomerDetails, IdempotencyKey, Money};
    use std::collections::BTreeMap;

    fn sample_request(minor_units: i64) -> PaymentRequest {
        PaymentRequest {
            idempotency_key: IdempotencyKey::parse("mock-idem-1").unwrap(),
            provider: ProviderId::parse(PROVIDER_ID).unwrap(),
            amount: Money::from_minor_units(minor_units, Currency::Egp).unwrap(),
            customer: CustomerDetails {
                phone: "+201000000000".to_string(),
                email: Some("test@example.com".to_string()),
                full_name: Some("Mock Tester".to_string()),
            },
            merchant_reference: Some("order-mock-001".to_string()),
            description: Some("Mock charge".to_string()),
            return_url: None,
            metadata: BTreeMap::new(),
        }
    }

    #[tokio::test]
    async fn standard_payment_returns_pending_with_kiosk_reference() {
        let provider = MockProvider::default_provider();
        let pid = PaymentId::new();
        let req = sample_request(1000);
        let res = provider.create_payment(&pid, &req).await.unwrap();

        assert_eq!(res.status, CreationStatus::Pending);
        assert!(res.provider_reference.as_str().starts_with("mock_ref_"));
        assert!(matches!(
            res.next_action,
            Some(PaymentNextAction::PayAtReference { .. })
        ));
    }

    #[tokio::test]
    async fn amount_ending_in_99_declines() {
        let provider = MockProvider::default_provider();
        let pid = PaymentId::new();
        let req = sample_request(1099);
        let err = provider.create_payment(&pid, &req).await.unwrap_err();

        assert!(matches!(
            err,
            OpenWrapperError::Provider {
                provider_code: Some(code),
                ..
            } if code == "card_declined"
        ));
    }

    #[tokio::test]
    async fn amount_ending_in_88_times_out() {
        let provider = MockProvider::default_provider();
        let pid = PaymentId::new();
        let req = sample_request(1088);
        let err = provider.create_payment(&pid, &req).await.unwrap_err();

        assert!(matches!(err, OpenWrapperError::Timeout { .. }));
    }

    #[test]
    fn webhook_verification_and_parsing() {
        let provider = MockProvider::default_provider();
        let payload = br#"{"event_id":"evt_1","provider_reference":"mock_ref_123","status":"succeeded","amount_minor_units":1000}"#;
        let sig = provider.compute_signature(payload);

        let mut headers = BTreeMap::new();
        headers.insert("x-mock-signature".to_string(), sig);

        let raw = RawWebhookRequest {
            raw_body: payload.to_vec(),
            headers,
            query: BTreeMap::new(),
        };

        let event = provider.verify_and_parse_webhook(&raw).unwrap();
        assert_eq!(event.event_id, "evt_1");
        assert_eq!(event.reported_status, PaymentStatus::Succeeded);
        assert_eq!(event.reported_amount_minor_units, Some(1000));
    }

    #[test]
    fn webhook_rejects_invalid_signature() {
        let provider = MockProvider::default_provider();
        let payload =
            br#"{"event_id":"evt_1","provider_reference":"mock_ref_123","status":"succeeded"}"#;

        let mut headers = BTreeMap::new();
        headers.insert(
            "x-mock-signature".to_string(),
            "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff".to_string(),
        );

        let raw = RawWebhookRequest {
            raw_body: payload.to_vec(),
            headers,
            query: BTreeMap::new(),
        };

        assert!(matches!(
            provider.verify_and_parse_webhook(&raw),
            Err(WebhookError::SignatureInvalid)
        ));
    }
}
