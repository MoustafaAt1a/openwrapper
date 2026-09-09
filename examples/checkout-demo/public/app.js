// ==============================================================================
// OpenWrapper Multi-SDK Storefront Demo Application
// Production-grade payment orchestration across TypeScript, PHP 8, and .NET 8
// ==============================================================================

// Mirror of SDK integer currency utilities (Invariant I1 - Zero Floating Point)
function toMinorUnits(amount, decimals = 2) {
  const [whole, fraction = ""] = String(amount).trim().split(".")
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals)
  return parseInt(whole + padded, 10)
}

function formatMajorUnits(minorUnits, decimals = 2) {
  const isNegative = minorUnits < 0
  const abs = Math.abs(minorUnits)
  const factor = Math.pow(10, decimals)
  const whole = Math.floor(abs / factor)
  const frac = String(abs % factor).padStart(decimals, "0")
  return (isNegative ? "-" : "") + `${whole}.${frac}`
}

const products = {
  starter: {
    id: "starter",
    name: "Starter Developer Tier",
    price: 50,
    minorUnits: toMinorUnits(50),
    currency: "EGP",
  },
  pro: {
    id: "pro",
    name: "OpenWrapper Pro License",
    price: 150,
    minorUnits: toMinorUnits(150),
    currency: "EGP",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Gateway License",
    price: 450,
    minorUnits: toMinorUnits(450),
    currency: "EGP",
  },
}

const backends = {
  typescript: { name: "TypeScript SDK", port: 4000, lang: "TypeScript" },
  php: { name: "PHP 8 SDK", port: 4001, lang: "PHP 8.x" },
  dotnet: { name: ".NET 8 SDK", port: 4002, lang: "C# / .NET 8" },
}

let selectedProduct = products.pro
let activeMethod = "cards" // "cards" | "wallet" | "fawry" | "stripe" | "mock"
let activeProvider = "paymob"
let activeWalletCarrier = "vodafone"
let activeBackend = "typescript"
let activeSdkTab = "typescript"
let currentPaymentId = null
let pollTimer = null

// ==============================================================================
// Theme Toggle Engine
// ==============================================================================
function initTheme() {
  const saved = localStorage.getItem("openwrapper_checkout_theme")
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  const theme = saved || (prefersDark ? "dark" : "dark") // default to dark matching apps/web

  applyTheme(theme)
}

function applyTheme(theme) {
  const html = document.documentElement
  const sunIcon = document.getElementById("sunIcon")
  const moonIcon = document.getElementById("moonIcon")

  if (theme === "dark") {
    html.classList.add("dark")
    html.classList.remove("light")
    if (sunIcon) sunIcon.classList.remove("hidden")
    if (moonIcon) moonIcon.classList.add("hidden")
  } else {
    html.classList.remove("dark")
    html.classList.add("light")
    if (sunIcon) sunIcon.classList.add("hidden")
    if (moonIcon) moonIcon.classList.remove("hidden")
  }

  localStorage.setItem("openwrapper_checkout_theme", theme)
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark")
  applyTheme(isDark ? "light" : "dark")
}

// ==============================================================================
// Runtime & Backend Switching
// ==============================================================================
function detectInitialBackend() {
  const port = window.location.port
  if (port === "4001") {
    activeBackend = "php"
    activeSdkTab = "php"
  } else if (port === "4002") {
    activeBackend = "dotnet"
    activeSdkTab = "dotnet"
  } else {
    activeBackend = "typescript"
    activeSdkTab = "typescript"
  }
}

function getBackendBaseUrl(backendKey) {
  const targetPort = backends[backendKey].port
  if (window.location.port === String(targetPort)) {
    return window.location.origin
  }
  return `${window.location.protocol}//${window.location.hostname || "localhost"}:${targetPort}`
}

