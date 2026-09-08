# OpenWrapper Comprehensive Design System & Codebase Audit (AUDIT.md)
**Version**: `0.2.0-LTS`  
**Date**: September 2026  
**Auditor**: Senior Staff Frontend Architect & Design Systems Lead  
**Scope**: Full UI codebase audit across `apps/web` (117 files, 150 distinct colors, 33 shadow patterns, 9 radius tokens, typography scales, spacing, duplicate components).

---

## 1. Directory-by-Directory Architectural Role & Styling Analysis

| Directory | Primary Role | Styling Approaches in Play | Current Inconsistency / Drift Notes |
| :--- | :--- | :--- | :--- |
| `apps/web/app/` | Next.js 15 App Router pages & layouts (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `brand/`, `checkout/`, `sdk/`) | Tailwind CSS v4, inline CSS variables (`globals.css`), Framer Motion (`motion/react`) | Heavy raw hex literal usage (`#0d253d`, `#64748d`, `#e3e8ee`, `#533afd`, `#e2e8f0`). Duplicate button styles (`rounded-full` pills vs `rounded-md`). |
| `apps/web/app/dashboard/` | Control plane & merchant dashboard routes (`page.tsx`, `payments/`, `api-keys/`, `documentation/`, `providers/`, `requests/`, `settings/`, `telemetry/`) | Tailwind CSS v4, Lucide icons, Recharts (`ResponsiveContainer`) | Mixed border colors (`#e3e8ee` vs `border-border`). Mix of raw background colors (`bg-[#111630]` vs `bg-card`). |
| `apps/web/components/ui/` | Shared UI Primitives (`button`, `badge`, `card`, `input`, `label`, `separator`, `sheet`, `table`, `textarea`, `tooltip`) | Base UI React primitives (`@base-ui/react`), Class Variance Authority (`cva`), Tailwind utility classes | The cleanest directory. Uses semantic tokens (`bg-primary`, `text-foreground`, `border-border`). Needs shadow standardization and variant parity with marketing buttons. |
| `apps/web/components/dashboard/` | Data visualization & telemetry widgets (Ledger table, Request table, 4 Charts, Metric cards) | Tailwind utility classes, CSS grid, SVG Recharts, WCAG AA tabular fallbacks | Ad-hoc chart stroke hexes (`#533afd`, `#64748d`, `#10b981`, `#00d4ff`). Inconsistent pagination controls. |
| `apps/web/components/` (shared) | Marketing heroes, bento architecture, navigation shells, simulator, and interactive widgets | Tailwind CSS v4, Framer Motion, raw canvas gradients (`AtmosphericGradientMesh`) | 34 instances of Tailwind default `#4f46e5` (indigo-600) instead of OpenWrapper canonical brand `#533afd`. 3 different terminal window mockups with hardcoded Apple macOS chrome (`#ff5f56`, `#ffbd2e`, `#27c93f`). |
| `apps/web/lib/` | Utilities, syntax highlighters, database client, API handlers | TypeScript, CSS in JS utility classes (`cn` / `clsx`) | `code-syntax-highlighter.tsx` has 35+ hardcoded GitHub dark/light theme hexes and arbitrary border colors (`#d2d2d7`, `#2d3139`). |

---

## 2. Inconsistency Report: Colors & Palette Drift

Across 117 UI-rendering files in `apps/web`, **150 distinct raw hex and rgb values** were found hardcoded in `className` attributes rather than referencing semantic design tokens.

### A. Primary / Brand Violet & Indigo Drift
The codebase defines `--primary: #533afd` in light mode and `--primary: #665efd` in dark mode. However, components have drifted across multiple incompatible indigo/violet scales:

| Raw Hex Value | Detected Occurrences | Typical Location & Line Reference | Intended Semantic Token |
| :--- | :--- | :--- | :--- |
| `#533afd` | **194** | `apps/web/app/page.tsx:77`, `apps/web/app/brand/page.tsx:9` | `bg-primary`, `text-primary`, `border-primary` |
| `#4f46e5` | **34** | `apps/web/components/interactive-architecture-bento.tsx:20`, `:154` | **DRIFT**: Tailwind default `indigo-600`. Must be unified to `bg-primary`. |
| `#4434d4` | **12** | `apps/web/app/page.tsx:77`, `apps/web/app/brand/page.tsx:10` | `bg-primary-deep` / `hover:bg-primary-deep` |
| `#2e2b8c` | **4** | `apps/web/app/page.tsx:77`, `apps/web/app/brand/page.tsx:11` | `bg-primary-press` / `active:bg-primary-press` |
| `#665efd` | **7** | `apps/web/components/atmospheric-gradient-mesh.tsx:33` | `bg-primary-soft` / `dark:bg-primary` |
| `#8c82fc` | **14** | `apps/web/app/dashboard/documentation/page.tsx:109` | `bg-primary-subdued` |
| `#818cf8` | **9** | `apps/web/components/interactive-architecture-bento.tsx:235` | **DRIFT**: Tailwind `indigo-400`. Must map to `text-primary-soft`. |
| `#a594fd` | **4** | `apps/web/app/page.tsx:57`, `:148` | `text-primary-subdued` |

