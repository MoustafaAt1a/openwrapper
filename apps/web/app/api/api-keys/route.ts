import { and, desc, eq, isNull } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getApiKeyEnvironment, issueApiKey } from "@/lib/api-key-service"
import { auth } from "@/lib/auth"
import { invalidateDashboardData } from "@/lib/dashboard-telemetry-service"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { apiKeys } from "@/lib/db/schema"

const createKeySchema = z.object({
  name: z.string().trim().min(2).max(40),
  environment: z.enum(["live", "test"]).default("live"),
})

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function GET(request: Request) {
  await ensureDatabaseSchema()
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const envParam = searchParams.get("environment")
  const envFilter = envParam === "live" || envParam === "test" ? envParam : null

  const conditions = [eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)]
  if (envFilter) {
    conditions.push(eq(apiKeys.environment, envFilter))
  }

  const rawKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastFour: apiKeys.lastFour,
      environment: apiKeys.environment,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(...conditions))
    .orderBy(desc(apiKeys.createdAt))

  const keys = rawKeys.map((k) => ({
    ...k,
    environment: (k.environment as "live" | "test") || getApiKeyEnvironment(k.prefix),
  }))

  return NextResponse.json({ keys }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  await ensureDatabaseSchema()
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = createKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a valid name (2-40 characters) and environment." },
      { status: 400 },
    )
  }

  const generated = issueApiKey(parsed.data.environment)
  await db.insert(apiKeys).values({
    userId: user.id,
    name: parsed.data.name,
    keyHash: generated.keyHash,
    prefix: generated.prefix,
    lastFour: generated.lastFour,
    environment: generated.environment,
  })

  invalidateDashboardData(user.id, generated.environment as "live" | "test")
  return NextResponse.json(
    { key: generated.key, environment: generated.environment },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  )
}

export async function DELETE(request: Request) {
  await ensureDatabaseSchema()
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let id: number
  try {
    const body = await request.json()
    id = Number(body.id)
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid key ID." }, { status: 400 })
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))

  invalidateDashboardData(user.id)
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
}
