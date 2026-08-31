import { createHash } from "node:crypto"

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

export async function createFawryPayment(
  input: CreateFawryPaymentInput,
  configOverride?: Partial<FawryConfig>
) {
  const config = getFawryConfig(configOverride)
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
        instructions: `Pay at any Fawry retail point or mobile wallet using payment reference code: ${mockReferenceNumber}. Code expires in 48 hours.`,
      },
    }
  }

  const customerProfileId = input.customer.phone.replace(/[^0-9]/g, "") || "1000000"
  const itemId = "ITEM_001"
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
    customerEmail: input.customer.email || "customer@example.com",
    customerName: input.customer.fullName || "Customer User",
    chargeItems: [
      {
        itemId,
        description: input.description || "OpenWrapper Order",
        price: amountMajorUnits,
        quantity,
      },
    ],
    signature,
    paymentMethod: "PAYATFAWRY",
    description: input.description || "OpenWrapper Order",
  }

  const response = await fetch(`${config.baseUrl}/ECommerceWeb/Fawry/payments/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Fawry Charge API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const referenceNumber = data.referenceNumber?.toString() || data.fawryRefNumber?.toString() || merchantRefNum

  return {
    providerReference: String(referenceNumber),
    status: data.statusCode === 200 ? ("pending" as const) : ("failed" as const),
    nextAction: {
      type: "pay_at_reference" as const,
      reference: String(referenceNumber),
      instructions: `Pay at any Fawry retail point using reference number ${referenceNumber}`,
    },
  }
}

export function verifyFawryCallbackSignature(
  fawryRefNumber: string,
  merchantRefNum: string,
  paymentAmount: string,
  orderStatus: string,
  receivedSignature: string,
  secureKeyOverride?: string
): boolean {
  const secureKey = secureKeyOverride || process.env.FAWRY_SECURE_KEY
  if (!secureKey) return false

  const raw = `${fawryRefNumber}${merchantRefNum}${paymentAmount}${orderStatus}${secureKey}`
  const calculated = createHash("sha256").update(raw).digest("hex")
  return calculated.toLowerCase() === receivedSignature.toLowerCase()
}
