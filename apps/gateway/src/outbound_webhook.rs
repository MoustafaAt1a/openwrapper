//! Outbound Merchant Webhook Engine.
//!
//! Provides durable event emission, HMAC-SHA256 signature generation (`X-OpenWrapper-Signature`),
//! background dispatching via Tokio workers, and delivery audit logging with retry scheduling.

use crate::store::{EventRecord, PaymentStore, WebhookDeliveryRecord};
use hmac::{Hmac, Mac};
use openwrapper_core::OpenWrapperError;
use sha2::Sha256;
use std::sync::Arc;
use time::OffsetDateTime;
use tokio::sync::mpsc;

type HmacSha256 = Hmac<Sha256>;

/// Generates the hex-encoded HMAC-SHA256 of `{timestamp}.{payload}` using the webhook endpoint secret.
pub fn compute_signature(secret: &str, timestamp: i64, payload: &str) -> String {
    let signed_payload = format!("{timestamp}.{payload}");
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(signed_payload.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

/// Creates the full `X-OpenWrapper-Signature` header value `t={timestamp},v1={hex_hmac}`.
pub fn create_signature_header(secret: &str, timestamp: i64, payload: &str) -> String {
    let sig = compute_signature(secret, timestamp, payload);
    format!("t={timestamp},v1={sig}")
}

/// Verifies an incoming `X-OpenWrapper-Signature` header against the expected secret and payload.
///
/// If `tolerance_seconds > 0`, enforces that the timestamp is within `[now - tolerance, now + tolerance]`.
pub fn verify_signature(
    secret: &str,
    header: &str,
    payload: &str,
    tolerance_seconds: i64,
) -> Result<(), &'static str> {
    let mut timestamp: Option<i64> = None;
    let mut signatures: Vec<&str> = Vec::new();

    for item in header.split(',') {
        let mut parts = item.splitn(2, '=');
        let key = parts.next().map(str::trim);
        let val = parts.next().map(str::trim);
        match (key, val) {
            (Some("t"), Some(ts_str)) => {
                if let Ok(ts) = ts_str.parse::<i64>() {
                    timestamp = Some(ts);
                }
            }
            (Some("v1"), Some(sig)) => {
                signatures.push(sig);
            }
            _ => {}
        }
    }

    let timestamp = timestamp.ok_or("missing timestamp in signature header")?;
    if signatures.is_empty() {
        return Err("missing v1 signature in header");
    }

    if tolerance_seconds > 0 {
        let now = OffsetDateTime::now_utc().unix_timestamp();
        if (now - timestamp).abs() > tolerance_seconds {
            return Err("timestamp outside tolerance window");
        }
    }

    let expected_sig = compute_signature(secret, timestamp, payload);
    let expected_bytes = hex::decode(&expected_sig).map_err(|_| "invalid expected hex")?;

    let mut valid = false;
    for candidate in signatures {
        if let Ok(cand_bytes) = hex::decode(candidate) {
            if cand_bytes.len() == expected_bytes.len() {
                // Constant-time comparison
                let mut diff = 0u8;
                for (a, b) in cand_bytes.iter().zip(expected_bytes.iter()) {
                    diff |= a ^ b;
                }
                if diff == 0 {
                    valid = true;
                    break;
                }
            }
        }
    }

    if valid {
        Ok(())
    } else {
        Err("signature mismatch")
    }
}

#[derive(Debug, Clone)]
pub struct WebhookMessage {
    pub user_id: Option<String>,
    pub event: EventRecord,
}

#[derive(Clone)]
pub struct WebhookDispatcher {
    store: Arc<dyn PaymentStore>,
    tx: mpsc::Sender<WebhookMessage>,
}

impl WebhookDispatcher {
    pub fn new(store: Arc<dyn PaymentStore>) -> Self {
        let (tx, mut rx) = mpsc::channel::<WebhookMessage>(1024);
        let worker_store = Arc::clone(&store);

        tokio::spawn(async move {
            let client = reqwest::Client::builder()
                .connect_timeout(std::time::Duration::from_secs(10))
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new());

            while let Some(msg) = rx.recv().await {
                dispatch_single_event(&client, &*worker_store, msg).await;
            }
        });

        Self { store, tx }
    }

    /// Records an immutable audit event in the store and sends it to the background webhook worker.
    pub async fn emit_event(
        &self,
        event: EventRecord,
        user_id: Option<String>,
    ) -> Result<(), OpenWrapperError> {
        self.store.record_event(&event).await?;
        let _ = self.tx.send(WebhookMessage { user_id, event }).await;
        Ok(())
    }
}

