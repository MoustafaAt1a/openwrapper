//! Paymob HTTP calls. This module owns request/response shapes that are
//! Paymob-specific and must never leak into `openwrapper-core` (I3).

use crate::config::{PaymobConfig, PaymobPaymentMethod};
use openwrapper_core::{OpenWrapperError, PaymentRequest};
use secrecy::ExposeSecret;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct BillingData {
    first_name: String,
    last_name: String,
    phone_number: String,
    email: String,
    // Paymob's billing_data schema requires an address-shaped object in
    // practice even though only phone_number is documented as strictly
    // required in the "common errors" section we fetched; we send
    // placeholder-but-valid values for the remaining address fields
    // rather than omit them, to avoid an undocumented 400. This is
    // flagged in research/paymob.md as a decision to revisit once a
    // sandbox account is available to confirm which subfields are truly
    // optional.
    apartment: String,
    floor: String,
    street: String,
    building: String,
    city: String,
    state: String,
    country: String,
}

#[derive(Serialize)]
struct Item {
    name: String,
    amount: i64,
    description: String,
    quantity: i64,
}

#[derive(Serialize)]
struct CreateIntentionRequest {
    amount: i64,
    currency: String,
    payment_methods: Vec<serde_json::Value>,
    items: Vec<Item>,
    billing_data: BillingData,
    #[serde(skip_serializing_if = "serde_json::Map::is_empty")]
    extras: serde_json::Map<String, serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    special_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    notification_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirection_url: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateIntentionResponse {
    pub id: String,
    pub client_secret: String,
}

pub struct PaymobClient {
    http: reqwest::Client,
    config: PaymobConfig,
}

impl PaymobClient {
    pub fn new(config: PaymobConfig) -> Result<Self, OpenWrapperError> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| OpenWrapperError::Configuration {
                message: format!("failed to build HTTP client: {e}"),
            })?;
        Ok(Self { http, config })
    }

    pub fn config(&self) -> &PaymobConfig {
        &self.config
    }

    pub async fn create_intention(
        &self,
        request: &PaymentRequest,
        payment_id: &openwrapper_core::PaymentId,
    ) -> Result<CreateIntentionResponse, OpenWrapperError> {
        let (first_name, last_name) = split_name(request.customer.full_name.as_deref());

        let body = CreateIntentionRequest {
            amount: request.amount.minor_units(),
            currency: request.amount.currency().code().to_string(),
            payment_methods: self
                .config
                .payment_methods
                .iter()
                .map(|m| match m {
                    PaymobPaymentMethod::IntegrationId(id) => serde_json::json!(id),
                    PaymobPaymentMethod::Named(name) => serde_json::json!(name),
                })
                .collect(),
            items: vec![Item {
                name: request
                    .description
                    .clone()
                    .unwrap_or_else(|| "Payment".to_string()),
                amount: request.amount.minor_units(),
                description: request.description.clone().unwrap_or_default(),
                quantity: 1,
            }],
            billing_data: BillingData {
                first_name,
                last_name,
                phone_number: request.customer.phone.clone(),
                email: request
                    .customer
                    .email
                    .clone()
                    .unwrap_or_else(|| "no-email@openwrapper.invalid".to_string()),
                apartment: "NA".into(),
                floor: "NA".into(),
                street: "NA".into(),
                building: "NA".into(),
                city: "Cairo".into(),
                state: "NA".into(),
                country: "EGY".into(),
            },
            extras: request
                .metadata
                .iter()
                .map(|(k, v)| (k.clone(), serde_json::json!(v)))
                .collect(),
            special_reference: Some(
                request
                    .merchant_reference
                    .clone()
                    .unwrap_or_else(|| payment_id.to_string()),
            ),
            notification_url: Some(self.config.notification_url.clone()),
            redirection_url: request.return_url.clone(),
        };

        let url = format!(
            "{}/v1/intention/",
            self.config.base_url.trim_end_matches('/')
        );
        let resp = self
            .http
            .post(&url)
            .header(
                "Authorization",
                format!("Token {}", self.config.secret_key.expose_secret()),
            )
            .json(&body)
            .send()
            .await
            .map_err(map_create_reqwest_err)?;

        let status = resp.status();
        if status.is_success() {
            let parsed = resp.json::<CreateIntentionResponse>().await.map_err(|e| {
                OpenWrapperError::Provider {
                    provider: "paymob".into(),
                    provider_code: None,
                    message: format!("could not parse Paymob response: {e}"),
                }
            })?;
            if parsed.id.trim().is_empty() || parsed.client_secret.trim().is_empty() {
                return Err(OpenWrapperError::Provider {
                    provider: "paymob".into(),
                    provider_code: None,
                    message: "Paymob response omitted the intention id or client secret".into(),
                });
            }
            Ok(parsed)
        } else if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            Err(OpenWrapperError::RateLimit {
                provider: "paymob".into(),
                retry_after_ms: None,
            })
        } else if status.as_u16() == 401 || status.as_u16() == 403 {
            Err(OpenWrapperError::Authentication {
                provider: "paymob".into(),
                message: "Paymob rejected the configured secret key".into(),
            })
        } else {
            Err(OpenWrapperError::Provider {
                provider: "paymob".into(),
                provider_code: Some(status.as_u16().to_string()),
                // Provider error bodies can echo request fields. Do not put
                // them into the public/loggable diagnostic error channel.
                message: format!("Paymob rejected the request with HTTP {status}"),
            })
        }
    }

    /// Retrieves the authoritative status of a previously created
    /// transaction by Paymob's transaction id.
    ///
    /// IMPORTANT / KNOWN LIMITATION: the request path is built from
    /// `config.inquiry_path_template`, which defaults to the
    /// long-documented "classic Accept API" shape used by multiple
    /// third-party Paymob SDKs — Paymob's own reference page for this
    /// specific endpoint could not be loaded during this project's
    /// research (see research/paymob.md). Rather than hardcode a guess an
    /// operator would need a code change to fix, this is a configuration
    /// value (`PAYMOB_INQUIRY_PATH_TEMPLATE`) — **confirm the default
    /// against a live sandbox account or Paymob's Postman collection, and
    /// override it if it's wrong**, before relying on this in production.
    pub async fn inquire_transaction(
        &self,
        transaction_id: &str,
    ) -> Result<serde_json::Value, OpenWrapperError> {
        let path = self
            .config
            .inquiry_path_template
            .replace("{id}", &encode_url_component(transaction_id));
        let url = format!("{}{}", self.config.base_url.trim_end_matches('/'), path);
        let auth_header = format!("Bearer {}", self.config.secret_key.expose_secret());
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
                    .header("Authorization", &auth_header)
                    .send()
                    .await
                    .map_err(map_inquiry_reqwest_err)?;
                if resp.status().is_success() {
                    resp.json::<serde_json::Value>()
                        .await
                        .map_err(|e| OpenWrapperError::Provider {
                            provider: "paymob".into(),
                            provider_code: None,
                            message: format!("could not parse Paymob inquiry response: {e}"),
                        })
                } else if matches!(
                    resp.status(),
                    reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
                ) {
                    Err(OpenWrapperError::Authentication {
                        provider: "paymob".into(),
                        message: "Paymob rejected the configured secret key".into(),
                    })
                } else if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                    Err(OpenWrapperError::RateLimit {
                        provider: "paymob".into(),
                        retry_after_ms: None,
                    })
                } else {
                    Err(OpenWrapperError::UnknownOutcome {
                        provider_reference: Some(transaction_id.to_string()),
                        message: format!(
                            "Paymob transaction inquiry returned HTTP {}",
                            resp.status()
                        ),
                    })
                }
            },
        )
        .await
    }

    /// Builds the Unified Checkout redirect URL from a fresh
    /// `client_secret`, using `config.checkout_url_template`
    /// (`PAYMOB_CHECKOUT_URL_TEMPLATE`) — overridable for the same reason
    /// as `inquire_transaction`'s path: the default is a widely-published
    /// pattern, not a freshly confirmed page fetched during this
    /// project's research. Verify against your merchant dashboard's
    /// integration snippet before go-live.
    pub fn unified_checkout_url(&self, client_secret: &str) -> String {
        self.config
            .checkout_url_template
            .replace("{base_url}", self.config.base_url.trim_end_matches('/'))
            .replace(
                "{public_key}",
                &encode_url_component(&self.config.public_key),
            )
            .replace("{client_secret}", &encode_url_component(client_secret))
    }
}