function switchBackend(key, port) {
  activeBackend = key

  // Update header category-tab buttons
  const tabs = ["ts", "php", "dotnet"]
  tabs.forEach((t) => {
    const tabBtn = document.getElementById("btn-backend-" + t)
    if (tabBtn) tabBtn.classList.remove("active")
  })

  const activeBtn = document.getElementById("btn-backend-" + (key === "typescript" ? "ts" : key))
  if (activeBtn) activeBtn.classList.add("active")

  const summaryBackend = document.getElementById("summaryBackend")
  if (summaryBackend) {
    summaryBackend.textContent = `${backends[key].name} (:${port})`
  }

  selectSdkTab(key)
  updateSubmitButtonLabel()
  checkBackendHealth(key)
}

// ==============================================================================
// Product / Plan Selection
// ==============================================================================
function selectProduct(key) {
  selectedProduct = products[key]
  document.querySelectorAll(".plan-card").forEach((el) => el.classList.remove("active"))
  const planEl = document.getElementById("prod-" + key)
  if (planEl) {
    planEl.classList.add("active")
    const radio = planEl.querySelector('input[type="radio"]')
    if (radio) radio.checked = true
  }

  const formattedAmount = `${selectedProduct.currency} ${selectedProduct.price.toFixed(2)}`
  
  const headerPriceDisplay = document.getElementById("headerPriceDisplay")
  if (headerPriceDisplay) headerPriceDisplay.textContent = formattedAmount

  const headerPlanName = document.getElementById("headerPlanName")
  if (headerPlanName) headerPlanName.textContent = selectedProduct.name

  const summaryPlanName = document.getElementById("summaryPlanName")
  if (summaryPlanName) summaryPlanName.textContent = selectedProduct.name

  const summarySubtotal = document.getElementById("summarySubtotal")
  if (summarySubtotal) summarySubtotal.textContent = formattedAmount

  const summaryTotal = document.getElementById("summaryTotal")
  if (summaryTotal) summaryTotal.textContent = formattedAmount

  const summaryMinorUnits = document.getElementById("summaryMinorUnits")
  if (summaryMinorUnits) {
    summaryMinorUnits.textContent = `${selectedProduct.minorUnits.toLocaleString()} integer minor units`
  }

  updateSubmitButtonLabel()
  updateCodePreview()
}

// ==============================================================================
// Payment Method Rail Selection
// ==============================================================================
function selectPaymentMethod(method) {
  activeMethod = method
  document.querySelectorAll("[id^='btn-method-']").forEach((el) => el.classList.remove("active"))
  const btn = document.getElementById("btn-method-" + method)
  if (btn) btn.classList.add("active")

  const sectionCards = document.getElementById("sectionCards")
  const sectionWallet = document.getElementById("sectionWallet")
  const sectionFawryNotice = document.getElementById("sectionFawryNotice")
  const sectionStripeNotice = document.getElementById("sectionStripeNotice")
  const sectionMockNotice = document.getElementById("sectionMockNotice")

  if (sectionCards) sectionCards.classList.toggle("hidden", method !== "cards")
  if (sectionWallet) sectionWallet.classList.toggle("hidden", method !== "wallet")
  if (sectionFawryNotice) sectionFawryNotice.classList.toggle("hidden", method !== "fawry")
  if (sectionStripeNotice) sectionStripeNotice.classList.toggle("hidden", method !== "stripe")
  if (sectionMockNotice) sectionMockNotice.classList.toggle("hidden", method !== "mock")

  if (method === "cards") {
    const cardGateway = document.getElementById("cardGatewaySelect")?.value || "paymob"
    activeProvider = cardGateway
  } else if (method === "wallet") {
    activeProvider = "paymob"
  } else if (method === "fawry") {
    activeProvider = "fawry"
  } else if (method === "stripe") {
    activeProvider = "stripe"
  } else if (method === "mock") {
    activeProvider = "mock"
  }

  updateSubmitButtonLabel()
  updateCodePreview()
}

function switchCardGateway(gateway) {
  if (activeMethod === "cards") {
    activeProvider = gateway
    updateSubmitButtonLabel()
    updateCodePreview()
  }
}

