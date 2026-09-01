//! Basic abuse protection (§16) for `/v1/payments`.
//!
//! Two backends behind one `RateLimiter` type, selected by whether
//! `OPENWRAPPER_CACHE_URL` is configured:
//!
//! - **In-process** (default): a `Mutex`-guarded token bucket, correct
//!   and sufficient for a single gateway instance. Does not coordinate
//!   across replicas — each instance has its own independent bucket.
//! - **Distributed**: a fixed-window counter in a Valkey or Dragonfly
//!   server (any RESP-protocol-compatible cache), shared by every
//!   gateway replica. This is the one place this project uses a cache,
//!   and it exists for a specific, narrow reason: once Postgres makes
//!   multiple gateway replicas a supported deployment (see
//!   `store/postgres.rs`), an in-process rate limiter silently stops
//!   meaning what its configured number claims — five replicas each
//!   independently allowing 50 req/sec is actually 250 req/sec in
//!   aggregate. A distributed counter fixes that. It is **not** used for
//!   idempotency, payment state, or anything else this project's own
//!   invariants apply to — those stay in Postgres/SQLite, per §11's
//!   explicit instruction not to reach for a cache/distributed store
//!   without a proven need. See `docs/DECISIONS.md`.
//!
//! Deployed with **Valkey** (a BSD-licensed Redis fork) or **Dragonfly**
//! (free/community edition) — not Redis itself, per this project's
//! dependency choice. The `redis` crate used here is a RESP-protocol
//! client, not a Redis-the-server dependency: it speaks the same wire
//! protocol Valkey and Dragonfly both implement, and was developed and
//! tested in this project's sandbox against `redis-server` only because
//! Valkey wasn't `apt`-installable there (see docs/LIMITATIONS.md) — the
//! protocol, not the specific server binary, is what this code depends on.

use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::state::AppState;

pub struct TokenBucket {
    capacity_microtokens: u64,
    refill_per_sec: u64,
    state: Mutex<(u64, Instant)>,
}

const MICROTOKENS_PER_TOKEN: u64 = 1_000_000;

impl TokenBucket {
    fn new(requests_per_sec: u64) -> Self {
        let rps = requests_per_sec.max(1);
        let capacity_microtokens = rps.saturating_mul(MICROTOKENS_PER_TOKEN);
        Self {
            capacity_microtokens,
            refill_per_sec: rps,
            state: Mutex::new((capacity_microtokens, Instant::now())),
        }
    }

    fn try_acquire(&self) -> bool {
        let mut guard = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let (tokens, last_refill) = &mut *guard;
        let now = Instant::now();
        let elapsed_micros = now.duration_since(*last_refill).as_micros() as u64;
        let added = elapsed_micros.saturating_mul(self.refill_per_sec);
        *tokens = (*tokens)
            .saturating_add(added)
            .min(self.capacity_microtokens);
        *last_refill = now;

        if *tokens >= MICROTOKENS_PER_TOKEN {
            *tokens -= MICROTOKENS_PER_TOKEN;
            true
        } else {
            false
        }
    }
}

pub struct DistributedLimiter {
    conn: redis::aio::MultiplexedConnection,
    limit: i64,
    window_secs: i64,
}

impl DistributedLimiter {
    async fn ping(&self) -> bool {
        let mut conn = self.conn.clone();
        redis::cmd("PING")
            .query_async::<_, String>(&mut conn)
            .await
            .is_ok()
    }

    /// Fixed-window counter: `INCR` a key naming the current
    /// `window_secs`-sized time slot, `EXPIRE` it so old windows are
    /// garbage-collected automatically, and compare the result to the
    /// limit. Simpler than a token bucket (allows a burst at window
    /// boundaries) but correct, well-understood, and easy to reason about
    /// across many concurrent clients — the standard shared-cache rate
    /// limiting pattern, not a novel mechanism.
    async fn try_acquire(&self) -> bool {
        let bucket_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0)
            / self.window_secs;
        let key = format!("openwrapper:ratelimit:{bucket_id}");

        let mut conn = self.conn.clone();
        let result: redis::RedisResult<(i64, bool)> = redis::pipe()
            .atomic()
            .incr(&key, 1)
            .expire(&key, self.window_secs.saturating_mul(2))
            .query_async(&mut conn)
            .await;

        match result {
            Ok((count, _)) => count <= self.limit,
            Err(e) => {
                // Fail OPEN, not closed: a rate limiter that itself
                // becomes a hard dependency (reject all traffic the
                // instant the cache is unreachable) would turn an
                // availability enhancement into a new single point of
                // failure for the entire payments API — a worse outcome
                // than briefly running without rate limiting. Logged so
                // an operator notices and can investigate the cache.
                tracing::warn!(error = %e, "distributed rate limiter unavailable, allowing request through");
                true
            }
        }
    }
}

