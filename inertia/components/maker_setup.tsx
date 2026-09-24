import { Link } from '@adonisjs/inertia/react'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

export type SetupStep = { id: string; title: string; detail: string; href: string; done: boolean }
export type Setup = { steps: SetupStep[]; doneCount: number; complete: boolean }

/** First-run checklist: shows what is still missing before offers can arrive, and where to fix it. */
export function MakerSetup({ setup }: { setup: Setup }) {
  const { t } = useT()

  if (setup.complete) return null
  const next = setup.steps.find((s) => !s.done)
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('Get ready for your first offer')}{' '}
          <span className="tabular text-sm font-normal text-ink-600">
            {t('{done} of {total} done', { done: setup.doneCount, total: setup.steps.length })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-paper-sunken"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={setup.steps.length}
          aria-valuenow={setup.doneCount}
          aria-label={t('Setup progress')}
        >
          <div
            className="h-full bg-heat-500"
            style={{ width: `${(setup.doneCount / setup.steps.length) * 100}%` }}
          />
        </div>
        <ol className="space-y-3">
          {setup.steps.map((s) => (
            <li key={s.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                  s.done
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-line text-ink-500'
                }`}
              >
                {s.done ? <Check className="h-3 w-3" /> : null}
              </span>
              <div>
                <p
                  className={`text-sm font-medium ${s.done ? 'text-ink-600 line-through' : 'text-ink-900'}`}
                >
                  {t(s.title)}
                  <span className="sr-only">{s.done ? ` — ${t('done')}` : ` — ${t('to do')}`}</span>
                </p>
                {!s.done && <p className="text-sm text-ink-700">{t(s.detail)}</p>}
              </div>
            </li>
          ))}
        </ol>
        {next && next.href !== '/maker' && (
          <Button asChild>
            <Link href={next.href}>{next.title}</Link>
          </Button>
        )}
        <p className="text-xs text-ink-600">
          {t(
            'Tip: print one small test part first and check its size, so your first real order goes smoothly.'
          )}
        </p>
      </CardContent>
    </Card>
  )
}
