"use client"

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

const STORAGE_KEY = "openwrapper_dashboard_mode"

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode>("test")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DashboardMode | null
      if (saved === "live" || saved === "test") {
        setModeState(saved)
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
    } catch {
      // Ignore storage errors
    }
  }

  const toggleMode = () => {
    setMode(mode === "live" ? "test" : "live")
  }

  return (
    <EnvironmentContext.Provider
      value={{
        mode: mounted ? mode : "test",
        isTestMode: (mounted ? mode : "test") === "test",
        isLiveMode: (mounted ? mode : "test") === "live",
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
