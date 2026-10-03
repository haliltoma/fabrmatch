import { useState } from 'react'
import { router } from '@inertiajs/react'
import { MessageCircleQuestion } from 'lucide-react'
import { FormErrors } from '~/components/field_error'
import { ColourPicker, type CatalogueColour, type ChosenColour } from '~/components/colour_picker'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { formatDateTime } from '~/lib/format'
import type { ItemColour } from '~/lib/colours'
import { useT } from '~/lib/i18n'

export type OpenRevision = {
  expiresAt: string
  history: Array<{
    id: string
    status: string
    request: string
    response: string | null
    askedAt: string
  }>
  colours: CatalogueColour[]
  maxColours: number
}

type Item = {
  id: string
  fileName: string | null
  material: string
  colours?: ItemColour[]
  buyerNote?: string | null
}

/**
 * Paket Y: the maker asked something before accepting. The buyer answers and may swap colours,
 * rename parts or change the note; nothing here changes the price (that is cancel + reorder).
 * The maker is never named, and the texts are checked for contact details on the server.
 */
export function RevisionAnswer({
  orderId,
  items,
  revision,
  canCancel,
}: {
  orderId: string
  items: Item[]
  revision: OpenRevision
  canCancel: boolean
}) {
  const { t } = useT()
  const question = revision.history[revision.history.length - 1]
  const earlier = revision.history.slice(0, -1)
  const [response, setResponse] = useState('')
  const [busy, setBusy] = useState(false)
  const [edits, setEdits] = useState(
    () =>
      Object.fromEntries(
        items.map((i) => [
          i.id,
          {
            colours: (i.colours ?? []).map((c) => ({ name: c.name, part: c.part ?? '' })),
            note: i.buyerNote ?? '',
          },
        ])
      ) as Record<string, { colours: ChosenColour[]; note: string }>
  )
  const lockedCount = (i: Item) => Math.max(1, i.colours?.length ?? 0)
  // an empty slot (name '') is a colour taken out and not replaced yet
  const countsOk = items.every(
    (i) => edits[i.id].colours.filter((c) => c.name !== '').length === lockedCount(i)
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    router.post(
      `/orders/${orderId}/revision`,
      {
        response: response.trim(),
        items: items.map((i) => ({
          itemId: i.id,
          colours: edits[i.id].colours
            .filter((c) => c.name !== '')
            .map((c) => ({
              name: c.name,
              part: c.part.trim() || undefined,
            })),
          buyerNote: edits[i.id].note.trim() || undefined,
        })),
      },
      { preserveScroll: true, preserveState: true, onFinish: () => setBusy(false) }
    )
  }

  return (
    <section
      aria-labelledby="revision-title"
      className="rounded-[10px] border-2 border-ink-900 bg-paper-raised"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink-900 px-5 py-3">
        <h2
          id="revision-title"
          className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900"
        >
          <MessageCircleQuestion className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          {t('The maker has a question')}
        </h2>
        <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-medium text-ink-900">
          {t('Your turn · answer by {when}', { when: formatDateTime(revision.expiresAt) })}
        </span>
      </div>

      <form onSubmit={submit} className="space-y-5 px-5 py-4">
        {earlier.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-ink-700">
              {t('Earlier questions ({n})', { n: earlier.length })}
            </summary>
            <ul className="mt-2 space-y-2">
              {earlier.map((r) => (
                <li key={r.id} className="rounded-md border border-line px-3 py-2">
                  <p className="text-ink-900">{r.request}</p>
                  {r.response && (
                    <p className="mt-1 text-ink-600">
                      {t('You:')} {r.response}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}

        <blockquote className="rounded-md border-l-4 border-heat-500 bg-paper-sunken px-4 py-3 text-ink-900">
          {question.request}
        </blockquote>

        {items.map((i) => (
          <div key={i.id} className="space-y-3">
            {items.length > 1 && (
              <p className="text-sm font-medium text-ink-900">
                {i.fileName ?? t('Model file')} · {i.material}
              </p>
            )}
            <ColourPicker
              id={`revision-colour-${i.id}`}
              colours={revision.colours}
              value={edits[i.id].colours}
              onChange={(colours) => setEdits({ ...edits, [i.id]: { ...edits[i.id], colours } })}
              max={revision.maxColours}
              lockedCount={lockedCount(i)}
            />
            <div className="space-y-1">
              <Label htmlFor={`revision-note-${i.id}`}>{t('Note for the maker (optional)')}</Label>
              <textarea
                id={`revision-note-${i.id}`}
                rows={2}
                maxLength={500}
                value={edits[i.id].note}
                onChange={(e) =>
                  setEdits({ ...edits, [i.id]: { ...edits[i.id], note: e.target.value } })
                }
                className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}

        <div className="space-y-1">
          <Label htmlFor="revision-response">{t('Your answer')}</Label>
          <textarea
            id="revision-response"
            required
            rows={3}
            maxLength={1000}
            value={response}
            aria-describedby="revision-help"
            onChange={(e) => setResponse(e.target.value)}
            className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          />
          <p id="revision-help" className="text-xs text-ink-600">
            {t(
              'Print details only. Phone numbers, links and company names are not sent: both sides stay anonymous.'
            )}
          </p>
        </div>

        <FormErrors />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={busy || response.trim() === '' || !countsOk}
            aria-describedby={!countsOk ? 'revision-blocker' : undefined}
          >
            {busy ? t('Please wait…') : t('Send answer')}
          </Button>
          {!countsOk && (
            <p id="revision-blocker" className="text-xs text-ink-600">
              {t('Keep the same number of colours; a different number changes the price.')}
            </p>
          )}
        </div>
        <p className="text-xs text-ink-600">
          {canCancel
            ? t(
                'Need another material, size or number of colours? That changes the price: cancel below for a full refund and order again.'
              )
            : t('Your price does not change with this answer.')}
        </p>
      </form>
    </section>
  )
}
