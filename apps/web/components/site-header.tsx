"use client"

import { ArrowRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: "/#product", label: "Products" },
    { href: "/#regional", label: "Sovereign Rails" },
    { href: "/#developers", label: "Developers" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-[#e3e8ee]/80 dark:border-white/10 bg-white/80 dark:bg-[#080b14]/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 sm:gap-10 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/20 transition-transform group-hover:scale-105 shrink-0"
              priority
            />
            <span className="font-semibold text-sm sm:text-base tracking-tight text-[#0d253d] dark:text-white truncate">
              OpenWrapper
            </span>
          </Link>

          <nav
            className="hidden items-center gap-7 text-[14px] font-medium text-[#273951] dark:text-[#c2d1e0] md:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[#533afd] dark:hover:text-white whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex text-[14px] font-medium text-[#273951] dark:text-[#c2d1e0] hover:text-[#0d253d] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            Sign in
          </Link>

          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-xs hover:shadow-md transition-all shrink-0 whitespace-nowrap"
          >
            <span>Get started</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </Link>

          {/* Mobile Navigation Sheet */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Toggle navigation menu"
                    className="size-9 rounded-full border-[#e3e8ee] dark:border-white/15"
                  >
                    <HugeiconsIcon icon={Menu01Icon} size={18} />
                  </Button>
                }
              />
              <SheetContent side="right" className="w-72 p-6 flex flex-col justify-between">
                <div>
                  <SheetTitle className="flex items-center gap-2.5 pb-6 border-b border-border/60">
                    <Image
                      src="/openwrapper-icon.jpeg"
                      alt="OpenWrapper"
                      width={24}
                      height={24}
                      className="size-6 rounded-md object-cover"
                    />
                    <span className="text-sm font-bold tracking-tight text-foreground">
                      OpenWrapper
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-[#533afd] font-semibold bg-[#533afd]/10 px-2 py-0.5 rounded-full">
                      v0.1.3
                    </span>
                  </SheetTitle>

                  <nav className="flex flex-col gap-2 pt-6" aria-label="Mobile navigation">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Link
                      href="/dashboard/documentation"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      API Explorer & SDKs
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      Live Checkout Demo
                    </Link>
                  </nav>
                </div>

                <div className="flex flex-col gap-2.5 border-t border-border/60 pt-6">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold rounded-full"
                    asChild
                  >
                    <Link href="/sign-in" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    className="w-full text-xs font-semibold bg-[#533afd] hover:bg-[#4434d4] text-white rounded-full"
                    asChild
                  >
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
                      Start Building Free
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
