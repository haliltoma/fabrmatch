import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import DisputeEvidence from '#models/dispute_evidence'
import ProductionJob from '#models/production_job'
import DisputeService from '#services/disputes/dispute_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import QcPhotoService, { QcPhotoError } from '#services/manufacturing/qc_photo_service'
import { addQcPhoto, createFundedOrder, createManufacturer } from '#tests/helpers/order_fixtures'

const qc = new QcPhotoService()

test.group('QC photos (R2-T11)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('only the job’s maker can add photos, and only before shipping', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order, profile } = await createFundedOrder(provider, { upTo: 'in_production' })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    const stranger = await createManufacturer()

    await assert.rejects(
      () => qc.register(job.id, stranger.profile.id, `qc/${job.id}/a.jpg`),
      /not found/
    )
    await assert.rejects(
      () => qc.presignUpload(job.id, profile.id, 'image/gif'),
      /JPG, PNG or WebP/
    )
    await assert.rejects(() => qc.register(job.id, profile.id, 'somewhere/else.jpg'), QcPhotoError)

    await qc.register(job.id, profile.id, `qc/${job.id}/photo-1.jpg`)
    assert.equal(await qc.count(job.id), 1)

    job.status = 'shipped'
    await job.save()
    await assert.rejects(
      () => qc.register(job.id, profile.id, `qc/${job.id}/photo-2.jpg`),
      /before the job ships/
    )
  })

  test('the photo count is capped', async ({ assert }) => {
    const { order, profile } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'in_production',
    })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    for (let i = 0; i < 8; i++) await qc.register(job.id, profile.id, `qc/${job.id}/p${i}.jpg`)
    await assert.rejects(() => qc.register(job.id, profile.id, `qc/${job.id}/p9.jpg`), /At most 8/)
  })

  test('QC photos become the first evidence when a dispute opens', async ({ assert }) => {
    const { order, buyer, makerUser } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'delivered',
    })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    const photo = await addQcPhoto(job.id)

    const dispute = await new DisputeService().open(order.id, buyer.id, 'It arrived broken in two')
    const evidence = await DisputeEvidence.query().where('disputeId', dispute.id)
    assert.lengthOf(evidence, 1)
    assert.equal(evidence[0].storageKey, photo.storageKey)
    assert.equal(evidence[0].uploaderId, makerUser.id)
    assert.match(evidence[0].note ?? '', /before shipping/)
  })
})
