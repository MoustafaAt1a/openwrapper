"use client"

import { useEffect, useTransition, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * Headless silent background updater with route change debounce
 * and document visibility checks to prevent RSC stream collisions.
 */
export function LiveTelemetryStatus() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const isRefreshingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Reset refreshing lock on route change
    isRefreshingRef.current = false

    const interval = setInterval(() => {
      if (
        isMountedRef.current &&
        !isRefreshingRef.current &&
        !isPending &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        navigator.onLine
      ) {
        isRefreshingRef.current = true
        startTransition(() => {
          router.refresh()
          setTimeout(() => {
            if (isMountedRef.current) {
              isRefreshingRef.current = false
            }
          }, 2000)
        })
      }
    }, 12000)

    return () => clearInterval(interval)
  }, [pathname, isPending, router])

  return null
}
