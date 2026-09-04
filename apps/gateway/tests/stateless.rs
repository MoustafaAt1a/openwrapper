//! Unit tests for per-request provider resolution from HTTP headers.

use axum::http::header::HeaderName;
use axum::http::{HeaderMap, HeaderValue};
use openwrapper_core::Provider;
use openwrapper_gateway::stateless::resolve_payment_provider;
use std::collections::HashMap;
use std::sync::Arc;

fn headers(pairs: &[(&str, &str)]) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (k, v) in pairs {
        let name: HeaderName = k.parse().expect("valid header name");
        map.insert(name, HeaderValue::from_str(v).expect("valid header value"));
    }
    map
}

#[test]
fn fawry_resolves_from_headers_with_staging_default_url() {
    let configured = HashMap::<String, Arc<dyn Provider>>::new();
    let h = headers(&[
        ("x-fawry-merchant-code", "1013970"),
        ("x-fawry-secure-key", "test-secure-key"),
    ]);
    let provider = resolve_payment_provider(&configured, "fawry", &h).expect("fawry provider");
    assert_eq!(provider.id().as_str(), "fawry");
}

#[test]
fn paymob_requires_all_credential_headers() {
    let configured = HashMap::<String, Arc<dyn Provider>>::new();
    let h = headers(&[("x-paymob-secret-key", "secret")]);
    match resolve_payment_provider(&configured, "paymob", &h) {
        Err(err) => assert!(err.to_string().contains("credentials missing")),
        Ok(_) => panic!("expected paymob credential validation error"),
    }
}

#[test]
fn stripe_resolves_from_headers() {
    let configured = HashMap::<String, Arc<dyn Provider>>::new();
    let h = headers(&[("x-stripe-secret-key", "sk_test_12345")]);
    let provider = resolve_payment_provider(&configured, "stripe", &h).expect("stripe provider");
    assert_eq!(provider.id().as_str(), "stripe");
}

#[test]
fn stripe_requires_secret_key_header() {
    let configured = HashMap::<String, Arc<dyn Provider>>::new();
    let h = headers(&[("x-stripe-webhook-secret", "whsec_123")]);
    match resolve_payment_provider(&configured, "stripe", &h) {
        Err(err) => assert!(err.to_string().contains("Stripe credentials missing")),
        Ok(_) => panic!("expected stripe credential validation error"),
    }
}

#[test]
fn unknown_provider_returns_validation_error() {
    let configured = HashMap::<String, Arc<dyn Provider>>::new();
    match resolve_payment_provider(&configured, "paypal", &HeaderMap::new()) {
        Err(err) => assert!(err.to_string().contains("unknown provider")),
        Ok(_) => panic!("expected unknown provider error"),
    }
}
