//! HTTP integration tests for the gateway router (auth, validation, probes).

use axum::body::Body;
use axum::http::{Request, StatusCode};
use openwrapper_gateway::app::build_router;
use openwrapper_gateway::rate_limit::RateLimiter;
use openwrapper_gateway::state::AppState;
use openwrapper_gateway::store::sqlite::SqliteStore;
use openwrapper_gateway::store::PaymentStore;
use std::collections::HashMap;
use std::sync::Arc;
use tower::ServiceExt;

fn test_state(api_keys: Option<Vec<&str>>) -> Arc<AppState> {
    let store =
        Arc::new(SqliteStore::open(":memory:").expect("in-memory sqlite")) as Arc<dyn PaymentStore>;
    Arc::new(AppState {
        store,
        providers: HashMap::new(),
        api_keys: api_keys.map(|keys| keys.into_iter().map(String::from).collect()),
        rate_limiter: RateLimiter::in_process(1000),
        message_bus: None,
    })
}

async fn get_status(app: &mut axum::Router, uri: &str, api_key: Option<&str>) -> StatusCode {
    let mut req = Request::builder().method("GET").uri(uri);
    if let Some(key) = api_key {
        req = req.header("X-API-Key", key);
    }
    let response = app
        .clone()
        .oneshot(req.body(Body::empty()).unwrap())
        .await
        .expect("request");
    response.status()
}

async fn post_json(
    app: &mut axum::Router,
    uri: &str,
    body: &str,
    api_key: Option<&str>,
    idempotency_key: Option<&str>,
) -> StatusCode {
    let mut req = Request::builder()
        .method("POST")
        .uri(uri)
        .header("Content-Type", "application/json");
    if let Some(key) = api_key {
        req = req.header("X-API-Key", key);
    }
    if let Some(key) = idempotency_key {
        req = req.header("Idempotency-Key", key);
    }
    let response = app
        .clone()
        .oneshot(req.body(Body::from(body.to_string())).unwrap())
        .await
        .expect("request");
    response.status()
}

#[tokio::test]
async fn health_is_public_and_returns_ok() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    assert_eq!(
        get_status(&mut app, "/v1/health", None).await,
        StatusCode::OK
    );
}

#[tokio::test]
async fn ready_returns_ok_with_healthy_store() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    assert_eq!(
        get_status(&mut app, "/v1/ready", None).await,
        StatusCode::OK
    );
}

#[tokio::test]
async fn create_payment_requires_api_key_when_configured() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let status = post_json(
        &mut app,
        "/v1/payments",
        r#"{"provider":"paymob","amount_minor_units":1000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        None,
        Some("idem-1"),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn create_payment_rejects_missing_idempotency_key() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let status = post_json(
        &mut app,
        "/v1/payments",
        r#"{"provider":"paymob","amount_minor_units":1000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        Some("secret"),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn create_payment_rejects_unknown_provider() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let status = post_json(
        &mut app,
        "/v1/payments",
        r#"{"provider":"unknown","amount_minor_units":1000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        Some("secret"),
        Some("idem-2"),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn webhook_unknown_provider_returns_not_found() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let status = post_json(&mut app, "/v1/webhooks/unknown", "{}", None, None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
