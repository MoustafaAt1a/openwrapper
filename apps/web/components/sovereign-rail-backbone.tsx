"use client"

import { motion, useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { SovereignSwoosh } from "@/components/ambient-flowing-ribbon"

interface StatItem {
  target: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  detail: string
  tag: string
}

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.6,
}: {
  target: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!isInView) return

    let startTime: number | null = null
    let animationFrameId: number

    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - 2 ** (-10 * t)
    }

    const step = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const elapsed = (currentTime - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutExpo(progress)

      const current = easedProgress * target
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setDisplayValue(target)
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [isInView, target, duration])

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString()

  return (
    <span ref={ref} className="font-light tracking-tight tabular-nums inline-flex items-baseline">
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

const STATS: StatItem[] = [
  {
    target: 100,
    suffix: "%",
    label: "Integer minor units",
    detail: "Zero IEEE 754 float inaccuracies across all currency balances.",
    tag: "Invariant I1",
  },
  {
    target: 12,
    prefix: "<",
    suffix: "ms",
    label: "P95 ingress latency",
    detail: "Non-blocking Axum runtime on Tokio from socket to provider rail.",
    tag: "Async I/O",
  },
  {
    target: 99.999,
    suffix: "%",
    decimals: 3,
    label: "Gateway availability",
    detail: "Stateless, horizontally scalable pods with zero secrets on disk.",
    tag: "Invariant I3",
  },
  {
    target: 180,
    suffix: "k+",
    label: "Fawry POS terminals",
    detail: "Nationwide retail cash collection network across Egypt.",
    tag: "Sovereign Reach",
  },
]

export function SovereignRailBackbone() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-[#0c1024] text-white border-y border-[#1e2646]">
      {/* Calm Architectural Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] rounded-full bg-[#533afd]/15 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full bg-[#ea2261]/10 blur-[130px]" />
      </div>

      {/* Signature Sovereign Sweeping Geometric Ribbon Swoosh */}
      <SovereignSwoosh />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mb-14 sm:mb-18"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#533afd]/15 text-[#a8b1ff] border border-[#533afd]/30 mb-4">
            <span className="size-1.5 rounded-full bg-[#533afd]" />
            <span>Production Rail Benchmarks</span>
          </div>

          <h2 className="text-balance text-3xl sm:text-5xl lg:text-[3.5rem] font-light tracking-tight text-white leading-[1.1]">
            The backbone of sovereign commerce
          </h2>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-[#8ca3ba] font-light leading-relaxed">
            Deterministic integer arithmetic, microsecond routing, and strict state-machine proofs —
            engineered so you never think about payment infrastructure again.
          </p>
        </motion.div>

        {/* Metric Cards with Clean Symmetrical Hairline Aesthetics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((m, idx) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-7 flex flex-col justify-between gap-4 transition-all duration-200 hover:bg-white/[0.05] hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#8ca3ba] bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
                  {m.tag}
                </span>
              </div>

              <div>
                <div className="text-4xl sm:text-5xl font-light tracking-tight text-white tabular-nums">
                  <AnimatedCounter
                    target={m.target}
                    prefix={m.prefix}
                    suffix={m.suffix}
                    decimals={m.decimals}
                  />
                </div>
                <h3 className="mt-2 text-sm font-medium text-white/95">{m.label}</h3>
                <p className="mt-1 text-xs text-[#8ca3ba] leading-relaxed font-light">{m.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const SovereignBackbone = SovereignRailBackbone
export default SovereignRailBackbone
