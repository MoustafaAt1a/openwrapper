import type { MetadataRoute } from "next"
import { resolvePublicOrigin } from "@/lib/origin"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = resolvePublicOrigin()

  const now = new Date()

  return [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dashboard/documentation`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]
}
