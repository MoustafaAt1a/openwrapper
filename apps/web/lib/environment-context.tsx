"use client"

import { useRouter } from "next/navigation"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

export type DashboardMode = "live" | "test"

interface EnvironmentContextType {
  mode: DashboardMode
  isTestMode: boolean
  isLiveMode: boolean
  setMode: (mode: DashboardMode) => void
  toggleMode: () => void
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined)

export const DASHBOARD_MODE_COOKIE = "openwrapper_dashboard_mode"
const STORAGE_KEY = DASHBOARD_MODE_COOKIE

export function EnvironmentProvider({
  children,
  initialMode,
}: {
  children: React.ReactNode
  initialMode?: DashboardMode
}) {
  const [mode, setModeState] = useState<DashboardMode>(initialMode || "test")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      const cookieMatch = document.cookie.match(/openwrapper_dashboard_mode=(live|test)/)
      const cookieMode = cookieMatch ? (cookieMatch[1] as DashboardMode) : null
      const saved = (localStorage.getItem(STORAGE_KEY) as DashboardMode | null) || cookieMode
      if (saved === "live" || saved === "test") {
        setModeState(saved)
        // biome-ignore lint/suspicious/noDocumentCookie: client cookie sync for server-rendered dashboard
        document.cookie = `${STORAGE_KEY}=${saved}; path=/; max-age=31536000; SameSite=Lax`
      } else {
        // biome-ignore lint/suspicious/noDocumentCookie: client cookie sync for server-rendered dashboard
        document.cookie = `${STORAGE_KEY}=test; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch {
      // Ignore localStorage read errors in private browsing/sandboxes
    }
    setMounted(true)
  }, [])

  const setMode = (newMode: DashboardMode) => {
    setModeState(newMode)
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
      // biome-ignore lint/suspicious/noDocumentCookie: client cookie sync for server-rendered dashboard
      document.cookie = `${STORAGE_KEY}=${newMode}; path=/; max-age=31536000; SameSite=Lax`
    } catch {
      // Ignore storage errors
    }
    router.refresh()
  }

  const toggleMode = () => {
    setMode(mode === "live" ? "test" : "live")
  }

  const effectiveMode = mounted ? mode : initialMode || "test"

  return (
    <EnvironmentContext.Provider
      value={{
        mode: effectiveMode,
        isTestMode: effectiveMode === "test",
        isLiveMode: effectiveMode === "live",
        setMode,
        toggleMode,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironmentMode() {
  const context = useContext(EnvironmentContext)
  if (!context) {
    throw new Error("useEnvironmentMode must be used within an EnvironmentProvider")
  }
  return context
}
