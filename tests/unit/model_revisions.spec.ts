/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ModelFile from '#models/model_file'
import ModelFileService from '#services/files/model_file_service'
import OrderItem from '#models/order_item'
import { createDraftOrder, createUser } from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

const service = new ModelFileService()
let counter = 0
const upload = (name = 'part.stl') => {
  counter += 1
  return {
    originalName: name,
    sizeBytes: 1000 + counter,
    sha256: counter.toString(16).padStart(64, '0'),
    storageKey: `models/test-${counter}.stl`,
    format: 'STL' as const,
  }
}

test.group('model file versions (X-10)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a new version points at the one it replaces and numbers itself', async ({ assert }) => {
    const owner = await createUser('owner')
    const { file: v1 } = await service.register(owner, upload())
    const { file: v2 } = await service.register(owner, upload(), v1.id)
    const { file: v3 } = await service.register(owner, upload(), v2.id)
    assert.equal(v1.revision, 1)
    assert.isNull(v1.previousFileId)
    assert.deepEqual([v2.revision, v2.previousFileId], [2, v1.id])
    assert.deepEqual([v3.revision, v3.previousFileId], [3, v2.id])
  })

  test('the list shows only the latest version, with the history attached', async ({ assert }) => {
    const owner = await createUser('owner')
    const { file: v1 } = await service.register(owner, upload('bracket.stl'))
    const { file: v2 } = await service.register(owner, upload('bracket.stl'), v1.id)
    const { file: v3 } = await service.register(owner, upload('bracket.stl'), v2.id)
    const { file: other } = await service.register(owner, upload('lid.stl'))

    const { rows, history } = await service.listForOwner(owner.id)
    assert.sameMembers(
      rows.map((r) => r.id),
      [v3.id, other.id]
    )
    assert.deepEqual(
      history.get(v3.id)!.map((v) => [v.id, v.revision]),
      [
        [v2.id, 2],
        [v1.id, 1],
      ]
    )
    assert.deepEqual(history.get(other.id), [])
  })

  test('only your own newest version can be replaced, and not by the same file', async ({
    assert,
  }) => {
    const owner = await createUser('owner')
    const stranger = await createUser('stranger')
    const { file: v1 } = await service.register(owner, upload())
    await service.register(owner, upload(), v1.id)

    await assert.rejects(
      () => service.register(owner, upload(), v1.id),
      /already has a newer version/
    )
    await assert.rejects(() => service.register(stranger, upload(), v1.id), /not found/)
    await assert.rejects(() => service.register(owner, upload(), uid(999999)), /not found/)

    const { file: solo } = await service.register(owner, upload())
    const same = { ...upload(), sha256: solo.sha256 }
    await assert.rejects(() => service.register(owner, same, solo.id), /same file/)
    assert.lengthOf(await ModelFile.query().where('previousFileId', solo.id), 0)
  })

  test('an older version knows the newest one; the newest knows nothing newer', async ({
    assert,
  }) => {
    const owner = await createUser('owner')
    const { file: v1 } = await service.register(owner, upload())
    const { file: v2 } = await service.register(owner, upload(), v1.id)
    const { file: v3 } = await service.register(owner, upload(), v2.id)
    assert.equal((await service.newerVersionOf(v1))?.id, v3.id)
    assert.equal((await service.newerVersionOf(v2))?.id, v3.id)
    assert.isNull(await service.newerVersionOf(v3))
  })

  test('orders already placed keep the version they were priced with', async ({ assert }) => {
    const owner = await createUser('owner')
    const { order, file: v1 } = await createDraftOrder(owner)
    const { file: v2 } = await service.register(owner, upload(), v1.id)
    assert.equal(v2.previousFileId, v1.id)
    const item = await OrderItem.query().where('orderId', order.id).firstOrFail()
    assert.equal(item.modelFileId, v1.id)
    assert.notEqual(item.modelFileId, v2.id)
  })
})
