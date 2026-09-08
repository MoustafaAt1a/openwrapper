# Error model

`openwrapper_core::error::OpenWrapperError` (§14). Variants mapped to HTTP statuses
by the gateway (`apps/gateway/src/handlers.rs::ApiError`) and to typed
exceptions/classes across TypeScript, PHP, and .NET SDKs:

| Variant | Meaning | HTTP | TS class | PHP class | .NET class |
|---|---|---|---|---|---|
| `Validation` | caller input was structurally/semantically invalid | 400 | `ValidationError` | `ValidationException` | `ValidationException` |
| `Authentication` | OpenWrapper's own provider credentials were rejected | 401 | `AuthenticationError` | `AuthenticationException` | `AuthenticationException` |
| `Authorization` | caller not authorized for the operation | 403 | `AuthorizationError` | `AuthorizationException` | `AuthorizationException` |
| `IdempotencyConflict` | idempotency key reused with mismatched request payload | 409 | `IdempotencyConflictError` | `IdempotencyConflictException` | `IdempotencyConflictException` |
| `Configuration` | OpenWrapper/adapter misconfigured | 500 | `ConfigurationError` | `ConfigurationException` | `ConfigurationException` |
| `Network` | transport failure reaching the provider | 502 | `NetworkError` | `NetworkException` | `NetworkException` |
| `Timeout` | provider call exceeded its deadline | 504 | `TimeoutError` | `TimeoutException` | `TimeoutException` |
| `Provider` | provider reached, responded with an error | 502 | `ProviderError` | `ProviderException` | `ProviderException` |
| `RateLimit` | provider rate-limited the request | 429 | `RateLimitError` | `RateLimitException` | `RateLimitException` |
| `UnsupportedCapability` | requested operation isn't implemented for that provider | 400 | `UnsupportedCapabilityError` | `UnsupportedCapabilityException` | `UnsupportedCapabilityException` |
| `Security` | a security boundary failed or couldn't be verified | 401 | `SecurityError` | `SecurityException` | `SecurityException` |
| `UnknownOutcome` | (reserved; the gateway represents this as a normal `Payment` with `status: "unknown"`, not a thrown error — see below) | 200 | `UnknownOutcomeError` | `UnknownOutcomeException` | `UnknownOutcomeException` |
| `Internal` | a defect inside OpenWrapper itself | 500 | `InternalError` | `InternalException` | `InternalException` |

## Why `UnknownOutcome` is barely used as an *error*

It exists in the error enum per §14's list, but in practice an
ambiguous create-payment result is surfaced to callers as a **successful**
HTTP response containing a `Payment` with `status: "unknown"` — not as a
thrown exception — because it isn't a failure of the API call itself; see
`docs/STATE_MACHINE.md`. The SDKs document this explicitly so a caller
doesn't write a `try/catch` around the one outcome that most needs
calm, ordinary handling.

Missing stateless provider credentials are represented internally as a
`Validation` error but mapped by the gateway to HTTP 422 with code
`missing_provider_credentials`.

## Two machine-readable decision helpers

`OpenWrapperError::code()` gives every variant a stable string
(`"validation_error"`, `"timeout"`, ...) — this is what SDKs switch on,
not `Display` text, which is documentation-quality and free to reword.

`OpenWrapperError::is_definite_non_occurrence()` answers "did the
provider definitely never process this?" — the concrete Failed-vs-Unknown
decision behind invariant I5. See `docs/STATE_MACHINE.md`.

## No secrets in errors (I8)

Every `Provider`-variant error truncates provider response bodies to 500
characters (`crates/providers/paymob/src/client.rs::truncate_for_diagnostics`)
and no error variant's `Display` implementation ever touches a
`secrecy::Secret` — checked structurally by
`tests/architecture::secret_exposure_is_confined_to_known_call_sites`,
which asserts `expose_secret()` is called only from the small allowlisted
set of files that build outgoing auth headers/signatures.

## No uncontrolled panics on recoverable external failure

Every provider HTTP call result is matched explicitly and converted to an
`OpenWrapperError` variant (`map_reqwest_err` in each provider's
`client.rs`); no `.unwrap()`/`.expect()` sits between a network call and
its result. This is covered by unit tests, integration tests, and architecture
invariant checks across all provider crates.