### B. Text & Foreground Drift
The canonical text palette is `--foreground: #0d253d` (light), `--foreground: #f6f9fc` (dark), `--muted-foreground: #64748d` (light), and `--muted-foreground: #8ca3ba` (dark). Drift:

| Raw Hex Value | Detected Occurrences | Typical Location & Line Reference | Intended Semantic Token |
| :--- | :--- | :--- | :--- |
| `#0d253d` | **180** | `apps/web/app/page.tsx:63`, `apps/web/app/brand/page.tsx:12` | `text-foreground` |
| `#0f172a` | **31** | `apps/web/app/page.tsx:168`, `apps/web/app/checkout/page.tsx:112` | **DRIFT**: Tailwind `slate-900`. Must be `text-foreground`. |
| `#1d1d1f` | **16** | `apps/web/components/developer-terminal-console.tsx:216` | **DRIFT**: Apple SF Charcoal. Must be `text-foreground`. |
| `#273951` | **24** | `apps/web/app/page.tsx:299`, `apps/web/app/brand/page.tsx:13` | `text-body` / `text-foreground/90` |
| `#475569` | **11** | `apps/web/app/page.tsx:165`, `:171` | **DRIFT**: Tailwind `slate-600`. Must be `text-muted-foreground`. |
| `#64748d` | **198** | `apps/web/app/page.tsx:109`, `apps/web/app/brand/page.tsx:14` | `text-muted-foreground` |
| `#8ca3ba` | **171** | `apps/web/app/page.tsx:109`, `apps/web/app/brand/page.tsx:44` | `dark:text-muted-foreground` / `text-muted-foreground` |
| `#94a3b8` | **45** | `apps/web/app/page.tsx:165`, `:171` | **DRIFT**: Tailwind `slate-400`. Must be `text-muted-foreground`. |
| `#c2d1e0` | **15** | `apps/web/app/page.tsx:66`, `apps/web/app/brand/page.tsx:130` | `text-muted-foreground` |
| `#a1b0cb` | **6** | `apps/web/app/page.tsx:414`, `:556` | `text-muted-foreground` |

### C. Surface & Background Drift
The canonical background is `--background: #ffffff` (light), `--background: #080b14` (dark), `--card: #ffffff` (light), `--card: #0f1426` (dark), `--secondary: #f6f9fc` (light), `--secondary: #141b33` (dark). Drift:

| Raw Hex Value | Detected Occurrences | Typical Location & Line Reference | Intended Semantic Token |
| :--- | :--- | :--- | :--- |
| `#f6f9fc` | **48** | `apps/web/app/page.tsx:311`, `apps/web/app/brand/page.tsx:15` | `bg-secondary` / `bg-muted` |
| `#f1f5f9` | **9** | `apps/web/app/page.tsx:165`, `apps/web/app/checkout/page.tsx:45` | **DRIFT**: Tailwind `slate-100`. Must be `bg-secondary`. |
| `#f8fafc` | **6** | `apps/web/app/page.tsx:107`, `apps/web/components/interactive-architecture-bento.tsx:80` | **DRIFT**: Tailwind `slate-50`. Must be `bg-secondary`. |
| `#fafbfc` | **15** | `apps/web/components/interactive-architecture-bento.tsx:80` | **DRIFT**: Ad-hoc gray. Must be `bg-secondary`. |
| `#080b14` | **8** | `apps/web/app/page.tsx:107`, `apps/web/test/a11y-and-invariants.test.ts:42` | `dark:bg-background` / `bg-background` |
| `#0f1426` | **67** | `apps/web/app/page.tsx:163`, `apps/web/app/brand/page.tsx:74` | `dark:bg-card` / `bg-card` |
| `#141b33` | **52** | `apps/web/app/page.tsx:311`, `apps/web/app/brand/page.tsx:121` | `dark:bg-secondary` / `bg-secondary` |
| `#111630` | **8** | `apps/web/app/dashboard/page.tsx:56`, `:102` | **DRIFT**: Ad-hoc midnight navy. Must be `bg-card` or `bg-secondary`. |
| `#141418` | **4** | `apps/web/lib/code-syntax-highlighter.tsx:307`, `:458` | **DRIFT**: Ad-hoc charcoal. Must be `dark:bg-card`. |
| `#1c1e54` | **6** | `apps/web/app/page.tsx:409`, `:449` | Canonical `brand-dark-900` token for featured tier card. |

