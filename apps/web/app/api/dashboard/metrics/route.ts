import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/lib/dashboard-data"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const envParam = searchParams.get("environment")
  const cookieHeader = request.headers.get("cookie") || ""
  const cookieMatch = cookieHeader.match(/openwrapper_dashboard_mode=(live|test)/)
  const cookieEnv = cookieMatch ? (cookieMatch[1] as "live" | "test") : null
  const environment: "live" | "test" =
    envParam === "live" || envParam === "test" ? envParam : (cookieEnv ?? "live")

  const data = await getDashboardData(session.user.id, environment)
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
