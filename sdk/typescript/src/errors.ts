/**
 * Typed exceptions mirroring `core::error::OpenWrapperError`'s stable
 * `code()` values (`gateway/src/wire.rs`'s `ErrorBody`). Switching on
 * `error.code` — or, more idiomatically in TS, on the exception's class —
 * is the supported way to branch on error category; `message` is
 * documentation-quality text for logs/humans, not a contract (§14).
 */

export interface ErrorBody {
  error: { code: string; message: string };
}

export abstract class OpenWrapperError extends Error {
  abstract readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = new.target.name;
    this.httpStatus = httpStatus;
  }
}

export class ValidationError extends OpenWrapperError {
  readonly code = "validation_error";
}
export class AuthenticationError extends OpenWrapperError {
  readonly code = "authentication_error";
}
export class AuthorizationError extends OpenWrapperError {
  readonly code = "authorization_error";
}
export class ConfigurationError extends OpenWrapperError {
  readonly code = "configuration_error";
}
export class NetworkError extends OpenWrapperError {
  readonly code = "network_error";
}
export class TimeoutError extends OpenWrapperError {
  readonly code = "timeout";
}
export class ProviderError extends OpenWrapperError {
  readonly code = "provider_error";
}
export class RateLimitError extends OpenWrapperError {
  readonly code = "rate_limit";
}
export class UnsupportedCapabilityError extends OpenWrapperError {
  readonly code = "unsupported_capability";
}
export class SecurityError extends OpenWrapperError {
  readonly code = "security_error";
}
export class InternalError extends OpenWrapperError {
  readonly code = "internal_error";
}
/** The HTTP layer never actually throws this one — an unknown-outcome
 * payment comes back as a normal `Payment` with `status: "unknown"` (see
 * types.ts), not an exception, because it isn't a failure of the API
 * call. Kept here only for completeness against the server's code list. */
export class UnknownOutcomeError extends OpenWrapperError {
  readonly code = "unknown_outcome";
}
/** A transport-level failure talking to the OpenWrapper gateway itself
 * (not a provider) — DNS, connection refused, etc. Distinct from the
 * server-attributed `NetworkError` above. */
export class GatewayUnreachableError extends OpenWrapperError {
  readonly code = "gateway_unreachable";
  constructor(message: string) {
    super(message, 0);
  }
}

const CODE_TO_CLASS: Record<string, new (message: string, httpStatus: number) => OpenWrapperError> = {
  validation_error: ValidationError,
  authentication_error: AuthenticationError,
  authorization_error: AuthorizationError,
  configuration_error: ConfigurationError,
  network_error: NetworkError,
  timeout: TimeoutError,
  provider_error: ProviderError,
  rate_limit: RateLimitError,
  unsupported_capability: UnsupportedCapabilityError,
  security_error: SecurityError,
  internal_error: InternalError,
  unknown_outcome: UnknownOutcomeError,
};

export function errorFromBody(body: ErrorBody, httpStatus: number): OpenWrapperError {
  const ctor = CODE_TO_CLASS[body.error.code] ?? InternalError;
  return new ctor(body.error.message, httpStatus);
}