function selectWalletCarrier(carrier) {
  activeWalletCarrier = carrier
  document.querySelectorAll(".wallet-carrier-pill").forEach((el) => el.classList.remove("active"))
  const btn = document.getElementById("carrier-" + carrier)
  if (btn) btn.classList.add("active")

  // Auto-sync phone prefix if standard
  const phoneInput = document.getElementById("custPhone")
  if (phoneInput) {
    if (carrier === "vodafone") {
      phoneInput.value = "1010000000"
    } else if (carrier === "orange") {
      phoneInput.value = "1210000000"
    } else if (carrier === "etisalat") {
      phoneInput.value = "1110000000"
    } else if (carrier === "we") {
      phoneInput.value = "1510000000"
    }
  }

  updateSubmitButtonLabel()
  updateCodePreview()
}

// ==============================================================================
// Sandbox Test Vectors Quick-Fill
// ==============================================================================
function applyTestData(key) {
  if (key === "paymob_card") {
    selectPaymentMethod("cards")
    activeProvider = "paymob"
    setCustomerValues("Ahmed Ali", "1001234567")
    copyCardToClipboard("5123450000000008")
    showTestDataNotice("Copied Paymob 3DS test card (5123 4500...) to clipboard! (Exp: 12/28, CVV: 123)")
  } else if (key === "meeza_card") {
    selectPaymentMethod("cards")
    activeProvider = "paymob"
    setCustomerValues("Ahmed Ali", "1001234567")
    copyCardToClipboard("5078030000000001")
    showTestDataNotice("Copied Meeza card (5078 0300...) to clipboard! (Exp: 12/28, CVV: 123)")
  } else if (key === "stripe_card") {
    selectPaymentMethod("stripe")
    activeProvider = "stripe"
    setCustomerValues("Ahmed Ali", "1001234567")
    copyCardToClipboard("4242424242424242")
    showTestDataNotice("Copied Stripe test card (4242 4242...) to clipboard! (Exp: 12/28, CVV: 123)")
  } else if (key === "vodafone_cash") {
    selectPaymentMethod("wallet")
    selectWalletCarrier("vodafone")
    setCustomerValues("Ahmed Ali", "1010000000")
    showTestDataNotice("Loaded Vodafone Cash test mobile (+201010000000)")
  } else if (key === "fawry_pos") {
    selectPaymentMethod("fawry")
    setCustomerValues("Ahmed Ali", "1001234567")
    showTestDataNotice("Fawry retail kiosk payment selected")
  } else if (key === "mock_rail") {
    selectPaymentMethod("mock")
    setCustomerValues("Deterministic Tester", "1001234567")
    showTestDataNotice("Instant offline mock rail selected")
  }
}

function copyCardToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text.replace(/\s+/g, "")).catch(() => {})
  }
}

function showTestDataNotice(msg) {
  const notice = document.getElementById("testDataNotice")
  const noticeText = document.getElementById("testDataNoticeText")
  if (noticeText) noticeText.textContent = msg
  if (notice) {
    notice.classList.remove("hidden")
    setTimeout(() => notice.classList.add("hidden"), 4000)
  }
}

function setCardValues(num, exp, cvc, name, phone) {
  const cNum = document.getElementById("cardNumber")
  const cExp = document.getElementById("cardExpiry")
  const cCvc = document.getElementById("cardCvc")
  if (cNum) {
    cNum.value = num
    formatCardNumber(cNum)
  }
  if (cExp) cExp.value = exp
  if (cCvc) cCvc.value = cvc
  setCustomerValues(name, phone)
}

function setCustomerValues(name, phone) {
  const cName = document.getElementById("custName")
  const cPhone = document.getElementById("custPhone")
  if (cName) cName.value = name
  if (cPhone) cPhone.value = phone.replace(/^\+?20?/, "")
  updateSubmitButtonLabel()
  updateCodePreview()
}

