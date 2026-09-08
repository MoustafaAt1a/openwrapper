import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getMerchantSettings, updateMerchantSettings } from "@/lib/merchant-settings-service"

const settingsUpdateSchema = z.object({
  orgName: z.string().trim().min(2).max(100).optional(),
  billingEmail: z.string().trim().email().or(z.literal("")).optional(),
  currency: z.enum(["EGP", "SAR", "AED", "USD", "EUR"]).optional(),
  webhookUrl: z.string().trim().url().or(z.literal("")).optional(),
  webhookSecret: z.string().trim().min(16).optional(),
  brandLogoUrl: z.string().trim().max(500000).optional(), // Can hold base64 or URL
  brandColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  brandName: z.string().trim().max(100).optional(),
})

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = await getMerchantSettings(user.id, user.name, user.email)
  return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: Request) {
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

  const parsed = settingsUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings data", details: parsed.error.format() },
      { status: 400 },
    )
  }

  const updated = await updateMerchantSettings(user.id, parsed.data)
  return NextResponse.json(
    { settings: updated, success: true },
    { headers: { "Cache-Control": "no-store" } },
  )
}
