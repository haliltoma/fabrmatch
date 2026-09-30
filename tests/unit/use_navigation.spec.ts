import { test } from '@japa/runner'

test.group('navigation progress', (group) => {
  let isForegroundVisit: (v: { only: string[]; prefetch: boolean; async: boolean }) => boolean
  group.setup(async () => {
    ;({ isForegroundVisit } = await import(
      new URL('../../inertia/lib/use_navigation.ts', import.meta.url).href
    ))
  })

  test('shows for page changes and form posts, not for background refreshes', ({ assert }) => {
    assert.isTrue(isForegroundVisit({ only: [], prefetch: false, async: false }))
    // a partial reload refreshes one component (it shows a skeleton instead)
    assert.isFalse(isForegroundVisit({ only: ['files'], prefetch: false, async: false }))
    assert.isFalse(isForegroundVisit({ only: [], prefetch: true, async: false }))
    assert.isFalse(isForegroundVisit({ only: [], prefetch: false, async: true }))
  })
})
