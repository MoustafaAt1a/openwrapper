interface GradientMeshProps {
  className?: string
  intensity?: "vibrant" | "subtle" | "dark"
}

export function GradientMesh({ className = "", intensity = "vibrant" }: GradientMeshProps) {
  const opacityClass =
    intensity === "subtle"
      ? "opacity-50 dark:opacity-25"
      : intensity === "dark"
        ? "opacity-35 dark:opacity-20"
        : "opacity-85 dark:opacity-40"

  return (
    <div
      className={`pointer-events-none absolute inset-0 max-w-full overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Upper Third Atmospheric Mesh */}
      <div
        className={`absolute -top-[100px] sm:-top-[120px] left-1/2 -translate-x-1/2 w-[750px] sm:w-[1200px] lg:w-[1600px] h-[520px] sm:h-[650px] lg:h-[750px] ${opacityClass} blur-[60px] sm:blur-[90px] lg:blur-[100px] transition-opacity duration-700`}
      >
        {/* Organic Blob 1: Sherbet Warm Cream & Lemon */}
        <div className="absolute top-[8%] left-[10%] w-[550px] h-[350px] rounded-full bg-gradient-to-br from-[#f5e9d4] via-[#ffb048] to-[#ff7e67] opacity-80 mix-blend-multiply dark:mix-blend-screen animate-[mesh-float_14s_ease-in-out_infinite]" />

        {/* Organic Blob 2: Ruby & Magenta Pulse */}
        <div className="absolute top-[18%] left-[32%] w-[600px] h-[400px] rounded-full bg-gradient-to-tr from-[#ea2261] via-[#f96bee] to-[#ff6b8b] opacity-70 mix-blend-multiply dark:mix-blend-screen animate-[mesh-float_18s_ease-in-out_infinite_reverse]" />

        {/* Organic Blob 3: Signature Electric Indigo Anchor */}
        <div className="absolute top-[12%] right-[15%] w-[650px] h-[450px] rounded-full bg-gradient-to-bl from-[#533afd] via-[#665efd] to-[#4434d4] opacity-85 mix-blend-multiply dark:mix-blend-screen animate-[mesh-float_16s_ease-in-out_infinite]" />

        {/* Organic Blob 4: Lavender / Soft Indigo Fill */}
        <div className="absolute top-[32%] left-[25%] w-[700px] h-[380px] rounded-full bg-gradient-to-r from-[#b9b9f9] via-[#8c82fc] to-[#533afd] opacity-75 mix-blend-multiply dark:mix-blend-screen animate-[mesh-float_22s_ease-in-out_infinite_alternate]" />

        {/* Organic Blob 5: Warm Amber Highlight */}
        <div className="absolute top-[5%] right-[30%] w-[400px] h-[300px] rounded-full bg-gradient-to-br from-[#ffd280] via-[#ff9f43] to-[#ea2261] opacity-60 mix-blend-multiply dark:mix-blend-screen" />
      </div>

      {/* Subtle Noise / Canvas Grain Overlay for Ultra-Premium Feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(83,58,253,0.18),rgba(0,0,0,0))]" />

      {/* Fade out smoothly at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}

export { GradientMesh as StripeGradientMesh }
