import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest, scheduleApiRequestRecord } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"
import { getPaymentFromRustGateway } from "@/lib/gateway-bridge"

function extractApiToken(request: Request): string | undefined {
  return (
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ||
    request.headers.get("x-api-key")?.trim() ||
    undefined
  )
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing or invalid API key." } },
      { status: 401 },
    )
  }

  const { id: rawId } = await context.params
  const parsedId = z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,128}$/)
    .safeParse(rawId)
  if (!parsedId.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid payment ID." } },
      { status: 400 },
    )
  }
  const id = parsedId.data
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, id), eq(payments.userId, key.userId)))
    .limit(1)

  if (!payment) {
    scheduleApiRequestRecord({
      userId: key.userId,
      apiKeyId: key.id,
      method: "GET",
      endpoint: "/api/v1/payments/:id",
      statusCode: 404,
      startedAt,
    })
    return NextResponse.json(
      { error: { code: "not_found", message: `Payment with id '${id}' not found.` } },
      { status: 404 },
    )
  }

  let status = payment.status
  let providerReference = payment.providerReference
  let nextActionType = payment.nextActionType
  let nextActionPayload = payment.nextActionPayload

  if (
    (payment.provider === "paymob" ||
      payment.provider === "fawry" ||
      payment.provider === "stripe") &&
    payment.status === "unknown"
  ) {
    const gatewayResult = await getPaymentFromRustGateway(
      id,
      extractApiToken(request),
      request.headers,
    )
    if (gatewayResult.ok) {
      status = gatewayResult.data.status
      providerReference = gatewayResult.data.provider_reference
      nextActionType = gatewayResult.data.next_action?.type || nextActionType
      nextActionPayload =
        gatewayResult.data.next_action?.url ||
        gatewayResult.data.next_action?.reference ||
        nextActionPayload

      if (status !== payment.status || providerReference !== payment.providerReference) {
        await db
          .update(payments)
          .set({
            status,
            providerReference,
            nextActionType,
            nextActionPayload,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id))
      }
    }
  }

  scheduleApiRequestRecord({
    userId: key.userId,
    apiKeyId: key.id,
    method: "GET",
    endpoint: "/api/v1/payments/:id",
    statusCode: 200,
    startedAt,
  })

  return NextResponse.json(
    {
      payment_id: payment.id,
      provider: payment.provider,
      provider_reference: providerReference,
      status,
      amount_minor_units: payment.amountMinorUnits,
      currency: payment.currency,
      merchant_reference: payment.merchantReference,
      description: payment.description,
      customer: {
        phone: payment.customerPhone,
        email: payment.customerEmail,
        name: payment.customerName,
      },
      ...(nextActionType
        ? {
            next_action:
              nextActionType === "redirect_to_url"
                ? { type: "redirect_to_url", url: nextActionPayload }
                : {
                    type: "pay_at_reference",
                    reference: nextActionPayload,
                    instructions: payment.description || `Pay reference code: ${nextActionPayload}`,
                  },
          }
        : {}),
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
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
