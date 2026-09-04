pub mod proto {
    tonic::include_proto!("openwrapper.v1");
}

use std::collections::BTreeMap;
use std::sync::Arc;
use tonic::{Request, Response, Status};

use crate::state::AppState;
use openwrapper_core::{
    Currency, CustomerDetails, IdempotencyKey, Money, Payment, PaymentId, PaymentNextAction,
    PaymentRequest, PaymentStatus, ProviderId,
};
use proto::payment_gateway_server::PaymentGateway;
use proto::{
    CreatePaymentRequest, GetPaymentRequest, HealthRequest, HealthResponse, PaymentEvent,
    PaymentResponse, StreamEventsRequest,
};

#[derive(Clone)]
pub struct PaymentGatewayService {
    pub state: Arc<AppState>,
}

impl PaymentGatewayService {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }
}

fn map_payment_to_proto(
    payment: &Payment,
    next_action: Option<&PaymentNextAction>,
) -> PaymentResponse {
    PaymentResponse {
        payment_id: payment.id.to_string(),
        provider: payment.provider.to_string(),
        provider_reference: payment.provider_reference.as_ref().map(|r| r.to_string()),
        status: match payment.status {
            PaymentStatus::Pending => "pending".to_string(),
            PaymentStatus::Succeeded => "succeeded".to_string(),
            PaymentStatus::Failed => "failed".to_string(),
            PaymentStatus::Unknown => "unknown".to_string(),
        },
        amount_minor_units: payment.amount.minor_units().max(0) as u64,
        currency: payment.currency.code().to_string(),
        merchant_reference: payment.merchant_reference.clone(),
        next_action: next_action.map(|na| proto::NextAction {
            r#type: match na {
                PaymentNextAction::RedirectToUrl { .. } => "redirect_to_url".to_string(),
                PaymentNextAction::PayAtReference { .. } => "pay_at_reference".to_string(),
            },
            url: match na {
                PaymentNextAction::RedirectToUrl { url } => Some(url.clone()),
                _ => None,
            },
            reference: match na {
                PaymentNextAction::PayAtReference { reference, .. } => Some(reference.clone()),
                _ => None,
            },
            instructions: match na {
                PaymentNextAction::PayAtReference { instructions, .. } => instructions.clone(),
                _ => None,
            },
        }),
        created_at: payment
            .created_at
            .format(&time::format_description::well_known::Rfc3339)
            .unwrap_or_default(),
        updated_at: payment
            .updated_at
            .format(&time::format_description::well_known::Rfc3339)
            .unwrap_or_default(),
    }
}

#[tonic::async_trait]
impl PaymentGateway for PaymentGatewayService {
    async fn create_payment(
        &self,
        request: Request<CreatePaymentRequest>,
    ) -> Result<Response<PaymentResponse>, Status> {
        let req = request.into_inner();

        let currency = Currency::parse(&req.currency)
            .map_err(|e| Status::invalid_argument(format!("Invalid currency: {e}")))?;
        let minor_units = i64::try_from(req.amount_minor_units)
            .map_err(|_| Status::invalid_argument("Amount exceeds supported integer range"))?;
        let amount = Money::from_minor_units(minor_units, currency)
            .map_err(|e| Status::invalid_argument(format!("Invalid amount: {e}")))?;
        let idempotency_key = IdempotencyKey::parse(&req.idempotency_key)
            .map_err(|e| Status::invalid_argument(format!("Invalid idempotency key: {e}")))?;
        let provider_id = ProviderId::parse(&req.provider)
            .map_err(|e| Status::invalid_argument(format!("Invalid provider: {e}")))?;

        let metadata: BTreeMap<String, String> = req.metadata.into_iter().collect();

        let payment_request = PaymentRequest {
            idempotency_key,
            provider: provider_id.clone(),
            amount,
            customer: CustomerDetails {
                phone: req
                    .customer
                    .as_ref()
                    .map(|c| c.phone.clone())
                    .unwrap_or_default(),
                email: req.customer.as_ref().and_then(|c| c.email.clone()),
                full_name: req.customer.as_ref().and_then(|c| c.full_name.clone()),
            },
            merchant_reference: req.merchant_reference,
            description: req.description,
            return_url: req.return_url,
            metadata,
        };

        payment_request
            .validate()
            .map_err(|e| Status::invalid_argument(format!("Validation error: {e}")))?;

        let provider = self
            .state
            .providers
            .get(provider_id.as_str())
            .ok_or_else(|| {
                Status::not_found(format!("Provider '{provider_id}' is not configured"))
            })?;

        let outcome = self
            .state
            .store
            .begin_payment(&payment_request)
            .await
            .map_err(|e| Status::internal(format!("Store error: {e}")))?;

        match outcome {
            crate::store::BeginOutcome::Conflict => Err(Status::already_exists(
                "Idempotency-Key was already used with a different request payload",
            )),
            crate::store::BeginOutcome::ReturnExisting(payment) => {
                let next_action = self
                    .state
                    .store
                    .get_next_action(&payment.id)
                    .await
                    .unwrap_or(None);
                Ok(Response::new(map_payment_to_proto(
                    &payment,
                    next_action.as_ref(),
                )))
            }
            crate::store::BeginOutcome::Proceed { payment_id } => {
                match provider.create_payment(&payment_id, &payment_request).await {
                    Ok(result) => {
                        self.state
                            .store
                            .record_creation_result(
                                &payment_id,
                                &result.provider_reference,
                                result.status.into(),
                                result.next_action.as_ref(),
                            )
                            .await
                            .map_err(|e| Status::internal(format!("Store error: {e}")))?;

                        let payment = Payment {
                            id: payment_id,
                            idempotency_key: payment_request.idempotency_key,
                            provider: provider_id,
                            provider_reference: Some(result.provider_reference),
                            status: result.status.into(),
                            amount: payment_request.amount,
                            currency,
                            merchant_reference: payment_request.merchant_reference,
                            created_at: result.created_at,
                            updated_at: result.created_at,
                        };

                        Ok(Response::new(map_payment_to_proto(
                            &payment,
                            result.next_action.as_ref(),
                        )))
                    }
                    Err(e) if e.is_definite_non_occurrence() => {
                        let _ = self
                            .state
                            .store
                            .mark_terminal_without_provider_reference(
                                &payment_id,
                                PaymentStatus::Failed,
                            )
                            .await;
                        Err(Status::aborted(format!("Provider rejected payment: {e}")))
                    }
                    Err(_e) => {
                        let _ = self.state.store.mark_unknown(&payment_id).await;
                        let now = time::OffsetDateTime::now_utc();
                        let payment = Payment {
                            id: payment_id,
                            idempotency_key: payment_request.idempotency_key,
                            provider: provider_id,
                            provider_reference: None,
                            status: PaymentStatus::Unknown,
                            amount: payment_request.amount,
                            currency,
                            merchant_reference: payment_request.merchant_reference,
                            created_at: now,
                            updated_at: now,
                        };
                        Ok(Response::new(map_payment_to_proto(&payment, None)))
                    }
                }
            }
        }
    }

