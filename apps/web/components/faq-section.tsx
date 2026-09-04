"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"

const faqs = [
  {
    q: "How does OpenWrapper prevent double charges across retries?",
    a: "OpenWrapper requires a mandatory Idempotency-Key HTTP header on all payment creation requests. We calculate a SHA-256 fingerprint of the normalized request parameters. If a network retry occurs with the same key and payload, the cached payment result is returned immediately without re-dispatching to the upstream payment provider.",
  },
  {
    q: "What are lossless next-actions?",
    a: "Every payment gateway represents customer handoffs differently — Paymob returns an intention checkout URL, Fawry generates an 8-to-10-digit cash reference number for physical kiosk payment, and Stripe creates a Hosted Checkout session. OpenWrapper normalizes these into a typed next_action object (redirect_to_url or pay_at_reference) so your frontend can render the exact UI flow seamlessly.",
  },
  {
    q: "Can I use OpenWrapper without live merchant credentials in development?",
    a: "Yes. OpenWrapper features a built-in deterministic sandbox. If provider credentials (Paymob, Fawry, or Stripe) are not configured, the system automatically simulates valid intentions, cash reference numbers, hosted checkout redirects, and test webhooks with zero configuration required.",
  },
  {
    q: "How are API keys and merchant provider secrets secured?",
    a: "OpenWrapper operates on a Zero-Storage Security Contract: merchant provider secret keys are never stored in the database. In stateless mode, keys are passed per-request over TLS headers (X-Paymob-*, X-Fawry-*, X-Stripe-*) and held only in volatile memory for the duration of the HTTP request. Client API keys are cryptographically generated, hashed at rest with SHA-256, and verified in constant time.",
  },
  {
    q: "What is the difference between the Web platform and the Rust gateway engine?",
    a: "OpenWrapper offers a dual-engine architecture: a full-featured Node.js / Next.js cloud control plane with Better-Auth, dashboard telemetry, and webhook auditing, and a lightweight, ultra-high-throughput Rust engine with native adapters for Paymob, Fawry, and Stripe, designed for sub-millisecond on-premise payment proxying.",
  },
  {
    q: "How does the monorepo versioning system work across SDKs?",
    a: "The monorepo features a centralized, deterministic versioning orchestrator (`bun run version:check` / `scripts/version.mjs`) that synchronizes and enforces SemVer 2.0.0 alignment across 11 manifests covering Cargo, npm/Bun, Composer, NuGet, OpenAPI 3.1, and contract test vectors.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index
        return (
          <div key={faq.q} className="transition-colors">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between p-5 sm:p-6 text-left text-sm sm:text-base font-semibold text-foreground hover:text-foreground/80"
              aria-expanded={isOpen}
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4 ${
                  isOpen ? "rotate-180 text-foreground" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm leading-relaxed text-muted-foreground animate-rise">
                <p>{faq.a}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
