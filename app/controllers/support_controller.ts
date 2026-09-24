import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import SupportService, { SUPPORT_TOPICS } from '#services/support/support_service'

const validator = vine.create({
  email: vine.string().trim().maxLength(254),
  topic: vine.enum(SUPPORT_TOPICS),
  orderCode: vine.string().trim().maxLength(20).optional(),
  message: vine.string().trim().maxLength(2000),
})

export const FAQ = [
  {
    q: 'When is my payment released to the maker?',
    a: 'Your payment is held while the part is made and delivered. After delivery you have 7 days to confirm or open a dispute; if you do nothing the order completes and the maker is paid. While a dispute is open nothing is paid out.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'Yes, in full, until a maker accepts the job. Once production has started open a dispute if there is a problem.',
  },
  {
    q: 'The part arrived damaged. What now?',
    a: 'Open a dispute from the order page within 7 days of delivery and add photos. We review both sides; the outcome can be a refund, a partial refund, a reprint by another maker, or release of the payment.',
  },
  {
    q: 'Who prints my part?',
    a: 'A verified maker chosen for fit, quality and fairness. Buyers and makers stay anonymous to each other; you can message them on the order page and contact details are hidden.',
  },
  {
    q: 'Is my model shared with anyone?',
    a: 'Only the maker of your job gets it, through a time-limited link. It is never shown publicly.',
  },
  {
    q: 'How do I become a maker?',
    a: 'Join the maker list on the For makers page. We open city by city and approve makers before they receive offers.',
  },
  {
    q: 'How is the price calculated?',
    a: 'From the model’s volume, the material, print time and shipping to your address. The quote page shows the breakdown before you order.',
  },
]

export default class SupportController {
  async help({ inertia, auth }: HttpContext) {
    return inertia.render('support/help', {
      faq: FAQ,
      topics: [...SUPPORT_TOPICS],
      email: auth.user?.email ?? '',
    })
  }

  async submit({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(validator)
    await new SupportService().submit({ userId: auth.user?.id ?? null, ...data })
    session.flash('success', 'Thanks — we have your message and will reply by e-mail.')
    return response.redirect().back()
  }
}
