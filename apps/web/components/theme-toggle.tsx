"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        pill
        className={`size-9 border-border/70 bg-card/60 text-muted-foreground backdrop-blur-xs ${className}`}
        aria-label="Toggle theme"
        disabled
      >
        <span className="size-4" />
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon-sm"
      pill
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative size-9 border-border/70 bg-card/80 text-foreground hover:bg-muted/80 backdrop-blur-xs transition-all stripe-card-shadow-2xs hover:stripe-card-shadow-xs cursor-pointer ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100 text-primary-soft" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