pub enum RateLimiter {
    InProcess(TokenBucket),
    Distributed(DistributedLimiter),
}

impl RateLimiter {
    pub fn in_process(requests_per_sec: u64) -> Self {
        Self::InProcess(TokenBucket::new(requests_per_sec))
    }

    /// Connects to a Valkey/Dragonfly (or any RESP-compatible) server at
    /// `cache_url` (e.g. `redis://host:6379`). Uses a
    /// `MultiplexedConnection`, which lets concurrent tasks share one
    /// connection safely (cheap to `.clone()` per request) without an
    /// additional lock. Deliberately **not** `ConnectionManager` (which
    /// adds transparent auto-reconnection): that type pulled in a large
    /// transitive dependency chain requiring a newer Rust toolchain than
    /// this sandbox has available (see docs/DECISIONS.md), and
    /// auto-reconnect isn't load-bearing here — `try_acquire` already
    /// fails open on any connection error (see below), so a dropped
    /// connection degrades to "no rate limiting until the next
    /// successful call or a process restart", not an outage. A future
    /// version can reintroduce `ConnectionManager` once that dependency
    /// chain is less friction, or add simple manual reconnect-on-error.
    pub async fn distributed(cache_url: &str, requests_per_sec: u64) -> Result<Self, String> {
        let client = redis::Client::open(cache_url).map_err(|e| e.to_string())?;
        let conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| e.to_string())?;
        Ok(Self::Distributed(DistributedLimiter {
            conn,
            limit: requests_per_sec.max(1) as i64,
            window_secs: 1,
        }))
    }

    async fn try_acquire(&self) -> bool {
        match self {
            Self::InProcess(bucket) => bucket.try_acquire(),
            Self::Distributed(limiter) => limiter.try_acquire().await,
        }
    }

    pub fn is_distributed(&self) -> bool {
        matches!(self, Self::Distributed(_))
    }

    /// Health probe for readiness checks. In-process limiter is always healthy.
    pub async fn ping(&self) -> bool {
        match self {
            Self::InProcess(_) => true,
            Self::Distributed(limiter) => limiter.ping().await,
        }
    }
}

pub async fn enforce(State(state): State<Arc<AppState>>, request: Request, next: Next) -> Response {
    if state.rate_limiter.try_acquire().await {
        next.run(request).await
    } else {
        (
            StatusCode::TOO_MANY_REQUESTS,
            axum::Json(serde_json::json!({
                "error": { "code": "rate_limit", "message": "too many requests, slow down" }
            })),
        )
            .into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn in_process_allows_burst_up_to_capacity_then_rejects() {
        let limiter = RateLimiter::in_process(3);
        assert!(limiter.try_acquire().await);
        assert!(limiter.try_acquire().await);
        assert!(limiter.try_acquire().await);
        assert!(
            !limiter.try_acquire().await,
            "fourth immediate request should be rejected"
        );
    }

    #[tokio::test]
    async fn in_process_refills_over_time() {
        let limiter = RateLimiter::in_process(1000); // fast refill so the test doesn't sleep long
        assert!(limiter.try_acquire().await);
        while limiter.try_acquire().await {}
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        assert!(
            limiter.try_acquire().await,
            "should have refilled at least one token after 20ms at 1000/sec"
        );
    }

    /// Runs against a real local Valkey/Dragonfly/Redis-protocol server —
    /// `#[ignore]`d by default. Run with:
    /// `OPENWRAPPER_TEST_CACHE_URL=redis://127.0.0.1:6379 cargo test -p openwrapper-gateway -- --ignored`
    #[tokio::test]
    #[ignore]
    async fn distributed_limiter_enforces_shared_limit_across_independent_handles() {
        let url = std::env::var("OPENWRAPPER_TEST_CACHE_URL")
            .expect("set OPENWRAPPER_TEST_CACHE_URL to run distributed rate limiter tests");

        // Two independent `RateLimiter` instances, exactly as two
        // separate gateway replica processes would each construct their
        // own — this is the property being tested: they must share one
        // counter via the cache, not enforce independently.
        let limiter_a = RateLimiter::distributed(&url, 3).await.unwrap();
        let limiter_b = RateLimiter::distributed(&url, 3).await.unwrap();

        // Drain any count left over in the current window from a
        // previous test run by using a fresh, randomized limit key isn't
        // possible without changing the key scheme, so instead we just
        // acquire until rejection is observed, tolerating a partially
        // consumed window.
        let mut total_allowed = 0;
        for _ in 0..3 {
            if limiter_a.try_acquire().await {
                total_allowed += 1;
            }
        }
        // Whatever headroom remained, limiter_b must see it as shared,
        // not get its own fresh 3.
        let b_allowed = limiter_b.try_acquire().await;
        if total_allowed >= 3 {
            assert!(
                !b_allowed,
                "limiter_b should NOT get an independent allowance"
            );
        }
    }
}
