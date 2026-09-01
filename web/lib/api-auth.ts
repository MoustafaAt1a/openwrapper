import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, apiRequests } from "@/lib/db/schema"
import { hashApiKey } from "@/lib/api-keys"

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization")
  const xApiKey = request.headers.get("x-api-key")

  let token = ""
  if (authorization?.startsWith("Bearer ")) {
    token = authorization.slice(7).trim()
  } else if (authorization) {
    token = authorization.trim()
  } else if (xApiKey) {
    token = xApiKey.trim()
  }

  if (!token) return null

  const keyHash = hashApiKey(token)
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1)

  return key ?? null
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
}) {
  void recordApiRequest(input).catch((err) => {
    console.warn("Failed to record API request telemetry:", err)
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
}) {
  const now = new Date()
  const latencyMs = Math.max(1, Math.round(performance.now() - input.startedAt))

  const tasks: Promise<unknown>[] = [
    db.insert(apiRequests).values({
      userId: input.userId,
      apiKeyId: input.apiKeyId ?? null,
      method: input.method,
      endpoint: input.endpoint,
      statusCode: input.statusCode,
      latencyMs,
      routingLatencyMs: input.routingLatencyMs ?? null,
      createdAt: now,
    }),
  ]

  if (input.apiKeyId) {
    tasks.push(
      db
        .update(apiKeys)
        .set({ lastUsedAt: now })
        .where(and(eq(apiKeys.id, input.apiKeyId), eq(apiKeys.userId, input.userId)))
    )
  }

  await Promise.all(tasks)
}
