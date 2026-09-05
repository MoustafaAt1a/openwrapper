"use client"

import { motion } from "motion/react"
import { GeometricShape, type ShapeColor } from "@/components/geometric-shape"

interface FloatingShapeConfig {
  shape: number
  color: ShapeColor
  size: number
  top?: string
  bottom?: string
  left?: string
  right?: string
  opacity: number
  duration: number
  delay: number
  rotateDirection: 1 | -1
  hideOnMobile?: boolean
}

const DEFAULT_SHAPES: FloatingShapeConfig[] = [
  {
    shape: 1,
    color: "violet",
    size: 130,
    top: "4%",
    left: "2%",
    opacity: 0.11,
    duration: 16,
    delay: 0,
    rotateDirection: 1,
  },
  {
    shape: 12,
    color: "emerald",
    size: 105,
    top: "10%",
    right: "3%",
    opacity: 0.12,
    duration: 18,
    delay: 1.5,
    rotateDirection: -1,
  },
  {
    shape: 24,
    color: "orange",
    size: 140,
    top: "44%",
    left: "1%",
    opacity: 0.09,
    duration: 20,
    delay: 2,
    rotateDirection: 1,
  },
  {
    shape: 35,
    color: "blue",
    size: 120,
    top: "52%",
    right: "2%",
    opacity: 0.11,
    duration: 17,
    delay: 3,
    rotateDirection: -1,
  },
  {
    shape: 42,
    color: "pink",
    size: 135,
    bottom: "12%",
    left: "3%",
    opacity: 0.09,
    duration: 22,
    delay: 1,
    rotateDirection: 1,
  },
  {
    shape: 55,
    color: "emerald",
    size: 110,
    bottom: "6%",
    right: "4%",
    opacity: 0.11,
    duration: 19,
    delay: 2.5,
    rotateDirection: -1,
  },
  {
    shape: 63,
    color: "violet",
    size: 85,
    top: "26%",
    right: "16%",
    opacity: 0.08,
    duration: 15,
    delay: 4,
    rotateDirection: 1,
    hideOnMobile: true,
  },
  {
    shape: 70,
    color: "orange",
    size: 80,
    bottom: "32%",
    left: "12%",
    opacity: 0.07,
    duration: 21,
    delay: 3.5,
    rotateDirection: -1,
    hideOnMobile: true,
  },
]

export function FameShapesBackground({
  density = "default",
  className = "",
}: {
  density?: "sparse" | "default" | "hero"
  className?: string
}) {
  const shapes =
    density === "sparse"
      ? DEFAULT_SHAPES.slice(0, 4)
      : density === "hero"
        ? DEFAULT_SHAPES
        : DEFAULT_SHAPES.slice(0, 6)

  return (
    <div
      className={`pointer-events-none absolute inset-0 max-w-full overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Ambient Mesh Glow Orbs from DESIGN.md Palette (Responsive sizing to avoid mobile overlap) */}
      <div className="absolute -top-24 left-1/4 size-[240px] sm:size-[380px] lg:size-[480px] rounded-full bg-[#8b5cf6]/8 blur-[80px] sm:blur-[140px] dark:bg-[#8b5cf6]/12" />
      <div className="absolute top-1/3 -right-20 size-[260px] sm:size-[420px] lg:size-[520px] rounded-full bg-[#34d399]/8 blur-[90px] sm:blur-[150px] dark:bg-[#34d399]/10" />
      <div className="absolute bottom-10 left-6 size-[220px] sm:size-[360px] lg:size-[450px] rounded-full bg-[#3b82f6]/8 blur-[80px] sm:blur-[130px] dark:bg-[#3b82f6]/10" />
      <div className="absolute top-2/3 right-1/4 size-[200px] sm:size-[320px] lg:size-[400px] rounded-full bg-[#fb923c]/7 blur-[80px] sm:blur-[140px] dark:bg-[#fb923c]/9" />

      {/* Floating Geometric Vector Shapes with responsive scaling */}
      {shapes.map((item, idx) => (
        <motion.div
          key={idx}
          className={`absolute ${item.hideOnMobile ? "hidden md:block" : ""}`}
          style={{
            top: item.top,
            bottom: item.bottom,
            left: item.left,
            right: item.right,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [item.opacity * 0.8, item.opacity, item.opacity * 0.8],
            y: [0, -18, 0],
            x: [0, 6 * item.rotateDirection, 0],
            rotate: [0, 8 * item.rotateDirection, -5 * item.rotateDirection, 0],
            scale: [1, 1.04, 1],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay,
          }}
        >
          <div className="scale-60 sm:scale-80 lg:scale-100 origin-center transition-transform">
            <GeometricShape
              shape={item.shape}
              color={item.color}
              size={item.size}
              className="filter drop-shadow-sm transition-transform duration-700"
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
