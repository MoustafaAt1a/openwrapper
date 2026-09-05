"use client"

import {
  BookOpen01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Key01Icon,
  Logout01Icon,
  Menu01Icon,
  SlidersHorizontalIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { GradientMesh } from "@/components/gradient-mesh"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { authClient } from "@/lib/auth-client"

interface NavItem {
  label: string
  icon: any
  href: string
  badge?: string
}

const mainNav: NavItem[] = [
  { label: "Overview", icon: DashboardSquare01Icon, href: "/dashboard" },
  { label: "Payments", icon: CreditCardIcon, href: "/dashboard/payments" },
  { label: "API Keys", icon: Key01Icon, href: "/dashboard/api-keys" },
  { label: "Requests", icon: TerminalIcon, href: "/dashboard/requests" },
]

const devNav: NavItem[] = [
  { label: "API Explorer", icon: BookOpen01Icon, href: "/dashboard/documentation" },
  { label: "Providers", icon: SlidersHorizontalIcon, href: "/dashboard/providers" },
]

function SidebarContent({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const pathname = usePathname()

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col justify-between bg-white/95 dark:bg-[#0c1024]/95 backdrop-blur-xl border-r border-[#e3e8ee] dark:border-white/10">
      <div>
        {/* Workspace Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={26}
              height={26}
              className="size-6.5 rounded-lg object-cover ring-1 ring-[#e3e8ee] dark:ring-white/20 transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight tracking-tight text-[#0d253d] dark:text-white">
                OpenWrapper
              </span>
              <span className="text-[10px] text-[#64748d] dark:text-[#8ca3ba]">Control Plane</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[9px] uppercase px-2 py-0.5 rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono"
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse mr-1 inline-block" />
              Live
            </Badge>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex flex-col gap-6 px-3 py-6">
          {/* Main Menu */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#6b7f99]">
              Platform
            </span>
            <nav className="flex flex-col gap-0.5 mt-1" aria-label="Main menu">
              {mainNav.map(({ label, icon: Icon, href, badge }) => {
                const active = pathname === href
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      active
                        ? "bg-[#533afd] text-white shadow-sm font-semibold"
                        : "text-[#273951] dark:text-[#c2d1e0] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-[#0d253d] dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <HugeiconsIcon icon={Icon} size={16} />
                      <span>{label}</span>
                    </div>
                    {badge && <span className="font-mono text-[10px] opacity-75">{badge}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Developers & Providers */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#6b7f99]">
              Developers
            </span>
            <nav className="flex flex-col gap-0.5 mt-1" aria-label="Developer menu">
              {devNav.map(({ label, icon: Icon, href }) => {
                const active =
                  pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      active
                        ? "bg-[#533afd] text-white shadow-sm font-semibold"
                        : "text-[#273951] dark:text-[#c2d1e0] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-[#0d253d] dark:hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={Icon} size={16} />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="border-t border-[#e3e8ee] dark:border-white/10 p-3 bg-white/40 dark:bg-[#0a0e20]/60">
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-2.5 shadow-2xs">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#533afd] to-[#8c82fc] text-white text-xs font-semibold shadow-2xs">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-medium text-[#0d253d] dark:text-white"
                title={name}
              >
                {name}
              </p>
              <p className="truncate text-[10px] text-[#64748d] dark:text-[#8ca3ba]" title={email}>
                {email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 p-1.5 rounded-lg text-[#64748d] hover:bg-red-500/10 hover:text-[#ea2261] transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function DashboardShell({
  children,
  name,
  email,
}: {
  children: React.ReactNode
  name: string
  email: string
}) {
  return (
    <div className="min-h-screen bg-[#f6f9fc] dark:bg-[#080b14] text-[#0d253d] dark:text-[#f6f9fc] relative overflow-hidden">
      {/* Ambient Signature Atmosphere Mesh */}
      <GradientMesh className="opacity-25 pointer-events-none" />

      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[#e3e8ee] dark:border-white/10 bg-white/95 dark:bg-[#0c1024]/95 backdrop-blur-xl lg:block z-20">
        <SidebarContent name={name} email={email} />
      </aside>

      <div className="lg:pl-60 min-w-0 w-full overflow-x-hidden relative z-10">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e3e8ee]/80 dark:border-white/10 bg-white/80 dark:bg-[#0c1024]/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Open menu"
                      className="rounded-full"
                    >
                      <HugeiconsIcon icon={Menu01Icon} size={18} />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SidebarContent name={name} email={email} />
                </SheetContent>
              </Sheet>
            </div>
            <span className="text-sm font-semibold text-[#0d253d] dark:text-white tracking-tight lg:hidden">
              OpenWrapper
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#e3e8ee] dark:border-white/10 bg-white/80 dark:bg-[#111630]/80 px-3 py-1 text-[11px] font-mono text-[#64748d] dark:text-[#8ca3ba]">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gateway :8080 Connected</span>
            </div>
            <Link
              href="/dashboard/documentation"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e8ee] dark:border-white/15 bg-white dark:bg-white/5 hover:bg-[#f6f9fc] dark:hover:bg-white/10 px-3.5 py-1.5 text-xs font-medium text-[#0d253d] dark:text-white shadow-2xs transition-all"
            >
              <HugeiconsIcon icon={BookOpen01Icon} size={14} className="text-[#533afd]" />
              <span className="hidden sm:inline">API Explorer</span>
            </Link>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-4rem)] min-w-0 w-full p-4 sm:p-6 lg:p-8">
          <div className="relative z-10 min-w-0 w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
