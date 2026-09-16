import { buildReconciliationReport, type SistemBWebhookEvent } from "../reconciliation"

const event = (overrides: Partial<SistemBWebhookEvent>): SistemBWebhookEvent => ({
  event_id: "evt_1",
  production_request_id: "pr_1",
  status: "delivered",
  state: "delivered",
  delivered_at: "2026-09-16T09:00:00Z",
  ...overrides,
})

describe("buildReconciliationReport", () => {
  it("reports no anomalies when every delivered event was received", () => {
    const report = buildReconciliationReport(
      [event({ event_id: "evt_1" }), event({ event_id: "evt_2" })],
      new Set(["evt_1", "evt_2"])
    )

    expect(report).toEqual({
      sistem_b_event_count: 2,
      matched_count: 2,
      missing_event_ids: [],
      has_anomalies: false,
    })
  })

  it("flags a delivered event Sistem A never recorded — 'gönderildi ama alınmadı'", () => {
    const report = buildReconciliationReport(
      [event({ event_id: "evt_1" }), event({ event_id: "evt_2" })],
      new Set(["evt_1"])
    )

    expect(report.has_anomalies).toBe(true)
    expect(report.missing_event_ids).toEqual(["evt_2"])
    expect(report.matched_count).toBe(1)
  })

  it("does not flag an event both sides agree failed", () => {
    const report = buildReconciliationReport([event({ event_id: "evt_1", state: "failed" })], new Set())

    expect(report.has_anomalies).toBe(false)
    expect(report.missing_event_ids).toEqual([])
    expect(report.matched_count).toBe(0)
    expect(report.sistem_b_event_count).toBe(1)
  })

  it("handles an empty window", () => {
    expect(buildReconciliationReport([], new Set())).toEqual({
      sistem_b_event_count: 0,
      matched_count: 0,
      missing_event_ids: [],
      has_anomalies: false,
    })
  })
})
