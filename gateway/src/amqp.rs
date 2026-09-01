//! Optional RabbitMQ message bus for async webhook processing and
//! reconciliation. When `OPENWRAPPER_AMQP_URL` is unset, all operations
//! are no-ops and the gateway uses in-process handlers instead.

use crate::state::AppState;
use crate::store::TransitionOutcome;
use futures_util::StreamExt;
use lapin::{
    options::{
        BasicAckOptions, BasicConsumeOptions, BasicPublishOptions, BasicQosOptions,
        ExchangeDeclareOptions, QueueBindOptions, QueueDeclareOptions,
    },
    types::{AMQPValue, FieldTable, LongString},
    BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind,
};
use openwrapper_core::{PaymentId, PaymentStatus, ProviderId, WebhookEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

const DLX_EXCHANGE: &str = "openwrapper.dlx";
const DLQ_QUEUE: &str = "openwrapper.dlq";

#[derive(Debug, Clone)]
pub struct AmqpConfig {
    pub url: String,
    pub webhook_queue: String,
    pub reconcile_queue: String,
    pub prefetch: u16,
    pub max_retries: u32,
}

impl AmqpConfig {
    pub fn from_env() -> Option<Self> {
        let url = std::env::var("OPENWRAPPER_AMQP_URL").ok()?;
        if url.trim().is_empty() {
            return None;
        }
        Some(Self {
            url,
            webhook_queue: std::env::var("OPENWRAPPER_AMQP_WEBHOOK_QUEUE")
                .unwrap_or_else(|_| "openwrapper.webhooks".to_string()),
            reconcile_queue: std::env::var("OPENWRAPPER_AMQP_RECONCILE_QUEUE")
                .unwrap_or_else(|_| "openwrapper.reconciliation".to_string()),
            prefetch: std::env::var("OPENWRAPPER_AMQP_PREFETCH")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1),
            max_retries: std::env::var("OPENWRAPPER_AMQP_MAX_RETRIES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookQueueMessage {
    pub provider: String,
    pub event: WebhookEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconcileQueueMessage {
    pub payment_id: String,
    pub provider: String,
    pub provider_reference: String,
    pub attempt: u32,
}

pub struct MessageBus {
    channel: Channel,
    config: AmqpConfig,
}

impl MessageBus {
    pub async fn connect(config: AmqpConfig) -> Result<Self, lapin::Error> {
        let conn = Connection::connect(&config.url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;
        channel
            .basic_qos(config.prefetch, BasicQosOptions::default())
            .await?;
        declare_topology(&channel, &config).await?;
        Ok(Self { channel, config })
    }

    pub fn is_connected(&self) -> bool {
        self.channel.status().connected()
    }

    pub async fn publish_webhook(&self, msg: &WebhookQueueMessage) -> Result<(), String> {
        let body = serde_json::to_vec(msg).map_err(|e| e.to_string())?;
        self.channel
            .basic_publish(
                "",
                &self.config.webhook_queue,
                BasicPublishOptions {
                    mandatory: true,
                    ..Default::default()
                },
                &body,
                BasicProperties::default().with_delivery_mode(2),
            )
            .await
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn publish_reconcile(&self, msg: &ReconcileQueueMessage) -> Result<(), String> {
        let body = serde_json::to_vec(msg).map_err(|e| e.to_string())?;
        self.channel
            .basic_publish(
                "",
                &self.config.reconcile_queue,
                BasicPublishOptions {
                    mandatory: true,
                    ..Default::default()
                },
                &body,
                BasicProperties::default().with_delivery_mode(2),
            )
            .await
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn spawn_consumers(self: Arc<Self>, state: Arc<AppState>) {
        let webhook_bus = Arc::clone(&self);
        let webhook_state = Arc::clone(&state);
        let webhook_queue = self.config.webhook_queue.clone();
        tokio::spawn(async move {
            if let Err(e) = consume_webhooks(webhook_bus, webhook_state, webhook_queue).await {
                tracing::error!(error = %e, "webhook consumer exited");
            }
        });

        let reconcile_bus = Arc::clone(&self);
        let reconcile_state = Arc::clone(&state);
        let reconcile_queue = self.config.reconcile_queue.clone();
        tokio::spawn(async move {
            if let Err(e) =
                consume_reconciliation(reconcile_bus, reconcile_state, reconcile_queue).await
            {
                tracing::error!(error = %e, "reconciliation consumer exited");
            }
        });
    }
}

async fn declare_topology(channel: &Channel, config: &AmqpConfig) -> Result<(), lapin::Error> {
    let mut dlx_args = FieldTable::default();
    dlx_args.insert(
        "x-dead-letter-exchange".into(),
        AMQPValue::LongString(LongString::from(DLX_EXCHANGE.as_bytes())),
    );

    channel
        .exchange_declare(
            DLX_EXCHANGE,
            ExchangeKind::Fanout,
            ExchangeDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await?;

    channel
        .queue_declare(
            DLQ_QUEUE,
            QueueDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await?;
    channel
        .queue_bind(
            DLQ_QUEUE,
            DLX_EXCHANGE,
            "",
            QueueBindOptions::default(),
            FieldTable::default(),
        )
        .await?;

    for queue in [&config.webhook_queue, &config.reconcile_queue] {
        channel
            .queue_declare(
                queue,
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                dlx_args.clone(),
            )
            .await?;
    }
    Ok(())
}

async fn consume_webhooks(
    bus: Arc<MessageBus>,
    state: Arc<AppState>,
    queue: String,
) -> Result<(), lapin::Error> {
    let mut consumer = bus
        .channel
        .basic_consume(
            &queue,
            "openwrapper-webhook-consumer",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    while let Some(delivery) = consumer.next().await {
        let delivery = delivery?;
        if let Ok(msg) = serde_json::from_slice::<WebhookQueueMessage>(&delivery.data) {
            if let Err(e) = process_webhook_message(&state, &msg).await {
                tracing::error!(error = %e, provider = %msg.provider, "webhook consumer: processing failed");
            }
        } else {
            tracing::warn!("webhook consumer: invalid message payload");
        }
        delivery.ack(BasicAckOptions::default()).await?;
    }
    Ok(())
}

async fn consume_reconciliation(
    bus: Arc<MessageBus>,
    state: Arc<AppState>,
    queue: String,
) -> Result<(), lapin::Error> {
    let mut consumer = bus
        .channel
        .basic_consume(
            &queue,
            "openwrapper-reconcile-consumer",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    while let Some(delivery) = consumer.next().await {
        let delivery = delivery?;
        if let Ok(msg) = serde_json::from_slice::<ReconcileQueueMessage>(&delivery.data) {
            if let Err(e) = process_reconcile_message(&bus, &state, &msg).await {
                tracing::error!(payment_id = %msg.payment_id, error = %e, "reconciliation consumer: failed");
            }
        }
        delivery.ack(BasicAckOptions::default()).await?;
    }
    Ok(())
}

pub async fn process_webhook_message(
    state: &Arc<AppState>,
    msg: &WebhookQueueMessage,
) -> Result<(), String> {
    let provider_id = ProviderId::parse(&msg.provider).map_err(|e| e.to_string())?;
    let is_new = state
        .store
        .record_webhook_event_if_new(&msg.event.event_id, &provider_id, None)
        .await
        .map_err(|e| e.to_string())?;
    if !is_new {
        return Ok(());
    }

    match state
        .store
        .apply_webhook_transition(
            &provider_id,
            &msg.event.provider_reference,
            msg.event.reported_status,
            msg.event.reported_amount_minor_units,
        )
        .await
    {
        Ok(Some(TransitionOutcome::AmountMismatch { stored, reported })) => {
            tracing::error!(provider = %msg.provider, stored, reported, "webhook amount mismatch");
        }
        Ok(Some(TransitionOutcome::Illegal { from, to })) => {
            tracing::warn!(provider = %msg.provider, %from, %to, "illegal webhook transition");
        }
        Ok(None) => tracing::warn!(provider = %msg.provider, "webhook for unknown payment"),
        Ok(_) => {}
        Err(e) => return Err(e.to_string()),
    }
    Ok(())
}

async fn process_reconcile_message(
    bus: &Arc<MessageBus>,
    state: &Arc<AppState>,
    msg: &ReconcileQueueMessage,
) -> Result<(), String> {
    let payment_id: PaymentId = msg
        .payment_id
        .parse()
        .map_err(|_| "invalid payment id".to_string())?;
    let provider = state
        .providers
        .get(&msg.provider)
        .ok_or_else(|| format!("unknown provider {}", msg.provider))?;

    match provider
        .inquire_status(&openwrapper_core::ProviderReference::new(
            &msg.provider_reference,
        ))
        .await
    {
        Ok(resolved) if resolved != PaymentStatus::Unknown => {
            match state
                .store
                .apply_reconciliation_result(&payment_id, resolved)
                .await
            {
                Ok(TransitionOutcome::Applied {
                    payment_id,
                    from,
                    to,
                }) => tracing::info!(%payment_id, %from, %to, "reconciliation: resolved via queue"),
                Ok(TransitionOutcome::Illegal { from, to }) => {
                    tracing::warn!(payment_id = %msg.payment_id, %from, %to, "illegal reconciliation transition")
                }
                Ok(_) => {}
                Err(e) => return Err(e.to_string()),
            }
        }
        Ok(_) => {
            let _ = state.store.touch_reconciliation_attempt(&payment_id).await;
        }
        Err(e) => {
            if msg.attempt + 1 < bus.config.max_retries {
                let retry = ReconcileQueueMessage {
                    payment_id: msg.payment_id.clone(),
                    provider: msg.provider.clone(),
                    provider_reference: msg.provider_reference.clone(),
                    attempt: msg.attempt + 1,
                };
                bus.publish_reconcile(&retry).await?;
            } else {
                tracing::warn!(payment_id = %msg.payment_id, error = %e, "reconciliation: max retries exceeded");
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn webhook_message_roundtrip() {
        let msg = WebhookQueueMessage {
            provider: "paymob".into(),
            event: WebhookEvent {
                provider: ProviderId::parse("paymob").unwrap(),
                event_id: "evt_1".into(),
                provider_reference: openwrapper_core::ProviderReference::new("ref1"),
                merchant_reference: None,
                reported_status: PaymentStatus::Succeeded,
                reported_amount_minor_units: Some(1000),
                raw_for_diagnostics: serde_json::json!({}),
            },
        };
        let bytes = serde_json::to_vec(&msg).unwrap();
        let decoded: WebhookQueueMessage = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(decoded.provider, "paymob");
        assert_eq!(decoded.event.event_id, "evt_1");
    }
}
