//! Assigns every request a correlation id, echoed back as `X-Request-Id`
//! and attached to every log line the request produces.
//!
//! This exists specifically for the feedback loop this MVP is being
//! hosted to collect: when someone reports "payment creation failed for
//! me," the single most useful thing they can paste into a bug report is
//! this header's value — it lets the operator find the exact log lines
//! for that request without needing timestamps or guesswork. See
//! CONTRIBUTING.md.
//!
//! Reuses `openwrapper_core::error::new_correlation_id` (a ULID) rather
//! than adding a UUID crate or a `tower-http` feature flag for this —
//! keeping to §21's dependency discipline.

use axum::extract::Request;
use axum::http::HeaderValue;
use axum::middleware::Next;
use axum::response::Response;
use tracing::Instrument;

pub const REQUEST_ID_HEADER: &str = "x-request-id";

pub async fn assign_request_id(request: Request, next: Next) -> Response {
    let request_id = openwrapper_core::error::new_correlation_id();
    let span = tracing::info_span!("request", request_id = %request_id);

    async move {
        let mut response = next.run(request).await;
        if let Ok(value) = HeaderValue::from_str(&request_id) {
            response.headers_mut().insert(REQUEST_ID_HEADER, value);
        }
        response
    }
    .instrument(span)
    .await
}
