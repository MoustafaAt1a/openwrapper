"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { ProviderMixPoint } from "@/lib/dashboard-telemetry-service"

const PROVIDER_COLORS: Record<string, string> = {
  paymob: "#533afd",
  fawry: "#f59e0b",
  stripe: "#00d4ff",
  kashier: "#ea2261",
  mock: "#10b981",
}

const FALLBACK_COLORS = ["#533afd", "#f59e0b", "#00d4ff", "#ea2261", "#10b981"]

function getProviderColor(provider: string, idx: number): string {
  const key = provider.toLowerCase()
  return PROVIDER_COLORS[key] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

interface ProviderMixChartProps {
  data: ProviderMixPoint[]
}

export function ProviderRailMixChart({ data }: ProviderMixChartProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const activeData = data.filter((d) => d.count > 0)
  const total = activeData.reduce((s, d) => s + d.count, 0)

  if (!activeData.length) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#111630]/30 p-6 text-center">
        <p className="text-xs font-medium text-[#0d253d] dark:text-white">
          No payments processed yet
        </p>
        <p className="mt-1 text-[11px] text-[#64748d] dark:text-[#8ca3ba] max-w-xs">
          Routing between Paymob, Fawry, and Stripe will automatically populate rail distribution.
        </p>
      </div>
    )
  }

  const chartData = activeData.map((d) => ({ name: d.provider, value: d.count }))

  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-center">
        <div className="relative h-36 w-36 shrink-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={chartData.length > 1 ? 3 : 0}
                  stroke="transparent"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={entry.name} fill={getProviderColor(entry.name, i)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString()} payments`,
                    String(name).toUpperCase(),
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    borderColor: "rgba(140, 163, 186, 0.2)",
                    backgroundColor: "rgba(12, 16, 36, 0.95)",
                    color: "#ffffff",
                    fontFamily: "monospace",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full animate-pulse rounded-full bg-black/[0.03] dark:bg-white/[0.03]" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-base font-semibold text-[#0d253d] dark:text-white">
              {total}
            </span>
            <span className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] uppercase font-mono tracking-wider">
              Total
            </span>
          </div>
        </div>

        <ul className="flex w-full min-w-0 flex-col gap-2.5 text-xs sm:flex-1">
          {activeData.map((d, i) => {
            const pct = total ? Math.round((d.count / total) * 100) : 0
            const color = getProviderColor(d.provider, i)
            return (
              <li key={d.provider} className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 shrink-0 rounded-full shadow-xs"
                    style={{ background: color }}
                  />
                  <span className="capitalize font-medium text-[#0d253d] dark:text-white truncate">
                    {d.provider}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="font-medium text-[#0d253d] dark:text-white">
                    {d.count.toLocaleString()}
                  </span>
                  <span className="text-[#64748d] dark:text-[#8ca3ba] text-[11px]">({pct}%)</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export const ProviderMixChart = ProviderRailMixChart
export default ProviderRailMixChart

