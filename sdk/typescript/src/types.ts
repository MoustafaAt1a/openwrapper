/**
 * Wire types mirroring `gateway/src/wire.rs`. Kept as plain interfaces
 * (not classes) since they're pure data received from/sent to the
 * OpenWrapper gateway's JSON API.
 */

/** The four payment states OpenWrapper models — see docs/STATE_MACHINE.md.
 * `"unknown"` is a first-class outcome, not an error: a timeout or other
 * ambiguous provider result is represented here rather than guessed into
 * `"failed"` (invariant I5). */
export type PaymentStatus = "pending" | "succeeded" | "failed" | "unknown";

export type PaymentProvider = "paymob" | "fawry" | "stripe";
export type PaymentCurrency = "EGP" | "USD";

export interface CustomerDetails {
  /** Required by both integrated providers. */
  phone: string;
  email?: string;
  fullName?: string;
}

export interface CreatePaymentParams {
  /** Which provider adapter to use, e.g. `"paymob"` or `"fawry"`. Chosen
   * explicitly by the caller — OpenWrapper v0.1.0 does not do smart
   * routing between providers. */
  provider: PaymentProvider;
  /** Integer minor units (piasters for EGP, cents for USD) — never a floating-point amount. */
  amountMinorUnits: number;
  currency: PaymentCurrency;
  customer: CustomerDetails;
  merchantReference?: string;
  description?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export type PaymentNextAction =
  | { type: "redirect_to_url"; url: string }
  | { type: "pay_at_reference"; reference: string; instructions?: string };

export interface Payment {
  paymentId: string;
  provider: string;
  providerReference: string | null;
  status: PaymentStatus;
  amountMinorUnits: number;
  currency: string;
  merchantReference: string | null;
  /** Only present on the response to a fresh `create()` call — what the
   * customer needs to do next. Not present on a later `get()`. */
  nextAction?: PaymentNextAction;
}
