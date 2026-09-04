import {
  type ErrorBody,
  errorFromBody,
  GatewayTimeoutError,
  GatewayUnreachableError,
} from "./errors.js"
import type { CreatePaymentParams, Payment, PaymentNextAction, PaymentStatus } from "./types.js"

export interface PaymobCredentials {
  secretKey?: string
  publicKey?: string
  hmacSecret?: string
  integrationId?: string | number
  /** Optional Paymob API origin override, primarily for sandbox testing. */
  baseUrl?: string
}

export interface FawryCredentials {
  merchantCode?: string
  secureKey?: string
  baseUrl?: string
}

export interface StripeCredentials {
  secretKey?: string
}

export interface ProviderCredentials {
  paymob?: PaymobCredentials
  fawry?: FawryCredentials
  stripe?: StripeCredentials
}

export interface OpenWrapperClientOptions {
  /** Base URL of the OpenWrapper API. Root URLs and URLs ending in `/v1` are both accepted. */
  baseUrl: string
  /** API key for authenticating with OpenWrapper (e.g. `"ow_live_..."`). */
  apiKey?: string | undefined
  /** Optional merchant provider credentials passed via headers per-request (Stateless Mode) */
  providers?: ProviderCredentials | undefined
  /** Maximum retry attempts for transient network errors on safe/idempotent requests (default 0). */
  maxRetries?: number | undefined
  /** Base retry delay in milliseconds for exponential backoff (default 200ms). */
  retryDelayMs?: number | undefined
  /** Override for testing; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
  /** Request timeout in milliseconds. Default 30s. */
  timeoutMs?: number
}

export interface RequestOptions {
  /** Cancels the request and any retry backoff. */
  signal?: AbortSignal | undefined
  /** Per-request timeout override in milliseconds. */
  timeoutMs?: number | undefined
}

export interface CreatePaymentOptions extends RequestOptions {
  /**
   * Uniquely identifies this logical create-payment operation for
   * OpenWrapper's idempotency contract. If omitted, the SDK generates a fresh UUID.
   */
  idempotencyKey?: string | undefined
  /** Per-call provider credential overrides, merged field-by-field. */
  providers?: ProviderCredentials | undefined
}

/** Wire (snake_case) shape returned by the gateway — internal only. */
interface WirePaymentView {
  payment_id: string
  provider: string
  provider_reference: string | null
  status: PaymentStatus
  amount_minor_units: number
  currency: string
  merchant_reference: string | null
  next_action?: PaymentNextAction
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
  }
}

function normalizeBaseUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new TypeError("baseUrl must be an absolute HTTP(S) URL")
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password
  ) {
    throw new TypeError("baseUrl must be an absolute HTTP(S) URL without embedded credentials")
  }
  if (parsed.search || parsed.hash) {
    throw new TypeError("baseUrl must not contain a query string or fragment")
  }
  return parsed.toString().replace(/\/+$/, "")
}

function validatePositiveInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

function validateIdempotencyKey(value: string): void {
  if (value.length < 1 || value.length > 200 || !/^[!#-~]+$/.test(value)) {
    throw new TypeError(
      "idempotencyKey must be 1-200 printable ASCII characters without quotes or whitespace",
    )
  }
}

function mergeProviders(
  defaults: ProviderCredentials | undefined,
  overrides: ProviderCredentials | undefined,
): ProviderCredentials {
  return {
    ...(defaults?.paymob || overrides?.paymob
      ? { paymob: { ...(defaults?.paymob ?? {}), ...(overrides?.paymob ?? {}) } }
      : {}),
    ...(defaults?.fawry || overrides?.fawry
      ? { fawry: { ...(defaults?.fawry ?? {}), ...(overrides?.fawry ?? {}) } }
      : {}),
    ...(defaults?.stripe || overrides?.stripe
      ? { stripe: { ...(defaults?.stripe ?? {}), ...(overrides?.stripe ?? {}) } }
      : {}),
  }
}

function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort)
      resolve()
    }
    const timeout = setTimeout(finish, delayMs)
    const abort = () => {
      clearTimeout(timeout)
      reject(signal?.reason)
    }
    signal?.addEventListener("abort", abort, { once: true })
  })
}

function isErrorBody(value: unknown): value is ErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false
  const error = (value as { error?: unknown }).error
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  )
}

