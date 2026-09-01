//! Per-request provider construction from `X-Paymob-*` / `X-Fawry-*` headers.
//! Used when no server-side provider is configured in `OPENWRAPPER_*` env vars.

use axum::http::HeaderMap;
use openwrapper_core::{OpenWrapperError, Provider};
use openwrapper_provider_fawry::{FawryConfig, FawryProvider, PROVIDER_ID as FAWRY_ID};
use openwrapper_provider_paymob::{
    PaymobConfig, PaymobPaymentMethod, PaymobProvider, PROVIDER_ID as PAYMOB_ID,
};
use secrecy::Secret;
use std::collections::HashMap;
use std::sync::Arc;

fn header_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn paymob_notification_url() -> String {
    if let Ok(url) = std::env::var("PAYMOB_NOTIFICATION_URL") {
        if !url.trim().is_empty() {
            return url;
        }
    }
    if let Ok(base) = std::env::var("OPENWRAPPER_PUBLIC_WEBHOOK_BASE") {
        let base = base.trim_end_matches('/');
        if !base.is_empty() {
            return format!("{base}/v1/webhooks/paymob");
        }
    }
    if let Ok(domain) = std::env::var("RAILWAY_PUBLIC_DOMAIN") {
        if !domain.trim().is_empty() {
            return format!("https://{}/v1/webhooks/paymob", domain.trim());
        }
    }
    "http://localhost:8080/v1/webhooks/paymob".to_string()
}

pub fn resolve_payment_provider(
    configured: &HashMap<String, Arc<dyn Provider>>,
    provider_id: &str,
    headers: &HeaderMap,
) -> Result<Arc<dyn Provider>, OpenWrapperError> {
    if let Some(provider) = configured.get(provider_id) {
        return Ok(Arc::clone(provider));
    }

    match provider_id {
        FAWRY_ID => {
            let merchant_code = header_value(headers, "x-fawry-merchant-code").ok_or_else(|| {
                OpenWrapperError::Validation {
                    message: "Fawry credentials missing. Provide X-Fawry-Merchant-Code and X-Fawry-Secure-Key headers.".into(),
                }
            })?;
            let secure_key = header_value(headers, "x-fawry-secure-key").ok_or_else(|| {
                OpenWrapperError::Validation {
                    message: "Fawry credentials missing. Provide X-Fawry-Merchant-Code and X-Fawry-Secure-Key headers.".into(),
                }
            })?;
            let base_url = header_value(headers, "x-fawry-base-url")
                .unwrap_or_else(|| "https://www.atfawry.com".to_string());
            let provider = FawryProvider::new(FawryConfig {
                merchant_code,
                secure_key: Secret::new(secure_key),
                base_url,
                debug_signatures: false,
            })?;
            Ok(Arc::new(provider))
        }
        PAYMOB_ID => {
            let secret_key = header_value(headers, "x-paymob-secret-key").ok_or_else(|| {
                OpenWrapperError::Validation {
                    message: "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, and X-Paymob-Integration-Id headers.".into(),
                }
            })?;
            let public_key = header_value(headers, "x-paymob-public-key").ok_or_else(|| {
                OpenWrapperError::Validation {
                    message: "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, and X-Paymob-Integration-Id headers.".into(),
                }
            })?;
            let hmac_secret = header_value(headers, "x-paymob-hmac-secret").ok_or_else(|| {
                OpenWrapperError::Validation {
                    message: "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, and X-Paymob-Integration-Id headers.".into(),
                }
            })?;
            let integration_raw = header_value(headers, "x-paymob-integration-id").ok_or_else(|| {
                OpenWrapperError::Validation {
                    message: "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, and X-Paymob-Integration-Id headers.".into(),
                }
            })?;
            let integration_id: i64 = integration_raw.parse().map_err(|_| {
                OpenWrapperError::Validation {
                    message: "X-Paymob-Integration-Id must be a numeric integration ID.".into(),
                }
            })?;
            let provider = PaymobProvider::new(PaymobConfig {
                secret_key: Secret::new(secret_key),
                hmac_secret: Secret::new(hmac_secret),
                public_key,
                base_url: header_value(headers, "x-paymob-base-url")
                    .unwrap_or_else(|| PaymobConfig::DEFAULT_BASE_URL.to_string()),
                payment_methods: vec![PaymobPaymentMethod::IntegrationId(integration_id)],
                notification_url: paymob_notification_url(),
                inquiry_path_template: PaymobConfig::DEFAULT_INQUIRY_PATH_TEMPLATE.to_string(),
                checkout_url_template: PaymobConfig::DEFAULT_CHECKOUT_URL_TEMPLATE.to_string(),
            })?;
            Ok(Arc::new(provider))
        }
        other => Err(OpenWrapperError::Validation {
            message: format!("unknown provider '{other}'"),
        }),
    }
}
