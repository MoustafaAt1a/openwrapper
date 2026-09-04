//! API key authentication for OpenWrapper's HTTP API.
//!
//! Authenticates requests via static `OPENWRAPPER_API_KEYS` env variable
//! or actively checks against hashed API keys in the database `api_keys` table.

use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use crate::state::AppState;

const API_KEY_HEADER: &str = "x-api-key";

pub async fn require_api_key(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Response {
    let provided = request
        .headers()
        .get(API_KEY_HEADER)
        .or_else(|| request.headers().get(axum::http::header::AUTHORIZATION))
        .and_then(|v| v.to_str().ok())
        .map(|v| v.strip_prefix("Bearer ").unwrap_or(v).trim());

    let Some(provided) = provided else {
        if state.api_keys.is_none() {
            // Explicitly running in unauthenticated mode
            return next.run(request).await;
        }
        return unauthorized();
    };

    // 1. Check static configured keys (if present)
    if let Some(configured_keys) = &state.api_keys {
        let matches_static = configured_keys
            .iter()
            .any(|key| constant_time_eq(key.as_bytes(), provided.as_bytes()));

        if matches_static {
            return next.run(request).await;
        }
    }

    // 2. Check hashed database api_keys table. This is evaluated only when
    //    static keys are configured OR when the store is reachable — if the
    //    store is unreachable we must fail closed rather than silently
    //    treat the failure as "no auth configured".
    let key_hash = hex::encode(Sha256::digest(provided.as_bytes()));
    match state.store.validate_api_key_hash(&key_hash).await {
        Ok(true) => return next.run(request).await,
        Ok(false) => {}
        Err(e) => {
            tracing::error!(error = %e, "api key store lookup failed");
            return (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response();
        }
    }

    unauthorized()
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    let hash_a = Sha256::digest(a);
    let hash_b = Sha256::digest(b);
    let mut diff = 0u8;
    for (&byte_a, &byte_b) in hash_a.iter().zip(hash_b.iter()) {
        diff |= byte_a ^ byte_b;
    }
    std::hint::black_box(diff) == 0
}

fn unauthorized() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        axum::Json(serde_json::json!({
            "error": {
                "code": "authorization_error",
                "message": "missing or invalid API key: provide X-API-Key or Authorization: Bearer <key>"
            }
        })),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constant_time_eq_rejects_different_lengths_without_panicking() {
        assert!(!constant_time_eq(b"short", b"a-much-longer-value"));
        assert!(constant_time_eq(b"same-length-key", b"same-length-key"));
        assert!(!constant_time_eq(b"same-length-key", b"same-length-nope"));
    }
}