export class OpenWrapperClient {
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly providers: ProviderCredentials | undefined
  private readonly maxRetries: number
  private readonly retryDelayMs: number
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(options: OpenWrapperClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.apiKey = options.apiKey
    this.providers = options.providers
    this.maxRetries = options.maxRetries ?? 0
    this.retryDelayMs = options.retryDelayMs ?? 200
    this.fetchImpl = options.fetchImpl ?? fetch
    this.timeoutMs = options.timeoutMs ?? 30_000

    if (!Number.isInteger(this.maxRetries) || this.maxRetries < 0) {
      throw new RangeError("maxRetries must be a non-negative integer")
    }
    if (!Number.isFinite(this.retryDelayMs) || this.retryDelayMs < 0) {
      throw new RangeError("retryDelayMs must be a non-negative number")
    }
    validatePositiveInteger("timeoutMs", this.timeoutMs)
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
    create: async (
      params: CreatePaymentParams,
      options: CreatePaymentOptions = {},
    ): Promise<Payment> => {
      validatePositiveInteger("amountMinorUnits", params.amountMinorUnits)
      if (params.amountMinorUnits > 1_000_000_000) {
        throw new RangeError("amountMinorUnits exceeds the gateway maximum of 1000000000")
      }
      const idempotencyKey = options.idempotencyKey ?? globalThis.crypto.randomUUID()
      validateIdempotencyKey(idempotencyKey)
      const mergedProviders = mergeProviders(this.providers, options.providers)
      const headers: Record<string, string> = {
        "Idempotency-Key": idempotencyKey,
      }

      if (mergedProviders.paymob?.secretKey)
        headers["X-Paymob-Secret-Key"] = mergedProviders.paymob.secretKey
      if (mergedProviders.paymob?.publicKey)
        headers["X-Paymob-Public-Key"] = mergedProviders.paymob.publicKey
      if (mergedProviders.paymob?.hmacSecret)
        headers["X-Paymob-Hmac-Secret"] = mergedProviders.paymob.hmacSecret
      if (mergedProviders.paymob?.integrationId)
        headers["X-Paymob-Integration-Id"] = String(mergedProviders.paymob.integrationId)
      if (mergedProviders.paymob?.baseUrl)
        headers["X-Paymob-Base-Url"] = mergedProviders.paymob.baseUrl

      if (mergedProviders.fawry?.merchantCode)
        headers["X-Fawry-Merchant-Code"] = mergedProviders.fawry.merchantCode
      if (mergedProviders.fawry?.secureKey)
        headers["X-Fawry-Secure-Key"] = mergedProviders.fawry.secureKey
      if (mergedProviders.fawry?.baseUrl)
        headers["X-Fawry-Base-Url"] = mergedProviders.fawry.baseUrl

      if (mergedProviders.stripe?.secretKey)
        headers["X-Stripe-Secret-Key"] = mergedProviders.stripe.secretKey

      const wire = await this.request<WirePaymentView>("POST", "/v1/payments", {
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
        signal: options.signal,
        timeoutMs: options.timeoutMs,
      })
      return fromWire(wire)
    },

    get: async (paymentId: string, options: RequestOptions = {}): Promise<Payment> => {
      if (!paymentId) throw new TypeError("paymentId must not be empty")
      const wire = await this.request<WirePaymentView>(
        "GET",
        `/v1/payments/${encodeURIComponent(paymentId)}`,
        options,
      )
      return fromWire(wire)
    },
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    init?: {
      headers?: Record<string, string> | undefined
      body?: unknown
      signal?: AbortSignal | undefined
      timeoutMs?: number | undefined
    },
  ): Promise<T> {
    let attempt = 0
    const maxAttempts = this.maxRetries + 1
    const baseDelay = this.retryDelayMs
    const timeoutMs = init?.timeoutMs ?? this.timeoutMs
    validatePositiveInteger("timeoutMs", timeoutMs)
    const url = this.urlFor(path)

    while (attempt < maxAttempts) {
      if (init?.signal?.aborted) throw init.signal.reason
      const controller = new AbortController()
      const forwardAbort = () => controller.abort(init?.signal?.reason)
      init?.signal?.addEventListener("abort", forwardAbort, { once: true })
      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)
      let response: Response
      try {
        const reqHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        }
        if (this.apiKey) {
          reqHeaders.Authorization = `Bearer ${this.apiKey}`
          reqHeaders["X-API-Key"] = this.apiKey
        }

        const fetchOptions: RequestInit = {
          method,
          headers: reqHeaders,
          signal: controller.signal,
        }

        if (init?.body !== undefined) {
          fetchOptions.body = JSON.stringify(init.body)
        }

        response = await this.fetchImpl(url, fetchOptions)
      } catch (err: unknown) {
        if (init?.signal?.aborted) throw err
        attempt++
        if (attempt >= maxAttempts) {
          if (timedOut) {
            throw new GatewayTimeoutError(
              `OpenWrapper gateway request timed out after ${timeoutMs}ms`,
            )
          }
          throw new GatewayUnreachableError(
            `Failed to reach OpenWrapper gateway at ${url} after ${attempt} attempt(s): ${
              err instanceof Error ? err.message : String(err)
            }`,
          )
        }
        await sleep(baseDelay * 2 ** (attempt - 1), init?.signal)
        continue
      } finally {
        clearTimeout(timeout)
        init?.signal?.removeEventListener("abort", forwardAbort)
      }

      const body = (await response.json().catch(() => null)) as unknown
      if (response.ok) {
        if (body === null) {
          throw new GatewayUnreachableError(
            "OpenWrapper gateway returned a non-JSON success response",
          )
        }
        return body as T
      }

      if (!isErrorBody(body)) {
        throw new GatewayUnreachableError(
          `HTTP ${response.status} from gateway: ${response.statusText}`,
        )
      }
      throw errorFromBody(body, response.status)
    }

    throw new GatewayUnreachableError("Request loop exited unexpectedly")
  }

  private urlFor(path: string): string {
    if (this.baseUrl.endsWith("/v1") && path.startsWith("/v1/")) {
      return `${this.baseUrl}${path.slice(3)}`
    }
    return `${this.baseUrl}${path}`
  }
}
