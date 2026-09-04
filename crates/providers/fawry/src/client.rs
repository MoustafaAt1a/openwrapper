//! Fawry HTTP calls. Fawry-specific request/response shapes live here,
//! never in `openwrapper-core` (I3).
//!
//! v0.1.0 implements only the PayAtFawry reference-code charge method
//! (`paymentMethod: "PAYATFAWRY"`), deliberately excluding Fawry's `CARD`
//! payment method: charging a raw card through Fawry's API would require
//! OpenWrapper to receive the card number/CVV directly, which product
//! scope §1 forbids ("must not unnecessarily receive sensitive card
//! data"). PayAtFawry never routes card data through OpenWrapper at all —
//! the customer pays a reference code at a kiosk, ATM, or wallet app.

use crate::config::FawryConfig;
use crate::decimal::minor_units_to_2dp;
use openwrapper_core::{OpenWrapperError, PaymentId, PaymentRequest};
use serde::{Deserialize, Serialize};

const PAYMENT_METHOD: &str = "PAYATFAWRY";

#[derive(Serialize)]
struct ChargeItem {
    #[serde(rename = "itemId")]
    item_id: String,
    description: String,
    price: String,
    quantity: i64,
}

#[derive(Serialize)]
struct CreateChargeRequest {
    #[serde(rename = "merchantCode")]
    merchant_code: String,
    #[serde(rename = "merchantRefNum")]
    merchant_ref_num: String,
    #[serde(rename = "customerMobile")]
    customer_mobile: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "customerEmail")]
    customer_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "customerName")]
    customer_name: Option<String>,
    amount: String,
    #[serde(rename = "currencyCode")]
    currency_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(rename = "paymentMethod")]
    payment_method: String,
    #[serde(rename = "chargeItems")]
    charge_items: Vec<ChargeItem>,
    signature: String,
}

#[derive(Deserialize, Debug, Default)]
pub struct ChargeResponse {
    #[serde(rename = "statusCode")]
    pub status_code: Option<i64>,
    #[serde(rename = "statusDescription")]
    pub status_description: Option<String>,
    #[serde(rename = "referenceNumber")]
    pub reference_number: Option<String>,
}

pub struct FawryClient {
    http: reqwest::Client,
    config: FawryConfig,
}

