import { buildSchema } from "graphql"

export const schema = buildSchema(`
  """
  LTS v0.1.3 OpenWrapper Financial Ledger & Telemetry GraphQL Schema.
  All monetary quantities are strictly represented in integer minor units (e.g. cents, piastres).
  """
  type Payment {
    id: ID!
    userId: String
    apiKeyId: Int
    idempotencyKey: String!
    requestFingerprint: String!
    provider: String!
    providerReference: String
    status: String!
    amountMinorUnits: Int!
    currency: String!
    merchantReference: String
    description: String
    customerPhone: String
    customerEmail: String
    customerName: String
    nextActionType: String
    nextActionPayload: String
    metadataJson: String
    createdAt: String!
    updatedAt: String!
  }

  type ApiRequest {
    id: ID!
    userId: String!
    apiKeyId: Int
    method: String!
    endpoint: String!
    statusCode: Int!
    latencyMs: Int!
    routingLatencyMs: Int
    createdAt: String!
  }

  type ApiKey {
    id: ID!
    userId: String!
    name: String!
    prefix: String!
    lastFour: String!
    createdAt: String!
    lastUsedAt: String
    revokedAt: String
  }

  type ProviderMixPoint {
    provider: String!
    count: Int!
    settledCount: Int
    settledVolumeMinor: Int
    settlementRate: Float
  }

  type DashboardMetrics {
    apiSuccessRate24h: Float
    paymentSettlementRate: Float
    settledVolumeMinor: Int!
    initiatedVolumeMinor: Int!
    totalPayments: Int!
    pendingPayments: Int!
    routingLatencyP50: Float
    routingLatencyP95: Float
    activeKeys: Int!
    providerMix: [ProviderMixPoint!]!
  }

  type ChartDataPoint {
    day: String!
    requests: Int!
    errors: Int!
    successes: Int!
    volume: Int!
    settledVolume: Int!
  }

  type HealthStatus {
    status: String!
    timestamp: String!
    version: String!
    database: String!
    gatewayGrpc: String!
  }

  type MerchantViewer {
    id: ID!
    email: String
    name: String
    metrics: DashboardMetrics!
    payments(status: String, provider: String, limit: Int = 50, offset: Int = 0): [Payment!]!
    payment(id: ID!): Payment
    apiRequests(limit: Int = 20, offset: Int = 0): [ApiRequest!]!
    apiKeys: [ApiKey!]!
    timeline(days: Int = 7): [ChartDataPoint!]!
  }

  type Query {
    viewer: MerchantViewer
    health: HealthStatus!
    payment(id: ID!): Payment
    payments(status: String, provider: String, limit: Int = 50, offset: Int = 0): [Payment!]!
    metrics: DashboardMetrics!
    timeline(days: Int = 7): [ChartDataPoint!]!
  }
`)
