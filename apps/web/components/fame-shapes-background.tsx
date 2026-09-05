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
}

const DEFAULT_SHAPES: FloatingShapeConfig[] = [
  {
    shape: 1,
    color: "violet",
    size: 140,
    top: "5%",
    left: "3%",
    opacity: 0.12,
    duration: 16,
    delay: 0,
    rotateDirection: 1,
  },
  {
    shape: 12,
    color: "emerald",
    size: 110,
    top: "12%",
    right: "4%",
    opacity: 0.14,
    duration: 18,
    delay: 1.5,
    rotateDirection: -1,
  },
  {
    shape: 24,
    color: "orange",
    size: 160,
    top: "42%",
    left: "2%",
    opacity: 0.1,
    duration: 20,
    delay: 2,
    rotateDirection: 1,
  },
  {
    shape: 35,
    color: "blue",
    size: 130,
    top: "50%",
    right: "3%",
    opacity: 0.12,
    duration: 17,
    delay: 3,
    rotateDirection: -1,
  },
  {
    shape: 42,
    color: "pink",
    size: 150,
    bottom: "15%",
    left: "5%",
    opacity: 0.1,
    duration: 22,
    delay: 1,
    rotateDirection: 1,
  },
  {
    shape: 55,
    color: "emerald",
    size: 120,
    bottom: "8%",
    right: "6%",
    opacity: 0.12,
    duration: 19,
    delay: 2.5,
    rotateDirection: -1,
  },
  {
    shape: 63,
    color: "violet",
    size: 90,
    top: "28%",
    right: "18%",
    opacity: 0.09,
    duration: 15,
    delay: 4,
    rotateDirection: 1,
  },
  {
    shape: 70,
    color: "orange",
    size: 85,
    bottom: "35%",
    left: "14%",
    opacity: 0.08,
    duration: 21,
    delay: 3.5,
    rotateDirection: -1,
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
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Ambient Mesh Glow Orbs from DESIGN.md Palette */}
      <div className="absolute -top-32 left-1/4 size-[480px] rounded-full bg-[#8b5cf6]/8 blur-[140px] dark:bg-[#8b5cf6]/12" />
      <div className="absolute top-1/3 -right-24 size-[520px] rounded-full bg-[#34d399]/8 blur-[150px] dark:bg-[#34d399]/10" />
      <div className="absolute bottom-10 left-10 size-[450px] rounded-full bg-[#3b82f6]/8 blur-[130px] dark:bg-[#3b82f6]/10" />
      <div className="absolute top-2/3 right-1/4 size-[400px] rounded-full bg-[#fb923c]/7 blur-[140px] dark:bg-[#fb923c]/9" />

      {/* Floating Geometric Vector Shapes */}
      {shapes.map((item, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{
            top: item.top,
            bottom: item.bottom,
            left: item.left,
            right: item.right,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [item.opacity * 0.8, item.opacity, item.opacity * 0.8],
            y: [0, -22, 0],
            x: [0, 8 * item.rotateDirection, 0],
            rotate: [0, 10 * item.rotateDirection, -6 * item.rotateDirection, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay,
          }}
        >
          <GeometricShape
            shape={item.shape}
            color={item.color}
            size={item.size}
            className="filter drop-shadow-sm transition-transform duration-700"
          />
        </motion.div>
      ))}
    </div>
  )
}
