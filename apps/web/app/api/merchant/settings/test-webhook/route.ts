import crypto from "node:crypto"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { webhookEvents } from "@/lib/db/schema"
import { signWebhookPayload } from "@/lib/merchant-settings-service"

const testWebhookSchema = z.object({
  webhookUrl: z.string().trim().url(),
  webhookSecret: z.string().trim().min(16),
})

export async function POST(request: Request) {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = testWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Please enter a valid Webhook Destination URL (e.g. https://your-domain.com/webhook).",
      },
      { status: 400 },
    )
  }

  const { webhookUrl, webhookSecret } = parsed.data

  const eventId = `evt_ping_${crypto.randomBytes(8).toString("hex")}`
  const pingPayload = JSON.stringify({
    event_id: eventId,
    event_type: "openwrapper.ping",
    created_at: new Date().toISOString(),
    environment: "live",
    data: {
      message: "OpenWrapper webhook verification ping",
      merchant_id: session.user.id,
      timestamp: Date.now(),
    },
  })

  const { header } = signWebhookPayload(pingPayload, webhookSecret)

  const startTime = performance.now()
  let responseStatus = 0
  let responseText = ""
  let errorMessage: string | null = null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "OpenWrapper-Webhook-Notifier/1.0",
        "X-OpenWrapper-Signature": header,
      },
      body: pingPayload,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    responseStatus = res.status
    responseText = await res.text().catch(() => "")
  } catch (err: unknown) {
    const error = err as Error
    if (error.name === "AbortError") {
      errorMessage = "Request timed out after 10 seconds."
    } else {
      errorMessage = error.message || "Failed to reach destination URL."
    }
  }

  const latencyMs = Math.round(performance.now() - startTime)

  // Log the test ping event to webhookEvents table for auditing
  try {
    await db
      .insert(webhookEvents)
      .values({
        eventId,
        provider: "openwrapper_system",
        payloadJson: pingPayload,
        signature: header,
        receivedAt: new Date(),
      })
      .onConflictDoNothing()
  } catch {
    // Non-critical audit log error
  }

  if (errorMessage) {
    return NextResponse.json(
      {
        success: false,
        delivered: false,
        status: responseStatus,
        latencyMs,
        error: errorMessage,
        message: `Failed to deliver ping: ${errorMessage} (${latencyMs}ms)`,
      },
      { status: 200 },
    )
  }

  const isSuccess = responseStatus >= 200 && responseStatus < 300
  return NextResponse.json(
    {
      success: isSuccess,
      delivered: true,
      status: responseStatus,
      latencyMs,
      responseSnippet: responseText.slice(0, 100),
      message: isSuccess
        ? `Ping delivered successfully (HTTP ${responseStatus} OK, latency: ${latencyMs}ms)`
        : `Destination responded with HTTP ${responseStatus} in ${latencyMs}ms`,
    },
    { status: 200 },
  )
}
