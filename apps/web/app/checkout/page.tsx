import Image from "next/image"
import Link from "next/link"
import { CheckoutExperience } from "@/components/checkout-experience"
import { GradientMesh } from "@/components/gradient-mesh"
import { StripeSwoosh } from "@/components/swoosh"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Live Checkout — OpenWrapper",
  description:
    "Test real-world payment flows across Paymob, Fawry, Stripe, and Mock rails using the OpenWrapper unified gateway.",
}

export default function CheckoutPage() {
  return (
    <div className="relative isolate min-h-screen bg-[#f6f9fc] dark:bg-[#0a0d18] text-[#0d253d] dark:text-[#e3e8ee] flex flex-col justify-between selection:bg-[#533afd]/15 selection:text-[#533afd] overflow-x-hidden">
      {/* Signature Atmospheric Gradient Mesh & Swoosh Ribbon */}
      <GradientMesh className="opacity-70 dark:opacity-35" />
      <StripeSwoosh className="opacity-50 dark:opacity-30" />

      {/* Distraction-free Checkout Top Bar (Stripe / Polar.sh style) */}
      <header className="relative z-20 flex h-14 items-center justify-between border-b border-[#e3e8ee]/80 dark:border-white/10 bg-white/75 dark:bg-[#0f1426]/75 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white transition-colors"
          >
            <span>← Back to OpenWrapper</span>
          </Link>
        </div>

        {/* Center Identity - Clean, without any badges */}
        <div className="flex items-center gap-2">
          <Image
            src="/openwrapper-icon.jpeg"
            alt="OpenWrapper Logo"
            width={24}
            height={24}
            className="size-6 rounded-md object-cover ring-1 ring-[#e3e8ee] dark:ring-white/10"
          />
          <span className="font-semibold text-xs tracking-tight text-[#0d253d] dark:text-white">
            OpenWrapper Checkout
          </span>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs text-[#64748d] hover:text-[#0d253d] hidden sm:inline-flex h-8 px-2.5"
            asChild
          >
            <Link href="/dashboard/documentation">Docs</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs rounded-full border-[#e3e8ee] dark:border-white/15 h-8 px-3 bg-white/50 dark:bg-white/5"
            asChild
          >
            <Link href="/dashboard/payments">View Ledger</Link>
          </Button>
        </div>
      </header>

      {/* Main Checkout Viewport */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8">
        <CheckoutExperience />
      </main>

      {/* Minimalist Trust & Legal Footer (Polar / Stripe style) */}
      <footer className="relative z-10 border-t border-[#e3e8ee]/80 dark:border-white/10 bg-white/50 dark:bg-[#0f1426]/50 backdrop-blur-sm py-6 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748d] dark:text-[#8ca3ba]">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>Powered by OpenWrapper Gateway</span>
            <span>•</span>
            <span>256-bit TLS Encrypted</span>
            <span>•</span>
            <span>PCI-DSS Level 1 Compliant</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link
              href="/dashboard/documentation"
              className="hover:text-[#0d253d] dark:hover:text-white transition-colors"
            >
              API Docs
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="hover:text-[#0d253d] dark:hover:text-white transition-colors"
            >
              API Keys
            </Link>
            <Link href="/" className="hover:text-[#0d253d] dark:hover:text-white transition-colors">
              Platform Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
