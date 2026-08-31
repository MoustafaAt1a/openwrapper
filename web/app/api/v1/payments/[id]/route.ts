import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { authenticateApiRequest, recordApiRequest } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing or invalid API key." } },
      { status: 401 }
    )
  }

  const { id } = await context.params
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, id), eq(payments.userId, key.userId)))
    .limit(1)

  const statusCode = payment ? 200 : 404
  await recordApiRequest({
    userId: key.userId,
    apiKeyId: key.id,
    method: "GET",
    endpoint: "/api/v1/payments/:id",
    statusCode,
    startedAt,
  })

  if (!payment) {
    return NextResponse.json(
      { error: { code: "not_found", message: `Payment with id '${id}' not found.` } },
      { status: 404 }
    )
  }

  return NextResponse.json({
    payment_id: payment.id,
    provider: payment.provider,
    provider_reference: payment.providerReference,
    status: payment.status,
    amount_minor_units: payment.amountMinorUnits,
    currency: payment.currency,
    merchant_reference: payment.merchantReference,
    description: payment.description,
    customer: {
      phone: payment.customerPhone,
      email: payment.customerEmail,
      name: payment.customerName,
    },
    ...(payment.nextActionType
      ? {
          next_action:
            payment.nextActionType === "redirect_to_url"
              ? { type: "redirect_to_url", url: payment.nextActionPayload }
              : {
                  type: "pay_at_reference",
                  reference: payment.nextActionPayload,
                  instructions: payment.description || `Pay reference code: ${payment.nextActionPayload}`,
                },
        }
      : {}),
    created_at: payment.createdAt,
    updated_at: payment.updatedAt,
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      "Access-Control-Max-Age": "86400",
    },
  })
}
