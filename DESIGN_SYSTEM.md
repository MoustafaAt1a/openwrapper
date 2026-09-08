# OpenWrapper Canonical Design System Specification (DESIGN_SYSTEM.md)
**Version**: `0.2.0-LTS`  
**Status**: Canonical Standard  
**Target Platform**: Next.js 15 App Router (`apps/web`), Tailwind CSS v4, Base UI React primitives.  
**Cross-Reference**: See [CODE_STYLE.md](./CODE_STYLE.md) for naming conventions, TypeScript standards, and component code patterns.

---

## 1. System Mission & Philosophy

The OpenWrapper visual system reflects a provider-neutral, sovereign financial transaction gateway. The design language is characterized by:
1. **Financial Clarity & Precision**: Zero visual clutter, tabular numerals for currency math, high-contrast typography meeting WCAG AA requirements.
2. **Layered Depth over Flat Grids**: Subtle, multi-stop layered shadows (Stripe-grade ambient occlusion) rather than harsh single-offset drop shadows.
3. **Stateless Transparency**: Explicit status signals (emerald for nominal, ruby for error, lemon for pending) with deterministic transitions.
4. **Token Purity**: Zero hardcoded hex literals or arbitrary pixel offsets in component markup. Everything maps to semantic design tokens.

---

## 2. Color System (Token Source of Truth)

All color tokens are declared in `apps/web/app/globals.css` under `@theme inline` and `:root` / `.dark`.

### A. Core Semantic Tokens

| Semantic Token | Tailwind Class | Light Mode Value | Dark Mode Value | Usage Rule |
| :--- | :--- | :--- | :--- | :--- |
| `background` | `bg-background` | `#ffffff` | `#080b14` | Page body canvas |
| `foreground` | `text-foreground` | `#0d253d` | `#f6f9fc` | Primary headings & high-emphasis text |
| `card` | `bg-card` | `#ffffff` | `#0f1426` | Card, panel, and dialog surfaces |
| `card-foreground` | `text-card-foreground`| `#0d253d` | `#f6f9fc` | Card title and content text |
| `secondary` | `bg-secondary` | `#f6f9fc` | `#141b33` | Subdued surface, table header, well background |
| `secondary-foreground`| `text-secondary-foreground` | `#0d253d` | `#f6f9fc` | Secondary element labels |
| `muted` | `bg-muted` | `#f6f9fc` | `#141b33` | Badges, disabled states, passive chrome |
| `muted-foreground` | `text-muted-foreground` | `#64748d` | `#8ca3ba` | Explanatory copy, secondary metadata |
| `border` | `border-border` | `#e3e8ee` | `#1e2646` | Hairline borders, dividers, table rows |
| `input` | `border-input` | `#a8c3de` | `#273359` | Form input borders and focus rings |
| `ring` | `ring-ring` | `#533afd` | `#665efd` | Focus-visible accessibility rings |

### B. Brand Indigo & Interactive Tokens

| Token | Class | Light Mode | Dark Mode | Usage Rule |
| :--- | :--- | :--- | :--- | :--- |
| `primary` | `bg-primary` / `text-primary` | `#533afd` | `#665efd` | Primary CTAs, active states, brand accent |
| `primary-deep` | `bg-primary-deep` | `#4434d4` | `#533afd` | Primary CTA hover state |
| `primary-press` | `bg-primary-press` | `#2e2b8c` | `#4434d4` | Primary CTA active/pressed state |
| `primary-soft` | `bg-primary-soft` | `#665efd` | `#7d77fd` | Ambient highlights, secondary accents |
| `primary-subdued`| `bg-primary-subdued` | `#b9b9f9` | `#2d2b5c` | Subtle tint backgrounds (`bg-primary/10`) |
| `brand-dark-900` | `bg-brand-dark-900` | `#1c1e54` | `#0a0d1a` | Inverted featured pricing tier, dark hero accents |

### C. Feedback & Financial Status Rails

| Signal | Token | Class | Value | Usage Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Error / Destructive** | `destructive` | `text-destructive` / `bg-destructive` | `#ea2261` | Failed transactions, deletion, critical alerts |
| **Success / Settled** | `emerald` | `text-emerald-500` / `bg-emerald-500` | `#10b981` | Settled payments, 200 OK health checks |
| **Pending / Kiosk** | `lemon` | `text-lemon` / `bg-lemon` | `#ff9f43` | Pending state, Fawry kiosk reference |
| **Warning / Review** | `amber` | `text-amber-500` / `bg-amber-500` | `#f59e0b` | RequiresAction, rate limit warning |

