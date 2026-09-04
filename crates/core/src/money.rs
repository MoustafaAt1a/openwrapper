//! Monetary amounts.
//!
//! Invariant I4: financial amounts never use floating point. `Money` stores
//! an integer count of the currency's minor unit (piasters for EGP) and
//! forbids constructing an amount without going through validation.
//!
//! Scope note: OpenWrapper v0.1.0 targets Egypt only (see product scope).
//! `Currency` is intentionally a closed, single-variant enum rather than a
//! general ISO-4217 table — extending it is a deliberate, reviewed decision
//! (add a variant + its minor-unit exponent), not silent scope creep. This
//! satisfies "every type must protect an invariant": the invariant here is
//! "amount and currency are validated together, so a provider adapter can
//! never receive an amount without knowing how to interpret it."

use serde::{Deserialize, Serialize};
use std::fmt;

/// Currencies OpenWrapper v0.1.0 understands. Both Paymob and Fawry are
/// integrated in EGP for this release; see docs/LIMITATIONS.md.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Currency {
    #[serde(rename = "EGP", alias = "Egp")]
    Egp,
}

impl Currency {
    /// Number of digits after the decimal point in the currency's major
    /// unit. EGP has 100 piasters per pound, i.e. exponent 2.
    pub const fn minor_unit_exponent(self) -> u32 {
        match self {
            Currency::Egp => 2,
        }
    }

    /// ISO 4217 alphabetic code, as required verbatim by both providers.
    pub const fn code(self) -> &'static str {
        match self {
            Currency::Egp => "EGP",
        }
    }

    pub fn parse(code: &str) -> Result<Self, CurrencyError> {
        match code.trim().to_ascii_uppercase().as_str() {
            "EGP" => Ok(Currency::Egp),
            other => Err(CurrencyError::Unsupported(other.to_string())),
        }
    }
}

impl fmt::Display for Currency {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum CurrencyError {
    #[error("unsupported currency: {0}")]
    Unsupported(String),
}

/// A non-negative monetary amount in a specific currency's minor unit.
///
/// Deliberately has **no** `f64` conversion anywhere in its public API.
/// `major_units_display` exists only for human-readable output and does
/// integer division/remainder, never float arithmetic.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
pub struct Money {
    minor_units: i64,
    currency: Currency,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum MoneyError {
    #[error("amount must be greater than zero, got {0}")]
    NotPositive(i64),
    #[error("amount {0} exceeds the maximum OpenWrapper will process ({1})")]
    TooLarge(i64, i64),
}

impl Money {
    /// OpenWrapper refuses to construct an amount above this many minor
    /// units (10,000,000.00 EGP) as a defensive bound against integer
    /// overflow and fat-fingered requests. Not a business limit — providers
    /// enforce their own real limits; this is a sanity ceiling only.
    pub const MAX_MINOR_UNITS: i64 = 1_000_000_000;

    pub fn from_minor_units(minor_units: i64, currency: Currency) -> Result<Self, MoneyError> {
        if minor_units <= 0 {
            return Err(MoneyError::NotPositive(minor_units));
        }
        if minor_units > Self::MAX_MINOR_UNITS {
            return Err(MoneyError::TooLarge(minor_units, Self::MAX_MINOR_UNITS));
        }
        Ok(Self {
            minor_units,
            currency,
        })
    }

    pub const fn minor_units(&self) -> i64 {
        self.minor_units
    }

    pub const fn currency(&self) -> Currency {
        self.currency
    }

    /// Human-readable "major.minor" string for logs/UI, e.g. "125.50".
    /// Integer-only arithmetic — never touches `f64`.
    pub fn major_units_display(&self) -> String {
        let exp = self.currency.minor_unit_exponent();
        let divisor = 10i64.pow(exp);
        let major = self.minor_units / divisor;
        let minor = self.minor_units % divisor;
        format!("{major}.{minor:0width$}", width = exp as usize)
    }

    /// Checked monetary addition. Ensures both amounts share the same
    /// currency, sum does not overflow `i64`, and does not exceed `MAX_MINOR_UNITS`.
    pub fn checked_add(&self, other: Self) -> Option<Self> {
        if self.currency != other.currency {
            return None;
        }
        let sum = self.minor_units.checked_add(other.minor_units)?;
        Self::from_minor_units(sum, self.currency).ok()
    }

    /// Checked monetary subtraction. Returns `None` if currencies differ or
    /// if the result would be zero or negative.
    pub fn checked_sub(&self, other: Self) -> Option<Self> {
        if self.currency != other.currency {
            return None;
        }
        let diff = self.minor_units.checked_sub(other.minor_units)?;
        Self::from_minor_units(diff, self.currency).ok()
    }

    /// Checked scalar multiplication (e.g. quantity * unit price).
    pub fn checked_mul_scalar(&self, factor: i64) -> Option<Self> {
        if factor <= 0 {
            return None;
        }
        let product = self.minor_units.checked_mul(factor)?;
        Self::from_minor_units(product, self.currency).ok()
    }

    /// Calculates basis points (1 bps = 0.01% = 1/10000) using integer arithmetic.
    /// Returns `None` on overflow or if the resulting amount is non-positive.
    pub fn checked_mul_bps(&self, bps: u32) -> Option<Self> {
        let minor_i128 = self.minor_units as i128;
        let product = minor_i128.checked_mul(bps as i128)?;
        let fee = (product / 10_000) as i64;
        Self::from_minor_units(fee, self.currency).ok()
    }

