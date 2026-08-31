import { createHmac } from "node:crypto"

export interface PaymobConfig {
  secretKey: string
  publicKey: string
  hmacSecret: string
  integrationIds: string[]
  notificationUrl?: string
  baseUrl?: string
}

export function getPaymobConfig(override?: Partial<PaymobConfig>): PaymobConfig | null {
  const secretKey = override?.secretKey || process.env.PAYMOB_SECRET_KEY
  const publicKey = override?.publicKey || process.env.PAYMOB_PUBLIC_KEY
  const hmacSecret = override?.hmacSecret || process.env.PAYMOB_HMAC_SECRET
  if (!secretKey || !publicKey || !hmacSecret) return null

  const integrationIds =
    override?.integrationIds && override.integrationIds.length > 0
      ? override.integrationIds
      : (process.env.PAYMOB_INTEGRATION_IDS || "").split(",").map((s) => s.trim()).filter(Boolean)

  return {
    secretKey,
    publicKey,
    hmacSecret,
    integrationIds,
    notificationUrl: override?.notificationUrl || process.env.PAYMOB_NOTIFICATION_URL,
    baseUrl: override?.baseUrl || process.env.PAYMOB_BASE_URL || "https://accept.paymob.com",
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

export async function createPaymobPayment(
  input: CreatePaymobPaymentInput,
  configOverride?: Partial<PaymobConfig>
) {
  const config = getPaymobConfig(configOverride)
  if (!config) {
    throw new Error(
      "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, and X-Paymob-Hmac-Secret headers or configure PAYMOB_SECRET_KEY."
    )
  }

  const names = (input.customer.fullName || "").trim().split(" ")
  const firstName = names[0] || "Customer"
  const lastName = names.slice(1).join(" ") || "User"

  const payload: Record<string, unknown> = {
    amount: input.amountMinorUnits,
    currency: input.currency.toUpperCase(),
    payment_methods: config.integrationIds.map((id) => Number(id) || id),
    items: [
      {
        name: input.description || "OpenWrapper Order",
        amount: input.amountMinorUnits,
        description: input.description || "Payment item",
        quantity: 1,
      },
    ],
    billing_data: {
      first_name: firstName,
      last_name: lastName,
      phone_number: input.customer.phone,
      email: input.customer.email || "customer@example.com",
      country: "EGY",
      city: "Cairo",
      street: "Building 1",
      building: "1",
      floor: "1",
      apartment: "1",
      state: "Cairo",
    },
    special_reference: input.merchantReference,
  }

  if (config.notificationUrl) {
    payload.notification_url = config.notificationUrl
  }

  if (input.returnUrl) {
    payload.redirection_url = input.returnUrl
  }

  const response = await fetch(`${config.baseUrl}/v1/intention/`, {
    method: "POST",
    headers: {
      "Authorization": `Token ${config.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Paymob Intention API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const intentionId = data.id?.toString() || data.intention_id?.toString() || data.client_secret
  const clientSecret = data.client_secret || intentionId

  return {
    providerReference: String(intentionId),
    status: "pending" as const,
    nextAction: {
      type: "redirect_to_url" as const,
      url: `https://accept.paymob.com/unifiedcheckout/?publicKey=${config.publicKey}&clientSecret=${clientSecret}`,
    },
  }
}

export function verifyPaymobHmac(payload: Record<string, unknown>, receivedHmac: string, hmacSecretOverride?: string): boolean {
  const hmacSecret = hmacSecretOverride || process.env.PAYMOB_HMAC_SECRET
  if (!hmacSecret) return false

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
    "order.id",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
  ]

  const concatenated = fields
    .map((field) => {
      if (field.includes(".")) {
        const parts = field.split(".")
        let current: unknown = obj
        for (const p of parts) {
          current = (current as Record<string, unknown>)?.[p]
        }
        return current !== undefined && current !== null ? String(current) : ""
      }
      const val = obj[field]
      return val !== undefined && val !== null ? String(val) : ""
    })
    .join("")

  const calculatedHmac = createHmac("sha512", hmacSecret).update(concatenated).digest("hex")
  return calculatedHmac.toLowerCase() === receivedHmac.toLowerCase()
}
