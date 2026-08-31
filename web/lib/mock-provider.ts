export interface MockPaymentInput {
  provider: "mock_paymob" | "mock_fawry" | string
  amountMinorUnits: number
  currency: string
  merchantReference?: string
  description?: string
}

export function createMockPayment(input: MockPaymentInput) {
  const isFawry = input.provider.includes("fawry")
  const id = `mock_${Math.random().toString(36).substring(2, 12)}`

  if (isFawry) {
    const reference = `9${Math.floor(10000000 + Math.random() * 90000000)}`
    return {
      providerReference: reference,
      status: "pending" as const,
      nextAction: {
        type: "pay_at_reference" as const,
        reference,
        instructions: `[Sandbox] Pay at any Fawry retail outlet using reference code: ${reference}`,
      },
    }
  }

  // Paymob / Card Mock
  const redirectUrl = `https://accept.paymob.com/unifiedcheckout/?mock=true&payment_id=${id}`
  return {
    providerReference: id,
    status: "pending" as const,
    nextAction: {
      type: "redirect_to_url" as const,
      url: redirectUrl,
    },
  }
}
