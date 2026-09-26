import { useEffect, useState } from 'react'

/**
 * Seconds into a repeating loop, ~30 fps. Pauses while the element is off-screen or the tab is
 * hidden; stays on `still` for reduced motion and on the server, and starts from it on the client
 * so the first animated frame does not jump. `enabled: false` turns the clock off entirely.
 */
export function useLoopClock(
  ref: React.RefObject<Element | null>,
  loopSeconds: number,
  still: number,
  enabled = true
) {
  const [time, setTime] = useState(still)
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let visible = true
    let frame = 0
    let last = 0
    let elapsed = still
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    if (ref.current) observer.observe(ref.current)
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = last ? Math.min(now - last, 100) : 0
      last = now
      if (!visible || document.hidden) return
      const before = elapsed
      elapsed += dt / 1000
      if (Math.floor(elapsed * 30) !== Math.floor(before * 30)) setTime(elapsed % loopSeconds)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [ref, loopSeconds, still, enabled])
  return time
}
