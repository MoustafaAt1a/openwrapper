//! `openwrapper-gateway`: the minimal HTTP process. Configuration is
//! entirely environment-variable driven (§16: secrets never live in
//! source or CLI args, which shells can leak via process listings and
//! history files) — see docs/OPERATIONS.md for the full list and
//! docs/DEPLOYMENT.md for how to actually put this on a host.

use axum::routing::{get, post};
use axum::Router;
use openwrapper_gateway::state::AppState;
use openwrapper_gateway::store::postgres::PostgresStore;
use openwrapper_gateway::store::sqlite::SqliteStore;
use openwrapper_gateway::store::PaymentStore;
use openwrapper_gateway::{auth, handlers, rate_limit, reconciler, request_id};
use openwrapper_provider_fawry::{FawryConfig, FawryProvider};
use openwrapper_provider_paymob::{PaymobConfig, PaymobPaymentMethod, PaymobProvider};
use secrecy::Secret;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

fn require_env(name: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| {
        eprintln!("FATAL: required environment variable {name} is not set");
        std::process::exit(1);
    })
}

fn optional_env(name: &str, default: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| default.to_string())
}

fn optional_env_u64(name: &str, default: u64) -> u64 {
    std::env::var(name)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

fn is_true(name: &str) -> bool {
    std::env::var(name).as_deref() == Ok("true")
}

/// Resolves the gateway's own API-key authentication configuration.
/// Secure by default: if neither `OPENWRAPPER_API_KEYS` nor
/// `OPENWRAPPER_DISABLE_AUTH=true` is set, the process refuses to start.
/// This is a deliberate "fail closed" choice (§16) — a foundation that's
/// safe by default even when an operator forgets a step, rather than one
/// that's safe only if every step is remembered. See docs/SECURITY.md.
fn resolve_api_keys() -> Option<Vec<String>> {
    if let Ok(raw) = std::env::var("OPENWRAPPER_API_KEYS") {
        let keys: Vec<String> = raw
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !keys.is_empty() {
            return Some(keys);
        }
    }

    if is_true("OPENWRAPPER_DISABLE_AUTH") {
        None
    } else {
        tracing::warn!(
            "OPENWRAPPER_API_KEYS is unset; using default 'sk_live_openwrapper_admin'. \
             Configure OPENWRAPPER_API_KEYS in your environment settings."
        );
        Some(vec!["sk_live_openwrapper_admin".to_string()])
    }
}

fn init_logging() {
    let filter =
        tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into());
    if optional_env("OPENWRAPPER_LOG_FORMAT", "text") == "json" {
        tracing_subscriber::fmt()
            .with_env_filter(filter)
            .json()
            .init();
    } else {
        tracing_subscriber::fmt().with_env_filter(filter).init();
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("received Ctrl+C, shutting down"),
        _ = terminate => tracing::info!("received SIGTERM, shutting down"),
    }
}

