# OpenWrapper Canonical Code Style Guide (CODE_STYLE.md)
**Version**: `0.2.0 LTS`  
**Status**: Authoritative Reference Manual  
**Cross-Reference**: See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for visual design tokens, palettes, and component aesthetics.

---

## 1. Architectural Principles & Invariants

All code in `apps/web` must strictly adhere to the following monorepo and architectural invariants:
- **Invariant I1 (Discrete Integer Minor Units)**: Monetary amounts must be handled and stored as discrete `i64` minor units (`amount_minor_units` / `amountMinorUnits`). Never perform floating-point calculations (`number` without rounding) on currency values. Use `formatMinorUnits` from `@/lib/utils`.
- **Invariant I3 (No Secret Persistence)**: Merchant payment provider credentials must never be written to database tables or logged in client telemetry.
- **Invariant I8 (Synchronized Manifest Versions)**: All package manifests across the monorepo must share the exact version string (`0.2.0`).

---

## 2. File & Directory Organization

### File Naming Conventions
- **React Components**: `kebab-case.tsx` (e.g. `credential-vault-manager.tsx`, `enterprise-auth-form.tsx`).
- **Utilities & Services**: `kebab-case.ts` (e.g. `dashboard-telemetry-service.ts`, `code-formatter.ts`).
- **Next.js App Router Routes**: Fixed naming convention:
  - `page.tsx` for route views
  - `layout.tsx` for route layouts
  - `error.tsx` for error boundaries
  - `not-found.tsx` for 404 handlers
  - `route.ts` for API handlers
- **Tests**: `*.test.ts` or `*.test.tsx` located in `apps/web/test/`.
- **Barrel Exports**: Every component directory must have an `index.ts` re-exporting its members.

### Directory Structure & Responsibilities
```
apps/web/
├── app/                  # Next.js 15 App Router pages, layouts, and API routes
├── components/           # Marketing, feature consoles, and compound layouts
│   ├── dashboard/        # Merchant control plane telemetry, charts, and tables
│   ├── ui/               # Reusable foundational UI primitives (@base-ui/react, CVA)
│   └── index.ts          # Barrel aggregator
├── lib/                  # Services, database ORM, telemetry, cryptography, utilities
│   ├── db/               # Drizzle ORM schema and client
│   ├── graphql/          # GraphQL schema, resolvers, and route runner
│   └── index.ts          # Barrel aggregator
├── test/                 # Test suites (WCAG AA contrast, invariants, GraphQL, auth)
└── scripts/              # Verification, audit, and migration scripts
```

---

## 3. Component Architecture & Patterns

### Functional Components Only
- **Zero Class Components**: All components must be written as functional components using modern React 19 hooks.
- **Naming & Export Pattern**:
  1. Component functions must use `PascalCase` and be exported as named declarations.
  2. For backwards compatibility and ergonomic re-exporting, alias exports and default exports must be placed at the bottom of the file:
  ```tsx
  export function TelemetryMetricCard({ label, value, hint, color }: TelemetryMetricCardProps) {
    return (
      <div className="...">
        ...
      </div>
    )
  }

  export const MetricCard = TelemetryMetricCard
  export default TelemetryMetricCard
  ```

