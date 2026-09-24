import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import SettingsService from '#services/settings/settings_service'
import { SETTING_KEYS } from '#services/settings/definitions'

const updateValidator = vine.create({
  key: vine.enum(SETTING_KEYS),
  value: vine.number(),
})

const resetValidator = vine.create({ key: vine.enum(SETTING_KEYS) })

export default class AdminSettingsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/settings/index', { settings: await new SettingsService().list() })
  }

  async update({ request, response, session, auth }: HttpContext) {
    const { key, value } = await request.validateUsing(updateValidator)
    await new SettingsService().set(key, value, auth.getUserOrFail().id)
    session.flash('success', 'Setting saved.')
    return response.redirect().toPath('/admin/settings')
  }

  async reset({ request, response, session, auth }: HttpContext) {
    const { key } = await request.validateUsing(resetValidator)
    await new SettingsService().reset(key, auth.getUserOrFail().id)
    session.flash('success', 'Setting reset to default.')
    return response.redirect().toPath('/admin/settings')
  }
}
