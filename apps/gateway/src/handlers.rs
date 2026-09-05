//! The HTTP handlers. Each one is a thin translation layer: parse/validate
//! the wire request, delegate to the store and/or a provider, translate
//! the result back to wire format. Business logic (state machine rules,
//! signature verification, idempotency semantics) lives in `core`, the
//! provider crates, and `store.rs` — not here.

use crate::amqp::WebhookQueueMessage;
use crate::state::AppState;
use crate::wire::{CreatePaymentBody, ErrorBody, PaymentView};
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use openwrapper_core::{
    Currency, CustomerDetails, IdempotencyKey, Money, OpenWrapperError, PaymentRequest, ProviderId,
};
use std::collections::BTreeMap;
use std::sync::Arc;

pub struct ApiError(pub OpenWrapperError);

impl From<OpenWrapperError> for ApiError {
    fn from(e: OpenWrapperError) -> Self {
        Self(e)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let credentials_missing = matches!(
            &self.0,
            OpenWrapperError::Validation { message } if message.contains("credentials missing")
        );
        let status = if credentials_missing {
            StatusCode::UNPROCESSABLE_ENTITY
        } else {
            match &self.0 {
                OpenWrapperError::Validation { .. } => StatusCode::BAD_REQUEST,
                OpenWrapperError::Authentication { .. } => StatusCode::UNAUTHORIZED,
                OpenWrapperError::Authorization { .. } => StatusCode::FORBIDDEN,
                OpenWrapperError::Configuration { .. } => StatusCode::INTERNAL_SERVER_ERROR,
                OpenWrapperError::Network { .. } => StatusCode::BAD_GATEWAY,
                OpenWrapperError::Timeout { .. } => StatusCode::GATEWAY_TIMEOUT,
                OpenWrapperError::Provider { .. } => StatusCode::BAD_GATEWAY,
                OpenWrapperError::RateLimit { .. } => StatusCode::TOO_MANY_REQUESTS,
                OpenWrapperError::UnsupportedCapability { .. } => StatusCode::BAD_REQUEST,
                OpenWrapperError::Security { .. } => StatusCode::UNAUTHORIZED,
                OpenWrapperError::UnknownOutcome { .. } => StatusCode::OK,
                OpenWrapperError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            }
        };
        let mut body = ErrorBody::from(&self.0);
        if credentials_missing {
            body.error.code = "missing_provider_credentials".to_string();
        }
        (status, Json(body)).into_response()
    }
}

fn bad_request(message: impl Into<String>) -> ApiError {
    ApiError(OpenWrapperError::Validation {
        message: message.into(),
    })
}

const IDEMPOTENCY_KEY_HEADER: &str = "idempotency-key";

