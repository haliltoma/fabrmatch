import { test } from '@japa/runner'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ModelFile from '#models/model_file'
import { scanUpload } from '#services/files/file_scanner'
import { createUser } from '#tests/helpers/order_fixtures'

test.group('upload integrity check against the stored row', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // regression 2026-10-02: size_bytes is a bigint, read back as a string, so every real upload
  // was rejected as "The stored file does not match the upload"
  test('a file read back from the database passes the size and checksum check', async ({
    assert,
  }) => {
    const bytes = await readFile(app.makePath('public/samples/sample-vase.stl'))
    const owner = await createUser('uploader')
    const created = await ModelFile.create({
      ownerId: owner.id,
      storageKey: `models/integrity-${owner.id}.stl`,
      originalName: 'sample-vase.stl',
      format: 'STL',
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      analysisStatus: 'pending',
    })
    const row = await ModelFile.findOrFail(created.id)
    assert.strictEqual(row.sizeBytes, bytes.length)

    const verdict = await scanUpload(bytes, row.format, {
      sha256: row.sha256,
      sizeBytes: row.sizeBytes,
    })
    assert.isTrue(verdict.ok, verdict.reason ?? undefined)
    assert.include(verdict.checks, 'integrity')

    const tampered = await scanUpload(Buffer.concat([bytes, Buffer.from('x')]), row.format, {
      sha256: row.sha256,
      sizeBytes: row.sizeBytes,
    })
    assert.isFalse(tampered.ok)
  })
})
