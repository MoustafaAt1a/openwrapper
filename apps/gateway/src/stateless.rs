//! Per-request provider construction from `X-Paymob-*` / `X-Fawry-*` headers.
//! Used when no server-side provider is configured in `OPENWRAPPER_*` env vars.
//!
//! Reuses a shared, connection-pooled `reqwest::Client` with TCP keep-alive
//! to prevent per-request TLS handshakes and socket descriptor exhaustion.

use axum::http::HeaderMap;
use openwrapper_core::{OpenWrapperError, Provider, ProviderId};
use openwrapper_provider_fawry::{FawryConfig, FawryProvider, PROVIDER_ID as FAWRY_ID};
use openwrapper_provider_paymob::{
    PaymobConfig, PaymobPaymentMethod, PaymobProvider, PROVIDER_ID as PAYMOB_ID,
};
use openwrapper_provider_stripe::{StripeConfig, StripeProvider, PROVIDER_ID as STRIPE_ID};
use secrecy::Secret;
use std::collections::HashMap;
use std::sync::{Arc, OnceLock};

fn shared_stateless_http_client() -> reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .pool_idle_timeout(std::time::Duration::from_secs(90))
                .tcp_keepalive(std::time::Duration::from_secs(30))
                .connect_timeout(std::time::Duration::from_secs(5))
                .timeout(std::time::Duration::from_secs(15))
                .build()
                .expect("failed to construct stateless HTTP client")
        })
        .clone()
}

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

fn cached_mock_provider(provider_id: &str) -> Arc<dyn Provider> {
    static FAWRY_MOCK: OnceLock<Arc<dyn Provider>> = OnceLock::new();
    static PAYMOB_MOCK: OnceLock<Arc<dyn Provider>> = OnceLock::new();
    static STRIPE_MOCK: OnceLock<Arc<dyn Provider>> = OnceLock::new();
    static DEFAULT_MOCK: OnceLock<Arc<dyn Provider>> = OnceLock::new();

    match provider_id {
        FAWRY_ID => Arc::clone(FAWRY_MOCK.get_or_init(|| {
            Arc::new(openwrapper_provider_mock::MockProvider::with_provider_id(
                openwrapper_provider_mock::MockConfig::default(),
                ProviderId::parse(FAWRY_ID).expect("valid provider id"),
            ))
        })),
        PAYMOB_ID => Arc::clone(PAYMOB_MOCK.get_or_init(|| {
            Arc::new(openwrapper_provider_mock::MockProvider::with_provider_id(
                openwrapper_provider_mock::MockConfig::default(),
                ProviderId::parse(PAYMOB_ID).expect("valid provider id"),
            ))
        })),
        STRIPE_ID => Arc::clone(STRIPE_MOCK.get_or_init(|| {
            Arc::new(openwrapper_provider_mock::MockProvider::with_provider_id(
                openwrapper_provider_mock::MockConfig::default(),
                ProviderId::parse(STRIPE_ID).expect("valid provider id"),
            ))
        })),
        _ => Arc::clone(
            DEFAULT_MOCK
                .get_or_init(|| openwrapper_provider_mock::MockProvider::default_provider()),
        ),
    }
}