function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, "")
  if (val.length > 16) val = val.slice(0, 16)
  const formatted = val.match(/.{1,4}/g)?.join(" ") || val
  input.value = formatted

  const badge = document.getElementById("cardBrandBadge")
  if (badge) {
    if (val.startsWith("4")) {
      badge.textContent = "VISA"
      badge.className = "text-[10px] font-mono font-bold text-[#60a5fa] uppercase"
    } else if (val.startsWith("5078") || val.startsWith("50")) {
      badge.textContent = "MEEZA"
      badge.className = "text-[10px] font-mono font-bold text-[#4ade80] uppercase"
    } else if (val.startsWith("5")) {
      badge.textContent = "MASTERCARD"
      badge.className = "text-[10px] font-mono font-bold text-[#fb923c] uppercase"
    } else {
      badge.textContent = "CARD"
      badge.className = "text-[10px] font-mono font-bold text-[var(--muted-foreground)] uppercase"
    }
  }
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, "")
  if (val.length > 4) val = val.slice(0, 4)
  if (val.length >= 3) {
    input.value = val.slice(0, 2) + " / " + val.slice(2)
  } else {
    input.value = val
  }
}

function selectSdkTab(tabKey) {
  activeSdkTab = tabKey
  document.querySelectorAll("#tab-typescript, #tab-php, #tab-dotnet").forEach((el) => {
    el.classList.remove("active")
  })
  const tab = document.getElementById("tab-" + tabKey)
  if (tab) tab.classList.add("active")

  const titleEl = document.getElementById("sdkSnippetTitle")
  if (tabKey === "typescript") {
    if (titleEl) titleEl.textContent = "@openwrapper/sdk (v0.2.7) • TypeScript"
  } else if (tabKey === "php") {
    if (titleEl) titleEl.textContent = "openwrapper/sdk (v0.2.7) • PHP 8.x"
  } else if (tabKey === "dotnet") {
    if (titleEl) titleEl.textContent = "OpenWrapper (v0.2.7) • .NET 8 / C#"
  }

  updateCodePreview()
}

function updateSubmitButtonLabel() {
  const submitBtnLabel = document.getElementById("submitBtnLabel")
  if (!submitBtnLabel) return

  const amountStr = `${selectedProduct.currency} ${selectedProduct.price.toFixed(2)}`
  if (activeProvider === "stripe") {
    submitBtnLabel.textContent = `Proceed to Stripe Checkout (${amountStr})`
  } else if (activeMethod === "wallet") {
    submitBtnLabel.textContent = `Pay with ${activeWalletCarrier.toUpperCase()} Cash (${amountStr})`
  } else if (activeProvider === "fawry") {
    submitBtnLabel.textContent = `Generate Fawry Code (${amountStr})`
  } else if (activeProvider === "mock") {
    submitBtnLabel.textContent = `Simulate Instant Payment (${amountStr})`
  } else {
    submitBtnLabel.textContent = `Proceed to Paymob 3DS (${amountStr})`
  }
}

function regenerateOrderRef() {
  const rand = Math.random().toString(36).substring(2, 8)
  const input = document.getElementById("merchantRef")
  if (input) {
    input.value = `ord_${activeBackend}_${rand}`
    updateCodePreview()
  }
}

function getNormalizedPhone() {
  const raw = document.getElementById("custPhone")?.value || "1001234567"
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("20")) {
    return "+" + digits
  }
  return "+20" + digits
}

