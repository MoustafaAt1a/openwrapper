//! Minimal, mathematically sound retry engine with exponential backoff and full jitter.
//!
//! # Invariant: Idempotency-Safe Retries
//! Retries must ONLY ever be applied to operations that are mathematically proven
//! to be idempotent (e.g. read-only status inquiries, health checks, or calls
//! guarded by server-side idempotency keys). Blindly retrying state-mutating
//! payment creations is forbidden (Invariant I6).
//!
//! # Algorithm: Full Jitter Exponential Backoff
//! For attempt `k` (0-indexed):
//! `ceiling = min(max_delay, initial_delay * 2^k)`
//! `sleep = random_between(0, ceiling)`
//! Full jitter breaks synchronization across concurrent clients and prevents
//! thundering herd stampedes against upstream providers.

use std::future::Future;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RetryPolicy {
    pub max_retries: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_millis(3000),
        }
    }
}

impl RetryPolicy {
    pub const fn new(max_retries: u32, initial_delay: Duration, max_delay: Duration) -> Self {
        Self {
            max_retries,
            initial_delay,
            max_delay,
        }
    }

    /// Computes the jittered delay for a given 0-indexed attempt count.
    pub fn compute_delay(&self, attempt: u32) -> Duration {
        if self.initial_delay.is_zero() || self.max_delay.is_zero() {
            return Duration::ZERO;
        }
        let factor = 1u64.checked_shl(attempt.min(30)).unwrap_or(u64::MAX);
        let base_micros = self.initial_delay.as_micros() as u64;
        let max_micros = self.max_delay.as_micros() as u64;
        let ceiling_micros = base_micros.saturating_mul(factor).min(max_micros);

        if ceiling_micros == 0 {
            return Duration::ZERO;
        }

        // Fast, high-entropy seed from nanos without external crate dependency
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.subsec_nanos() as u64)
            .unwrap_or(42);
        let hash =
            (nanos ^ (nanos << 13)).wrapping_add((attempt as u64).wrapping_mul(0x517cc1b727220a95));
        let random_factor = hash % ceiling_micros;

        Duration::from_micros(random_factor)
    }
}

/// Executes an asynchronous operation with retry backoff for retryable errors.
pub async fn retry_async<F, Fut, T, E>(
    policy: &RetryPolicy,
    is_retryable: impl Fn(&E) -> bool,
    mut operation: F,
) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    let mut attempt = 0;
    loop {
        match operation().await {
            Ok(val) => return Ok(val),
            Err(err) => {
                if attempt >= policy.max_retries || !is_retryable(&err) {
                    return Err(err);
                }
                let sleep_duration = policy.compute_delay(attempt);
                if !sleep_duration.is_zero() {
                    tokio::time::sleep(sleep_duration).await;
                }
                attempt += 1;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::sync::Arc;

    #[test]
    fn backoff_calculation_respects_bounds() {
        let policy = RetryPolicy {
            max_retries: 5,
            initial_delay: Duration::from_millis(50),
            max_delay: Duration::from_millis(400),
        };

        for attempt in 0..10 {
            let delay = policy.compute_delay(attempt);
            assert!(delay <= policy.max_delay);
        }
    }

    #[tokio::test]
    async fn retries_transient_error_until_success() {
        let policy = RetryPolicy {
            max_retries: 3,
            initial_delay: Duration::from_millis(1),
            max_delay: Duration::from_millis(10),
        };

        let counter = Arc::new(AtomicU32::new(0));
        let c = Arc::clone(&counter);

        let result: Result<i32, &'static str> = retry_async(
            &policy,
            |_| true,
            || {
                let cnt = Arc::clone(&c);
                async move {
                    let prev = cnt.fetch_add(1, Ordering::SeqCst);
                    if prev < 2 {
                        Err("transient")
                    } else {
                        Ok(42)
                    }
                }
            },
        )
        .await;

        assert_eq!(result, Ok(42));
        assert_eq!(counter.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn terminates_immediately_on_non_retryable_error() {
        let policy = RetryPolicy {
            max_retries: 5,
            initial_delay: Duration::from_millis(1),
            max_delay: Duration::from_millis(10),
        };

        let counter = Arc::new(AtomicU32::new(0));
        let c = Arc::clone(&counter);

        let result: Result<i32, &'static str> = retry_async(
            &policy,
            |e| *e == "retryable",
            || {
                let cnt = Arc::clone(&c);
                async move {
                    cnt.fetch_add(1, Ordering::SeqCst);
                    Err("fatal")
                }
            },
        )
        .await;

        assert_eq!(result, Err("fatal"));
        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }
}
