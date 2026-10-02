import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { useRevealed } from '~/lib/use_revealed'

/**
 * A real number that counts up when it scrolls into view and eases to a new value when it changes.
 * The server-rendered text is already the final number, and reduced-motion readers never see a count.
 */
export function CountUp({
  value,
  format = String,
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const inView = useRevealed(ref)
  const [shown, setShown] = useState(value)
  const current = useRef(value)
  const started = useRef(false)

  useEffect(() => {
    if (reduce || !inView) return
    const from = started.current ? current.current : 0
    started.current = true
    const controls = animate(from, value, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v) => {
        current.current = v
        setShown(v)
      },
    })
    return () => controls.stop()
  }, [value, inView, reduce])

  return (
    <span ref={ref} className={className}>
      {format(Math.round(reduce ? value : shown))}
    </span>
  )
}
