/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import env from '#start/env'
import ModelFile from '#models/model_file'
import RoleService from '#services/identity/role_service'
import ProductionJob from '#models/production_job'
import QcPhotoService from '#services/manufacturing/qc_photo_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import {
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const json = { accept: 'application/json' }
const SHA = 'a'.repeat(64)

async function member() {
  const user = await createUser('uploader')
  await new RoleService().assignRole(user, 'seller')
  return user
}

/** Real object storage (local MinIO) answers; CI without it skips the live upload check. */
async function storageUp() {
  try {
    const res = await fetch(env.get('S3_ENDPOINT') + '/minio/health/live', {
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}

test.group('model upload over HTTP (review fix 1+2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the upload URL is signed for PUT with the declared size', async ({ client, assert }) => {
    const user = await member()
    const res = await client
      .post('/files/upload-url')
      .loginAs(user)
      .withCsrfToken()
      .headers(json)
      .json({ originalName: 'cube.stl', contentType: 'application/octet-stream', sizeBytes: 684 })
    res.assertStatus(200)
    const url = new URL(res.body().signedUrl)
    assert.equal(url.searchParams.get('x-id'), 'PutObject')
    assert.include(url.searchParams.get('X-Amz-SignedHeaders') ?? '', 'content-length')
    assert.match(res.body().storageKey, /^models\/[0-9a-f-]{36}\.stl$/)

    const tooBig = await client
      .post('/files/upload-url')
      .loginAs(user)
      .withCsrfToken()
      .headers(json)
      .json({
        originalName: 'cube.stl',
        contentType: 'application/octet-stream',
        sizeBytes: 300 * 1024 * 1024,
      })
    assert.isAtLeast(tooBig.status(), 400)
  })

  test('register accepts only a key issued to this user, once, with the same size', async ({
    client,
    assert,
  }) => {
    const owner = await member()
    const stranger = await member()
    const issue = async () =>
      (
        await client.post('/files/upload-url').loginAs(owner).withCsrfToken().headers(json).json({
          originalName: 'cube.stl',
          contentType: 'application/octet-stream',
          sizeBytes: 684,
        })
      ).body().storageKey as string
    const register = (as: typeof owner, storageKey: string, sizeBytes = 684, sha256 = SHA) =>
      client
        .post('/files/register')
        .loginAs(as)
        .withCsrfToken()
        .headers(json)
        .json({ originalName: 'cube.stl', sizeBytes, sha256, storageKey, format: 'STL' })

    // someone else's object, or any key the server never handed out
    ;(await register(owner, 'product-images/photos/1/1.jpg')).assertStatus(400)
    const key = await issue()
    ;(await register(stranger, key)).assertStatus(400)
    ;(await register(owner, key, 999)).assertStatus(400)
    assert.equal(
      await ModelFile.query()
        .where('storageKey', key)
        .count('* as n')
        .first()
        .then((r) => Number(r!.$extras.n)),
      0
    )

    const ok = await register(owner, key)
    ok.assertStatus(200)
    assert.equal((await ModelFile.findOrFail(ok.body().file.id)).storageKey, key)
    // single use
    ;(await register(owner, key, 684, 'b'.repeat(64))).assertStatus(400)
  })

  test('the signed URL really takes the upload on live storage, and only at the signed size', async ({
    client,
    assert,
  }) => {
    if (!(await storageUp())) return
    const user = await member()
    const body = Buffer.alloc(684, 7)
    const { storageKey, signedUrl } = (
      await client.post('/files/upload-url').loginAs(user).withCsrfToken().headers(json).json({
        originalName: 'cube.stl',
        contentType: 'application/octet-stream',
        sizeBytes: body.length,
      })
    ).body()
    try {
      const wrong = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: Buffer.alloc(2000, 7),
      })
      assert.isFalse(wrong.ok, 'a different size is refused')
      const put = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body,
      })
      assert.isTrue(put.ok, `upload status ${put.status}`)
      assert.isTrue(await drive.use('s3').exists(storageKey))
    } finally {
      await drive
        .use('s3')
        .delete(storageKey)
        .catch(() => {})
    }
  })

  test('QC photo uploads are signed for PUT too', async ({ assert }) => {
    const { order, profile } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'in_production',
    })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    const { signedUrl } = await new QcPhotoService().presignUpload(job.id, profile.id, 'image/jpeg')
    assert.equal(new URL(signedUrl).searchParams.get('x-id'), 'PutObject')
  })
})
