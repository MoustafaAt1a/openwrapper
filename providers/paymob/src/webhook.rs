//! Maps a verified Paymob "Transaction Processed" callback into
//! `openwrapper_core::WebhookEvent`. Verification (see `signature.rs`)
//! always happens before any field here is trusted (I7) — this function is
//! only ever called from `Provider::verify_and_parse_webhook`, which
//! performs the HMAC check first and returns early on failure.

use crate::config::PaymobConfig;
use openwrapper_core::{PaymentStatus, ProviderId, ProviderReference, WebhookError, WebhookEvent};

pub fn parse_verified_transaction(obj: &serde_json::Value) -> Result<WebhookEvent, WebhookError> {
    let id =
        obj.get("id")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| WebhookError::MalformedPayload {
                detail: "obj.id missing or not a number".into(),
            })?;

    let success = obj
        .get("success")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let pending = obj
        .get("pending")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let error_occured = obj
        .get("error_occured")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

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

    let reported_amount_minor_units = obj.get("amount_cents").and_then(|v| v.as_i64());

    Ok(WebhookEvent {
        provider: ProviderId::parse("paymob").expect("static id is valid"),
        event_id: format!("paymob:{id}"),
        provider_reference: ProviderReference::new(id.to_string()),
        merchant_reference,
        reported_status,
        reported_amount_minor_units,
        raw_for_diagnostics: obj.clone(),
    })
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

    parse_verified_transaction(obj)
}
