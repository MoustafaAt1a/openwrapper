import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, apiRequests, payments } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"

export interface ChartDataPoint {
  day: string
  requests: number
  errors: number
  successes: number
  volume: number
}

export interface DashboardMetrics {
  requests: number
  successRate: number
  latency: number
  activeKeys: number
  totalVolume: number
  totalPayments: number
  successfulPayments: number
  providerMix: string
  revenueChange: string
  revenueGrowthPositive: boolean
  ordersChange: string
  volumeSparkline: number[]
  ordersSparkline: number[]
  successSparkline: number[]
  latencySparkline: number[]
}

export async function getDashboardData(userId: string) {
  await ensureDatabaseSchema()

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)

  const paymentPostFilter = and(
    eq(apiRequests.userId, userId),
    eq(apiRequests.method, "POST"),
    eq(apiRequests.endpoint, "/api/v1/payments"),
    gte(apiRequests.createdAt, oneDayAgo)
  )

  try {
    const [
      keys,
      requests,
      totals,
      providerStats,
      recentPayments,
      volumeResult,
      weeklyRequestStats,
      monthlyRequestStats,
      priorWeekVolumeResult,
    ] = await Promise.all([
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
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 500 or ${apiRequests.statusCode} in (409, 502, 503))`,
          successes: sql<number>`count(*) filter (where ${apiRequests.statusCode} in (200, 201))`,
          latency: sql<number>`coalesce(
            round(avg(${apiRequests.routingLatencyMs}) filter (where ${apiRequests.routingLatencyMs} is not null)),
            round(avg(${apiRequests.latencyMs}) filter (where ${apiRequests.latencyMs} < 2000 and ${apiRequests.statusCode} < 500)),
            0
          )`,
        })
        .from(apiRequests)
        .where(paymentPostFilter),

      db
        .select({
          provider: payments.provider,
          count: count(),
        })
        .from(payments)
        .where(eq(payments.userId, userId))
        .groupBy(payments.provider),

      db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt))
        .limit(10),

      db
        .select({
          totalVolume: sql<number>`coalesce(sum(${payments.amountMinorUnits}), 0)`,
          totalPayments: count(),
          successfulPayments: sql<number>`count(*) filter (where ${payments.status} = 'succeeded')`,
        })
        .from(payments)
        .where(eq(payments.userId, userId)),

      // 7-day request daily stats
      db
        .select({
          dateStr: sql<string>`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          dayName: sql<string>`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'Dy')`,
          requests: count(),
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 500 or ${apiRequests.statusCode} in (409, 502, 503))`,
        })
        .from(apiRequests)
        .where(and(eq(apiRequests.userId, userId), gte(apiRequests.createdAt, sevenDaysAgo)))
        .groupBy(
          sql`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          sql`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'Dy')`
        ),

      // 30-day request daily stats
      db
        .select({
          dateStr: sql<string>`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          dayName: sql<string>`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'Mon DD')`,
          requests: count(),
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 500 or ${apiRequests.statusCode} in (409, 502, 503))`,
        })
        .from(apiRequests)
        .where(and(eq(apiRequests.userId, userId), gte(apiRequests.createdAt, thirtyDaysAgo)))
        .groupBy(
          sql`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          sql`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'Mon DD')`
        ),

      // Prior week volume (days 8-14)
      db
        .select({
          volume: sql<number>`coalesce(sum(${payments.amountMinorUnits}), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.userId, userId),
            gte(payments.createdAt, fourteenDaysAgo),
            sql`${payments.createdAt} < ${sevenDaysAgo}`
          )
        ),
    ])

    const summary = totals[0] ?? { requests: 0, errors: 0, successes: 0, latency: 0 }
    const volumeSummary = volumeResult[0] ?? { totalVolume: 0, totalPayments: 0, successfulPayments: 0 }
    const paymentAttempts = Number(summary.successes) + Number(summary.errors)
    const errorCount = Number(summary.errors)
    const successCount = Number(summary.successes)
    const totalPayments = Number(volumeSummary.totalPayments)
    const currentVolume = Number(volumeSummary.totalVolume)
    const priorVolume = Number(priorWeekVolumeResult[0]?.volume ?? 0)

    const providerCounts = new Map<string, number>()
    for (const row of providerStats) {
      providerCounts.set(row.provider, Number(row.count))
    }
    const providerMix = ["paymob", "fawry", "stripe"]
      .map((name) => {
        const count = providerCounts.get(name) ?? 0
        return count > 0 ? `${name.charAt(0).toUpperCase()}${name.slice(1)} ${count}` : null
      })
      .filter(Boolean)
      .join(" · ") || "No payments yet"

    // Build continuous 7-day timeline
    const weeklyMap = new Map<string, { requests: number; errors: number }>()
    weeklyRequestStats.forEach((r) => {
      weeklyMap.set(r.dateStr, {
        requests: Number(r.requests),
        errors: Number(r.errors),
      })
    })

    const weeklyChart: ChartDataPoint[] = []
    const volumeSparkline: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split("T")[0]
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" })
      const stat = weeklyMap.get(dateStr) || { requests: 0, errors: 0 }
      weeklyChart.push({
        day: dayName,
        requests: stat.requests,
        errors: stat.errors,
        successes: Math.max(0, stat.requests - stat.errors),
        volume: 0,
      })
      volumeSparkline.push(stat.requests)
    }

    // Build continuous 30-day timeline
    const monthlyMap = new Map<string, { requests: number; errors: number }>()
    monthlyRequestStats.forEach((r) => {
      monthlyMap.set(r.dateStr, {
        requests: Number(r.requests),
        errors: Number(r.errors),
      })
    })

    const monthlyChart: ChartDataPoint[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split("T")[0]
      const dayName = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const stat = monthlyMap.get(dateStr) || { requests: 0, errors: 0 }
      monthlyChart.push({
        day: dayName,
        requests: stat.requests,
        errors: stat.errors,
        successes: Math.max(0, stat.requests - stat.errors),
        volume: 0,
      })
    }

    // Dynamic Growth Calculation
    let revenueChange = "No transactions yet"
    let revenueGrowthPositive = true
    if (currentVolume > 0 && priorVolume === 0) {
      revenueChange = "+100% vs last week"
      revenueGrowthPositive = true
    } else if (currentVolume > 0 && priorVolume > 0) {
      const diffPct = ((currentVolume - priorVolume) / priorVolume) * 100
      revenueChange = `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}% vs last week`
      revenueGrowthPositive = diffPct >= 0
    } else if (currentVolume === 0) {
      revenueChange = "0% volume this week"
      revenueGrowthPositive = true
    }

    const dailySuccessRates: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split("T")[0]
      const stat = weeklyMap.get(dateStr) || { requests: 0, errors: 0 }
      const attempts = stat.requests
      dailySuccessRates.push(
        attempts > 0 ? Math.round(((attempts - stat.errors) / attempts) * 100) : 100
      )
    }

    const routingLatency = Number(summary.latency)
    const latencySparkline = Array.from({ length: 7 }, () => Math.max(1, routingLatency))

    return {
      keys,
      requests,
      payments: recentPayments,
      weeklyChart,
      monthlyChart,
      metrics: {
        requests: paymentAttempts,
        successRate: paymentAttempts ? (successCount / paymentAttempts) * 100 : 100,
        latency: routingLatency,
        activeKeys: keys.length,
        totalVolume: currentVolume,
        totalPayments,
        successfulPayments: Number(volumeSummary.successfulPayments),
        providerMix,
        revenueChange,
        revenueGrowthPositive,
        ordersChange: providerMix,
        volumeSparkline: volumeSparkline.map((v) => Math.max(10, v * 10)),
        ordersSparkline: volumeSparkline.map((v) => Math.max(10, v * 8)),
        successSparkline: dailySuccessRates.length ? dailySuccessRates : [100, 100, 100, 100, 100, 100, 100],
        latencySparkline: latencySparkline.length ? latencySparkline : [1],
      },
    }
  } catch (error) {
    console.warn("Failed to fetch dashboard data:", error)
    const emptyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      requests: 0,
      errors: 0,
      successes: 0,
      volume: 0,
    }))

    return {
      keys: [],
      requests: [],
      payments: [],
      weeklyChart: emptyDays,
      monthlyChart: emptyDays,
      metrics: {
        requests: 0,
        successRate: 100,
        latency: 0,
        activeKeys: 0,
        totalVolume: 0,
        totalPayments: 0,
        successfulPayments: 0,
        providerMix: "No payments yet",
        revenueChange: "No transactions yet",
        revenueGrowthPositive: true,
        ordersChange: "No payments yet",
        volumeSparkline: [10, 10, 10, 10, 10, 10, 10],
        ordersSparkline: [10, 10, 10, 10, 10, 10, 10],
        successSparkline: [100, 100, 100, 100, 100, 100, 100],
        latencySparkline: [10, 10, 10, 10, 10, 10, 10],
      },
    }
  }
}
