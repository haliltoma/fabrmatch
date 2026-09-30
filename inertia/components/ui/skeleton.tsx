import type { CSSProperties, ReactNode } from 'react'
import { cn } from '~/lib/utils'
import { useT } from '~/lib/i18n'

/**
 * Placeholders shown while one part of a page loads or refreshes (a lazy 3D viewer, a price being
 * worked out, a filtered list). They keep the final layout's size so nothing jumps when the real
 * content arrives (CLS 0), and they "print" themselves bottom to top (.skeleton in app.css).
 * Screen readers hear one "Loading" per region instead of a pile of empty boxes.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn('skeleton', className)} style={style} />
}

/** Wraps a group of skeletons as one busy region with a single spoken label. */
export function SkeletonRegion({
  label,
  className,
  children,
}: {
  label?: string
  className?: string
  children: ReactNode
}) {
  const { t } = useT()
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label ?? t('Loading…')}</span>
      {children}
    </div>
  )
}

/** Lines of text, the last one shorter like a real paragraph. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: i === lines - 1 ? '62%' : '100%' }} />
      ))}
    </div>
  )
}

/** A product-card-shaped placeholder: picture plate, title, price, material chips. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[10px] border-2 border-line bg-paper-raised',
        className
      )}
    >
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/** A list row: code/title on the left, amount and status on the right. */
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-5 w-24 rounded-full" />
    </div>
  )
}

/** Rows inside the usual bordered list, for tables and lists that are refreshing. */
export function SkeletonList({ rows = 6, label }: { rows?: number; label?: string }) {
  return (
    <SkeletonRegion label={label}>
      <div className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </SkeletonRegion>
  )
}

/** A grid of product cards. */
export function SkeletonGrid({
  count = 8,
  className,
  label,
}: {
  count?: number
  className?: string
  label?: string
}) {
  return (
    <SkeletonRegion label={label}>
      <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </SkeletonRegion>
  )
}

/** The 3D viewer's frame while three.js and the model load: a build plate with a part rising. */
export function SkeletonModel({ className }: { className?: string }) {
  const { t } = useT()
  return (
    <SkeletonRegion label={t('Loading the 3D preview…')} className={cn('relative', className)}>
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-[30%] bottom-[18%] top-[22%]">
        <Skeleton className="h-full w-full rounded-[40%_40%_12%_12%] bg-ink-100" />
      </div>
      <div
        className="absolute inset-x-[18%] bottom-[14%] h-1.5 rounded-full bg-ink-200"
        aria-hidden
      />
    </SkeletonRegion>
  )
}
