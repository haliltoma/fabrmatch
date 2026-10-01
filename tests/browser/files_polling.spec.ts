import { test } from '@japa/runner'
import type { Page } from 'playwright'
import ModelFile from '#models/model_file'
import type User from '#models/user'
import { createUser, resetDatabase } from '#tests/helpers/order_fixtures'

/**
 * U1: "My files" used to refresh every 3 seconds for as long as a scan was unfinished, which with
 * a stuck scan meant forever. These tests count the real requests the page makes while a file
 * waits for its scan. Playwright's fake clock fast-forwards the minutes in a moment.
 */

async function pendingFile(owner: User) {
  return ModelFile.create({
    ownerId: owner.id,
    storageKey: `models/polling-${owner.id}.stl`,
    originalName: 'stuck-scan.stl',
    format: 'STL',
    sizeBytes: 1024,
    sha256: owner.id.replaceAll('-', '').padEnd(64, '0'),
    analysisStatus: 'pending',
    revision: 1,
  })
}

async function signIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

/** Requests of the list refresh (partial reloads of /files asking for `files`), from now on. */
function countRefreshes(page: Page) {
  const seen: number[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    // only the list's own refresh: the notification bell also reloads this URL, for its badge
    if (url.pathname === '/files' && request.headers()['x-inertia-partial-data'] === 'files') {
      seen.push(Date.now())
    }
  })
  return seen
}

/** Moves the fake clock forward in steps, letting each refresh finish before the next one. */
async function advance(page: Page, ms: number, step = 5_000) {
  for (let done = 0; done < ms; done += step) {
    await page.clock.runFor(step)
    await page.waitForLoadState('networkidle')
  }
}

test.group('files polling (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('a stuck scan is checked on a slowing schedule, then the page stops and says so', async ({
    visit,
    assert,
  }) => {
    const owner = await createUser('polling')
    await pendingFile(owner)
    const page = await visit('/login')
    await signIn(page, owner.email)
    const origin = new URL(page.url()).origin

    await page.clock.install()
    await page.goto(`${origin}/files`)
    await page.waitForLoadState('networkidle')
    const refreshes = countRefreshes(page)

    // the schedule (lib/poll.ts) adds up to about three and a half minutes
    await advance(page, 215_000)
    assert.isAtMost(refreshes.length, 12, 'never more than the 12 steps of the schedule')
    assert.isAtLeast(refreshes.length, 10, 'it does keep checking while the scan may still finish')
    await page.getByText('The check is taking longer than usual').waitFor()

    // the old fixed 3-second timer would have made ~100 more requests in these five minutes
    const before = refreshes.length
    await advance(page, 300_000, 30_000)
    assert.equal(refreshes.length, before, 'no request once it has given up')

    // "Check again" starts one fresh schedule
    await page.getByRole('button', { name: 'Check again' }).click()
    await page.waitForLoadState('networkidle')
    assert.isAbove(refreshes.length, before)
  })

  test('a hidden tab makes no requests and picks up again when it is shown', async ({
    visit,
    assert,
  }) => {
    const owner = await createUser('polling')
    await pendingFile(owner)
    const page = await visit('/login')
    await signIn(page, owner.email)
    const origin = new URL(page.url()).origin

    await page.clock.install()
    await page.goto(`${origin}/files`)
    await page.waitForLoadState('networkidle')
    const refreshes = countRefreshes(page)

    // runs in the browser; written as a string so this Node-side file needs no DOM types
    const setVisibility = (state: 'hidden' | 'visible') =>
      page.evaluate(`
        Object.defineProperty(document, 'visibilityState', { value: '${state}', configurable: true })
        document.dispatchEvent(new Event('visibilitychange'))
      `)

    await setVisibility('hidden')
    await advance(page, 60_000)
    assert.lengthOf(refreshes, 0, 'nobody is looking, so nothing is fetched')

    await setVisibility('visible')
    await advance(page, 10_000)
    assert.isAtLeast(refreshes.length, 1, 'polling resumes once the tab is visible')
  })
})
