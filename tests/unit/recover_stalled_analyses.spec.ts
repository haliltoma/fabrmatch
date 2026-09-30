import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ModelFile from '#models/model_file'
import User from '#models/user'
import ModelFileService from '#services/files/model_file_service'

test.group('ModelFileService.recoverStalled', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function fileFor(status: 'pending' | 'processing' | 'done', ageMinutes: number) {
    const user = await User.create({
      fullName: 'Scan Owner',
      email: `scan-${Math.random().toString(36).slice(2)}@test.com`,
      password: 'password123',
    })
    const file = await ModelFile.create({
      ownerId: user.id,
      storageKey: `models/${Math.random().toString(36).slice(2)}.stl`,
      originalName: 'part.stl',
      format: 'STL',
      sizeBytes: 1024,
      sha256: Math.random().toString(16).slice(2).padEnd(64, '0'),
      analysisStatus: status,
      revision: 1,
    })
    const at = DateTime.now().minus({ minutes: ageMinutes })
    await ModelFile.query()
      .where('id', file.id)
      .update({ createdAt: at.toJSDate(), updatedAt: at.toJSDate() })
    return file
  }

  test('re-queues scans stuck for 15 minutes and leaves fresh or finished ones alone', async ({
    assert,
  }) => {
    const stuck = await fileFor('processing', 20)
    const fresh = await fileFor('pending', 5)
    const done = await fileFor('done', 60)
    const sent: number[] = []

    const result = await new ModelFileService().recoverStalled({
      dispatch: async (id) => {
        sent.push(id)
      },
    })

    assert.includeMembers(sent, [stuck.id])
    assert.notInclude(sent, fresh.id)
    assert.notInclude(sent, done.id)
    assert.isAtLeast(result.requeued, 1)
    await stuck.refresh()
    assert.equal(stuck.analysisStatus, 'pending')
  })

  test('gives up after two hours so the owner is not left on "scanning" forever', async ({
    assert,
  }) => {
    const old = await fileFor('pending', 180)
    const sent: number[] = []

    await new ModelFileService().recoverStalled({
      dispatch: async (id) => {
        sent.push(id)
      },
    })

    await old.refresh()
    assert.equal(old.analysisStatus, 'failed')
    assert.isFalse(old.isPrintable)
    assert.match(old.analysisError ?? '', /upload the file again/)
    assert.notInclude(sent, old.id)
  })
})
