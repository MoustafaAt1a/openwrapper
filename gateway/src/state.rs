//! Shared application state threaded through every handler via axum's
//! `State` extractor.

use crate::rate_limit::RateLimiter;
use crate::store::PaymentStore;
use openwrapper_core::Provider;
use std::collections::HashMap;
use std::sync::Arc;

pub struct AppState {
    pub store: Arc<dyn PaymentStore>,
    /// Keyed by `ProviderId::as_str()`. A `HashMap<String, _>` rather than
    /// a core-defined enum is exactly the extension point §5 asks for:
    /// adding a third provider means constructing it here and inserting
    /// it, not touching `openwrapper-core`.
    pub providers: HashMap<String, Arc<dyn Provider>>,
    /// `None` means API-key authentication is explicitly disabled
    /// (`OPENWRAPPER_DISABLE_AUTH=true`) — see `auth.rs` and
    /// `docs/SECURITY.md`. `Some(keys)` with an empty vec cannot occur:
    /// `main.rs` refuses to start with auth enabled but zero keys
    /// configured.
    pub api_keys: Option<Vec<String>>,
    pub rate_limiter: RateLimiter,
}
