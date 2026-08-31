"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pause, Play, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LiveTelemetryStatus() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)

  // Track seconds since last update
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [lastUpdated])

  // Periodic Auto-refresh (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Only refresh if tab is active/visible
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        startTransition(() => {
          router.refresh()
          setLastUpdated(new Date())
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, router])

  function handleManualRefresh() {
    startTransition(() => {
      router.refresh()
      setLastUpdated(new Date())
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Live Badge */}
      <button
        type="button"
        onClick={() => setAutoRefresh((prev) => !prev)}
        title={autoRefresh ? "Click to pause live sync" : "Click to enable live sync"}
        className={`flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
          autoRefresh
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            : "border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${
            autoRefresh
              ? isPending
                ? "bg-amber-400 animate-ping"
                : "bg-emerald-500 animate-pulse"
              : "bg-muted-foreground/40"
          }`}
        />
        <span className="font-semibold tracking-wide">
          {autoRefresh ? (isPending ? "SYNCING..." : "LIVE") : "PAUSED"}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
        </span>
      </button>

      {/* Manual Refresh Button */}
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleManualRefresh}
        disabled={isPending}
        title="Refresh data now"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className={`size-3 ${isPending ? "animate-spin text-primary" : ""}`} />
      </Button>
    </div>
  )
}
