import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Delays between refreshes while waiting on background work (a file scan): quick at first, then
 * slower, and a stop after about three minutes. A stuck job must never turn a page into a request
 * every few seconds forever. Pure so the schedule is unit-tested.
 */
export function pollDelays(): number[] {
  const delays = [3000, 3000, 3000, 5000, 8000, 13000, 20000]
  let total = delays.reduce((a, b) => a + b, 0)
  while (total < 180_000) {
    delays.push(30_000)
    total += 30_000
  }
  return delays
}

/**
 * Calls `refresh` on the pollDelays() schedule while `active` is true. Paused while the tab is
 * hidden (nobody is looking), resumed on return. After the last delay it gives up; `retry` starts
 * a fresh schedule, e.g. from a "Check again" button.
 */
export function usePollWhile(active: boolean, refresh: () => void) {
  const [gaveUp, setGaveUp] = useState(false)
  const [round, setRound] = useState(0)
  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  })

  useEffect(() => {
    if (!active) return
    const delays = pollDelays()
    let step = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (step >= delays.length) {
        setGaveUp(true)
        return
      }
      timer = setTimeout(() => {
        step += 1
        refreshRef.current()
        schedule()
      }, delays[step])
    }
    const onVisibility = () => {
      clearTimeout(timer)
      if (document.visibilityState === 'visible') schedule()
    }
    if (document.visibilityState === 'visible') schedule()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, round])

  const retry = useCallback(() => {
    setGaveUp(false)
    refreshRef.current()
    setRound((r) => r + 1)
  }, [])

  return { gaveUp: active && gaveUp, retry }
}
