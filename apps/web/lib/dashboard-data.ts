import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { apiKeys, apiRequests, payments } from "@/lib/db/schema"

const METRICS_CACHE_TTL_MS = 30_000
const METRICS_CACHE_MAX_ENTRIES = 500
const metricsCache = new Map<
  string,
  { at: number; data: Awaited<ReturnType<typeof fetchDashboardDataUncached>> }
>()

export interface ChartDataPoint {
  day: string
  requests: number
  errors: number
  successes: number
  volume: number
  settledVolume: number
}

export interface ProviderMixPoint {
  provider: string
  count: number
}

export interface DashboardMetrics {
  apiSuccessRate24h: number
  paymentSettlementRate: number
  settledVolumeMinor: number
  initiatedVolumeMinor: number
  totalPayments: number
  pendingPayments: number
  routingLatencyP50: number
  routingLatencyP95: number
  activeKeys: number
  providerMix: ProviderMixPoint[]
}

const PROVIDERS = ["paymob", "fawry", "stripe"] as const

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}

function buildDailyTimeline(
  now: Date,
  days: number,
  labelFn: (d: Date) => string,
  requestMap: Map<string, { requests: number; errors: number }>,
  volumeMap: Map<string, { initiated: number; settled: number }>,
): ChartDataPoint[] {
  const points: ChartDataPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split("T")[0]
    const req = requestMap.get(dateStr) || { requests: 0, errors: 0 }
    const vol = volumeMap.get(dateStr) || { initiated: 0, settled: 0 }
    points.push({
      day: labelFn(d),
      requests: req.requests,
      errors: req.errors,
      successes: Math.max(0, req.requests - req.errors),
      volume: vol.initiated,
      settledVolume: vol.settled,
    })
  }
  return points
}

export async function getDashboardData(userId: string) {
  const cached = metricsCache.get(userId)
  if (cached && Date.now() - cached.at < METRICS_CACHE_TTL_MS) {
    return cached.data
  }
  const data = await fetchDashboardDataUncached(userId)
  if (metricsCache.size >= METRICS_CACHE_MAX_ENTRIES) {
    const oldestUserId = metricsCache.keys().next().value
    if (oldestUserId) metricsCache.delete(oldestUserId)
  }
  metricsCache.set(userId, { at: Date.now(), data })
  return data
}

export function invalidateDashboardData(userId: string) {
  metricsCache.delete(userId)
}

