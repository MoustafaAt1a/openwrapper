/** Dashboard pages require auth + Postgres; never prerender at `next build`. */
export const dynamic = "force-dynamic"

import { ensureDatabaseSchema, isDatabaseAvailable, lastDatabaseError } from "@/lib/db/init"

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await ensureDatabaseSchema()
  } catch (err) {
    console.warn("[DashboardLayout] DB init skipped:", (err as Error).message)
  }

  return (
    <>
      {!isDatabaseAvailable && (
        <div
          role="status"
          aria-live="polite"
          className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center font-mono text-xs text-amber-700 dark:text-amber-400"
        >
          <span>
            ⚠ Database offline ({lastDatabaseError || "unreachable"}). Telemetry is operating in
            fallback mode.
          </span>
        </div>
      )}
      {children}
    </>
  )
}
