/**
 * OpenWrapper Web Component Registry
 * Enterprise clean, advanced naming with backward-compatible export aliases.
 */

// Ambient Visual Canvas
export {
  AmbientFlowingRibbon,
  StripeSwoosh,
  SovereignSwoosh,
} from "./ambient-flowing-ribbon"
export type { AmbientFlowingRibbonProps } from "./ambient-flowing-ribbon"

// Brand & Infrastructure Identity
export {
  BrandLogoMark,
  BrandLogoMark as Brand,
} from "./brand-logo-mark"
export {
  AmbientGeometricShape,
  AmbientGeometricShape as GeometricShape,
} from "./ambient-geometric-shape"
export type { ShapeColor } from "./ambient-geometric-shape"
export {
  AtmosphericGradientMesh,
  AtmosphericGradientMesh as GradientMesh,
  AtmosphericGradientMesh as StripeGradientMesh,
} from "./atmospheric-gradient-mesh"
export {
  SovereignRailBackbone,
  SovereignRailBackbone as SovereignBackbone,
} from "./sovereign-rail-backbone"
export {
  FaqKnowledgeAccordion,
  FaqKnowledgeAccordion as FaqSection,
} from "./faq-knowledge-accordion"
export {
  StructuredDataMetadata,
  StructuredDataMetadata as StructuredData,
  StructuredDataMetadata as StructuredDataSchema,
} from "./structured-data-metadata"

// Navigation Systems
export {
  GlobalHeaderNavigation,
  GlobalHeaderNavigation as SiteHeader,
} from "./global-header-navigation"
export {
  GlobalFooterNavigation,
  GlobalFooterNavigation as SiteFooter,
} from "./global-footer-navigation"

// Authentication Architecture
export {
  EnterpriseAuthForm,
  EnterpriseAuthForm as AuthForm,
} from "./enterprise-auth-form"
export {
  EnterpriseAuthShell,
  EnterpriseAuthShell as AuthPage,
} from "./enterprise-auth-shell"

// Payment Control Plane & Orchestration Consoles
export {
  ControlPlaneShell,
  ControlPlaneShell as DashboardShell,
} from "./control-plane-shell"
export {
  CredentialVaultManager,
  CredentialVaultManager as ApiKeyManager,
} from "./credential-vault-manager"
export type { ApiKeyRow } from "./credential-vault-manager"
export {
  PaymentOrchestratorConsole,
  PaymentOrchestratorConsole as ApiExplorer,
} from "./payment-orchestrator-console"
export {
  ProviderMatrixConsole,
  ProviderMatrixConsole as ProvidersClient,
} from "./provider-matrix-console"
export {
  DeveloperSdkHub,
  DeveloperSdkHub as SdkGuideClient,
} from "./developer-sdk-hub"
export {
  DeveloperTerminalConsole,
  DeveloperTerminalConsole as CodeTerminal,
} from "./developer-terminal-console"
export {
  PaymentSimulatorWidget,
  PaymentSimulatorWidget as HeroPaymentWidget,
} from "./payment-simulator-widget"
export {
  TransactionFlowDiagram,
  TransactionFlowDiagram as ArchitectureFlow,
} from "./transaction-flow-diagram"
export {
  MultiRailCheckoutExperience,
  MultiRailCheckoutExperience as CheckoutExperience,
} from "./multi-rail-checkout-experience"

// Bento Architecture Diagrams
export {
  MobileCheckoutMockup,
  LedgerTelemetryMockup,
  SovereignCardMockup,
  ZeroKnowledgeSecurityMockup,
} from "./interactive-architecture-bento"

// Telemetry & Ledger Dashboard Primitives
export {
  DashboardPageHeader,
  DashboardPageHeader as PageHeader,
} from "./dashboard/dashboard-page-header"
export {
  TelemetryMetricCard,
  TelemetryMetricCard as MetricCard,
} from "./dashboard/telemetry-metric-card"
export type { MetricAccentColor } from "./dashboard/telemetry-metric-card"
export {
  PaymentStatusBadge,
  PaymentStatusBadge as StatusBadge,
} from "./dashboard/payment-status-badge"
export type { DisplayPaymentStatus } from "./dashboard/payment-status-badge"
export {
  LiveRequestTelemetryTable,
  LiveRequestTelemetryTable as LiveTelemetryTable,
} from "./dashboard/live-request-telemetry-table"
export type { ApiRequestRecord } from "./dashboard/live-request-telemetry-table"
export {
  AuthoritativeTransactionLedgerTable,
  AuthoritativeTransactionLedgerTable as TransactionLedgerTable,
} from "./dashboard/authoritative-transaction-ledger-table"
export type { PaymentRecord } from "./dashboard/authoritative-transaction-ledger-table"
export {
  WebhookDeliveryAuditTable,
  WebhookDeliveryAuditTable as WebhookDeliveriesTable,
} from "./dashboard/webhook-delivery-audit-table"
export type { WebhookRecord } from "./dashboard/webhook-delivery-audit-table"
export {
  LatencyDistributionChart,
  LatencyDistributionChart as LatencyTrendChart,
} from "./dashboard/latency-distribution-chart"
export type { LatencyBucket } from "./dashboard/latency-distribution-chart"
export {
  ProviderRailMixChart,
  ProviderRailMixChart as ProviderMixChart,
} from "./dashboard/provider-rail-mix-chart"
export {
  ProviderRailPerformanceChart,
  ProviderRailPerformanceChart as ProviderPerformanceChart,
} from "./dashboard/provider-rail-performance-chart"
export {
  StatusSettlementDistributionChart,
  StatusSettlementDistributionChart as StatusDistributionChart,
} from "./dashboard/status-settlement-distribution-chart"
export {
  SettlementVolumeTrendChart,
  SettlementVolumeTrendChart as VolumeTrendChart,
} from "./dashboard/settlement-volume-trend-chart"