fn split_name(full_name: Option<&str>) -> (String, String) {
    match full_name {
        Some(name) if !name.trim().is_empty() => {
            let mut parts = name.trim().splitn(2, ' ');
            let first = parts.next().unwrap_or("NA").to_string();
            let last = parts.next().unwrap_or("NA").to_string();
            (first, last)
        }
        _ => ("NA".to_string(), "NA".to_string()),
    }
}

fn map_create_reqwest_err(e: reqwest::Error) -> OpenWrapperError {
    if e.is_timeout() {
        OpenWrapperError::Timeout {
            provider: "paymob".into(),
            elapsed_ms: 15_000,
        }
    } else if e.is_connect() {
        OpenWrapperError::Network {
            provider: "paymob".into(),
            message: "could not connect to Paymob".into(),
        }
    } else {
        OpenWrapperError::UnknownOutcome {
            provider_reference: None,
            message: "Paymob create request failed after transmission may have started".into(),
        }
    }
}

fn map_inquiry_reqwest_err(e: reqwest::Error) -> OpenWrapperError {
    if e.is_timeout() {
        OpenWrapperError::Timeout {
            provider: "paymob".into(),
            elapsed_ms: 15_000,
        }
    } else {
        OpenWrapperError::Network {
            provider: "paymob".into(),
            message: "request to Paymob failed".into(),
        }
    }
}

fn encode_url_component(value: &str) -> String {
    url::form_urlencoded::byte_serialize(value.as_bytes()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_template_values_are_percent_encoded() {
        assert_eq!(
            encode_url_component("id/with?delimiters"),
            "id%2Fwith%3Fdelimiters"
        );
    }
}
