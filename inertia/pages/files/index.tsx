import { useState, useCallback, lazy, Suspense } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import {
  Upload,
  FileBox,
  Loader2,
  Eye,
  Calculator,
  ShieldAlert,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'
import { usePollWhile } from '~/lib/poll'
import { formatDate, formatNumber } from '~/lib/format'
import { SkeletonModel } from '~/components/ui/skeleton'

const StlViewer = lazy(() => import('~/components/stl_viewer'))

type FileData = {
  id: string
  originalName: string
  format: string
  sizeBytes: number
  analysisStatus: string
  blockedReason: string | null
  isPrintable: boolean | null
  isProduct: boolean
  volumeMm3: number | null
  bboxXMm: number | null
  bboxYMm: number | null
  bboxZMm: number | null
  triangleCount: number | null
  revision: number
  olderVersions: Array<{ id: string; revision: number; createdAt: string }>
  createdAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status, blocked }: { status: string; blocked: boolean }) {
  const { t } = useT()
  if (blocked) {
    return (
      <Badge className="gap-1 bg-danger-soft text-danger">
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> {t('Blocked by the security scan')}
      </Badge>
    )
  }
  if (status === 'pending' || status === 'processing') {
    return (
      <Badge className="gap-1 bg-amber-soft text-amber-ink">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {t('Scanning for viruses…')}
      </Badge>
    )
  }
  if (status === 'done') {
    return (
      <Badge className="gap-1 bg-fil-100 text-fil-700">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t('Virus scan passed')}
      </Badge>
    )
  }
  return <Badge className="bg-danger-soft text-danger">{t('Analysis failed')}</Badge>
}