pub fn resolve_payment_provider(
    configured: &HashMap<String, Arc<dyn Provider>>,
    provider_id: &str,
    headers: &HeaderMap,
) -> Result<Arc<dyn Provider>, OpenWrapperError> {
    if let Some(provider) = configured.get(provider_id) {
        return Ok(Arc::clone(provider));
    }

    let is_test = header_value(headers, "x-openwrapper-environment").as_deref() == Some("test");
    let http = shared_stateless_http_client();

    match provider_id {
        FAWRY_ID => {
            let merchant_code = header_value(headers, "x-fawry-merchant-code");
            let secure_key = header_value(headers, "x-fawry-secure-key");
            let (merchant_code, secure_key) = match (merchant_code, secure_key) {
                (Some(m), Some(s)) => (m, s),
                _ if is_test => {
                    return Ok(cached_mock_provider(FAWRY_ID));
                }
                _ => {
                    return Err(OpenWrapperError::Validation {
                        message: "Fawry credentials missing. Provide X-Fawry-Merchant-Code and X-Fawry-Secure-Key headers.".into(),
                    });
                }
            };
            let base_url = header_value(headers, "x-fawry-base-url")
                .unwrap_or_else(|| "https://atfawry.fawrystaging.com".to_string());
            let provider = FawryProvider::with_http(
                http,
                FawryConfig {
                    merchant_code,
                    secure_key: Secret::new(secure_key),
                    base_url,
                    debug_signatures: false,
                },
            )?;
            Ok(Arc::new(provider))
        }
        PAYMOB_ID => {
            let secret_key = header_value(headers, "x-paymob-secret-key");
            let public_key = header_value(headers, "x-paymob-public-key");
            let hmac_secret = header_value(headers, "x-paymob-hmac-secret");
            let integration_raw = header_value(headers, "x-paymob-integration-id");
            let (secret_key, public_key, hmac_secret, integration_raw) = match (
                secret_key,
                public_key,
                hmac_secret,
                integration_raw,
            ) {
                (Some(s), Some(p), Some(h), Some(i)) => (s, p, h, i),
                _ if is_test => {
                    return Ok(cached_mock_provider(PAYMOB_ID));
                }
                _ => {
                    return Err(OpenWrapperError::Validation {
                        message: "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, and X-Paymob-Integration-Id headers.".into(),
                    });
                }
            };
            let integration_id: i64 =
                integration_raw
                    .parse()
                    .map_err(|_| OpenWrapperError::Validation {
                        message: "X-Paymob-Integration-Id must be a numeric integration ID.".into(),
                    })?;
            let provider = PaymobProvider::with_http(
                http,
                PaymobConfig {
                    secret_key: Secret::new(secret_key),
                    hmac_secret: Secret::new(hmac_secret),
                    public_key,
                    base_url: header_value(headers, "x-paymob-base-url")
                        .unwrap_or_else(|| PaymobConfig::DEFAULT_BASE_URL.to_string()),
                    payment_methods: vec![PaymobPaymentMethod::IntegrationId(integration_id)],
                    notification_url: paymob_notification_url(),
                    inquiry_path_template: PaymobConfig::DEFAULT_INQUIRY_PATH_TEMPLATE.to_string(),
                    checkout_url_template: PaymobConfig::DEFAULT_CHECKOUT_URL_TEMPLATE.to_string(),
                },
            )?;
            Ok(Arc::new(provider))
        }
        STRIPE_ID => {
            let secret_key = match header_value(headers, "x-stripe-secret-key") {
                Some(k) => k,
                None if is_test => {
                    return Ok(cached_mock_provider(STRIPE_ID));
                }
                None => {
                    return Err(OpenWrapperError::Validation {
                        message: "Stripe credentials missing. Provide X-Stripe-Secret-Key header."
                            .into(),
                    });
                }
            };
            let webhook_secret = header_value(headers, "x-stripe-webhook-secret").map(Secret::new);
            let base_url = header_value(headers, "x-stripe-base-url")
                .unwrap_or_else(|| StripeConfig::DEFAULT_BASE_URL.to_string());
            let provider = StripeProvider::with_http(
                http,
                StripeConfig {
                    secret_key: Secret::new(secret_key),
                    webhook_secret,
                    base_url,
                    webhook_tolerance_secs: StripeConfig::DEFAULT_WEBHOOK_TOLERANCE_SECS,
                },
            )?;
            Ok(Arc::new(provider))
        }
        openwrapper_provider_mock::PROVIDER_ID => {
            if let Some(custom_secret) = header_value(headers, "x-mock-secret") {
                let provider = openwrapper_provider_mock::MockProvider::new(
                    openwrapper_provider_mock::MockConfig {
                        hmac_secret: Secret::new(custom_secret),
                    },
                )?;
                Ok(Arc::new(provider))
            } else {
                Ok(cached_mock_provider(openwrapper_provider_mock::PROVIDER_ID))
            }
        }
        other => Err(OpenWrapperError::Validation {
            message: format!("unknown provider '{other}'"),
        }),
    }
}
