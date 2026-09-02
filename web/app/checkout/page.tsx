import Link from "next/link"
import Image from "next/image"
import { CheckoutExperience } from "@/components/checkout-experience"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Live Checkout Demo — OpenWrapper",
  description: "Test real-world payment flows across Paymob, Fawry, and Stripe using the OpenWrapper TypeScript SDK.",
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
          <Badge variant="outline" className="font-mono text-[10px] hidden sm:inline-flex border-border/80">
            Live Store Checkout Demo
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="font-mono text-xs" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="outline" size="sm" className="font-mono text-xs border-border/80" asChild>
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

      {/* Minimal Footer */}
      <footer className="border-t border-border/80 bg-card py-6 px-4 sm:px-8 text-center text-xs font-mono text-muted-foreground">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} OpenWrapper. Unified Payment Rails & Telemetry.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Developer Dashboard
            </Link>
            <span>•</span>
            <Link href="/dashboard/documentation" className="hover:text-foreground transition-colors">
              SDK Reference
            </Link>
            <span>•</span>
            <Link href="https://github.com/MoustafaAt1a/openwrapper" target="_blank" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
