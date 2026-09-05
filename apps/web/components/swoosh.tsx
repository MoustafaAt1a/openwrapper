"use client"

import { motion } from "motion/react"

export function StripeSwoosh({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute -top-8 xs:-top-12 sm:-top-20 -right-16 xs:-right-20 sm:-right-20 w-[380px] xs:w-[500px] sm:w-[900px] lg:w-[1100px] h-[400px] xs:h-[500px] sm:h-[750px] lg:h-[850px] overflow-hidden select-none z-0 max-w-[100vw] opacity-20 xs:opacity-30 sm:opacity-80 transition-opacity ${className}`}
      aria-hidden="true"
    >
      <motion.div
        animate={{
          y: [0, -14, 0],
          rotate: [0, 1, -0.5, 0],
          scale: [1, 1.015, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-full h-full origin-top-right"
      >
        <svg
          viewBox="0 0 1000 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_16px_40px_rgba(83,58,253,0.12)]"
        >
          <defs>
            {/* Gradient 1: Electric Indigo → Magenta → Ruby */}
            <linearGradient id="stripeRibbonMain" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#7928ca" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ea2261" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ff8038" stopOpacity="0.6" />
            </linearGradient>

            {/* Gradient 2: Warm Amber → Sherbet */}
            <linearGradient id="stripeRibbonWarm" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#ffd280" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ff9f43" stopOpacity="0.75" />
              <stop offset="75%" stopColor="#ea2261" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.3" />
            </linearGradient>

            {/* Gradient 3: Soft Lavender */}
            <linearGradient id="stripeRibbonSoft" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#b9b9f9" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#8c82fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.15" />
            </linearGradient>

            {/* Radial Core Glow */}
            <radialGradient id="stripeCoreGlow" cx="60%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#ea2261" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#533afd" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0d253d" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Glow */}
          <circle cx="650" cy="320" r="300" fill="url(#stripeCoreGlow)" className="blur-[60px]" />

          {/* Soft Fill Wave (Bottom Layer) */}
          <path
            d="M450 50 C 700 80, 920 220, 950 480 C 970 650, 850 750, 720 780 C 580 810, 480 720, 520 600 C 560 480, 720 400, 760 280 C 800 160, 680 90, 450 50 Z"
            fill="url(#stripeRibbonSoft)"
            className="opacity-60 blur-[35px] mix-blend-multiply dark:mix-blend-screen"
          />

          {/* Main Flowing Ribbon (Middle Layer) */}
          <path
            d="M320 20 C 560 40, 850 140, 920 380 C 970 540, 890 680, 780 730 C 650 790, 540 710, 580 570 C 620 420, 810 350, 820 220 C 830 110, 680 50, 320 20 Z"
            fill="url(#stripeRibbonMain)"
            className="opacity-85"
          />

          {/* Foreground Highlight Ribbon (Top Layer) */}
          <path
            d="M420 40 C 660 80, 880 180, 940 360 C 980 470, 940 560, 860 620 C 760 690, 660 660, 690 560 C 720 440, 860 360, 870 260 C 880 160, 740 90, 420 40 Z"
            fill="url(#stripeRibbonWarm)"
            className="opacity-75 mix-blend-screen"
          />

          {/* Shimmer Highlights */}
          <path
            d="M580 90 C 740 140, 890 260, 910 400"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="3"
            strokeLinecap="round"
            className="filter blur-[1px]"
          />
          <path
            d="M660 140 C 800 200, 920 320, 930 460"
            stroke="rgba(255, 210, 128, 0.35)"
            strokeWidth="2"
            strokeLinecap="round"
            className="filter blur-[1.5px]"
          />
        </svg>
      </motion.div>
    </div>
  )
}
