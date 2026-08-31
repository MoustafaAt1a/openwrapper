import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, apiRequests } from "@/lib/db/schema"
import { hashApiKey } from "@/lib/api-keys"
import { ensureDatabaseSchema } from "@/lib/db/init"

export async function authenticateApiRequest(request: Request) {
  await ensureDatabaseSchema()

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

export async function recordApiRequest(input: {
  userId: string
  apiKeyId?: number | null
  method: string
  endpoint: string
  statusCode: number
  startedAt: number
}) {
  try {
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
  } catch (error) {
    console.warn("Failed to record API request telemetry:", error)
  }
}
