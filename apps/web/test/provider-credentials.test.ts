import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { validateProviderCredentials } from "../lib/provider-credentials"

describe("validateProviderCredentials", () => {
  it("rejects live mode requests without credentials", () => {
    const emptyHeaders = new Headers()

    const paymobCheck = validateProviderCredentials("paymob", emptyHeaders, null, {
      isTestMode: false,
    })
    assert.equal(paymobCheck.ok, false)
    if (!paymobCheck.ok) {
      assert.match(paymobCheck.message, /Paymob credentials missing/)
    }

    const fawryCheck = validateProviderCredentials("fawry", emptyHeaders, null, {
      isTestMode: false,
    })
    assert.equal(fawryCheck.ok, false)
    if (!fawryCheck.ok) {
      assert.match(fawryCheck.message, /Fawry credentials missing/)
    }

    const stripeCheck = validateProviderCredentials("stripe", emptyHeaders, null, {
      isTestMode: false,
    })
    assert.equal(stripeCheck.ok, false)
    if (!stripeCheck.ok) {
      assert.match(stripeCheck.message, /Stripe credentials missing/)
    }
  })

  it("permits test mode requests without credentials", () => {
    const emptyHeaders = new Headers()

    const paymobCheck = validateProviderCredentials("paymob", emptyHeaders, null, {
      isTestMode: true,
    })
    assert.equal(paymobCheck.ok, true)

    const fawryCheck = validateProviderCredentials("fawry", emptyHeaders, null, {
      isTestMode: true,
    })
    assert.equal(fawryCheck.ok, true)

    const stripeCheck = validateProviderCredentials("stripe", emptyHeaders, null, {
      isTestMode: true,
    })
    assert.equal(stripeCheck.ok, true)
  })

  it("detects test mode from headers automatically", () => {
    const testHeader = new Headers({ "x-openwrapper-environment": "test" })
    assert.equal(validateProviderCredentials("paymob", testHeader).ok, true)
    assert.equal(validateProviderCredentials("fawry", testHeader).ok, true)
    assert.equal(validateProviderCredentials("stripe", testHeader).ok, true)

    const authHeader = new Headers({ authorization: "Bearer ow_test_abc123" })
    assert.equal(validateProviderCredentials("paymob", authHeader).ok, true)
    assert.equal(validateProviderCredentials("fawry", authHeader).ok, true)
    assert.equal(validateProviderCredentials("stripe", authHeader).ok, true)
  })
})
