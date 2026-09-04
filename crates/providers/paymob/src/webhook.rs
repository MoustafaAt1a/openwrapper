//! Maps a verified Paymob "Transaction Processed" callback into
//! `openwrapper_core::WebhookEvent`. Verification (see `signature.rs`)
//! always happens before any field here is trusted (I7) — this function is
//! only ever called from `Provider::verify_and_parse_webhook`, which
//! performs the HMAC check first and returns early on failure.

use crate::config::PaymobConfig;
use openwrapper_core::{PaymentStatus, ProviderId, ProviderReference, WebhookError, WebhookEvent};
use sha2::{Digest, Sha256};

const SENSITIVE_DIAGNOSTIC_FIELDS: &[&str] = &[
    "api_key",
    "billing_data",
    "card_num",
    "client_secret",
    "email",
    "first_name",
    "hmac",
    "last_name",
    "pan",
    "phone_number",
    "shipping_data",
    "shipping_details",
    "signature",
    "token",
];

pub fn parse_verified_transaction(
    obj: &serde_json::Value,
    verified_hmac: &str,
) -> Result<WebhookEvent, WebhookError> {
    let id =
        obj.get("id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| WebhookError::MalformedPayload {
                detail: "obj.id missing or not a number".into(),
            })?;

    let success = required_bool(obj, "success")?;
    let pending = required_bool(obj, "pending")?;
    let error_occured = required_bool(obj, "error_occured")?;
    if success && (pending || error_occured) {
        return Err(WebhookError::MalformedPayload {
            detail: "Paymob callback contains contradictory status flags".into(),
        });
    }

    // Status mapping, in order of precedence:
    //   pending=true                       -> Pending
    //   success=true                       -> Succeeded
    //   success=false & error_occured=true -> Failed
    //   otherwise (success=false, no error)-> Failed
    // Paymob only sends this callback on success or decline (documented:
    // "Paymob sends the transaction callback only if the transaction
    // succeeds or is declined"), so there is no documented case that maps
    // to Unknown here — Unknown is reserved for OpenWrapper's own
    // ambiguous states (timeouts, etc.), not for a value this callback can
    // actually carry. See docs/STATE_MACHINE.md.
    let reported_status = if pending {
        PaymentStatus::Pending
    } else if success {
        PaymentStatus::Succeeded
    } else {
        let _ = error_occured; // both branches map to Failed; kept for diagnostics below
        PaymentStatus::Failed
    };

    let merchant_reference = obj
        .get("order")
        .and_then(|o| o.get("merchant_order_id"))
        .and_then(|v| {
            v.as_str()
                .map(|s| s.to_string())
                .or_else(|| v.as_i64().map(|n| n.to_string()))
        });

    let reported_amount_minor_units = obj
        .get("amount_cents")
        .and_then(|v| v.as_i64())
        .filter(|amount| *amount > 0)
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "obj.amount_cents missing, non-integer, or not positive".into(),
        })?;
    let event_digest = Sha256::digest(verified_hmac.to_ascii_lowercase().as_bytes());

    Ok(WebhookEvent {
        provider: ProviderId::parse("paymob").expect("static id is valid"),
        event_id: format!("paymob:{id}:{}", hex::encode(event_digest)),
        provider_reference: ProviderReference::new(id.to_string()),
        merchant_reference,
        reported_status,
        reported_amount_minor_units: Some(reported_amount_minor_units),
        raw_for_diagnostics: redact_sensitive_fields(obj.clone()),
    })
}

fn required_bool(obj: &serde_json::Value, field: &str) -> Result<bool, WebhookError> {
    obj.get(field)
        .and_then(|value| value.as_bool())
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: format!("obj.{field} missing or not a boolean"),
        })
}

fn redact_sensitive_fields(mut value: serde_json::Value) -> serde_json::Value {
    match &mut value {
        serde_json::Value::Object(fields) => {
            fields.retain(|name, nested| {
                if SENSITIVE_DIAGNOSTIC_FIELDS
                    .iter()
                    .any(|sensitive| name.eq_ignore_ascii_case(sensitive))
                {
                    false
                } else {
                    *nested = redact_sensitive_fields(nested.take());
                    true
                }
            });
        }
        serde_json::Value::Array(items) => {
            for item in items {
                *item = redact_sensitive_fields(item.take());
            }
        }
        _ => {}
    }
    value
}

pub fn extract_hmac_from_query(
    query: &std::collections::BTreeMap<String, String>,
) -> Result<&str, WebhookError> {
    query
        .get("hmac")
        .map(|s| s.as_str())
        .ok_or(WebhookError::SignatureMissing)
}

