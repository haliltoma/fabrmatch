// Sistem A smoke testi: gerçek sepet akışıyla sipariş + imzalı üretim durumu webhook'u.
// node tools/store-contract-smoke.mjs order
// node tools/store-contract-smoke.mjs webhook <production_request_id> <line_item_id> <order_id> <status> [instruction_id] [--bad-signature]
import crypto from "node:crypto"

const BASE = process.env.STORE_URL ?? "http://localhost:9000"
const PK = process.env.PK
const SECRET = process.env.FABRMATCH_WEBHOOK_SECRET ?? "dev-webhook-secret-change-me"

async function api(method, path, body) {
  const response = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-publishable-api-key": PK },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 600)}`)
  }
  return JSON.parse(text)
}

async function placeOrder() {
  const { regions } = await api("GET", "/store/regions")
  const turkey = regions.find((region) => region.currency_code === "try")
  const { offers } = await api("GET", "/store/offers?limit=1")
  const { cart } = await api("POST", "/store/carts", { region_id: turkey.id, email: "smoke@fabrmatch.local" })
  await api("POST", `/store/carts/${cart.id}/line-items`, { offer_id: offers[0].id, quantity: 2 })

  const address = {
    first_name: "Smoke",
    last_name: "Test",
    address_1: "Mezitli",
    city: "Mersin",
    country_code: "tr",
    postal_code: "33200",
  }
  await api("POST", `/store/carts/${cart.id}`, { shipping_address: address, billing_address: address })

  const { shipping_options } = await api("GET", `/store/shipping-options?cart_id=${cart.id}`)
  for (const options of Object.values(shipping_options)) {
    await api("POST", `/store/carts/${cart.id}/shipping-methods`, { option_id: options[0].id })
  }

  const { payment_collection } = await api("POST", "/store/payment-collections", { cart_id: cart.id })
  await api("POST", `/store/payment-collections/${payment_collection.id}/payment-sessions`, {
    provider_id: "pp_system_default",
  })
  const completed = await api("POST", `/store/carts/${cart.id}/complete`)
  console.log(
    JSON.stringify({
      offer: offers[0].sku,
      type: completed.type,
      order_group: completed.order_group?.id,
      error: completed.error,
    })
  )
}

async function sendWebhook([productionRequestId, lineItemId, orderId, status, ...rest]) {
  const badSignature = rest.includes("--bad-signature")
  const instructionId = rest.find((arg) => !arg.startsWith("--"))
  const body = JSON.stringify({
    event_id: `evt_${Date.now()}`,
    sistem_a_order_ref: orderId,
    sistem_a_line_item_ref: lineItemId,
    production_request_id: productionRequestId,
    status,
    occurred_at: new Date().toISOString(),
    tracking_number: status === "shipped" ? "TRK-SMOKE-1" : null,
    production_photos: status === "quality_check" ? ["https://example.com/qc-1.jpg"] : null,
    payout_instruction: instructionId ? { instruction_id: instructionId, amount: 145.5, currency_code: "try" } : null,
  })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const digest = crypto.createHmac("sha256", SECRET).update(`${timestamp}.`).update(body).digest("hex")

  const response = await fetch(`${BASE}/webhooks/production-status`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fabrmatch-timestamp": timestamp,
      "x-fabrmatch-signature": badSignature ? "v1=deadbeef" : `v1=${digest}`,
    },
    body,
  })
  console.log(response.status, await response.text())
}

const [mode, ...args] = process.argv.slice(2)
if (mode === "order") {
  await placeOrder()
} else if (mode === "webhook") {
  await sendWebhook(args)
} else {
  console.error("usage: store-smoke.mjs order | webhook ...")
  process.exit(1)
}
