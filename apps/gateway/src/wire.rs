//! JSON request/response shapes for the HTTP boundary. Deliberately
//! separate from `openwrapper_core`'s domain types: the wire format is a
//! public contract (§27) that should be free to evolve its serialization
//! details independently of the domain model's Rust representation.

use openwrapper_core::{Payment, PaymentNextAction, PaymentResult, PaymentStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreatePaymentBody {
    pub provider: String,
    pub amount_minor_units: i64,
    pub currency: String,
    pub customer: CustomerBody,
    pub merchant_reference: Option<String>,
    pub description: Option<String>,
    pub return_url: Option<String>,
    #[serde(default, deserialize_with = "deserialize_metadata_flexible")]
    pub metadata: std::collections::BTreeMap<String, String>,
}

fn deserialize_metadata_flexible<'de, D>(
    deserializer: D,
) -> Result<std::collections::BTreeMap<String, String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct MetadataVisitor;

    impl<'de> serde::de::Visitor<'de> for MetadataVisitor {
        type Value = std::collections::BTreeMap<String, String>;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a map of string metadata or an empty array")
        }

        fn visit_map<M>(self, mut access: M) -> Result<Self::Value, M::Error>
        where
            M: serde::de::MapAccess<'de>,
        {
            let mut map = std::collections::BTreeMap::new();
            while let Some((key, value)) = access.next_entry()? {
                map.insert(key, value);
            }
            Ok(map)
        }

        fn visit_seq<S>(self, mut access: S) -> Result<Self::Value, S::Error>
        where
            S: serde::de::SeqAccess<'de>,
        {
            let map = std::collections::BTreeMap::new();
            if access.next_element::<serde::de::IgnoredAny>()?.is_none() {
                Ok(map)
            } else {
                Err(serde::de::Error::custom("metadata list must be empty"))
            }
        }
    }

    deserializer.deserialize_any(MetadataVisitor)
}

#[derive(Debug, Deserialize)]
pub struct CustomerBody {
    pub phone: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaymentView {
    pub payment_id: String,
    pub provider: String,
    pub provider_reference: Option<String>,
    pub status: PaymentStatus,
    pub amount_minor_units: i64,
    pub currency: String,
    pub merchant_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_action: Option<PaymentNextAction>,
}

impl From<&Payment> for PaymentView {
    fn from(p: &Payment) -> Self {
        Self {
            payment_id: p.id.to_string(),
            provider: p.provider.to_string(),
            provider_reference: p.provider_reference.as_ref().map(|r| r.to_string()),
            status: p.status,
            amount_minor_units: p.amount.minor_units(),
            currency: p.currency.code().to_string(),
            merchant_reference: p.merchant_reference.clone(),
            next_action: None,
        }
    }
}

impl PaymentView {
    pub fn from_fresh(
        payment_id: &openwrapper_core::PaymentId,
        result: &PaymentResult,
        merchant_reference: Option<String>,
    ) -> Self {
        Self {
            payment_id: payment_id.to_string(),
            provider: result.provider.to_string(),
            provider_reference: Some(result.provider_reference.to_string()),
            status: result.status.into(),
            amount_minor_units: result.amount.minor_units(),
            currency: result.amount.currency().code().to_string(),
            merchant_reference,
            next_action: result.next_action.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub error: ErrorDetail,
}

#[derive(Debug, Serialize)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
}

impl From<&openwrapper_core::OpenWrapperError> for ErrorBody {
    fn from(e: &openwrapper_core::OpenWrapperError) -> Self {
        Self {
            error: ErrorDetail {
                code: e.code().to_string(),
                // `Display` on OpenWrapperError is documentation-quality
                // text (§14: "errors must be deterministic and
                // documented") and by construction never includes secret
                // material (I8) — see docs/ERROR_MODEL.md.
                message: e.to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_payment_body_deserializes_metadata_map_and_empty_list() {
        let json_map = r#"{
            "provider": "paymob",
            "amount_minor_units": 1000,
            "currency": "EGP",
            "customer": { "phone": "+2010" },
            "metadata": { "order_id": "123" }
        }"#;
        let parsed: CreatePaymentBody = serde_json::from_str(json_map).unwrap();
        assert_eq!(parsed.metadata.get("order_id").unwrap(), "123");

        let json_empty_list = r#"{
            "provider": "paymob",
            "amount_minor_units": 1000,
            "currency": "EGP",
            "customer": { "phone": "+2010" },
            "metadata": []
        }"#;
        let parsed_empty: CreatePaymentBody = serde_json::from_str(json_empty_list).unwrap();
        assert!(parsed_empty.metadata.is_empty());

        let json_omitted = r#"{
            "provider": "paymob",
            "amount_minor_units": 1000,
            "currency": "EGP",
            "customer": { "phone": "+2010" }
        }"#;
        let parsed_omitted: CreatePaymentBody = serde_json::from_str(json_omitted).unwrap();
        assert!(parsed_omitted.metadata.is_empty());
    }
}
