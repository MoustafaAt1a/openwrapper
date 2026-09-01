/** Dashboard pages require auth + Postgres; never prerender at `next build`. */
export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
