"use client"

import {
  BookOpen,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  Terminal,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { Button } from "@/components/ui/button"
import { GooTabs } from "@/components/ui/goo-tabs"
import { GooFab } from "@/components/ui/goo-fab"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { authClient } from "@/lib/auth-client"

import { EnvironmentProvider, useEnvironmentMode } from "@/lib/environment-context"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  shortcut?: string
}

const mainNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard", shortcut: "⌘1" },
  { label: "Payments", icon: CreditCard, href: "/dashboard/payments", shortcut: "⌘2" },
  { label: "API Keys", icon: KeyRound, href: "/dashboard/api-keys", shortcut: "⌘3" },
  { label: "Requests", icon: Terminal, href: "/dashboard/requests", shortcut: "⌘4" },
]

const devNav: NavItem[] = [
  { label: "API Explorer", icon: BookOpen, href: "/dashboard/documentation", shortcut: "⌘E" },
  { label: "Providers", icon: SlidersHorizontal, href: "/dashboard/providers", shortcut: "⌘P" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings", shortcut: "⌘S" },
]

const PATH_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/payments": "Payments Ledger",
  "/dashboard/api-keys": "API Keys",
  "/dashboard/requests": "Request Telemetry",
  "/dashboard/documentation": "API Explorer",
  "/dashboard/providers": "Payment Rails",
  "/dashboard/settings": "Merchant Settings",
}

