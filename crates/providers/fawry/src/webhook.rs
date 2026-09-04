//! Maps a verified Fawry Server Notification V2 delivery into
//! `openwrapper_core::WebhookEvent`. As with the Paymob adapter,
//! verification always happens first (I7) — see `verify_and_parse`, the
//! sole entry point.
//!
//! Assumption flagged per §26: the notification is treated as a JSON POST
//! body (consistent with the documented field table containing nested
//! objects like `threeDSInfo`/`invoiceInfo`/`orderItems`, which are
//! naturally JSON). Confirm the exact `Content-Type` against a live
//! sandbox delivery before production use — see research/fawry.md.

use crate::config::FawryConfig;
use crate::decimal::value_as_amount_string;
use openwrapper_core::{ProviderId, ProviderReference, WebhookError, WebhookEvent};
use sha2::{Digest, Sha256};

/// Fields carrying customer PII, authentication material, or detailed
/// payment context. They must not enter the diagnostic channel.
const SENSITIVE_FIELDS_TO_REDACT: &[&str] = &[
    "customerName",
    "customerMobile",
    "customerMail",
    "threeDSInfo",
    "invoiceInfo",
    "messageSignature",
];

fn redact_sensitive_fields(mut payload: serde_json::Value) -> serde_json::Value {
    if let Some(obj) = payload.as_object_mut() {
        for field in SENSITIVE_FIELDS_TO_REDACT {
            obj.remove(*field);
        }
    }
    payload
}

