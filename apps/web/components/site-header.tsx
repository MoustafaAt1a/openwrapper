"use client"

import { ArrowRight, Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { GeometricShape } from "@/components/geometric-shape"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: "#product", label: "Product" },
    { href: "#regional", label: "Regional Rails" },
    { href: "#developers", label: "Developers" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Image
              src="/openwrapper-icon.jpeg"
              alt="OpenWrapper"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover ring-1 ring-border/80 transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-semibold text-sm sm:text-base tracking-tight text-foreground">
              OpenWrapper
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button
            size="sm"
            className="rounded-md font-semibold text-xs px-3 sm:px-3.5 h-8.5 sm:h-9 bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 transition-all shrink-0"
            asChild
          >
            <Link href="/sign-up">
              Get started <ArrowRight className="size-3.5 ml-1 inline" />
            </Link>
          </Button>

          {/* Mobile Navigation Sheet */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Toggle navigation menu"
                    className="size-8.5 border-border/80"
                  >
                    <Menu className="size-4" />
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
                    <GeometricShape
                      shape={1}
                      color="violet"
                      size={13}
                      className="ml-auto opacity-80"
                    />
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
                  </nav>
                </div>

                <div className="flex flex-col gap-2.5 border-t border-border/60 pt-6">
                  <Button variant="outline" className="w-full text-xs font-semibold" asChild>
                    <Link href="/sign-in" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    className="w-full text-xs font-semibold bg-primary text-primary-foreground"
                    asChild
                  >
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
                      Create Workspace Free
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
