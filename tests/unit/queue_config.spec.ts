import { readdir } from 'node:fs/promises'
import { test } from '@japa/runner'
import { Locator } from '@boringnode/queue'
import queueConfig from '#config/queue'

/**
 * `queue:work` registers the job classes it finds through `locations`. Without that setting the
 * worker knew no job at all: every analysis, offer expiry and e-mail failed with "Requested job …
 * is not registered" while the web side kept dispatching them.
 */
test.group('queue config', () => {
  test('the worker finds every job class in app/jobs', async ({ assert }) => {
    const entries = await readdir(new URL('../../app/jobs/', import.meta.url))
    const files = entries.filter((f) => f.endsWith('.ts'))
    const registered = await Locator.registerFromGlob(queueConfig.locations ?? [])
    assert.equal(registered, files.length)
    assert.exists(Locator.get('AnalyzeModelFile'))
    assert.exists(Locator.get('ExpireOffer'))
  })
})
