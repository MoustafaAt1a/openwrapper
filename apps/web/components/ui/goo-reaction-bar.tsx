"use client"

import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"

interface Reaction {
  id: string
  emoji: string
  label: string
}

interface GooReactionBarProps {
  reactions?: Reaction[]
  className?: string
  onReact?: (reactionId: string) => void
}

const DEFAULT_REACTIONS: Reaction[] = [
  { id: "helpful", emoji: "👍", label: "Helpful" },
  { id: "not-helpful", emoji: "👎", label: "Not helpful" },
]

/**
 * GooReactionBar — Spawning reaction bubbles with metaball physics.
 *
 * Clicking a reaction emoji spawns a floating bubble that pops upward
 * with goo physics from the trigger point, then fades out.
 */
export function GooReactionBar({
  reactions = DEFAULT_REACTIONS,
  className,
  onReact,
}: GooReactionBarProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [bursts, setBursts] = useState<{ id: string; key: number; emoji: string }[]>([])

  const handleReact = useCallback(
    (reaction: Reaction) => {
      setSelected(reaction.id)
      onReact?.(reaction.id)

      // Spawn burst particles
      const key = Date.now()
      const newBursts = Array.from({ length: 3 }, (_, i) => ({
        id: reaction.id,
        key: key + i,
        emoji: reaction.emoji,
      }))
      setBursts((prev) => [...prev, ...newBursts])

      // Clean up after animation
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.key < key || b.key >= key + 3 ? true : false))
      }, 900)
    },
    [onReact],
  )

  return (
    <div className={cn("relative inline-flex items-center gap-1", className)}>
      <span className="text-[11px] text-muted-foreground mr-1">Was this helpful?</span>

      <div className="relative inline-flex gap-0.5 goo-light">
        {reactions.map((reaction) => {
          const isSelected = selected === reaction.id
          return (
            <button
              key={reaction.id}
              type="button"
              onClick={() => handleReact(reaction)}
              aria-label={reaction.label}
              aria-pressed={isSelected}
              className={cn(
                "relative z-10 flex items-center justify-center size-8 rounded-full transition-all duration-200 cursor-pointer select-none",
                isSelected
                  ? "bg-primary/15 scale-110"
                  : "hover:bg-muted/60 hover:scale-105",
              )}
            >
              <span className="text-sm">{reaction.emoji}</span>
            </button>
          )
        })}

        {/* Burst particles */}
        {bursts.map((burst) => (
          <span
            key={burst.key}
            className="absolute left-1/2 bottom-full pointer-events-none text-sm"
            style={{
              animation: "goo-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              transform: `translateX(${(burst.key % 3 - 1) * 16}px)`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            {burst.emoji}
          </span>
        ))}
      </div>

      {selected && (
        <span className="text-[10px] text-primary font-medium ml-1 animate-[goo-pop_0.3s_ease-out]">
          Thanks!
        </span>
      )}
    </div>
  )
}
