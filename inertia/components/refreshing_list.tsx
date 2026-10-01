import type { ReactNode } from 'react'
import { SkeletonList } from '~/components/ui/skeleton'
import { useSamePageLoading } from '~/lib/use_navigation'

/**
 * A list that turns into row skeletons while the same page reloads with another page number,
 * filter or sort, instead of showing the previous results as if they were the new ones.
 */
export function RefreshingList({
  rows = 6,
  label,
  children,
}: {
  rows?: number
  label?: string
  children: ReactNode
}) {
  const loading = useSamePageLoading()
  return loading ? <SkeletonList rows={rows} label={label} /> : <>{children}</>
}