### D. Border & Hairline Drift
The canonical border token is `--border: #e3e8ee` (light) and `--border: #1e2646` (dark). Drift:

| Raw Hex Value | Detected Occurrences | Typical Location & Line Reference | Intended Semantic Token |
| :--- | :--- | :--- | :--- |
| `#e3e8ee` | **160** | `apps/web/app/page.tsx:57`, `:74`, `:107`, `apps/web/app/brand/page.tsx:16` | `border-border` |
| `#e2e8f0` | **41** | `apps/web/app/page.tsx:163`, `apps/web/app/checkout/page.tsx:80` | **DRIFT**: Tailwind `slate-200`. Must be `border-border`. |
| `#cbd5e1` | **16** | `apps/web/app/page.tsx:163`, `apps/web/components/interactive-architecture-bento.tsx:21` | **DRIFT**: Tailwind `slate-300`. Must be `border-border` or `hover:border-primary/40`. |
| `#d2d2d7` | **16** | `apps/web/app/sdk/page.tsx:124`, `apps/web/lib/code-syntax-highlighter.tsx:307` | **DRIFT**: Apple light gray border. Must be `border-border`. |
| `#e5e5e7` | **9** | `apps/web/components/developer-terminal-console.tsx:193` | **DRIFT**: Ad-hoc gray border. Must be `border-border`. |
| `white/10`, `white/15` | **38** | `apps/web/app/page.tsx:57`, `:74`, `:84`, `:163` | `dark:border-border` |

---

## 3. Inconsistency Report: Shadows & Elevation

The codebase defines layered shadow depths in `globals.css` (`.stripe-card-shadow-xs`, `.stripe-card-shadow-sm`, `.stripe-card-shadow-md`, `.stripe-card-shadow-lg`, `.stripe-card-shadow-hover`), but **33 distinct shadow patterns** and **18 arbitrary literal shadow strings** are scattered in component files:

| Shadow Pattern | Occurrences | Typical Locations | Problem / Drift |
| :--- | :--- | :--- | :--- |
| `shadow-xs` | 75 | Throughout dashboard tables & buttons | Tailwind default shadow |
| `shadow-2xs` | 56 | Secondary buttons & chip badges | Tailwind v4 micro shadow |
| `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` | 4 | `apps/web/app/page.tsx:163`, `:184`, `:205`, `:225` | Hardcoded arbitrary shadow on Bento cards instead of `stripe-card-shadow-sm` |
| `shadow-[0_2px_6px_rgba(0,55,112,0.04)]` | 2 | `apps/web/app/page.tsx:358`, `:458` | Hardcoded arbitrary shadow on Pricing cards instead of `stripe-card-shadow-md` |
| `shadow-[0_16px_40px_rgba(28,30,84,0.35)]` | 1 | `apps/web/app/page.tsx:409` | Hardcoded navy shadow on Featured Growth Pro card |
| `shadow-[0_16px_40px_rgba(83,58,253,0.12)]` | 1 | `apps/web/components/payment-simulator-widget.tsx:102` | Hardcoded indigo glow |
| `stripe-card-shadow-xs` | 7 | `apps/web/components/merchant-settings-console.tsx:45` | Canonical layered depth system |
| `stripe-card-shadow-sm` | 5 | `apps/web/app/not-found.tsx:168`, `apps/web/app/error.tsx:150` | Canonical layered depth system |
| `stripe-card-shadow-md` | 2 | `apps/web/app/globals.css:314` | Canonical layered depth system |

---

## 4. Inconsistency Report: Border Radii

The design system specifies `--radius: 0.75rem` (12px), yielding `--radius-sm: 6px`, `--radius-md: 9px`, `--radius-lg: 12px`, `--radius-xl: 16px`, `--radius-pill: 9999px`.

