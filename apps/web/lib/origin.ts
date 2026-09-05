export const DEFAULT_WEB_ORIGIN = "https://openwrapper.muejam.com"
export const DEFAULT_GATEWAY_ORIGIN = "https://gateway.openwrapper.muejam.com"

export function sanitizeOrigin(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim().replace(/\/+$/, "")
  if (!trimmed) return null
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.origin
  } catch {
    return null
  }
}

export function resolvePublicOrigin(headerHost?: string | null, proto?: string | null): string {
  if (headerHost) {
    const cleanHost = headerHost.trim().replace(/\/+$/, "")
    if (cleanHost && !cleanHost.includes("localhost") && !cleanHost.includes("127.0.0.1")) {
      const scheme = proto?.toLowerCase() === "http" ? "http" : "https"
      return `${scheme}://${cleanHost}`
    }
  }

  const envOrigin =
    sanitizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    sanitizeOrigin(process.env.BETTER_AUTH_URL) ||
    sanitizeOrigin(process.env.APP_URL) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (envOrigin) return envOrigin

  return process.env.NODE_ENV === "production" ? DEFAULT_WEB_ORIGIN : "http://localhost:3000"
}

export function resolveGatewayOrigin(): string {
  const envGateway =
    sanitizeOrigin(process.env.NEXT_PUBLIC_GATEWAY_URL) ||
    sanitizeOrigin(process.env.OPENWRAPPER_GATEWAY_URL) ||
    sanitizeOrigin(process.env.GATEWAY_URL)

  if (envGateway) return envGateway

  return process.env.NODE_ENV === "production" ? DEFAULT_GATEWAY_ORIGIN : "http://localhost:8080"
}
