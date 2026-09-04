import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "production"
        ? "https://openwrapper.muejam.com"
        : "http://localhost:3000")

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/checkout", "/sign-in", "/sign-up", "/dashboard/documentation"],
        disallow: [
          "/api/",
          "/dashboard/payments",
          "/dashboard/api-keys",
          "/dashboard/requests",
          "/dashboard/providers",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "Applebot",
        ],
        allow: ["/", "/checkout", "/dashboard/documentation"],
        disallow: ["/api/", "/dashboard/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
