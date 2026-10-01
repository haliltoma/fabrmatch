import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import CouponService from '#services/pricing/coupon_service'
import { couponValidator } from '#validators/coupon'

const toMinor = (major: number) => Math.round(major * 100)

export default class AdminCouponController {
  async index({ inertia }: HttpContext) {
    const rows = await new CouponService().list()
    return inertia.render('admin/coupons/index', {
      coupons: rows.map(({ coupon: c, used }) => ({
        id: c.id,
        code: c.code,
        kind: c.kind,
        value: c.value,
        minOrderMinor: c.minOrderMinor,
        maxDiscountMinor: c.maxDiscountMinor,
        maxRedemptions: c.maxRedemptions,
        perUserLimit: c.perUserLimit,
        firstOrderOnly: c.firstOrderOnly,
        endsAt: c.endsAt?.toISO() ?? null,
        isActive: c.isActive,
        note: c.note,
        used,
      })),
    })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(couponValidator)
    const coupon = await new CouponService().create({
      code: data.code,
      kind: data.kind,
      value: data.kind === 'percent' ? Math.round(data.value * 100) : toMinor(data.value),
      minOrderMinor: data.minOrder ? toMinor(data.minOrder) : 0,
      maxDiscountMinor: data.maxDiscount ? toMinor(data.maxDiscount) : null,
      maxRedemptions: data.maxRedemptions ?? null,
      perUserLimit: data.perUserLimit ?? 1,
      firstOrderOnly: data.firstOrderOnly ?? false,
      endsAt: data.endsAt ? data.endsAt.endOf('day') : null,
      note: data.note ?? null,
    })
    await AuditLog.create({
      actorId: auth.getUserOrFail().id,
      action: 'coupon.created',
      subjectType: 'coupon',
      subjectId: coupon.id,
      meta: { code: coupon.code, kind: coupon.kind, value: coupon.value },
    })
    session.flash('success', 'Coupon created.')
    return response.redirect().toPath('/admin/coupons')
  }

  async toggle({ params, request, response, session, auth }: HttpContext) {
    const active = request.input('active') === true || request.input('active') === 'true'
    await new CouponService().setActive(params.id, active)
    await AuditLog.create({
      actorId: auth.getUserOrFail().id,
      action: active ? 'coupon.activated' : 'coupon.deactivated',
      subjectType: 'coupon',
      subjectId: params.id,
      meta: {},
    })
    session.flash('success', active ? 'Coupon turned on.' : 'Coupon turned off.')
    return response.redirect().toPath('/admin/coupons')
  }
}
