//! Stripe webhook signature verification (`Stripe-Signature` header).
//!
//! Scheme:
//! 1. The `Stripe-Signature` header contains comma-separated key-value pairs,
//!    e.g. `t=1614555895,v1=5257a869...,v1=...`.
//! 2. The signed payload is the string representation of timestamp `t`,
//!    followed by a dot `.`, followed by the raw request body bytes.
//! 3. The signature `v1` is the hex-encoded HMAC-SHA256 of the signed payload
//!    using the webhook signing secret (`whsec_...`).
//! 4. Verification succeeds if at least one `v1` signature matches the computed
//!    HMAC in constant time and `|now - t| <= tolerance_secs`.

use hmac::{Hmac, Mac};
use openwrapper_core::WebhookError;
use secrecy::{ExposeSecret, Secret};
use sha2::Sha256;
use time::OffsetDateTime;

type HmacSha256 = Hmac<Sha256>;

pub struct ParsedSignatureHeader<'a> {
    pub timestamp: i64,
    pub signatures: Vec<&'a str>,
}

pub fn parse_signature_header(header: &str) -> Result<ParsedSignatureHeader<'_>, WebhookError> {
    let mut timestamp = None;
    let mut signatures = Vec::new();

    for item in header.split(',') {
        let mut parts = item.splitn(2, '=');
        let key = parts.next().map(str::trim).unwrap_or("");
        let val = parts.next().map(str::trim).unwrap_or("");
        match key {
            "t" => {
                if let Ok(ts) = val.parse::<i64>() {
                    timestamp = Some(ts);
                }
            }
            "v1" => {
                if !val.is_empty() {
                    signatures.push(val);
                }
            }
            _ => {}
        }
    }

    let timestamp = timestamp.ok_or(WebhookError::SignatureMissing)?;
    if signatures.is_empty() {
        return Err(WebhookError::SignatureMissing);
    }

    Ok(ParsedSignatureHeader {
        timestamp,
        signatures,
    })
}

pub fn verify_signature(
    webhook_secret: &Secret<String>,
    raw_body: &[u8],
    header_val: &str,
    tolerance_secs: u64,
) -> Result<(), WebhookError> {
    let parsed = parse_signature_header(header_val)?;

    if tolerance_secs > 0 {
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let diff = (now - parsed.timestamp).abs();
        if diff > tolerance_secs as i64 {
            return Err(WebhookError::SignatureInvalid);
        }
    }

    let signed_payload = format_signed_payload(parsed.timestamp, raw_body);
    let mac = compute_mac(webhook_secret, &signed_payload)?;

    let mut any_valid = false;
    for sig_hex in parsed.signatures {
        if let Ok(sig_bytes) = hex::decode(sig_hex) {
            let candidate_mac = mac.clone();
            if candidate_mac.verify_slice(&sig_bytes).is_ok() {
                any_valid = true;
                break;
            }
        }
    }

    if any_valid {
        Ok(())
    } else {
        Err(WebhookError::SignatureInvalid)
    }
}

fn format_signed_payload(timestamp: i64, raw_body: &[u8]) -> Vec<u8> {
    let mut payload = Vec::with_capacity(timestamp.to_string().len() + 1 + raw_body.len());
    payload.extend_from_slice(timestamp.to_string().as_bytes());
    payload.push(b'.');
    payload.extend_from_slice(raw_body);
    payload
}

fn compute_mac(
    webhook_secret: &Secret<String>,
    signed_payload: &[u8],
) -> Result<HmacSha256, WebhookError> {
    let mut mac = HmacSha256::new_from_slice(webhook_secret.expose_secret().as_bytes())
        .map_err(|_| WebhookError::SignatureInvalid)?;
    mac.update(signed_payload);
    Ok(mac)
}

#[cfg(test)]
pub fn compute_signature(
    webhook_secret: &Secret<String>,
    raw_body: &[u8],
    timestamp: i64,
) -> String {
    let signed_payload = format_signed_payload(timestamp, raw_body);
    let mac = compute_mac(webhook_secret, &signed_payload).unwrap();
    hex::encode(mac.finalize().into_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_signature_verification_succeeds() {
        let secret = Secret::new("whsec_test_secret_key_12345".to_string());
        let body = br#"{"id":"evt_123","type":"checkout.session.completed"}"#;
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let sig = compute_signature(&secret, body, now);
        let header = format!("t={now},v1={sig}");

        assert!(verify_signature(&secret, body, &header, 300).is_ok());
    }

    #[test]
    fn expired_timestamp_fails() {
        let secret = Secret::new("whsec_test_secret_key_12345".to_string());
        let body = br#"{"id":"evt_123"}"#;
        let past = OffsetDateTime::now_utc().unix_timestamp() - 400;
        let sig = compute_signature(&secret, body, past);
        let header = format!("t={past},v1={sig}");

        assert!(matches!(
            verify_signature(&secret, body, &header, 300),
            Err(WebhookError::SignatureInvalid)
        ));
    }

    #[test]
    fn tampered_payload_fails() {
        let secret = Secret::new("whsec_test_secret_key_12345".to_string());
        let body = br#"{"id":"evt_123"}"#;
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let sig = compute_signature(&secret, body, now);
        let header = format!("t={now},v1={sig}");

        let tampered = br#"{"id":"evt_999"}"#;
        assert!(matches!(
            verify_signature(&secret, tampered, &header, 300),
            Err(WebhookError::SignatureInvalid)
        ));
    }

    #[test]
    fn rolled_signatures_pass_if_one_matches() {
        let secret = Secret::new("whsec_test_secret_key_12345".to_string());
        let body = br#"{"id":"evt_123"}"#;
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let sig = compute_signature(&secret, body, now);
        let header = format!(
            "t={now},v1=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb,v1={sig}"
        );

        assert!(verify_signature(&secret, body, &header, 300).is_ok());
    }
}
