# Fawry — research notes

Primary source: `developer.fawrystaging.com` (Fawry's official developer
portal). Fetched and cross-checked during this project on 2026-08-27.

## Confirmed with high confidence (directly fetched)

### Server Notification V2 (webhook) signature

Source: `developer.fawrystaging.com/docs/payment-notifications/payment-notifications/server-notification-v2`,
fetched directly. The documented signature formula:

```
messageSignature = SHA256(
    fawryRefNumber + merchantRefNumber +
    paymentAmount(2dp) + orderAmount(2dp) +
    orderStatus + paymentMethod +
    paymentReferenceNumber (empty if not present) +
    secureKey
)
```

The field named "Payment reference number" in the formula description
corresponds to the payload's `paymentRefrenceNumber` field — note Fawry's
own documented field name has a typo ("Refrence" not "Reference"), which
`providers/fawry/src/webhook.rs` preserves verbatim when reading the
field, since matching the provider's actual wire format matters more than
correcting their spelling.

Documented `orderStatus` enum values: `NEW`, `PAID`, `CANCELED`,
`REFUNDED`, `EXPIRED`, `PARTIAL_REFUNDED`, `FAILED` — mapped in
`providers/fawry/src/status.rs`.

Implemented in `providers/fawry/src/signature.rs::webhook_signature` and
verified in `providers/fawry/src/webhook.rs::verify_and_parse`, including
a test that deliberately builds the notification body as literal JSON
*text* (not a `serde_json::Value` constructed from a Rust `f64` literal)
because the first attempt at this test failed for exactly the float-vs-
exact-decimal-text reason `docs/DECISIONS.md` D8 describes.

### Get Payment Status V2 signature

`GET /ECommerceWeb/Fawry/payments/status/v2` with query parameters
`merchantCode`, `merchantRefNumber`, `signature`, where:

```
signature = SHA256(merchantCode + merchantRefNumber + secureKey)
```

Implemented in `providers/fawry/src/signature.rs::status_v2_signature`.

## Reconstructed with lower confidence (flagged — see docs/LIMITATIONS.md)

### PayAtFawry charge-creation signature

Source: a "create-payment-refno-apis" documentation page containing a
PHP code sample. The fetched/search-result excerpt showed the
concatenation beginning `$merchantCode . $merchantRefNum .
$merchant_cust_prof_id . $payment_method .` but the remaining lines
(presumably `. $amount . $secureKey`) were truncated in every attempt to
retrieve this page during this project.

`providers/fawry/src/signature.rs::charge_signature` implements:

```
signature = SHA256(merchantCode + merchantRefNum + customerProfileId +
                    paymentMethod + amount(2dp) + secureKey)
```

extrapolating the trailing `amount + secureKey` from the pattern common
to Fawry's other signed endpoints (both confirmed formulas above end
with an amount-or-nothing followed immediately by `secureKey`). **This is
the single highest-confidence-risk detail in this codebase** — see
`docs/LIMITATIONS.md`. Confirm via Fawry's own Signature Tool
(`developer.fawrystaging.com/public/signatureTool`) or a live sandbox
call before any production charge attempt.

### Notification delivery `Content-Type`

Not confirmed by a captured real HTTP delivery. Assumed JSON, consistent
with the documented field table containing nested objects
(`threeDSInfo`, `invoiceInfo`, `orderItems`) that are naturally
JSON-shaped rather than flat form fields.

### Hostnames

Staging: `atfawry.fawrystaging.com` (confirmed, appears throughout the
fetched documentation and in the endpoint URLs above). Production
hostname: not defaulted in `providers/fawry/src/config.rs` — Fawry
assigns/confirms this during merchant onboarding, and this project had no
onboarding relationship to confirm it against.
