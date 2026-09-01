"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  BookOpen,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Sliders,
  Terminal,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LiveTelemetryStatus } from "@/components/live-telemetry-status"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
}

const mainNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Payments", icon: CreditCard, href: "/dashboard/payments" },
  { label: "API Keys", icon: KeyRound, href: "/dashboard/api-keys" },
  { label: "Requests", icon: Terminal, href: "/dashboard/requests" },
]

const devNav: NavItem[] = [
  { label: "API Explorer", icon: BookOpen, href: "/dashboard/documentation" },
  { label: "Providers", icon: Sliders, href: "/dashboard/providers" },
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
    <div className="flex h-full flex-col justify-between bg-card">
      <div>
        {/* Workspace Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/80 px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-md object-cover ring-1 ring-border/80"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight tracking-tight text-foreground">OpenWrapper</span>
              <span className="text-[10px] text-muted-foreground">Payment gateway</span>
            </div>
          </Link>
          <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-border/80 text-muted-foreground">
            Sandbox
          </Badge>
        </div>

        {/* Navigation Sections */}
        <div className="flex flex-col gap-6 px-3 py-5">
          {/* Main Menu */}
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-1.5">
            <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Platform
            </span>
            <nav className="flex flex-col gap-1" aria-label="Main menu">
              {mainNav.map(({ label, icon: Icon, href, badge }) => {
                const active = pathname === href
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </div>
                    {badge && (
                      <span className="font-mono text-[10px] opacity-75">{badge}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Developers & Providers */}
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-1.5">
            <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Developers
            </span>
            <nav className="flex flex-col gap-1" aria-label="Developer menu">
              {devNav.map(({ label, icon: Icon, href }) => {
                const active = pathname === href
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="border-t border-border/80 p-3 bg-muted/20">
        <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-2xs">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{email}</p>
            </div>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={signOut} aria-label="Sign out" title="Sign out" className="hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="size-3.5" />
          </Button>
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
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border/80 bg-card lg:block z-20">
        <SidebarContent name={name} email={email} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end border-b border-border/80 bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button size="icon-sm" variant="ghost" aria-label="Open menu">
                      <Menu className="size-4" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SidebarContent name={name} email={email} />
                </SheetContent>
              </Sheet>
            </div>
            <LiveTelemetryStatus />
            <Button size="sm" variant="outline" className="h-8 text-xs border-border/80 shadow-2xs" asChild>
              <Link href="/dashboard/documentation">
                <BookOpen className="size-3" />
                <span className="hidden sm:inline">API Explorer</span>
              </Link>
            </Button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  )
}