pub fn verify_and_parse(
    config: &PaymobConfig,
    raw: &openwrapper_core::RawWebhookRequest,
) -> Result<WebhookEvent, WebhookError> {
    let hmac_param = extract_hmac_from_query(&raw.query)?;

    let payload: serde_json::Value =
        serde_json::from_slice(&raw.raw_body).map_err(|e| WebhookError::MalformedPayload {
            detail: format!("body is not valid JSON: {e}"),
        })?;

    let obj = payload
        .get("obj")
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing top-level \"obj\"".into(),
        })?;

    if !crate::signature::verify(obj, hmac_param, &config.hmac_secret) {
        return Err(WebhookError::SignatureInvalid);
    }

    parse_verified_transaction(obj, hmac_param)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::PaymobPaymentMethod;
    use secrecy::Secret;
    use std::collections::BTreeMap;

    fn config() -> PaymobConfig {
        PaymobConfig {
            secret_key: Secret::new("secret-key".into()),
            hmac_secret: Secret::new("hmac-secret".into()),
            public_key: "public-key".into(),
            base_url: PaymobConfig::DEFAULT_BASE_URL.into(),
            payment_methods: vec![PaymobPaymentMethod::Named("card".into())],
            notification_url: "https://example.com/v1/webhooks/paymob".into(),
            inquiry_path_template: PaymobConfig::DEFAULT_INQUIRY_PATH_TEMPLATE.into(),
            checkout_url_template: PaymobConfig::DEFAULT_CHECKOUT_URL_TEMPLATE.into(),
        }
    }

    fn callback_obj(success: bool, pending: bool) -> serde_json::Value {
        serde_json::json!({
            "amount_cents": 1000,
            "created_at": "2026-01-01T00:00:00",
            "currency": "EGP",
            "error_occured": false,
            "has_parent_transaction": false,
            "id": 42,
            "integration_id": 7,
            "is_3d_secure": true,
            "is_auth": false,
            "is_capture": false,
            "is_refunded": false,
            "is_standalone_payment": true,
            "is_voided": false,
            "order": {
                "id": 9,
                "merchant_order_id": "merchant-1",
                "shipping_data": {"first_name": "Ahmed", "phone_number": "+201000000000"}
            },
            "owner": 5,
            "pending": pending,
            "source_data": {"pan": "1234", "sub_type": "Visa", "type": "card"},
            "success": success
        })
    }

    fn signed_raw(
        cfg: &PaymobConfig,
        obj: &serde_json::Value,
    ) -> openwrapper_core::RawWebhookRequest {
        let signature = crate::signature::compute_hmac_hex(obj, &cfg.hmac_secret);
        openwrapper_core::RawWebhookRequest {
            raw_body: serde_json::to_vec(&serde_json::json!({"obj": obj})).unwrap(),
            headers: BTreeMap::new(),
            query: BTreeMap::from([("hmac".into(), signature)]),
        }
    }

    #[test]
    fn verified_callback_redacts_pii_and_uses_event_specific_identity() {
        let cfg = config();
        let pending_obj = callback_obj(false, true);
        let pending_event = verify_and_parse(&cfg, &signed_raw(&cfg, &pending_obj)).unwrap();
        let duplicate = verify_and_parse(&cfg, &signed_raw(&cfg, &pending_obj)).unwrap();
        let succeeded_obj = callback_obj(true, false);
        let succeeded_event = verify_and_parse(&cfg, &signed_raw(&cfg, &succeeded_obj)).unwrap();

        assert_eq!(pending_event.reported_status, PaymentStatus::Pending);
        assert_eq!(pending_event.reported_amount_minor_units, Some(1000));
        assert_eq!(pending_event.event_id, duplicate.event_id);
        assert_ne!(pending_event.event_id, succeeded_event.event_id);
        assert!(pending_event.raw_for_diagnostics["source_data"]
            .get("pan")
            .is_none());
        assert!(pending_event.raw_for_diagnostics["order"]
            .get("shipping_data")
            .is_none());
    }

    #[test]
    fn signed_but_ambiguous_status_or_amount_is_rejected() {
        let cfg = config();
        let mut missing_success = callback_obj(false, false);
        missing_success.as_object_mut().unwrap().remove("success");
        assert!(matches!(
            verify_and_parse(&cfg, &signed_raw(&cfg, &missing_success)),
            Err(WebhookError::MalformedPayload { .. })
        ));

        let contradictory = callback_obj(true, true);
        assert!(matches!(
            verify_and_parse(&cfg, &signed_raw(&cfg, &contradictory)),
            Err(WebhookError::MalformedPayload { .. })
        ));

        let mut zero_amount = callback_obj(true, false);
        zero_amount["amount_cents"] = serde_json::json!(0);
        assert!(matches!(
            verify_and_parse(&cfg, &signed_raw(&cfg, &zero_amount)),
            Err(WebhookError::MalformedPayload { .. })
        ));
    }
}
