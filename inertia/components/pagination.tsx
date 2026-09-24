import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

export type PageMeta = { page: number; perPage: number; total: number; pages: number }

/** Prev/next with page count; keeps other query params and scroll position. */
export function Pagination({ meta }: { meta: PageMeta }) {
  const { t } = useT()

  if (meta.pages <= 1) return null

  function go(page: number) {
    const query = Object.fromEntries(new URLSearchParams(window.location.search))
    router.get(window.location.pathname, { ...query, page }, { preserveScroll: true })
  }

  return (
    <nav aria-label={t('Pagination')} className="flex items-center justify-between gap-3 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => go(meta.page - 1)}
      >
        {t('Previous')}
      </Button>
      <p className="tabular text-sm text-ink-700">
        {t('Page {page} of {pages} · {total} total', {
          page: meta.page,
          pages: meta.pages,
          total: meta.total,
        })}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page >= meta.pages}
        onClick={() => go(meta.page + 1)}
      >
        {t('Next')}
      </Button>
    </nav>
  )
}
