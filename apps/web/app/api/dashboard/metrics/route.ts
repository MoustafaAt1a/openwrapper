import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/lib/dashboard-data"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const data = await getDashboardData(session.user.id)
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
