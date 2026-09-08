"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import {
  type MerchantSettingsData,
  generateWebhookSecret,
  updateMerchantSettings,
} from "@/lib/merchant-settings-service"

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

export async function saveMerchantSettingsAction(
  data: Partial<Omit<MerchantSettingsData, "userId" | "createdAt" | "updatedAt">>,
) {
  const user = await getSessionUser()
  const updated = await updateMerchantSettings(user.id, data)
  revalidatePath("/dashboard/settings")
  return { success: true, settings: updated }
}

export async function regenerateWebhookSecretAction() {
  const user = await getSessionUser()
  const newSecret = generateWebhookSecret()
  const updated = await updateMerchantSettings(user.id, { webhookSecret: newSecret })
  revalidatePath("/dashboard/settings")
  return { success: true, secret: newSecret, settings: updated }
}
