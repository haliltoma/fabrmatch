import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import QueueMonitorService from '#services/admin/queue_monitor_service'

const runAgainValidator = vine.create({
  jobId: vine.string().trim().maxLength(80),
  queue: vine.string().trim().maxLength(40).optional(),
})

export default class AdminQueueMonitorController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/jobs/index', await new QueueMonitorService().overview())
  }

  async runAgain({ request, response, session }: HttpContext) {
    const { jobId, queue } = await request.validateUsing(runAgainValidator)
    await new QueueMonitorService().runAgain(jobId, queue)
    session.flash('success', 'Job queued again.')
    return response.redirect().toPath('/admin/jobs')
  }
}
