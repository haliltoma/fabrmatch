import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import fabrmatchConfig from '#config/fabrmatch'
import RoleService from '#services/identity/role_service'
import TwoFactorService from '#services/identity/two_factor_service'
import UserSessionService from '#services/identity/user_session_service'
import {
  changePasswordValidator,
  codeValidator,
  disableTwoFactorValidator,
} from '#validators/account_security'

const PENDING_SECRET = 'twoFactorSetupSecret'
const BACK = '/account/security'

export default class AccountSecurityController {
  async show({ inertia, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const twoFactor = new TwoFactorService()
    const enabled = twoFactor.isEnabled(user)
    const roles = await new RoleService().getUserRoles(user)

    const pendingSecret = enabled ? undefined : (session.get(PENDING_SECRET) as string | undefined)
    const currentSid = session.get('sid') as string | undefined
    const sessions = await new UserSessionService().list(user.id)

    return inertia.render('account/security', {
      twoFactor: {
        enabled,
        required: fabrmatchConfig.security.requireAdminTwoFactor && roles.includes('admin'),
        backupCodesRemaining: enabled ? await twoFactor.backupCodesRemaining(user.id) : 0,
        setup: pendingSecret
          ? { secret: pendingSecret, uri: twoFactor.startSetupUri(user, pendingSecret) }
          : null,
      },
      newBackupCodes: (session.flashMessages.get('backupCodes') as string[] | undefined) ?? null,
      sessions: sessions.map((s) => ({ ...s, current: s.id === currentSid })),
    })
  }

  async startTwoFactor({ auth, session, response }: HttpContext) {
    const { secret } = new TwoFactorService().startSetup(auth.getUserOrFail())
    session.put(PENDING_SECRET, secret)
    return response.redirect().toPath(BACK)
  }

  async enableTwoFactor({ auth, request, session, response }: HttpContext) {
    const { code } = await request.validateUsing(codeValidator)
    const secret = session.get(PENDING_SECRET) as string | undefined
    if (!secret) {
      session.flash('error', 'Start the setup again.')
      return response.redirect().toPath(BACK)
    }
    const codes = await new TwoFactorService().enable(auth.getUserOrFail(), secret, code)
    session.forget(PENDING_SECRET)
    session.flash('backupCodes', codes)
    session.flash('success', 'Two-factor authentication is on.')
    return response.redirect().toPath(BACK)
  }

  async disableTwoFactor({ auth, request, session, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const roles = await new RoleService().getUserRoles(user)
    if (fabrmatchConfig.security.requireAdminTwoFactor && roles.includes('admin')) {
      session.flash('error', 'Admins cannot turn off two-factor authentication.')
      return response.redirect().toPath(BACK)
    }
    const { password, code } = await request.validateUsing(disableTwoFactorValidator)
    await new TwoFactorService().disable(user, password, code)
    session.flash('success', 'Two-factor authentication is off.')
    return response.redirect().toPath(BACK)
  }

  async regenerateBackupCodes({ auth, request, session, response }: HttpContext) {
    const { code } = await request.validateUsing(codeValidator)
    const codes = await new TwoFactorService().regenerateBackupCodes(auth.getUserOrFail(), code)
    session.flash('backupCodes', codes)
    session.flash('success', 'New backup codes generated. The old ones no longer work.')
    return response.redirect().toPath(BACK)
  }

  async changePassword({ auth, request, session, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)
    if (!(await hash.verify(user.password, currentPassword))) {
      session.flash('error', 'Your current password is not correct.')
      return response.redirect().toPath(BACK)
    }
    user.password = password
    await user.save()
    const ended = await new UserSessionService().revokeAll(
      user.id,
      (session.get('sid') as string | undefined) ?? null
    )
    session.flash(
      'success',
      ended > 0
        ? `Password changed. ${ended} other session${ended > 1 ? 's were' : ' was'} signed out.`
        : 'Password changed.'
    )
    return response.redirect().toPath(BACK)
  }

  async revokeSession({ auth, params, session, response }: HttpContext) {
    const sid = session.get('sid') as string | undefined
    if (params.id === sid) {
      session.flash('error', 'Use “Log out” to end this session.')
      return response.redirect().toPath(BACK)
    }
    await new UserSessionService().revoke(auth.getUserOrFail().id, params.id)
    session.flash('success', 'Session signed out.')
    return response.redirect().toPath(BACK)
  }

  async revokeOthers({ auth, session, response }: HttpContext) {
    const ended = await new UserSessionService().revokeAll(
      auth.getUserOrFail().id,
      (session.get('sid') as string | undefined) ?? null
    )
    session.flash('success', ended > 0 ? 'Signed out everywhere else.' : 'No other sessions.')
    return response.redirect().toPath(BACK)
  }
}