pub async fn create_payment(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<CreatePaymentBody>,
) -> Result<(StatusCode, Json<PaymentView>), ApiError> {
    let idem_header = headers
        .get(IDEMPOTENCY_KEY_HEADER)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| bad_request("missing required Idempotency-Key header"))?;
    let idempotency_key = IdempotencyKey::parse(idem_header)
        .map_err(|e| bad_request(format!("invalid Idempotency-Key: {e}")))?;

    let provider_id = ProviderId::parse(&body.provider)
        .map_err(|e| bad_request(format!("invalid provider: {e}")))?;
    let currency = Currency::parse(&body.currency)
        .map_err(|e| bad_request(format!("invalid currency: {e}")))?;
    let amount = Money::from_minor_units(body.amount_minor_units, currency)
        .map_err(|e| bad_request(format!("invalid amount: {e}")))?;

    let request = PaymentRequest {
        idempotency_key,
        provider: provider_id.clone(),
        amount,
        customer: CustomerDetails {
            phone: body.customer.phone,
            email: body.customer.email,
            full_name: body.customer.full_name,
        },
        merchant_reference: body.merchant_reference.clone(),
        description: body.description,
        return_url: body.return_url,
        metadata: body.metadata,
    };
    request.validate().map_err(ApiError)?;

    // Validated before the store is touched at all, deliberately: doing
    // this after `begin_payment` (as an earlier version of this handler
    // did) would insert a permanent `Pending` row — and permanently
    // consume that idempotency key — for a request naming a provider
    // that was never actually going to be attempted. Caught via a live
    // end-to-end test against a real Postgres instance, not by
    // inspection; see docs/DECISIONS.md.
    let provider = crate::stateless::resolve_payment_provider(
        &state.providers,
        provider_id.as_str(),
        &headers,
    )?;

    let user_id = headers
        .get("x-openwrapper-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let api_key_id = headers
        .get("x-openwrapper-api-key-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<i64>().ok());

    let owner = match (api_key_id, user_id) {
        (Some(id), user_id) => Some(crate::store::ApiKeyInfo { id, user_id }),
        (None, Some(user_id)) => Some(crate::store::ApiKeyInfo { id: 0, user_id: Some(user_id) }),
        _ => None,
    };

    let outcome = state
        .store
        .begin_payment_with_owner(&request, owner.as_ref())
        .await?;

    match outcome {
        crate::store::BeginOutcome::Conflict => Err(ApiError(OpenWrapperError::Validation {
            message: "Idempotency-Key was already used with a different request body".into(),
        })),
        crate::store::BeginOutcome::ReturnExisting(payment) => {
            // §11's required invariant: same identity + same operation ->
            // the same logical operation, never re-executed. We return
            // the existing record whether it settled already or is still
            // Pending/Unknown — we do NOT call the provider again.
            let mut view = PaymentView::from(&payment);
            if let Ok(Some(action)) = state.store.get_next_action(&payment.id).await {
                view.next_action = Some(action);
            }
            Ok((StatusCode::OK, Json(view)))
        }
        crate::store::BeginOutcome::Proceed { payment_id } => {
            match provider.create_payment(&payment_id, &request).await {
                Ok(result) => {
                    state
                        .store
                        .record_creation_result(
                            &payment_id,
                            &result.provider_reference,
                            result.status.into(),
                            result.next_action.as_ref(),
                        )
                        .await?;
                    Ok((
                        StatusCode::CREATED,
                        Json(PaymentView::from_fresh(
                            &payment_id,
                            &result,
                            request.merchant_reference,
                        )),
                    ))
                }
                Err(e) if e.is_definite_non_occurrence() => {
                    // The provider is certain not to have processed this
                    // — safe to mark Failed. Nothing was ever charged.
                    state
                        .store
                        .mark_terminal_without_provider_reference(
                            &payment_id,
                            openwrapper_core::PaymentStatus::Failed,
                        )
                        .await?;
                    Err(ApiError(e))
                }
                Err(e) => {
                    // I5: ambiguous outcome (timeout, network error, or a
                    // provider-side error that doesn't rule out the
                    // provider having received the request). Never
                    // guessed into Failed. The stored record becomes
                    // Unknown and is retrievable via GET, which will also
                    // attempt reconciliation (§13).
                    tracing::warn!(
                        payment_id = %payment_id,
                        error = %e,
                        "create_payment failed ambiguously; marking payment Unknown, not Failed"
                    );
                    state.store.mark_unknown(&payment_id).await?;
                    let payment = state
                        .store
                        .get_payment(&payment_id)
                        .await?
                        .ok_or_else(|| internal("payment vanished after mark_unknown"))?;
                    // Still a successful HTTP response: the *outcome* is
                    // unknown, but OpenWrapper successfully recorded that
                    // fact and gave the caller a payment_id to check
                    // later — that is itself the defined, safe behavior
                    // §13 requires, not a failure of the API call.
                    Ok((StatusCode::OK, Json(PaymentView::from(&payment))))
                }
            }
        }
    }
}

pub async fn get_payment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<PaymentView>, ApiError> {
    let payment_id: openwrapper_core::PaymentId =
        id.parse().map_err(|_| bad_request("invalid payment id"))?;
    let mut payment = state.store.get_payment(&payment_id).await?.ok_or_else(|| {
        ApiError(OpenWrapperError::Validation {
            message: "no payment with that id".into(),
        })
    })?;

    // §13 reconciliation: if the outcome is still Unknown and the
    // provider can be asked directly, try once per GET rather than
    // leaving the caller stuck polling a record that OpenWrapper itself
    // could have resolved.
    if payment.status == openwrapper_core::PaymentStatus::Unknown {
        if let (Some(provider_reference), Some(provider)) = (
            payment.provider_reference.clone(),
            state.providers.get(payment.provider.as_str()),
        ) {
            if provider
                .capabilities()
                .contains(&openwrapper_core::Capability::InquireStatus)
            {
                if let Ok(resolved) = provider.inquire_status(&provider_reference).await {
                    if resolved != openwrapper_core::PaymentStatus::Unknown {
                        let _ = state
                            .store
                            .apply_reconciliation_result(&payment_id, resolved)
                            .await;
                        if let Some(updated) = state.store.get_payment(&payment_id).await? {
                            payment = updated;
                        }
                    }
                }
                // An inquiry error here is itself ambiguous — leave the
                // record as Unknown rather than guessing; the caller can
                // retry the GET later.
            }
        }
    }

    let mut view = PaymentView::from(&payment);
    if let Ok(Some(action)) = state.store.get_next_action(&payment_id).await {
        view.next_action = Some(action);
    }
    Ok(Json(view))
}

pub async fn webhook(
    State(state): State<Arc<AppState>>,
    Path(provider_name): Path<String>,
    headers: HeaderMap,
    axum::extract::RawQuery(raw_query): axum::extract::RawQuery,
    body: axum::body::Bytes,
) -> Response {
    let provider = match state.providers.get(provider_name.as_str()) {
        Some(p) => p,
        None => return (StatusCode::NOT_FOUND, "unknown provider").into_response(),
    };

    let mut header_map = BTreeMap::new();
    for (name, value) in headers.iter() {
        if let Ok(v) = value.to_str() {
            header_map.insert(name.as_str().to_ascii_lowercase(), v.to_string());
        }
    }
    let query_map = parse_query(raw_query.as_deref().unwrap_or(""));

    let raw = openwrapper_core::RawWebhookRequest {
        raw_body: body.to_vec(),
        headers: header_map,
        query: query_map,
    };

    // I7: verification happens here, before the store is touched at all.
    // `verify_and_parse_webhook` cannot hand back a `WebhookEvent` without
    // having verified it first — see core::provider::WebhookEvent's docs.
    let event = match provider.verify_and_parse_webhook(&raw) {
        Ok(event) => event,
        Err(e) => {
            tracing::warn!(provider = %provider_name, error = %e, "webhook verification failed");
            let status = match e {
                openwrapper_core::WebhookError::SignatureMissing
                | openwrapper_core::WebhookError::SignatureInvalid => StatusCode::UNAUTHORIZED,
                _ => StatusCode::BAD_REQUEST,
            };
            return (status, "webhook rejected").into_response();
        }
    };

    let provider_id = match ProviderId::parse(&provider_name) {
        Ok(p) => p,
        Err(_) => return (StatusCode::NOT_FOUND, "unknown provider").into_response(),
    };

    if let Some(bus) = &state.message_bus {
        let msg = WebhookQueueMessage {
            provider: provider_name.clone(),
            event: event.clone(),
        };
        if let Err(e) = bus.publish_webhook(&msg).await {
            tracing::error!(provider = %provider_name, error = %e, "failed to publish webhook to queue");
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
        return StatusCode::OK.into_response();
    }

    match state
        .store
        .apply_webhook_event(
            &event.event_id,
            &provider_id,
            &event.provider_reference,
            event.reported_status,
            event.reported_amount_minor_units,
        )
        .await
    {
        Ok(crate::store::WebhookApplyOutcome::Duplicate) => {
            // §12 dedup: acknowledge the duplicate delivery without
            // reapplying it. Returning 200 (rather than an error) here is
            // deliberate — retrying a delivery we've already fully processed
            // should stop, not loop.
            return StatusCode::OK.into_response();
        }
        Ok(crate::store::WebhookApplyOutcome::PaymentNotFound) => {
            tracing::warn!(
                provider = %provider_name,
                provider_reference = %event.provider_reference,
                "webhook for a provider_reference OpenWrapper has no record of"
            );
        }
        Ok(crate::store::WebhookApplyOutcome::Transition(
            crate::store::TransitionOutcome::AmountMismatch { stored, reported },
        )) => {
            tracing::error!(
                provider = %provider_name,
                provider_reference = %event.provider_reference,
                stored, reported,
                "webhook amount does not match stored payment amount — transition rejected"
            );
        }
        Ok(crate::store::WebhookApplyOutcome::Transition(
            crate::store::TransitionOutcome::Illegal { from, to },
        )) => {
            tracing::warn!(
                provider = %provider_name,
                provider_reference = %event.provider_reference,
                %from, %to,
                "webhook reported an illegal state transition — ignored"
            );
        }
        Ok(crate::store::WebhookApplyOutcome::Transition(
            crate::store::TransitionOutcome::Applied { .. },
        ))
        | Ok(crate::store::WebhookApplyOutcome::Transition(
            crate::store::TransitionOutcome::NoOp,
        )) => {}
        Err(e) => {
            tracing::error!(error = %e, "failed to apply webhook transition");
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    }

    StatusCode::OK.into_response()
}

pub async fn version() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "version": openwrapper_core::OPENWRAPPER_VERSION }))
}

