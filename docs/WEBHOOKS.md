# Webhooks

The pipeline §12 asks for, as actually implemented
(`gateway/src/handlers.rs::webhook` + each provider's `verify_and_parse_webhook`):

```
Raw request (bytes, headers, query params)
    |
Authenticate / verify   <-- Provider::verify_and_parse_webhook.
    |                        Cannot be skipped: there is no way to obtain
    |                        a WebhookEvent without this call succeeding
    |                        first (I7 — see core/src/provider.rs).
Validate payload shape
    |
Identify event           <-- event_id, derived per-provider (see
    |                        docs/IDEMPOTENCY.md boundary 3)
Deduplicate               <-- webhook_events table, PRIMARY KEY(event_id)
    |
Map provider event        <-- into the neutral WebhookEvent /
    |                        PaymentStatus
Validate state transition <-- PaymentStatus::validate_transition,
    |                        + amount/currency consistency check
Update payment state
```

## Never mutate state from an unauthenticated webhook

This is structural, not just a code-review rule: `WebhookEvent` has no
public constructor outside `verify_and_parse_webhook`, and that function
performs signature verification as its first action, returning an `Err`
before touching anything else if verification fails. The gateway's
handler never calls the store until it holds a `WebhookEvent` — there is
no code path where store mutation and unverified data coexist.

## Signature verification, concretely

- **Paymob**: HMAC-SHA512 over 20 named fields from the transaction
  object, in a fixed documented order, compared against a `hmac` query
  parameter using constant-time comparison (`subtle::ConstantTimeEq`).
  Field order and stringification rules are cited in `research/paymob.md`
  and pinned by a test built from a self-constructed (not
  externally-unverifiable) fixture — see the honesty note in
  `providers/paymob/src/signature.rs`'s test module about why that test
  doesn't claim to reproduce Paymob's own published numbers verbatim.
- **Fawry**: SHA-256 over `fawryRefNumber + merchantRefNumber +
  paymentAmount(2dp) + orderAmount(2dp) + orderStatus + paymentMethod +
  paymentReferenceNumber (empty if absent) + secureKey`, compared against
  the payload's `messageSignature` field, also constant-time. This
  concatenation order is quoted directly from Fawry's Server Notification
  V2 documentation (`research/fawry.md`) — the one signature scheme in
  this project fetched and confirmed with full confidence, unlike the
  PayAtFawry charge-request signature (see `docs/LIMITATIONS.md`).
- **Stripe**: HMAC-SHA256 over `${timestamp}.${raw_body}` using the webhook signing
  secret (`whsec_...`), compared against signatures in the `Stripe-Signature`
  header using constant-time comparison (`hmac::Mac::verify_slice`). Supports
  rolling keys (multiple `v1` signatures). The timestamp `t=` is extracted and
  verified against current system time within a configurable tolerance window
  (`webhook_tolerance_secs`, default 300s).

All adapters enable `serde_json`'s `arbitrary_precision` feature
specifically so that a provider's decimal amount text (e.g. `"100.00"`)
round-trips through JSON parsing exactly, rather than being silently
reformatted by a float — see `providers/fawry/src/decimal.rs` for why this
matters and a test (`webhook.rs::tests`) that was written, failed on the
first attempt for exactly this reason, and was fixed rather than loosened.

## Replay protection

For Paymob and Fawry, replay protection is the deduplication step above (a replayed
*genuine* delivery is a no-op) plus TLS in transit. Neither provider's fetched
documentation described a timestamp field in their webhook payloads.

For **Stripe**, OpenWrapper implements **both**:
1. Database deduplication via `webhook_events (PRIMARY KEY(event_id))`
2. Cryptographic timestamp verification on the `Stripe-Signature` header (`t=...`)
   enforcing a configurable replay tolerance window (`webhook_tolerance_secs`,
   default 300s / 5 minutes). Webhooks with timestamps outside this tolerance
   window are rejected outright before database mutation.

## Amount/currency consistency

Where a webhook payload reports an amount (all three providers' payloads used
here do), it's compared against the amount stored when the payment was
created, before the transition is applied
(`store.rs::apply_webhook_transition`). A mismatch is logged at `ERROR`
and rejected outright — this is one of the "dangerous scenarios" §25
calls out explicitly, and it's covered by
`webhook_transition_is_rejected_when_amount_does_not_match_stored_payment`.

## Never trust browser redirects as proof of final state

`return_url`/`redirection_url` (where the customer's browser lands after
a Paymob checkout) is never treated as a payment-state signal anywhere in
this codebase — it's forwarded to the provider as configuration and never
read back by OpenWrapper at all. Only the authenticated webhook (or an
explicit `GET /v1/payments/:id` reconciliation call) can move a payment
out of `Pending`/`Unknown`.
