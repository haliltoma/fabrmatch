import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ModelFile from '#models/model_file'
import RoleService from '#services/identity/role_service'
import {
  createAnalyzedFile,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

/** A storage key the server presigned for this user (registration only accepts those). */
async function presigned(client: any, user: any, sizeBytes: number): Promise<string> {
  const res = await client
    .post('/files/upload-url')
    .loginAs(user)
    .withCsrfToken()
    .header('accept', 'application/json')
    .json({ originalName: 'model.stl', contentType: 'application/octet-stream', sizeBytes })
  return res.body().storageKey
}

test.group('model versions over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('uploading a new version replaces the old one in the list and warns on the old quote', async ({
    client,
    assert,
  }) => {
    const user = await createUser('owner')
    await new RoleService().assignRole(user, 'seller')
    const v1 = await createAnalyzedFile(user, 8000)
    const storageKey = await presigned(client, user, 2048)

    const register = await client
      .post('/files/register')
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({
        originalName: 'cube-v2.stl',
        sizeBytes: 2048,
        sha256: 'ab'.repeat(32),
        storageKey,
        format: 'STL',
        replacesFileId: v1.id,
      })
    register.assertStatus(200)
    assert.equal(register.body().file.revision, 2)
    const v2 = await ModelFile.findOrFail(register.body().file.id)
    assert.equal(v2.previousFileId, v1.id)

    const list = await client.get('/files').headers(inertia).loginAs(user)
    assert.deepEqual(
      list.body().props.files.map((f: { id: number }) => f.id),
      [v2.id]
    )
    assert.equal(list.body().props.files[0].olderVersions[0].id, v1.id)

    const oldQuote = await client.get(`/files/${v1.id}/quote`).headers(inertia).loginAs(user)
    assert.equal(oldQuote.body().props.newerVersionId, v2.id)
  })

  test('someone else’s file cannot be replaced', async ({ client, assert }) => {
    const owner = await createUser('owner')
    const thief = await createUser('thief')
    await new RoleService().assignRole(thief, 'seller')
    const file = await createAnalyzedFile(owner, 8000)
    const storageKey = await presigned(client, thief, 100)
    const attempt = await client
      .post('/files/register')
      .loginAs(thief)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({
        originalName: 'x.stl',
        sizeBytes: 100,
        sha256: 'cd'.repeat(32),
        storageKey,
        format: 'STL',
        replacesFileId: file.id,
      })
    attempt.assertStatus(400)
    assert.lengthOf(await ModelFile.query().where('previousFileId', file.id), 0)
  })
})
