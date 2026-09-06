/**
 * Wire types mirroring `gateway/src/wire.rs`. Kept as plain interfaces
 * (not classes) since they're pure data received from/sent to the
 * OpenWrapper gateway's JSON API.
 */

/** The payment states OpenWrapper models — see docs/STATE_MACHINE.md.
 * `"unknown"` is a first-class outcome, not an error: a timeout or other
 * ambiguous provider result is represented here rather than guessed into
 * `"failed"` (invariant I5). */
export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "unknown"
  | "partially_refunded"
  | "refunded"

export type PaymentProvider = "paymob" | "fawry" | "stripe" | "mock"
export type PaymentCurrency =
  | "EGP"
  | "USD"
  | "EUR"
  | "GBP"
  | "SAR"
  | "AED"
  | "KWD"
  | "BHD"
  | "OMR"
  | "JPY"

export interface CustomerDetails {
  /** Required by integrated providers. */
  phone: string
  email?: string
  fullName?: string
}

export interface CreatePaymentParams {
  /** Which provider adapter to use, e.g. `"paymob"` or `"fawry"`. */
  provider: PaymentProvider
  /** Integer minor units; must be a positive safe integer no greater than 1,000,000,000. */
  amountMinorUnits: number
  currency: PaymentCurrency
  customer: CustomerDetails
  merchantReference?: string
  description?: string
  returnUrl?: string
  metadata?: Record<string, string>
}

export type PaymentNextAction =
  | { type: "redirect_to_url"; url: string }
  | { type: "pay_at_reference"; reference: string; instructions?: string }

export interface Payment {
  paymentId: string
  provider: string
  providerReference: string | null
  status: PaymentStatus
  amountMinorUnits: number
  currency: string
  merchantReference: string | null
  /** Only present on the response to a fresh `create()` call — what the
   * customer needs to do next. Not present on a later `get()`. */
  nextAction?: PaymentNextAction
}

export type RefundStatus = "succeeded" | "pending" | "failed"

export interface CreateRefundParams {
  amountMinorUnits: number
  reason?: string
}

export interface Refund {
  id: string
  paymentId: string
  amountMinorUnits: number
  currency: string
  status: RefundStatus
  reason?: string | null | undefined
  providerRefundRef?: string | null | undefined
  createdAt: number
}

export interface Event<T = Record<string, unknown>> {
  id: string
  userId?: string | null | undefined
  eventType: string
  resourceId: string
  payload: T
  createdAt: number
}

export interface ListEventsParams {
  limit?: number | undefined
  startingAfter?: string | undefined
}

export interface CreateWebhookEndpointParams {
  url: string
  events?: string[] | undefined
}

export interface WebhookEndpoint {
  id: string
  userId?: string | null | undefined
  url: string
  secret?: string | null | undefined
  events: string[]
  isActive: boolean
  createdAt: number
}

export interface ListEnvelope<T> {
  data: T[]
  hasMore?: boolean | undefined
}
