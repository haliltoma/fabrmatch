import { BaseMail } from '@adonisjs/mail'

export interface NotificationMailData {
  to: string
  locale?: 'en' | 'tr'
  title: string
  body: string
  url: string
  preferencesUrl: string
}

/** One branded template for every notification e-mail (resources/views/emails/notification.edge). */
export default class NotificationMail extends BaseMail {
  constructor(private data: NotificationMailData) {
    super()
  }

  prepare() {
    this.message
      .to(this.data.to)
      .subject(`${this.data.title} — Fabrmatch`)
      .htmlView('emails/notification', {
        title: this.data.title,
        body: this.data.body,
        url: this.data.url,
        preferencesUrl: this.data.preferencesUrl,
        tr: this.data.locale === 'tr',
      })
  }
}