    async fn get_payment(
        &self,
        request: Request<GetPaymentRequest>,
    ) -> Result<Response<PaymentResponse>, Status> {
        let req = request.into_inner();
        let payment_id: PaymentId = req
            .payment_id
            .parse()
            .map_err(|_| Status::invalid_argument("Invalid payment_id"))?;

        let payment = self
            .state
            .store
            .get_payment(&payment_id)
            .await
            .map_err(|e| Status::internal(format!("Store error: {e}")))?
            .ok_or_else(|| Status::not_found("Payment not found"))?;

        let next_action = self
            .state
            .store
            .get_next_action(&payment_id)
            .await
            .unwrap_or(None);

        Ok(Response::new(map_payment_to_proto(
            &payment,
            next_action.as_ref(),
        )))
    }

    async fn check_health(
        &self,
        _request: Request<HealthRequest>,
    ) -> Result<Response<HealthResponse>, Status> {
        let store_connected = self.state.store.ping().await.is_ok();
        let cache_connected = self.state.rate_limiter.ping().await;
        let message_bus_connected = self
            .state
            .message_bus
            .as_ref()
            .map(|b| b.is_connected())
            .unwrap_or(true);

        let status = if store_connected && cache_connected {
            "healthy"
        } else {
            "degraded"
        };

        Ok(Response::new(HealthResponse {
            status: status.to_string(),
            version: openwrapper_core::OPENWRAPPER_VERSION.to_string(),
            store_connected,
            cache_connected,
            message_bus_connected,
            timestamp: time::OffsetDateTime::now_utc()
                .format(&time::format_description::well_known::Rfc3339)
                .unwrap_or_default(),
        }))
    }

    type StreamPaymentEventsStream =
        tokio_stream::wrappers::ReceiverStream<Result<PaymentEvent, Status>>;

    async fn stream_payment_events(
        &self,
        request: Request<StreamEventsRequest>,
    ) -> Result<Response<Self::StreamPaymentEventsStream>, Status> {
        let req = request.into_inner();
        let (tx, rx) = tokio::sync::mpsc::channel(16);
        let store = self.state.store.clone();
        let filter_pid = req.payment_id;

        tokio::spawn(async move {
            if let Some(ref pid_str) = filter_pid {
                if let Ok(pid) = pid_str.parse::<PaymentId>() {
                    if let Ok(Some(payment)) = store.get_payment(&pid).await {
                        let event = PaymentEvent {
                            event_id: PaymentId::new().to_string(),
                            payment_id: payment.id.to_string(),
                            provider: payment.provider.to_string(),
                            previous_status: String::new(),
                            current_status: payment.status.to_string(),
                            amount_minor_units: payment.amount.minor_units().max(0) as u64,
                            timestamp: time::OffsetDateTime::now_utc()
                                .format(&time::format_description::well_known::Rfc3339)
                                .unwrap_or_default(),
                        };
                        let _ = tx.send(Ok(event)).await;
                    }
                }
            }
        });

        Ok(Response::new(tokio_stream::wrappers::ReceiverStream::new(
            rx,
        )))
    }
}
