interface GradientMeshProps {
  className?: string
  intensity?: "vibrant" | "subtle" | "dark"
}

export function AtmosphericGradientMesh({
  className = "",
  intensity = "vibrant",
}: GradientMeshProps) {
  const opacityClass =
    intensity === "subtle"
      ? "opacity-50 dark:opacity-25"
      : intensity === "dark"
        ? "opacity-35 dark:opacity-20"
        : "opacity-85 dark:opacity-40"

  return (
    <div
      className={`pointer-events-none absolute inset-0 max-w-full overflow-hidden select-none [contain:strict] [transform:translate3d(0,0,0)] ${className}`}
      aria-hidden="true"
    >
      {/* High-Performance Hardware-Accelerated Multi-Stop Atmospheric Mesh */}
      <div
        className={`absolute -top-[100px] sm:-top-[120px] left-1/2 -translate-x-1/2 w-[750px] sm:w-[1200px] lg:w-[1600px] h-[520px] sm:h-[650px] lg:h-[750px] ${opacityClass} blur-[50px] sm:blur-[70px] lg:blur-[80px] [transform:translate3d(0,0,0)] transition-opacity duration-700`}
      >
        {/* Layer 1: Electric Indigo Anchor */}
        <div className="absolute top-[10%] right-[15%] w-[650px] h-[450px] rounded-full bg-gradient-to-bl from-[#533afd] via-[#665efd] to-[#4434d4] opacity-80" />

        {/* Layer 2: Sherbet Warm Amber & Lemon */}
        <div className="absolute top-[5%] left-[10%] w-[550px] h-[350px] rounded-full bg-gradient-to-br from-[#ffd280] via-[#ff9f43] to-[#ff7e67] opacity-75" />

        {/* Layer 3: Ruby Magenta Accent */}
        <div className="absolute top-[20%] left-[30%] w-[600px] h-[380px] rounded-full bg-gradient-to-tr from-[#ea2261] via-[#f96bee] to-[#b9b9f9] opacity-65" />

        {/* Layer 4: Soft Lavender Field */}
        <div className="absolute top-[30%] left-[20%] w-[750px] h-[400px] rounded-full bg-gradient-to-r from-[#b9b9f9] via-[#8c82fc] to-[#533afd] opacity-70" />
      </div>

      {/* Subtle Noise / Canvas Grain Overlay for Ultra-Premium Feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(83,58,253,0.18),rgba(0,0,0,0))] [contain:strict]" />

      {/* Fade out smoothly at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background [contain:strict]" />
    </div>
  )
}

export const GradientMesh = AtmosphericGradientMesh
export const StripeGradientMesh = AtmosphericGradientMesh
export default AtmosphericGradientMesh
