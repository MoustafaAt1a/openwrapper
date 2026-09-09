import { eq, or } from "drizzle-orm"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { MockCheckoutInteractivePanel } from "@/components/mock-checkout-interactive-panel"
import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"
import { formatMinorUnits } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Checkout — OpenWrapper",
  description: "Test checkout payment flow.",
}

export default async function MockPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ return_url?: string; cancel_url?: string }>
}) {
  const { id } = await params
  const search = searchParams ? await searchParams : {}

  let paymentRecord = null
  try {
    const fetchPayment = async () => {
      const [row] = await db
        .select()
        .from(payments)
        .where(or(eq(payments.id, id), eq(payments.merchantReference, id), eq(payments.providerReference, id)))
        .limit(1)
      return row ?? null
    }

    paymentRecord = await Promise.race([
      fetchPayment(),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 600)),
    ])
  } catch {
    // Database read fallback for standalone local mode
  }

  const amountMinorUnits = paymentRecord?.amountMinorUnits ?? 15000
  const currency = paymentRecord?.currency ?? "EGP"
  const merchantReference = paymentRecord?.merchantReference ?? `ref_${id.slice(-8)}`
  const formattedAmount = formatMinorUnits(amountMinorUnits, currency)
  const currentStatus = paymentRecord?.status ?? "pending"
  const customerPhone = paymentRecord?.customerPhone ?? "+201001234567"
  const customerEmail = paymentRecord?.customerEmail ?? "customer@example.com"
  const customerName = paymentRecord?.customerName ?? "Ahmed Ali"
  const description = paymentRecord?.description ?? "Order Payment"

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      {/* 1. Global Navigation Bar */}
      <GlobalHeaderNavigation />

      {/* 2. Main Checkout Viewport with Signature Background */}
      <div className="relative isolate flex-1 overflow-hidden">
        <AtmosphericGradientMesh className="opacity-60 dark:opacity-30" />
        <StripeSwoosh className="opacity-40 dark:opacity-20" />

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <MockCheckoutInteractivePanel
            paymentId={id}
            amountFormatted={formattedAmount}
            amountMinorUnits={amountMinorUnits}
            currency={currency}
            merchantReference={merchantReference}
            initialStatus={currentStatus}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            customerName={customerName}
            description={description}
            returnUrl={search?.return_url}
            cancelUrl={search?.cancel_url}
          />
        </div>
      </div>

      {/* 3. Global Enterprise Footer */}
      <GlobalFooterNavigation />
    </main>
  )
}
