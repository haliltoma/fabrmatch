import { Check, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useT } from '~/lib/i18n'

export type ScanCheck =
  'size' | 'signatures' | 'active_content' | 'structure' | 'archive' | 'antivirus' | 'integrity'

export type ScanState = 'scanning' | 'clean' | 'blocked'

/** What each server-side check looks for (app/services/files/file_scanner.ts). */
const LABELS: Record<ScanCheck, string> = {
  size: 'File size and type',
  signatures: 'Known malware and program signatures',
  active_content: 'Hidden scripts and web code',
  structure: 'Every line is 3D model data',
  archive: 'Archive contents and zip bombs',
  antivirus: 'Antivirus engine (ClamAV)',
  integrity: 'File matches your upload',
}

/** Checks every STL goes through; shown while the answer is on its way. */
const ALWAYS: ScanCheck[] = ['size', 'signatures', 'active_content', 'structure']

/**
 * The security scan an uploaded model goes through, shown under the upload. While scanning it
 * lists what is being checked; afterwards only the checks the server reports as passed get a tick,
 * so the panel never claims a check that did not run.
 */
export function ScanPanel({
  state,
  checks,
  reason,
  compact = false,
}: {
  state: ScanState
  checks?: ScanCheck[]
  reason?: string | null
  compact?: boolean
}) {
  const { t } = useT()
  const passed = new Set(checks ?? [])
  const rows = state === 'clean' && checks ? checks : ALWAYS

  const tone =
    state === 'blocked'
      ? 'border-danger/50 bg-danger-soft'
      : state === 'clean'
        ? 'border-fil-600/40 bg-fil-100'
        : 'border-ink-900/20 bg-paper-sunken'

  return (
    <div role="status" aria-live="polite" className={`rounded-[12px] border-2 p-3 ${tone}`}>
      <div className="flex items-center gap-2">
        {state === 'scanning' && (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ink-800" aria-hidden />
        )}
        {state === 'clean' && <ShieldCheck className="h-5 w-5 shrink-0 text-fil-700" aria-hidden />}
        {state === 'blocked' && (
          <ShieldAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />
        )}
        <p
          className={`text-sm font-semibold ${state === 'blocked' ? 'text-danger' : 'text-ink-900'}`}
        >
          {state === 'scanning' && t('Scanning for viruses and hidden code…')}
          {state === 'clean' && t('Virus scan passed')}
          {state === 'blocked' && t('Blocked by the security scan')}
        </p>
      </div>

      {state === 'scanning' && (
        <div className="scan-bar mt-2 h-1.5 overflow-hidden rounded-full bg-ink-900/10" aria-hidden>
          <span className="block h-full w-1/3 rounded-full bg-lime" />
        </div>
      )}

      {state === 'blocked' && reason && <p className="mt-1 text-sm text-danger">{t(reason)}</p>}

      {!compact && state !== 'blocked' && (
        <ul className="mt-2 grid gap-1 text-xs text-ink-700 sm:grid-cols-2">
          {rows.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              {state === 'clean' && passed.has(c) ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-fil-700" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden />
              )}
              {t(LABELS[c])}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
