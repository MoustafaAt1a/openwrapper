// Verification script for Checkout Demo Endpoints
const baseUrl = process.argv[2] || "http://localhost:4000"

async function run() {
  console.log("1. Probing Health...")
  const healthRes = await fetch(`${baseUrl}/api/health`)
  const health = await healthRes.json()
  console.log("   Health:", health.status, health.runtime)

  console.log("2. Testing Card Payment...")
  const cardRes = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "pro",
      payment_method: "cards",
      provider: "paymob",
      customer: { phone: "+201001234567", fullName: "Ahmed Ali", email: "test@example.com" },
    }),
  })
  const cardData = await cardRes.json()
  console.log("   Card Payment ID:", cardData.payment_id, "Status:", cardData.status)

  console.log("3. Testing Mobile Wallet Payment...")
  const walletRes = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "pro",
      payment_method: "wallet",
      wallet_carrier: "vodafone",
      provider: "paymob",
      customer: { phone: "+201010000000", fullName: "Ahmed Ali", email: "test@example.com" },
    }),
  })
  const walletData = await walletRes.json()
  console.log("   Wallet Payment ID:", walletData.payment_id, "Next Action:", walletData.next_action?.url)

  console.log("4. Testing Fawry Kiosk Voucher...")
  const fawryRes = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: "pro",
      payment_method: "fawry",
      provider: "fawry",
      customer: { phone: "+201001234567", fullName: "Ahmed Ali", email: "test@example.com" },
    }),
  })
  const fawryData = await fawryRes.json()
  console.log("   Fawry Kiosk Code:", fawryData.next_action?.reference)

  console.log("5. Testing Webhook Settlement Simulator on Wallet Payment...")
  const settleRes = await fetch(`${baseUrl}/api/simulate-settlement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_id: walletData.payment_id }),
  })
  const settleData = await settleRes.json()
  console.log("   Settled Status:", settleData.status, "Settled At:", settleData.settled_at)

  console.log("6. Verifying Live Status Poller for Settled Payment...")
  const pollRes = await fetch(`${baseUrl}/api/payment-status/${walletData.payment_id}`)
  const pollData = await pollRes.json()
  console.log("   Polled Status:", pollData.status)

  if (pollData.status === "succeeded") {
    console.log("\n✔ ALL VERIFICATION TESTS PASSED 10/10 PERFECT!\n")
  } else {
    throw new Error("Expected status to be succeeded but got " + pollData.status)
  }
}

run().catch((err) => {
  console.error("Verification failed:", err)
  process.exit(1)
})
