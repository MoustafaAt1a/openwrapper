//! Immutable audit event model.
//!
//! Every payment lifecycle state change (creation, success, failure, refund)
//! produces an immutable Event record with an event ID (`evt_...`), timestamp,
//! event type, and canonical payload projection.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Event {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub created_at: i64,
    pub data: serde_json::Value,
}

impl Event {
    pub fn new(
        id: impl Into<String>,
        event_type: impl Into<String>,
        created_at: i64,
        data: serde_json::Value,
    ) -> Self {
        Self {
            id: id.into(),
            event_type: event_type.into(),
            created_at,
            data,
        }
    }
}
