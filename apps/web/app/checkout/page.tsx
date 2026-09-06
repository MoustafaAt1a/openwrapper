import Image from "next/image"
import Link from "next/link"
import { CheckoutExperience } from "@/components/checkout-experience"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Live Store Checkout — OpenWrapper",
  description:
    "Test real-world payment flows across Paymob, Fawry, and Stripe using the OpenWrapper TypeScript SDK.",
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/85 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper Logo"
              width={30}
              height={30}
              className="size-7 rounded-md object-cover ring-1 ring-border/80"
            />
            <span className="font-bold text-sm tracking-tight text-foreground">OpenWrapper</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs hidden sm:inline-flex"
            asChild
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs border-border/80 hidden md:inline-flex"
            asChild
          >
            <Link href="/dashboard/documentation">API Docs</Link>
          </Button>
          <Button size="sm" className="font-mono text-xs shadow-2xs" asChild>
            <Link href="/dashboard/payments">View Ledger</Link>
          </Button>
        </div>
      </header>

      {/* Main Checkout Viewport */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8">
        <CheckoutExperience />
      </main>

      {/* Universal Mega-Footer */}
      <SiteFooter />
    </div>
  )
}
