import { signPayload, verifySignature, SIGNATURE_TOLERANCE_SECONDS } from "../fabrmatch-contract"

describe("webhook signature", () => {
  const secret = "test-secret"
  const rawBody = Buffer.from(JSON.stringify({ event_id: "evt_1", status: "shipped" }))
  const now = 1_790_000_000_000
  const timestamp = String(Math.floor(now / 1000))

  it("accepts a correctly signed payload", () => {
    const signature = signPayload(secret, timestamp, rawBody)

    expect(verifySignature({ secret, timestamp, signature, rawBody, now })).toBe(true)
  })

  it("rejects a tampered body", () => {
    const signature = signPayload(secret, timestamp, rawBody)
    const tampered = Buffer.from(JSON.stringify({ event_id: "evt_1", status: "delivered" }))

    expect(verifySignature({ secret, timestamp, signature, rawBody: tampered, now })).toBe(false)
  })

  it("rejects a signature made with another secret", () => {
    const signature = signPayload("other-secret", timestamp, rawBody)

    expect(verifySignature({ secret, timestamp, signature, rawBody, now })).toBe(false)
  })

  it("rejects replays outside the tolerance window", () => {
    const signature = signPayload(secret, timestamp, rawBody)
    const later = now + (SIGNATURE_TOLERANCE_SECONDS + 1) * 1000

    expect(verifySignature({ secret, timestamp, signature, rawBody, now: later })).toBe(false)
  })

  it("matches the shared contract vector used by Sistem B", () => {
    // Aynı vektör apps/manufacturer-network/tests/unit/signature.spec.ts içinde — imza şeması iki sistemde birebir
    const body = JSON.stringify({ event_id: "evt_vector", status: "shipped", amount: 145.5 })

    expect(signPayload("contract-vector-secret", "1790000000", body)).toBe(
      "v1=8a47c13ff50768cb888cc73956f036a6a430e48ae0f5781d4d4bc3f4f1ac8512"
    )
  })

  it("rejects missing headers or secret", () => {
    const signature = signPayload(secret, timestamp, rawBody)

    expect(verifySignature({ secret: undefined, timestamp, signature, rawBody, now })).toBe(false)
    expect(verifySignature({ secret, timestamp: undefined, signature, rawBody, now })).toBe(false)
    expect(verifySignature({ secret, timestamp, signature: "v1=short", rawBody, now })).toBe(false)
  })
})
