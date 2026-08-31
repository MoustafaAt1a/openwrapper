# Contributing / reporting feedback

OpenWrapper v0.1.0 exists to be tested by real people against real
Paymob/Fawry traffic so a well-informed v1.0.0 can follow. If you're
running this, the single most useful thing you can do is tell us what
broke, what surprised you, or what a live sandbox account revealed that
this project's research (see `research/paymob.md`, `research/fawry.md`)
guessed wrong.

## The two things we most need real feedback on

1. **The unverified provider details in `docs/LIMITATIONS.md`.** Nobody
   who built this had a Paymob or Fawry sandbox account. If you do and
   you hit a signature mismatch or a wrong endpoint, that's not a bug in
   the abstract — it's exactly the missing piece this project needs. See
   "Reporting a provider integration issue" below.
2. **Whether the architecture holds up under real traffic patterns.**
   Does the idempotency behavior match your expectations under real
   retries? Did `Unknown` resolve the way §13/`docs/STATE_MACHINE.md`
   claims it should? Did the background reconciler catch something a
   webhook missed, or vice versa?

## Reporting a bug

Please include:

- **The `X-Request-Id` response header value**, if you have it — every
  response carries one (`gateway/src/request_id.rs`), and it's the
  fastest way for anyone with server logs to find exactly what happened.
- Which provider (`paymob`/`fawry`), and whether you're on their sandbox
  or production credentials.
- The store backend (SQLite or Postgres) and whether you're running one
  gateway instance or several.
- What you expected vs. what happened. If a payment ended up in a state
  you didn't expect, include the `status` field from the response.

## Reporting a provider integration issue

If a Paymob or Fawry call fails in a way that looks like a wrong
endpoint or a signature mismatch:

1. Check `docs/LIMITATIONS.md` first — several specific details are
   already flagged as unverified guesses, most importantly Fawry's
   PayAtFawry charge-request signature field order.
2. For a Fawry signature issue, set `FAWRY_DEBUG_SIGNATURES=true` (see
   `docs/OPERATIONS.md`) and compare the logged non-secret inputs against
   Fawry's own Signature Tool
   (`developer.fawrystaging.com/public/signatureTool`).
3. For a Paymob endpoint issue, the two flagged endpoints
   (`PAYMOB_INQUIRY_PATH_TEMPLATE`, `PAYMOB_CHECKOUT_URL_TEMPLATE`) are
   configuration overrides specifically so you can fix it locally without
   waiting on a code change — please report back what the correct value
   turned out to be.
4. Open an issue with: which endpoint, what you sent (redact
   secrets/PII), what Paymob/Fawry's dashboard or support said the
   correct behavior is, and — if you have it — a link to the specific
   documentation page that confirms it. A confirmed correction here is
   the highest-value contribution this project can currently receive.

## Making a change

- Read `docs/ARCHITECTURE.md` first, specifically the invariants table
  (I1–I15). These are treated as laws, not style preferences.
- Run the full test suite before and after your change:
  ```bash
  cargo test --workspace
  cd sdk/typescript && npm test && cd ../..
  cd sdk/php && php tests/run.php && cd ../..
  ```
- If your change touches the store, also run the backend-specific
  integration tests (see `docs/OPERATIONS.md` for how to stand up a local
  Postgres/Valkey for this):
  ```bash
  OPENWRAPPER_TEST_DATABASE_URL=postgres://... cargo test -p openwrapper-gateway -- --ignored
  OPENWRAPPER_TEST_CACHE_URL=redis://... cargo test -p openwrapper-gateway -- --ignored
  ```
- New provider-specific behavior belongs in that provider's adapter
  crate, never in `core` — `tests/architecture` will fail the build if
  `core` gains a dependency on a provider crate.
- If you're changing a documented invariant or a signature/verification
  scheme, update the relevant doc in `docs/` in the same change. Code and
  docs drifting apart is exactly what `docs/LIMITATIONS.md` exists to
  prevent from being silent.
- New capabilities (refund, capture, authorize, a third provider) are
  genuinely welcome but are v1.0.0-scale changes, not small patches —
  open an issue to discuss the design (particularly the state-machine and
  capability-gating implications) before writing code.

## What "done" looks like for a change

Same bar as the rest of this project: it compiles, it has tests that
actually run (not just exist), and if it touches something uncertain, the
uncertainty is written down rather than asserted away. See
`docs/DECISIONS.md` for the format architectural decisions are recorded
in — new non-obvious choices should follow the same
Question/Evidence/Alternatives/Trade-offs/Decision/Consequence shape.