### Client vs. Server Directives
- **Server Components by Default**: Next.js App Router pages and data-fetching layouts are Server Components unless interactivity requires hooks.
- **Explicit `"use client"`**: Must be the very first line in files that utilize:
  - React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`)
  - Browser navigation hooks (`useRouter`, `usePathname`, `useParams`, `useSearchParams`)
  - DOM event listeners (`onClick`, `onChange`, `onSubmit`, `onKeyDown`)
  - Browser APIs (`navigator.clipboard`, `window`, `document`)

---

## 4. TypeScript Guidelines & Strictness

### TypeScript Compiler Settings
- Configured with `strict: true`, `noImplicitAny: true`, `target: ES2022`, and `moduleResolution: Bundler`.

### Type Definitions vs. Interfaces
- **Component Props**: Always declare using `interface`:
  ```tsx
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "xl" | "icon" | "icon-sm"
    pill?: boolean
    asChild?: boolean
  }
  ```
- **Unions, Tuples & Function Types**: Use `type`:
  ```tsx
  export type DisplayPaymentStatus = "initiated" | "pending" | "successful" | "failed" | "requires_action" | "refunded"
  export type TokenLine = TokenSpan[]
  ```

### Type Imports
- Explicitly annotate type imports using `import type` or inline `type` specifiers:
  ```tsx
  import type { ReactNode } from "react"
  import { useMemo, useState, type ComponentProps } from "react"
  ```

---

## 5. Import Ordering & Grouping Hierarchy

Imports must be grouped in this exact sequence, separated by a single empty line:

1. **React & Framework Core**:
   ```tsx
   import { useEffect, useMemo, useState } from "react"
   import Link from "next/link"
   import { usePathname, useRouter } from "next/navigation"
   ```
2. **Third-Party External Libraries**:
   ```tsx
   import { ArrowRight, Check, Copy } from "lucide-react"
   import { motion } from "motion/react"
   ```
3. **Internal UI Primitives (`@/components/ui/`)**:
   ```tsx
   import { Button } from "@/components/ui/button"
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
   import { Badge } from "@/components/ui/badge"
   ```
4. **Internal Components (`@/components/`)**:
   ```tsx
   import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
   import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
   ```
5. **Internal Services & Utilities (`@/lib/`)**:
   ```tsx
   import { getDashboardData } from "@/lib/dashboard-telemetry-service"
   import { formatCurrency, formatMinorUnits } from "@/lib/utils"
   ```
6. **Types & Constants**:
   ```tsx
   import type { SdkDoc } from "@/lib/sdk-registry"
   import { OPENWRAPPER_VERSION_TAG } from "@/lib/version"
   ```

---

## 6. Formatting & Toolchain Enforcement

The repository utilizes **Oxc** (`oxlint` + `oxfmt`) for rapid, deterministic linting and formatting.

### Formatting Rules (`.oxfmtrc.json`)
- **Indentation**: 2 spaces (`tabWidth: 2`, `useTabs: false`).
- **Semicolons**: Disabled (`semi: false`).
- **Quotes**: Double quotes (`singleQuote: false`).
- **Trailing Commas**: All (`trailingComma: "all"`).
- **Print Width**: 100 characters (`printWidth: 100`).
- **Bracket Spacing**: Enabled (`bracketSpacing: true`).

### Linting Rules (`.oxlintrc.json`)
- 181 active rules spanning `typescript`, `unicorn`, `oxc`, `react`, `nextjs`, and `jsx-a11y`.
- Unused variables are flagged as warnings (`no-unused-vars: "warn"`). Unused parameter variables must start with an underscore (`_`).
- React JSX keys are strictly enforced (`react/jsx-key: "error"`).
- HTML anchor tags for internal navigation are forbidden (`nextjs/no-html-link-for-pages: "error"`); always use Next.js `<Link>`.

---

## 7. State Management & Data Flow

- **Local UI State**: Use `useState` or `useReducer` for component-level toggles, tabs, and form field values.
- **Derived State**: Compute during render or with `useMemo`. Never store derived values in duplicate state variables.
- **Route & Search State**: Use URL search parameters (`useSearchParams` / `useRouter.push`) for filters, search queries, and pagination so states are deep-linkable and bookmarkable.
- **Ambient Context**: Use React Context sparingly for global cross-cutting concerns (e.g. `EnvironmentContext` for Live/Test mode toggle, `ThemeProvider` for light/dark mode).
- **Server Data**: Fetch data on the server in Server Components using direct service functions (`getDashboardData`, `getPaymentsLedger`) and pass down via props.

---

## 8. Error Handling & Accessibility

- **Error Boundaries**: Every top-level route must be guarded by `error.tsx` providing informative error diagnostics, recovery buttons, and crash metadata export.
- **Form Validation**: Always handle loading, disabled, and error states gracefully. Use `<FieldError>` from `@/components/ui/field`.
- **Keyboard Navigation**: Interactive elements must be keyboard focusable (`Tab`), support `Enter`/`Space` activation, and show canonical focus rings (`focus-visible:ring-2 focus-visible:ring-ring`).
- **Accessibility Labels**: Every icon-only button must have an explicit `aria-label`. All SVGs without text must provide `aria-hidden="true"` or accessible `<title>` elements.
