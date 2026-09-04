//! Paymob HMAC verification for the Transaction Processed callback.
//!
//! Source of truth (fetched and cross-checked against two independent
//! Paymob-family documentation mirrors during this project — see
//! research/paymob.md for the citations and the worked example used to
//! derive `paymob_field_string`'s exact stringification rules):
//!
//! 1. Take the callback's `obj` object.
//! 2. Extract these fields, in exactly this order:
//!    amount_cents, created_at, currency, error_occured,
//!    has_parent_transaction, id, integration_id, is_3d_secure, is_auth,
//!    is_capture, is_refunded, is_standalone_payment, is_voided, order.id,
//!    owner, pending, source_data.pan, source_data.sub_type,
//!    source_data.type, success
//! 3. Concatenate their string values (booleans as lowercase `true`/
//!    `false`, numbers as plain decimal, missing/null as empty string).
//! 4. HMAC-SHA512 the concatenated string with the merchant's HMAC secret;
//!    hex-encode (lowercase).
//! 5. Compare against the `hmac` query parameter Paymob appends to the
//!    notification URL.

use hmac::{Hmac, Mac};
use secrecy::{ExposeSecret, Secret};
use sha2::Sha512;

type HmacSha512 = Hmac<Sha512>;

/// Field order is load-bearing: do not reorder, alphabetize, or "clean up"
/// this list. It is copied verbatim from Paymob's documentation.
pub const HMAC_FIELD_ORDER: &[&str] = &[
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order.id",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
];

/// Reads a (possibly one-level-nested, via `"a.b"`) field out of a JSON
/// object and renders it the way Paymob's own HMAC reference string
/// renders it: bare `true`/`false` for booleans, plain decimal for
/// numbers, the raw string for strings, and empty string for anything
/// missing or null.
pub fn paymob_field_string(obj: &serde_json::Value, path: &str) -> String {
    let value = match path.split_once('.') {
        Some((outer, inner)) => obj.get(outer).and_then(|v| v.get(inner)),
        None => obj.get(path),
    };
    match value {
        None | Some(serde_json::Value::Null) => String::new(),
        Some(serde_json::Value::Bool(b)) => b.to_string(),
        Some(serde_json::Value::Number(n)) => n.to_string(),
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(other) => other.to_string(),
    }
}

pub fn concatenated_hmac_string(obj: &serde_json::Value) -> String {
    HMAC_FIELD_ORDER
        .iter()
        .map(|path| paymob_field_string(obj, path))
        .collect::<Vec<_>>()
        .concat()
}

fn hmac_for(obj: &serde_json::Value, hmac_secret: &Secret<String>) -> HmacSha512 {
    let message = concatenated_hmac_string(obj);
    let mut mac = HmacSha512::new_from_slice(hmac_secret.expose_secret().as_bytes())
        .expect("HMAC accepts any key length");
    mac.update(message.as_bytes());
    mac
}

#[cfg(test)]
pub fn compute_hmac_hex(obj: &serde_json::Value, hmac_secret: &Secret<String>) -> String {
    hex::encode(hmac_for(obj, hmac_secret).finalize().into_bytes())
}

pub fn verify(obj: &serde_json::Value, received_hmac: &str, hmac_secret: &Secret<String>) -> bool {
    let Ok(received) = hex::decode(received_hmac) else {
        return false;
    };
    hmac_for(obj, hmac_secret).verify_slice(&received).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Field-order and stringification-rule test, built from a
    /// self-constructed fixture rather than claiming to reproduce Paymob's
    /// published sample byte-for-byte. The truncated documentation
    /// snippet available during research showed the transaction `obj`
    /// shape and the *resulting* concatenated string, but did not fully
    /// confirm every intermediate field's value (e.g. `owner`), so
    /// asserting equality against a guessed reconstruction of their exact
    /// numbers would itself be a fabrication (§26). What research/paymob.md
    /// *does* cite with confidence is `HMAC_FIELD_ORDER` itself and the
    /// stringification rules (booleans lowercase, numbers bare, missing →
    /// empty) — that's what this test actually pins.
    #[test]
    fn field_order_and_stringification_rules_are_applied_as_documented() {
        let obj = serde_json::json!({
            "amount_cents": 100,
            "created_at": "2020-03-25T18:39:44.719228",
            "currency": "EGP",
            "error_occured": false,
            "has_parent_transaction": false,
            "id": 2556706,
            "integration_id": 6741,
            "is_3d_secure": true,
            "is_auth": false,
            "is_capture": false,
            "is_refunded": false,
            "is_standalone_payment": true,
            "is_voided": false,
            "order": { "id": 4778239 },
            "owner": 4705,
            "pending": false,
            "source_data": { "pan": "2346", "sub_type": "MasterCard", "type": "card" },
            "success": true
        });

        let expected = [
            "100",
            "2020-03-25T18:39:44.719228",
            "EGP",
            "false",
            "false",
            "2556706",
            "6741",
            "true",
            "false",
            "false",
            "false",
            "true",
            "false",
            "4778239",
            "4705",
            "false",
            "2346",
            "MasterCard",
            "card",
            "true",
        ]
        .concat();

        assert_eq!(concatenated_hmac_string(&obj), expected);
    }

    #[test]
    fn tampering_with_amount_invalidates_signature() {
        let secret = Secret::new("hmac-secret".to_string());
        let obj = serde_json::json!({
            "id": 1, "amount_cents": 1000, "success": true, "pending": false,
            "currency": "EGP", "created_at": "t", "error_occured": false,
            "has_parent_transaction": false, "integration_id": 1,
            "is_3d_secure": false, "is_auth": false, "is_capture": false,
            "is_refunded": false, "is_standalone_payment": true, "is_voided": false,
            "order": {"id": 1}, "owner": 1,
            "source_data": {"pan": "0000", "sub_type": "Visa", "type": "card"}
        });
        let sig = compute_hmac_hex(&obj, &secret);

        let mut tampered = obj.clone();
        tampered["amount_cents"] = serde_json::json!(999999);
        assert!(!verify(&tampered, &sig, &secret));
        assert!(verify(&obj, &sig, &secret));
    }

    #[test]
    fn missing_field_renders_as_empty_string_not_the_word_null() {
        let obj = serde_json::json!({"amount_cents": 1});
        assert_eq!(paymob_field_string(&obj, "created_at"), "");
        assert_eq!(paymob_field_string(&obj, "order.id"), "");
    }

    #[test]
    fn verification_rejects_malformed_or_truncated_hex() {
        let secret = Secret::new("hmac-secret".to_string());
        let obj = serde_json::json!({"id": 1});
        let signature = compute_hmac_hex(&obj, &secret);

        assert!(verify(&obj, &signature.to_ascii_uppercase(), &secret));
        assert!(!verify(&obj, "not-hex", &secret));
        assert!(!verify(&obj, &signature[..signature.len() - 2], &secret));
    }
}
