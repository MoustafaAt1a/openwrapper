//! Stripe HTTP client implementation.
//!
//! Encapsulates all outbound calls to Stripe's REST API (`POST /v1/checkout/sessions`
//! and status inquiries). Protects Invariant I5 (ambiguous outcomes never fail).

use crate::config::StripeConfig;
use openwrapper_core::{OpenWrapperError, PaymentId, PaymentRequest, PaymentStatus};
use secrecy::ExposeSecret;
use serde::Deserialize;

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct StripeSessionResponse {
    pub id: String,
    pub url: Option<String>,
    pub status: Option<String>,
    pub payment_status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StripeErrorEnvelope {
    pub error: StripeErrorDetail,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct StripeErrorDetail {
    pub message: Option<String>,
    #[serde(rename = "type")]
    pub error_type: Option<String>,
    pub code: Option<String>,
}

pub struct StripeClient {
    http: reqwest::Client,
    config: StripeConfig,
}

impl StripeClient {
    pub fn new(config: StripeConfig) -> Result<Self, OpenWrapperError> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| OpenWrapperError::Configuration {
                message: format!("failed to build HTTP client: {e}"),
            })?;
        Ok(Self { http, config })
    }

    pub fn with_http(
        http: reqwest::Client,
        config: StripeConfig,
    ) -> Result<Self, OpenWrapperError> {
        Ok(Self { http, config })
    }

    pub fn config(&self) -> &StripeConfig {
        &self.config
    }

    fn auth_header(&self) -> String {
        format!("Bearer {}", self.config.secret_key.expose_secret())
    }

    pub async fn create_checkout_session(
        &self,
        request: &PaymentRequest,
        payment_id: &PaymentId,
    ) -> Result<StripeSessionResponse, OpenWrapperError> {
        let currency_code = request.amount.currency().code().to_ascii_lowercase();
        let minor_units = request.amount.minor_units().to_string();
        let description = request
            .description
            .as_deref()
            .unwrap_or("OpenWrapper Payment");

        let mut form_params: Vec<(&str, String)> = vec![
            ("mode", "payment".to_string()),
            ("client_reference_id", payment_id.to_string()),
            ("line_items[0][price_data][currency]", currency_code),
            ("line_items[0][price_data][unit_amount]", minor_units),
            (
                "line_items[0][price_data][product_data][name]",
                description.to_string(),
            ),
            ("line_items[0][quantity]", "1".to_string()),
        ];

        if let Some(ref email) = request.customer.email {
            if !email.trim().is_empty() {
                form_params.push(("customer_email", email.trim().to_string()));
            }
        }

        let success_url = request.return_url.clone().unwrap_or_else(|| {
            "https://example.com/payment/success?session_id={CHECKOUT_SESSION_ID}".to_string()
        });
        let cancel_url = request
            .return_url
            .clone()
            .unwrap_or_else(|| "https://example.com/payment/cancel".to_string());

        form_params.push(("success_url", success_url));
        form_params.push(("cancel_url", cancel_url));

        form_params.push(("metadata[openwrapper_payment_id]", payment_id.to_string()));
        form_params.push(("metadata[customer_phone]", request.customer.phone.clone()));

        if let Some(ref m_ref) = request.merchant_reference {
            form_params.push(("metadata[merchant_reference]", m_ref.clone()));
        }

        for (k, v) in &request.metadata {
            form_params.push((
                Box::leak(format!("metadata[{k}]").into_boxed_str()),
                v.clone(),
            ));
        }

        let url = format!(
            "{}/v1/checkout/sessions",
            self.config.base_url.trim_end_matches('/')
        );

        let resp = self
            .http
            .post(&url)
            .header("Authorization", self.auth_header())
            .header("Idempotency-Key", request.idempotency_key.as_str())
            .form(&form_params)
            .send()
            .await
            .map_err(map_create_reqwest_err)?;

        let status = resp.status();
        if status.is_success() {
            let session = resp.json::<StripeSessionResponse>().await.map_err(|e| {
                OpenWrapperError::Provider {
                    provider: "stripe".into(),
                    provider_code: None,
                    message: format!("failed to parse Stripe Checkout Session response: {e}"),
                }
            })?;

            if session.id.trim().is_empty() {
                return Err(OpenWrapperError::Provider {
                    provider: "stripe".into(),
                    provider_code: None,
                    message: "Stripe response omitted checkout session ID".into(),
                });
            }

            Ok(session)
        } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            Err(OpenWrapperError::RateLimit {
                provider: "stripe".into(),
                retry_after_ms: None,
            })
        } else if status == reqwest::StatusCode::UNAUTHORIZED
            || status == reqwest::StatusCode::FORBIDDEN
        {
            Err(OpenWrapperError::Authentication {
                provider: "stripe".into(),
                message: "Stripe rejected the configured secret key".into(),
            })
        } else {
            let error_envelope = resp.json::<StripeErrorEnvelope>().await.ok();
            let (code, message) = match error_envelope {
                Some(env) => (
                    env.error.code,
                    env.error
                        .message
                        .unwrap_or_else(|| format!("Stripe rejected request with HTTP {status}")),
                ),
                None => (
                    Some(status.as_u16().to_string()),
                    format!("Stripe rejected request with HTTP {status}"),
                ),
            };

            Err(OpenWrapperError::Provider {
                provider: "stripe".into(),
                provider_code: code,
                message,
            })
        }
    }

    pub async fn inquire_status(&self, reference: &str) -> Result<PaymentStatus, OpenWrapperError> {
        let is_pi = reference.starts_with("pi_");
        let path = if is_pi {
            format!("/v1/payment_intents/{reference}")
        } else {
            format!("/v1/checkout/sessions/{reference}")
        };

        let url = format!("{}{}", self.config.base_url.trim_end_matches('/'), path);
        let auth = self.auth_header();

        let policy = openwrapper_core::RetryPolicy::new(
            2,
            std::time::Duration::from_millis(150),
            std::time::Duration::from_millis(1000),
        );

        openwrapper_core::retry_async(
            &policy,
            |e| matches!(e, OpenWrapperError::Network { .. }),
            || async {
                let resp = self
                    .http
                    .get(&url)
                    .header("Authorization", &auth)
                    .send()
                    .await
                    .map_err(map_inquiry_reqwest_err)?;

                let status = resp.status();
                if status.is_success() {
                    let json = resp.json::<serde_json::Value>().await.map_err(|e| {
                        OpenWrapperError::Provider {
                            provider: "stripe".into(),
                            provider_code: None,
                            message: format!("could not parse Stripe inquiry response: {e}"),
                        }
                    })?;

                    if is_pi {
                        Ok(map_payment_intent_status(&json))
                    } else {
                        Ok(map_checkout_session_status(&json))
                    }
                } else if status == reqwest::StatusCode::UNAUTHORIZED
                    || status == reqwest::StatusCode::FORBIDDEN
                {
                    Err(OpenWrapperError::Authentication {
                        provider: "stripe".into(),
                        message: "Stripe rejected the secret key during status inquiry".into(),
                    })
                } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                    Err(OpenWrapperError::RateLimit {
                        provider: "stripe".into(),
                        retry_after_ms: None,
                    })
                } else {
                    Err(OpenWrapperError::UnknownOutcome {
                        provider_reference: Some(reference.to_string()),
                        message: format!("Stripe inquiry returned HTTP {status}"),
                    })
                }
            },
        )
        .await
    }
}

