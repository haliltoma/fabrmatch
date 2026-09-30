import { test } from '@japa/runner'

test.group('poll delays', (group) => {
  let pollDelays: () => number[]
  group.setup(async () => {
    ;({ pollDelays } = await import(new URL('../../inertia/lib/poll.ts', import.meta.url).href))
  })

  test('starts quick, never speeds up again, and stops after about three minutes', ({ assert }) => {
    const delays = pollDelays()
    assert.equal(delays[0], 3000)
    for (let i = 1; i < delays.length; i++) assert.isAtLeast(delays[i], delays[i - 1])
    const total = delays.reduce((a, b) => a + b, 0)
    assert.isAtLeast(total, 180_000)
    assert.isAtMost(total, 210_000)
    // far fewer requests than the old fixed 3-second interval over the same time (≈ 60)
    assert.isAtMost(delays.length, 15)
  })
})
