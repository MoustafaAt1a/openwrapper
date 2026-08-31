import type { CreatePaymentParams, Payment, PaymentNextAction, PaymentStatus } from "./types.js";
import { errorFromBody, GatewayUnreachableError, type ErrorBody } from "./errors.js";

export interface OpenWrapperClientOptions {
  /** Base URL of the OpenWrapper gateway, e.g. `"https://pay.example.com"`. */
  baseUrl: string;
  /** API key for authenticating with the OpenWrapper gateway. */
  apiKey?: string | undefined;
  /** Maximum retry attempts for transient network errors on safe/idempotent requests (default 0). */
  maxRetries?: number | undefined;
  /** Base retry delay in milliseconds for exponential backoff (default 200ms). */
  retryDelayMs?: number | undefined;
  /** Override for testing; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Request timeout in milliseconds. Default 30s, matching the
   * gateway's own `TimeoutLayer`. */
  timeoutMs?: number;
}

export interface CreatePaymentOptions {
  /**
   * Uniquely identifies this logical create-payment operation for
   * OpenWrapper's idempotency contract (§11 in the project spec — see
   * docs/IDEMPOTENCY.md). If omitted, the SDK generates a fresh one via
   * `crypto.randomUUID()`, which is safe for a single call but does
   * **not** protect you across separate retries from a new process (e.g.
   * a queue worker retrying a failed job) — pass your own stable key
   * (such as your own order id) when you need that.
   */
  idempotencyKey?: string | undefined;
}

/** Wire (snake_case) shape returned by the gateway — internal only. */
interface WirePaymentView {
  payment_id: string;
  provider: string;
  provider_reference: string | null;
  status: PaymentStatus;
  amount_minor_units: number;
  currency: string;
  merchant_reference: string | null;
  next_action?: PaymentNextAction;
}

function fromWire(w: WirePaymentView): Payment {
  return {
    paymentId: w.payment_id,
    provider: w.provider,
    providerReference: w.provider_reference,
    status: w.status,
    amountMinorUnits: w.amount_minor_units,
    currency: w.currency,
    merchantReference: w.merchant_reference,
    ...(w.next_action !== undefined ? { nextAction: w.next_action } : {}),
  };
}

export class OpenWrapperClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OpenWrapperClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries ?? 0;
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  readonly payments = {
    /**
     * Creates a payment.
     *
     * ```ts
     * const payment = await client.payments.create({
     *   provider: "paymob",
     *   amountMinorUnits: 1000,
     *   currency: "EGP",
     *   customer: { phone: "+201234567890" },
     * });
     * ```
     *
     * A `payment.status` of `"unknown"` is a normal, non-exceptional
     * result — it means the true outcome could not be determined (e.g. a
     * timeout talking to the provider), not that the call failed. Poll
     * `payments.get(payment.paymentId)` to check for resolution; do not
     * call `create()` again with a new idempotency key to "retry" it,
     * since that could double-charge the customer if the original
     * attempt did in fact succeed (invariant I6).
     */
    create: (params: CreatePaymentParams, options: CreatePaymentOptions = {}): Promise<Payment> => {
      const idempotencyKey = options.idempotencyKey ?? globalThis.crypto.randomUUID();
      return this.request<WirePaymentView>("POST", "/v1/payments", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: {
          provider: params.provider,
          amount_minor_units: params.amountMinorUnits,
          currency: params.currency,
          customer: {
            phone: params.customer.phone,
            email: params.customer.email,
            full_name: params.customer.fullName,
          },
          merchant_reference: params.merchantReference,
          description: params.description,
          return_url: params.returnUrl,
          metadata: params.metadata,
        },
      }).then(fromWire);
    },

    get: (paymentId: string): Promise<Payment> =>
      this.request<WirePaymentView>("GET", `/v1/payments/${encodeURIComponent(paymentId)}`).then(fromWire),
  };

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    init?: { headers?: Record<string, string>; body?: unknown }
  ): Promise<T> {
    let attempt = 0;
    const maxAttempts = Math.max(1, this.maxRetries + 1);
    const baseDelay = this.retryDelayMs;

    while (attempt < maxAttempts) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey ? { "X-API-Key": this.apiKey } : {}),
            ...(init?.headers ?? {}),
          },
          body: init?.body !== undefined ? JSON.stringify(init.body) : null,
          signal: controller.signal,
        });
      } catch (cause) {
        attempt++;
        clearTimeout(timeout);
        if (attempt >= maxAttempts) {
          throw new GatewayUnreachableError(
            `could not reach OpenWrapper gateway at ${this.baseUrl}: ${(cause as Error).message}`
          );
        }
        const ceiling = baseDelay * Math.pow(2, attempt - 1);
        const sleepMs = Math.random() * ceiling;
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
        continue;
      } finally {
        clearTimeout(timeout);
      }

      const json = await response.json().catch(() => undefined);
      if (!response.ok) {
        if (json && typeof json === "object" && "error" in json) {
          throw errorFromBody(json as ErrorBody, response.status);
        }
        throw new GatewayUnreachableError(`OpenWrapper gateway returned HTTP ${response.status}`);
      }
      return json as T;
    }

    throw new GatewayUnreachableError(`could not reach OpenWrapper gateway at ${this.baseUrl}`);
  }
}