    /// Splits a monetary amount into `n` parts using Euclidean remainder
    /// distribution so that the sum of all parts is strictly equal to the
    /// original amount (conservation of every minor unit).
    ///
    /// The first `A % n` parts receive `A / n + 1` minor units; the rest receive `A / n`.
    pub fn split_into(&self, n: usize) -> Result<Vec<Self>, MoneyError> {
        if n == 0 || (n as i64) > self.minor_units {
            return Err(MoneyError::NotPositive(0));
        }
        let n_i64 = n as i64;
        let quotient = self.minor_units / n_i64;
        let remainder = (self.minor_units % n_i64) as usize;

        let mut parts = Vec::with_capacity(n);
        for i in 0..n {
            let amount = if i < remainder {
                quotient + 1
            } else {
                quotient
            };
            parts.push(Self::from_minor_units(amount, self.currency)?);
        }
        Ok(parts)
    }
}

impl fmt::Display for Money {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}", self.major_units_display(), self.currency)
    }
}

impl<'de> Deserialize<'de> for Money {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct MoneyFields {
            minor_units: i64,
            currency: Currency,
        }

        let fields = MoneyFields::deserialize(deserializer)?;
        Self::from_minor_units(fields.minor_units, fields.currency)
            .map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_zero_and_negative() {
        assert!(Money::from_minor_units(0, Currency::Egp).is_err());
        assert!(Money::from_minor_units(-1, Currency::Egp).is_err());
    }

    #[test]
    fn rejects_absurdly_large_amounts() {
        assert!(Money::from_minor_units(Money::MAX_MINOR_UNITS + 1, Currency::Egp).is_err());
    }

    #[test]
    fn display_never_uses_floating_point_and_is_exact() {
        let m = Money::from_minor_units(100_055, Currency::Egp).unwrap();
        assert_eq!(m.major_units_display(), "1000.55");
        let m2 = Money::from_minor_units(5, Currency::Egp).unwrap();
        assert_eq!(m2.major_units_display(), "0.05");
    }

    #[test]
    fn currency_parse_is_case_insensitive_and_closed() {
        assert_eq!(Currency::parse("egp").unwrap(), Currency::Egp);
        assert!(Currency::parse("USD").is_err());
    }

    #[test]
    fn checked_arithmetic_works_and_enforces_invariants() {
        let m1 = Money::from_minor_units(1000, Currency::Egp).unwrap();
        let m2 = Money::from_minor_units(500, Currency::Egp).unwrap();
        let sum = m1.checked_add(m2).unwrap();
        assert_eq!(sum.minor_units(), 1500);

        let diff = m1.checked_sub(m2).unwrap();
        assert_eq!(diff.minor_units(), 500);

        assert!(
            m2.checked_sub(m1).is_none(),
            "cannot produce zero or negative amount"
        );

        let mult = m2.checked_mul_scalar(3).unwrap();
        assert_eq!(mult.minor_units(), 1500);
        assert!(m2.checked_mul_scalar(0).is_none());
        assert!(m2.checked_mul_scalar(-1).is_none());
    }

    #[test]
    fn deserialization_cannot_construct_an_invalid_amount() {
        assert!(serde_json::from_str::<Money>(r#"{"minor_units":0,"currency":"Egp"}"#).is_err());
        assert!(
            serde_json::from_str::<Money>(r#"{"minor_units":1000000001,"currency":"Egp"}"#)
                .is_err()
        );

        let amount: Money =
            serde_json::from_str(r#"{"minor_units":1050,"currency":"Egp"}"#).unwrap();
        assert_eq!(amount.minor_units(), 1050);

        let uppercase: Money =
            serde_json::from_str(r#"{"minor_units":2000,"currency":"EGP"}"#).unwrap();
        assert_eq!(uppercase.minor_units(), 2000);
        let serialized = serde_json::to_string(&uppercase).unwrap();
        assert!(serialized.contains(r#""currency":"EGP""#));
    }

    #[test]
    fn basis_points_and_split_arithmetic() {
        let m = Money::from_minor_units(10_000, Currency::Egp).unwrap(); // 100.00 EGP
                                                                         // 250 bps = 2.50% = 250 piasters = 2.50 EGP
        let fee = m.checked_mul_bps(250).unwrap();
        assert_eq!(fee.minor_units(), 250);

        // 0 bps produces 0 minor units, which is rejected by Money (> 0)
        assert!(m.checked_mul_bps(0).is_none());

        // Split 100 piasters into 3 parts: 34 + 33 + 33 = 100 exactly
        let hundred = Money::from_minor_units(100, Currency::Egp).unwrap();
        let parts = hundred.split_into(3).unwrap();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0].minor_units(), 34);
        assert_eq!(parts[1].minor_units(), 33);
        assert_eq!(parts[2].minor_units(), 33);
        let sum: i64 = parts.iter().map(|p| p.minor_units()).sum();
        assert_eq!(sum, 100);

        // Splitting into 0 or more than total minor units fails gracefully
        assert!(hundred.split_into(0).is_err());
        assert!(hundred.split_into(101).is_err());
    }
}
