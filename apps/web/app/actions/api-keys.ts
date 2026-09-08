"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { issueApiKey } from "@/lib/api-key-service"
import { auth } from "@/lib/auth"
import { invalidateDashboardData } from "@/lib/dashboard-telemetry-service"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { apiKeys } from "@/lib/db/schema"

async function getUserId() {
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (!currentSession?.user) throw new Error("Unauthorized")
  return currentSession.user.id
}

const nameSchema = z.string().trim().min(2).max(40)

export async function createApiKey(name: string, environment: "live" | "test" = "live") {
  await ensureDatabaseSchema()
  const userId = await getUserId()
  const parsed = nameSchema.safeParse(name)
  if (!parsed.success) return { error: "Use a name between 2 and 40 characters." }

  const generated = issueApiKey(environment)
  const rows = await db
    .insert(apiKeys)
    .values({
      userId,
      name: parsed.data,
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      lastFour: generated.lastFour,
      environment: generated.environment,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastFour: apiKeys.lastFour,
      environment: apiKeys.environment,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })

  invalidateDashboardData(userId)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/api-keys")
  return {
    key: generated.key,
    keyRow: rows[0],
    environment: generated.environment,
  }
}

export async function revokeApiKey(id: number) {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid key." }
  await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
  invalidateDashboardData(userId)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/api-keys")
  return { success: true }
}

export async function removeAllKeysAction() {
  const userId = await getUserId()
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId))
  invalidateDashboardData(userId)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/api-keys")
  return { success: true }
}
