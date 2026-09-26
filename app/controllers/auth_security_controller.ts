import type { HttpContext } from '@adonisjs/core/http'
import LandingService from '#services/identity/landing_service'
import AuthSecurityService from '#services/identity/auth_security_service'
import {
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
} from '#validators/auth_security'
import limiter from '@adonisjs/limiter/services/main'

export default class AuthSecurityController {
  // Email verification
  async verifyEmail({ request, response, session, auth }: HttpContext) {
    const { token } = await request.validateUsing(verifyEmailValidator)
    const service = new AuthSecurityService()

    const user = await service.verifyEmail(token)
    if (!user) {
      session.flash('error', 'Invalid or expired verification link.')
      return response.redirect().toPath('/login')
    }

    session.flash('success', 'Email verified successfully!')
    // signed in (usually, the link opens in the same browser): straight on to the next step
    if (auth.user?.id === user.id) {
      return response.redirect().toPath(await new LandingService().homeFor(user))
    }
    return response.redirect().toPath('/login')
  }

  async resendVerification({ auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()

    // Rate limit: 3 per hour
    const throttle = limiter.use({
      requests: 3,
      duration: '1 hour',
      blockDuration: '1 hour',
    })
    await throttle.consume(`resend-verification:${user.id}`)

    const service = new AuthSecurityService()
    await service.sendVerificationEmail(user)

    session.flash('success', 'Verification email sent.')
    return response.redirect().back()
  }

  // Forgot password
  async showForgotPassword({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async sendResetLink({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    // Rate limit: 5 per hour per IP
    const throttle = limiter.use({
      requests: 5,
      duration: '1 hour',
      blockDuration: '1 hour',
    })
    await throttle.consume(`password-reset:${request.ip()}`)

    const service = new AuthSecurityService()
    await service.sendPasswordReset(email)

    // Always show success to prevent email enumeration
    session.flash('success', 'If an account exists with that email, a reset link has been sent.')
    return response.redirect().back()
  }

  // Reset password
  async showResetPassword({ request, inertia }: HttpContext) {
    const token = request.input('token', '')
    return inertia.render('auth/reset_password', { token })
  }

  async resetPassword({ request, response, session }: HttpContext) {
    const { token, password } = await request.validateUsing(resetPasswordValidator)

    const service = new AuthSecurityService()
    const success = await service.resetPassword(token, password)

    if (!success) {
      session.flash('error', 'Invalid or expired reset link.')
      return response.redirect().toPath('/forgot-password')
    }

    session.flash('success', 'Password reset successfully! Please log in.')
    return response.redirect().toPath('/login')
  }
}
