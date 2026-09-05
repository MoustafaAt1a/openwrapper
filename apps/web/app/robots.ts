import type { MetadataRoute } from "next"
import { resolvePublicOrigin } from "@/lib/origin"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolvePublicOrigin()

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
