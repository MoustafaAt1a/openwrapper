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
      ? "opacity-40 dark:opacity-20"
      : intensity === "dark"
        ? "opacity-25 dark:opacity-15"
        : "opacity-60 dark:opacity-30"

  return (
    <div
      className={`pointer-events-none absolute inset-0 max-w-full overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* High-Performance, Zero-Blur Pure CSS Radial Vignette Mesh */}
      <div
        className={`absolute -top-32 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] ${opacityClass} transition-opacity duration-500`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.22),transparent_70%)]" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_70%)]" />
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_70%)]" />
      </div>

      {/* Fade smoothly to background */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}

export const GradientMesh = AtmosphericGradientMesh
export const StripeGradientMesh = AtmosphericGradientMesh
export default AtmosphericGradientMesh
