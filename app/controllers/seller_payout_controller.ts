import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'
import { readFile } from 'node:fs/promises'
import fabrmatchConfig from '#config/fabrmatch'
import DomainError from '#exceptions/domain_error'
import PayeeProfileService, { type PayeeType } from '#services/payments/payee/payee_profile_service'
import PayoutDocumentService from '#services/payments/payee/payout_document_service'
import { PAYEE_TAX_STATUSES } from '#services/payments/payee/tax_treatment'
import { companyDetails, salesModel } from '#services/payments/sales_model'
import PayeeTaxProfileTransformer from '#transformers/payee_tax_profile_transformer'
import PayoutTransformer from '#transformers/payout_transformer'

const profileValidator = vine.create({
  taxStatus: vine.enum(PAYEE_TAX_STATUSES),
  legalName: vine.string().trim().minLength(3).maxLength(200),
  taxNumber: vine.string().trim().minLength(10).maxLength(14),
  taxOffice: vine.string().trim().minLength(2).maxLength(120),
  address: vine.string().trim().minLength(10).maxLength(500),
  iban: vine.string().trim().minLength(15).maxLength(42),
  password: vine.string().minLength(1),
})

const invoiceValidator = vine.create({
  number: vine.string().trim().minLength(3).maxLength(64),
  issuedOn: vine.date({ formats: ['YYYY-MM-DD'] }),
  grossMinor: vine.number().withoutDecimals().min(0),
  vatMinor: vine.number().withoutDecimals().min(0),
})

class PayoutPageError extends DomainError {}

/**
 * Seller door: /seller/payout. Tax and bank details (R7-T3), invoices to Fabrmatch and expense
 * vouchers (R7-T4). The maker door is the subclass MakerPayoutController.
 */
export default class SellerPayoutController {
  protected payeeType: PayeeType = 'seller'
  protected basePath = '/seller/payout'
  protected page: 'seller/payout' | 'maker/payout' = 'seller/payout'

  private payees = new PayeeProfileService()
  private documents = new PayoutDocumentService()

  async show({ inertia, auth }: HttpContext) {
    const payee = await this.payees.payeeOf(auth.getUserOrFail(), this.payeeType)
    const profile = await this.payees.find(payee)
    const resolver = app.container.createResolver()
    return inertia.render(this.page, {
      basePath: this.basePath,
      salesModel: salesModel(),
      company: companyDetails(),
      homeExemptWithholdingBps: fabrmatchConfig.payouts.homeExemptWithholdingBps,
      profile: profile
        ? await PayeeTaxProfileTransformer.transform(profile).resolve(resolver, 0)
        : null,
      awaiting: await PayoutTransformer.transform(await this.documents.awaiting(payee)).resolve(
        resolver,
        0
      ),
      history: await PayoutTransformer.transform(await this.documents.history(payee)).resolve(
        resolver,
        0
      ),
    })
  }

  /** New or changed details: password again, then back to an admin before any money moves. */
  async save({ request, response, auth, session }: HttpContext) {
    const { password, ...input } = await request.validateUsing(profileValidator)
    const user = auth.getUserOrFail()
    if (!(await hash.verify(user.password, password))) {
      throw new PayoutPageError('That password is not correct')
    }
    const file = request.file('document', { size: '5mb' })
    if (file && !file.isValid) throw new PayoutPageError('The file can be at most 5 MB')
    const bytes = file?.tmpPath ? await readFile(file.tmpPath) : null
    const payee = await this.payees.payeeOf(user, this.payeeType)
    await this.payees.submit(user, payee, input, bytes)
    session.flash('success', 'Saved. An admin checks your details before the next payout.')
    return response.redirect().toPath(this.basePath)
  }

  async invoice({ request, response, auth, session, params }: HttpContext) {
    const data = await request.validateUsing(invoiceValidator)
    const file = request.file('invoice', { size: '5mb' })
    if (!file?.tmpPath || !file.isValid) {
      throw new PayoutPageError('Attach the invoice as a PDF, PNG or JPEG (at most 5 MB)')
    }
    const user = auth.getUserOrFail()
    const payee = await this.payees.payeeOf(user, this.payeeType)
    await this.documents.submitInvoice(
      user.id,
      payee,
      Number(params.id),
      data,
      await readFile(file.tmpPath)
    )
    session.flash('success', 'Invoice sent. We check it and add the payout to the next transfer.')
    return response.redirect().toPath(this.basePath)
  }

  /** Printable expense voucher we issued for this payee (home producers). */
  async voucher({ auth, params, response }: HttpContext) {
    const payee = await this.payees.payeeOf(auth.getUserOrFail(), this.payeeType)
    const html = await this.documents.voucherHtml(Number(params.id), payee)
    if (!html) return response.notFound()
    return response.header('content-type', 'text/html; charset=utf-8').send(html)
  }
}