/// Liveness: "is the process up and able to answer HTTP at all." Never
/// touches the store — a slow/locked database should not make an
/// orchestrator think the whole process is dead and restart it. No auth
/// required (§security: monitoring and load balancers need this
/// reachable without a credential).
pub async fn health() -> StatusCode {
    StatusCode::OK
}

/// Readiness: "is this instance actually able to serve traffic right
/// now." Checked by attempting a trivial query against the store. A real
/// hosting platform's health check / load balancer should point at this,
/// not `health()`, before routing traffic to an instance.
pub async fn ready(State(state): State<Arc<AppState>>) -> Response {
    let db_ok = state.store.ping().await.is_ok();
    let cache_ok = state.rate_limiter.ping().await;
    let amqp_ok = state
        .message_bus
        .as_ref()
        .map(|b| b.is_connected())
        .unwrap_or(true);

    if db_ok && cache_ok && amqp_ok {
        Json(serde_json::json!({
            "status": "ready",
            "database": "connected",
            "cache": if state.rate_limiter.is_distributed() { "connected" } else { "in_process" },
            "amqp": if state.message_bus.is_some() { "connected" } else { "disabled" },
        }))
        .into_response()
    } else {
        tracing::error!(
            database = db_ok,
            cache = cache_ok,
            amqp = amqp_ok,
            "readiness check failed"
        );
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "not_ready",
                "database": if db_ok { "connected" } else { "unavailable" },
                "cache": if cache_ok { "connected" } else { "unavailable" },
                "amqp": if amqp_ok { "connected" } else { "unavailable" },
            })),
        )
            .into_response()
    }
}

