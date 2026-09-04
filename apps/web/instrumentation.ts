export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
      const crypto = await import("node:crypto")
      const seed = process.env.BETTER_AUTH_SECRET || "openwrapper-lts-v0.1.3-encryption-seed"
      process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = crypto
        .createHash("sha256")
        .update(`openwrapper-server-actions:${seed}`)
        .digest("hex")
    }
  }
}

export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string | string[] | undefined }
  },
) {
  const msg = err?.message || ""
  const digest = err?.digest || ""

  // Suppress harmless stream / client disconnect errors that are
  // normal in production (tab close, navigation, RSC refresh overlap)
  if (
    msg.includes("destination stream closed early") ||
    msg.includes("ERR_STREAM_PREMATURE_CLOSE") ||
    msg.includes("aborted") ||
    msg.includes("client disconnected") ||
    msg.includes("stream closed") ||
    digest === "4294162118"
  ) {
    return
  }

  // Gracefully handle stale client build Server Action ID mismatches
  if (
    msg.includes("Server Reference ID") ||
    msg.includes("failed-to-find-server-action") ||
    msg.includes("Failed to find Server Action")
  ) {
    console.warn(
      `[Server Action] Stale client action reference received on ${request.method} ${request.path}. Client should reload.`,
    )
    return
  }

  console.error(`[Server Request Error] ${request.method} ${request.path}:`, err)
}

