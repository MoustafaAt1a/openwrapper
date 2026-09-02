"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { issueApiKey } from "@/lib/api-keys"
import { db } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { invalidateDashboardData } from "@/lib/dashboard-data"

async function getUserId() {
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (!currentSession?.user) throw new Error("Unauthorized")
  return currentSession.user.id
}

const nameSchema = z.string().trim().min(2).max(40)

export async function createApiKey(name: string) {
  await ensureDatabaseSchema()
  const userId = await getUserId()
  const parsed = nameSchema.safeParse(name)
  if (!parsed.success) return { error: "Use a name between 2 and 40 characters." }

  const generated = issueApiKey()
  await db.insert(apiKeys).values({
    userId,
    name: parsed.data,
    keyHash: generated.keyHash,
    prefix: generated.prefix,
    lastFour: generated.lastFour,
  })
  invalidateDashboardData(userId)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/api-keys")
  return { key: generated.key }
}

export async function revokeApiKey(id: number) {
  const userId = await getUserId()
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid key." }
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
  invalidateDashboardData(userId)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/api-keys")
  return { success: true }
}
