"use client"

import { Globe02Icon, LinkSquare01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e3e8ee] dark:border-[#1e2646] bg-[#f6f9fc] dark:bg-[#080b14] text-[#425466] dark:text-[#8ca3ba] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Top 6-Column Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 sm:gap-x-8 gap-y-10 mb-16">
          {/* Column 1: Products & Engines */}
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-xs font-semibold text-[#0d253d] dark:text-white">Products</span>
            <Link
              href="/#product"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Unified Gateway
            </Link>
            <Link
              href="/#regional"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Sovereign Meeza Rail
            </Link>
            <Link
              href="/#regional"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Fawry Kiosks (180k+)
            </Link>
            <Link
              href="/#regional"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Mobile Wallets
            </Link>
            <Link
              href="/checkout"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Mock Sandbox Rail
            </Link>
            <Link
              href="/checkout"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Checkout Experience
            </Link>
            <Link
              href="/#pricing"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Pricing & Tiers
            </Link>
          </div>

          {/* Column 2: Solutions */}
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-xs font-semibold text-[#0d253d] dark:text-white">Solutions</span>
            <Link
              href="/#product"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Cross-Border MENA
            </Link>
            <Link
              href="/#product"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Multi-Rail Redundancy
            </Link>
            <Link
              href="/#developers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Stateless Zero-Knowledge
            </Link>
            <Link
              href="/#developers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              High-Throughput E-Com
            </Link>
            <Link
              href="/#developers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Edge POS Terminals
            </Link>
          </div>

          {/* Column 3: Rails & Integrations */}
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-xs font-semibold text-[#0d253d] dark:text-white">
              Integrations
            </span>
            <Link
              href="/dashboard/providers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Paymob Integration
            </Link>
            <Link
              href="/dashboard/providers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Fawry Pay Engine
            </Link>
            <Link
              href="/dashboard/providers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Stripe Global Connect
            </Link>
            <Link
              href="/dashboard/providers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Mock Deterministic Rail
            </Link>
            <Link
              href="/dashboard/providers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Vodafone & Orange Wallets
            </Link>
            <Link
              href="/dashboard/providers"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Meeza National Scheme
            </Link>
          </div>

          {/* Column 4: Developers & SDKs */}
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-xs font-semibold text-[#0d253d] dark:text-white">Developers</span>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              API Reference
            </Link>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Mock Rail Test Vectors
            </Link>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              TypeScript SDK
            </Link>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              .NET 8 / 9 NuGet
            </Link>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              PHP 8.1+ Composer
            </Link>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              gRPC Protobuf v3
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              API Key Vault
            </Link>
          </div>

          {/* Column 5: Specifications & Resources */}
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-xs font-semibold text-[#0d253d] dark:text-white">Resources</span>
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/checkout"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Interactive Sandbox
            </Link>
            <Link
              href="/#regional"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Architecture Guide
            </Link>
            <Link
              href="https://github.com/MoustafaAt1a/openwrapper/releases"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Release Notes
            </Link>
            <Link
              href="/brand"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Brand & Assets
            </Link>
          </div>

          {/* Column 6: Project & Control Plane */}
          <div className="flex flex-col gap-3 text-xs">
            <span className="text-xs font-semibold text-[#0d253d] dark:text-white">Platform</span>
            <Link
              href="/dashboard"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Control Plane
            </Link>
            <Link
              href="/dashboard/payments"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Payments Ledger
            </Link>
            <Link
              href="/dashboard/requests"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors"
            >
              Live Telemetry
            </Link>
            <Link
              href="https://github.com/MoustafaAt1a/openwrapper"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#533afd] dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>GitHub Monorepo</span>
              <HugeiconsIcon icon={LinkSquare01Icon} size={12} />
            </Link>
          </div>
        </div>

        {/* Middle Brand & Telemetry Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t border-[#e3e8ee] dark:border-white/10 pt-8 mb-8">
          <div className="flex items-center gap-3">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/20"
            />
            <span className="font-semibold text-base text-[#0d253d] dark:text-white tracking-tight">
              OpenWrapper
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748d] dark:text-[#8ca3ba]">
            <span>Central Bank of Egypt Compliant</span>
            <span>·</span>
            <span>Stateless Zero-Knowledge Mode</span>
            <span>·</span>
            <span>Zero Vendor Lock-In</span>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Region */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e3e8ee] dark:border-white/5 pt-6 text-xs text-[#64748d] dark:text-[#8ca3ba]">
          <p>© 2026 OpenWrapper Project. Distributed under Apache 2.0 / MIT licenses.</p>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-[#0d253d] dark:text-white">
              <HugeiconsIcon icon={Globe02Icon} size={13} />
              <span>Egypt & Global (English / Arabic Ready)</span>
            </span>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
