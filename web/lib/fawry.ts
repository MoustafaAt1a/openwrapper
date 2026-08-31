import { createHash } from "node:crypto"

export interface FawryConfig {
  merchantCode: string
  secureKey: string
  baseUrl: string
}

export function getFawryConfig(): FawryConfig | null {
  const merchantCode = process.env.FAWRY_MERCHANT_CODE
  const secureKey = process.env.FAWRY_SECURE_KEY
  if (!merchantCode || !secureKey) return null

  return {
    merchantCode,
    secureKey,
    baseUrl: process.env.FAWRY_BASE_URL || "https://atfawry.fawrystaging.com",
  }
}

export interface CreateFawryPaymentInput {
  amountMinorUnits: number
  currency: string
  customer: {
    phone: string
    email?: string
    fullName?: string
  }
  merchantReference?: string
  description?: string
  idempotencyKey: string
}

export function calculateFawryChargeSignature(
  merchantCode: string,
  merchantRefNum: string,
  customerProfileId: string,
  itemId: string,
  quantity: number,
  price: string,
  secureKey: string
): string {
  const raw = `${merchantCode}${merchantRefNum}${customerProfileId}${itemId}${quantity}${price}${secureKey}`
  return createHash("sha256").update(raw).digest("hex")
}

export async function createFawryPayment(input: CreateFawryPaymentInput) {
  const config = getFawryConfig()
  const major = Math.floor(Math.abs(Math.round(input.amountMinorUnits)) / 100)
  const minor = (Math.abs(Math.round(input.amountMinorUnits)) % 100).toString().padStart(2, "0")
  const amountMajorUnits = `${major}.${minor}`
  const merchantRefNum = input.merchantReference || `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  if (!config) {
    // Generate deterministic mock Fawry reference number (kiosk / retail payment code)
    const mockReferenceNumber = `9${Math.floor(10000000 + Math.random() * 90000000)}`
    return {
      providerReference: mockReferenceNumber,
      status: "pending" as const,
      nextAction: {
        type: "pay_at_reference" as const,
        reference: mockReferenceNumber,
        instructions: `Pay at any Fawry retail outlet or kiosk using reference code: ${mockReferenceNumber} before expiry.`,
      },
    }
  }

  const customerProfileId = input.customer.phone || "01000000000"
  const itemId = "ITEM_1"
  const quantity = 1

  const signature = calculateFawryChargeSignature(
    config.merchantCode,
    merchantRefNum,
    customerProfileId,
    itemId,
    quantity,
    amountMajorUnits,
    config.secureKey
  )

  const payload = {
    merchantCode: config.merchantCode,
    merchantRefNum,
    customerProfileId,
    customerMobile: input.customer.phone,
    customerEmail: input.customer.email,
    paymentExpiry: Date.now() + 72 * 60 * 60 * 1000, // 3 days expiry
    chargeItems: [
      {
        itemId,
        description: input.description || "OpenWrapper Payment",
        price: amountMajorUnits,
        quantity,
      },
    ],
    signature,
  }

  const response = await fetch(`${config.baseUrl}/ECommerceWeb/Fawry/payments/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Fawry Charge request failed (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const referenceNumber = String(data.referenceNumber || data.fawryRefNumber || "")

  return {
    providerReference: referenceNumber,
    status: "pending" as const,
    nextAction: {
      type: "pay_at_reference" as const,
      reference: referenceNumber,
      instructions: `Pay at any Fawry retail outlet or kiosk using reference code: ${referenceNumber}.`,
    },
  }
}

/**
 * Verify Fawry webhook/notification signature
 */
export function verifyFawrySignature(
  fawryRefNumber: string,
  merchantRefNumber: string,
  paymentAmount: string,
  orderStatus: string,
  secureKey: string,
  receivedSignature: string
): boolean {
  const raw = `${fawryRefNumber}${merchantRefNumber}${paymentAmount}${orderStatus}${secureKey}`
  const calculated = createHash("sha256").update(raw).digest("hex")
  return calculated.toLowerCase() === receivedSignature.toLowerCase()
}