pub fn verify_and_parse(
    config: &FawryConfig,
    raw: &openwrapper_core::RawWebhookRequest,
) -> Result<WebhookEvent, WebhookError> {
    let payload: serde_json::Value =
        serde_json::from_slice(&raw.raw_body).map_err(|e| WebhookError::MalformedPayload {
            detail: format!("body is not valid JSON: {e}"),
        })?;

    let get_str = |field: &str| -> Option<String> {
        payload.get(field).and_then(|v| match v {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Number(n) => Some(n.to_string()),
            _ => None,
        })
    };

    // A missing signature is always reported as such, regardless of which
    // untrusted payload fields are also absent.
    let received_signature = get_str("messageSignature").ok_or(WebhookError::SignatureMissing)?;

    let fawry_ref_number =
        get_str("fawryRefNumber").ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing fawryRefNumber".into(),
        })?;
    let merchant_ref_number =
        get_str("merchantRefNumber").ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing merchantRefNumber".into(),
        })?;
    let order_status = get_str("orderStatus").ok_or_else(|| WebhookError::MalformedPayload {
        detail: "missing orderStatus".into(),
    })?;
    let payment_method = get_str("paymentMethod").unwrap_or_default();
    let payment_reference_number =
        get_str("paymentRefrenceNumber").or_else(|| get_str("paymentReferenceNumber"));

    let payment_amount_2dp = payload
        .get("paymentAmount")
        .and_then(value_as_amount_string)
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing or non-numeric paymentAmount".into(),
        })?;
    let order_amount_2dp = payload
        .get("orderAmount")
        .and_then(value_as_amount_string)
        .ok_or_else(|| WebhookError::MalformedPayload {
            detail: "missing or non-numeric orderAmount".into(),
        })?;

    let expected_signature = crate::signature::webhook_signature(
        &fawry_ref_number,
        &merchant_ref_number,
        &payment_amount_2dp,
        &order_amount_2dp,
        &order_status,
        &payment_method,
        payment_reference_number.as_deref(),
        &config.secure_key,
    );

    if !crate::signature::constant_time_eq_hex(&expected_signature, &received_signature) {
        return Err(WebhookError::SignatureInvalid);
    }
    if payment_method != "PAYATFAWRY" {
        return Err(WebhookError::UnrecognizedEventType {
            event_type: payment_method,
        });
    }

    let reported_amount_minor_units =
        crate::decimal::decimal_str_to_minor_units(&payment_amount_2dp)
            .filter(|amount| *amount > 0)
            .ok_or_else(|| WebhookError::MalformedPayload {
                detail: "paymentAmount is outside the supported positive 2dp range".into(),
            })?;
    let request_id = get_str("requestId").filter(|id| !id.trim().is_empty());
    let event_identity = request_id.unwrap_or_else(|| {
        hex::encode(Sha256::digest(
            received_signature.to_ascii_lowercase().as_bytes(),
        ))
    });

    Ok(WebhookEvent {
        provider: ProviderId::parse("fawry").expect("static id is valid"),
        event_id: format!("fawry:{event_identity}"),
        // See module docs on `lib.rs`: for Fawry, `ProviderReference`
        // holds `merchantRefNumber` (our own correlation key, which is
        // also what Get Payment Status V2 keys inquiry on) rather than
        // Fawry's own `fawryRefNumber`.
        provider_reference: ProviderReference::new(merchant_ref_number.clone()),
        merchant_reference: Some(merchant_ref_number),
        reported_status: crate::status::map_order_status(&order_status),
        reported_amount_minor_units: Some(reported_amount_minor_units),
        raw_for_diagnostics: redact_sensitive_fields(payload),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use openwrapper_core::PaymentStatus;
    use secrecy::Secret;
    use std::collections::BTreeMap;

    fn config() -> FawryConfig {
        FawryConfig {
            merchant_code: "MC1".into(),
            secure_key: Secret::new("s3cr3t".into()),
            base_url: "https://atfawry.fawrystaging.com".into(),
            debug_signatures: false,
        }
    }

    /// Builds the *raw bytes* of a notification body the way Fawry would
    /// actually put them on the wire, with `paymentAmount`/`orderAmount`
    /// as literal JSON number text (e.g. `100.00`, trailing zero
    /// included). This matters: constructing a `serde_json::Value` via
    /// `json!(100.00)` from a Rust `f64` literal and then
    /// re-serializing it silently drops the trailing zero (`100.0`),
    /// which isn't representative of a real delivery and would defeat the
    /// point of testing `arbitrary_precision` preservation.
    fn valid_body_bytes(cfg: &FawryConfig, payment_amount: &str, order_amount: &str) -> Vec<u8> {
        let sig = crate::signature::webhook_signature(
            "FR123",
            "MR123",
            payment_amount,
            order_amount,
            "PAID",
            "PAYATFAWRY",
            None,
            &cfg.secure_key,
        );
        format!(
            r#"{{
                "requestId": "req-abc",
                "fawryRefNumber": "FR123",
                "merchantRefNumber": "MR123",
                "customerName": "Ahmed Ali",
                "customerMobile": "+201000000000",
                "paymentAmount": {payment_amount},
                "orderAmount": {order_amount},
                "orderStatus": "PAID",
                "paymentMethod": "PAYATFAWRY",
                "messageSignature": "{sig}"
            }}"#
        )
        .into_bytes()
    }

    #[test]
    fn valid_signature_parses_and_redacts_pii() {
        let cfg = config();
        let raw = openwrapper_core::RawWebhookRequest {
            raw_body: valid_body_bytes(&cfg, "100.00", "100.00"),
            headers: BTreeMap::new(),
            query: BTreeMap::new(),
        };
        let event = verify_and_parse(&cfg, &raw).unwrap();
        assert_eq!(event.reported_status, PaymentStatus::Succeeded);
        assert_eq!(event.reported_amount_minor_units, Some(10000));
        assert!(event.raw_for_diagnostics.get("customerName").is_none());
        assert!(event.raw_for_diagnostics.get("customerMobile").is_none());
        assert!(event.raw_for_diagnostics.get("messageSignature").is_none());
    }

    #[test]
    fn tampered_amount_is_rejected() {
        let cfg = config();
        // Signature is computed for 100.00 but the body claims 1.00 —
        // simulates an attacker rewriting the amount in transit.
        let sig = crate::signature::webhook_signature(
            "FR123",
            "MR123",
            "100.00",
            "100.00",
            "PAID",
            "PAYATFAWRY",
            None,
            &cfg.secure_key,
        );
        let tampered = format!(
            r#"{{"requestId":"req-abc","fawryRefNumber":"FR123","merchantRefNumber":"MR123",
                "paymentAmount":1.00,"orderAmount":100.00,"orderStatus":"PAID",
                "paymentMethod":"PAYATFAWRY","messageSignature":"{sig}"}}"#
        );
        let raw = openwrapper_core::RawWebhookRequest {
            raw_body: tampered.into_bytes(),
            headers: BTreeMap::new(),
            query: BTreeMap::new(),
        };
        assert!(matches!(
            verify_and_parse(&cfg, &raw),
            Err(WebhookError::SignatureInvalid)
        ));
    }

    #[test]
    fn missing_signature_is_rejected_before_anything_else() {
        let cfg = config();
        let body = r#"{"untrusted":"payload"}"#;
        let raw = openwrapper_core::RawWebhookRequest {
            raw_body: body.as_bytes().to_vec(),
            headers: BTreeMap::new(),
            query: BTreeMap::new(),
        };
        assert!(matches!(
            verify_and_parse(&cfg, &raw),
            Err(WebhookError::SignatureMissing)
        ));
    }

    #[test]
    fn fallback_event_identity_is_stable_for_retries_and_changes_with_status() {
        fn body_without_request_id(cfg: &FawryConfig, status: &str) -> Vec<u8> {
            let signature = crate::signature::webhook_signature(
                "FR123",
                "MR123",
                "100.00",
                "100.00",
                status,
                "PAYATFAWRY",
                None,
                &cfg.secure_key,
            );
            format!(
                r#"{{"fawryRefNumber":"FR123","merchantRefNumber":"MR123",
                    "paymentAmount":100.00,"orderAmount":100.00,"orderStatus":"{status}",
                    "paymentMethod":"PAYATFAWRY","messageSignature":"{signature}"}}"#
            )
            .into_bytes()
        }

        let cfg = config();
        let parse = |body| {
            verify_and_parse(
                &cfg,
                &openwrapper_core::RawWebhookRequest {
                    raw_body: body,
                    headers: BTreeMap::new(),
                    query: BTreeMap::new(),
                },
            )
            .unwrap()
        };
        let paid = body_without_request_id(&cfg, "PAID");
        let first = parse(paid.clone());
        let retry = parse(paid);
        let expired = parse(body_without_request_id(&cfg, "EXPIRED"));

        assert_eq!(first.event_id, retry.event_id);
        assert_ne!(first.event_id, expired.event_id);
    }

    #[test]
    fn verified_unsupported_method_and_unusable_amount_are_rejected() {
        let cfg = config();
        let signature = crate::signature::webhook_signature(
            "FR123",
            "MR123",
            "0.00",
            "0.00",
            "PAID",
            "CARD",
            None,
            &cfg.secure_key,
        );
        let body = format!(
            r#"{{"fawryRefNumber":"FR123","merchantRefNumber":"MR123",
                "paymentAmount":0.00,"orderAmount":0.00,"orderStatus":"PAID",
                "paymentMethod":"CARD","messageSignature":"{signature}"}}"#
        );
        let raw = openwrapper_core::RawWebhookRequest {
            raw_body: body.into_bytes(),
            headers: BTreeMap::new(),
            query: BTreeMap::new(),
        };
        assert!(matches!(
            verify_and_parse(&cfg, &raw),
            Err(WebhookError::UnrecognizedEventType { .. })
        ));

        let raw = openwrapper_core::RawWebhookRequest {
            raw_body: valid_body_bytes(&cfg, "0.00", "0.00"),
            headers: BTreeMap::new(),
            query: BTreeMap::new(),
        };
        assert!(matches!(
            verify_and_parse(&cfg, &raw),
            Err(WebhookError::MalformedPayload { .. })
        ));
    }
}
