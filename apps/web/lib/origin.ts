export const DEFAULT_WEB_ORIGIN = "https://openwrapper.muejam.com"
export const DEFAULT_GATEWAY_ORIGIN = "https://gateway.openwrapper.muejam.com"

export function isPublicHost(url?: string | null): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    !lower.includes(".internal") &&
    !lower.includes("localhost") &&
    !lower.includes("127.0.0.1") &&
    !lower.includes("0.0.0.0") &&
    !lower.includes(":8080")
  )
}

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
    if (cleanHost && isPublicHost(cleanHost)) {
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

  if (envOrigin && isPublicHost(envOrigin)) return envOrigin

  return process.env.NODE_ENV === "production" ? DEFAULT_WEB_ORIGIN : "http://localhost:3000"
}

export function resolveGatewayOrigin(): string {
  const candidate = process.env.NEXT_PUBLIC_GATEWAY_URL || process.env.GATEWAY_PUBLIC_URL
  if (candidate && isPublicHost(candidate)) {
    const sanitized = sanitizeOrigin(candidate)
    if (sanitized) return sanitized
  }

  return DEFAULT_GATEWAY_ORIGIN
}
