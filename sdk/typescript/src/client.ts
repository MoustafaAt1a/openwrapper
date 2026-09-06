import * as crypto from "node:crypto"
import {
  type ErrorBody,
  errorFromBody,
  GatewayTimeoutError,
  GatewayUnreachableError,
} from "./errors.js"
import type {
  CreatePaymentParams,
  CreateRefundParams,
  CreateWebhookEndpointParams,
  Event,
  ListEnvelope,
  ListEventsParams,
  Payment,
  PaymentNextAction,
  PaymentStatus,
  Refund,
  RefundStatus,
  WebhookEndpoint,
} from "./types.js"

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
  /** Base URL of the OpenWrapper API. Root URLs and URLs ending in `/v1` are both accepted. Defaults to OPENWRAPPER_BASE_URL or "http://127.0.0.1:8080". */
  baseUrl?: string | undefined
  /** API key for authenticating with OpenWrapper (e.g. `"ow_live_..."`). Defaults to OPENWRAPPER_API_KEY. */
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

interface WireRefundView {
  id: string
  payment_id: string
  amount_minor_units: number
  currency: string
  status: RefundStatus
  reason?: string | null
  provider_refund_ref?: string | null
  created_at: number
}

function fromWireRefund(w: WireRefundView): Refund {
  return {
    id: w.id,
    paymentId: w.payment_id,
    amountMinorUnits: w.amount_minor_units,
    currency: w.currency,
    status: w.status,
    reason: w.reason,
    providerRefundRef: w.provider_refund_ref,
    createdAt: w.created_at,
  }
}

interface WireEventView {
  id: string
  user_id?: string | null
  event_type: string
  resource_id: string
  payload: Record<string, unknown>
  created_at: number
}

function fromWireEvent(w: WireEventView): Event {
  return {
    id: w.id,
    userId: w.user_id,
    eventType: w.event_type,
    resourceId: w.resource_id,
    payload: w.payload,
    createdAt: w.created_at,
  }
}

interface WireWebhookEndpointView {
  id: string
  user_id?: string | null
  url: string
  secret?: string | null
  events: string[]
  is_active: boolean
  created_at: number
}

