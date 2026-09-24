import { useT } from '~/lib/i18n' /** Wordmark: a stack of three printed layers + the name. */
export function Logo({ tone = 'ink' }: { tone?: 'ink' | 'paper' }) {
  const { t } = useT()

  const bar = tone === 'ink' ? 'bg-ink-900' : 'bg-paper'
  const text = tone === 'ink' ? 'text-ink-900' : 'text-paper'
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-7 w-7 flex-col justify-center gap-[3px]" aria-hidden>
        <span className={`h-[5px] w-full rounded-[1px] ${bar}`} />
        <span className="h-[5px] w-4/5 rounded-[1px] bg-heat-500" />
        <span className={`h-[5px] w-3/5 rounded-[1px] ${bar}`} />
      </span>
      <span className={`font-display text-xl font-semibold tracking-tight ${text}`}>
        {t('Fabrmatch')}
      </span>
    </span>
  )
}
