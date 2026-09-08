# OpenWrapper Frontend Audit Working Notes (NOTES.md)
**Status**: Active Working Document (Phase 1 Comprehension)  
**Date**: September 2026  
**Auditor**: Senior Staff Frontend Architect, Design-Systems Architect, & Code-Style Lead  

---

## 0. Monorepo Scope Boundary & Exclusions

- **In Scope (Frontend Read/Write Pass)**:
  - `apps/web/`: The entire Next.js 15 App Router platform, marketing website, GraphiQL explorer, developer documentation, and merchant control plane.
  - `apps/web/app/`: Route segments, layouts, server actions, route handlers, error boundaries.
  - `apps/web/components/`: Core UI primitives (`components/ui/`), dashboard widgets (`components/dashboard/`), marketing & interactive bento widgets (`components/`).
  - `apps/web/lib/`: Frontend database clients, telemetry services, syntax highlighters, GraphQL schema, auth client.
  - `apps/web/test/`: Frontend integration tests, contrast tests, invariant assertions.
  - `apps/web/scripts/`: Frontend static token audit scripts and verification harnesses.

- **Excluded from Scope (Monorepo Backend / Infra / Multi-Language SDKs)**:
  - `crates/core`: Zero-I/O Rust domain model and canonical payment provider state machines. Excluded to preserve Invariant I2 (AST separation).
  - `crates/providers/*`: Rust adapters for Paymob, Fawry, Stripe, Kashier, and Mock.
  - `apps/gateway`: Axum 0.7 Tokio HTTP and Tonic gRPC server binary.
  - `sdk/typescript`: Separate published npm library `@openwrapper/sdk`. Excluded from visual styling pass (pure headless SDK client).
  - `sdk/dotnet`: .NET 8/9 C# NuGet package.
  - `sdk/php`: PHP 8.1+ PSR-18 Composer client.
  - `proto/`: Protocol Buffer contracts (`openwrapper/v1/payment.proto`).
  - `docs/openapi/`: OpenAPI 3.1.0 specifications (`openapi.yaml`, `openapi.json`).
  - Reason: These are backend engines, contracts, and multi-language SDK runtimes with zero UI rendering surfaces.

---

## 1. Directory-by-Directory Architectural Role & Style Inventory

### `apps/web/app/`
- **Role**: Next.js 15 App Router routes, page layouts, route handlers, and error boundaries.
- **Key Files**:
  - `page.tsx`: Marketing homepage with hero, bento architecture, regional rails, payment simulator, terminal, FAQs.
  - `layout.tsx`: Root layout with font injection (Inter, Geist Mono), theme provider, and analytics.
  - `globals.css`: Tailwind CSS v4 directives (`@theme`, `@custom-variant`), CSS variables (`:root`, `.dark`), utility classes (`.font-tnum`, `.stripe-card-shadow-*`).
  - `error.tsx`: Interactive error boundary with live ingress health probe, JSON crash diagnostic export, and reset controls.
  - `not-found.tsx`: Dynamic 404 handler with fuzzy route finder and live gateway wire health probe.
  - `brand/page.tsx`: Brand guidelines, color swatches, logo usage specifications.
  - `checkout/page.tsx`: Multi-rail checkout sandbox runner.
  - `dashboard/`: Merchant control plane with payments, requests, documentation, api-keys, providers, settings.
  - `sdk/` & `sdk/[slug]/`: SDK hub and language detail documentation (TypeScript, PHP, .NET).
  - `login/` & `register/`: Authentication routes wrapping `EnterpriseAuthShell`.
  - `terms/page.tsx` & `privacy/page.tsx`: Legal policies.
- **Styling Approaches**:
  - Tailwind CSS v4 utility classes.
  - Semantic theme variables (`bg-primary`, `text-foreground`, `border-border`, `bg-card`, `bg-muted`).
  - Framer Motion (`motion/react`) for ambient mesh animations and reactive micro-interactions.
- **Code Style Patterns**:
  - Server components by default where applicable (`login/page.tsx`, `register/page.tsx`, `dashboard/page.tsx`).
  - `"use client"` explicit on pages requiring interactive state (`page.tsx`, `brand/page.tsx`, `sdk/page.tsx`, `sdk/[slug]/page.tsx`).
  - Dynamic route segment typing with `useParams<{ slug: string }>()`.

