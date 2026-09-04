//! Decimal-string helpers used to build and parse Fawry's `"X.YY"` amount
//! representation without ever going through `f64` (I4). Fawry's JSON
//! payloads carry amounts as numbers; this crate enables serde_json's
//! `arbitrary_precision` feature workspace-wide specifically so that
//! `serde_json::Number::to_string()` returns the exact original decimal
//! text Fawry sent, rather than a float-round-tripped approximation. That
//! matters here: reconstructing Fawry's own signature requires the exact
//! same string they hashed, and floats cannot guarantee that.

/// Formats minor units (integer) as Fawry's expected `"major.minor"`
/// 2-decimal-place string, e.g. 105050 -> "1050.50". Reuses the same
/// integer-only logic as `openwrapper_core::Money::major_units_display`.
pub fn minor_units_to_2dp(minor_units: i64) -> String {
    let major = minor_units / 100;
    let minor = minor_units % 100;
    format!("{major}.{minor:02}")
}

/// Parses a decimal string (as received from Fawry, e.g. `"1050.5"` or
/// `"1050.50"`) into integer minor units. Pure string/integer arithmetic —
/// no floating point. Returns `None` if the string isn't a plausible
/// non-negative decimal with at most 2 fractional digits.
pub fn decimal_str_to_minor_units(s: &str) -> Option<i64> {
    let s = s.trim();
    let (major, minor) = match s.split_once('.') {
        Some((m, f)) => (m, f),
        None => (s, ""),
    };
    if major.is_empty() || !major.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    if !minor.bytes().all(|b| b.is_ascii_digit()) || minor.len() > 2 {
        return None;
    }
    let major_val: i64 = major.parse().ok()?;
    let minor_val: i64 = match minor.len() {
        0 => 0,
        1 => minor.parse::<i64>().ok()? * 10,
        2 => minor.parse().ok()?,
        _ => return None,
    };
    major_val.checked_mul(100)?.checked_add(minor_val)
}

/// Renders a `serde_json::Value` that should represent a decimal amount
/// (either already a JSON string, or a JSON number under
/// `arbitrary_precision`, which preserves original digit text) as Fawry's
/// `"X.YY"` string, for use directly in signature reconstruction.
pub fn value_as_amount_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn minor_units_round_trip_through_2dp_string() {
        assert_eq!(minor_units_to_2dp(105050), "1050.50");
        assert_eq!(minor_units_to_2dp(5), "0.05");
        assert_eq!(decimal_str_to_minor_units("1050.50"), Some(105050));
        assert_eq!(decimal_str_to_minor_units("0.05"), Some(5));
    }

    #[test]
    fn single_fractional_digit_is_treated_as_tenths() {
        assert_eq!(decimal_str_to_minor_units("10.5"), Some(1050));
    }

    #[test]
    fn integer_only_string_has_zero_minor_units() {
        assert_eq!(decimal_str_to_minor_units("10"), Some(1000));
    }

    #[test]
    fn rejects_garbage() {
        assert_eq!(decimal_str_to_minor_units("abc"), None);
        assert_eq!(decimal_str_to_minor_units("10.555"), None);
        assert_eq!(decimal_str_to_minor_units(""), None);
    }
}