pub fn map_checkout_session_status(json: &serde_json::Value) -> PaymentStatus {
    let payment_status = json.get("payment_status").and_then(|v| v.as_str());
    let session_status = json.get("status").and_then(|v| v.as_str());

    if payment_status == Some("paid") {
        PaymentStatus::Succeeded
    } else {
        match session_status {
            Some("open") => PaymentStatus::Pending,
            Some("complete") => PaymentStatus::Succeeded,
            Some("expired") => PaymentStatus::Failed,
            _ => PaymentStatus::Unknown,
        }
    }
}

pub fn map_payment_intent_status(json: &serde_json::Value) -> PaymentStatus {
    match json.get("status").and_then(|v| v.as_str()) {
        Some("succeeded") => PaymentStatus::Succeeded,
        Some("canceled") => PaymentStatus::Failed,
        Some("requires_payment_method") => {
            if json.get("last_payment_error").is_some() {
                PaymentStatus::Failed
            } else {
                PaymentStatus::Pending
            }
        }
        Some("processing")
        | Some("requires_action")
        | Some("requires_confirmation")
        | Some("requires_capture") => PaymentStatus::Pending,
        _ => PaymentStatus::Unknown,
    }
}

fn map_create_reqwest_err(e: reqwest::Error) -> OpenWrapperError {
    if e.is_timeout() {
        OpenWrapperError::Timeout {
            provider: "stripe".into(),
            elapsed_ms: 15_000,
        }
    } else if e.is_connect() {
        OpenWrapperError::Network {
            provider: "stripe".into(),
            message: "could not connect to Stripe".into(),
        }
    } else {
        OpenWrapperError::UnknownOutcome {
            provider_reference: None,
            message: "Stripe create request failed after transmission may have started".into(),
        }
    }
}

fn map_inquiry_reqwest_err(e: reqwest::Error) -> OpenWrapperError {
    if e.is_timeout() {
        OpenWrapperError::Timeout {
            provider: "stripe".into(),
            elapsed_ms: 15_000,
        }
    } else {
        OpenWrapperError::Network {
            provider: "stripe".into(),
            message: "request to Stripe failed".into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checkout_session_status_mapping() {
        let paid = serde_json::json!({
            "status": "complete",
            "payment_status": "paid"
        });
        assert_eq!(map_checkout_session_status(&paid), PaymentStatus::Succeeded);

        let open = serde_json::json!({
            "status": "open",
            "payment_status": "unpaid"
        });
        assert_eq!(map_checkout_session_status(&open), PaymentStatus::Pending);

        let expired = serde_json::json!({
            "status": "expired",
            "payment_status": "unpaid"
        });
        assert_eq!(map_checkout_session_status(&expired), PaymentStatus::Failed);

        let unknown = serde_json::json!({
            "status": "unexpected_variant"
        });
        assert_eq!(
            map_checkout_session_status(&unknown),
            PaymentStatus::Unknown
        );
    }

    #[test]
    fn payment_intent_status_mapping() {
        let succeeded = serde_json::json!({ "status": "succeeded" });
        assert_eq!(
            map_payment_intent_status(&succeeded),
            PaymentStatus::Succeeded
        );

        let canceled = serde_json::json!({ "status": "canceled" });
        assert_eq!(map_payment_intent_status(&canceled), PaymentStatus::Failed);

        let failed_card = serde_json::json!({
            "status": "requires_payment_method",
            "last_payment_error": { "code": "card_declined" }
        });
        assert_eq!(
            map_payment_intent_status(&failed_card),
            PaymentStatus::Failed
        );

        let processing = serde_json::json!({ "status": "processing" });
        assert_eq!(
            map_payment_intent_status(&processing),
            PaymentStatus::Pending
        );
    }
}
