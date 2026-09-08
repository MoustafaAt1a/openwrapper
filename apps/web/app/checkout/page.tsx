import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { MultiRailCheckoutExperience } from "@/components/multi-rail-checkout-experience"

export const metadata = {
  title: "Live Checkout — OpenWrapper",
  description:
    "Test real-world payment flows across Paymob, Fawry, Stripe, and Mock rails using the OpenWrapper unified gateway.",
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      {/* 1. Global Navigation Bar */}
      <GlobalHeaderNavigation />

      {/* 2. Main Checkout Viewport with Signature Background */}
      <div className="relative isolate flex-1 overflow-hidden">
        <AtmosphericGradientMesh className="opacity-60 dark:opacity-30" />
        <StripeSwoosh className="opacity-40 dark:opacity-20" />

        <div className="relative z-10 px-4 sm:px-6 lg:px-8">
          <MultiRailCheckoutExperience />
        </div>
      </div>

      {/* 3. Global Enterprise Footer */}
      <GlobalFooterNavigation />
    </main>
  )
}