// ==============================================================================
// Idiomatic Multi-Language Code Generation
// ==============================================================================
function updateCodePreview() {
  const codeEl = document.getElementById("sdkCodePreview")
  if (!codeEl) return

  const phone = getNormalizedPhone()
  const name = document.getElementById("custName")?.value || "Ahmed Ali"
  const email = document.getElementById("custEmail")?.value || "customer@example.com"
  const merchantRef = document.getElementById("merchantRef")?.value || "ord_demo_1001"

  const metadataSnippet =
    activeMethod === "wallet"
      ? `,
    metadata: {
      payment_method: "wallet",
      carrier: "${activeWalletCarrier}",
    }`
      : ""

  if (activeSdkTab === "typescript") {
    codeEl.textContent = `// OpenWrapper TypeScript SDK (v0.2.7) - ${activeMethod.toUpperCase()} Rail
import { OpenWrapperClient, formatMajorUnits, toMinorUnits } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: process.env.OPENWRAPPER_BASE_URL || "https://gateway.openwrapper.muejam.com",
  apiKey: process.env.OPENWRAPPER_API_KEY,
});

// Convert decimal major currency amount to integer minor units (Invariant I1 - Zero Floating Point)
const amountMinorUnits = toMinorUnits("${selectedProduct.price}.00", 2);

// Create Payment
const payment = await client.payments.create({
  provider: "${activeProvider}",
  amountMinorUnits, // ${selectedProduct.currency} ${selectedProduct.price}.00 -> ${selectedProduct.minorUnits} minor units
  currency: "${selectedProduct.currency}",
  customer: {
    phone: "${phone}",
    email: "${email}",
    fullName: "${name}",
  },
  merchantReference: "${merchantRef}",
  description: "${selectedProduct.name}"${metadataSnippet}
}, {
  idempotencyKey: "${merchantRef}",
});

// Format discrete integer minor units back to human display string (e.g. "150.00")
const displayAmount = formatMajorUnits(payment.amountMinorUnits, 2);
console.log(\`Payment created: \${payment.currency} \${displayAmount} [\${payment.status}]\`);

if (payment.nextAction?.type === "redirect_to_url") {
  console.log("Hosted Checkout URL:", payment.nextAction.url);
} else if (payment.nextAction?.type === "pay_at_reference") {
  console.log("Fawry Kiosk Code:", payment.nextAction.reference);
}`
  } else if (activeSdkTab === "php") {
    const phpMetadataSnippet =
      activeMethod === "wallet"
        ? `,
        metadata: ['payment_method' => 'wallet', 'carrier' => '${activeWalletCarrier}']`
        : ""

    codeEl.textContent = `<?php
// OpenWrapper PHP 8.x SDK (v0.2.7) - ${activeMethod.toUpperCase()} Rail
use OpenWrapper\\OpenWrapperClient;
use OpenWrapper\\CreatePaymentParams;
use OpenWrapper\\CustomerDetails;
use OpenWrapper\\Money;

$client = new OpenWrapperClient(
    baseUrl: getenv('OPENWRAPPER_BASE_URL') ?: 'https://gateway.openwrapper.muejam.com',
    apiKey: getenv('OPENWRAPPER_API_KEY') ?: null,
);

// Convert decimal major currency amount to integer minor units (Invariant I1 - Zero Floating Point)
$amountMinorUnits = Money::toMinorUnits("${selectedProduct.price}.00");

// Create Payment
$payment = $client->createPayment(new CreatePaymentParams(
    provider: '${activeProvider}',
    amountMinorUnits: $amountMinorUnits, // ${selectedProduct.currency} ${selectedProduct.price}.00 -> ${selectedProduct.minorUnits} minor units
    currency: '${selectedProduct.currency}',
    customer: new CustomerDetails(
        phone: '${phone}',
        email: '${email}',
        fullName: '${name}'
    ),
    merchantReference: '${merchantRef}',
    description: '${selectedProduct.name}'${phpMetadataSnippet}
), idempotencyKey: '${merchantRef}');

$formattedAmount = Money::formatMajorUnits($payment->amountMinorUnits);
echo "Payment created: {$payment->currency} {$formattedAmount} [{$payment->status->value}]" . PHP_EOL;

if ($payment->nextAction instanceof \\OpenWrapper\\RedirectToUrl) {
    echo "Hosted Checkout URL: {$payment->nextAction->url}" . PHP_EOL;
} elseif ($payment->nextAction instanceof \\OpenWrapper\\PayAtReference) {
    echo "Fawry Kiosk Code: {$payment->nextAction->reference}" . PHP_EOL;
}`
  } else if (activeSdkTab === "dotnet") {
    const dotnetMetadataSnippet =
      activeMethod === "wallet"
        ? `,
    Metadata = new Dictionary<string, string>
    {
        ["payment_method"] = "wallet",
        ["carrier"] = "${activeWalletCarrier}",
    }`
        : ""

    codeEl.textContent = `// OpenWrapper .NET 8 / C# SDK (v0.2.7) - ${activeMethod.toUpperCase()} Rail
using OpenWrapper;
using OpenWrapper.Models;

await using var client = new OpenWrapperClient(new OpenWrapperClientOptions
{
    BaseUrl = Environment.GetEnvironmentVariable("OPENWRAPPER_BASE_URL") ?? "https://gateway.openwrapper.muejam.com",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
});

// Convert decimal major currency amount to integer minor units (Invariant I1 - Zero Floating Point)
long amountMinorUnits = Money.ToMinorUnits(${selectedProduct.price}.00m);

// Create Payment
var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "${activeProvider}",
    AmountMinorUnits = amountMinorUnits, // ${selectedProduct.currency} ${selectedProduct.price}.00 -> ${selectedProduct.minorUnits} minor units
    Currency = "${selectedProduct.currency}",
    Customer = new CustomerDetails
    {
        Phone = "${phone}",
        Email = "${email}",
        FullName = "${name}",
    },
    MerchantReference = "${merchantRef}",
    Description = "${selectedProduct.name}"${dotnetMetadataSnippet}
}, new RequestOptions { IdempotencyKey = "${merchantRef}" });

var formattedAmount = Money.FormatMajorUnits(payment.AmountMinorUnits);
Console.WriteLine($"Payment created: {payment.Currency} {formattedAmount} [{payment.Status}]");

if (payment.NextAction?.Type == "redirect_to_url")
    Console.WriteLine($"Hosted Checkout URL: {payment.NextAction.Url}");
else if (payment.NextAction?.Type == "pay_at_reference")
    Console.WriteLine($"Fawry Kiosk Code: {payment.NextAction.Reference}");`
  }
}

