import { NextResponse } from "next/server"
import { authenticateApiRequest, recordApiRequest } from "@/lib/api-auth"
import { pool } from "@/lib/db"
import { getGatewayUrl } from "@/lib/gateway-bridge"

export async function GET(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)

  let dbHealthy = false
  try {
    const client = await pool.connect()
    try {
      await client.query("SELECT 1")
      dbHealthy = true
    } finally {
      client.release()
    }
  } catch (error) {
    console.warn("Health check DB probe error:", error)
    dbHealthy = false
  }

  const gatewayUrl = getGatewayUrl()
  let gatewayHealthy = false
  if (gatewayUrl) {
    try {
      const res = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/v1/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
      gatewayHealthy = res.ok
    } catch {
      gatewayHealthy = false
    }
  }

  const providers = {
    paymob: Boolean(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY),
    fawry: Boolean(process.env.FAWRY_MERCHANT_CODE && process.env.FAWRY_SECURE_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    sandbox: true,
  }

  if (key) {
    await recordApiRequest({
      userId: key.userId,
      apiKeyId: key.id,
      method: "GET",
      endpoint: "/api/v1/health",
      statusCode: 200,
      startedAt,
    })
  }

  return NextResponse.json({
    status: dbHealthy ? "healthy" : "degraded",
    service: "openwrapper-web",
    timestamp: new Date().toISOString(),
    database: dbHealthy ? "connected" : "disconnected",
    gateway_bridge: gatewayUrl ? (gatewayHealthy ? "connected" : "unreachable") : "standalone_mode",
    providers,
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
