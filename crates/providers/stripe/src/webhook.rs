//! Stripe webhook verification and payload parsing.
//!
//! Enforces Invariant I7: verification occurs before any payload inspection
//! or database state mutation can take place.

use crate::config::StripeConfig;
use crate::signature;
use openwrapper_core::{
    PaymentStatus, ProviderId, ProviderReference, RawWebhookRequest, WebhookError, WebhookEvent,
};

pub const PROVIDER_ID: &str = "stripe";

pub fn verify_and_parse(
    config: &StripeConfig,
    raw: &RawWebhookRequest,
) -> Result<WebhookEvent, WebhookError> {
    let webhook_secret = config
        .webhook_secret
        .as_ref()
        .ok_or(WebhookError::SignatureInvalid)?;

    let signature_header = raw
        .headers
        .get("stripe-signature")
        .or_else(|| raw.headers.get("Stripe-Signature"))
        .ok_or(WebhookError::SignatureMissing)?;

    signature::verify_signature(
        webhook_secret,
        &raw.raw_body,
        signature_header,
        config.webhook_tolerance_secs,
    )?;

    let json: serde_json::Value =
        serde_json::from_slice(&raw.raw_body).map_err(|e| WebhookError::MalformedPayload {
            detail: format!("invalid JSON: {e}"),
        })?;

    let event_id = json
        .get("id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing event id".into(),
        })?;

    let event_type = json
        .get("type")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing event type".into(),
        })?;

    let data_obj = json
        .get("data")
        .and_then(|d| d.get("object"))
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing data.object".into(),
        })?;

    let (provider_ref, merchant_ref, reported_status, reported_amount) = match event_type {
        "checkout.session.completed" => {
            let session_id = data_obj.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
                WebhookError::MalformedPayload {
                    detail: "checkout session missing id".into(),
                }
            })?;
            let merchant_ref = data_obj
                .get("client_reference_id")
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let payment_status = data_obj.get("payment_status").and_then(|v| v.as_str());
            let status = if payment_status == Some("paid") {
                PaymentStatus::Succeeded
            } else {
                PaymentStatus::Pending
            };
            let amount = data_obj.get("amount_total").and_then(|v| v.as_i64());
            (session_id.to_string(), merchant_ref, status, amount)
        }
        "checkout.session.expired" => {
            let session_id = data_obj.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
                WebhookError::MalformedPayload {
                    detail: "checkout session missing id".into(),
                }
            })?;
            let merchant_ref = data_obj
                .get("client_reference_id")
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let amount = data_obj.get("amount_total").and_then(|v| v.as_i64());
            (
                session_id.to_string(),
                merchant_ref,
                PaymentStatus::Failed,
                amount,
            )
        }
        "payment_intent.succeeded" => {
            let pi_id = data_obj.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
                WebhookError::MalformedPayload {
                    detail: "payment_intent missing id".into(),
                }
            })?;
            let merchant_ref = data_obj
                .get("metadata")
                .and_then(|m| {
                    m.get("merchant_reference")
                        .or_else(|| m.get("openwrapper_payment_id"))
                })
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let amount = data_obj.get("amount").and_then(|v| v.as_i64());
            (
                pi_id.to_string(),
                merchant_ref,
                PaymentStatus::Succeeded,
                amount,
            )
        }
        "payment_intent.payment_failed" | "payment_intent.canceled" => {
            let pi_id = data_obj.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
                WebhookError::MalformedPayload {
                    detail: "payment_intent missing id".into(),
                }
            })?;
            let merchant_ref = data_obj
                .get("metadata")
                .and_then(|m| {
                    m.get("merchant_reference")
                        .or_else(|| m.get("openwrapper_payment_id"))
                })
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let amount = data_obj.get("amount").and_then(|v| v.as_i64());
            (
                pi_id.to_string(),
                merchant_ref,
                PaymentStatus::Failed,
                amount,
            )
        }
        "payment_intent.processing" => {
            let pi_id = data_obj.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
                WebhookError::MalformedPayload {
                    detail: "payment_intent missing id".into(),
                }
            })?;
            let merchant_ref = data_obj
                .get("metadata")
                .and_then(|m| {
                    m.get("merchant_reference")
                        .or_else(|| m.get("openwrapper_payment_id"))
                })
                .and_then(|v| v.as_str())
                .map(str::to_string);
            let amount = data_obj.get("amount").and_then(|v| v.as_i64());
            (
                pi_id.to_string(),
                merchant_ref,
                PaymentStatus::Pending,
                amount,
            )
        }
        other => {
            return Err(WebhookError::UnrecognizedEventType {
                event_type: other.to_string(),
            });
        }
    };

    Ok(WebhookEvent {
        provider: ProviderId::parse(PROVIDER_ID).expect("static provider ID is valid"),
        event_id: event_id.to_string(),
        provider_reference: ProviderReference::new(provider_ref),
        merchant_reference: merchant_ref,
        reported_status,
        reported_amount_minor_units: reported_amount,
        raw_for_diagnostics: json,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use secrecy::Secret;
    use std::collections::BTreeMap;
    use time::OffsetDateTime;

    #[test]
    fn verify_and_parse_checkout_session_completed() {
        let secret = Secret::new("whsec_test_secret_key_12345".to_string());
        let config = StripeConfig {
            secret_key: Secret::new("sk_test_123".to_string()),
            webhook_secret: Some(secret.clone()),
            base_url: StripeConfig::DEFAULT_BASE_URL.to_string(),
            webhook_tolerance_secs: 300,
        };

        let body = serde_json::json!({
            "id": "evt_test_checkout_1",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_session_123",
                    "client_reference_id": "order-99",
                    "payment_status": "paid",
                    "amount_total": 5000
                }
            }
        });
        let raw_body = serde_json::to_vec(&body).unwrap();
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let sig = signature::compute_signature(&secret, &raw_body, now);

        let mut headers = BTreeMap::new();
        headers.insert("stripe-signature".to_string(), format!("t={now},v1={sig}"));

        let raw = RawWebhookRequest {
            raw_body,
            headers,
            query: BTreeMap::new(),
        };

        let event = verify_and_parse(&config, &raw).unwrap();
        assert_eq!(event.event_id, "evt_test_checkout_1");
        assert_eq!(event.provider.as_str(), "stripe");
        assert_eq!(event.provider_reference.as_str(), "cs_test_session_123");
        assert_eq!(event.merchant_reference.as_deref(), Some("order-99"));
        assert_eq!(event.reported_status, PaymentStatus::Succeeded);
        assert_eq!(event.reported_amount_minor_units, Some(5000));
    }
}
