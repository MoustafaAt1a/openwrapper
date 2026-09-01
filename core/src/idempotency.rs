//! The idempotency contract for boundary 1 (client → OpenWrapper). See
//! docs/IDEMPOTENCY.md for the full three-boundary analysis (§11);
//! boundaries 2 (OpenWrapper → provider) and 3 (provider → OpenWrapper
//! webhook) are handled inside provider adapters and the webhook pipeline
//! respectively, because their identity and duplicate semantics are
//! provider-specific in ways boundary 1 is not.
//!
//! Core defines only the *contract* (trait + types). It intentionally does
//! not depend on a database crate: "first define the invariant; then
//! choose the smallest persistence mechanism required" (§11). The gateway
//! crate provides the SQLite-backed implementation used in v0.1.0.

use crate::ids::{IdempotencyKey, PaymentId};
use crate::payment::PaymentStatus;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

/// A stable fingerprint of a request's semantically meaningful fields,
/// used to detect "same idempotency key, different operation" (§11's
/// required invariant). Computed by hashing a canonical JSON
/// representation with recursively sorted object keys.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RequestFingerprint(String);

impl RequestFingerprint {
    pub fn of(value: &impl Serialize) -> Result<Self, crate::error::OpenWrapperError> {
        let json =
            serde_json::to_value(value).map_err(|_| crate::error::OpenWrapperError::Internal {
                correlation_id: "fingerprint-serialize".into(),
            })?;
        let canonical = canonicalize_json(&json);
        let bytes = serde_json::to_vec(&canonical).map_err(|_| {
            crate::error::OpenWrapperError::Internal {
                correlation_id: "fingerprint-encode".into(),
            }
        })?;
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        Ok(Self(hex::encode(hasher.finalize())))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Wraps a fingerprint value already computed and persisted by a
    /// previous call to `of`, as read back from storage. This is
    /// deliberately a distinct constructor from `of`: calling `of` on an
    /// already-hashed string would hash it a second time and silently
    /// produce a value that can never again equal a freshly computed
    /// fingerprint of the original request, defeating the entire
    /// duplicate-vs-conflict check in `IdempotencyDecision`.
    pub fn from_stored(value: String) -> Self {
        Self(value)
    }
}

fn canonicalize_json(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let sorted: BTreeMap<_, _> = map
                .iter()
                .map(|(k, v)| (k.clone(), canonicalize_json(v)))
                .collect();
            serde_json::Value::Object(sorted.into_iter().collect())
        }
        serde_json::Value::Array(items) => {
            serde_json::Value::Array(items.iter().map(canonicalize_json).collect())
        }
        other => other.clone(),
    }
}

/// What happened when the store was asked to begin (or find) an idempotent
/// operation.
#[derive(Debug, Clone)]
pub enum IdempotencyDecision {
    /// No prior record existed for this key; the caller has exclusively
    /// claimed it (via an atomic insert — see the SQLite implementation)
    /// and must proceed to actually perform the operation and then call
    /// `complete`.
    Proceed { payment_id: PaymentId },
    /// A prior record exists with a matching fingerprint: same identity,
    /// same operation. Per §11's required invariant, the caller must
    /// return this existing record's outcome rather than perform the
    /// operation again — this is what makes retries safe.
    ReturnExisting(IdempotencyRecord),
    /// A prior record exists with a *different* fingerprint: same
    /// identity, different operation. Per §11's required invariant this is
    /// a deterministic rejection, never a guess about which operation was
    /// "really" meant.
    Conflict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdempotencyRecord {
    pub key: IdempotencyKey,
    pub payment_id: PaymentId,
    pub fingerprint: RequestFingerprint,
    pub status: PaymentStatus,
}

/// The idempotency store contract. Implementations must make `begin`
/// atomic under concurrent callers using the *same* key (§11's "concurrency
/// behavior" requirement) — i.e. if two requests with the same key arrive
/// at the same instant, exactly one may receive `Proceed` and the other
/// must receive `ReturnExisting`/`Conflict`, never both receiving
/// `Proceed`. The reference implementation achieves this with a SQL
/// `UNIQUE` constraint rather than application-level locking.
#[async_trait]
pub trait IdempotencyStore: Send + Sync {
    async fn begin(
        &self,
        key: &IdempotencyKey,
        fingerprint: &RequestFingerprint,
    ) -> Result<IdempotencyDecision, crate::error::OpenWrapperError>;

    /// Record the outcome of an operation that was allowed to `Proceed`.
    /// Must be called exactly once per successful `Proceed` decision.
    async fn complete(
        &self,
        key: &IdempotencyKey,
        status: PaymentStatus,
    ) -> Result<(), crate::error::OpenWrapperError>;

    async fn get(
        &self,
        key: &IdempotencyKey,
    ) -> Result<Option<IdempotencyRecord>, crate::error::OpenWrapperError>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids::ProviderId;
    use crate::money::{Currency, Money};
    use crate::payment::{CustomerDetails, PaymentRequest};

    fn sample_request(idem: &str) -> PaymentRequest {
        PaymentRequest {
            idempotency_key: IdempotencyKey::parse(idem).unwrap(),
            provider: ProviderId::parse("paymob").unwrap(),
            amount: Money::from_minor_units(1000, Currency::Egp).unwrap(),
            customer: CustomerDetails {
                phone: "+201234567890".into(),
                email: None,
                full_name: None,
            },
            merchant_reference: None,
            description: None,
            return_url: None,
            metadata: Default::default(),
        }
    }

    #[test]
    fn identical_requests_produce_identical_fingerprints() {
        let a = RequestFingerprint::of(&sample_request("k1")).unwrap();
        let b = RequestFingerprint::of(&sample_request("k1")).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn different_amounts_produce_different_fingerprints() {
        let mut req = sample_request("k1");
        let fp_a = RequestFingerprint::of(&req).unwrap();
        req.amount = Money::from_minor_units(2000, Currency::Egp).unwrap();
        let fp_b = RequestFingerprint::of(&req).unwrap();
        assert_ne!(fp_a, fp_b);
    }

    #[test]
    fn canonical_json_is_order_independent() {
        let a = serde_json::json!({"b": 2, "a": 1});
        let b = serde_json::json!({"a": 1, "b": 2});
        let fp_a = RequestFingerprint::of(&a).unwrap();
        let fp_b = RequestFingerprint::of(&b).unwrap();
        assert_eq!(fp_a, fp_b);
    }
}
