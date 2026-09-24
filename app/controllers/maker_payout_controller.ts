import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'
import AuditLog from '#models/audit_log'
import EncryptionService from '#services/identity/encryption_service'
import { isValidIban, maskIban, normalizeIban } from '#services/identity/iban'
import DomainError from '#exceptions/domain_error'

const ibanValidator = vine.create({
  iban: vine.string().trim().minLength(15).maxLength(42),
  password: vine.string().minLength(1),
})

class PayoutDetailsError extends DomainError {}

export default class MakerPayoutController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const encryption = new EncryptionService()
    const stored = user.manufacturerProfile.ibanEnc
    return inertia.render('maker/payout', {
      masked: stored ? maskIban(encryption.decrypt(stored)) : null,
    })
  }

  /** Changing where money goes needs the password again: a hijacked session must not redirect payouts. */
  async save({ request, response, auth, session }: HttpContext) {
    const { iban, password } = await request.validateUsing(ibanValidator)
    const user = auth.getUserOrFail()
    if (!(await hash.verify(user.password, password))) {
      throw new PayoutDetailsError('That password is not correct')
    }
    if (!isValidIban(iban)) {
      throw new PayoutDetailsError('That IBAN does not look right. Check it and try again.')
    }
    await user.load('manufacturerProfile')
    const profile = user.manufacturerProfile
    profile.ibanEnc = new EncryptionService().encrypt(normalizeIban(iban))
    await profile.save()
    await AuditLog.create({
      actorId: user.id,
      action: 'maker.iban_changed',
      subjectType: 'manufacturer_profile',
      subjectId: profile.id,
      meta: {},
    })
    session.flash('success', 'Payout account saved.')
    return response.redirect().toPath('/maker/payout')
  }
}