### `apps/web/components/ui/`
- **Role**: Foundational UI Primitives built on top of `@base-ui/react` and `class-variance-authority` (CVA).
- **Key Files**:
  - `button.tsx`: CVA button supporting variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), sizes (`default`, `sm`, `lg`, `icon`, `icon-sm`, `xl`), and `pill` boolean prop.
  - `card.tsx`: Card container with `border border-border bg-card stripe-card-shadow-sm`.
  - `badge.tsx`: CVA badge supporting `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `chip`.
  - `field.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`: Form primitives with accessible labels and error handling.
  - `sheet.tsx`, `tooltip.tsx`, `sonner.tsx`, `separator.tsx`, `table.tsx`: Overlay and structural primitives.
  - `index.ts`: Barrel export aggregating all UI primitives.
- **Styling Approaches**:
  - Base UI unstyled accessible DOM components.
  - CVA with strict variant maps.
  - Tailwind utility classes merged via `cn` (`clsx` + `tailwind-merge`).
- **Code Style Patterns**:
  - Functional components with React 19 forwardRef patterns or Base UI render props.
  - Interface-first prop contracts (`interface ButtonProps`, `interface CardProps`).
  - Component export convention: both named exports and default/alias exports (`export const Button = ...; export default Button;`).

### `apps/web/components/dashboard/`
- **Role**: Control plane analytics, charts, metric cards, and tabular audit widgets.
- **Key Files**:
  - `dashboard-page-header.tsx`: Standard page title, description, and action pill header.
  - `telemetry-metric-card.tsx`: KPI summary cards with 4 accent border options (`border-l-primary`, `border-l-emerald-500`, `border-l-violet-500`, `border-l-amber-500`) and hover shadow lift.
  - `payment-status-badge.tsx`: Status indicator for payment state machines (`Initiated`, `Pending`, `RequiresAction`, `Successful`, `Failed`, `Refunded`).
  - `provider-rail-mix-chart.tsx`: Horizontal stacked distribution chart.
  - `provider-rail-performance-chart.tsx`: Rail settlement efficiency bars.
  - `settlement-volume-trend-chart.tsx`: Volume and error trend telemetry.
  - `authoritative-transaction-ledger-table.tsx`: Authoritative ledger with pagination, filters, and JSON drawer.
  - `live-request-telemetry-table.tsx`: Real-time request log table.
  - `webhook-delivery-audit-table.tsx`: Webhook attempt delivery logs.
  - `index.ts`: Barrel export aggregating all dashboard widgets.
- **Styling Approaches**:
  - Tailwind CSS v4 tokens (`bg-card`, `border-border`, `text-foreground`, `stripe-card-shadow-sm`).
  - Recharts responsive SVG containers with CSS variable fill/stroke bindings.
  - Non-visual WCAG AA tabular accessible fallbacks (`sr-only` tables alongside SVGs).
- **Code Style Patterns**:
  - Strict TypeScript props contracts.
  - Date formatting delegated to canonical utilities in `@/lib/utils` (`formatShortDate`, `formatDate`).
  - Monetary amounts formatted through `@/lib/utils` (`formatMinorUnits`, `formatCurrency`).

### `apps/web/components/` (Shared & Marketing)
- **Role**: Feature consoles, interactive bentos, authentication shells, global navigation.
- **Key Files**:
  - `global-header-navigation.tsx`: Sticky navigation with passive throttled scroll listener, active intersection observer, and mobile sheet drawer.
  - `global-footer-navigation.tsx`: 6-column platform site map and trademark information.
  - `enterprise-auth-shell.tsx` & `enterprise-auth-form.tsx`: Zero-knowledge login and registration experience.
  - `interactive-architecture-bento.tsx`: 4 interactive architecture cards (Mobile Checkout, Real-time Ledger, Zero-Knowledge TLS Vault, Sovereign Card Rail).
  - `developer-terminal-console.tsx`: Interactive multi-tab cURL / SDK code execution console.
  - `payment-simulator-widget.tsx`: Sandbox payment execution simulator.
  - `provider-matrix-console.tsx`: Configuration manager for Paymob, Fawry, Stripe, and Mock.
  - `credential-vault-manager.tsx`: Production and test API key generator and revocation manager.
  - `payment-orchestrator-console.tsx`: Interactive endpoint request builder.
  - `transaction-flow-diagram.tsx`: Animated multi-rail transaction pipeline SVG diagram.
  - `multi-rail-checkout-experience.tsx`: Full reference checkout experience with POS voucher ticket and 3DS modal.
  - `ambient-flowing-ribbon.tsx` & `atmospheric-gradient-mesh.tsx`: High-performance background visual meshes.
  - `index.ts`: Barrel export.
- **Styling Approaches**:
  - Strictly canonical tokens: `border-border`, `bg-card`, `bg-primary`, `stripe-card-shadow-sm`.
  - SVG conduits styled with CSS variables (`var(--border)`, `var(--primary)`).
- **Code Style Patterns**:
  - Standard file naming: `kebab-case.tsx`.
  - Named exports with component aliases.

### `apps/web/lib/`
- **Role**: Backend services, data fetching, database ORM, syntax highlighting, cryptography.
- **Key Files**:
  - `auth.ts` & `auth-client.ts`: Better Auth integration (server and client).
  - `dashboard-telemetry-service.ts`: Query functions for dashboard metrics, provider mix, volume charts, and payment lists.
  - `payment-ledger-service.ts`: Database queries for payments with environment isolation (`live` vs `test`).
  - `payment-status-resolver.ts`: Normalization of gateway statuses to user-facing badges.
  - `code-syntax-highlighter.tsx`: Prism.js code block highlighter and interactive JSON viewer.
  - `cryptographic-signatures.ts`: HMAC SHA-256 webhook signature verification.
  - `gateway-bridge.ts`: HTTP communication with the Axum gateway (:8080).
  - `gateway-grpc.ts`: Tonic gRPC client (:50051).
  - `graphql/`: GraphQL schema, resolvers, and route handler.
  - `utils.ts`: String, date, and discrete integer currency formatting (`formatMinorUnits`).
- **Code Style Patterns**:
  - `camelCase.ts` and `kebab-case.ts`.
  - Pure functions where possible; async functions with explicit error handling.

---

## 2. Design System Inventory & Canonical Standards

- **Primary Brand Color**:
  - Light mode: `#533afd` (Electric Indigo)
  - Dark mode: `#665efd` (Electric Indigo Soft)
  - Hover: `#4434d4` (Indigo Deep)
  - Active/Pressed: `#2e2b8c` (Indigo Press)
