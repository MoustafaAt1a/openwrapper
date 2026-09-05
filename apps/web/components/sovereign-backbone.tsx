"use client"

import { motion, useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"

interface StatItem {
  target: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  detail: string
  accent: string
  valueColor: string
}

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.8,
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
    <span ref={ref} className="font-tnum tracking-tight inline-flex items-baseline">
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
    accent: "border-[#8c82fc]",
    valueColor: "text-white",
  },
  {
    target: 12,
    prefix: "<",
    suffix: "ms",
    label: "P95 ingress latency",
    detail: "Axum 0.8 on Tokio — async from the socket to the response.",
    accent: "border-emerald-500",
    valueColor: "text-emerald-400",
  },
  {
    target: 99.999,
    suffix: "%",
    decimals: 3,
    label: "Gateway uptime target",
    detail: "Stateless, horizontally scalable pods with zero shared state.",
    accent: "border-[#8c82fc]",
    valueColor: "text-white",
  },
  {
    target: 180,
    suffix: "k+",
    label: "Fawry POS terminals",
    detail: "Nationwide cash collection network across Egypt.",
    accent: "border-amber-500",
    valueColor: "text-amber-400",
  },
]

export function SovereignBackbone() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32 bg-[#0c1024] text-white border-b border-[#1e2646]">
      {/* Animated Background Motion Layer */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* Ambient Pulsing Glow Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-[#533afd] blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.08, 0.16, 0.08],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full bg-[#ea2261] blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.06, 0.14, 0.06],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-[#00d4ff] blur-[150px]"
        />

        {/* Dynamic Topographic Resonance & Wave Rings */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 180,
            repeat: Infinity,
            ease: "linear",
          }}
          className="relative w-[1500px] h-[750px] max-w-none opacity-20 sm:opacity-25"
        >
          <svg viewBox="0 0 1200 600" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="ringGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#533afd" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#8c82fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ea2261" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#533afd" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {[
              { rx: 160, ry: 75, stroke: "url(#ringGrad1)", width: 1.2, dash: "none" },
              { rx: 280, ry: 130, stroke: "url(#ringGrad2)", width: 1, dash: "8 12" },
              { rx: 420, ry: 195, stroke: "url(#ringGrad1)", width: 1.2, dash: "none" },
              { rx: 570, ry: 260, stroke: "url(#ringGrad2)", width: 1, dash: "12 16" },
              { rx: 720, ry: 330, stroke: "url(#ringGrad1)", width: 0.8, dash: "none" },
              { rx: 880, ry: 400, stroke: "url(#ringGrad2)", width: 0.8, dash: "6 14" },
            ].map((ring, idx) => (
              <ellipse
                key={idx}
                cx="600"
                cy="300"
                rx={ring.rx}
                ry={ring.ry}
                stroke={ring.stroke}
                strokeWidth={ring.width}
                strokeDasharray={ring.dash}
              />
            ))}

            {/* Radar / Fiber Beam Accents */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360) / 16
              const rad = (angle * Math.PI) / 180
              const x2 = 600 + Math.cos(rad) * 600
              const y2 = 300 + Math.sin(rad) * 300
              return (
                <line
                  key={i}
                  x1="600"
                  y1="300"
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-[#533afd]/20"
                  strokeDasharray="4 8"
                />
              )
            })}
          </svg>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mb-14 sm:mb-20"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono tracking-wider uppercase text-emerald-400">
              Live Network Metrics
            </span>
          </div>
          <h2 className="text-balance text-3xl sm:text-5xl lg:text-[3.5rem] font-light tracking-[-0.04em] text-white leading-[1.1]">
            The backbone of sovereign commerce
          </h2>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-[#8ca3ba] font-light leading-relaxed">
            Integer arithmetic, microsecond latency, and formal state-machine proofs — engineered so
            you never think about infrastructure again.
          </p>
        </motion.div>

        {/* Metric Cards with Counter Animation and Staggered Viewport Entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {STATS.map((m, idx) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={`border-l-2 ${m.accent} rounded-r-xl bg-[#111630]/70 backdrop-blur-md px-5 py-5 sm:py-6 flex flex-col gap-1.5 transition-all duration-300 hover:bg-[#151c3d]/90 hover:shadow-lg hover:shadow-[#533afd]/10 border-t border-r border-b border-white/[0.04]`}
            >
              <div className={`text-3xl sm:text-4xl font-light tracking-tight ${m.valueColor}`}>
                <AnimatedCounter
                  target={m.target}
                  prefix={m.prefix}
                  suffix={m.suffix}
                  decimals={m.decimals}
                />
              </div>
              <span className="text-[13px] font-medium text-white/90">{m.label}</span>
              <span className="text-xs text-[#8ca3ba] leading-relaxed">{m.detail}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
