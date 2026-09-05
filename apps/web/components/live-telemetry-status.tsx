"use client"

import { RefreshCw } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Observable live telemetry status badge and background synchronizer.
 *
 * Adheres to DESIGN.md (rounded-full pill, mono typography, subtle border).
 * Uses a single lock to guarantee only ONE router.refresh() RSC stream
 * is ever in-flight at a time, preventing stream collisions while providing
 * real-time visual feedback and on-demand refresh.
 */
export function LiveTelemetryStatus() {
  const router = useRouter()
  const _pathname = usePathname()
  const lockRef = useRef(false)
  const mountedRef = useRef(true)
  const [refreshing, setRefreshing] = useState(false)

  const safeRefresh = useCallback(() => {
    if (
      !mountedRef.current ||
      lockRef.current ||
      typeof document === "undefined" ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    ) {
      return
    }

    lockRef.current = true
    setRefreshing(true)
    try {
      router.refresh()
    } catch {
      // Swallow any synchronous errors
    }
    setTimeout(() => {
      if (mountedRef.current) {
        setRefreshing(false)
      }
      lockRef.current = false
    }, 4000)
  }, [router])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      lockRef.current = false
    }
  }, [])

  useEffect(() => {
    lockRef.current = false
    setRefreshing(false)
  }, [])

  useEffect(() => {
    const id = setInterval(safeRefresh, 30000)
    return () => clearInterval(id)
  }, [safeRefresh])

  return (
    <button
      type="button"
      onClick={safeRefresh}
      disabled={refreshing}
      title="Live telemetry active (30s interval). Click to refresh now."
      aria-label="Live telemetry active. Click to refresh."
      className="inline-flex h-8 items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 font-mono text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-75"
    >
      <span
        className={`size-1.5 rounded-full ${
          refreshing ? "bg-amber-500 animate-spin" : "bg-emerald-500 animate-pulse"
        }`}
      />
      <span>{refreshing ? "Syncing…" : "Telemetry · v0.1.3"}</span>
      <RefreshCw
        className={`size-2.5 opacity-60 transition-transform ${refreshing ? "animate-spin" : ""}`}
      />
    </button>
  )
}
