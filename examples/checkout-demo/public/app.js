// OpenWrapper Multi-SDK Storefront Demo Application (DESIGN.md Spec)

const products = {
  starter: {
    id: "starter",
    name: "Starter Developer Tier",
    price: 50,
    minorUnits: 5000,
    currency: "EGP",
  },
  pro: {
    id: "pro",
    name: "OpenWrapper Pro License",
    price: 150,
    minorUnits: 15000,
    currency: "EGP",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Gateway License",
    price: 450,
    minorUnits: 45000,
    currency: "EGP",
  },
}

const backends = {
  typescript: { name: "TypeScript SDK", port: 4000, lang: "TypeScript" },
  php: { name: "PHP 8 SDK", port: 4001, lang: "PHP 8.x" },
  dotnet: { name: ".NET 8 SDK", port: 4002, lang: "C# / .NET 8" },
}

let selectedProduct = products.pro
let activeMethod = "cards" // "cards" | "wallet" | "fawry" | "stripe"
let activeProvider = "paymob"
let activeWalletCarrier = "vodafone"
let activeBackend = "typescript"
let activeSdkTab = "typescript"
let currentPaymentId = null
let pollTimer = null

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

function selectProduct(key) {
  selectedProduct = products[key]
  document.querySelectorAll(".plan-item").forEach((el) => el.classList.remove("active"))
  const planEl = document.getElementById("prod-" + key)
  if (planEl) {
    planEl.classList.add("active")
    const radio = planEl.querySelector('input[type="radio"]')
    if (radio) radio.checked = true
  }

  const formattedAmount = `${selectedProduct.currency} ${selectedProduct.price.toFixed(2)}`
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

function selectPaymentMethod(method) {
  activeMethod = method
  document.querySelectorAll("[id^='btn-method-']").forEach((el) => el.classList.remove("active"))
  const btn = document.getElementById("btn-method-" + method)
  if (btn) btn.classList.add("active")

  const sectionCards = document.getElementById("sectionCards")
  const sectionWallet = document.getElementById("sectionWallet")
  const sectionFawryNotice = document.getElementById("sectionFawryNotice")
  const sectionStripeNotice = document.getElementById("sectionStripeNotice")

  if (sectionCards) sectionCards.classList.toggle("hidden", method !== "cards")
  if (sectionWallet) sectionWallet.classList.toggle("hidden", method !== "wallet")
  if (sectionFawryNotice) sectionFawryNotice.classList.toggle("hidden", method !== "fawry")
  if (sectionStripeNotice) sectionStripeNotice.classList.toggle("hidden", method !== "stripe")

  if (method === "cards") {
    const cardGateway = document.getElementById("cardGatewaySelect")?.value || "paymob"
    activeProvider = cardGateway
  } else if (method === "wallet") {
    activeProvider = "paymob"
  } else if (method === "fawry") {
    activeProvider = "fawry"
  } else if (method === "stripe") {
    activeProvider = "stripe"
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
  document.querySelectorAll(".carrier-chip").forEach((el) => el.classList.remove("active"))
  const btn = document.getElementById("carrier-" + carrier)
  if (btn) btn.classList.add("active")

  // Auto-sync phone prefix if standard
  const phoneInput = document.getElementById("custPhone")
  if (phoneInput) {
    const current = phoneInput.value.trim()
    if (carrier === "vodafone" && (!current || current.startsWith("+201"))) {
      phoneInput.value = "+201010000000"
    } else if (carrier === "orange" && (!current || current.startsWith("+201"))) {
      phoneInput.value = "+201210000000"
    } else if (carrier === "etisalat" && (!current || current.startsWith("+201"))) {
      phoneInput.value = "+201110000000"
    } else if (carrier === "we" && (!current || current.startsWith("+201"))) {
      phoneInput.value = "+201510000000"
    }
  }

  updateSubmitButtonLabel()
  updateCodePreview()
}

function applyTestData(key) {
  const notice = document.getElementById("testDataNotice")
  const cardGatewaySelect = document.getElementById("cardGatewaySelect")

  if (key === "paymob_card") {
    selectPaymentMethod("cards")
    if (cardGatewaySelect) cardGatewaySelect.value = "paymob"
    activeProvider = "paymob"
    setCardValues("5123 4500 0000 0008", "12/28", "123", "Ahmed Ali", "+201001234567")
  } else if (key === "meeza_card") {
    selectPaymentMethod("cards")
    if (cardGatewaySelect) cardGatewaySelect.value = "paymob"
    activeProvider = "paymob"
    setCardValues("5078 0300 0000 0001", "12/28", "123", "Ahmed Ali", "+201001234567")
  } else if (key === "stripe_card") {
    selectPaymentMethod("cards")
    if (cardGatewaySelect) cardGatewaySelect.value = "stripe"
    activeProvider = "stripe"
    setCardValues("4242 4242 4242 4242", "12/28", "123", "Ahmed Ali", "+201001234567")
  } else if (key === "vodafone_cash") {
    selectPaymentMethod("wallet")
    selectWalletCarrier("vodafone")
    setCustomerValues("Ahmed Ali", "+201010000000")
  } else if (key === "orange_money") {
    selectPaymentMethod("wallet")
    selectWalletCarrier("orange")
    setCustomerValues("Ahmed Ali", "+201210000000")
  } else if (key === "etisalat_cash") {
    selectPaymentMethod("wallet")
    selectWalletCarrier("etisalat")
    setCustomerValues("Ahmed Ali", "+201110000000")
  } else if (key === "we_pay") {
    selectPaymentMethod("wallet")
    selectWalletCarrier("we")
    setCustomerValues("Ahmed Ali", "+201510000000")
  } else if (key === "fawry_pos") {
    selectPaymentMethod("fawry")
    setCustomerValues("Ahmed Ali", "+201001234567")
  }

  if (notice) {
    notice.classList.remove("hidden")
    setTimeout(() => notice.classList.add("hidden"), 2000)
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
  if (cPhone) cPhone.value = phone
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
      badge.className = "absolute right-3 text-[11px] font-mono font-bold text-[#1e40af] uppercase"
    } else if (val.startsWith("5")) {
      badge.textContent = "MASTERCARD"
      badge.className = "absolute right-3 text-[11px] font-mono font-bold text-[#ea580c] uppercase"
    } else if (val.startsWith("5078") || val.startsWith("50")) {
      badge.textContent = "MEEZA"
      badge.className = "absolute right-3 text-[11px] font-mono font-bold text-[#15803d] uppercase"
    } else {
      badge.textContent = "CARD"
      badge.className = "absolute right-3 text-[11px] font-mono font-bold text-[#6b7280] uppercase"
    }
  }
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, "")
  if (val.length > 4) val = val.slice(0, 4)
  if (val.length >= 3) {
    input.value = val.slice(0, 2) + "/" + val.slice(2)
  } else {
    input.value = val
  }
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

function selectSdkTab(tabKey) {
  activeSdkTab = tabKey
  document.querySelectorAll("#tab-typescript, #tab-php, #tab-dotnet").forEach((el) => {
    el.classList.remove("active")
  })
  const tab = document.getElementById("tab-" + tabKey)
  if (tab) tab.classList.add("active")

  const titleEl = document.getElementById("sdkSnippetTitle")
  if (tabKey === "typescript") {
    if (titleEl) titleEl.textContent = "@openwrapper/sdk • TypeScript / ESM"
  } else if (tabKey === "php") {
    if (titleEl) titleEl.textContent = "openwrapper/sdk • PHP 8.1+ Composer"
  } else if (tabKey === "dotnet") {
    if (titleEl) titleEl.textContent = "OpenWrapper • .NET 8 / C#"
  }

  updateCodePreview()
}

function updateSubmitButtonLabel() {
  const submitBtnLabel = document.getElementById("submitBtnLabel")
  if (submitBtnLabel) {
    let methodDesc = "Card"
    if (activeMethod === "wallet") {
      const carrierName = activeWalletCarrier.charAt(0).toUpperCase() + activeWalletCarrier.slice(1)
      methodDesc = `${carrierName} Wallet`
    } else if (activeMethod === "fawry") {
      methodDesc = "Fawry Kiosk"
    } else if (activeMethod === "stripe") {
      methodDesc = "Stripe"
    } else {
      methodDesc = activeProvider === "stripe" ? "Stripe 3DS Card" : "Paymob Card"
    }
    submitBtnLabel.textContent = `Pay ${selectedProduct.currency} ${selectedProduct.price.toFixed(2)} with ${methodDesc}`
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

function updateCodePreview() {
  const codeEl = document.getElementById("sdkCodePreview")
  if (!codeEl) return

  const phone = document.getElementById("custPhone")?.value || "+201001234567"
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
    codeEl.textContent = `// Backend TypeScript SDK Execution (${activeMethod.toUpperCase()} Rail)
import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: process.env.OPENWRAPPER_BASE_URL || "http://localhost:3000/api",
  apiKey: process.env.OPENWRAPPER_API_KEY,
});

const payment = await client.payments.create({
  provider: "${activeProvider}",
  amountMinorUnits: ${selectedProduct.minorUnits}, // ${selectedProduct.currency} ${selectedProduct.price}.00
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

console.log("Created Payment ID:", payment.paymentId);
if (payment.nextAction?.type === "redirect_to_url") {
  console.log("Hosted 3DS / Wallet Portal:", payment.nextAction.url);
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
// Backend PHP 8.x SDK Execution (${activeMethod.toUpperCase()} Rail)
use OpenWrapper\\OpenWrapperClient;
use OpenWrapper\\CreatePaymentParams;
use OpenWrapper\\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: getenv('OPENWRAPPER_BASE_URL') ?: 'http://localhost:3000/api',
    apiKey: getenv('OPENWRAPPER_API_KEY') ?: null,
);

$payment = $client->createPayment(new CreatePaymentParams(
    provider: '${activeProvider}',
    amountMinorUnits: ${selectedProduct.minorUnits}, // ${selectedProduct.currency} ${selectedProduct.price}.00
    currency: '${selectedProduct.currency}',
    customer: new CustomerDetails(
        phone: '${phone}',
        email: '${email}',
        fullName: '${name}'
    ),
    merchantReference: '${merchantRef}',
    description: '${selectedProduct.name}'${phpMetadataSnippet}
), idempotencyKey: '${merchantRef}');

echo "Created Payment ID: " . $payment->paymentId . PHP_EOL;
if ($payment->nextAction && $payment->nextAction->type === 'redirect_to_url') {
    echo "Hosted 3DS / Wallet Portal: " . $payment->nextAction->url;
} elseif ($payment->nextAction && $payment->nextAction->type === 'pay_at_reference') {
    echo "Fawry Kiosk Code: " . $payment->nextAction->reference;
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

    codeEl.textContent = `// Backend .NET 8 / C# SDK Execution (${activeMethod.toUpperCase()} Rail)
using OpenWrapper;
using OpenWrapper.Models;

await using var client = new OpenWrapperClient(new OpenWrapperClientOptions
{
    BaseUrl = Environment.GetEnvironmentVariable("OPENWRAPPER_BASE_URL") ?? "http://localhost:3000/api",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
});

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "${activeProvider}",
    AmountMinorUnits = ${selectedProduct.minorUnits}, // ${selectedProduct.currency} ${selectedProduct.price}.00
    Currency = "${selectedProduct.currency}",
    Customer = new CustomerDetails
    {
        Phone = "${phone}",
        Email = "${email}",
        FullName = "${name}",
    },
    MerchantReference = "${merchantRef}",
    Description = "${selectedProduct.name}"${dotnetMetadataSnippet}
}, idempotencyKey: "${merchantRef}");

Console.WriteLine($"Created Payment ID: {payment.PaymentId}");
if (payment.NextAction?.Type == "redirect_to_url")
{
    Console.WriteLine($"Hosted 3DS / Wallet Portal: {payment.NextAction.Url}");
}
else if (payment.NextAction?.Type == "pay_at_reference")
{
    Console.WriteLine($"Fawry Kiosk Code: {payment.NextAction.Reference}");
}`
  }
}

async function handleCheckout(e) {
  e.preventDefault()
  const submitBtn = document.getElementById("submitBtn")
  const btnSpinner = document.getElementById("btnSpinner")
  const resultCard = document.getElementById("resultCard")
  const settledAlert = document.getElementById("settledAlert")

  if (settledAlert) settledAlert.classList.add("hidden")

  submitBtn.disabled = true
  btnSpinner.classList.remove("hidden")

  const merchantRef =
    document.getElementById("merchantRef")?.value ||
    `ord_${activeBackend}_${Math.random().toString(36).substring(2, 8)}`

  const payload = {
    product_id: selectedProduct.id,
    productId: selectedProduct.id,
    payment_method: activeMethod,
    paymentMethod: activeMethod,
    provider: activeProvider,
    wallet_carrier: activeMethod === "wallet" ? activeWalletCarrier : undefined,
    customer: {
      phone: document.getElementById("custPhone").value.trim(),
      email: document.getElementById("custEmail").value.trim() || undefined,
      full_name: document.getElementById("custName").value.trim() || undefined,
      fullName: document.getElementById("custName").value.trim() || undefined,
    },
    merchant_reference: merchantRef,
    merchantReference: merchantRef,
    description: selectedProduct.name,
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
    urlSection.classList.add("hidden")
    fawrySection.classList.add("hidden")

    if (nextAction?.type === "redirect_to_url" && nextAction?.url) {
      const redirectUrl = new URL(nextAction.url)
      if (!["http:", "https:"].includes(redirectUrl.protocol)) {
        throw new Error("Gateway returned an unsafe redirect URL")
      }
      urlSection.classList.remove("hidden")
      document.getElementById("redirectLink").href = redirectUrl.toString()
    } else if (nextAction?.type === "pay_at_reference" && nextAction?.reference) {
      fawrySection.classList.remove("hidden")
      document.getElementById("fawryCode").textContent = nextAction.reference
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
  statusEl.className = "badge-status"

  if (norm === "SUCCEEDED") {
    statusEl.classList.add("badge-succeeded")
  } else if (norm === "FAILED" || norm === "CANCELLED") {
    statusEl.classList.add("badge-failed")
  } else {
    statusEl.classList.add("badge-pending")
  }
}

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
        pollingIndicator.textContent = "Settled via Webhook Simulator ✓"
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

async function checkPaymentStatus() {
  if (!currentPaymentId) return
  const targetBaseUrl = getBackendBaseUrl(activeBackend)
  const endpoint = `${targetBaseUrl}/api/payment-status/${encodeURIComponent(currentPaymentId)}`

  try {
    const res = await fetch(endpoint)
    const data = await res.json()
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
    console.warn("Status poll error:", err)
  }
}

function startStatusPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(checkPaymentStatus, 3000)
}

function copyFawryCode() {
  const code = document.getElementById("fawryCode")?.textContent
  if (!code) return
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById("copyCodeBtn")
    if (btn) {
      const orig = btn.textContent
      btn.textContent = "Copied! ✓"
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
      const orig = btn.textContent
      btn.textContent = "Copied! ✓"
      setTimeout(() => {
        btn.textContent = orig
      }, 2000)
    }
  })
}

// Backend Health Prober
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
  await Promise.all([
    checkBackendHealth("typescript"),
    checkBackendHealth("php"),
    checkBackendHealth("dotnet"),
  ])
}

document.addEventListener("DOMContentLoaded", () => {
  detectInitialBackend()
  regenerateOrderRef()

  ;["custName", "custPhone", "custEmail", "merchantRef"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateCodePreview)
  })

  selectProduct("pro")
  selectPaymentMethod("cards")
  switchBackend(activeBackend, backends[activeBackend].port)
  probeAllBackends()

  setInterval(probeAllBackends, 10000)
})
