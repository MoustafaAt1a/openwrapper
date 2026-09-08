import { and, eq, isNull } from "drizzle-orm"
import { after } from "next/server"
import { getApiKeyEnvironment, hashApiKey } from "@/lib/api-key-service"
import { db } from "@/lib/db"
import { apiKeys, apiRequests } from "@/lib/db/schema"

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization")
  const xApiKey = request.headers.get("x-api-key")

  let token = ""
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    token = authorization.replace(/^Bearer\s+/i, "").trim()
  } else if (xApiKey) {
    token = xApiKey.trim()
  }

  if (!token) return null

  // 1. Support sandbox demo keys and ambient environment keys for frictionless testing
  const ambientKeys = process.env.OPENWRAPPER_API_KEYS
    ? process.env.OPENWRAPPER_API_KEYS.split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : []

  if (
    token === "ow_demo_sandbox_key" ||
    token === "ow_test_sandbox_demo" ||
    ambientKeys.includes(token)
  ) {
    const environment = getApiKeyEnvironment(token)
    return {
      id: 0,
      userId: "usr_sandbox_demo",
      name: "Sandbox Demo Key",
      prefix: token.slice(0, 12),
      lastFour: token.slice(-4),
      environment,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      revokedAt: null,
    }
  }

  const keyHash = hashApiKey(token)
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1)

  if (!key) return null

  return {
    ...key,
    environment: (key.environment as "live" | "test") || getApiKeyEnvironment(key.prefix),
  }
}

/** Fire-and-forget telemetry — does not block the HTTP response. */
export function scheduleApiRequestRecord(input: {
  userId: string
  apiKeyId?: number | null
  method: string
  endpoint: string
  statusCode: number
  startedAt: number
  routingLatencyMs?: number
  environment?: "live" | "test"
}) {
  after(async () => {
    await recordApiRequest(input).catch((err) => {
      console.warn("Failed to record API request telemetry:", err)
    })
  })
}

export async function recordApiRequest(input: {
  userId: string
  apiKeyId?: number | null
  method: string
  endpoint: string
  statusCode: number
  startedAt: number
  routingLatencyMs?: number
  environment?: "live" | "test"
}) {
  const now = new Date()
  const latencyMs = Math.max(1, Math.round(performance.now() - input.startedAt))
  const validKeyId = input.apiKeyId && input.apiKeyId > 0 ? input.apiKeyId : null
  const environment = input.environment ?? "live"

  const tasks: Promise<unknown>[] = [
    db.insert(apiRequests).values({
      userId: input.userId,
      apiKeyId: validKeyId,
      method: input.method,
      endpoint: input.endpoint,
      statusCode: input.statusCode,
      latencyMs,
      routingLatencyMs: input.routingLatencyMs ?? null,
      environment,
      createdAt: now,
    }),
  ]

  if (validKeyId) {
    tasks.push(
      db
        .update(apiKeys)
        .set({ lastUsedAt: now })
        .where(and(eq(apiKeys.id, validKeyId), eq(apiKeys.userId, input.userId))),
    )
  }

  await Promise.all(tasks)
}