// ==============================================================================
// Payment Submission & Execution
// ==============================================================================
async function handleCheckout(e) {
  e.preventDefault()

  const submitBtn = document.getElementById("submitBtn")
  const btnSpinner = document.getElementById("btnSpinner")
  const resultCard = document.getElementById("resultCard")

  submitBtn.disabled = true
  btnSpinner.classList.remove("hidden")

  const phone = getNormalizedPhone()
  const name = document.getElementById("custName")?.value || "Ahmed Ali"
  const email = document.getElementById("custEmail")?.value || "customer@example.com"
  const merchantRef = document.getElementById("merchantRef")?.value || `ord_${Date.now()}`

  const payload = {
    product_id: selectedProduct.id,
    productId: selectedProduct.id,
    provider: activeProvider,
    payment_method: activeMethod,
    paymentMethod: activeMethod,
    wallet_carrier: activeWalletCarrier,
    walletCarrier: activeWalletCarrier,
    amount_minor_units: selectedProduct.minorUnits,
    amountMinorUnits: selectedProduct.minorUnits,
    currency: selectedProduct.currency,
    merchant_reference: merchantRef,
    merchantReference: merchantRef,
    customer: {
      phone,
      email,
      name,
      fullName: name,
    },
  }

  const targetBaseUrl = getBackendBaseUrl(activeBackend)
  const endpoint = `${targetBaseUrl}/api/checkout`
  const startTime = performance.now()

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const duration = Math.round(performance.now() - startTime)
    const data = await res.json()

    if (!res.ok) {
      const msg = data.error?.message || data.error || `HTTP ${res.status} error`
      throw new Error(msg)
    }

    currentPaymentId = data.payment_id || data.paymentId
    const status = (data.status || "pending").toUpperCase()

    document.getElementById("resPaymentId").textContent = currentPaymentId
    document.getElementById("resLatency").textContent = `${duration}ms`

    updateStatusBadge(status)

    // Render Next Action
    const nextAction = data.next_action || data.nextAction
    const urlSection = document.getElementById("urlSection")
    const fawrySection = document.getElementById("fawrySection")
    const unknownAlert = document.getElementById("unknownAlert")
    urlSection.classList.add("hidden")
    fawrySection.classList.add("hidden")
    if (unknownAlert) unknownAlert.classList.add("hidden")

    if (nextAction?.type === "redirect_to_url" && nextAction?.url) {
      const redirectUrl = new URL(nextAction.url)
      if (!["http:", "https:"].includes(redirectUrl.protocol)) {
        throw new Error("Gateway returned an unsafe redirect URL")
      }
      urlSection.classList.remove("hidden")
      document.getElementById("redirectLink").href = redirectUrl.toString()

      // Instant seamless auto-redirect to provider
      showRedirectModal(activeProvider, redirectUrl.toString())
      setTimeout(() => {
        window.location.href = redirectUrl.toString()
      }, 700)
    } else if (nextAction?.type === "pay_at_reference" && nextAction?.reference) {
      fawrySection.classList.remove("hidden")
      document.getElementById("fawryCode").textContent = nextAction.reference
    } else if (status === "UNKNOWN" || !nextAction) {
      if (unknownAlert) unknownAlert.classList.remove("hidden")
    }

    const rawPre = document.getElementById("rawJsonPreview")
    if (rawPre) {
      rawPre.textContent = JSON.stringify(data, null, 2)
    }

    resultCard.classList.remove("hidden")
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" })

    startStatusPolling()
  } catch (err) {
    alert(`Payment Creation Failed (${activeBackend.toUpperCase()} backend):\n${err.message}`)
  } finally {
    submitBtn.disabled = false
    btnSpinner.classList.add("hidden")
  }
}

