import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import ModelFileService from '#services/files/model_file_service'
import { getUploadUrlValidator, registerFileValidator } from '#validators/model_file'
import { pageQueryValidator } from '#validators/order'

export default class ModelFileController {
  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { page } = await request.validateUsing(pageQueryValidator)
    const {
      rows: files,
      history,
      meta,
    } = await new ModelFileService().listForOwner(user.id, {
      page,
    })
    // W1: which of these already are the seller's products (the rest can still become one)
    const used =
      files.length === 0
        ? []
        : await db
            .from('catalog_products')
            .where('owner_user_id', user.id)
            .whereIn(
              'model_file_id',
              files.map((f) => f.id)
            )
            .select('model_file_id')
    const isProduct = new Set(used.map((r) => r.model_file_id as string))

    return inertia.render('files/index', {
      meta,
      files: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        format: f.format,
        sizeBytes: f.sizeBytes,
        analysisStatus: f.analysisStatus,
        blockedReason: f.blockedReason,
        isPrintable: f.isPrintable,
        volumeMm3: f.volumeMm3,
        bboxXMm: f.bboxXMm,
        bboxYMm: f.bboxYMm,
        bboxZMm: f.bboxZMm,
        triangleCount: f.triangleCount,
        revision: f.revision,
        isProduct: isProduct.has(f.id),
        olderVersions: history.get(f.id) ?? [],
        createdAt: f.createdAt.toISO() ?? '',
      })),
    })
  }

  async getUploadUrl({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(getUploadUrlValidator)
    const user = auth.getUserOrFail()

    const service = new ModelFileService()
    try {
      const result = await service.getUploadUrl(data.originalName, {
        userId: user.id,
        sizeBytes: data.sizeBytes,
      })
      return response.json(result)
    } catch (error) {
      return response.badRequest({ error: (error as Error).message })
    }
  }

  async register({ request, response, auth, session }: HttpContext) {
    const { replacesFileId, ...data } = await request.validateUsing(registerFileValidator)
    const user = auth.getUserOrFail()

    const service = new ModelFileService()
    try {
      const result = await service.registerUpload(user, data, replacesFileId)
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          file: {
            id: result.file.id,
            originalName: result.file.originalName,
            format: result.file.format,
            analysisStatus: result.file.analysisStatus,
            revision: result.file.revision,
          },
          isDuplicate: result.isDuplicate,
        })
      }
      session.flash(
        'success',
        result.isDuplicate
          ? 'File already exists.'
          : replacesFileId
            ? 'New version uploaded.'
            : 'File uploaded successfully.'
      )
      return response.redirect().toPath('/files')
    } catch (error) {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.badRequest({ error: (error as Error).message })
      }
      session.flash('error', (error as Error).message)
      return response.redirect().toPath('/files')
    }
  }

  async previewUrl({ response, auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const service = new ModelFileService()
    const file = await service.findByIdForOwner(params.id, user.id)

    if (!file) {
      return response.notFound({ error: 'File not found' })
    }

    const disk = drive.use('s3')
    const url = await disk.getSignedUrl(file.storageKey, {
      expiresIn: '15m',
      contentType: 'application/octet-stream',
      contentDisposition: 'attachment',
    })
    return response.json({ url })
  }
}