async function fetchDashboardDataUncached(userId: string) {
  await ensureDatabaseSchema()

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)

  const paymentPostFilter = and(
    eq(apiRequests.userId, userId),
    eq(apiRequests.method, "POST"),
    eq(apiRequests.endpoint, "/api/v1/payments"),
    gte(apiRequests.createdAt, oneDayAgo),
  )

  try {
    const [
      keys,
      requests,
      apiTotals,
      providerStats,
      recentPayments,
      paymentTotals,
      pendingCount,
      weeklyRequestStats,
      monthlyRequestStats,
      weeklyPaymentVolume,
      monthlyPaymentVolume,
      routingLatencies,
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
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)`,
          successes: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 200 and ${apiRequests.statusCode} < 300)`,
        })
        .from(apiRequests)
        .where(paymentPostFilter),

      db
        .select({ provider: payments.provider, count: count() })
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
          initiatedVolume: sql<number>`coalesce(sum(${payments.amountMinorUnits}), 0)`,
          settledVolume: sql<number>`coalesce(sum(${payments.amountMinorUnits}) filter (where ${payments.status} = 'succeeded'), 0)`,
          totalPayments: count(),
          successfulPayments: sql<number>`count(*) filter (where ${payments.status} = 'succeeded')`,
        })
        .from(payments)
        .where(eq(payments.userId, userId)),

      db
        .select({ count: count() })
        .from(payments)
        .where(
          and(
            eq(payments.userId, userId),
            sql`(${payments.status} = 'pending' OR (${payments.status} = 'unknown' AND (${payments.nextActionType} IS NOT NULL OR ${payments.nextActionPayload} IS NOT NULL)))`,
          ),
        ),

      db
        .select({
          dateStr: sql<string>`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          requests: count(),
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)`,
        })
        .from(apiRequests)
        .where(and(eq(apiRequests.userId, userId), gte(apiRequests.createdAt, sevenDaysAgo)))
        .groupBy(sql`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),

      db
        .select({
          dateStr: sql<string>`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          requests: count(),
          errors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)`,
        })
        .from(apiRequests)
        .where(and(eq(apiRequests.userId, userId), gte(apiRequests.createdAt, thirtyDaysAgo)))
        .groupBy(sql`to_char(${apiRequests.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),

      db
        .select({
          dateStr: sql<string>`to_char(${payments.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          initiated: sql<number>`coalesce(sum(${payments.amountMinorUnits}), 0)`,
          settled: sql<number>`coalesce(sum(${payments.amountMinorUnits}) filter (where ${payments.status} = 'succeeded'), 0)`,
        })
        .from(payments)
        .where(and(eq(payments.userId, userId), gte(payments.createdAt, sevenDaysAgo)))
        .groupBy(sql`to_char(${payments.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),

      db
        .select({
          dateStr: sql<string>`to_char(${payments.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          initiated: sql<number>`coalesce(sum(${payments.amountMinorUnits}), 0)`,
          settled: sql<number>`coalesce(sum(${payments.amountMinorUnits}) filter (where ${payments.status} = 'succeeded'), 0)`,
        })
        .from(payments)
        .where(and(eq(payments.userId, userId), gte(payments.createdAt, thirtyDaysAgo)))
        .groupBy(sql`to_char(${payments.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`),

      db
        .select({
          routing: apiRequests.routingLatencyMs,
          latency: apiRequests.latencyMs,
        })
        .from(apiRequests)
        .where(
          and(
            eq(apiRequests.userId, userId),
            gte(apiRequests.createdAt, oneDayAgo),
            eq(apiRequests.method, "POST"),
            eq(apiRequests.endpoint, "/api/v1/payments"),
          ),
        ),
    ])

    const apiSummary = apiTotals[0] ?? { requests: 0, errors: 0, successes: 0 }
    const paySummary = paymentTotals[0] ?? {
      initiatedVolume: 0,
      settledVolume: 0,
      totalPayments: 0,
      successfulPayments: 0,
    }

    const apiAttempts = Number(apiSummary.requests)
    const apiSuccesses = Number(apiSummary.successes)
    const totalPayments = Number(paySummary.totalPayments)
    const successfulPayments = Number(paySummary.successfulPayments)

    const providerCounts = new Map<string, number>()
    for (const row of providerStats) {
      providerCounts.set(row.provider, Number(row.count))
    }
    const providerMix: ProviderMixPoint[] = PROVIDERS.map((provider) => ({
      provider,
      count: providerCounts.get(provider) ?? 0,
    })).filter((p) => p.count > 0)

    const weeklyRequestMap = new Map<string, { requests: number; errors: number }>()
    weeklyRequestStats.forEach((r) => {
      weeklyRequestMap.set(r.dateStr, { requests: Number(r.requests), errors: Number(r.errors) })
    })
    const monthlyRequestMap = new Map<string, { requests: number; errors: number }>()
    monthlyRequestStats.forEach((r) => {
      monthlyRequestMap.set(r.dateStr, { requests: Number(r.requests), errors: Number(r.errors) })
    })

    const weeklyVolumeMap = new Map<string, { initiated: number; settled: number }>()
    weeklyPaymentVolume.forEach((r) => {
      weeklyVolumeMap.set(r.dateStr, {
        initiated: Number(r.initiated),
        settled: Number(r.settled),
      })
    })
    const monthlyVolumeMap = new Map<string, { initiated: number; settled: number }>()
    monthlyPaymentVolume.forEach((r) => {
      monthlyVolumeMap.set(r.dateStr, {
        initiated: Number(r.initiated),
        settled: Number(r.settled),
      })
    })

    const weeklyChart = buildDailyTimeline(
      now,
      7,
      (d) => d.toLocaleDateString("en-US", { weekday: "short" }),
      weeklyRequestMap,
      weeklyVolumeMap,
    )
    const monthlyChart = buildDailyTimeline(
      now,
      30,
      (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      monthlyRequestMap,
      monthlyVolumeMap,
    )

    const routingSamples = routingLatencies
      .map((r) => Number(r.routing ?? r.latency))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 2000)

    return {
      keys,
      requests,
      payments: recentPayments,
      weeklyChart,
      monthlyChart,
      metrics: {
        apiSuccessRate24h: apiAttempts ? (apiSuccesses / apiAttempts) * 100 : 100,
        paymentSettlementRate: totalPayments ? (successfulPayments / totalPayments) * 100 : 0,
        settledVolumeMinor: Number(paySummary.settledVolume),
        initiatedVolumeMinor: Number(paySummary.initiatedVolume),
        totalPayments,
        pendingPayments: Number(pendingCount[0]?.count ?? 0),
        routingLatencyP50: percentile(routingSamples, 50),
        routingLatencyP95: percentile(routingSamples, 95),
        activeKeys: keys.length,
        providerMix,
      } satisfies DashboardMetrics,
    }
  } catch (error) {
    console.warn("Failed to fetch dashboard data:", error)
    const emptyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      requests: 0,
      errors: 0,
      successes: 0,
      volume: 0,
      settledVolume: 0,
    }))

    return {
      keys: [],
      requests: [],
      payments: [],
      weeklyChart: emptyDays,
      monthlyChart: emptyDays,
      metrics: {
        apiSuccessRate24h: 100,
        paymentSettlementRate: 0,
        settledVolumeMinor: 0,
        initiatedVolumeMinor: 0,
        totalPayments: 0,
        pendingPayments: 0,
        routingLatencyP50: 0,
        routingLatencyP95: 0,
        activeKeys: 0,
        providerMix: [],
      },
    }
  }
}
