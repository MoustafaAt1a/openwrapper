# Idempotency

Three separate boundaries, each with different identity and duplicate
semantics (§11). This document defines each; `gateway/src/store.rs` and
the provider adapters implement them.

## Boundary 1: client → OpenWrapper

- **Identity**: the client-supplied `Idempotency-Key` HTTP header
  (`core/src/ids.rs::IdempotencyKey` — validated: 1–200 bytes, printable
  ASCII, no quotes/whitespace).
- **Storage**: a `UNIQUE` column on the gateway's SQLite `payments` table.
  Not an in-memory map (§11 explicitly rules that out — it wouldn't
  survive a process restart) and not Redis/a distributed database (not
  needed at this scale — see `docs/DECISIONS.md`).
- **Lifetime**: indefinite in v0.1.0 — rows are never expired. A future
  version might add a retention window; not needed to prove the
  invariant.
- **Duplicate behavior**: same key + same request fingerprint (a SHA-256
  hash of the canonically-serialized request — `RequestFingerprint::of`)
  → the existing record is returned; the provider is **not** called
  again.
- **Payload mismatch behavior**: same key + different fingerprint → HTTP
  400, a deterministic rejection. Never a guess about which request was
  "really" meant.
- **Concurrency behavior**: the SQL `UNIQUE` constraint on
  `idempotency_key` is the entire mechanism. Under N concurrent callers
  with the same key, exactly one `INSERT` wins; the others observe a
  constraint violation and fall through to the mismatch/duplicate check.
  This is **tested against real concurrent OS threads** in
  `gateway/src/store.rs::tests::concurrent_identical_requests_only_one_proceeds`
  (8 threads, same key — asserts exactly 1 `Proceed`), not just
  reasoned about.
- **Failure behavior**: if the provider call itself fails, see
  `docs/STATE_MACHINE.md` — the stored record becomes `Failed` or
  `Unknown` depending on whether the failure is a definite non-occurrence,
  never left dangling as `Pending` forever.
- **Retry behavior**: a client retry (same key, same body) after a
  `Failed` or `Unknown` outcome returns that same outcome — it does
  **not** re-attempt the charge. This is invariant I6 made concrete:
  OpenWrapper never claims an operation is safely retryable unless it can
  prove it (here: because the store, not the provider, is what's being
  asked).

## Boundary 2: OpenWrapper → provider

- **Identity**: for Paymob, no explicit idempotency key is sent to the
  Intention API — Paymob's own documentation does not describe one for
  this endpoint (see `research/paymob.md`); OpenWrapper's own boundary-1
  protection is what prevents duplicate calls. For Fawry, `merchantRefNum`
  (derived from the OpenWrapper `PaymentId` assigned at boundary 1 — see
  `providers/fawry/src/client.rs::derive_merchant_ref_num`) is Fawry's own
  natural correlation key.
- **Failure behavior**: `create_payment`'s error is classified by
  `OpenWrapperError::is_definite_non_occurrence()` — see
  `docs/STATE_MACHINE.md`.
- **Retry behavior**: OpenWrapper v0.1.0 does **not** automatically retry
  a failed `create_payment` call at this boundary. A `Timeout`/`Network`
  failure here is surfaced as `Unknown` to the caller, who can retry the
  *boundary-1* request with the same `Idempotency-Key` — which will
  **not** re-invoke the provider while the record is `Unknown` (it
  returns the existing record). Actually resolving the ambiguity is
  `GET /v1/payments/:id`'s job (§13 reconciliation), not a blind retry.

## Boundary 3: provider → OpenWrapper webhook

- **Identity**: a provider-scoped `event_id` each adapter derives from
  something the provider itself treats as unique to *this delivery* —
  documented per adapter:
  - Paymob: `"paymob:{transaction_id}"` (`providers/paymob/src/webhook.rs`).
    Paymob's docs describe sending this callback only once per terminal
    outcome (success or decline) for a given transaction, so the
    transaction id itself is an adequate dedup key for v0.1.0's scope.
  - Fawry: `"fawry:{requestId}"`, using the notification's own
    "UUID generated Request id" field (`providers/fawry/src/webhook.rs`)
    — the field Fawry's documentation describes as unique per delivery,
    which is a stronger guarantee than reusing a payment-level reference.
- **Storage**: a `webhook_events` table keyed on `event_id` (`PRIMARY
  KEY`). A second delivery with the same `event_id` fails the `INSERT`
  and is treated as a known duplicate — acknowledged with HTTP 200,
  never reapplied.
- **Duplicate behavior**: see above — idempotent no-op, tested in
  `store.rs::tests::webhook_event_dedup_only_admits_first_delivery`.
- **Payload mismatch / consistency behavior**: before any transition is
  applied, the reported amount (when present) is cross-checked against
  the amount stored at payment creation (§12). A mismatch is logged at
  `ERROR` and the transition is **not** applied — tested in
  `store.rs::tests::webhook_transition_is_rejected_when_amount_does_not_match_stored_payment`.
- **Failure behavior**: an illegal state transition (e.g. a webhook
  claiming `Failed` for an already-`Succeeded` payment) is logged and
  rejected, never silently applied — tested in
  `store.rs::tests::illegal_transition_is_reported_not_silently_applied`.

## The required invariant, stated once

> same identity + same operation → same logical operation; same identity
> + different operation → deterministic rejection

This is enforced identically at boundaries 1 and 3 (both use a database
uniqueness constraint plus a fingerprint/amount comparison), and is not
applicable in the same form at boundary 2 (OpenWrapper is the caller
there, not the one being asked to deduplicate).