impl FawryClient {
    pub fn new(config: FawryConfig) -> Result<Self, OpenWrapperError> {
        if config.base_url.trim().is_empty() {
            return Err(OpenWrapperError::Configuration {
                message: "Fawry base_url must be set explicitly (no default — see config.rs)"
                    .into(),
            });
        }
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| OpenWrapperError::Configuration {
                message: format!("failed to build HTTP client: {e}"),
            })?;
        Ok(Self { http, config })
    }

    pub fn config(&self) -> &FawryConfig {
        &self.config
    }

    /// Creates a PayAtFawry charge and returns Fawry's raw response.
    /// `merchant_ref_num` must be the same value the caller will later use
    /// to inquire status — the adapter (`lib.rs`) is responsible for
    /// deriving and remembering it via the returned `PaymentResult`.
    pub async fn create_charge(
        &self,
        request: &PaymentRequest,
        merchant_ref_num: &str,
    ) -> Result<ChargeResponse, OpenWrapperError> {
        let amount_2dp = minor_units_to_2dp(request.amount.minor_units());

        let signature = crate::signature::charge_signature(
            &self.config.merchant_code,
            merchant_ref_num,
            None, // no saved customer profile in v0.1.0
            PAYMENT_METHOD,
            &amount_2dp,
            &self.config.secure_key,
        );

        if self.config.debug_signatures {
            tracing::debug!(
                merchant_code = %self.config.merchant_code,
                merchant_ref_num,
                payment_method = PAYMENT_METHOD,
                amount = %amount_2dp,
                "Fawry charge signature inputs (secure_key and signature withheld) — compare against \
                 Fawry's Signature Tool if this charge is rejected for a signature mismatch"
            );
        }

        let body = CreateChargeRequest {
            merchant_code: self.config.merchant_code.clone(),
            merchant_ref_num: merchant_ref_num.to_string(),
            customer_mobile: request.customer.phone.clone(),
            customer_email: request.customer.email.clone(),
            customer_name: request.customer.full_name.clone(),
            amount: amount_2dp.clone(),
            currency_code: request.amount.currency().code().to_string(),
            description: request.description.clone(),
            payment_method: PAYMENT_METHOD.to_string(),
            charge_items: vec![ChargeItem {
                item_id: "1".to_string(),
                description: request
                    .description
                    .clone()
                    .unwrap_or_else(|| "Payment".to_string()),
                price: amount_2dp,
                quantity: 1,
            }],
            signature,
        };

        let url = format!(
            "{}/ECommerceWeb/Fawry/payments/charge",
            self.config.base_url.trim_end_matches('/')
        );
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(map_create_reqwest_err)?;

        let status = resp.status();
        if matches!(
            status,
            reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
        ) {
            return Err(OpenWrapperError::Authentication {
                provider: "fawry".into(),
                message: "Fawry rejected the configured merchant credentials".into(),
            });
        }
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(OpenWrapperError::RateLimit {
                provider: "fawry".into(),
                retry_after_ms: None,
            });
        }
        let parsed: ChargeResponse = resp.json().await.map_err(|e| OpenWrapperError::Provider {
            provider: "fawry".into(),
            provider_code: Some(status.as_u16().to_string()),
            message: format!("could not parse Fawry response: {e}"),
        })?;

        match parsed.status_code {
            Some(200) | None
                if status.is_success()
                    && parsed
                        .reference_number
                        .as_deref()
                        .is_some_and(|reference| !reference.trim().is_empty()) =>
            {
                Ok(parsed)
            }
            Some(code) => Err(OpenWrapperError::Provider {
                provider: "fawry".into(),
                provider_code: Some(code.to_string()),
                message: parsed
                    .status_description
                    .unwrap_or_else(|| "Fawry rejected the charge request".into()),
            }),
            None => Err(OpenWrapperError::Provider {
                provider: "fawry".into(),
                provider_code: Some(status.as_u16().to_string()),
                message: "Fawry response missing referenceNumber".into(),
            }),
        }
    }

    /// Get Payment Status V2.
    pub async fn get_status(
        &self,
        merchant_ref_number: &str,
    ) -> Result<serde_json::Value, OpenWrapperError> {
        let signature = crate::signature::status_v2_signature(
            &self.config.merchant_code,
            merchant_ref_number,
            &self.config.secure_key,
        );
        let url = format!(
            "{}/ECommerceWeb/Fawry/payments/status/v2",
            self.config.base_url.trim_end_matches('/')
        );
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
                    .query(&[
                        ("merchantCode", self.config.merchant_code.as_str()),
                        ("merchantRefNumber", merchant_ref_number),
                        ("signature", signature.as_str()),
                    ])
                    .send()
                    .await
                    .map_err(map_inquiry_reqwest_err)?;

                if resp.status().is_success() {
                    resp.json::<serde_json::Value>()
                        .await
                        .map_err(|e| OpenWrapperError::Provider {
                            provider: "fawry".into(),
                            provider_code: None,
                            message: format!("could not parse Fawry status response: {e}"),
                        })
                } else if matches!(
                    resp.status(),
                    reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN
                ) {
                    Err(OpenWrapperError::Authentication {
                        provider: "fawry".into(),
                        message: "Fawry rejected the configured merchant credentials".into(),
                    })
                } else if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                    Err(OpenWrapperError::RateLimit {
                        provider: "fawry".into(),
                        retry_after_ms: None,
                    })
                } else {
                    Err(OpenWrapperError::UnknownOutcome {
                        provider_reference: Some(merchant_ref_number.to_string()),
                        message: format!("Fawry status inquiry returned HTTP {}", resp.status()),
                    })
                }
            },
        )
        .await
    }
}

/// Fawry's merchantRefNum is our own correlation key (see `lib.rs` module
/// docs for why `ProviderReference` stores this rather than Fawry's
/// `referenceNumber` for this adapter). Derive it from the caller's own
/// `merchant_reference` if given, else from a freshly generated
/// `PaymentId` so it is always present and unique.
pub fn derive_merchant_ref_num(request: &PaymentRequest, payment_id: &PaymentId) -> String {
    request
        .merchant_reference
        .clone()
        .unwrap_or_else(|| payment_id.to_string())
}

fn map_create_reqwest_err(e: reqwest::Error) -> OpenWrapperError {
    if e.is_timeout() {
        OpenWrapperError::Timeout {
            provider: "fawry".into(),
            elapsed_ms: 15_000,
        }
    } else if e.is_connect() {
        OpenWrapperError::Network {
            provider: "fawry".into(),
            message: "could not connect to Fawry".into(),
        }
    } else {
        OpenWrapperError::UnknownOutcome {
            provider_reference: None,
            message: "Fawry create request failed after transmission may have started".into(),
        }
    }
}

fn map_inquiry_reqwest_err(e: reqwest::Error) -> OpenWrapperError {
    if e.is_timeout() {
        OpenWrapperError::Timeout {
            provider: "fawry".into(),
            elapsed_ms: 15_000,
        }
    } else {
        OpenWrapperError::Network {
            provider: "fawry".into(),
            message: "request to Fawry failed".into(),
        }
    }
}
