export interface AmbientFlowingRibbonProps {
  className?: string
  variant?: "stripe" | "sovereign"
}

export function StripeSwoosh({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute -top-8 xs:-top-12 sm:-top-20 -right-16 xs:-right-20 sm:-right-20 w-[380px] xs:w-[500px] sm:w-[900px] lg:w-[1100px] h-[400px] xs:h-[500px] sm:h-[750px] lg:h-[850px] overflow-hidden select-none z-0 max-w-[100vw] opacity-20 xs:opacity-30 sm:opacity-80 transition-opacity [contain:strict] [transform:translate3d(0,0,0)] ${className}`}
      aria-hidden="true"
    >
      <div className="relative w-full h-full origin-top-right animate-ribbon-sway [contain:strict]">
        <svg
          viewBox="0 0 1000 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="stripeRibbonMain" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#7928ca" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ea2261" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ff8038" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="stripeRibbonWarm" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#ffd280" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ff9f43" stopOpacity="0.75" />
              <stop offset="75%" stopColor="#ea2261" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="stripeRibbonSoft" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#b9b9f9" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#8c82fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.15" />
            </linearGradient>

            <radialGradient id="stripeCoreGlow" cx="60%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#ea2261" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#533afd" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0d253d" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d="M 400 100 C 650 150, 900 300, 950 500 C 980 650, 850 750, 700 780 C 550 800, 450 700, 500 550 C 550 400, 750 350, 800 200 C 830 100, 650 50, 400 100 Z"
            fill="url(#stripeCoreGlow)"
            className="filter blur-3xl opacity-60"
          />

          <path
            d="M 250 80 C 500 100, 800 250, 880 480 C 920 600, 840 720, 720 750 C 580 780, 480 680, 520 540 C 560 400, 780 320, 790 180 C 800 80, 620 40, 250 80 Z"
            fill="url(#stripeRibbonMain)"
            className="mix-blend-screen opacity-90"
          />

          <path
            d="M 350 120 C 600 160, 850 280, 900 450 C 940 550, 890 640, 800 680 C 700 720, 600 650, 620 540 C 650 420, 820 340, 840 220 C 850 120, 700 80, 350 120 Z"
            fill="url(#stripeRibbonWarm)"
            className="mix-blend-screen opacity-80"
          />

          <path
            d="M 450 180 C 680 220, 880 320, 920 420 C 960 520, 910 600, 840 630 C 760 660, 680 610, 700 520 C 720 420, 860 360, 870 260 C 880 160, 750 140, 450 180 Z"
            fill="url(#stripeRibbonSoft)"
            className="mix-blend-screen opacity-70"
          />

          <path
            d="M 200 120 C 480 150, 780 280, 860 460 C 900 580, 820 680, 720 710 C 620 740, 520 670, 560 560 C 600 440, 800 350, 820 220"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="filter blur-[0.5px]"
          />
        </svg>
      </div>
    </div>
  )
}

export function SovereignSwoosh({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -top-32 right-10 sm:right-1/4 w-[650px] h-[450px] bg-[#533afd]/15 rounded-full blur-[140px] [contain:strict] [transform:translate3d(0,0,0)]" />
      <div className="absolute -bottom-24 left-10 sm:left-1/4 w-[550px] h-[400px] bg-[#ea2261]/12 rounded-full blur-[140px] [contain:strict] [transform:translate3d(0,0,0)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#7928ca]/10 rounded-full blur-[160px] [contain:strict] [transform:translate3d(0,0,0)]" />

      <div className="absolute -top-16 sm:-top-28 -right-20 sm:-right-20 w-[480px] sm:w-[850px] lg:w-[1050px] h-[500px] sm:h-[750px] lg:h-[880px] origin-top-right opacity-60 sm:opacity-85 animate-ribbon-sway [contain:strict]">
        <svg
          viewBox="0 0 1000 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_25px_60px_rgba(83,58,253,0.18)]"
        >
          <defs>
            <linearGradient id="sovereignWrapMain" x1="12%" y1="0%" x2="88%" y2="100%">
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.9" />
              <stop offset="28%" stopColor="#7928ca" stopOpacity="0.85" />
              <stop offset="62%" stopColor="#ea2261" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ff9f43" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="sovereignWrapWarm" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#ffd280" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ff8038" stopOpacity="0.75" />
              <stop offset="78%" stopColor="#ea2261" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#533afd" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="sovereignWrapDeep" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#8c82fc" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#533afd" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1c1e54" stopOpacity="0.1" />
            </linearGradient>

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

          <path
            d="M440 60 C 680 90, 910 210, 950 460 C 970 630, 860 740, 730 770 C 600 800, 490 710, 530 590 C 570 470, 720 390, 760 270 C 800 150, 670 85, 440 60 Z"
            fill="url(#sovereignWrapDeep)"
            className="opacity-70 blur-[36px] mix-blend-screen"
          />

          <path
            d="M310 30 C 550 50, 840 150, 910 390 C 960 550, 880 690, 770 740 C 640 800, 530 720, 570 580 C 610 430, 800 360, 810 230 C 820 120, 670 60, 310 30 Z"
            fill="url(#sovereignWrapMain)"
            className="opacity-85 mix-blend-screen"
          />

          <path
            d="M410 50 C 650 90, 870 190, 930 370 C 970 480, 930 570, 850 630 C 750 700, 650 670, 680 570 C 710 450, 850 370, 860 270 C 870 170, 730 100, 410 50 Z"
            fill="url(#sovereignWrapWarm)"
            className="opacity-75 mix-blend-screen"
          />

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
      </div>

      <div className="absolute -bottom-28 sm:-bottom-44 -left-24 sm:-left-32 w-[460px] sm:w-[780px] lg:w-[960px] h-[480px] sm:h-[680px] lg:h-[800px] origin-bottom-left opacity-45 sm:opacity-70 animate-ribbon-sway [contain:strict]">
        <svg
          viewBox="0 0 1000 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_-20px_50px_rgba(234,34,97,0.14)]"
        >
          <defs>
            <linearGradient id="counterWrapMain" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#533afd" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#7928ca" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ea2261" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff8038" stopOpacity="0.5" />
            </linearGradient>

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

          <path
            d="M550 740 C 310 710, 80 590, 50 340 C 30 170, 140 60, 270 30 C 400 0, 510 90, 470 210 C 430 330, 280 410, 240 530 C 200 650, 320 715, 550 740 Z"
            fill="url(#counterWrapSoft)"
            className="opacity-70 blur-[34px] mix-blend-screen"
          />

          <path
            d="M690 770 C 450 750, 160 650, 90 410 C 40 250, 120 110, 230 60 C 360 0, 470 80, 430 220 C 390 370, 200 440, 190 570 C 180 680, 330 740, 690 770 Z"
            fill="url(#counterWrapMain)"
            className="opacity-80 mix-blend-screen"
          />

          <path
            d="M740 730 C 480 700, 200 620, 120 420 C 70 280, 130 160, 210 110 C 300 50, 400 100, 370 220 C 340 340, 190 430, 170 550"
            stroke="url(#counterStroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="filter blur-[0.5px]"
          />
        </svg>
      </div>

      <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] pointer-events-none opacity-20 [contain:strict]">
        <svg viewBox="0 0 750 550" fill="none" className="w-full h-full">
          <ellipse
            cx="375"
            cy="275"
            rx="320"
            ry="180"
            stroke="url(#stripeRibbonMain)"
            strokeWidth="1"
            strokeDasharray="4 8"
            transform="rotate(-15 375 275)"
          />
          <ellipse
            cx="375"
            cy="275"
            rx="260"
            ry="140"
            stroke="url(#stripeRibbonWarm)"
            strokeWidth="1"
            strokeDasharray="3 6"
            transform="rotate(20 375 275)"
          />
        </svg>
      </div>
    </div>
  )
}

export function AmbientFlowingRibbon({
  className = "",
  variant = "stripe",
}: AmbientFlowingRibbonProps) {
  if (variant === "sovereign") {
    return <SovereignSwoosh className={className} />
  }
  return <StripeSwoosh className={className} />
}
