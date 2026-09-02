//! Explicit identifier types. Every identifier in the system is its own
//! type rather than a bare `String`, per §7: "Use explicit types for ...
//! identifiers, provider references, ... idempotency keys." This makes it a
//! compile error to pass a `ProviderReference` where a `PaymentId` is
//! expected, which is exactly the class of bug that corrupts payment state
//! in ad-hoc string-typed systems.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

/// OpenWrapper's own identifier for a payment, independent of any provider.
/// A ULID: sortable by creation time, 128 bits of entropy, no coordination
/// required to generate. This is deliberately *not* the provider's own
/// order/transaction id — see `ProviderReference` for that.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub struct PaymentId(ulid::Ulid);

impl PaymentId {
    pub fn new() -> Self {
        Self(ulid::Ulid::new())
    }
}

impl Default for PaymentId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for PaymentId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for PaymentId {
    type Err = IdParseError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        ulid::Ulid::from_string(s)
            .map(Self)
            .map_err(|_| IdParseError::InvalidPaymentId)
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum IdParseError {
    #[error("invalid payment id")]
    InvalidPaymentId,
    #[error("invalid idempotency key: {0}")]
    InvalidIdempotencyKey(&'static str),
    #[error("invalid provider id: {0}")]
    InvalidProviderId(&'static str),
}

/// A client-supplied idempotency key identifying one logical operation at
/// the client → OpenWrapper boundary. See docs/IDEMPOTENCY.md boundary 1.
///
/// Validation is deliberately strict: idempotency keys travel as an HTTP
/// header (`Idempotency-Key`) and are used as a SQL uniqueness constraint,
/// so we bound their shape defensively rather than accept arbitrary bytes.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub struct IdempotencyKey(String);

impl IdempotencyKey {
    pub const MAX_LEN: usize = 200;

    pub fn parse(raw: &str) -> Result<Self, IdParseError> {
        if raw.is_empty() {
            return Err(IdParseError::InvalidIdempotencyKey("must not be empty"));
        }
        if raw.len() > Self::MAX_LEN {
            return Err(IdParseError::InvalidIdempotencyKey("exceeds max length"));
        }
        if !raw.bytes().all(|b| b.is_ascii_graphic() && b != b'"') {
            return Err(IdParseError::InvalidIdempotencyKey(
                "must be printable ASCII, no quotes or whitespace",
            ));
        }
        Ok(Self(raw.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for IdempotencyKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for IdempotencyKey {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = String::deserialize(deserializer)?;
        Self::parse(&raw).map_err(serde::de::Error::custom)
    }
}

/// A stable label for a provider adapter, e.g. `"paymob"` or `"fawry"`.
///
/// This is a validated string rather than a closed core-owned enum on
/// purpose: a closed enum would mean *adding a third provider requires
/// editing core*, which is exactly the coupling §5/§23 (I1) forbid. Each
/// provider crate exposes its own `const PROVIDER_ID: &str` and core only
/// ever treats the value as an opaque, comparable label.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize)]
pub struct ProviderId(String);

impl ProviderId {
    pub fn parse(raw: &str) -> Result<Self, IdParseError> {
        if raw.is_empty() || raw.len() > 64 {
            return Err(IdParseError::InvalidProviderId("must be 1..=64 bytes"));
        }
        if !raw
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
        {
            return Err(IdParseError::InvalidProviderId(
                "must be lowercase ascii, digits, or underscore",
            ));
        }
        Ok(Self(raw.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ProviderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for ProviderId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = String::deserialize(deserializer)?;
        Self::parse(&raw).map_err(serde::de::Error::custom)
    }
}

/// An opaque reference issued by a provider for a specific payment attempt
/// (Paymob's transaction/order id, Fawry's `referenceNumber`). OpenWrapper
/// treats this as OPAQUE data per docs/DATA_BOUNDARY.md: it is stored and
/// echoed back, never parsed or interpreted.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ProviderReference(String);

impl ProviderReference {
    pub fn new(raw: impl Into<String>) -> Self {
        Self(raw.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ProviderReference {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payment_id_round_trips_through_display_and_from_str() {
        let id = PaymentId::new();
        let s = id.to_string();
        let parsed: PaymentId = s.parse().unwrap();
        assert_eq!(id, parsed);
    }

    #[test]
    fn idempotency_key_rejects_whitespace_and_quotes() {
        assert!(IdempotencyKey::parse("has space").is_err());
        assert!(IdempotencyKey::parse("has\"quote").is_err());
        assert!(IdempotencyKey::parse("").is_err());
        assert!(IdempotencyKey::parse("order-42_ABC.v1").is_ok());
    }

    #[test]
    fn provider_id_is_lowercase_only() {
        assert!(ProviderId::parse("Paymob").is_err());
        assert!(ProviderId::parse("paymob").is_ok());
        assert!(ProviderId::parse("fawry").is_ok());
    }

    #[test]
    fn deserialization_cannot_bypass_validated_identifier_constructors() {
        assert!(serde_json::from_str::<IdempotencyKey>(r#""has space""#).is_err());
        assert!(serde_json::from_str::<ProviderId>(r#""Paymob""#).is_err());

        let key: IdempotencyKey = serde_json::from_str(r#""order-42""#).unwrap();
        let provider: ProviderId = serde_json::from_str(r#""paymob""#).unwrap();
        assert_eq!(key.as_str(), "order-42");
        assert_eq!(provider.as_str(), "paymob");
    }
}