function updateStatusBadge(status) {
  const statusEl = document.getElementById("resStatus")
  if (!statusEl) return
  const norm = status.toUpperCase()
  statusEl.textContent = norm
  statusEl.className = "status-pill"

  if (norm === "SUCCEEDED") {
    statusEl.classList.add("status-succeeded")
  } else if (norm === "FAILED" || norm === "CANCELLED") {
    statusEl.classList.add("status-failed")
  } else {
    statusEl.classList.add("status-pending")
  }
}

// ==============================================================================
// Settlement Simulation (Webhook Simulator)
// ==============================================================================
async function simulateSettlement() {
  if (!currentPaymentId) return
  const btn = document.getElementById("btnSimulateSettlement")
  if (btn) btn.disabled = true

  const targetBaseUrl = getBackendBaseUrl(activeBackend)
  const endpoint = `${targetBaseUrl}/api/simulate-settlement`

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: currentPaymentId,
        paymentId: currentPaymentId,
        status: "succeeded",
      }),
    })

    const data = await res.json()
    if (res.ok) {
      updateStatusBadge("SUCCEEDED")
      const settledAlert = document.getElementById("settledAlert")
      if (settledAlert) settledAlert.classList.remove("hidden")

      const pollingIndicator = document.getElementById("pollingIndicator")
      if (pollingIndicator) {
        pollingIndicator.textContent = "Settled via Webhook Simulator"
      }

      if (pollTimer) clearInterval(pollTimer)

      const rawPre = document.getElementById("rawJsonPreview")
      if (rawPre) {
        rawPre.textContent = JSON.stringify(data, null, 2)
      }
    } else {
      alert(`Simulation failed: ${data.error?.message || data.error}`)
    }
  } catch (err) {
    alert(`Settlement Simulation Error:\n${err.message}`)
  } finally {
    if (btn) btn.disabled = false
  }
}

let consecutivePollErrors = 0

// ==============================================================================
// Status Poller
// ==============================================================================
async function checkPaymentStatus() {
  if (!currentPaymentId) return
  const targetBaseUrl = getBackendBaseUrl(activeBackend)
  const endpoint = `${targetBaseUrl}/api/payment-status/${encodeURIComponent(currentPaymentId)}`

  try {
    const res = await fetch(endpoint)
    const data = await res.json()
    consecutivePollErrors = 0
    if (res.ok && data.status) {
      updateStatusBadge(data.status)
      if (data.status.toLowerCase() === "succeeded") {
        const settledAlert = document.getElementById("settledAlert")
        if (settledAlert) settledAlert.classList.remove("hidden")
        if (pollTimer) clearInterval(pollTimer)
      } else if (data.status.toLowerCase() === "failed") {
        if (pollTimer) clearInterval(pollTimer)
      }
      const rawPre = document.getElementById("rawJsonPreview")
      if (rawPre) {
        rawPre.textContent = JSON.stringify(data, null, 2)
      }
    }
  } catch (err) {
    consecutivePollErrors++
    if (consecutivePollErrors <= 2) {
      console.warn("Status poll error:", err.message || err)
    }
    if (consecutivePollErrors >= 5) {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      const pollingIndicator = document.getElementById("pollingIndicator")
      if (pollingIndicator) {
        pollingIndicator.textContent = `Polling paused (${backends[activeBackend]?.name || activeBackend} server offline)`
      }
    }
  }
}

function startStatusPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(checkPaymentStatus, 3000)
}

// ==============================================================================
// Clipboard Copy Helpers
// ==============================================================================
function copyFawryCode() {
  const code = document.getElementById("fawryCode")?.textContent
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById("copyCodeBtn")
    if (btn) {
      const orig = btn.textContent
      btn.textContent = "Copied!"
      setTimeout(() => {
        btn.textContent = orig
      }, 2000)
    }
  })
}

function copySdkCode() {
  const code = document.getElementById("sdkCodePreview")?.textContent
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById("copySnippetBtn")
    if (btn) {
      const origHtml = btn.innerHTML
      btn.innerHTML = `<span>Copied!</span>`
      setTimeout(() => {
        btn.innerHTML = origHtml
      }, 2000)
    }
  })
}

// ==============================================================================
// Backend Health Probing
// ==============================================================================
async function checkBackendHealth(sdkKey) {
  const dot = document.getElementById(`dot-${sdkKey === "typescript" ? "ts" : sdkKey}`)
  const url = getBackendBaseUrl(sdkKey) + "/api/health"

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      if (dot) dot.className = "size-2 rounded-full bg-[#10b981]"
      return true
    }
  } catch {
    if (dot) dot.className = "size-2 rounded-full bg-[#d1d5db]"
    return false
  }
}

async function probeAllBackends() {
  await checkBackendHealth(activeBackend)
}

function showRedirectModal(provider, url) {
  const modal = document.getElementById("redirectModal")
  const title = document.getElementById("redirectModalTitle")
  const subtitle = document.getElementById("redirectModalSubtitle")
  const btn = document.getElementById("redirectModalBtn")

  if (!modal) return
  const providerName = provider === "stripe" ? "Stripe Checkout" : "Paymob 3DS Gateway"
  if (title) title.textContent = `Redirecting to ${providerName}...`
  if (subtitle) {
    subtitle.textContent =
      provider === "stripe"
        ? "Opening Stripe Checkout with Apple Pay / Google Pay and prefilled contact details. Please wait..."
        : "Opening Paymob's secure card & Meeza 3DS verification portal. Please wait..."
  }
  if (btn) btn.href = url
  modal.classList.remove("hidden")
}

function dismissReturnBanner() {
  const banner = document.getElementById("returnSuccessBanner")
  if (banner) banner.classList.add("hidden")
}

async function checkReturnRedirect() {
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get("session_id")
  const statusParam = params.get("status")
  const paymentId = params.get("payment_id")

  if (statusParam === "success" || sessionId) {
    const banner = document.getElementById("returnSuccessBanner")
    const bannerRef = document.getElementById("returnSuccessRef")
    const bannerSession = document.getElementById("returnSuccessSession")

    if (banner) {
      banner.classList.remove("hidden")
      if (bannerRef) bannerRef.textContent = paymentId ? `Reference: ${paymentId}` : "Status: Payment Succeeded"
      if (bannerSession) bannerSession.textContent = sessionId ? `Session: ${sessionId}` : ""
      banner.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }

    if (paymentId) {
      currentPaymentId = paymentId
      checkPaymentStatus()
    }

    // Clean URL query parameters smoothly without reloading
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// ==============================================================================
// Initialization
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme()
  detectInitialBackend()
  regenerateOrderRef()

  ;["custName", "custPhone", "custEmail", "merchantRef"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateCodePreview)
  })

  selectProduct("pro")
  selectPaymentMethod("cards")
  switchBackend(activeBackend, backends[activeBackend].port)
  probeAllBackends()
  checkReturnRedirect()

  setInterval(probeAllBackends, 10000)
})
