/** Order codes read like a print label: mono, tabular. */
export function OrderCode({ code, className = '' }: { code: string; className?: string }) {
  return (
    <span className={`font-mono text-sm font-medium tracking-wide text-ink-900 ${className}`}>
      {code}
    </span>
  )
}
