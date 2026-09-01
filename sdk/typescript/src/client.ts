import type { CreatePaymentParams, Payment, PaymentNextAction, PaymentStatus } from "./types.js";
import { errorFromBody, GatewayUnreachableError, type ErrorBody } from "./errors.js";

export interface PaymobCredentials {
  secretKey?: string;
  publicKey?: string;
  hmacSecret?: string;
  integrationId?: string | number;
}

export interface FawryCredentials {
  merchantCode?: string;
  secureKey?: string;
  baseUrl?: string;
}

export interface StripeCredentials {
  secretKey?: string;
}

export interface ProviderCredentials {
  paymob?: PaymobCredentials;
  fawry?: FawryCredentials;
  stripe?: StripeCredentials;
}

export interface OpenWrapperClientOptions {
  /** Base URL of the OpenWrapper API, e.g. `"http://localhost:8080"` (Rust gateway) or `"http://localhost:3000/api/v1"` (web proxy). */
  baseUrl: string;
  /** API key for authenticating with OpenWrapper (e.g. `"ow_live_..."`). */
  apiKey?: string | undefined;
  /** Optional merchant provider credentials passed via headers per-request (Stateless Mode) */
  providers?: ProviderCredentials | undefined;
  /** Maximum retry attempts for transient network errors on safe/idempotent requests (default 0). */
  maxRetries?: number | undefined;
  /** Base retry delay in milliseconds for exponential backoff (default 200ms). */
  retryDelayMs?: number | undefined;
  /** Override for testing; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Request timeout in milliseconds. Default 30s. */
  timeoutMs?: number;
}

export interface CreatePaymentOptions {
  /**
   * Uniquely identifies this logical create-payment operation for
   * OpenWrapper's idempotency contract. If omitted, the SDK generates a fresh UUID.
   */
  idempotencyKey?: string | undefined;
  /** Per-call override for provider credentials */
  providers?: ProviderCredentials | undefined;
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
  private readonly providers: ProviderCredentials | undefined;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OpenWrapperClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.providers = options.providers;
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
     */
    create: (params: CreatePaymentParams, options: CreatePaymentOptions = {}): Promise<Payment> => {
      const idempotencyKey = options.idempotencyKey ?? globalThis.crypto.randomUUID();
      const mergedProviders = { ...this.providers, ...options.providers };
      const headers: Record<string, string> = {
        "Idempotency-Key": idempotencyKey,
      };

      if (mergedProviders.paymob?.secretKey) headers["X-Paymob-Secret-Key"] = mergedProviders.paymob.secretKey;
      if (mergedProviders.paymob?.publicKey) headers["X-Paymob-Public-Key"] = mergedProviders.paymob.publicKey;
      if (mergedProviders.paymob?.hmacSecret) headers["X-Paymob-Hmac-Secret"] = mergedProviders.paymob.hmacSecret;
      if (mergedProviders.paymob?.integrationId) headers["X-Paymob-Integration-Id"] = String(mergedProviders.paymob.integrationId);

      if (mergedProviders.fawry?.merchantCode) headers["X-Fawry-Merchant-Code"] = mergedProviders.fawry.merchantCode;
      if (mergedProviders.fawry?.secureKey) headers["X-Fawry-Secure-Key"] = mergedProviders.fawry.secureKey;
      if (mergedProviders.fawry?.baseUrl) headers["X-Fawry-Base-Url"] = mergedProviders.fawry.baseUrl;

      if (mergedProviders.stripe?.secretKey) headers["X-Stripe-Secret-Key"] = mergedProviders.stripe.secretKey;

      return this.request<WirePaymentView>("POST", "/v1/payments", {
        headers,
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
        const reqHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        };
        if (this.apiKey) {
          reqHeaders["Authorization"] = `Bearer ${this.apiKey}`;
          reqHeaders["X-API-Key"] = this.apiKey;
        }

        const fetchOptions: RequestInit = {
          method,
          headers: reqHeaders,
          signal: controller.signal,
        };

        if (init?.body !== undefined) {
          fetchOptions.body = JSON.stringify(init.body);
        }

        response = await this.fetchImpl(`${this.baseUrl}${path}`, fetchOptions);
      } catch (err: unknown) {
        clearTimeout(timeout);
        attempt++;
        if (attempt >= maxAttempts) {
          throw new GatewayUnreachableError(
            `Failed to reach OpenWrapper gateway at ${this.baseUrl}${path} after ${attempt} attempt(s): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
        continue;
      } finally {
        clearTimeout(timeout);
      }

      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = (await response.json().catch(() => null)) as ErrorBody | null;
      if (!body) {
        throw new GatewayUnreachableError(`HTTP ${response.status} from gateway: ${response.statusText}`);
      }
      throw errorFromBody(body, response.status);
    }

    throw new GatewayUnreachableError("Request loop exited unexpectedly");
  }
}
