"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[450px] max-w-2xl flex-col items-center justify-center p-6 text-center animate-rise">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-2xs mb-4">
        <AlertTriangle className="size-6" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Failed to load dashboard data
      </h2>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
        We encountered an error while querying your transaction metrics or database records.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground/80 bg-muted/40 border border-border/80 rounded-md py-1 px-2.5">
          Error digest: {error.digest}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button size="sm" onClick={() => reset()} className="font-mono text-xs shadow-2xs">
          <RefreshCw className="size-3.5 mr-1" /> Retry query
        </Button>
      </div>
    </div>
  )
}
