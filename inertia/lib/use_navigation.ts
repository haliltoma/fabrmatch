import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'

type Visit = { only: string[]; prefetch: boolean; async: boolean }

/** A page change or form post the person is waiting on; not a prefetch or a background refresh. */
export const isForegroundVisit = (visit: Visit) =>
  !visit.prefetch && !visit.async && visit.only.length === 0

/**
 * Phases of a foreground Inertia visit (link, redirect, form post): 'idle', 'pending' once it has
 * taken longer than `showAfterMs` (fast visits never flash a loader) and 'slow' after `slowAfterMs`.
 * Partial reloads (`only`), prefetches and async visits are ignored: those refresh one component,
 * which shows its own skeleton instead.
 */
export function useNavigationPhase(showAfterMs = 200, slowAfterMs = 1200) {
  const [phase, setPhase] = useState<'idle' | 'pending' | 'slow'>('idle')

  useEffect(() => {
    let running = 0
    let showTimer: ReturnType<typeof setTimeout> | undefined
    let slowTimer: ReturnType<typeof setTimeout> | undefined
    const clear = () => {
      clearTimeout(showTimer)
      clearTimeout(slowTimer)
    }
    const offStart = router.on('start', (event) => {
      if (!isForegroundVisit(event.detail.visit)) return
      running += 1
      clear()
      showTimer = setTimeout(() => setPhase('pending'), showAfterMs)
      slowTimer = setTimeout(() => setPhase('slow'), slowAfterMs)
    })
    const offFinish = router.on('finish', (event) => {
      if (!isForegroundVisit(event.detail.visit)) return
      running = Math.max(0, running - 1)
      if (running === 0) {
        clear()
        setPhase('idle')
      }
    })
    return () => {
      offStart()
      offFinish()
      clear()
    }
  }, [showAfterMs, slowAfterMs])

  return phase
}

/**
 * True while this same page is being reloaded with new filters, sort or page number (a GET to the
 * current path). Lists use it to swap their rows for skeletons instead of showing stale results.
 */
export function useSamePageLoading(showAfterMs = 150) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const offStart = router.on('start', (event) => {
      const visit = event.detail.visit as Visit & { url: URL; method: string }
      if (!isForegroundVisit(visit) || visit.method !== 'get') return
      if (visit.url.pathname !== window.location.pathname) return
      clearTimeout(timer)
      timer = setTimeout(() => setLoading(true), showAfterMs)
    })
    const offFinish = router.on('finish', (event) => {
      if (!isForegroundVisit(event.detail.visit)) return
      clearTimeout(timer)
      setLoading(false)
    })
    return () => {
      offStart()
      offFinish()
      clearTimeout(timer)
    }
  }, [showAfterMs])

  return loading
}
