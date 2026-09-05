"use client"

import type { ProviderMixPoint } from "@/lib/dashboard-data"

interface ProviderPerformanceChartProps {
  data: ProviderMixPoint[]
}

export function ProviderPerformanceChart({ data }: ProviderPerformanceChartProps) {
  const providersWithData = data.filter((p) => p.count > 0)

  if (!providersWithData.length) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-6 text-center">
        <p className="text-xs font-medium text-foreground">No rail conversion data</p>
        <p className="mt-1 text-[11px] text-muted-foreground max-w-xs">
          Settlement rates across Paymob, Fawry, and Stripe will appear here as transactions
          complete.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {providersWithData.map((rail) => {
        const rate = rail.settlementRate
        const formattedVolume = new Intl.NumberFormat("en-EG", {
          style: "currency",
          currency: "EGP",
          maximumFractionDigits: 0,
        }).format(rail.settledVolumeMinor / 100)

        return (
          <div
            key={rail.provider}
            className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-3 shadow-2xs"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold capitalize text-foreground">{rail.provider}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {rail.settledCount} / {rail.count} settled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {rate !== null ? `${rate.toFixed(1)}%` : "—"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  ({formattedVolume})
                </span>
              </div>
            </div>

            {/* Conversion Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, rate ?? 0))}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
