"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isRippling, setIsRippling] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  const toggleTheme = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme = isDark ? "light" : "dark"

      setIsRippling(true)
      setTimeout(() => setIsRippling(false), 450)

      const doc = document as Document & {
        startViewTransition?: (updateCallback: () => void | Promise<void>) => {
          ready: Promise<void>
        }
      }

      if (
        !doc.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setTheme(nextTheme)
        return
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      )

      const transition = doc.startViewTransition(() => {
        setTheme(nextTheme)
      })

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ]

        document.documentElement.animate(
          {
            clipPath,
          },
          {
            duration: 450,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        )
      })
    },
    [isDark, setTheme],
  )

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        pill
        className={cn(
          "size-9 border-border/70 bg-card/60 text-muted-foreground backdrop-blur-xs",
          className,
        )}
        aria-label="Toggle theme"
        disabled
      >
        <span className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      pill
      onClick={toggleTheme}
      className={cn(
        "relative size-9 overflow-hidden border-border/70 bg-card/80 text-foreground hover:bg-muted/80 backdrop-blur-xs transition-all stripe-card-shadow-2xs hover:stripe-card-shadow-xs cursor-pointer group",
        "ring-1 ring-border/50 hover:ring-primary/30 active:scale-95 duration-200",
        isDark
          ? "hover:shadow-[0_0_12px_rgba(102,94,253,0.2)]"
          : "hover:shadow-[0_0_12px_rgba(245,158,11,0.2)]",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Clean minimal wrapping halo ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none",
          isDark
            ? "bg-gradient-to-tr from-primary/15 via-transparent to-primary/5 opacity-80 group-hover:opacity-100"
            : "bg-gradient-to-tr from-amber-500/15 via-transparent to-amber-500/5 opacity-80 group-hover:opacity-100",
        )}
        aria-hidden="true"
      />

      {/* Button click ripple wave */}
      {isRippling && (
        <span
          className="absolute inset-0 rounded-full bg-primary/20 animate-ping pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Sun Icon: Warm golden amber with rotational morphing */}
      <Sun className="size-4 rotate-0 scale-100 transition-all duration-300 ease-out dark:-rotate-90 dark:scale-0 text-amber-500 group-hover:text-amber-600 dark:text-transparent" />

      {/* Moon Icon: Soft electric violet with rotational morphing */}
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-300 ease-out dark:rotate-0 dark:scale-100 text-transparent dark:text-primary-soft group-hover:dark:text-primary" />

      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
