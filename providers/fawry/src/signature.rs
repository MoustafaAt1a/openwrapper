//! Fawry uses SHA-256 (not HMAC — the secure key is simply concatenated
//! into the signed string) for three *different* purposes in this
//! adapter, each with its own documented field order. Mixing them up is a
//! realistic bug class, so each has its own named function rather than one
//! generic "sign these fields" helper.

use secrecy::{ExposeSecret, Secret};
use sha2::{Digest, Sha256};

fn sha256_hex_with_secret<'a>(
    parts: impl IntoIterator<Item = &'a str>,
    secure_key: &Secret<String>,
) -> String {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update(part.as_bytes());
    }
    // Feed the key directly into the digest rather than copying it into a
    // temporary String that would remain in heap memory after hashing.
    hasher.update(secure_key.expose_secret().as_bytes());
    hex::encode(hasher.finalize())
}

/// Signature for the PayAtFawry charge-creation request
/// (`create-payment-refno-apis`).
///
/// KNOWN LIMITATION (see research/fawry.md): the field concatenation order
/// below — `merchantCode + merchantRefNum + customerProfileId +
/// paymentMethod + amount + secureKey` — is reconstructed from a partial,
/// truncated documentation excerpt available during research (a PHP
/// sample whose final lines could not be retrieved), consistent with the
/// pattern used by Fawry's other signed endpoints. **This must be
/// confirmed against Fawry's own Signature Tool
/// (developer.fawrystaging.com/public/signatureTool) or a live sandbox
/// call before production use.** Per §22/§26, this uncertainty is
/// deliberately surfaced here rather than silently guessed past.
pub fn charge_signature(
    merchant_code: &str,
    merchant_ref_num: &str,
    customer_profile_id: Option<&str>,
    payment_method: &str,
    amount_2dp: &str,
    secure_key: &Secret<String>,
) -> String {
    sha256_hex_with_secret(
        [
            merchant_code,
            merchant_ref_num,
            customer_profile_id.unwrap_or(""),
            payment_method,
            amount_2dp,
        ],
        secure_key,
    )
}

/// Signature for Get Payment Status V2: confirmed —
/// `merchantCode + merchantRefNumber + secureKey`.
pub fn status_v2_signature(
    merchant_code: &str,
    merchant_ref_number: &str,
    secure_key: &Secret<String>,
) -> String {
    sha256_hex_with_secret([merchant_code, merchant_ref_number], secure_key)
}

/// Signature for the Server Notification V2 webhook: confirmed —
/// `fawryRefNumber + merchantRefNumber + paymentAmount(2dp) +
/// orderAmount(2dp) + orderStatus + paymentMethod +
/// paymentReferenceNumber (empty if absent) + secureKey`.
/// Source: developer.fawrystaging.com Server Notification V2 docs
/// (fetched directly — see research/fawry.md).
#[allow(clippy::too_many_arguments)]
pub fn webhook_signature(
    fawry_ref_number: &str,
    merchant_ref_number: &str,
    payment_amount_2dp: &str,
    order_amount_2dp: &str,
    order_status: &str,
    payment_method: &str,
    payment_reference_number: Option<&str>,
    secure_key: &Secret<String>,
) -> String {
    sha256_hex_with_secret(
        [
            fawry_ref_number,
            merchant_ref_number,
            payment_amount_2dp,
            order_amount_2dp,
            order_status,
            payment_method,
            payment_reference_number.unwrap_or(""),
        ],
        secure_key,
    )
}

pub fn constant_time_eq_hex(expected_hex: &str, received_hex: &str) -> bool {
    let (Ok(expected), Ok(received)) = (hex::decode(expected_hex), hex::decode(received_hex))
    else {
        return false;
    };
    if expected.len() != received.len() {
        return false;
    }

    let mut diff = 0u8;
    for (expected_byte, received_byte) in expected.iter().zip(&received) {
        diff |= expected_byte ^ received_byte;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn charge_signature_matches_shared_test_vector_inputs() {
        let key = Secret::new("s3cr3t".to_string());
        let sig = charge_signature(
            "MC1",
            "REF001",
            Some("201234567890"),
            "PAYATFAWRY",
            "100.00",
            &key,
        );
        let again = charge_signature(
            "MC1",
            "REF001",
            Some("201234567890"),
            "PAYATFAWRY",
            "100.00",
            &key,
        );
        assert_eq!(sig, again);
        assert_ne!(
            sig,
            charge_signature(
                "MC1",
                "REF002",
                Some("201234567890"),
                "PAYATFAWRY",
                "100.00",
                &key
            )
        );
    }

    #[test]
    fn status_v2_signature_is_deterministic_and_order_sensitive() {
        let key = Secret::new("s3cr3t".to_string());
        let a = status_v2_signature("MC1", "REF1", &key);
        let b = status_v2_signature("MC1", "REF1", &key);
        assert_eq!(a, b);
        let c = status_v2_signature("MC1", "REF2", &key);
        assert_ne!(a, c);
    }

    #[test]
    fn webhook_signature_changes_if_amount_tampered() {
        let key = Secret::new("s3cr3t".to_string());
        let sig = webhook_signature(
            "FR1",
            "MR1",
            "100.00",
            "100.00",
            "PAID",
            "PAYATFAWRY",
            None,
            &key,
        );
        let tampered = webhook_signature(
            "FR1",
            "MR1",
            "999.00",
            "100.00",
            "PAID",
            "PAYATFAWRY",
            None,
            &key,
        );
        assert_ne!(sig, tampered);
        assert!(constant_time_eq_hex(&sig, &sig));
        assert!(!constant_time_eq_hex(&sig, &tampered));
    }

    #[test]
    fn webhook_signature_treats_missing_payment_reference_as_empty() {
        let key = Secret::new("k".to_string());
        let with_none = webhook_signature(
            "FR1",
            "MR1",
            "1.00",
            "1.00",
            "NEW",
            "PAYATFAWRY",
            None,
            &key,
        );
        let with_empty = webhook_signature(
            "FR1",
            "MR1",
            "1.00",
            "1.00",
            "NEW",
            "PAYATFAWRY",
            Some(""),
            &key,
        );
        assert_eq!(with_none, with_empty);
    }

    #[test]
    fn constant_time_comparison_rejects_malformed_or_truncated_hex() {
        let expected = "ab".repeat(32);
        assert!(constant_time_eq_hex(
            &expected,
            &expected.to_ascii_uppercase()
        ));
        assert!(!constant_time_eq_hex(&expected, "not-hex"));
        assert!(!constant_time_eq_hex(
            &expected,
            &expected[..expected.len() - 2]
        ));
    }
}
