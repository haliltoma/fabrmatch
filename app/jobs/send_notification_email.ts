import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import NotificationService from '#services/notifications/notification_service'

/** Thin wrapper: the logic (idempotent, preference-aware) lives in `NotificationService.sendEmail`. */
export default class SendNotificationEmail extends Job<{ notificationId: number }> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    await new NotificationService().sendEmail(this.payload.notificationId)
  }
}
