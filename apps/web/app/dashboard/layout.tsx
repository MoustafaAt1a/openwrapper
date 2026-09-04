/** Dashboard pages require auth + Postgres; never prerender at `next build`. */
export const dynamic = "force-dynamic"

import { ensureDatabaseSchema } from "@/lib/db/init"

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await ensureDatabaseSchema()
  return children
}
