import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PrivacyService from '#services/identity/privacy_service'

const deleteValidator = vine.create({
  password: vine.string(),
  confirm: vine.literal('DELETE'),
})

export default class AccountPrivacyController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const privacy = new PrivacyService()
    return inertia.render('account/privacy', {
      blockers: await privacy.deletionBlockers(user),
      consents: await privacy.currentConsents(user.id),
    })
  }

  async export({ auth, response }: HttpContext) {
    const data = await new PrivacyService().export(auth.getUserOrFail())
    return response
      .header('content-type', 'application/json; charset=utf-8')
      .header('content-disposition', 'attachment; filename="fabrmatch-my-data.json"')
      .send(JSON.stringify(data, null, 2))
  }

  async destroy({ request, response, auth, session }: HttpContext) {
    const { password } = await request.validateUsing(deleteValidator)
    await new PrivacyService().deleteAccount(auth.getUserOrFail(), password)
    await auth.use('web').logout()
    session.flash('success', 'Your account was deleted.')
    return response.redirect().toPath('/')
  }
}
