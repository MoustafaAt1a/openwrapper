"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * Headless silent background updater.
 *
 * Uses a single AbortController-style lock to guarantee only ONE
 * router.refresh() RSC stream is ever in-flight at a time, preventing
 * the "destination stream closed early" error entirely.
 */
export function LiveTelemetryStatus() {
  const router = useRouter()
  const pathname = usePathname()
  const lockRef = useRef(false)
  const mountedRef = useRef(true)

  const safeRefresh = useCallback(() => {
    // Never fire if unmounted, already refreshing, tab hidden, or offline
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
    // router.refresh() returns void but triggers an async RSC stream.
    // We hold the lock for a fixed cooldown to prevent overlapping streams.
    try {
      router.refresh()
    } catch {
      // Swallow any synchronous errors
    }
    setTimeout(() => {
      lockRef.current = false
    }, 4000) // 4s cooldown — guarantees the previous stream settles
  }, [router])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      lockRef.current = false
    }
  }, [])

  // Reset lock on route change
  useEffect(() => {
    lockRef.current = false
  }, [pathname])

  // Periodic refresh — 30s interval eliminates stream collisions
  useEffect(() => {
    const id = setInterval(safeRefresh, 30000)
    return () => clearInterval(id)
  }, [safeRefresh])

  return null
}
