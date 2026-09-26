import { test } from '@japa/runner'

type Story = { turns: number; face: number; local: number[]; journey: number }
type Module = {
  FACES: readonly string[]
  STORY_SECONDS: number
  STORY_STILL: number
  SHOP_CURSOR: [number, number, number]
  JOURNEY_DELIVERED: number
  storyAt: (t: number) => Story
  cursorAt: (
    local: number,
    from: number,
    to: number,
    clickAt: number
  ) => { travel: number; hovering: boolean; pressed: boolean; clicked: boolean }
}

test.group('hero cube story', (group) => {
  let m: Module
  let journeyStill: number
  group.setup(async () => {
    m = (await import(new URL('../../inertia/lib/cube_story.ts', import.meta.url).href)) as Module
    const j = await import(new URL('../../inertia/lib/journey.ts', import.meta.url).href)
    journeyStill = j.STILL_TIME
  })

  test('the faces come in order and the loop closes on the shop', ({ assert }) => {
    assert.equal(m.JOURNEY_DELIVERED, journeyStill)
    const seen: number[] = []
    let last = 0
    for (let t = 0; t < m.STORY_SECONDS; t += 0.05) {
      const s = m.storyAt(t)
      assert.isAtLeast(s.turns, last - 1e-9, `turns never go back (${t.toFixed(2)}s)`)
      last = s.turns
      if (seen.at(-1) !== s.face) seen.push(s.face)
    }
    assert.deepEqual(seen, [0, 1, 2, 3, 0])
    assert.approximately(m.storyAt(m.STORY_SECONDS - 0.001).turns, 4, 0.01)
    assert.equal(m.storyAt(m.STORY_SECONDS).turns, 0, 'a full turn is the start again')
  })

  test('the parcel is delivered before the cube turns to the money', ({ assert }) => {
    let deliveredWhileMakeInFront = false
    for (let t = 0; t < m.STORY_SECONDS; t += 0.05) {
      const s = m.storyAt(t)
      if (s.face === 2 && s.journey === m.JOURNEY_DELIVERED) deliveredWhileMakeInFront = true
      if (s.face === 3) assert.equal(s.journey, m.JOURNEY_DELIVERED)
    }
    assert.isTrue(deliveredWhileMakeInFront)
  })

  test('every face holds still for 2 s before anything moves, and ~2 s after', ({ assert }) => {
    const s = m.storyAt(m.STORY_STILL)
    assert.equal(s.face, 0)
    assert.equal(s.turns, 0)
    assert.equal(m.cursorAt(s.local[0], ...m.SHOP_CURSOR).travel, 0, 'nothing picked at load')
    assert.isAtLeast(m.SHOP_CURSOR[0], 2)
    // after the pick, the shop stays in front for at least 2 s
    assert.equal(m.storyAt(m.SHOP_CURSOR[2] + 2).turns, 0)
    for (let face = 1; face < 4; face++) {
      let first = -1
      let last = -1
      for (let t = 0; t < m.STORY_SECONDS; t += 0.05) {
        const story = m.storyAt(t)
        if (Math.abs(story.turns - face) < 1e-6) {
          if (first < 0) first = t
          last = t
        }
      }
      assert.isAtLeast(last - first, 5, `face ${face} holds`)
    }
  })

  test('the cursor travels, hovers, then clicks once', ({ assert }) => {
    assert.equal(m.cursorAt(0, 0.4, 1.8, 2.5).travel, 0)
    assert.isTrue(m.cursorAt(2, 0.4, 1.8, 2.5).hovering)
    assert.isFalse(m.cursorAt(2, 0.4, 1.8, 2.5).clicked)
    assert.isTrue(m.cursorAt(2.55, 0.4, 1.8, 2.5).pressed)
    assert.isFalse(m.cursorAt(3, 0.4, 1.8, 2.5).pressed)
  })
})
