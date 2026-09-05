import {
  ArrowRight,
  Check,
  Code2,
  Cpu,
  CreditCard,
  ExternalLink,
  Globe2,
  KeyRound,
  LineChart,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  Store,
  Terminal,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { CodeTerminal } from "@/components/code-terminal"
import { FaqSection } from "@/components/faq-section"
import { HeroPaymentWidget } from "@/components/hero-payment-widget"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const partners = [
  { name: "Paymob", label: "Cards & Wallets", image: "/assets/paymob.png" },
  { name: "Fawry", label: "Cash Kiosks (180k+)", image: "/assets/fawry.webp" },
  { name: "Stripe", label: "Global Checkout", image: "/assets/stripe.png" },
  { name: "Meeza", label: "National Debit Rails", image: "/assets/meeza.png" },
  { name: "InstaPay", label: "Instant Bank Routing", image: "/assets/InstaPay.png" },
  { name: "Visa", label: "3D Secure 2.0", image: "/assets/visa.png" },
  { name: "Mastercard", label: "Global Interchange", image: "/assets/card.png" },
  { name: "Vodafone Cash", label: "Mobile Wallet", image: "/assets/vodafone.png" },
  { name: "Apple Pay", label: "Express Checkout", image: "/assets/apple-pay.png" },
]

const easyFeatures = [
  {
    tag: "Unified Contract",
    title: "One Schema for All Providers",
    desc: "Switch between Paymob, Fawry, and Stripe without changing your database schema or frontend checkout logic.",
    snippet: `{ "provider": "paymob", "amount_minor_units": 25000, "currency": "EGP" }`,
  },
  {
    tag: "Lossless Actions",
    title: "Lossless Next-Action Handoff",
    desc: "Bridges hosted payment links, 3DS authentication challenges, and physical kiosk reference codes directly to your app.",
    snippet: `{ "type": "pay_at_reference", "reference": "94829104" }`,
  },
  {
    tag: "Zero Double Charges",
    title: "Deterministic Idempotency",
    desc: "Mandatory Idempotency-Key headers with SHA-256 request fingerprinting eliminate double charges during network retries.",
    snippet: `Idempotency-Key: req_2026_f8a91b (SHA-256 fingerprint verified)`,
  },
]

const platformFeatures = [
  {
    icon: Cpu,
    title: "Dual-Engine Architecture",
    desc: "Deploy the full-featured Next.js cloud platform or run the ultra-high-throughput native Rust micro-engine on-premise.",
  },
  {
    icon: KeyRound,
    title: "Cryptographic API Security",
    desc: "Issue scoped ow_live_ and ow_test_ credentials, hashed at rest with SHA-256 and authenticated in constant time.",
  },
  {
    icon: LineChart,
    title: "Complete Observability",
    desc: "Inspect live request latencies, status transitions, provider error breakdowns, and verified webhook audit trails.",
  },
  {
    icon: ShieldCheck,
    title: "Normalized Webhook Ingestion",
    desc: "Automatic signature verification for Paymob HMAC-SHA512, Fawry SHA-256, and Stripe-Signature headers.",
  },
]

const gridTools = [
  { icon: CreditCard, title: "Global & Local Cards", subtitle: "Visa, Mastercard, Meeza" },
  { icon: Smartphone, title: "Mobile Wallets", subtitle: "Vodafone, Orange, Etisalat, WE" },
  { icon: Store, title: "Fawry Retail Kiosks", subtitle: "180,000+ POS Terminals" },
  { icon: Globe2, title: "Stripe & Global Rails", subtitle: "Hosted Checkout & 3DS" },
  { icon: Server, title: "Rust Gateway Engine", subtitle: "Microsecond Latency" },
  { icon: Code2, title: "TypeScript & Node SDK", subtitle: "Strict Type Safety" },
  { icon: Terminal, title: "PHP & Laravel SDK", subtitle: "Composer Ready" },
  { icon: RefreshCw, title: ".NET 8 / C# SDK", subtitle: "NuGet Package Ready" },
]

const engineeringGuarantees = [
  {
    badge: "Invariant I1",
    title: "Discrete Integer Minor Units",
    desc: "Strict integer minor units (i64) eliminate IEEE 754 floating-point rounding errors across ledger balances, fees, and currency conversions.",
    metric: "0 Float Math",
    proof: "Enforced at Rust domain core & DB schemas",
  },
  {
    badge: "Invariant I3",
    title: "Stateless Zero-Storage Security",
    desc: "Merchant provider credentials pass via transient TLS request headers (X-Paymob-*, X-Fawry-*, X-Stripe-*) and are never written to database tables or logs.",
    metric: "0 Leaked Secrets",
    proof: "Verified via AST code invariant tests",
  },
  {
    badge: "Invariant I4",
    title: "Deterministic Idempotency",
    desc: "Compound unique constraints on (key, scope) and SHA-256 payload hashing guarantee network retries never produce duplicate charges.",
    metric: "O(1) Deduplication",
    proof: "Concurrent connection stress verified",
  },
]

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <SiteHeader />

      {/* Hero Section (Cal.com 7/5 Split Layout) */}
      <section className="relative isolate overflow-hidden border-b border-border/80 bg-background pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div
          data-aifx="blocky"
          className="absolute inset-0 -z-10 pointer-events-none opacity-30"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left 7 Columns: Editorial & CTAs */}
            <div className="flex flex-col gap-8 lg:col-span-7">
              {/* Badge Pill */}
              <div className="flex w-fit items-center gap-2.5 rounded-full border border-border bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs">
                <Image
                  src="/openwrapper-icon.jpeg"
                  alt="OpenWrapper"
                  width={18}
                  height={18}
                  className="size-4.5 rounded-full object-cover shadow-2xs"
                />
                <span className="font-semibold text-foreground">v0.1.3 LTS Production-Ready</span>
                <span className="text-muted-foreground/60">—</span>
                <span>Unified Payment Infrastructure</span>
              </div>

              {/* Display Headline */}
              <div className="flex flex-col gap-5">
                <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl sm:tracking-[-0.05em] lg:text-7xl text-foreground leading-[1.05]">
                  The better way to accept online payments.
                </h1>
                <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  OpenWrapper bridges Paymob, Fawry, Stripe, and sovereign regional payment rails
                  into one clean, observable, and idempotent API layer. Available as a cloud
                  platform and a high-throughput Rust engine.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  className="h-11 rounded-md px-6 text-sm font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                  asChild
                >
                  <Link href="/sign-up">
                    Start building free <ArrowRight className="size-4 ml-1.5 inline" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-md border-border/80 px-6 text-sm font-semibold hover:bg-muted/50 transition-all"
                  asChild
                >
                  <Link href="/dashboard/documentation">
                    <Code2 className="size-4 mr-1.5 text-muted-foreground" /> Interactive Sandbox
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right 5 Columns: Interactive Product UI Mockup */}
            <div className="lg:col-span-5">
              <HeroPaymentWidget />
            </div>
          </div>
        </div>
      </section>

      {/* Partner Rails Infinite Marquee Loop (Professional Grayscale Logo Cloud) */}
      <section className="relative overflow-hidden border-b border-border/80 bg-muted/20 py-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/90 mb-6 font-mono">
          Supported Payment Gateways & Sovereign Rails
        </p>

        {/* Gradient edge masks for smooth fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex overflow-hidden">
          <div className="animate-marquee items-center gap-10 sm:gap-14">
            {[...partners, ...partners].map((p, idx) => (
              <div
                key={`${p.name}-${idx}`}
                className="flex h-10 w-28 items-center justify-center grayscale opacity-55 hover:grayscale-0 hover:opacity-100 transition-all duration-300 shrink-0 cursor-pointer"
                title={p.name}
              >
                <div className="relative h-7 w-24 flex items-center justify-center">
                  <Image src={p.image} alt={p.name} fill sizes="96px" className="object-contain" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: With us, payment integration is easy */}
      <section id="product" className="py-24 sm:py-32 border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3 mb-16">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Architecture & Contract
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
              With us, payment integration is easy
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              A clean, standardized API contract that eliminates provider fragmentation and vendor
              lock-in forever.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {easyFeatures.map((f) => (
              <div
                key={f.title}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/50 p-6 sm:p-8 shadow-2xs hover:border-foreground/40 transition-all"
              >
                <div className="flex flex-col gap-4">
                  <Badge variant="outline" className="w-fit font-mono text-[11px] px-2 py-0.5">
                    {f.tag}
                  </Badge>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>

                <div className="mt-6 rounded-lg border border-border/60 bg-card p-3 font-mono text-[11px] text-muted-foreground overflow-x-auto select-all">
                  <code>{f.snippet}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Sovereign Regional Financial Rails (Egypt & MENA Showcase) */}
      <section id="regional" className="py-24 sm:py-32 border-b border-border/80 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3 mb-16">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Regional Powerhouse
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
              Sovereign Egyptian & MENA Payment Rails
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              Native, zero-friction integration with Egypt&apos;s digital banking revolution,
              national card network, and cash collection ecosystem.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Card A: Sovereign Banknote / Nefertiti Art Card */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md transition-all hover:shadow-lg">
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted/40 border-b border-border/80">
                <Image
                  src="/assets/nefretiti.jpg"
                  alt="Egyptian Sovereign Currency & Digital Financial Rails"
                  fill
                  className="object-cover object-center transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <Badge className="bg-primary text-primary-foreground font-mono text-xs shadow-md">
                    Central Bank of Egypt Rails
                  </Badge>
                  <span className="font-mono text-xs font-bold text-foreground bg-card/80 px-2.5 py-1 rounded-md backdrop-blur-sm">
                    EGP Currency Engine
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  Meeza, InstaPay & Sovereign Settlement
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Egypt&apos;s digital currency infrastructure handled natively with exact integer
                  minor units (piasters). Direct support for Meeza national debit, InstaPay bank
                  routing, and automatic multi-currency conversion.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <span className="font-semibold text-foreground block">Zero Rounding Error</span>
                    <span className="text-muted-foreground text-[11px]">
                      Strict integer arithmetic
                    </span>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <span className="font-semibold text-foreground block">National Card Rails</span>
                    <span className="text-muted-foreground text-[11px]">
                      Meeza direct processing
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Sphinx / Kiosk & Mobile Wallets Art Card */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md transition-all hover:shadow-lg">
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted/40 border-b border-border/80">
                <Image
                  src="/assets/sphinx.png"
                  alt="Egyptian Fintech & Cash Collection Kiosks"
                  fill
                  className="object-contain object-center p-4 transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <Badge className="bg-primary text-primary-foreground font-mono text-xs shadow-md">
                    Fawry & Paymob Rails
                  </Badge>
                  <span className="font-mono text-xs font-bold text-foreground bg-card/80 px-2.5 py-1 rounded-md backdrop-blur-sm">
                    180k+ Retail POS
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-6 sm:p-8">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  Fawry Kiosks & Mobile Wallets Network
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Empower cash customers across Egypt with instant 8-digit Fawry reference numbers,
                  alongside Vodafone Cash, Orange Money, Etisalat Cash, and WE Pay mobile wallets
                  with automated webhook verification.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <span className="font-semibold text-foreground block">
                      Instant Cash Reference
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      72h Kiosk Expiry Window
                    </span>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <span className="font-semibold text-foreground block">
                      HMAC-SHA512 Verified
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Cryptographic Webhooks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Your all-purpose payment platform */}
      <section className="py-24 sm:py-32 border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3 mb-16">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Core Capabilities
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
              Your all-purpose payment platform
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              Built from first principles with mathematical rigor, zero floating point inaccuracies,
              and cryptographic guarantees.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-2xs hover:border-foreground/30 transition-all"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section 4: ...and so much more! */}
      <section className="py-20 sm:py-28 border-b border-border/80 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-2 mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl text-foreground">
              ...and so much more!
            </h2>
            <p className="text-sm text-muted-foreground">
              A complete suite of payment primitives designed for mission-critical software.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {gridTools.map((tool) => {
              const Icon = tool.icon
              return (
                <div
                  key={tool.title}
                  className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-card p-5 text-center shadow-2xs hover:-translate-y-0.5 hover:shadow-xs transition-all"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">{tool.title}</span>
                    <span className="text-[11px] text-muted-foreground">{tool.subtitle}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section 5: Developer Code Terminal */}
      <section id="developers" className="py-24 sm:py-32 border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground w-fit">
                Developer-First
              </span>
              <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
                All your payment rails in sync with your code.
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Integrate with type-safe SDKs for TypeScript, PHP, and .NET, or hit the OpenAPI 3.1
                REST API with any HTTP client. Every request receives a deterministic response with
                zero latency overhead.
              </p>

              <div className="flex flex-col gap-3 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500" />
                  <span>npm install @openwrapper/sdk</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500" />
                  <span>composer require openwrapper/sdk</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500" />
                  <span>dotnet add package OpenWrapper</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500" />
                  <span>cargo build --release -p openwrapper-gateway</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <CodeTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Architectural Guarantees & Verification */}
      <section className="py-24 sm:py-32 border-b border-border/80 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3 mb-16">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Engineering Proof
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
              Architectural invariants, verified by tests
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              Production reliability backed by formal state machines, zero-knowledge security, and
              automated AST architecture verification.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {engineeringGuarantees.map((g) => (
              <div
                key={g.badge}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs transition-all hover:border-border"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                      {g.badge}
                    </span>
                    <span className="font-mono text-xs font-semibold text-emerald-500">
                      {g.metric}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">
                    {g.title}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {g.desc}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-2 border-t border-border/60 pt-4 text-xs font-mono text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>{g.proof}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Transparent Pricing (Cal.com Architecture with Inverted Featured Tier) */}
      <section id="pricing" className="py-24 sm:py-32 border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3 mb-16">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Predictable Pricing
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              Start building free with local sandboxes and scale seamlessly to high-throughput
              sovereign rails.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 items-stretch">
            {/* Tier 1: Developer */}
            <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-8 shadow-2xs transition-all">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    Developer
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For local development, sandbox verification, and prototyping.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.03em] text-foreground">
                    $0
                  </span>
                  <span className="text-xs text-muted-foreground">/ free forever</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Full SQLite and in-memory test engines</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Paymob, Fawry & Stripe sandbox rails</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>TypeScript, PHP, and .NET client SDKs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>OpenAPI 3.1 & GraphQL sandbox schemas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Deterministic idempotency protection</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-md border-border text-xs font-semibold hover:bg-muted"
                  asChild
                >
                  <Link href="/sign-up">Start building free</Link>
                </Button>
              </div>
            </div>

            {/* Tier 2 (Featured): Growth Pro — Inverted Dark Surface (#101010) */}
            <div className="flex flex-col justify-between rounded-xl bg-[#101010] text-[#ffffff] p-8 shadow-xl transition-all">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold tracking-tight text-white">Growth Pro</h3>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] bg-white/10 px-2 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#a1a1aa]">
                    For production apps processing live cards, wallets, and retail cash.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.03em] text-white">$49</span>
                  <span className="text-xs text-[#a1a1aa]">/ month</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#262626] text-xs text-[#d1d5db]">
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    <span>Production Paymob, Fawry & Stripe rails</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    <span>Postgres persistent ledger with pooling</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    <span>Automated HMAC & SHA-256 webhooks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    <span>Sub-millisecond Rust gateway engine</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    <span>Real-time telemetry & audit logs</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  className="w-full h-10 rounded-md bg-white text-[#111111] hover:bg-neutral-200 text-xs font-semibold shadow-xs"
                  asChild
                >
                  <Link href="/sign-up">
                    Get started with Pro <ArrowRight className="size-3.5 ml-1.5 inline" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-8 shadow-2xs transition-all">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    Enterprise Sovereign
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For banks, fintechs, and high-volume sovereign operations.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.03em] text-foreground">
                    Custom
                  </span>
                  <span className="text-xs text-muted-foreground">/ tailored SLA</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>On-premise & air-gapped deployment</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Direct Central Bank of Egypt / Meeza rails</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Dedicated RabbitMQ & PgBouncer topologies</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Multi-region active-active disaster recovery</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>24/7 dedicated financial infra engineering</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-md border-border text-xs font-semibold hover:bg-muted"
                  asChild
                >
                  <Link href="mailto:support@openwrapper.org">Contact sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8: FAQ Accordion */}
      <section id="faq" className="py-24 sm:py-32 border-b border-border/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-3 mb-14">
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Got Questions?
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl text-foreground">
              Frequently asked questions
            </h2>
          </div>

          <FaqSection />
        </div>
      </section>

      {/* Section 9: Pre-Footer CTA Band */}
      <section className="py-20 sm:py-28 bg-muted/30 border-b border-border/80">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-6 rounded-2xl border border-border/80 bg-card p-8 sm:p-14 shadow-lg">
            <div className="flex flex-col gap-3">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl text-foreground">
                Smarter, simpler payments
              </h2>
              <p className="max-w-lg text-sm sm:text-base text-muted-foreground">
                Create your developer workspace, generate real API keys, and start processing
                Paymob, Fawry, and Stripe payments in minutes.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                size="lg"
                className="h-11 rounded-md px-6 text-sm font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                asChild
              >
                <Link href="/sign-up">
                  Get started free <ArrowRight className="size-4 ml-1.5 inline" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 rounded-md border-border/80 px-6 text-sm font-semibold hover:bg-muted/50 transition-all"
                asChild
              >
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: Cal.com Dark Footer (#101010) */}
      <footer className="bg-[#101010] text-[#a1a1aa] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 pb-12 border-b border-[#262626]">
            {/* Left Column: Brand & Bio */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Image
                  src="/openwrapper-icon.jpeg"
                  alt="OpenWrapper"
                  width={32}
                  height={32}
                  className="size-8 rounded-lg object-cover ring-1 ring-white/20"
                />
                <span className="font-bold text-lg text-white tracking-tight">OpenWrapper</span>
              </div>
              <p className="text-xs leading-relaxed max-w-sm text-[#898989]">
                Universal payment gateway abstraction and developer platform. One observable,
                idempotent API for Paymob, Fawry, Stripe, Meeza, and global payment rails.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-[#34d399]">
                <span className="size-2 rounded-full bg-[#34d399] animate-pulse" />
                <span>All Payment Rails Operational (v0.1.3 LTS)</span>
              </div>
            </div>

            {/* Link Columns */}
            <div className="flex flex-col gap-3 text-xs">
              <span className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono">
                Product
              </span>
              <Link href="#product" className="hover:text-white transition-colors">
                Unified Contract
              </Link>
              <Link href="#regional" className="hover:text-white transition-colors">
                Sovereign Rails
              </Link>
              <Link href="#pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/dashboard/payments" className="hover:text-white transition-colors">
                Payments Ledger
              </Link>
              <Link href="/dashboard/providers" className="hover:text-white transition-colors">
                Provider Matrix
              </Link>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <span className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono">
                Developers
              </span>
              <Link href="/dashboard/documentation" className="hover:text-white transition-colors">
                Interactive API Docs
              </Link>
              <Link href="/dashboard/api-keys" className="hover:text-white transition-colors">
                API Keys
              </Link>
              <Link href="/dashboard/requests" className="hover:text-white transition-colors">
                Request Telemetry
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                OpenAPI Spec <ExternalLink className="size-3" />
              </Link>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <span className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono">
                Account
              </span>
              <Link href="/sign-in" className="hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/sign-up" className="hover:text-white transition-colors">
                Create Workspace
              </Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Control Plane
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6b7280]">
            <p>© 2026 OpenWrapper Inc. Open source and developer-first.</p>
            <p className="font-mono text-[11px]">
              Engineered with mathematical precision & zero-float arithmetic.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