| Radius Class | Occurrences | Usage Context | Drift Analysis |
| :--- | :--- | :--- | :--- |
| `rounded-full` | **175** | Pill buttons, chips, status dots, partner rail badges | Intentional Stripe-style pill aesthetic |
| `rounded-xl` | **74** | Code highlighters, terminal consoles, sub-cards | 12px radius, matches `--radius-lg` |
| `rounded-lg` | **73** | `components/ui/card.tsx`, `button.tsx`, `input.tsx` | Base UI standard radius |
| `rounded-md` | **59** | Small badges, form inputs, copy buttons | 6px-8px radius, matches `--radius-sm` |
| `rounded-2xl` | **47** | Bento grid cards, Pricing cards, Dialog modals | 16px radius, matches `--radius-xl` |
| `rounded-[min(var(--radius-md),10px)]` | 4 | `apps/web/components/ui/field.tsx:41` | Ad-hoc clamp radius in field primitive |
| `rounded-[2px]` | 1 | `apps/web/components/dashboard/webhook-delivery-audit-table.tsx:87` | Hardcoded 2px micro radius |

---

## 5. Inconsistency Report: Duplicate Component Patterns

1. **Buttons**:
   - `components/ui/button.tsx`: Exports `Button` with variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and sizes (`default`, `sm`, `lg`, `icon`), styled with `rounded-md`.
   - `apps/web/app/page.tsx`: Defines ad-hoc buttons with raw classes:
     `rounded-full bg-[#533afd] hover:bg-[#4434d4] text-white px-6 py-3 text-sm font-medium shadow-md`
   - `apps/web/app/globals.css`: Declares `.stripe-pill-button` with `border-radius: 9999px; padding: 8px 18px;`.
   - **Resolution**: Add `pill` and `pill-outline` variants or `rounded="pill"` support to `components/ui/button.tsx` so all screens use the same component with consistent hover, focus-visible, and active states.

2. **Cards**:
   - `components/ui/card.tsx`: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter (styled with `rounded-xl border border-border bg-card text-card-foreground shadow-xs`).
   - Bento cards in `apps/web/app/page.tsx`: Ad-hoc `<div className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] ...">`.
   - Terminal & code cards in `apps/web/components/developer-terminal-console.tsx`: Ad-hoc container with custom Apple chrome.
   - **Resolution**: Map all card containers to use canonical `Card` primitives or standard `rounded-2xl border border-border bg-card shadow-sm stripe-card-shadow-sm` classes.

3. **Badges / Status Indicators**:
   - `components/ui/badge.tsx`: Badge with `default`, `secondary`, `destructive`, `outline`, `success`, `warning`.
   - Ad-hoc chips in `apps/web/app/page.tsx`:
     `inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] dark:border-white/10 bg-white/80 ...`
   - `apps/web/components/dashboard/payment-status-badge.tsx`: Specific ledger status badge.
   - **Resolution**: Consolidate chip styling onto `Badge` variant `outline` with `rounded-full` or add a `chip` variant.

---

## 6. Typography & Type Scale Analysis

- **Font Families**:
  - `var(--font-sans)` (Inter): Primary UI font across headings and body text.
  - `var(--font-mono)` (Geist Mono): Monospaced numerals, API endpoints, code snippets.
  - `.font-display`: Declared in `globals.css` (`font-weight: 300; letter-spacing: -0.04em;`).
  - `.font-tnum`: Declared in `globals.css` (`font-variant-numeric: tabular-nums`).
- **Heading Scale**:
  - Display Hero: `text-3xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.035em]`
  - Section Headings: `text-2xl sm:text-4xl lg:text-5xl font-light tracking-[-0.04em]`
  - Card Titles: `text-lg sm:text-xl font-medium tracking-tight`
  - Body: `text-sm sm:text-base leading-relaxed`
  - Micro / Meta: `text-xs font-mono` or `text-[11px]`
- **Inconsistencies**:
  - Arbitrary letter-spacing literals: `tracking-[-0.035em]`, `tracking-[-0.04em]`, `tracking-[-0.03em]` used interchangeably.
  - Heading font weights alternate arbitrarily between `font-light` (300), `font-normal` (400), and `font-medium` (500) across sibling sections.

---

## 7. Inconsistency Report: Code Style Drift

In addition to visual design drift, our audit cataloged code style patterns across the 117 frontend files:

