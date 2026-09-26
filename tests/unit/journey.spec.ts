import { test } from '@japa/runner'

type Point = { x: number; y: number }
type Journey = {
  LOOP_SECONDS: number
  STILL_TIME: number
  sceneAt: (t: number) => {
    step: string
    tip: Point
    pose: unknown
    printedTo: number
    parcel: string
    vase: { mode: string }
  }
  armJoints: (pose: unknown) => { tip: Point }
}

test.group('hero print journey', (group) => {
  let j: Journey
  group.setup(async () => {
    j = (await import(new URL('../../inertia/lib/journey.ts', import.meta.url).href)) as Journey
  })

  test('the arm reaches every point the timeline asks for', ({ assert }) => {
    for (let time = 0; time < j.LOOP_SECONDS; time += 0.05) {
      const scene = j.sceneAt(time)
      const { tip } = j.armJoints(scene.pose)
      assert.approximately(tip.x, scene.tip.x, 0.6, `x at ${time.toFixed(2)}s`)
      assert.approximately(tip.y, scene.tip.y, 0.6, `y at ${time.toFixed(2)}s`)
    }
  })

  test('the steps come in order and the loop ends delivered', ({ assert }) => {
    const seen: string[] = []
    for (let time = 0; time < j.LOOP_SECONDS; time += 0.1) {
      const step = j.sceneAt(time).step
      if (seen[seen.length - 1] !== step) seen.push(step)
    }
    assert.deepEqual(seen, ['printing', 'packing', 'shipping', 'delivered'])
    assert.equal(j.sceneAt(j.STILL_TIME).step, 'delivered')
    assert.equal(j.sceneAt(j.STILL_TIME).parcel, 'buyer')
  })

  test('the vase grows from the bed while printing', ({ assert }) => {
    assert.isAbove(j.sceneAt(1).printedTo, j.sceneAt(5).printedTo)
    assert.equal(j.sceneAt(3).vase.mode, 'printing')
    assert.equal(j.sceneAt(6.8).vase.mode, 'held')
    assert.equal(j.sceneAt(9.5).vase.mode, 'boxed')
  })
})
