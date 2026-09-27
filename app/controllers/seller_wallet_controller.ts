import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PaymentService, {
  MAX_TOP_UP_MINOR,
  MIN_TOP_UP_MINOR,
} from '#services/payments/payment_service'
import { paymentProvider } from '#services/payments/provider_registry'
import { salesModel } from '#services/payments/sales_model'
import WalletService from '#services/payments/wallet_service'

const topUpValidator = vine.create({
  amountMinor: vine.number().withoutDecimals().min(MIN_TOP_UP_MINOR).max(MAX_TOP_UP_MINOR),
  identityNumber: vine.string().trim().maxLength(20).optional(),
  phone: vine.string().trim().maxLength(32).optional(),
  billing: vine
    .object({
      fullName: vine.string().trim().minLength(2).maxLength(120),
      line1: vine.string().trim().minLength(3).maxLength(200),
      city: vine.string().trim().minLength(2).maxLength(80),
      postalCode: vine.string().trim().maxLength(16),
      country: vine.string().trim().toUpperCase().fixedLength(2),
    })
    .optional(),
})

const autoPayValidator = vine.create({ on: vine.boolean() })

/** /seller/wallet: prepaid balance that pays orders from the seller's own shop (R4-T2). */
export default class SellerWalletController {
  private wallets = new WalletService()

  async show({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const outcome = request.input('topup')
    return inertia.render('seller/wallet', {
      available: salesModel() === 'merchant_of_record',
      balanceMinor: await this.wallets.balance(user.id),
      autoPay: await this.wallets.autoPay(user.id),
      movements: await this.wallets.movements(user.id),
      needsBilling: paymentProvider().needsBuyerIdentity === true,
      minMinor: MIN_TOP_UP_MINOR,
      maxMinor: MAX_TOP_UP_MINOR,
      topUpReturn: (['paid', 'failed', 'pending'] as const).find((o) => o === outcome) ?? null,
    })
  }

  async topUp({ inertia, auth, request }: HttpContext) {
    const data = await request.validateUsing(topUpValidator)
    const { redirectUrl } = await new PaymentService().startTopUp(
      auth.getUserOrFail(),
      data.amountMinor,
      { identityNumber: data.identityNumber, phone: data.phone, ip: request.ip() },
      data.billing ?? null
    )
    return inertia.location(redirectUrl)
  }

  /** Balance back to the card(s) it came from. */
  async refund({ auth, response, session }: HttpContext) {
    const refunded = await new PaymentService().refundWalletBalance(auth.getUserOrFail().id)
    session.flash('success', `${(refunded / 100).toFixed(2)} TRY is on its way back to your card.`)
    return response.redirect().toPath('/seller/wallet')
  }

  async autoPay({ auth, request, response, session }: HttpContext) {
    const { on } = await request.validateUsing(autoPayValidator)
    await this.wallets.setAutoPay(auth.getUserOrFail().id, on)
    session.flash(
      'success',
      on ? 'Orders from your shop are paid from your balance.' : 'Automatic payment turned off.'
    )
    return response.redirect().toPath('/seller/wallet')
  }
}
