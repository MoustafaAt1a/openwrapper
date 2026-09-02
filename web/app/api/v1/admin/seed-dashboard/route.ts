import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { authenticateApiRequest, scheduleApiRequestRecord } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { seedDashboardDemoForUser } from "@/lib/seed-dashboard-demo"
import { invalidateDashboardData } from "@/lib/dashboard-data"

/** Sandbox-only: replace workspace telemetry with spread demo data for UI testing. */
export async function POST(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json({ error: { code: "authentication_error", message: "Missing or invalid API key" } }, { status: 401 })
  }

  if (process.env.ALLOW_DASHBOARD_SEED !== "1") {
    return NextResponse.json(
      { error: { code: "unsupported_capability", message: "Dashboard seed is disabled in this environment." } },
      { status: 403 }
    )
  }

  try {
    const [account] = await db.select({ email: user.email }).from(user).where(eq(user.id, key.userId)).limit(1)
    const result = await seedDashboardDemoForUser(key.userId, key.id, account?.email ?? "")
    invalidateDashboardData(key.userId)
    scheduleApiRequestRecord({
      userId: key.userId,
      apiKeyId: key.id,
      method: "POST",
      endpoint: "/api/v1/admin/seed-dashboard",
      statusCode: 200,
      startedAt,
      routingLatencyMs: Math.round(performance.now() - startedAt),
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Dashboard seed failed:", err)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Dashboard seed failed." } },
      { status: 500 }
    )
  }
}
