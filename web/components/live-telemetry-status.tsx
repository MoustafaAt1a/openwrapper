"use client"

import { useEffect, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Headless silent background updater that periodically refreshes
 * dashboard telemetry without rendering any visible UI badge.
 */
export function LiveTelemetryStatus() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if tab is active, visible, and not already busy
      if (
        !isRefreshingRef.current &&
        !isPending &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        isRefreshingRef.current = true
        startTransition(() => {
          router.refresh()
          setTimeout(() => {
            isRefreshingRef.current = false
          }, 1000)
        })
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [isPending, router])

  return null
}
