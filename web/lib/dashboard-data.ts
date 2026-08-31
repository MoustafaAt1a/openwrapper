import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, apiRequests, payments } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"

export async function getDashboardData(userId: string) {
  await ensureDatabaseSchema()

  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)

  try {
    const [keys, requests, totals, daily, recentPayments, volumeResult] = await Promise.all([
      db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
        .orderBy(desc(apiKeys.createdAt)),
      db
        .select()
        .from(apiRequests)
        .where(eq(apiRequests.userId, userId))
        .orderBy(desc(apiRequests.createdAt))
        .limit(10),
      db
        .select({
          requests: count(),
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)`,
          latency: sql<number>`coalesce(round(avg(${apiRequests.latencyMs})), 0)`,
        })
        .from(apiRequests)
        .where(eq(apiRequests.userId, userId)),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${apiRequests.createdAt}), 'Dy')`,
          requests: count(),
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)`,
        })
        .from(apiRequests)
        .where(and(eq(apiRequests.userId, userId), gte(apiRequests.createdAt, since)))
        .groupBy(sql`date_trunc('day', ${apiRequests.createdAt})`)
        .orderBy(sql`date_trunc('day', ${apiRequests.createdAt})`),
      db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt))
        .limit(10),
      db
        .select({
          totalVolume: sql<number>`coalesce(sum(${payments.amountMinorUnits}), 0)`,
          successfulPayments: sql<number>`count(*) filter (where ${payments.status} = 'succeeded')`,
        })
        .from(payments)
        .where(eq(payments.userId, userId)),
    ])

    const summary = totals[0] ?? { requests: 0, errors: 0, latency: 0 }
    const volumeSummary = volumeResult[0] ?? { totalVolume: 0, successfulPayments: 0 }
    const requestCount = Number(summary.requests)
    const errorCount = Number(summary.errors)

    return {
      keys,
      requests,
      payments: recentPayments,
      chart: daily.map((item) => ({
        ...item,
        requests: Number(item.requests),
        errors: Number(item.errors),
      })),
      metrics: {
        requests: requestCount,
        successRate: requestCount ? ((requestCount - errorCount) / requestCount) * 100 : 100,
        latency: Number(summary.latency),
        activeKeys: keys.length,
        totalVolume: Number(volumeSummary.totalVolume),
        successfulPayments: Number(volumeSummary.successfulPayments),
      },
    }
  } catch (error) {
    console.warn("Failed to fetch dashboard data:", error)
    return {
      keys: [],
      requests: [],
      payments: [],
      chart: [],
      metrics: {
        requests: 0,
        successRate: 100,
        latency: 0,
        activeKeys: 0,
        totalVolume: 0,
        successfulPayments: 0,
      },
    }
  }
}
