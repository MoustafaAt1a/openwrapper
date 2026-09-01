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
    <div className="flex h-full flex-col gap-3">
      <p className="text-sm font-medium text-foreground">Provider mix</p>
      <div className="flex flex-1 items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={64}
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={data.length ? COLORS[i % COLORS.length] : "var(--muted)"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} payments`, String(name)]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full animate-pulse rounded-full bg-muted/30" />
          )}
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {data.length === 0 ? (
            <li className="text-muted-foreground">No payments yet</li>
          ) : (
            data.map((d, i) => (
              <li key={d.provider} className="flex items-center gap-2 capitalize">
                <span
                  className="size-2 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-foreground">{d.provider}</span>
                <span className="text-muted-foreground">
                  {d.count} ({total ? Math.round((d.count / total) * 100) : 0}%)
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
