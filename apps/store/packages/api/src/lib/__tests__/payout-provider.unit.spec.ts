import Stripe from "stripe"
import {
  computeReleaseAt,
  createStripeConnectPayoutProvider,
  getPayoutProvider,
  manualPayoutProvider,
  PAYOUT_RELEASE_WINDOW_HOURS,
  setPayoutProviderForTesting,
  toMinorUnits,
} from "../payout-provider"

describe("toMinorUnits", () => {
  it("multiplies by 100 for standard currencies", () => {
    expect(toMinorUnits(145.5, "try")).toBe(14550)
    expect(toMinorUnits(1, "USD")).toBe(100)
  })

  it("does not multiply zero-decimal currencies", () => {
    expect(toMinorUnits(500, "jpy")).toBe(500)
  })

  it("is not thrown off by binary floating-point drift on ordinary 2-decimal amounts", () => {
    // 19.9 * 100 === 1990.0000000000002 in IEEE 754 — amounts here are always
    // already rounded to cents (Sistem B), so this drift is the only case that matters
    expect(toMinorUnits(19.9, "try")).toBe(1990)
    expect(toMinorUnits(156.93, "try")).toBe(15693)
  })
})

describe("manualPayoutProvider", () => {
  it("always succeeds with a manual reference", async () => {
    const result = await manualPayoutProvider.payout({
      amount: 100,
      currencyCode: "try",
      accountId: "acct_x",
      transferGroup: "order_1",
      idempotencyKey: "pi_1",
    })

    expect(result.ok).toBe(true)
    expect(result.ok && result.providerReference).toMatch(/^manual_/)
  })
})

describe("createStripeConnectPayoutProvider", () => {
  const request = {
    amount: 145.5,
    currencyCode: "try",
    accountId: "acct_manufacturer",
    transferGroup: "order_123",
    idempotencyKey: "pi_abc",
  }

  it("creates a transfer with amount in minor units and an idempotency key", async () => {
    const create = jest.fn().mockResolvedValue({ id: "tr_123" })
    const stripe = { transfers: { create } } as unknown as Stripe

    const result = await createStripeConnectPayoutProvider(stripe).payout(request)

    expect(result).toEqual({ ok: true, providerReference: "tr_123" })
    expect(create).toHaveBeenCalledWith(
      { amount: 14550, currency: "try", destination: "acct_manufacturer", transfer_group: "order_123" },
      { idempotencyKey: "pi_abc" }
    )
  })

  it("returns a typed failure instead of throwing when Stripe rejects", async () => {
    const create = jest.fn().mockRejectedValue(new Error("No such destination: acct_manufacturer"))
    const stripe = { transfers: { create } } as unknown as Stripe

    const result = await createStripeConnectPayoutProvider(stripe).payout(request)

    expect(result).toEqual({ ok: false, error: "No such destination: acct_manufacturer" })
  })
})

describe("computeReleaseAt", () => {
  it("adds the configured release window to the delivered timestamp", () => {
    const delivered = new Date("2026-09-16T10:00:00.000Z")
    const releaseAt = computeReleaseAt(delivered)

    expect(releaseAt.getTime() - delivered.getTime()).toBe(PAYOUT_RELEASE_WINDOW_HOURS * 60 * 60 * 1000)
  })
})

describe("getPayoutProvider", () => {
  afterEach(() => {
    setPayoutProviderForTesting(null)
    delete process.env.STRIPE_SECRET_KEY
  })

  it("falls back to the manual provider without a Stripe secret key", () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(getPayoutProvider().name).toBe("manual")
  })

  it("uses the Stripe Connect provider once a secret key is configured", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"
    expect(getPayoutProvider().name).toBe("stripe-connect")
  })
})
