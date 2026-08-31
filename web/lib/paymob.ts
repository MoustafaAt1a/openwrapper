import { createHmac } from "node:crypto"

export interface PaymobConfig {
  secretKey: string
  publicKey: string
  hmacSecret: string
  integrationIds: string[]
  notificationUrl?: string
  baseUrl?: string
}

export function getPaymobConfig(): PaymobConfig | null {
  const secretKey = process.env.PAYMOB_SECRET_KEY
  const publicKey = process.env.PAYMOB_PUBLIC_KEY
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET
  if (!secretKey || !publicKey || !hmacSecret) return null

  return {
    secretKey,
    publicKey,
    hmacSecret,
    integrationIds: (process.env.PAYMOB_INTEGRATION_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
    notificationUrl: process.env.PAYMOB_NOTIFICATION_URL,
    baseUrl: process.env.PAYMOB_BASE_URL || "https://accept.paymob.com",
  }
}

export interface CreatePaymobPaymentInput {
  amountMinorUnits: number
  currency: string
  customer: {
    phone: string
    email?: string
    fullName?: string
  }
  merchantReference?: string
  description?: string
  returnUrl?: string
  idempotencyKey: string
}

export async function createPaymobPayment(input: CreatePaymobPaymentInput) {
  const config = getPaymobConfig()
  if (!config) {
    // Generate deterministic mock Paymob checkout intention
    const mockIntentionId = `pm_int_${Math.random().toString(36).substring(2, 14)}`
    const mockClientSecret = `pm_sec_${Math.random().toString(36).substring(2, 20)}`
    return {
      providerReference: mockIntentionId,
      status: "pending" as const,
      nextAction: {
        type: "redirect_to_url" as const,
        url: `https://accept.paymob.com/unifiedcheckout/?publicKey=mock_pk&clientSecret=${mockClientSecret}`,
      },
    }
  }

  const names = (input.customer.fullName || "").trim().split(" ")
  const firstName = names[0] || "Customer"
  const lastName = names.slice(1).join(" ") || "User"

  const payload = {
    amount: input.amountMinorUnits,
    currency: input.currency.toUpperCase(),
    payment_methods: config.integrationIds.map((id) => Number(id) || id),
    items: [
      {
        name: input.description || "Payment",
        amount: input.amountMinorUnits,
        description: input.description || "Payment Transaction",
        quantity: 1,
      },
    ],
    billing_data: {
      first_name: firstName,
      last_name: lastName,
      phone_number: input.customer.phone,
      email: input.customer.email || "customer@openwrapper.internal",
      country: "EGY",
      city: "Cairo",
      street: "NA",
      building: "NA",
      apartment: "NA",
      floor: "NA",
    },
    special_reference: input.merchantReference,
    notification_url: config.notificationUrl,
    redirection_url: input.returnUrl,
  }

  const response = await fetch(`${config.baseUrl}/v1/intention/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${config.secretKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Paymob Intention creation failed (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const clientSecret = data.client_secret
  const intentionId = String(data.id || data.intention_id || "")

  const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${config.publicKey}&clientSecret=${clientSecret}`

  return {
    providerReference: intentionId,
    status: "pending" as const,
    nextAction: {
      type: "redirect_to_url" as const,
      url: checkoutUrl,
    },
  }
}

/**
 * Verify Paymob HMAC SHA512 signature from transaction response/webhook
 */
export function verifyPaymobHmac(payload: Record<string, unknown>, receivedHmac: string, hmacSecret: string): boolean {
  try {
    const obj = (payload.obj || payload) as Record<string, unknown>
    const fields = [
      "amount_cents",
      "created_at",
      "currency",
      "error_occured",
      "has_parent_transaction",
      "id",
      "integration_id",
      "is_3d_secure",
      "is_auth",
      "is_capture",
      "is_refunded",
      "is_standalone_payment",
      "is_voided",
      "order",
      "owner",
      "pending",
      "source_data_pan",
      "source_data_sub_type",
      "source_data_type",
      "success",
    ]

    const concatenated = fields
      .map((field) => {
        if (field === "order") {
          const orderObj = obj.order as Record<string, unknown> | undefined
          return String(orderObj?.id ?? "")
        }
        if (field.startsWith("source_data_")) {
          const subField = field.replace("source_data_", "")
          const sourceData = obj.source_data as Record<string, unknown> | undefined
          return String(sourceData?.[subField] ?? "")
        }
        const val = obj[field]
        return val === undefined || val === null ? "" : String(val)
      })
      .join("")

    const calculatedHmac = createHmac("sha512", hmacSecret).update(concatenated).digest("hex")
    return calculatedHmac.toLowerCase() === receivedHmac.toLowerCase()
  } catch {
    return false
  }
}