async fn dispatch_single_event(
    client: &reqwest::Client,
    store: &dyn PaymentStore,
    msg: WebhookMessage,
) {
    let endpoints = match store
        .get_active_webhook_endpoints(msg.user_id.as_deref())
        .await
    {
        Ok(eps) => eps,
        Err(e) => {
            tracing::error!(error = %e, "failed to query active webhook endpoints");
            return;
        }
    };

    let now = OffsetDateTime::now_utc().unix_timestamp();
    let payload_str = msg.event.payload.to_string();

    for ep in endpoints {
        // Filter by subscription
        let interested = ep
            .events
            .iter()
            .any(|ev| ev == "*" || ev == &msg.event.event_type);
        if !interested {
            continue;
        }

        let sig_header = create_signature_header(&ep.secret, now, &payload_str);
        let delivery_id = format!("del_{}", ulid::Ulid::new());

        let res = client
            .post(&ep.url)
            .header("Content-Type", "application/json")
            .header("X-OpenWrapper-Signature", &sig_header)
            .header("User-Agent", "OpenWrapper-Webhook/0.2.0")
            .body(payload_str.clone())
            .send()
            .await;

        let (status, resp_code, next_retry) = match res {
            Ok(resp) => {
                let code = resp.status().as_u16() as i32;
                if resp.status().is_success() {
                    ("delivered", Some(code), None)
                } else {
                    ("failed", Some(code), Some(now + 60))
                }
            }
            Err(err) => {
                tracing::warn!(
                    endpoint_id = %ep.id,
                    url = %ep.url,
                    error = %err,
                    "webhook delivery network error"
                );
                ("failed", None, Some(now + 60))
            }
        };

        let delivery = WebhookDeliveryRecord {
            id: delivery_id,
            endpoint_id: ep.id,
            event_id: msg.event.id.clone(),
            event_type: msg.event.event_type.clone(),
            payload: msg.event.payload.clone(),
            response_status: resp_code,
            status: status.to_string(),
            attempt_count: 1,
            next_retry_at: next_retry,
            created_at: now,
        };

        if let Err(e) = store.record_webhook_delivery(&delivery).await {
            tracing::error!(error = %e, "failed to record webhook delivery");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signature_generation_and_verification_roundtrip() {
        let secret = "whsec_test_secret_key_12345";
        let timestamp = 1725610000;
        let payload = r#"{"id":"evt_123","type":"payment.succeeded"}"#;

        let header = create_signature_header(secret, timestamp, payload);
        assert!(header.starts_with("t=1725610000,v1="));

        // Tolerance disabled (0)
        assert!(verify_signature(secret, &header, payload, 0).is_ok());

        // Tampered payload fails
        let tampered = r#"{"id":"evt_123","type":"payment.failed"}"#;
        assert!(verify_signature(secret, &header, tampered, 0).is_err());

        // Tampered secret fails
        assert!(verify_signature("whsec_wrong_secret", &header, payload, 0).is_err());
    }

    #[test]
    fn signature_timestamp_tolerance() {
        let secret = "whsec_test";
        let now = OffsetDateTime::now_utc().unix_timestamp();
        let old_ts = now - 600; // 10 minutes ago
        let payload = "{}";

        let header = create_signature_header(secret, old_ts, payload);

        // 300 second tolerance should reject
        assert_eq!(
            verify_signature(secret, &header, payload, 300),
            Err("timestamp outside tolerance window")
        );

        // 1000 second tolerance should accept
        assert!(verify_signature(secret, &header, payload, 1000).is_ok());
    }
}
