//! HTTP router assembly — shared between the binary and integration tests.

use crate::auth;
use crate::handlers;
use crate::rate_limit;
use crate::request_id;
use crate::state::AppState;
use axum::routing::{get, post};
use axum::Router;
use std::sync::Arc;
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

const MAX_BODY_BYTES: usize = 256 * 1024;

pub fn build_router(state: Arc<AppState>) -> Router {
    let authenticated_routes = Router::new()
        .route("/v1/payments", post(handlers::create_payment))
        .route("/v1/payments/:id", get(handlers::get_payment))
        .layer(axum::middleware::from_fn_with_state(
            Arc::clone(&state),
            rate_limit::enforce,
        ))
        .layer(axum::middleware::from_fn_with_state(
            Arc::clone(&state),
            auth::require_api_key,
        ));

    let public_routes = Router::new()
        .route("/v1/webhooks/:provider", post(handlers::webhook))
        .route("/v1/version", get(handlers::version))
        .route("/v1/health", get(handlers::health))
        .route("/v1/ready", get(handlers::ready));

    Router::new()
        .merge(authenticated_routes)
        .merge(public_routes)
        .layer(TimeoutLayer::new(std::time::Duration::from_secs(30)))
        .layer(RequestBodyLimitLayer::new(MAX_BODY_BYTES))
        .layer(axum::middleware::from_fn(request_id::assign_request_id))
        .layer(
            TraceLayer::new_for_http().make_span_with(|request: &axum::http::Request<_>| {
                tracing::info_span!(
                    "request",
                    method = %request.method(),
                    uri = %request.uri().path(),
                )
            }),
        )
        .with_state(state)
}
