"use client"

import { motion } from "motion/react"

export function SovereignSwoosh({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Atmospheric Ambient Glow Pools */}
      <div className="absolute -top-32 right-10 sm:right-1/4 w-[650px] h-[450px] bg-[#533afd]/15 rounded-full blur-[140px]" />
      <div className="absolute -bottom-24 left-10 sm:left-1/4 w-[550px] h-[400px] bg-[#ea2261]/12 rounded-full blur-[140px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#7928ca]/10 rounded-full blur-[160px]" />

      {/* 2. Primary Upper-Right Wrapping Ribbon Cluster */}
      <motion.div
        animate={{
          x: [0, 12, -8, 0],
          y: [0, -16, 8, 0],
          rotate: [0, 1.4, -1, 0],
          scale: [1, 1.025, 0.99, 1],
        }}
        transition={{
          duration: 22,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="absolute -top-16 sm:-top-28 -right-20 sm:-right-20 w-[480px] sm:w-[850px] lg:w-[1050px] h-[500px] sm:h-[750px] lg:h-[880px] origin-top-right opacity-60 sm:opacity-85"
      >
        <svg
          viewBox="0 0 1000 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_25px_60px_rgba(83,58,253,0.18)]"
        >
          <defs>
            {/* Gradient: Electric Indigo -> Violet -> Ruby -> Warm Gold */}
            <linearGradient id="sovereignWrapMain" x1="12%" y1="0%" x2="88%" y2="100%">
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.9" />
              <stop offset="28%" stopColor="#7928ca" stopOpacity="0.85" />
              <stop offset="62%" stopColor="#ea2261" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ff9f43" stopOpacity="0.6" />
            </linearGradient>

            {/* Gradient: Warm Sovereign Amber -> Rose */}
            <linearGradient id="sovereignWrapWarm" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#ffd280" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ff8038" stopOpacity="0.75" />
              <stop offset="78%" stopColor="#ea2261" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.3" />
            </linearGradient>

            {/* Gradient: Deep Atmosphere Violet */}
            <linearGradient id="sovereignWrapDeep" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#8c82fc" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#533afd" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1c1e54" stopOpacity="0.1" />
            </linearGradient>

            {/* Stroke Ribbon Gradients */}
            <linearGradient id="wrapStroke1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ffd280" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ea2261" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="wrapStroke2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8b1ff" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#533afd" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ea2261" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Deep Ambient Under-Wave */}
          <path
            d="M440 60 C 680 90, 910 210, 950 460 C 970 630, 860 740, 730 770 C 600 800, 490 710, 530 590 C 570 470, 720 390, 760 270 C 800 150, 670 85, 440 60 Z"
            fill="url(#sovereignWrapDeep)"
            className="opacity-70 blur-[36px] mix-blend-screen"
          />

          {/* Primary Flowing Wrapping Ribbon */}
          <path
            d="M310 30 C 550 50, 840 150, 910 390 C 960 550, 880 690, 770 740 C 640 800, 530 720, 570 580 C 610 430, 800 360, 810 230 C 820 120, 670 60, 310 30 Z"
            fill="url(#sovereignWrapMain)"
            className="opacity-85 mix-blend-screen"
          />

          {/* Intersecting Over-Wrap Crest */}
          <path
            d="M410 50 C 650 90, 870 190, 930 370 C 970 480, 930 570, 850 630 C 750 700, 650 670, 680 570 C 710 450, 850 370, 860 270 C 870 170, 730 100, 410 50 Z"
            fill="url(#sovereignWrapWarm)"
            className="opacity-75 mix-blend-screen"
          />

          {/* Precision Wrapping Thread Lines */}
          <path
            d="M260 70 C 520 100, 800 180, 880 380 C 930 520, 870 640, 790 690 C 700 750, 600 700, 630 580 C 660 460, 810 370, 830 250"
            stroke="url(#wrapStroke1)"
            strokeWidth="2"
            strokeLinecap="round"
            className="filter blur-[0.5px]"
          />
          <path
            d="M370 40 C 600 75, 830 160, 900 340 C 950 470, 910 580, 830 640"
            stroke="url(#wrapStroke2)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="filter blur-[1px]"
          />
        </svg>
      </motion.div>

      {/* 3. Secondary Lower-Left Counter-Wrapping Ribbon */}
      <motion.div
        animate={{
          x: [0, -10, 8, 0],
          y: [0, 14, -6, 0],
          rotate: [0, -1.2, 1, 0],
          scale: [1, 0.98, 1.02, 1],
        }}
        transition={{
          duration: 26,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="absolute -bottom-28 sm:-bottom-44 -left-24 sm:-left-32 w-[460px] sm:w-[780px] lg:w-[960px] h-[480px] sm:h-[680px] lg:h-[800px] origin-bottom-left opacity-45 sm:opacity-70"
      >
        <svg
          viewBox="0 0 1000 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_-20px_50px_rgba(234,34,97,0.14)]"
        >
          <defs>
            {/* Lower Wrap Gradient: Ruby -> Violet -> Electric Indigo */}
            <linearGradient id="counterWrapMain" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#7928ca" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ea2261" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff8038" stopOpacity="0.5" />
            </linearGradient>

            {/* Counter Wrap Atmosphere */}
            <linearGradient id="counterWrapSoft" x1="85%" y1="85%" x2="15%" y2="15%">
              <stop offset="0%" stopColor="#ea2261" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#533afd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0c1024" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="counterStroke" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#a8b1ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ea2261" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Soft Counter Ambient Ribbon */}
          <path
            d="M550 740 C 310 710, 80 590, 50 340 C 30 170, 140 60, 270 30 C 400 0, 510 90, 470 210 C 430 330, 280 410, 240 530 C 200 650, 320 715, 550 740 Z"
            fill="url(#counterWrapSoft)"
            className="opacity-70 blur-[34px] mix-blend-screen"
          />

          {/* Main Counter-Wrapping Geometric Ribbon */}
          <path
            d="M690 770 C 450 750, 160 650, 90 410 C 40 250, 120 110, 230 60 C 360 0, 470 80, 430 220 C 390 370, 200 440, 190 570 C 180 680, 330 740, 690 770 Z"
            fill="url(#counterWrapMain)"
            className="opacity-80 mix-blend-screen"
          />

          {/* Delicate Counter-Wrap Wire Contour */}
          <path
            d="M740 730 C 480 700, 200 620, 120 420 C 70 280, 130 160, 210 110 C 300 50, 400 100, 370 220 C 340 340, 190 430, 170 550"
            stroke="url(#counterStroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="filter blur-[0.5px]"
          />
        </svg>
      </motion.div>

      {/* 4. Center Interlocking Floating Contour Loops */}
      <motion.div
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 90,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
        className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] pointer-events-none opacity-25"
      >
        <svg viewBox="0 0 750 550" fill="none" className="w-full h-full">
          <ellipse
            cx="375"
            cy="275"
            rx="320"
            ry="180"
            stroke="url(#sovereignWrapMain)"
            strokeWidth="1"
            strokeDasharray="4 8"
            transform="rotate(-15 375 275)"
          />
          <ellipse
            cx="375"
            cy="275"
            rx="260"
            ry="140"
            stroke="url(#sovereignWrapWarm)"
            strokeWidth="1"
            strokeDasharray="3 6"
            transform="rotate(20 375 275)"
          />
        </svg>
      </motion.div>
    </div>
  )
}
