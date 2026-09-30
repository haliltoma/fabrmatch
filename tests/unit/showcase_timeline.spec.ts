import { test } from '@japa/runner'

type Timeline = {
  BED_Y: number
  TOP_Y: number
  headKeyframes: () => { x: number[]; y: number[]; times: number[] }
  revealKeyframes: () => { y: number[]; times: number[] }
}

test.group('print showcase timeline', (group) => {
  let tl: Timeline
  group.setup(async () => {
    tl = (await import(
      new URL('../../inertia/lib/showcase_timeline.ts', import.meta.url).href
    )) as Timeline
  })

  test('head keyframes line up and run forward in time from 0 to 1', ({ assert }) => {
    const { x, y, times } = tl.headKeyframes()
    assert.equal(x.length, times.length)
    assert.equal(y.length, times.length)
    assert.equal(times[0], 0)
    assert.equal(times[times.length - 1], 1)
    for (let i = 1; i < times.length; i++) assert.isAbove(times[i], times[i - 1])
  })

  test('the cycle starts and ends on the bed, so the next part starts where this one did', ({
    assert,
  }) => {
    const { y } = tl.headKeyframes()
    assert.equal(y[0], tl.BED_Y)
    assert.equal(y[y.length - 1], tl.BED_Y)
  })

  test('the nozzle stays on the printed layer while printing', ({ assert }) => {
    const head = tl.headKeyframes()
    const reveal = tl.revealKeyframes()
    const printEnd = reveal.times[1]
    for (let i = 0; i < head.times.length && head.times[i] <= printEnd; i++) {
      const p = head.times[i] / printEnd
      const layer = tl.BED_Y - (tl.BED_Y - tl.TOP_Y) * p
      assert.approximately(head.y[i], layer, 0.001)
    }
    assert.equal(reveal.y[reveal.y.length - 1], tl.TOP_Y)
  })
})
