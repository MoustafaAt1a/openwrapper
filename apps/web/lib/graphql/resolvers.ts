import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, apiRequests, payments } from "@/lib/db/schema"
import { getDashboardData } from "@/lib/dashboard-data"

export interface GraphQLContext {
  userId?: string | null
  userEmail?: string | null
  userName?: string | null
}

export const rootResolver = {
  health: () => {
    const grpcAddr = process.env.OPENWRAPPER_GATEWAY_GRPC_ADDR || process.env.GATEWAY_GRPC_URL
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.2",
      database: "connected",
      gatewayGrpc: grpcAddr ? "configured" : "fallback_to_http",
    }
  },

  viewer: async (_args: unknown, context: GraphQLContext) => {
    if (!context.userId) {
      return null
    }
    return {
      id: context.userId,
      email: context.userEmail ?? null,
      name: context.userName ?? null,
    }
  },

  payment: async ({ id }: { id: string }, context: GraphQLContext) => {
    const conditions = [eq(payments.id, id)]
    if (context.userId) {
      conditions.push(eq(payments.userId, context.userId))
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(...conditions))
      .limit(1)

    if (!payment) return null

    return {
      ...payment,
      amountMinorUnits: Number(payment.amountMinorUnits),
      createdAt: payment.createdAt instanceof Date ? payment.createdAt.toISOString() : String(payment.createdAt),
      updatedAt: payment.updatedAt instanceof Date ? payment.updatedAt.toISOString() : String(payment.updatedAt),
    }
  },

  payments: async (
    {
      status,
      provider,
      limit = 50,
      offset = 0,
    }: { status?: string; provider?: string; limit?: number; offset?: number },
    context: GraphQLContext,
  ) => {
    const conditions = []
    if (context.userId) {
      conditions.push(eq(payments.userId, context.userId))
    }
    if (status) {
      conditions.push(eq(payments.status, status))
    }
    if (provider) {
      conditions.push(eq(payments.provider, provider))
    }

    const safeLimit = Math.min(Math.max(1, limit), 100)
    const safeOffset = Math.max(0, offset)

    const rows = await db
      .select()
      .from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(safeLimit)
      .offset(safeOffset)

    return rows.map((p) => ({
      ...p,
      amountMinorUnits: Number(p.amountMinorUnits),
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    }))
  },

  metrics: async (_args: unknown, context: GraphQLContext) => {
    const effectiveUserId = context.userId || "anonymous"
    const data = await getDashboardData(effectiveUserId)
    return data.metrics
  },

  timeline: async ({ days = 7 }: { days?: number }, context: GraphQLContext) => {
    const effectiveUserId = context.userId || "anonymous"
    const data = await getDashboardData(effectiveUserId)
    return days > 7 ? data.monthlyChart : data.weeklyChart
  },

  MerchantViewer: {
    metrics: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const data = await getDashboardData(context.userId!)
      return data.metrics
    },
    payments: async (
      _parent: unknown,
      args: { status?: string; provider?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      return rootResolver.payments(args, context)
    },
    payment: async (_parent: unknown, args: { id: string }, context: GraphQLContext) => {
      return rootResolver.payment(args, context)
    },
    apiRequests: async (
      _parent: unknown,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      const safeLimit = Math.min(Math.max(1, limit), 100)
      const safeOffset = Math.max(0, offset)
      const rows = await db
        .select()
        .from(apiRequests)
        .where(eq(apiRequests.userId, context.userId!))
        .orderBy(desc(apiRequests.createdAt))
        .limit(safeLimit)
        .offset(safeOffset)

      return rows.map((r) => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }))
    },
    apiKeys: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, context.userId!))
        .orderBy(desc(apiKeys.createdAt))

      return rows.map((k) => ({
        ...k,
        createdAt: k.createdAt instanceof Date ? k.createdAt.toISOString() : String(k.createdAt),
        lastUsedAt: k.lastUsedAt instanceof Date ? k.lastUsedAt.toISOString() : k.lastUsedAt ? String(k.lastUsedAt) : null,
        revokedAt: k.revokedAt instanceof Date ? k.revokedAt.toISOString() : k.revokedAt ? String(k.revokedAt) : null,
      }))
    },
    timeline: async (_parent: unknown, { days = 7 }: { days?: number }, context: GraphQLContext) => {
      const data = await getDashboardData(context.userId!)
      return days > 7 ? data.monthlyChart : data.weeklyChart
    },
  },
}
