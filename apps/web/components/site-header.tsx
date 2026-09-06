"use client"

import { ArrowRight01Icon, Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface NavLinkItem {
  id: string
  href: string
  label: string
}

const NAV_LINKS: NavLinkItem[] = [
  { id: "product", href: "/#product", label: "Products" },
  { id: "regional", href: "/#regional", label: "Sovereign Rails" },
  { id: "developers", href: "/#developers", label: "Developers" },
  { id: "sdks", href: "/sdk", label: "SDKs" },
  { id: "pricing", href: "/#pricing", label: "Pricing" },
  { id: "faq", href: "/#faq", label: "FAQ" },
]

export function SiteHeader() {
  const [activeSection, setActiveSection] = useState<string>("product")
  const [isScrolled, setIsScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  // Fast, passive, requestAnimationFrame-throttled scroll listener
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 12)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    )

    const sections = NAV_LINKS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    )

    for (const el of sections) {
      observer.observe(el)
    }

    return () => {
      for (const el of sections) {
        observer.unobserve(el)
      }
    }
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
      setActiveSection(id)
      setOpen(false)
      window.history.pushState(null, "", `#${id}`)
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? "border-b border-[#e3e8ee]/80 dark:border-white/10 bg-white/80 dark:bg-[#080b14]/85 backdrop-blur-md shadow-[0_1px_3px_rgba(0,55,112,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          : "border-b border-transparent bg-transparent"
      }`}
      style={{
        contain: "layout style",
        willChange: "backdrop-filter, background-color",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Column: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/20 transition-transform duration-200 group-hover:scale-105 shrink-0"
              priority
            />
            <span className="font-semibold text-[15px] tracking-tight text-[#0d253d] dark:text-white">
              OpenWrapper
            </span>
          </Link>
        </div>

        {/* Center Column: Perfectly Centered Primary Navigation */}
        <nav
          className="hidden md:flex items-center justify-center gap-1 lg:gap-1.5"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.id)}
                className={`px-3 py-1.5 rounded-full text-[13.5px] transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "text-[#0d253d] dark:text-white font-medium bg-[#0d253d]/5 dark:bg-white/10"
                    : "text-[#64748d] hover:text-[#0d253d] dark:text-[#8ca3ba] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right Column: Actions (Sign in + Primary Pill Button) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex text-[13.5px] font-medium text-[#64748d] hover:text-[#0d253d] dark:text-[#8ca3ba] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all"
          >
            Sign in
          </Link>

          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white px-4 py-1.5 text-xs sm:text-[13px] font-medium shadow-xs hover:shadow-md transition-all shrink-0 whitespace-nowrap"
          >
            <span>Get started</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
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
                    <span className="text-sm font-semibold tracking-tight text-foreground">
                      OpenWrapper
                    </span>
                  </SheetTitle>

                  <nav className="flex flex-col gap-1.5 pt-6" aria-label="Mobile navigation">
                    {NAV_LINKS.map((link) => {
                      const isActive = activeSection === link.id
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={(e) => {
                            setOpen(false)
                            handleNavClick(e, link.id)
                          }}
                          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "font-medium text-[#0d253d] dark:text-white bg-[#0d253d]/5 dark:bg-white/10"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                    <div className="my-2 border-t border-border/40" />
                    <Link
                      href="/dashboard/documentation"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      API Explorer & SDKs
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
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
