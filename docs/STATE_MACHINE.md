# Payment state machine

## The states

Pending is the starting state. From there, an authoritative provider
signal moves it to Succeeded or Failed, or an ambiguous outcome moves it
to Unknown. From Unknown, only an authoritative resolution can move it to
Succeeded or Failed — never back to Pending, and never automatically to
Failed. From Succeeded, refunds can occur, transitioning the payment to
PartiallyRefunded (when remaining balance > 0) or Refunded (when fully refunded).
The only legal transition out of Failed or Refunded is to itself (an idempotent
re-observation, e.g. a duplicate webhook).

Legal transitions (`crates/core/src/payment.rs::PaymentStatus::validate_transition`):

| From | To | Legal? |
|---|---|---|
| Pending | Succeeded / Failed / Unknown | yes — first resolution |
| Unknown | Succeeded / Failed | yes — reconciliation resolving ambiguity |
| Unknown | Unknown | yes, no-op — still ambiguous |
| Succeeded | Succeeded | yes, no-op — duplicate webhook re-observing the same fact |
| Succeeded | PartiallyRefunded / Refunded | yes — partial or full refund applied |
| PartiallyRefunded | PartiallyRefunded / Refunded | yes — additional partial refund or full refund completion |
| Failed | Failed | yes, no-op — duplicate failure signal |
| Refunded | Refunded | yes, no-op — duplicate refund signal |
| Succeeded → Failed, Failed → Succeeded, terminal → Unknown | **no** |

Every "no" case is rejected outright, not silently applied — see
`apps/gateway/src/store/mod.rs::TransitionOutcome::Illegal` and each backend's
`apply_webhook_transition` implementation,
which is logged and does **not** mutate the stored row.

## Why these states, no more

The design brief asked to "investigate the necessity" of every domain
type. States considered and rejected: a separate `Authorizing`/`Capturing` pair
(neither Paymob's Intention flow nor Fawry's PayAtFawry flow expose a distinct,
actionable intermediate state beyond "pending" without capture).
Refunds and partial reversals were introduced in v0.2.0 and hardened in v0.2.7 (`PartiallyRefunded` and
`Refunded`). Once terminal `Refunded` is reached, it is non-revertible. A
`PartiallyRefunded` state can transition further to `Refunded` or remain partially
reversed. Add a state only when a real, observed domain behavior
requires it, not speculatively.

## The critical invariant (I5)

**A timeout or other ambiguous external result must never automatically
become `Failed`.** Concretely:

```
OpenWrapper -> Paymob: create payment
                    |
              (request times out --
               did Paymob receive it
               or not? We don't know.)
                    |
             status becomes Unknown,
             never Failed
```

This was **live-verified**, not just unit-tested: in this sandbox,
outbound network access to `accept.paymob.com` is blocked by the
container's firewall (it's not on the allowed-domains list). A real
`POST /v1/payments` call against the running gateway therefore produced a
genuine network failure calling Paymob, and the resulting payment record
came back with `"status": "unknown"` and HTTP 200 — not `"failed"` and not
a 5xx error. See `docs/LIMITATIONS.md` for the exact transcript.

The mechanism: `OpenWrapperError::is_definite_non_occurrence()`
(`crates/core/src/error.rs`) classifies every error a `create_payment` call can
return into "definitely never reached the provider" (safe to mark
`Failed` — bad input, bad credentials, an explicit capability/rate-limit
refusal) versus "ambiguous" (`Timeout`, `Network`, and — deliberately —
`Provider`, since a provider 5xx does not rule out the provider having
durably recorded the attempt on its own side). The gateway's handler
(`apps/gateway/src/handlers.rs::create_payment`) branches on this classification
directly.

## Resolving `Unknown` (§13)

`GET /v1/payments/:id` actively attempts reconciliation when a payment is
`Unknown` and the provider supports `InquireStatus`: it calls
`Provider::inquire_status` with the stored `provider_reference` and, if
that returns a non-`Unknown` result, applies it as a legal
`Unknown -> {Succeeded,Failed}` transition. This is the "minimal provider
inquiry operation" §13 asks for — not a reconciliation platform. If the
inquiry itself fails or the provider has no `InquireStatus` capability,
the record simply stays `Unknown` for the next `GET`.

What happens with `Provider = SUCCESS, OpenWrapper = UNKNOWN`: the next
`GET` (or the next webhook delivery) resolves it to `Succeeded` via the
transition above — no double charge occurs because idempotency boundary 1
(see `docs/IDEMPOTENCY.md`) means a client retry with the same
`Idempotency-Key` never re-invokes `create_payment` while status is
`Unknown`; it gets back the existing `Unknown` record instead.

What happens with `Provider = UNKNOWN, OpenWrapper = UNKNOWN` (the
provider's own inquiry endpoint can't yet resolve it either): the record
stays `Unknown`. The bounded background reconciler retries stale records
at `OPENWRAPPER_RECONCILIATION_INTERVAL_SECS`; polling `GET` also attempts
an immediate resolution. Neither path blindly repeats payment creation.
