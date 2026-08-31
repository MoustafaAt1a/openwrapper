"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { AlertTriangle, Home, LayoutDashboard, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Uncaught application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Bar */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={26}
              height={26}
              className="size-6 rounded-md object-cover ring-1 ring-border/80"
            />
            <span className="font-semibold text-sm tracking-tight text-foreground">OpenWrapper</span>
          </Link>
          <Badge variant="destructive" className="font-mono text-[10px]">
            HTTP 500
          </Badge>
        </div>
      </header>

      {/* Main Error Body */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6 animate-rise">
          {/* Warning Icon Container */}
          <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-2xs">
            <AlertTriangle className="size-7" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              An unexpected error occurred while processing your request. The gateway telemetry has logged this event.
            </p>
            {error.digest && (
              <p className="font-mono text-[11px] text-muted-foreground/80 bg-muted/30 border border-border/80 rounded-md py-1 px-2 mt-1 select-all">
                Digest: {error.digest}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
            <Button
              size="sm"
              onClick={() => reset()}
              className="font-mono text-xs shadow-2xs flex-1"
            >
              <RefreshCw className="size-3.5 mr-1" /> Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs border-border/80 flex-1"
              asChild
            >
              <Link href="/dashboard">
                <LayoutDashboard className="size-3.5 mr-1" /> Dashboard
              </Link>
            </Button>
          </div>

          <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors pt-2">
            <Home className="size-3" /> Return to Homepage
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 py-4 px-6 text-center text-xs font-mono text-muted-foreground">
        OpenWrapper Unified Payment Gateway
      </footer>
    </div>
  )
}
