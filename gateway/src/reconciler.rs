//! Background reconciliation for `Unknown` payments (§13).
//!
//! `GET /v1/payments/:id` already attempts reconciliation on demand (see
//! `handlers::get_payment`), which is enough to prove the mechanism works
//! but leaves a real-world gap: a payment nobody happens to poll stays
//! `Unknown` forever even after the provider itself could resolve it.
//! This loop closes that gap with the same minimal mechanism §13 asks
//! for — a provider status inquiry — run periodically instead of only on
//! request. It is still not a "reconciliation platform" (§13 explicitly
//! warns against building one prematurely): it's a single `tokio::spawn`
//! loop with no separate scheduler, no retry queue, no dead-letter
//! handling — bounded, simple, and easy to delete if it turns out to be
//! the wrong shape once real usage feedback comes in.

use crate::state::AppState;
use std::sync::Arc;
use std::time::Duration as StdDuration;

/// Only reconcile payments that have been `Unknown` for at least this
/// long, so a payment that just became ambiguous isn't immediately
/// re-queried in the same tick — give an imminent webhook or an
/// in-flight `GET` a chance first.
const MIN_AGE: time::Duration = time::Duration::seconds(30);
const BATCH_LIMIT: i64 = 100;

pub fn spawn(state: Arc<AppState>, interval: StdDuration) {
    if interval.is_zero() {
        tracing::info!("background reconciliation disabled (interval = 0)");
        return;
    }
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(interval);
        // The first tick fires immediately; skip it so we don't run a
        // reconciliation pass the instant the process starts before
        // anything could plausibly be stale yet.
        ticker.tick().await;
        loop {
            ticker.tick().await;
            run_once(&state).await;
        }
    });
}

async fn run_once(state: &Arc<AppState>) {
    let stale = match state
        .store
        .list_stale_unknown_payments(MIN_AGE, BATCH_LIMIT)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!(error = %e, "reconciliation: failed to list stale Unknown payments");
            return;
        }
    };
    if stale.is_empty() {
        return;
    }
    tracing::info!(
        count = stale.len(),
        "reconciliation: attempting to resolve stale Unknown payments"
    );

    for payment in stale {
        let Some(provider_reference) = payment.provider_reference.clone() else {
            continue; // nothing to inquire with yet
        };
        let Some(provider) = state.providers.get(payment.provider.as_str()) else {
            continue;
        };
        if !provider
            .capabilities()
            .contains(&openwrapper_core::Capability::InquireStatus)
        {
            continue;
        }

        match provider.inquire_status(&provider_reference).await {
            Ok(resolved) if resolved != openwrapper_core::PaymentStatus::Unknown => {
                match state
                    .store
                    .apply_reconciliation_result(&payment.id, resolved)
                    .await
                {
                    Ok(crate::store::TransitionOutcome::Applied {
                        payment_id,
                        from,
                        to,
                    }) => {
                        tracing::info!(%payment_id, %from, %to, "reconciliation: resolved");
                    }
                    Ok(crate::store::TransitionOutcome::Illegal { from, to }) => {
                        tracing::warn!(payment_id = %payment.id, %from, %to, "reconciliation: provider reported an illegal transition, ignored");
                    }
                    Ok(_) => {}
                    Err(e) => {
                        tracing::error!(payment_id = %payment.id, error = %e, "reconciliation: failed to apply result");
                    }
                }
            }
            Ok(_) => {
                // Still Unknown per the provider itself — touch timestamp to rotate in fair queue.
                let _ = state.store.touch_reconciliation_attempt(&payment.id).await;
            }
            Err(e) => {
                tracing::debug!(payment_id = %payment.id, error = %e, "reconciliation: inquiry failed, rotated in queue");
                let _ = state.store.touch_reconciliation_attempt(&payment.id).await;
            }
        }
    }
}