function PreviewButton({ fileId, format }: { fileId: string; format: string }) {
  const { t } = useT()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (format !== 'STL') return null

  const loadPreview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/files/${fileId}/preview-url`)
      if (res.ok) {
        const data = await res.json()
        setPreviewUrl(data.url)
      }
    } finally {
      setLoading(false)
    }
  }

  if (previewUrl) {
    return (
      <div className="mt-3">
        <Suspense fallback={<SkeletonModel className="h-64" />}>
          <StlViewer url={previewUrl} className="h-64" />
        </Suspense>
        <Button variant="ghost" size="sm" className="mt-1" onClick={() => setPreviewUrl(null)}>
          {t('Hide preview')}
        </Button>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="sm" className="mt-2" onClick={loadPreview} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Eye className="mr-1 h-3 w-3" />
      )}
      {t('3D Preview')}
    </Button>
  )
}

function UploadDialog({
  onClose,
  replaces,
}: {
  onClose: () => void
  replaces: { id: string; name: string } | null
}) {
  const { t } = useT()

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setError(null)

      try {
        setProgress('Getting upload URL...')
        const urlResponse = await fetch('/files/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN':
              document.cookie
                .split('; ')
                .find((c) => c.startsWith('XSRF-TOKEN='))
                ?.split('=')[1]
                ?.replace(/%3D/g, '=') || '',
          },
          body: JSON.stringify({
            originalName: file.name,
            contentType: 'application/octet-stream',
            sizeBytes: file.size,
          }),
        })

        if (!urlResponse.ok) {
          const err = await urlResponse.json()
          throw new Error(err.error || 'Failed to get upload URL')
        }

        const { storageKey, signedUrl } = await urlResponse.json()

        setProgress('Computing checksum...')
        const buffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
        const sha256 = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        setProgress('Uploading file...')
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': 'application/octet-stream' },
        })

        if (!uploadResponse.ok) {
          throw new Error('Upload to storage failed')
        }

        setProgress('Registering file...')
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
        const formatMap: Record<string, string> = {
          '.stl': 'STL',
          '.3mf': '3MF',
          '.obj': 'OBJ',
        }

        const registerResponse = await fetch('/files/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN':
              document.cookie
                .split('; ')
                .find((c) => c.startsWith('XSRF-TOKEN='))
                ?.split('=')[1]
                ?.replace(/%3D/g, '=') || '',
          },
          body: JSON.stringify({
            originalName: file.name,
            sizeBytes: file.size,
            sha256,
            storageKey,
            format: formatMap[ext] || 'STL',
            replacesFileId: replaces?.id,
          }),
        })

        if (!registerResponse.ok) {
          const err = await registerResponse.json()
          throw new Error(err.error || 'Failed to register file')
        }

        onClose()
        router.reload()
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setUploading(false)
        setProgress('')
      }
    },
    [onClose, replaces]
  )

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{replaces ? t('Upload a new version') : t('Upload 3D Model')}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {replaces && (
          <p className="text-sm text-ink-800">
            {t('This replaces')} <strong>{replaces.name}</strong>{' '}
            {t(
              'in your list. The old version stays available, and orders already placed keep using it.'
            )}
          </p>
        )}
        <p className="text-sm text-ink-600">
          {t('Supported formats: STL, 3MF, OBJ. Max size: 200 MB.')}
        </p>
        <p className="flex items-start gap-2 text-sm text-ink-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-fil-700" aria-hidden />
          {t(
            'Every file is scanned for viruses and hidden code before anyone can open it. Files that fail are quarantined.'
          )}
        </p>

        {error && (
          <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">{t(error)}</div>
        )}

        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t(progress)}
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-ink-900/25 p-8 transition hover:border-heat-500 hover:bg-paper-sunken">
            <Upload className="h-8 w-8 text-ink-600" />
            <span className="text-sm font-medium text-ink-700">{t('Click to select a file')}</span>
            <input
              type="file"
              accept=".stl,.3mf,.obj"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </label>
        )}
      </div>
    </DialogContent>
  )
}

function FilesIndex({ files, meta }: { files: FileData[]; meta: PageMeta }) {
  const { t } = useT()

  const { hasShop } = usePage<{ hasShop?: boolean }>().props
  const [showUpload, setShowUpload] = useState(false)
  const scanning = files.some(
    (f) => f.analysisStatus === 'pending' || f.analysisStatus === 'processing'
  )

  // the scan runs in the background: refresh the list until every file has a verdict, slowing
  // down and then stopping, so a stuck scan does not turn into a request every few seconds forever
  const poll = usePollWhile(scanning, () => router.reload({ only: ['files'] }))
  const [replaces, setReplaces] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Dialog
        open={showUpload}
        onOpenChange={(open) => {
          setShowUpload(open)
          if (!open) setReplaces(null)
        }}
      >
        <PageHeader
          title={t('My 3D models')}
          description={
            files.length === 0
              ? t('Upload an STL, 3MF or OBJ to get a price.')
              : `${files.length} model${files.length > 1 ? 's' : ''}, analysed and ready to quote.`
          }
          action={
            <Button onClick={() => setShowUpload(true)}>
              <Upload /> {t('Upload model')}
            </Button>
          }
        />
        <UploadDialog
          replaces={replaces}
          onClose={() => {
            setShowUpload(false)
            setReplaces(null)
          }}
        />
      </Dialog>

      {poll.gaveUp && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink"
        >
          <span>
            {t(
              'The check is taking longer than usual. You can leave this page; the result will be here.'
            )}
          </span>
          <Button size="sm" variant="outline" onClick={poll.retry}>
            {t('Check again')}
          </Button>
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState
          icon={FileBox}
          title={t('No models yet')}
          description={t(
            'Drop in a model file and we measure its volume and size, check it can be printed, and show you a price.'
          )}
          action={
            <Button onClick={() => setShowUpload(true)}>
              <Upload /> {t('Upload your first model')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {files.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{f.originalName}</CardTitle>
                  <div className="flex items-center gap-2">
                    {f.revision > 1 && <Badge variant="outline">v{f.revision}</Badge>}
                    <Badge variant="outline">{f.format}</Badge>
                    <StatusBadge status={f.analysisStatus} blocked={f.blockedReason !== null} />
                    {f.isPrintable !== null && (
                      <Badge
                        className={
                          f.isPrintable ? 'bg-fil-100 text-fil-700' : 'bg-danger-soft text-danger'
                        }
                      >
                        {f.isPrintable ? t('Printable') : t('Not printable')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {f.blockedReason && (
                  <p className="mb-2 rounded-md bg-danger-soft p-2 text-sm text-danger">
                    {t(f.blockedReason)}{' '}
                    {t('The file was quarantined and can never be downloaded or printed.')}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-ink-600">
                  <span>{formatBytes(f.sizeBytes)}</span>
                  {f.volumeMm3 !== null && (
                    <span>{t('Vol: {v2} mm³', { v2: f.volumeMm3.toFixed(1) })}</span>
                  )}
                  {f.bboxXMm !== null && f.bboxYMm !== null && f.bboxZMm !== null && (
                    <span>
                      {t('BBox: {v2} x {v4} x {v6} mm', {
                        v2: f.bboxXMm.toFixed(1),
                        v4: f.bboxYMm.toFixed(1),
                        v6: f.bboxZMm.toFixed(1),
                      })}
                    </span>
                  )}
                  {f.triangleCount !== null && (
                    <span>{t('{v1} triangles', { v1: formatNumber(f.triangleCount) })}</span>
                  )}
                  <span>{formatDate(f.createdAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PreviewButton fileId={f.id} format={f.format} />
                  {/* W1: the Printify step, from a checked model straight to a product */}
                  {hasShop && f.analysisStatus === 'done' && f.isPrintable && !f.isProduct && (
                    <Link href={`/seller/products?design=${f.id}`}>
                      <Button variant="ghost" size="sm">
                        <Store className="mr-1 h-3 w-3" />
                        {t('Sell it')}
                      </Button>
                    </Link>
                  )}
                  {f.analysisStatus === 'done' && f.volumeMm3 !== null && (
                    <Link href={`/files/${f.id}/quote`}>
                      <Button variant="ghost" size="sm">
                        <Calculator className="mr-1 h-3 w-3" />
                        {t('Get Quote')}
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplaces({ id: f.id, name: f.originalName })
                      setShowUpload(true)
                    }}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    {t('New version')}
                  </Button>
                </div>
                {f.olderVersions.length > 0 && (
                  <details className="mt-2 text-sm text-ink-700">
                    <summary className="cursor-pointer">
                      {f.olderVersions.length > 1
                        ? t('{count} earlier versions', { count: f.olderVersions.length })
                        : t('{count} earlier version', { count: f.olderVersions.length })}
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {f.olderVersions.map((v) => (
                        <li key={v.id}>
                          <Link href={`/files/${v.id}/quote`} className="underline">
                            {t('Version {revision}', { revision: v.revision })}
                          </Link>{' '}
                          <span className="text-ink-600">· {formatDate(v.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination meta={meta} />
    </div>
  )
}

export default FilesIndex
