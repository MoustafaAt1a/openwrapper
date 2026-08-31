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
  // Ignore harmless client disconnects / stream early close when client refreshes or closes tab
  if (
    msg.includes("destination stream closed early") ||
    msg.includes("ERR_STREAM_PREMATURE_CLOSE") ||
    msg.includes("aborted")
  ) {
    return
  }

  console.error(`[Server Request Error] ${request.method} ${request.path}:`, err)
}
