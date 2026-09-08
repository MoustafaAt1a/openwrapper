"use client"

import { ArrowRight, CheckCircle2, Code2 } from "lucide-react"
import { motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { TransactionFlowDiagram } from "@/components/transaction-flow-diagram"
import {
  LedgerTelemetryMockup,
  MobileCheckoutMockup,
  SovereignCardMockup,
  ZeroKnowledgeSecurityMockup,
} from "@/components/interactive-architecture-bento"
import { DeveloperTerminalConsole } from "@/components/developer-terminal-console"
import { FaqKnowledgeAccordion } from "@/components/faq-knowledge-accordion"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { PaymentSimulatorWidget } from "@/components/payment-simulator-widget"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { SovereignRailBackbone } from "@/components/sovereign-rail-backbone"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { Button } from "@/components/ui/button"

const partnerRails = [
  { name: "Paymob", label: "Cards & Wallets", image: "/assets/paymob.png" },
  { name: "Fawry", label: "Cash Kiosks (180k+)", image: "/assets/fawry.webp" },
  { name: "Meeza", label: "National Debit Rails", image: "/assets/meeza.png" },
  { name: "InstaPay", label: "Instant Bank Routing", image: "/assets/InstaPay.png" },
  { name: "Stripe", label: "Global Checkout", image: "/assets/stripe.png" },
  { name: "Visa", label: "3D Secure 2.0", image: "/assets/visa.png" },
  { name: "Mastercard", label: "Global Interchange", image: "/assets/card.png" },
  { name: "Vodafone Cash", label: "Mobile Wallet", image: "/assets/vodafone.png" },
  { name: "Apple Pay", label: "Express Checkout", image: "/assets/apple-pay.png" },
]

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      {/* 1. Universal Clean Header */}
      <GlobalHeaderNavigation />

      {/* 2. Hero Section with Signature Sweeping Geometric Ribbon */}
      <section className="relative isolate overflow-hidden pt-8 pb-16 sm:pt-16 sm:pb-28">
        <AtmosphericGradientMesh />
        <StripeSwoosh />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left 7 Columns: Editorial & Action Pill */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col gap-5 sm:gap-6 lg:col-span-7 min-w-0"
            >
              {/* Display Headline */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card/80 backdrop-blur-sm px-3.5 py-1 text-xs text-primary shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">
                    OpenWrapper v0.2.0 LTS · Unified Payment Gateway
                  </span>
                </div>
                <h1 className="text-balance text-3xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.035em] text-foreground leading-[1.1] break-words font-display">
                  One unified gateway for Paymob, Fawry, Meeza & Stripe.
                </h1>
                <p className="max-w-xl text-pretty text-sm sm:text-base lg:text-lg font-light leading-relaxed text-muted-foreground">
                  Connect regional MENA payment rails and global processors with a single typed API.
                  Built in Rust with zero stored secrets, integer minor units, and strict
                  idempotency.
                </p>
              </div>

              {/* Action Buttons: Signature Stripe Pill Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Button
                  size="xl"
                  pill
                  className="gap-2 shadow-md hover:shadow-lg text-center"
                  asChild
                >
                  <Link href="/register">
                    <span>Start building free</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="xl"
                  pill
                  className="gap-2 border-border bg-card/80 hover:bg-muted text-foreground shadow-2xs hover:shadow-sm text-center"
                  asChild
                >
                  <Link href="/dashboard/documentation">
                    <Code2 className="w-4 h-4 text-primary" />
                    <span>Read API documentation</span>
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Right 5 Columns: Interactive Real Payment Engine */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-5 min-w-0 w-full"
            >
              <PaymentSimulatorWidget />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Partner Rails Continuous Loop */}
      <section className="relative overflow-hidden border-y border-border bg-secondary/80 dark:bg-background/80 py-7 sm:py-8 backdrop-blur-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-5 text-center">
          <p className="text-[11px] sm:text-xs font-medium tracking-wide text-muted-foreground">
            Supported payment rails and local settlement networks
          </p>
        </div>

        {/* Gradient edge masks for smooth fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 sm:w-36 bg-gradient-to-r from-secondary dark:from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 sm:w-36 bg-gradient-to-l from-secondary dark:from-background to-transparent z-10" />

        <div className="flex overflow-hidden w-full">
          <div className="animate-marquee items-center gap-10 sm:gap-14 shrink-0">
            {[...partnerRails, ...partnerRails].map((p, idx) => (
              <div
                key={`${p.name}-${idx}`}
                className="flex h-10 w-28 sm:w-32 items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-200 shrink-0 cursor-pointer group"
                title={`${p.name} — ${p.label}`}
              >
                <div className="relative h-7 w-24 sm:w-28 flex items-center justify-center grayscale group-hover:grayscale-0 dark:brightness-110 transition-all duration-200">
                  <Image src={p.image} alt={p.name} fill sizes="112px" className="object-contain" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Flexible Solutions for Every Business Model (Bento Grid with Real Mockups) */}
      <section
        id="product"
        className="py-20 sm:py-32 border-b border-border/60 scroll-mt-20 sm:scroll-mt-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3 mb-12 sm:mb-16 max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-medium tracking-wide text-primary shadow-2xs">
              <span>Core Engineering Guarantees</span>
            </div>
            <h2 className="text-balance text-2xl sm:text-4xl lg:text-5xl font-normal tracking-[-0.035em] text-foreground leading-tight font-display">
              Engineered for correctness at high throughput.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl font-light leading-relaxed">
              Eliminate floating-point drift, prevent double charges during network retries, and
              keep upstream provider secrets entirely off persistent storage.
            </p>
          </motion.div>

          {/* 2x2 Bento Grid with Real UI Mockups */}
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
            {/* Bento Card 1: Regional Checkout */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-sm hover:border-primary/40 hover:stripe-card-shadow-hover transition-all overflow-hidden">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground mb-3">
                  Regional Checkout
                </span>
                <h3 className="text-lg sm:text-xl font-medium tracking-tight text-foreground">
                  Egypt and MENA payment routing
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground font-light">
                  A single modal and API dynamically routing between Meeza debit cards, mobile
                  wallets (Vodafone, Orange, Etisalat), and 8-to-10 digit Fawry kiosk cash
                  references.
                </p>
              </div>

              <div className="py-2">
                <MobileCheckoutMockup />
              </div>
            </div>

            {/* Bento Card 2: Deterministic Ledger Telemetry */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-sm hover:border-primary/40 hover:stripe-card-shadow-hover transition-all overflow-hidden">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground mb-3">
                  Transaction Ledger
                </span>
                <h3 className="text-lg sm:text-xl font-medium tracking-tight text-foreground">
                  Monotonic state transitions
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground font-light">
                  Payment states flow strictly through Initiated → Pending → Successful / Failed /
                  RequiresAction. Mandatory Idempotency-Key headers prevent double charges on
                  network retries.
                </p>
              </div>

              <div className="py-2">
                <LedgerTelemetryMockup />
              </div>
            </div>

            {/* Bento Card 3: Stateless Zero-Knowledge Mode */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-sm hover:border-primary/40 hover:stripe-card-shadow-hover transition-all overflow-hidden">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground mb-3">
                  Zero-Knowledge Security
                </span>
                <h3 className="text-lg sm:text-xl font-medium tracking-tight text-foreground">
                  Stateless credentials in transit
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground font-light">
                  Merchant provider credentials pass via transient TLS request headers (X-Paymob-*,
                  X-Fawry-*, X-Stripe-*) and are never written to database tables or telemetry logs.
                </p>
              </div>

              <div className="py-2">
                <ZeroKnowledgeSecurityMockup />
              </div>
            </div>

            {/* Bento Card 4: Currency Precision */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-sm hover:border-primary/40 hover:stripe-card-shadow-hover transition-all overflow-hidden">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground mb-3">
                  Currency Precision
                </span>
                <h3 className="text-lg sm:text-xl font-medium tracking-tight text-foreground">
                  Integer minor units (Piasters & Cents)
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground font-light">
                  All monetary values are calculated using exact 64-bit integer minor units
                  (amount_minor_units: i64). Zero IEEE 754 floating-point drift or rounding errors.
                </p>
              </div>

              <div className="py-2 flex items-center justify-center">
                <SovereignCardMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The Backbone of Sovereign Commerce (Animated Metrics & Motion Background) */}
      <SovereignRailBackbone />

      {/* 6. Section: Architecture Flow & End-to-End Topology */}
      <section
        id="regional"
        className="py-20 sm:py-32 border-b border-border/40 scroll-mt-20 sm:scroll-mt-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3 mb-10 sm:mb-12 max-w-3xl"
          >
            <h2 className="text-balance text-2xl sm:text-4xl lg:text-5xl font-light tracking-[-0.04em] text-foreground leading-tight font-display">
              Connect to existing systems.{" "}
              <span className="text-muted-foreground">
                Orchestrate payments across multiple processors, build custom workflows, and connect
                using SDKs, REST APIs, or gRPC.
              </span>
            </h2>
          </motion.div>

          <TransactionFlowDiagram />
        </div>
      </section>

      {/* 7. Section: Developer Terminal & SDKs */}
      <section
        id="developers"
        className="py-16 sm:py-28 border-b border-border/40 overflow-hidden scroll-mt-20 sm:scroll-mt-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 sm:gap-5 lg:col-span-5 min-w-0"
            >
              <h2 className="text-balance text-2xl sm:text-4xl lg:text-5xl font-normal tracking-[-0.035em] text-foreground leading-[1.1] font-display">
                Integrate once. Accept everywhere.
              </h2>
              <p className="text-xs sm:text-base text-muted-foreground leading-relaxed font-light">
                Official client libraries for TypeScript, .NET, and PHP. Or consume the OpenAPI 3.1
                contract and gRPC Protobuf definitions directly. Zero floating-point rounding,
                automatic idempotency, and clean next-action payloads.
              </p>

              <div className="flex flex-col gap-2 font-mono text-xs text-foreground">
                {[
                  { cmd: "npm install @openwrapper/sdk", label: "TypeScript" },
                  { cmd: "dotnet add package OpenWrapper", label: ".NET 8/9" },
                  { cmd: "composer require openwrapper/sdk", label: "PHP 8.1+" },
                  {
                    cmd: "cargo build -p openwrapper-gateway",
                    label: "Rust Engine",
                  },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/80 px-3 py-2 min-w-0 shadow-2xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate text-[11px] sm:text-xs text-foreground select-all font-tnum">
                        {item.cmd}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground font-medium ml-2 pl-2 border-l border-border">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="lg:col-span-7 min-w-0 w-full overflow-hidden">
              <DeveloperTerminalConsole />
            </div>
          </div>
        </div>
      </section>

      {/* 8. Predictable, Transparent Pricing */}
      <section
        id="pricing"
        className="py-20 sm:py-32 border-b border-border/40 scroll-mt-20 sm:scroll-mt-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-3 mb-12 sm:mb-16"
          >
            <h2 className="text-balance text-2xl sm:text-4xl lg:text-5xl font-light tracking-[-0.04em] text-foreground font-display">
              Simple, transparent pricing
            </h2>
            <p className="max-w-2xl text-xs sm:text-base text-muted-foreground">
              Start building free with local sandboxes and scale seamlessly to high-throughput
              sovereign rails.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {/* Tier 1: Developer */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-sm hover:border-primary/40 hover:stripe-card-shadow-md transition-all duration-200">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-normal tracking-tight text-foreground font-display">
                    Developer
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For local development, sandbox verification, and prototyping.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-light font-tnum tracking-[-0.03em] text-foreground">
                    $0
                  </span>
                  <span className="text-xs text-muted-foreground">/ free forever</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Full SQLite and in-memory test engines</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Paymob, Fawry & Stripe sandbox rails</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>TypeScript, PHP, and .NET client SDKs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Deterministic idempotency protection</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button variant="outline" size="sm" pill className="w-full shadow-2xs" asChild>
                  <Link href="/register">Start building free</Link>
                </Button>
              </div>
            </div>

            {/* Tier 2 (Featured): Growth Pro — Inverted Deep Midnight Navy */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="flex flex-col justify-between rounded-2xl bg-brand-dark-900 text-white p-6 sm:p-8 stripe-card-shadow-lg border border-primary/40 relative overflow-hidden"
            >
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-normal tracking-tight text-white font-display">
                    Growth Pro
                  </h3>
                  <p className="mt-1 text-xs text-on-dark-soft">
                    For production apps processing live cards, wallets, and retail cash.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-light font-tnum tracking-[-0.03em] text-white">
                    $49
                  </span>
                  <span className="text-xs text-on-dark-soft">/ month</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/15 text-xs text-on-dark-soft">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Production Paymob, Fawry & Stripe rails</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Postgres persistent ledger with pooling</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated HMAC & SHA-256 webhooks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sub-millisecond Rust gateway engine</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  size="sm"
                  pill
                  className="w-full bg-white hover:bg-neutral-100 text-brand-dark-900 font-semibold shadow-sm"
                  asChild
                >
                  <Link href="/register">
                    <span>Get started with Pro</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Tier 3: Enterprise Sovereign */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-sm md:col-span-2 lg:col-span-1 hover:border-primary/40 hover:stripe-card-shadow-md transition-all duration-200">
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-normal tracking-tight text-foreground font-display">
                    Enterprise Sovereign
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For banks, fintechs, and high-volume sovereign operations.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-light font-tnum tracking-[-0.03em] text-foreground">
                    Custom
                  </span>
                  <span className="text-xs text-muted-foreground">/ tailored SLA</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>On-premise & air-gapped deployment</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Direct Central Bank of Egypt / Meeza rails</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Dedicated RabbitMQ & PgBouncer topologies</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>24/7 financial infrastructure engineering</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button variant="outline" size="sm" pill className="w-full shadow-2xs" asChild>
                  <Link href="mailto:support@openwrapper.org">Contact sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section
        id="faq"
        className="py-20 sm:py-32 border-b border-border/40 scroll-mt-20 sm:scroll-mt-24"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-3 mb-10 sm:mb-14"
          >
            <h2 className="text-balance text-2xl sm:text-4xl lg:text-5xl font-light tracking-[-0.04em] text-foreground font-display">
              Everything you need to know
            </h2>
            <p className="max-w-xl text-xs sm:text-base text-muted-foreground">
              Common questions about sovereign routing, zero-knowledge architecture, and local MENA
              rails.
            </p>
          </motion.div>

          <FaqKnowledgeAccordion />
        </div>
      </section>

      {/* 10. Pre-Footer CTA Band */}
      <section className="relative overflow-hidden py-16 sm:py-28 border-b border-border/40">
        <AtmosphericGradientMesh />
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden flex flex-col items-center text-center gap-6 rounded-2xl border border-border bg-card/85 backdrop-blur-md p-6 sm:p-14 stripe-card-shadow-lg"
          >
            <div className="relative z-10 flex flex-col gap-3">
              <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1 text-xs text-foreground shadow-2xs">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">
                  Open source · Zero vendor lock-in · Ready in minutes
                </span>
              </div>
              <h2 className="text-balance text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-foreground font-display">
                Start building with OpenWrapper.
              </h2>
              <p className="max-w-lg text-xs sm:text-base text-muted-foreground font-light">
                Test with the interactive sandbox, inspect OpenAPI specs, or install our client
                libraries in your stack today.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2 w-full sm:w-auto">
              <Button
                size="xl"
                pill
                className="gap-2 shadow-md hover:shadow-lg text-center"
                asChild
              >
                <Link href="/register">
                  <span>Start building free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="xl"
                pill
                className="border-border bg-card/80 hover:bg-muted text-foreground shadow-2xs hover:shadow-sm text-center"
                asChild
              >
                <Link href="/dashboard/documentation">Explore Sandbox</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 11. Authoritative Stripe-Grade Mega-Footer */}
      <GlobalFooterNavigation />
    </main>
  )
}
