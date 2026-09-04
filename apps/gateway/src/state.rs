//! Shared application state threaded through every handler via axum's
//! `State` extractor.

use crate::amqp::MessageBus;
use crate::rate_limit::RateLimiter;
use crate::store::PaymentStore;
use openwrapper_core::Provider;
use std::collections::HashMap;
use std::sync::Arc;

pub struct AppState {
    pub store: Arc<dyn PaymentStore>,
    pub providers: HashMap<String, Arc<dyn Provider>>,
    pub api_keys: Option<Vec<String>>,
    pub rate_limiter: RateLimiter,
    /// Optional RabbitMQ bus for async webhook/reconciliation processing.
    pub message_bus: Option<Arc<MessageBus>>,
}
