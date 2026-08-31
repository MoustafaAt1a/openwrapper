import { auth } from "@/lib/auth"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { toNextJsHandler } from "better-auth/next-js"
import { NextRequest } from "next/server"

const handlers = toNextJsHandler(auth)

export async function GET(req: NextRequest) {
  await ensureDatabaseSchema()
  return handlers.GET(req)
}

export async function POST(req: NextRequest) {
  await ensureDatabaseSchema()
  return handlers.POST(req)
}
