const LEGACY_BLACKLISTED_HOSTS = ["web-production-884cd.up.railway.app"]

export function sanitizePublicOrigin(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim().replace(/\/+$/, "")
  if (!trimmed) return null
  for (const blacklisted of LEGACY_BLACKLISTED_HOSTS) {
    if (trimmed.includes(blacklisted)) return null
  }
  return trimmed
}

export function resolvePublicOrigin(headerHost?: string | null, proto?: string | null): string {
  if (headerHost) {
    const cleanHost = headerHost.trim().replace(/\/+$/, "")
    let isBlacklisted = false
    for (const blacklisted of LEGACY_BLACKLISTED_HOSTS) {
      if (cleanHost.includes(blacklisted)) {
        isBlacklisted = true
        break
      }
    }
    if (!isBlacklisted && cleanHost) {
      const scheme = proto?.toLowerCase() === "http" ? "http" : "https"
      return `${scheme}://${cleanHost}`
    }
  }

  const envOrigin =
    sanitizePublicOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    sanitizePublicOrigin(process.env.BETTER_AUTH_URL) ||
    sanitizePublicOrigin(
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
    ) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (envOrigin) return envOrigin

  return process.env.NODE_ENV === "production"
    ? "https://openwrapper.muejam.com"
    : "http://localhost:3000"
}
