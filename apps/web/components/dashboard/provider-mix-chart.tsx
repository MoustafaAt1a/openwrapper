"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { ProviderMixPoint } from "@/lib/dashboard-data"

const COLORS = ["#111111", "#555555", "#888888", "#bbbbbb"]

interface ProviderMixChartProps {
  data: ProviderMixPoint[]
}

export function ProviderMixChart({ data }: ProviderMixChartProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const activeData = data.filter((d) => d.count > 0)
  const total = activeData.reduce((s, d) => s + d.count, 0)

  if (!activeData.length) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 p-6 text-center">
        <p className="text-xs font-medium text-foreground">No payments processed yet</p>
        <p className="mt-1 text-[11px] text-muted-foreground max-w-xs">
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
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString()} payments`,
                    String(name).toUpperCase(),
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    borderColor: "var(--border)",
                    backgroundColor: "var(--popover)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full animate-pulse rounded-full bg-muted/30" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-base font-bold text-foreground">{total}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              Total
            </span>
          </div>
        </div>

        <ul className="flex w-full min-w-0 flex-col gap-2.5 text-xs sm:flex-1">
          {activeData.map((d, i) => {
            const pct = total ? Math.round((d.count / total) * 100) : 0
            return (
              <li key={d.provider} className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 shrink-0 rounded-xs"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="capitalize font-semibold text-foreground truncate">
                    {d.provider}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="font-medium text-foreground">{d.count.toLocaleString()}</span>
                  <span className="text-muted-foreground text-[11px]">({pct}%)</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