- **Neutral Palette**:
  - Light: Canvas `#ffffff`, Card `#ffffff`, Secondary `#f6f9fc`, Foreground `#0d253d`, Muted Foreground `#64748d`, Border `#e3e8ee`
  - Dark: Canvas `#080b14`, Card `#0f1426`, Secondary `#141b33`, Foreground `#f6f9fc`, Muted Foreground `#8ca3ba`, Border `#1e2646`
- **Shadow Scale**:
  - Card default: `stripe-card-shadow-sm`
  - Card hover: `stripe-card-shadow-hover`
  - Floating / Dialog / Hero: `stripe-card-shadow-lg`
  - Micro / Inline: `stripe-card-shadow-xs`
- **Radii**:
  - Buttons / Chips / Badges: `rounded-full` (`pill`)
  - Cards & Bentos: `rounded-2xl`
  - Sub-elements & Inputs: `rounded-xl`
  - Badges & Micro-controls: `rounded-lg`

---

## 3. Code Style Inventory & Canonical Standards

- **File Naming**:
  - Components: `kebab-case.tsx` (e.g. `credential-vault-manager.tsx`)
  - Utilities / Services: `kebab-case.ts` (e.g. `dashboard-telemetry-service.ts`)
  - Next.js Routes: `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`
  - Barrel Index: `index.ts` in major folders (`components/`, `components/ui/`, `components/dashboard/`)
- **Component Declaration**:
  - Use functional components with named exports:
    ```tsx
    export function MyComponent(props: MyComponentProps) { ... }
    export const MyComponentAlias = MyComponent
    export default MyComponent
    ```
- **TypeScript Conventions**:
  - Use `interface ComponentProps` for public component prop contracts.
  - Use `type` for unions, primitives, and utility types.
  - Explicit typing on public functions and exported utilities.
  - Import types explicitly: `import type { ReactNode } from "react"` or `import { type ReactNode, useState } from "react"`.
- **Import Ordering Convention**:
  1. React & Next.js core (`react`, `next/link`, `next/navigation`, `next/headers`)
  2. External dependencies (`lucide-react`, `motion`, `recharts`, `better-auth`)
  3. UI primitives (`@/components/ui/...`)
  4. Internal feature components (`@/components/...`)
  5. Internal libraries & services (`@/lib/...`)
  6. Types & constants
- **Toolchain Conventions**:
  - Linter: `oxlint` (181 rules)
  - Formatter: `oxfmt` (2 spaces, no semicolons, double quotes, trailing commas)
  - Typecheck: `tsc --noEmit`
