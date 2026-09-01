import { OpenWrapperClient } from "../../sdk/typescript/dist/index.js"

const BASE_URL = process.env.OPENWRAPPER_BASE_URL || "http://localhost:3000/api/v1"
const API_KEY = process.env.OPENWRAPPER_API_KEY || "ow_live_uwps019_ivSbnDc7Fz8-vHRIWf5QyFGr"

console.log("--------------------------------------------------")
console.log("Testing OpenWrapper TypeScript SDK against Live Gateway...")
console.log("Gateway URL:", BASE_URL)
console.log("API Key:", API_KEY)
console.log("--------------------------------------------------\n")

const client = new OpenWrapperClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
})

async function runTests() {
  // Test 1: Paymob Payment Creation
  console.log("1️⃣ Testing Paymob Payment Creation...")
  try {
    const paymob = await client.payments.create({
      provider: "paymob",
      amountMinorUnits: 15000,
      currency: "EGP",
      customer: {
        phone: "+201000000000",
        email: "ahmed@example.com",
        fullName: "Ahmed Ali",
      },
      merchantReference: `paymob_live_${Date.now()}`,
      description: "Production SDK Payment",
    })
    console.log("✅ Paymob Succeeded!")
    console.log("   - Payment ID:", paymob.paymentId)
    console.log("   - Status:", paymob.status)
    console.log("   - Redirect URL:", paymob.nextAction?.url)
  } catch (err) {
    console.error("❌ Paymob Info:", err.message)
  }

  console.log("\n--------------------------------------------------\n")

  // Test 2: Fawry Payment Creation
  console.log("2️⃣ Testing Fawry Kiosk Code Creation...")
  try {
    const fawry = await client.payments.create({
      provider: "fawry",
      amountMinorUnits: 25000,
      currency: "EGP",
      customer: {
        phone: "+201112223344",
        email: "sara@example.com",
        fullName: "Sara Mahmoud",
      },
      merchantReference: `fawry_live_${Date.now()}`,
      description: "Fawry Production Order",
    })
    console.log("✅ Fawry Succeeded!")
    console.log("   - Payment ID:", fawry.paymentId)
    console.log("   - Status:", fawry.status)
    console.log("   - Reference Code:", fawry.nextAction?.reference)
  } catch (err) {
    console.error("❌ Fawry Info:", err.message)
  }

  console.log("\n--------------------------------------------------\n")

  // Test 3: Get Payment by ID
  console.log("3️⃣ Testing Payment Status Retrieval...")
  try {
    const payment = await client.payments.get("pay_56c5ac35ca394ae48e40b634")
    console.log("✅ Payment Retrieval Succeeded!")
    console.log("   - Payment ID:", payment.paymentId)
    console.log("   - Status:", payment.status)
    console.log("   - Amount:", payment.amountMinorUnits / 100, payment.currency)
  } catch (err) {
    console.error("❌ Retrieval Info:", err.message)
  }

  console.log("\n🎉 All SDK tests finished!\n")
}

runTests()
