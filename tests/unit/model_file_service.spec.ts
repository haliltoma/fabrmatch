import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ModelFileService from '#services/files/model_file_service'
import User from '#models/user'

test.group('ModelFileService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function createUser() {
    return User.create({
      fullName: 'Test User',
      email: `user-${Date.now()}@test.com`,
      password: 'password123',
    })
  }

  test('rejects unsupported file format', async ({ assert }) => {
    const service = new ModelFileService()
    await assert.rejects(() => service.getUploadUrl('model.fbx'), /Unsupported file format/)
  })

  test('accepts STL format', async ({ assert }) => {
    const service = new ModelFileService()
    // getUploadUrl requires S3/R2 configured, so we test the format validation indirectly
    // by checking that STL extension is allowed in the service
    try {
      await service.getUploadUrl('model.stl')
    } catch (error) {
      // If it fails, it should NOT be about format — only about S3 config
      assert.notMatch((error as Error).message, /Unsupported file format/)
    }
  })

  test('registers file and returns record', async ({ assert }) => {
    const user = await createUser()
    const service = new ModelFileService()

    const sha256 = 'a'.repeat(64)
    const result = await service.register(user, {
      originalName: 'cube.stl',
      sizeBytes: 1024,
      sha256,
      storageKey: `models/test-${Date.now()}.stl`,
      format: 'STL',
    })

    assert.isFalse(result.isDuplicate)
    assert.equal(result.file.originalName, 'cube.stl')
    assert.equal(result.file.format, 'STL')
    assert.equal(result.file.sizeBytes, 1024)
    assert.equal(result.file.analysisStatus, 'pending')
    assert.equal(result.file.ownerId, user.id)
  })

  test('deduplicates by sha256 per owner', async ({ assert }) => {
    const user = await createUser()
    const service = new ModelFileService()
    const sha256 = 'b'.repeat(64)

    const first = await service.register(user, {
      originalName: 'cube.stl',
      sizeBytes: 1024,
      sha256,
      storageKey: `models/test-first-${Date.now()}.stl`,
      format: 'STL',
    })

    const second = await service.register(user, {
      originalName: 'cube_copy.stl',
      sizeBytes: 1024,
      sha256,
      storageKey: `models/test-second-${Date.now()}.stl`,
      format: 'STL',
    })

    assert.isFalse(first.isDuplicate)
    assert.isTrue(second.isDuplicate)
    assert.equal(first.file.id, second.file.id)
  })

  test('same sha256 different owners creates separate records', async ({ assert }) => {
    const user1 = await createUser()
    const user2 = await User.create({
      fullName: 'Other User',
      email: `other-${Date.now()}@test.com`,
      password: 'password123',
    })

    const service = new ModelFileService()
    const sha256 = 'c'.repeat(64)

    const r1 = await service.register(user1, {
      originalName: 'part.stl',
      sizeBytes: 2048,
      sha256,
      storageKey: `models/owner1-${Date.now()}.stl`,
      format: 'STL',
    })

    const r2 = await service.register(user2, {
      originalName: 'part.stl',
      sizeBytes: 2048,
      sha256,
      storageKey: `models/owner2-${Date.now()}.stl`,
      format: 'STL',
    })

    assert.isFalse(r1.isDuplicate)
    assert.isFalse(r2.isDuplicate)
    assert.notEqual(r1.file.id, r2.file.id)
  })

  test('rejects file exceeding max size', async ({ assert }) => {
    const user = await createUser()
    const service = new ModelFileService()

    await assert.rejects(
      () =>
        service.register(user, {
          originalName: 'huge.stl',
          sizeBytes: 201 * 1024 * 1024,
          sha256: 'd'.repeat(64),
          storageKey: `models/huge-${Date.now()}.stl`,
          format: 'STL',
        }),
      /File too large/
    )
  })

  test('listForOwner returns only own files', async ({ assert }) => {
    const user1 = await createUser()
    const user2 = await User.create({
      fullName: 'Other',
      email: `other2-${Date.now()}@test.com`,
      password: 'password123',
    })

    const service = new ModelFileService()

    await service.register(user1, {
      originalName: 'mine.stl',
      sizeBytes: 512,
      sha256: 'e'.repeat(64),
      storageKey: `models/mine-${Date.now()}.stl`,
      format: 'STL',
    })

    await service.register(user2, {
      originalName: 'theirs.obj',
      sizeBytes: 512,
      sha256: 'f'.repeat(64),
      storageKey: `models/theirs-${Date.now()}.obj`,
      format: 'OBJ',
    })

    const { rows: myFiles, meta } = await service.listForOwner(user1.id)
    assert.lengthOf(myFiles, 1)
    assert.equal(myFiles[0].originalName, 'mine.stl')
    assert.equal(meta.total, 1)
  })
})
