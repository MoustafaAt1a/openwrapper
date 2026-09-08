import Image from "next/image"
import Link from "next/link"
import { MultiRailCheckoutExperience } from "@/components/multi-rail-checkout-experience"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
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
      <AtmosphericGradientMesh className="opacity-70 dark:opacity-35" />
      <StripeSwoosh className="opacity-50 dark:opacity-30" />

      {/* Distraction-free Checkout Top Bar */}
      <header className="relative z-20 flex h-14 items-center justify-between border-b border-[#e3e8ee]/80 dark:border-white/10 bg-white/75 dark:bg-[#0f1426]/75 px-4 backdrop-blur-md sm:px-8 stripe-card-shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back to OpenWrapper</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Image
            src="/openwrapper-icon.jpeg"
            alt="OpenWrapper Logo"
            width={24}
            height={24}
            className="size-6 rounded-md object-cover ring-1 ring-[#e3e8ee] dark:ring-white/10"
          />
          <span className="font-medium text-xs tracking-tight text-[#0d253d] dark:text-white">
            OpenWrapper Checkout
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-medium text-[#64748d] hover:text-[#0d253d] dark:hover:text-white hidden sm:inline-flex h-8 px-2.5"
            asChild
          >
            <Link href="/dashboard/documentation">Docs</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium rounded-full border-[#e3e8ee] dark:border-white/15 h-8 px-3.5 bg-white/50 dark:bg-white/5"
            asChild
          >
            <Link href="/dashboard/payments">View Ledger</Link>
          </Button>
        </div>
      </header>

      {/* Main Checkout Viewport */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8">
        <MultiRailCheckoutExperience />
      </main>

      {/* Minimalist Trust Footer */}
      <footer className="relative z-10 border-t border-[#e3e8ee]/60 dark:border-white/8 bg-white/40 dark:bg-[#0f1426]/40 backdrop-blur-sm py-4 px-4 sm:px-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748d] dark:text-[#8ca3ba]">
          <div className="flex items-center gap-2">
            <span>Powered by OpenWrapper</span>
            <span className="opacity-40">·</span>
            <span>256-bit TLS</span>
            <span className="opacity-40">·</span>
            <span>PCI-DSS Level 1</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/privacy"
              className="hover:text-[#0d253d] dark:hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[#0d253d] dark:hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link href="/" className="hover:text-[#0d253d] dark:hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