/// Prometheus metrics endpoint: returns OpenWrapper telemetry in Prometheus text format.
pub async fn metrics(State(state): State<Arc<AppState>>) -> Response {
    let db_ok = if state.store.ping().await.is_ok() {
        1
    } else {
        0
    };
    let cache_ok = if state.rate_limiter.ping().await {
        1
    } else {
        0
    };
    let amqp_ok = if state
        .message_bus
        .as_ref()
        .map(|b| b.is_connected())
        .unwrap_or(true)
    {
        1
    } else {
        0
    };

    let body = format!(
        "# HELP openwrapper_gateway_up Whether the OpenWrapper gateway is running\n\
         # TYPE openwrapper_gateway_up gauge\n\
         openwrapper_gateway_up 1\n\
         # HELP openwrapper_gateway_build_info Build and version metadata\n\
         # TYPE openwrapper_gateway_build_info gauge\n\
         openwrapper_gateway_build_info{{version=\"{}\"}} 1\n\
         # HELP openwrapper_gateway_store_connected Store backend connectivity\n\
         # TYPE openwrapper_gateway_store_connected gauge\n\
         openwrapper_gateway_store_connected {}\n\
         # HELP openwrapper_gateway_cache_connected Cache backend connectivity\n\
         # TYPE openwrapper_gateway_cache_connected gauge\n\
         openwrapper_gateway_cache_connected {}\n\
         # HELP openwrapper_gateway_message_bus_connected RabbitMQ AMQP bus connectivity\n\
         # TYPE openwrapper_gateway_message_bus_connected gauge\n\
         openwrapper_gateway_message_bus_connected {}\n",
        openwrapper_core::OPENWRAPPER_VERSION,
        db_ok,
        cache_ok,
        amqp_ok
    );

    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4; charset=utf-8")],
        body,
    )
        .into_response()
}

fn parse_query(raw: &str) -> BTreeMap<String, String> {
    raw.split('&')
        .filter(|s| !s.is_empty())
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            let k = parts.next()?;
            let v = parts.next().unwrap_or("");
            Some((urlencoding_decode(k), urlencoding_decode(v)))
        })
        .collect()
}

// Minimal percent-decoding sufficient for the `hmac=...` query parameter
// case this gateway needs. Not a general-purpose URL library — kept
// deliberately tiny per §21's dependency discipline rather than pulling
// in a crate for one query string.
fn urlencoding_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let hi = hex_digit(bytes[i + 1]);
                let lo = hex_digit(bytes[i + 2]);
                if let (Some(h), Some(l)) = (hi, lo) {
                    out.push((h << 4) | l);
                    i += 3;
                    continue;
                }
                out.push(bytes[i]);
                i += 1;
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b => {
                out.push(b);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn hex_digit(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

fn internal(context: &str) -> ApiError {
    tracing::error!(context, "internal invariant violated");
    ApiError(OpenWrapperError::Internal {
        correlation_id: openwrapper_core::error::new_correlation_id(),
    })
}
