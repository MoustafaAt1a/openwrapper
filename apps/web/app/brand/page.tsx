"use client"

import Image from "next/image"
import { useState } from "react"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"

const BRAND_COLORS = [
  { name: "Electric Indigo", hex: "#533afd", role: "Primary brand color" },
  { name: "Indigo Deep", hex: "#4434d4", role: "Hover & active states" },
  { name: "Indigo Press", hex: "#2e2b8c", role: "Pressed state" },
  { name: "Ink", hex: "#0d253d", role: "Primary text (light mode)" },
  { name: "Body", hex: "#273951", role: "Body text" },
  { name: "Muted", hex: "#64748d", role: "Secondary text" },
  { name: "Canvas", hex: "#f6f9fc", role: "Background surfaces" },
  { name: "Hairline", hex: "#e3e8ee", role: "Borders & dividers" },
  { name: "Ruby", hex: "#ea2261", role: "Destructive & error" },
  { name: "Emerald", hex: "#10b981", role: "Success & positive" },
]

function ColorSwatch({ color }: { color: (typeof BRAND_COLORS)[0] }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(color.hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${color.name} color hex code ${color.hex}`}
      className="flex flex-col gap-2 text-left group cursor-pointer"
    >
      <div
        className="h-20 rounded-xl stripe-card-shadow-xs transition-depth group-hover:stripe-card-shadow-sm border border-border"
        style={{ backgroundColor: color.hex }}
      />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{color.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {copied ? "Copied!" : color.hex}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">{color.role}</span>
      </div>
    </button>
  )
}

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      <GlobalHeaderNavigation />

      <div className="relative isolate flex-1 overflow-hidden py-16 sm:py-24">
        <AtmosphericGradientMesh className="opacity-40 dark:opacity-20" />
        <StripeSwoosh className="opacity-30 dark:opacity-15" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <header className="mb-16">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
              Brand Guidelines
            </h1>
            <p className="text-sm text-muted-foreground font-light max-w-xl">
              Resources and guidelines for using the OpenWrapper brand in your integrations,
              documentation, and marketing materials.
            </p>
          </header>

          {/* Logo Section */}
          <section className="mb-16">
            <h2 className="text-xl font-medium text-foreground mb-6">Logo</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-8 flex items-center justify-center stripe-card-shadow-xs">
                <Image
                  src="/openwrapper-logo.jpeg"
                  alt="OpenWrapper Logo (light)"
                  width={240}
                  height={120}
                  className="object-contain"
                />
              </div>
              <div className="rounded-2xl border border-border bg-[#0d253d] p-8 flex items-center justify-center stripe-card-shadow-xs">
                <Image
                  src="/openwrapper-logo.jpeg"
                  alt="OpenWrapper Logo (dark)"
                  width={240}
                  height={120}
                  className="object-contain brightness-110"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
              <p>
                Use the full logo in marketing materials. Maintain clear space equal to the height
                of the &ldquo;O&rdquo; around all sides.
              </p>
              <p>
                Do not modify, rotate, recolor, or add effects to the logo. Do not place the logo on
                busy backgrounds without sufficient contrast.
              </p>
            </div>
          </section>

          {/* Color Palette */}
          <section className="mb-16">
            <h2 className="text-xl font-medium text-foreground mb-2">Color palette</h2>
            <p className="text-sm text-muted-foreground font-light mb-6">
              Click any swatch to copy the hex value.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {BRAND_COLORS.map((color) => (
                <ColorSwatch key={color.hex} color={color} />
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="mb-16">
            <h2 className="text-xl font-medium text-foreground mb-6">Typography</h2>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 stripe-card-shadow-xs">
              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-[11px] font-mono text-muted-foreground mb-2 block">
                    Display & Body — Inter
                  </span>
                  <p className="text-4xl font-light tracking-tight text-foreground">
                    Financial infrastructure
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Inter is used for all display headings (light 300 weight, tight tracking) and
                    body text (regular 400 weight). Weights 300–700 are loaded.
                  </p>
                </div>
                <div className="border-t border-border pt-6">
                  <span className="text-[11px] font-mono text-muted-foreground mb-2 block">
                    Monospace — Geist Mono
                  </span>
                  <p className="text-2xl font-mono text-foreground">ow_live_k3x...9fz</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Geist Mono is used for code samples, API keys, monetary amounts, and technical
                    labels throughout the platform.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Usage Guidelines */}
          <section>
            <h2 className="text-xl font-medium text-foreground mb-6">Usage guidelines</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 block">
                  Do
                </span>
                <ul className="text-xs text-foreground flex flex-col gap-1.5">
                  <li>Use &ldquo;OpenWrapper&rdquo; as one word with capital O and W</li>
                  <li>
                    Reference the platform as a &ldquo;payment gateway&rdquo; or &ldquo;routing
                    layer&rdquo;
                  </li>
                  <li>Link to the official documentation when mentioning integration</li>
                  <li>
                    Use Electric Indigo (#533afd) as the primary accent when referencing the brand
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
                <span className="text-xs font-medium text-destructive mb-3 block">Don&apos;t</span>
                <ul className="text-xs text-foreground flex flex-col gap-1.5">
                  <li>Write it as &ldquo;Open Wrapper&rdquo; or &ldquo;openWrapper&rdquo;</li>
                  <li>
                    Describe OpenWrapper as a &ldquo;payment processor&rdquo; — we route, not
                    process
                  </li>
                  <li>Use the logo at sizes smaller than 24px height</li>
                  <li>Imply OpenWrapper stores or handles cardholder data directly</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      <GlobalFooterNavigation />
    </main>
  )
}
