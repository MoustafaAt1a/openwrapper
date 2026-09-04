"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { ProviderMixPoint } from "@/lib/dashboard-data"

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)"]

interface ProviderMixChartProps {
  data: ProviderMixPoint[]
}

export function ProviderMixChart({ data }: ProviderMixChartProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const chartData = data.length
    ? data.map((d) => ({ name: d.provider, value: d.count }))
    : [{ name: "none", value: 1 }]

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-center">
        <div className="h-36 w-36 shrink-0">
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
                  outerRadius={64}
                  paddingAngle={data.length > 1 ? 2 : 0}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={data.length ? COLORS[i % COLORS.length] : "var(--muted)"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString()} payments`,
                    String(name),
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full animate-pulse rounded-full bg-muted/30" />
          )}
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-2.5 text-xs sm:flex-1">
          {data.length === 0 ? (
            <li className="text-muted-foreground">No payments recorded yet</li>
          ) : (
            data.map((d, i) => {
              const pct = total ? Math.round((d.count / total) * 100) : 0
              return (
                <li key={d.provider} className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="capitalize font-medium text-foreground truncate">
                      {d.provider}
                    </span>
                  </div>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {d.count.toLocaleString()}{" "}
                    <span className="text-[11px] opacity-75">({pct}%)</span>
                  </span>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
