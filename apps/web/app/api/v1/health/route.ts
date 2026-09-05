import { NextResponse } from "next/server"
import { authenticateApiRequest, scheduleApiRequestRecord } from "@/lib/api-auth"
import { pool } from "@/lib/db"
import { getGatewayUrl } from "@/lib/gateway-bridge"

import { resolvePublicOrigin } from "@/lib/origin"

function siteOrigin(request?: Request): string {
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    const proto = request.headers.get("x-forwarded-proto")
    return resolvePublicOrigin(host, proto)
  }
  return resolvePublicOrigin()
}

export async function GET(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)

  if (!key) {
    return NextResponse.json(
      { status: "ok", version: "0.1.3" },
      { headers: { "Cache-Control": "no-store" } },
    )
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
      version: "0.1.3",
      service: "openwrapper-web",
      timestamp: new Date().toISOString(),
      origin: siteOrigin(request),
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
