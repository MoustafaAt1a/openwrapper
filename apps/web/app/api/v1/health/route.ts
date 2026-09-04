import { NextResponse } from "next/server"
import { authenticateApiRequest, scheduleApiRequestRecord } from "@/lib/api-auth"
import { pool } from "@/lib/db"
import { getGatewayUrl } from "@/lib/gateway-bridge"

function siteOrigin(): string {
  return (
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

export async function GET(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)

  if (!key) {
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } })
  }

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
  }

  const gatewayUrl = getGatewayUrl()
  let gatewayHealthy = false
  if (gatewayUrl) {
    try {
      const res = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/v1/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      })
      gatewayHealthy = res.ok
    } catch {
      gatewayHealthy = false
    }
  }

  if (key) {
    scheduleApiRequestRecord({
      userId: key.userId,
      apiKeyId: key.id,
      method: "GET",
      endpoint: "/api/v1/health",
      statusCode: dbHealthy ? 200 : 503,
      startedAt,
    })
  }

  return NextResponse.json(
    {
      status: dbHealthy ? "healthy" : "degraded",
      service: "openwrapper-web",
      timestamp: new Date().toISOString(),
      origin: siteOrigin(),
      database: dbHealthy ? "connected" : "disconnected",
      gateway_bridge: gatewayUrl
        ? gatewayHealthy
          ? "connected"
          : "unreachable"
        : "not_configured",
    },
    {
      status: dbHealthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
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