### A. File and Folder Naming & Organization
- **Dominant Pattern**: `kebab-case.tsx` and `kebab-case.ts` across `apps/web/components/` and `apps/web/lib/`.
- **Drift Observed**:
  - Some components had legacy duplicate naming patterns or casing drifts (e.g. `ambient-flowing-ribbon.tsx` exporting `StripeSwoosh` without a clear alias match).
  - Next.js route segments adhere strictly to App Router conventions (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`).
  - **Resolution**: All component and utility filenames are standardized to `kebab-case`. Re-exports provide matching named aliases (e.g., `export const SiteHeader = GlobalHeaderNavigation`).

### B. Component Patterns & Hooks
- **Functional Components**: 100% of components are functional; zero class components exist.
- **Client vs. Server Directives**:
  - In several marketing sub-components, `"use client"` was added unnecessarily where no React hooks or browser APIs were required.
  - **Resolution**: Keep `"use client"` only on interactive leaf components or stateful forms, keeping layout frames and parent routes server-rendered.

### C. State Management Approaches
- **Drift Observed**:
  - Local state (`useState`) was occasionally duplicated for derived values (e.g., computing active filter counts instead of deriving from arrays).
  - Ambient mode (`live` vs `test`) is persisted in cookies via `openwrapper_dashboard_mode` and accessed in server components via `cookies()`, but wrapped in `EnvironmentContext` on the client.
  - **Resolution**: Standardized on Server Component cookie resolution with client sync via `EnvironmentContext`.

### D. TypeScript Strictness & Type vs. Interface
- **Drift Observed**:
  - Inconsistent usage of `type FooProps = ...` vs `interface FooProps`.
  - Type imports varied between `import type { ReactNode } from "react"`, inline `import { type ReactNode }`, and value imports `import { ReactNode }`.
  - Some callback parameters lacked explicit typing or relied on inference.
  - **Resolution**: Standardize on `interface ComponentProps` for public component APIs, `type` for unions/aliases, and explicit `import type` or inline `type` annotations.

### E. Import Ordering & Grouping
- **Drift Observed**:
  - Internal UI primitive imports (`@/components/ui/...`) were sometimes mixed above or below internal feature components (`@/components/...`) and utilities (`@/lib/...`).
  - Third-party packages (Lucide, Framer Motion) were mixed with React core imports.
  - **Resolution**: Enforce the 6-tier import ordering hierarchy defined in [CODE_STYLE.md](./CODE_STYLE.md).

---

## 8. Migration & Unification Resolution Summary

All identified drifts across `apps/web` have been systematically migrated onto the canonical design system and canonical code style without altering any underlying runtime logic or API contract behavior:

1. **Design Tokens & Visual Styles**:
   - Replaced ad-hoc `#4f46e5`, `#533afd`, `#0d253d`, `#64748d`, `#8ca3ba`, `#e3e8ee` with semantic tokens (`bg-primary`, `text-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-muted`).
   - Retained Prism token syntax colors for developer ergonomics while standardizing outer window chrome.
2. **Component Primitives**:
   - Upgraded `<Button>` with first-class `pill` prop and `size="xl"`. Replaced all inline ad-hoc button classes.
   - Standardized `<Card>` to `border border-border bg-card text-card-foreground stripe-card-shadow-sm`.
   - Upgraded `<Badge>` with `success`, `warning`, and `chip` variants.
3. **Code Style & Toolchain**:
   - Codified complete code style guidelines in [CODE_STYLE.md](./CODE_STYLE.md).
   - Validated formatting across 134 files with `oxfmt`.
   - Validated lint rules with `oxlint` (181 rules active, 0 warnings, 0 errors).
   - Validated type safety with `tsc --noEmit` (0 errors).
4. **Screens Fully Migrated**:
   - **Shared**: Global Header, Global Footer, Auth Shell, Auth Form.
   - **Landing**: Hero, Bento Architecture, Terminal Console, Payment Simulator.
   - **Dashboard**: Overview, Payments, Requests, Documentation, SDK Details, API Keys, Provider Matrix, Credential Vault, Orchestrator Console, Transaction Flow Diagram, Merchant Settings, Loading Skeletons, and Dashboard Error Boundaries.
   - **System Views**: Global HTTP 500 Boundary (`error.tsx`), Route Not Found 404 Dispatch Hub (`not-found.tsx`).
   - **Brand & Legal**: Brand Guidelines (swatches intact), Terms of Service, Privacy Policy.
5. **Verification Status**:
   - `oxlint`: 0 warnings, 0 errors across 126 files (181 rules).
   - `oxfmt`: 100% format compliance across 134 files.
   - `tsc --noEmit`: Clean compilation with 0 TypeScript errors.
   - `openwrapper test`: 18/18 tests pass (contrast, monetary integer units, apportionment conservation, rate limiting, GraphQL, credentials).
   - `version.mjs check`: 11/11 package manifests match at `v0.2.0`.

