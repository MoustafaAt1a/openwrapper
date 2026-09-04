export async function register() {
  // Server-side initialization if needed
}

export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string
    method: string
    headers: { [key: string]: string | string[] | undefined }
  }
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

  console.error(`[Server Request Error] ${request.method} ${request.path}:`, err)
}
