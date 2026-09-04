import { createHash } from "node:crypto"
import { constantTimeEqHex } from "@/lib/crypto"

export interface FawryConfig {
  merchantCode: string
  secureKey: string
  baseUrl: string
}

export function getFawryConfig(override?: Partial<FawryConfig>): FawryConfig | null {
  const merchantCode = override?.merchantCode || process.env.FAWRY_MERCHANT_CODE
  const secureKey = override?.secureKey || process.env.FAWRY_SECURE_KEY
  if (!merchantCode || !secureKey) return null

  return {
    merchantCode,
    secureKey,
    baseUrl: override?.baseUrl || process.env.FAWRY_BASE_URL || "https://atfawry.fawrystaging.com",
  }
}

/** Matches Rust `charge_signature` in providers/fawry/src/signature.rs */
export function calculateFawryChargeSignature(
  merchantCode: string,
  merchantRefNum: string,
  customerProfileId: string,
  paymentMethod: string,
  amount2dp: string,
  secureKey: string,
): string {
  const raw = `${merchantCode}${merchantRefNum}${customerProfileId}${paymentMethod}${amount2dp}${secureKey}`
  return createHash("sha256").update(raw).digest("hex")
}

/** Matches Rust `webhook_signature` in providers/fawry/src/signature.rs */
export function calculateFawryWebhookSignature(
  fawryRefNumber: string,
  merchantRefNumber: string,
  paymentAmount2dp: string,
  orderAmount2dp: string,
  orderStatus: string,
  paymentMethod: string,
  paymentReferenceNumber: string | undefined,
  secureKey: string,
): string {
  const raw = `${fawryRefNumber}${merchantRefNumber}${paymentAmount2dp}${orderAmount2dp}${orderStatus}${paymentMethod}${paymentReferenceNumber ?? ""}${secureKey}`
  return createHash("sha256").update(raw).digest("hex")
}

export function verifyFawryWebhookSignature(
  fawryRefNumber: string,
  merchantRefNumber: string,
  paymentAmount2dp: string,
  orderAmount2dp: string,
  orderStatus: string,
  paymentMethod: string,
  paymentReferenceNumber: string | undefined,
  secureKey: string,
  receivedSignature: string,
): boolean {
  const calculated = calculateFawryWebhookSignature(
    fawryRefNumber,
    merchantRefNumber,
    paymentAmount2dp,
    orderAmount2dp,
    orderStatus,
    paymentMethod,
    paymentReferenceNumber,
    secureKey,
  )
  return constantTimeEqHex(calculated, receivedSignature)
}

/** @deprecated Use gateway for Fawry payments. Kept for webhook verification only. */
export function verifyFawrySignature(
  fawryRefNumber: string,
  merchantRefNum: string,
  paymentAmount: string,
  orderStatus: string,
  secureKey: string,
  receivedSignature: string,
): boolean {
  return verifyFawryWebhookSignature(
    fawryRefNumber,
    merchantRefNum,
    paymentAmount,
    paymentAmount,
    orderStatus,
    "PAYATFAWRY",
    undefined,
    secureKey,
    receivedSignature,
  )
}