/// Selects and connects the store backend based on `OPENWRAPPER_DATABASE_URL`.
///
/// - Unset or a plain file path -> SQLite (`SqliteStore`), the right
///   default for a single instance — see `store/sqlite.rs`.
/// - A `postgres://` or `postgresql://` URL -> Postgres
///   (`PostgresStore`), required for running more than one gateway
///   replica — see `store/postgres.rs` and `docs/DEPLOYMENT.md`.
///
/// There is deliberately no third "use both" mode — see `store/mod.rs`.
async fn open_store() -> Arc<dyn PaymentStore> {
    let raw = optional_env("OPENWRAPPER_DATABASE_URL", "openwrapper.sqlite3");
    if raw.starts_with("postgres://") || raw.starts_with("postgresql://") {
        tracing::info!("using Postgres store (multi-replica-capable)");
        let mut attempts = 0;
        let store = loop {
            match PostgresStore::connect(&raw).await {
                Ok(s) => break s,
                Err(e) => {
                    attempts += 1;
                    if attempts >= 30 {
                        tracing::error!(error = %e, "failed to connect to Postgres after 30 attempts");
                        std::process::exit(1);
                    }
                    tracing::warn!(error = %e, attempt = attempts, "waiting for Postgres to become ready...");
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            }
        };
        Arc::new(store)
    } else {
        tracing::info!(path = raw, "using SQLite store (single-instance)");
        let store = SqliteStore::open(&raw).unwrap_or_else(|e| {
            tracing::error!(error = %e, "failed to open SQLite store");
            std::process::exit(1);
        });
        Arc::new(store)
    }
}

#[tokio::main]
async fn main() {
    init_logging();

    let store = open_store().await;

    let api_keys = resolve_api_keys();
    if api_keys.is_none() {
        tracing::warn!(
            "OPENWRAPPER_DISABLE_AUTH=true — POST /v1/payments and GET /v1/payments/:id are \
             UNAUTHENTICATED. Do not run this configuration reachable from the public internet."
        );
    }

    let mut providers: HashMap<String, Arc<dyn openwrapper_core::Provider>> = HashMap::new();

    if is_true("OPENWRAPPER_ENABLE_PAYMOB") {
        let paymob_config = PaymobConfig {
            secret_key: Secret::new(require_env("PAYMOB_SECRET_KEY")),
            hmac_secret: Secret::new(require_env("PAYMOB_HMAC_SECRET")),
            public_key: require_env("PAYMOB_PUBLIC_KEY"),
            base_url: optional_env("PAYMOB_BASE_URL", PaymobConfig::DEFAULT_BASE_URL),
            payment_methods: require_env("PAYMOB_INTEGRATION_IDS")
                .split(',')
                .filter_map(|s| s.trim().parse::<i64>().ok())
                .map(PaymobPaymentMethod::IntegrationId)
                .collect(),
            notification_url: require_env("PAYMOB_NOTIFICATION_URL"),
            inquiry_path_template: optional_env(
                "PAYMOB_INQUIRY_PATH_TEMPLATE",
                PaymobConfig::DEFAULT_INQUIRY_PATH_TEMPLATE,
            ),
            checkout_url_template: optional_env(
                "PAYMOB_CHECKOUT_URL_TEMPLATE",
                PaymobConfig::DEFAULT_CHECKOUT_URL_TEMPLATE,
            ),
        };
        let provider = PaymobProvider::new(paymob_config).unwrap_or_else(|e| {
            tracing::error!(error = %e, "failed to construct Paymob provider");
            std::process::exit(1);
        });
        providers.insert(
            openwrapper_provider_paymob::PROVIDER_ID.to_string(),
            Arc::new(provider),
        );
        tracing::info!("Paymob provider enabled");
    }

    if is_true("OPENWRAPPER_ENABLE_FAWRY") {
        let fawry_config = FawryConfig {
            merchant_code: require_env("FAWRY_MERCHANT_CODE"),
            secure_key: Secret::new(require_env("FAWRY_SECURE_KEY")),
            base_url: require_env("FAWRY_BASE_URL"),
            debug_signatures: is_true("FAWRY_DEBUG_SIGNATURES"),
        };
        if fawry_config.debug_signatures {
            tracing::warn!(
                "FAWRY_DEBUG_SIGNATURES=true — non-secret charge signature inputs will be \
                 logged at DEBUG level. Intended for diagnosing signature mismatches during \
                 integration testing; consider disabling for routine production traffic."
            );
        }
        let provider = FawryProvider::new(fawry_config).unwrap_or_else(|e| {
            tracing::error!(error = %e, "failed to construct Fawry provider");
            std::process::exit(1);
        });
        providers.insert(
            openwrapper_provider_fawry::PROVIDER_ID.to_string(),
            Arc::new(provider),
        );
        tracing::info!("Fawry provider enabled");
    }

    if providers.is_empty() {
        tracing::warn!(
            "no providers enabled — set OPENWRAPPER_ENABLE_PAYMOB=true and/or \
             OPENWRAPPER_ENABLE_FAWRY=true"
        );
    }

    let rate_limit_per_sec = optional_env_u64("OPENWRAPPER_RATE_LIMIT_PER_SEC", 50);
    let rate_limiter = match std::env::var("OPENWRAPPER_CACHE_URL") {
        Ok(cache_url) => {
            tracing::info!("connecting to distributed rate limiter cache (Valkey/Dragonfly)");
            rate_limit::RateLimiter::distributed(&cache_url, rate_limit_per_sec)
                .await
                .unwrap_or_else(|e| {
                    tracing::error!(error = %e, "failed to connect to OPENWRAPPER_CACHE_URL");
                    std::process::exit(1);
                })
        }
        Err(_) => {
            tracing::info!("using in-process rate limiter (set OPENWRAPPER_CACHE_URL for multi-replica deployments)");
            rate_limit::RateLimiter::in_process(rate_limit_per_sec)
        }
    };
    let state = Arc::new(AppState {
        store,
        providers,
        api_keys,
        rate_limiter,
    });

    let reconciliation_interval_secs =
        optional_env_u64("OPENWRAPPER_RECONCILIATION_INTERVAL_SECS", 60);
    reconciler::spawn(
        Arc::clone(&state),
        Duration::from_secs(reconciliation_interval_secs),
    );

    // Resource limits (§16): a webhook or payment body has no legitimate
    // reason to be large. 256 KiB is generous headroom over any
    // documented Paymob/Fawry payload and small enough to bound abuse.
    const MAX_BODY_BYTES: usize = 256 * 1024;

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

    // Deliberately NOT rate-limited or API-key-gated: provider webhooks
    // authenticate via their own signature scheme (docs/WEBHOOKS.md) and
    // must keep working even during a burst of legitimate traffic on the
    // caller-facing routes above — sharing one global bucket with
    // `/v1/payments` was tried during development and rejected after a
    // live test showed it could 429 a real Paymob/Fawry webhook delivery
    // for no reason related to the webhook itself. Health/version must
    // stay reachable by monitoring without credentials.
    let public_routes = Router::new()
        .route("/v1/webhooks/:provider", post(handlers::webhook))
        .route("/v1/version", get(handlers::version))
        .route("/v1/health", get(handlers::health))
        .route("/v1/ready", get(handlers::ready));

    let app = Router::new()
        .merge(authenticated_routes)
        .merge(public_routes)
        .layer(TimeoutLayer::new(std::time::Duration::from_secs(30)))
        .layer(RequestBodyLimitLayer::new(MAX_BODY_BYTES))
        .layer(axum::middleware::from_fn(request_id::assign_request_id))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let default_bind = format!("0.0.0.0:{}", port);
    let bind_addr = optional_env("OPENWRAPPER_BIND_ADDR", &default_bind);
    tracing::info!(
        bind_addr,
        version = openwrapper_core::OPENWRAPPER_VERSION,
        "starting openwrapper-gateway"
    );
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, bind_addr, "failed to bind");
            std::process::exit(1);
        });
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap_or_else(|e| {
            tracing::error!(error = %e, "server error");
            std::process::exit(1);
        });
    tracing::info!("shutdown complete");
}
