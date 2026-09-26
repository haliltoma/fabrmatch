import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import env from '#start/env'
import { scanUpload } from '#services/files/file_scanner'

/**
 * Talks to a real clamd. Skipped unless CLAMAV_HOST is set
 * (`docker compose --profile av up -d clamav`, then CLAMAV_HOST=localhost node ace test).
 */
test.group('antivirus engine (live clamd)', () => {
  test('a clean model passes the engine; an unreachable engine fails closed', async ({
    assert,
  }) => {
    const vase = await readFile(new URL('../../public/samples/sample-vase.stl', import.meta.url))
    const clean = await scanUpload(vase, 'STL')
    assert.isTrue(clean.ok, clean.reason ?? '')
    assert.equal(clean.engine, 'clamav')
    assert.include(clean.checks, 'antivirus')

    const port = env.get('CLAMAV_PORT')
    process.env.CLAMAV_PORT = '1'
    try {
      const down = await scanUpload(vase, 'STL')
      assert.isFalse(down.ok)
      assert.match(down.reason!, /not answering/)
    } finally {
      if (port === undefined) delete process.env.CLAMAV_PORT
      else process.env.CLAMAV_PORT = String(port)
    }
  }).skip(!process.env.CLAMAV_HOST, 'set CLAMAV_HOST to run against clamd')
})