---

## 3. Elevation & Layered Shadow System

OpenWrapper rejects flat 1px borders without depth or harsh black drop shadows. Use canonical layered shadows:

```css
/* Canonical Layered Shadows in globals.css */
.stripe-card-shadow-xs {
  box-shadow: 0 1px 2px rgba(0, 55, 112, 0.03), 0 2px 6px -1px rgba(0, 55, 112, 0.04);
}
.stripe-card-shadow-sm {
  box-shadow: 0 1px 3px rgba(0, 55, 112, 0.04), 0 6px 16px -4px rgba(0, 55, 112, 0.07);
}
.stripe-card-shadow-md {
  box-shadow: 0 2px 4px rgba(0, 55, 112, 0.04), 0 12px 28px -6px rgba(0, 55, 112, 0.09);
}
.stripe-card-shadow-lg {
  box-shadow: 0 4px 6px rgba(0, 55, 112, 0.04), 0 20px 44px -8px rgba(0, 55, 112, 0.12);
}
.stripe-card-shadow-hover {
  box-shadow: 0 8px 30px rgba(0, 55, 112, 0.08), 0 2px 8px rgba(0, 55, 112, 0.04);
}
```

### Elevation Guidelines
- **Subtle Surface / Table Row**: `stripe-card-shadow-xs`
- **Standard Card / Terminal Container**: `stripe-card-shadow-sm`
- **Elevated Interactive Card (Bento, Pricing Tier)**: `stripe-card-shadow-md`
- **Modal / Popover / Dropdown**: `stripe-card-shadow-lg`
- **Hover Transition**: `hover:stripe-card-shadow-hover` with `transition-depth`

---

## 4. Radius Scale

| Token | Class | Pixels | Permitted Component Applications |
| :--- | :--- | :--- | :--- |
| `radius-sm` | `rounded-md` | 6px | Form input fields, copy buttons, micro badges |
| `radius-md` | `rounded-lg` | 9px | Standard buttons, dropdown menus, toast alerts |
| `radius-lg` | `rounded-xl` | 12px | Code syntax highlighters, terminal consoles, sub-panels |
| `radius-xl` | `rounded-2xl` | 16px | Bento grid cards, pricing cards, dialog modal sheets |
| `radius-pill` | `rounded-full` | 9999px | Primary pill buttons, chip indicators, status dots |

---

## 5. Typography Scale & Guidelines

- **Primary UI Sans**: Inter (`var(--font-sans)`)
- **Monospace Code & Math**: Geist Mono (`var(--font-mono)`)
- **Display Headings**: Class `.font-display` (`letter-spacing: -0.035em; font-feature-settings: "ss01";`)
- **Tabular Numerals**: Class `.font-tnum` (`font-variant-numeric: tabular-nums;`) — **Mandatory for all monetary minor unit displays, transaction tables, and timestamps**.

### Type Hierarchy
1. **Hero Headline**: `text-4xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.035em] text-foreground font-display`
2. **Section Heading**: `text-2xl sm:text-4xl lg:text-5xl font-light tracking-[-0.035em] text-foreground font-display`
3. **Card / Panel Heading**: `text-lg sm:text-xl font-medium tracking-tight text-foreground`
4. **Body Text**: `text-sm sm:text-base text-muted-foreground leading-relaxed`
5. **Code / Endpoint Label**: `font-mono text-xs text-foreground`
6. **Micro Meta / Badge**: `text-[11px] font-mono text-muted-foreground`

---

## 6. Shared Component Rules

### Buttons
- Never write ad-hoc button HTML (`<a className="rounded-full bg-[#533afd]...">`).
- Always use `Button` from `@/components/ui/button`.
- Use `rounded="pill"` or `variant="pill"` for primary marketing actions, and `variant="default"` (`rounded-md` / `rounded-lg`) for dashboard utility actions.

### Cards
- Always wrap standalone modules in `Card` from `@/components/ui/card` or apply `rounded-2xl border border-border bg-card stripe-card-shadow-sm`.

### Status Badges
- Always use `Badge` from `@/components/ui/badge` or `PaymentStatusBadge` from `@/components/dashboard/payment-status-badge`.
- Never hardcode colored dots or ad-hoc chip divs without proper semantic variant classes.