function SidebarContent({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setMode, isTestMode } = useEnvironmentMode()

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col justify-between bg-card border-r border-border">
      <div>
        {/* Workspace Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-border transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight tracking-tight text-foreground">
                OpenWrapper
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Gateway Control</span>
            </div>
          </Link>
        </div>

        {/* Sidebar Mode Switcher — Goo Morphing Tabs */}
        <div className="px-3 pt-3">
          <GooTabs
            items={[
              {
                id: "test",
                label: (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${isTestMode ? "bg-white animate-pulse" : "bg-amber-500"}`}
                    />
                    <span>Test</span>
                  </span>
                ),
              },
              {
                id: "live",
                label: (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 rounded-full ${!isTestMode ? "bg-white animate-pulse" : "bg-emerald-500"}`}
                    />
                    <span>Live</span>
                  </span>
                ),
              },
            ]}
            activeId={isTestMode ? "test" : "live"}
            onTabChange={(id) => setMode(id as "test" | "live")}
            className="w-full border border-border bg-muted/40 font-mono"
            indicatorClassName={isTestMode ? "bg-amber-500 shadow-xs" : "bg-emerald-600 shadow-xs"}
            size="sm"
          />
        </div>

        {/* Navigation Sections */}
        <div className="flex flex-col gap-6 px-3 py-4">
          {/* Main Menu */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Platform
            </span>
            <nav className="flex flex-col gap-0.5 mt-1" aria-label="Main menu">
              {mainNav.map(({ label, icon: Icon, href, shortcut }) => {
                const active = pathname === href
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150 relative ${
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/80 hover:bg-muted/50 hover:text-foreground font-medium"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                    )}
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={
                          active
                            ? "size-4 text-primary"
                            : "size-4 text-muted-foreground group-hover:text-current"
                        }
                      />
                      <span>{label}</span>
                    </div>
                    {shortcut && (
                      <span className="font-mono text-[9px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {shortcut}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Developers & Providers */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Developer Rails
            </span>
            <nav className="flex flex-col gap-0.5 mt-1" aria-label="Developer menu">
              {devNav.map(({ label, icon: Icon, href, shortcut }) => {
                const active =
                  pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))
                return (
                  <Link
                    key={label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150 relative ${
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/80 hover:bg-muted/50 hover:text-foreground font-medium"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                    )}
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={
                          active
                            ? "size-4 text-primary"
                            : "size-4 text-muted-foreground group-hover:text-current"
                        }
                      />
                      <span>{label}</span>
                    </div>
                    {shortcut && (
                      <span className="font-mono text-[9px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {shortcut}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer Area: User Profile */}
      <div className="flex flex-col gap-3 p-3 border-t border-border bg-card">
        {/* User Profile Card */}
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-2xs">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-2xs">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground" title={name}>
                {name}
              </p>
              <p className="truncate text-[10px] text-muted-foreground" title={email}>
                {email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardShellInner({
  children,
  name,
  email,
}: {
  children: React.ReactNode
  name: string
  email: string
}) {
  const pathname = usePathname()
  const pageTitle = PATH_TITLES[pathname] || "Dashboard"
  const { setMode, isTestMode } = useEnvironmentMode()

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Ambient Signature Atmosphere Mesh */}
      <AtmosphericGradientMesh className="opacity-25 pointer-events-none" />

      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-card lg:block z-20">
        <SidebarContent name={name} email={email} />
      </aside>

      <div className="lg:pl-60 min-w-0 w-full overflow-x-hidden relative z-10">
        {/* Modern Clean Header Navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/80 bg-card/80 px-4 backdrop-blur-md sm:px-8">
          {/* Left: Mobile Trigger & Contextual Breadcrumb */}
          <div className="flex items-center gap-3">
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

            {/* Contextual Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">Workspace</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">{pageTitle}</span>
            </div>
          </div>

          {/* Right: Mode Switcher & Quick Tools */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Stripe-style Environment Switcher Pill — Goo Morphing */}
            <GooTabs
              items={[
                {
                  id: "test",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`size-1.5 rounded-full ${isTestMode ? "bg-white animate-pulse" : "bg-amber-500"}`}
                      />
                      <span>Test</span>
                    </span>
                  ),
                },
                {
                  id: "live",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`size-1.5 rounded-full ${!isTestMode ? "bg-white animate-pulse" : "bg-emerald-500"}`}
                      />
                      <span>Live</span>
                    </span>
                  ),
                },
              ]}
              activeId={isTestMode ? "test" : "live"}
              onTabChange={(id) => setMode(id as "test" | "live")}
              className="border border-border bg-secondary shadow-2xs font-mono"
              indicatorClassName={
                isTestMode ? "bg-amber-500 shadow-xs" : "bg-emerald-600 shadow-xs"
              }
              size="sm"
            />

            <Link
              href="/dashboard/documentation"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/40 px-3 py-1 text-xs font-mono text-foreground shadow-2xs transition-all"
            >
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Sandbox Console</span>
              <span className="sm:hidden">Console</span>
            </Link>

            <Link
              href="/dashboard/api-keys"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1 text-xs font-medium shadow-xs transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Keys</span>
            </Link>
          </div>
        </header>

        {/* Test Mode Alert Strip (Polar / Stripe style) */}
        {isTestMode && (
          <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border-b border-amber-500/20 px-4 sm:px-8 py-2 text-xs font-mono flex items-center justify-between text-amber-900 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-amber-500 animate-ping" />
              <span className="font-semibold">TEST MODE</span>
              <span className="hidden sm:inline text-amber-800/80 dark:text-amber-400/80">
                — Viewing simulated transactions. Real money is not debited.
              </span>
            </div>
            <Link
              href="/dashboard/api-keys"
              className="text-[11px] underline underline-offset-2 hover:text-amber-950 dark:hover:text-white font-medium"
            >
              Get test key (ow_test_) →
            </Link>
          </div>
        )}

        <main className="relative min-h-[calc(100vh-4rem)] min-w-0 w-full p-4 sm:p-6 lg:p-8">
          <div className="relative z-10 min-w-0 w-full">{children}</div>
        </main>

        {/* Quick Actions FAB — Goo Expanding */}
        <GooFab
          icon={<CreditCard className="size-5" />}
          actions={[
            {
              id: "new-payment",
              icon: <CreditCard className="size-4" />,
              label: "New Payment",
              onClick: () => window.location.assign("/dashboard/payments"),
            },
            {
              id: "api-keys",
              icon: <KeyRound className="size-4" />,
              label: "Generate Key",
              onClick: () => window.location.assign("/dashboard/api-keys"),
            },
            {
              id: "console",
              icon: <Terminal className="size-4" />,
              label: "Open Console",
              onClick: () => window.location.assign("/dashboard/documentation"),
            },
          ]}
        />
      </div>
    </div>
  )
}

export function ControlPlaneShell({
  children,
  name,
  email,
  initialMode,
}: {
  children: React.ReactNode
  name: string
  email: string
  initialMode?: "live" | "test"
}) {
  return (
    <EnvironmentProvider initialMode={initialMode}>
      <DashboardShellInner name={name} email={email}>
        {children}
      </DashboardShellInner>
    </EnvironmentProvider>
  )
}

export const DashboardShell = ControlPlaneShell
export default ControlPlaneShell