function fromWireEndpoint(w: WireWebhookEndpointView): WebhookEndpoint {
  return {
    id: w.id,
    userId: w.user_id,
    url: w.url,
    secret: w.secret,
    events: w.events,
    isActive: w.is_active,
    createdAt: w.created_at,
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
    throw new RangeError(
      `${name} must be a positive integer in minor units (e.g. 1000 for 10.00 EGP). Never pass floating-point numbers.`,
    )
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

  constructor(options: OpenWrapperClientOptions = {}) {
    const defaultBaseUrl =
      (typeof process !== "undefined" && process?.env?.OPENWRAPPER_BASE_URL) ||
      "http://127.0.0.1:8080"
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl)
    this.apiKey =
      options.apiKey ??
      (typeof process !== "undefined" ? process?.env?.OPENWRAPPER_API_KEY : undefined)
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

  public readonly refunds = {
    create: async (
      paymentId: string,
      params: CreateRefundParams | number,
      options: RequestOptions & { idempotencyKey?: string } = {},
    ): Promise<Refund> => {
      if (!paymentId) throw new TypeError("paymentId must not be empty")
      const p: CreateRefundParams =
        typeof params === "number" ? { amountMinorUnits: params } : params
      validatePositiveInteger("amountMinorUnits", p.amountMinorUnits)
      if (p.amountMinorUnits > 1_000_000_000) {
        throw new RangeError("amountMinorUnits exceeds the gateway maximum of 1000000000")
      }
      const headers: Record<string, string> = {}
      if (options.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey
      }
      const wire = await this.request<WireRefundView>(
        "POST",
        `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
        {
          headers,
          body: {
            amount_minor_units: p.amountMinorUnits,
            reason: p.reason,
          },
          signal: options.signal,
          timeoutMs: options.timeoutMs,
        },
      )
      return fromWireRefund(wire)
    },

    list: async (paymentId: string, options: RequestOptions = {}): Promise<Refund[]> => {
      if (!paymentId) throw new TypeError("paymentId must not be empty")
      const wire = await this.request<{ data: WireRefundView[] }>(
        "GET",
        `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
        options,
      )
      return wire.data.map(fromWireRefund)
    },
  }

  public readonly events = {
    list: async (
      params: ListEventsParams = {},
      options: RequestOptions = {},
    ): Promise<ListEnvelope<Event>> => {
      const searchParams = new URLSearchParams()
      if (params.limit !== undefined) {
        searchParams.set("limit", String(params.limit))
      }
      if (params.startingAfter) {
        searchParams.set("starting_after", params.startingAfter)
      }
      const qs = searchParams.toString()
      const path = qs ? `/v1/events?${qs}` : "/v1/events"
      const wire = await this.request<{ data: WireEventView[]; has_more?: boolean }>(
        "GET",
        path,
        options,
      )
      return {
        data: wire.data.map(fromWireEvent),
        hasMore: wire.has_more,
      }
    },

    get: async (eventId: string, options: RequestOptions = {}): Promise<Event> => {
      if (!eventId) throw new TypeError("eventId must not be empty")
      const wire = await this.request<WireEventView>(
        "GET",
        `/v1/events/${encodeURIComponent(eventId)}`,
        options,
      )
      return fromWireEvent(wire)
    },
  }

  public readonly webhookEndpoints = {
    create: async (
      params: CreateWebhookEndpointParams,
      options: RequestOptions = {},
    ): Promise<WebhookEndpoint> => {
      const wire = await this.request<WireWebhookEndpointView>("POST", "/v1/webhook_endpoints", {
        body: {
          url: params.url,
          events: params.events,
        },
        signal: options.signal,
        timeoutMs: options.timeoutMs,
      })
      return fromWireEndpoint(wire)
    },

    list: async (options: RequestOptions = {}): Promise<WebhookEndpoint[]> => {
      const wire = await this.request<{ data: WireWebhookEndpointView[] }>(
        "GET",
        "/v1/webhook_endpoints",
        options,
      )
      return wire.data.map(fromWireEndpoint)
    },

    delete: async (endpointId: string, options: RequestOptions = {}): Promise<void> => {
      if (!endpointId) throw new TypeError("endpointId must not be empty")
      await this.request<void>(
        "DELETE",
        `/v1/webhook_endpoints/${encodeURIComponent(endpointId)}`,
        options,
      )
    },
  }

  // Top-level shortcuts for maximum simplicity and ergonomics
  readonly createPayment = this.payments.create
  readonly getPayment = this.payments.get
  readonly createRefund = this.refunds.create
  readonly listRefunds = this.refunds.list
  readonly listEvents = this.events.list
  readonly getEvent = this.events.get

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
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

      if (response.ok) {
        if (response.status === 204) {
          return undefined as T
        }
        const body = (await response.json().catch(() => null)) as unknown
        if (body === null) {
          throw new GatewayUnreachableError(
            "OpenWrapper gateway returned a non-JSON success response",
          )
        }
        return body as T
      }
      const body = (await response.json().catch(() => null)) as unknown

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

export const webhooks = {
  computeSignature(payload: string, secret: string, timestamp: number): string {
    return crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
  },

  verifySignature(
    payload: string,
    header: string,
    secret: string,
    toleranceSeconds = 300,
  ): boolean {
    let timestamp: number | null = null
    const signatures: string[] = []

    for (const item of header.split(",")) {
      const parts = item.split("=")
      if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
        const key = parts[0].trim()
        const val = parts[1].trim()
        if (key === "t") {
          timestamp = parseInt(val, 10)
        } else if (key === "v1") {
          signatures.push(val)
        }
      }
    }

    if (!timestamp || signatures.length === 0) {
      return false
    }

    if (toleranceSeconds > 0) {
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false
      }
    }

    const expected = this.computeSignature(payload, secret, timestamp)
    const expectedBuf = Buffer.from(expected, "hex")

    for (const sig of signatures) {
      try {
        const sigBuf = Buffer.from(sig, "hex")
        if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
          return true
        }
      } catch {}
    }

    return false
  },
}

/**
 * Safely converts major currency units (e.g. 10.50) into integer minor units (e.g. 1050)
 * avoiding floating-point rounding errors.
 */
export function toMinorUnits(amount: number | string, decimals = 2): number {
  const raw = typeof amount === "number" ? amount.toFixed(decimals) : amount.trim()
  const isNegative = raw.startsWith("-")
  const str = raw.replace(/^[+-]/, "")
  const parts = str.split(".")
  const whole = BigInt(parts[0] || "0")
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals)
  const minor = whole * BigInt(10 ** decimals) + BigInt(frac || "0")
  return Number(isNegative ? -minor : minor)
}

/**
 * Safely formats integer minor units into human-readable major currency units (e.g. 1050 -> "10.50").
 */
export function formatMajorUnits(minorUnits: number, decimals = 2): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new TypeError("minorUnits must be a safe integer")
  }
  if (decimals === 0) return String(minorUnits)
  const isNegative = minorUnits < 0
  const abs = Math.abs(minorUnits)
  const factor = 10 ** decimals
  const whole = Math.floor(abs / factor)
  const fraction = String(abs % factor).padStart(decimals, "0")
  return `${isNegative ? "-" : ""}${whole}.${fraction}`
}
