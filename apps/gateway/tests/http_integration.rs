//! HTTP integration tests for the gateway router (auth, validation, probes).

use axum::body::Body;
use axum::http::{Request, StatusCode};
use openwrapper_gateway::app::build_router;
use openwrapper_gateway::rate_limit::RateLimiter;
use openwrapper_gateway::state::AppState;
use openwrapper_gateway::store::sqlite::SqliteStore;
use openwrapper_gateway::store::PaymentStore;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use tower::ServiceExt;

fn test_state(api_keys: Option<Vec<&str>>) -> Arc<AppState> {
    let store =
        Arc::new(SqliteStore::open(":memory:").expect("in-memory sqlite")) as Arc<dyn PaymentStore>;
    let webhooks =
        Arc::new(openwrapper_gateway::outbound_webhook::WebhookDispatcher::new(Arc::clone(&store)));
    Arc::new(AppState {
        store,
        providers: HashMap::new(),
        api_keys: api_keys.map(|keys| keys.into_iter().map(String::from).collect()),
        rate_limiter: RateLimiter::in_process(1000),
        message_bus: None,
        webhooks,
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

#[tokio::test]
async fn create_payment_with_mock_provider_succeeds() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let status = post_json(
        &mut app,
        "/v1/payments",
        r#"{"provider":"mock","amount_minor_units":1000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        Some("secret"),
        Some("mock-idem-1"),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
}

#[tokio::test]
async fn idempotent_retry_with_mismatched_payload_returns_409_conflict() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let first = post_json(
        &mut app,
        "/v1/payments",
        r#"{"provider":"mock","amount_minor_units":1000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        Some("secret"),
        Some("conflict-idem-1"),
    )
    .await;
    assert_eq!(first, StatusCode::CREATED);

    let second = post_json(
        &mut app,
        "/v1/payments",
        r#"{"provider":"mock","amount_minor_units":2000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        Some("secret"),
        Some("conflict-idem-1"),
    )
    .await;
    assert_eq!(second, StatusCode::CONFLICT);
}

#[tokio::test]
async fn idempotent_retry_with_identical_payload_returns_200_ok() {
    let mut app = build_router(test_state(Some(vec!["secret"])));
    let payload = r#"{"provider":"mock","amount_minor_units":1000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#;
    let first = post_json(
        &mut app,
        "/v1/payments",
        payload,
        Some("secret"),
        Some("replay-idem-1"),
    )
    .await;
    assert_eq!(first, StatusCode::CREATED);

    let second = post_json(
        &mut app,
        "/v1/payments",
        payload,
        Some("secret"),
        Some("replay-idem-1"),
    )
    .await;
    assert_eq!(second, StatusCode::OK);
}

#[tokio::test]
async fn webhook_endpoints_crud_lifecycle() {
    let app = build_router(test_state(Some(vec!["secret"])));

    // Create endpoint
    let req = Request::builder()
        .method("POST")
        .uri("/v1/webhook_endpoints")
        .header("Content-Type", "application/json")
        .header("X-API-Key", "secret")
        .body(Body::from(
            r#"{"url":"http://localhost:9000/webhook","events":["payment.refunded"]}"#,
        ))
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let created: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    let endpoint_id = created["id"].as_str().unwrap();
    let secret = created["secret"].as_str().unwrap();
    assert!(secret.starts_with("whsec_"));

    // List endpoints
    let req = Request::builder()
        .method("GET")
        .uri("/v1/webhook_endpoints")
        .header("X-API-Key", "secret")
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let list: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(list["data"].as_array().unwrap().len(), 1);

    // Delete endpoint
    let req = Request::builder()
        .method("DELETE")
        .uri(format!("/v1/webhook_endpoints/{endpoint_id}"))
        .header("X-API-Key", "secret")
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::NO_CONTENT);

    // List again - should be empty
    let req = Request::builder()
        .method("GET")
        .uri("/v1/webhook_endpoints")
        .header("X-API-Key", "secret")
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let list: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(list["data"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn refund_and_event_lifecycle() {
    let _ = tracing_subscriber::fmt().with_test_writer().try_init();
    let state = test_state(Some(vec!["secret"]));
    let app = build_router(Arc::clone(&state));

    // 1. Create a payment
    let req = Request::builder()
        .method("POST")
        .uri("/v1/payments")
        .header("Content-Type", "application/json")
        .header("X-API-Key", "secret")
        .header("Idempotency-Key", "refund-test-payment-1")
        .body(Body::from(
            r#"{"provider":"mock","amount_minor_units":5000,"currency":"EGP","customer":{"phone":"+201000000000"}}"#,
        ))
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let created: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    let payment_id_str = created["payment_id"].as_str().unwrap();
    let payment_id = openwrapper_core::PaymentId::from_str(payment_id_str).unwrap();

    // 2. Mark payment succeeded in store
    state
        .store
        .apply_reconciliation_result(&payment_id, openwrapper_core::PaymentStatus::Succeeded)
        .await
        .unwrap();

    // 3. Partial refund (2000 of 5000)
    let req = Request::builder()
        .method("POST")
        .uri(format!("/v1/payments/{payment_id_str}/refunds"))
        .header("Content-Type", "application/json")
        .header("X-API-Key", "secret")
        .body(Body::from(
            r#"{"amount_minor_units":2000,"reason":"requested_by_customer"}"#,
        ))
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let refund: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(refund["amount_minor_units"], 2000);
    assert_eq!(refund["status"], "succeeded");

    // Verify payment is now partially refunded
    let payment = state.store.get_payment(&payment_id).await.unwrap().unwrap();
    assert_eq!(
        payment.status,
        openwrapper_core::PaymentStatus::PartiallyRefunded
    );

    // 4. List refunds
    let req = Request::builder()
        .method("GET")
        .uri(format!("/v1/payments/{payment_id_str}/refunds"))
        .header("X-API-Key", "secret")
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let refunds_list: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(refunds_list["data"].as_array().unwrap().len(), 1);

    // 5. Query events ledger
    let req = Request::builder()
        .method("GET")
        .uri("/v1/events")
        .header("X-API-Key", "secret")
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let events_list: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    let events_arr = events_list["data"].as_array().unwrap();
    assert!(!events_arr.is_empty());
    let refund_event = events_arr
        .iter()
        .find(|e| e["event_type"] == "payment.refunded")
        .unwrap();
    let event_id = refund_event["id"].as_str().unwrap();

    // 6. Get single event
    let req = Request::builder()
        .method("GET")
        .uri(format!("/v1/events/{event_id}"))
        .header("X-API-Key", "secret")
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let single_event: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();
    assert_eq!(single_event["id"], event_id);
}
