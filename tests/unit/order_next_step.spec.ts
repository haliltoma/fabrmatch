import { test } from '@japa/runner'
import { ORDER_TRANSITIONS } from '#services/orders/order_state_machine'

type Step = {
  stage: string | null
  actor: string | null
  yourTurn: boolean
  title: string
  detail: string
  params: Record<string, string | number>
  money: string
  short: string
  suggestions: Array<{ href: string }>
}
type Lib = {
  ORDER_STAGES: Array<{ id: string }>
  orderNextStep: (
    status: string,
    c: { confirmDays: number; deliveredAt: string | null; formatDate?: (iso: string) => string }
  ) => Step
  checkDeadline: (deliveredAt: string | null, days: number) => string | null
}

test.group('order next step', (group) => {
  let lib: Lib
  group.setup(async () => {
    lib = (await import(
      new URL('../../inertia/lib/order_next_step.ts', import.meta.url).href
    )) as Lib
  })
  const ctx = { confirmDays: 7, deliveredAt: null }

  test('every order status has a next step with a title and a short line', ({ assert }) => {
    for (const status of Object.keys(ORDER_TRANSITIONS)) {
      const step = lib.orderNextStep(status, ctx)
      assert.isNotEmpty(step.title, status)
      assert.isNotEmpty(step.short, status)
      if (step.stage)
        assert.include(
          lib.ORDER_STAGES.map((s) => s.id),
          step.stage,
          status
        )
    }
  })

  test('a finished order always points somewhere next, a live one never does', ({ assert }) => {
    for (const [status, next] of Object.entries(ORDER_TRANSITIONS)) {
      const step = lib.orderNextStep(status, ctx)
      if (next.length === 0) {
        assert.isNull(step.actor, status)
        assert.isAbove(step.suggestions.length, 0, status)
      } else {
        assert.isNotNull(step.actor, status)
        assert.lengthOf(step.suggestions, 0, status)
      }
    }
  })

  test('"cancel for a full refund" is only offered where the state machine allows it', ({
    assert,
  }) => {
    for (const [status, next] of Object.entries(ORDER_TRANSITIONS)) {
      const offers = /cancel for a full refund/i.test(lib.orderNextStep(status, ctx).detail)
      if (offers) assert.include(next as readonly string[], 'cancelled', status)
    }
  })

  test('money is held from payment until the order is completed or decided', ({ assert }) => {
    for (const status of [
      'paid',
      'matching',
      'unmatched',
      'in_production',
      'shipped',
      'delivered',
      'disputed',
    ])
      assert.equal(lib.orderNextStep(status, ctx).money, 'held', status)
    assert.equal(lib.orderNextStep('awaiting_payment', ctx).money, 'not_paid')
    assert.equal(lib.orderNextStep('completed', ctx).money, 'released')
  })

  test('it is the buyer’s turn only to pay and to check the part', ({ assert }) => {
    const mine = Object.keys(ORDER_TRANSITIONS).filter((s) => lib.orderNextStep(s, ctx).yourTurn)
    assert.sameMembers(mine, ['draft', 'awaiting_payment', 'delivered'])
  })

  test('the check deadline is the delivery date plus the confirm window', ({ assert }) => {
    assert.equal(lib.checkDeadline('2026-09-28T10:00:00.000Z', 7), '2026-10-05')
    assert.isNull(lib.checkDeadline(null, 7))
    const step = lib.orderNextStep('delivered', {
      confirmDays: 7,
      deliveredAt: '2026-09-28T10:00:00.000Z',
      formatDate: (iso) => `on ${iso}`,
    })
    assert.equal(step.params.date, 'on 2026-10-05')
    assert.include(step.detail, '{date}')
  })
})
