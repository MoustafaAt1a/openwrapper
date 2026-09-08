"use client"

import type { ProviderMixPoint } from "@/lib/dashboard-telemetry-service"
import { formatMinorUnits } from "@/lib/utils"

const RAIL_COLORS: Record<string, string> = {
  paymob: "#533afd",
  fawry: "#f59e0b",
  stripe: "#00d4ff",
  kashier: "#ea2261",
  mock: "#10b981",
}

interface ProviderPerformanceChartProps {
  data: ProviderMixPoint[]
  currency?: string
}

export function ProviderRailPerformanceChart({
  data,
  currency = "EGP",
}: ProviderPerformanceChartProps) {
  const providersWithData = data.filter((p) => p.count > 0)

  if (!providersWithData.length) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/50 p-6 text-center">
        <p className="text-xs font-medium text-foreground">No rail conversion data</p>
        <p className="mt-1 text-[11px] text-muted-foreground max-w-xs">
          Settlement rates across Paymob, Fawry, and Stripe will appear here as transactions
          complete.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {providersWithData.map((rail) => {
        const rate = rail.settlementRate
        const color = RAIL_COLORS[rail.provider.toLowerCase()] || "#533afd"
        const formattedVolume = formatMinorUnits(rail.settledVolumeMinor, currency)

        return (
          <div
            key={rail.provider}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-3.5 shadow-2xs"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: color }} />
                <span className="font-medium capitalize text-foreground">{rail.provider}</span>
                <span className="text-[10px] font-mono text-muted-foreground font-tnum">
                  {rail.settledCount} / {rail.count} settled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-foreground font-tnum">
                  {rate !== null ? `${rate.toFixed(1)}%` : "—"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground font-tnum">
                  ({formattedVolume})
                </span>
              </div>
            </div>

            {/* Conversion Progress Bar with Brand Gradient */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, rate ?? 0))}%`,
                  background: color,
                  boxShadow: `0 0 8px ${color}66`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const ProviderPerformanceChart = ProviderRailPerformanceChart
export default ProviderRailPerformanceChart
