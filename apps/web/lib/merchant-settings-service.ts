import crypto from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { merchantSettings } from "@/lib/db/schema"

export interface MerchantSettingsData {
  userId: string
  orgName: string
  billingEmail: string
  currency: string
  webhookUrl: string
  webhookSecret: string
  brandLogoUrl: string
  brandColor: string
  brandName: string
  createdAt?: Date
  updatedAt?: Date
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`
}

export function signWebhookPayload(
  payload: string,
  secret: string,
): { timestamp: number; signature: string; header: string } {
  const timestamp = Math.floor(Date.now() / 1000)
  const signaturePayload = `${timestamp}.${payload}`
  const hmac = crypto.createHmac("sha256", secret).update(signaturePayload).digest("hex")
  return {
    timestamp,
    signature: hmac,
    header: `t=${timestamp},v1=${hmac}`,
  }
}

export async function getMerchantSettings(
  userId: string,
  defaultName?: string,
  defaultEmail?: string,
): Promise<MerchantSettingsData> {
  await ensureDatabaseSchema()

  const existing = await db
    .select()
    .from(merchantSettings)
    .where(eq(merchantSettings.userId, userId))
    .limit(1)

  if (existing.length > 0 && existing[0]) {
    const row = existing[0]
    return {
      userId: row.userId,
      orgName: row.orgName,
      billingEmail: row.billingEmail ?? defaultEmail ?? "",
      currency: row.currency,
      webhookUrl: row.webhookUrl ?? "",
      webhookSecret: row.webhookSecret,
      brandLogoUrl: row.brandLogoUrl ?? "",
      brandColor: row.brandColor ?? "#6366f1",
      brandName: row.brandName ?? defaultName ?? "",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  // Create default record for this user
  const initialSecret = generateWebhookSecret()
  const initialOrgName = defaultName ? `${defaultName}'s Organization` : "My Organization"
  const initialEmail = defaultEmail ?? ""
  const initialBrandName = defaultName ?? "My Brand"

  await db
    .insert(merchantSettings)
    .values({
      userId,
      orgName: initialOrgName,
      billingEmail: initialEmail,
      currency: "EGP",
      webhookUrl: "",
      webhookSecret: initialSecret,
      brandLogoUrl: "",
      brandColor: "#6366f1",
      brandName: initialBrandName,
    })
    .onConflictDoNothing()

  return {
    userId,
    orgName: initialOrgName,
    billingEmail: initialEmail,
    currency: "EGP",
    webhookUrl: "",
    webhookSecret: initialSecret,
    brandLogoUrl: "",
    brandColor: "#6366f1",
    brandName: initialBrandName,
  }
}

export async function updateMerchantSettings(
  userId: string,
  data: Partial<Omit<MerchantSettingsData, "userId" | "createdAt" | "updatedAt">>,
): Promise<MerchantSettingsData> {
  await ensureDatabaseSchema()

  await db
    .insert(merchantSettings)
    .values({
      userId,
      orgName: data.orgName ?? "My Organization",
      billingEmail: data.billingEmail ?? "",
      currency: data.currency ?? "EGP",
      webhookUrl: data.webhookUrl ?? "",
      webhookSecret: data.webhookSecret ?? generateWebhookSecret(),
      brandLogoUrl: data.brandLogoUrl ?? "",
      brandColor: data.brandColor ?? "#6366f1",
      brandName: data.brandName ?? "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: merchantSettings.userId,
      set: {
        ...(data.orgName !== undefined && { orgName: data.orgName }),
        ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
        ...(data.webhookSecret !== undefined && { webhookSecret: data.webhookSecret }),
        ...(data.brandLogoUrl !== undefined && { brandLogoUrl: data.brandLogoUrl }),
        ...(data.brandColor !== undefined && { brandColor: data.brandColor }),
        ...(data.brandName !== undefined && { brandName: data.brandName }),
        updatedAt: new Date(),
      },
    })

  return getMerchantSettings(userId)
}
