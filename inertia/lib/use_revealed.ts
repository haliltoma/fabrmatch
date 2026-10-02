import { useEffect, useState } from 'react'
import { useInView } from 'motion/react'

/**
 * Whether a scroll-in animation may play: once true it stays true. True as soon as a bit of the
 * element is on screen, and also once the page has scrolled to or past it, so content never
 * stays hidden after a fast scroll, a jump to an anchor or a page restored mid-way (the browser
 * does not report elements it scrolled over between two frames). Negative viewport margins are
 * avoided on purpose: an element near the page bottom could never get that far in.
 */
export function useRevealed(ref: React.RefObject<Element | null>) {
  const inView = useInView(ref, { once: true, amount: 0.1 })
  const [passed, setPassed] = useState(false)
  useEffect(() => {
    if (passed) return
    const check = () => {
      const el = ref.current
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.9) setPassed(true)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [ref, passed])
  return inView || passed
}
