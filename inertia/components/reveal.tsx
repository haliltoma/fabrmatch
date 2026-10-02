import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useRevealed } from '~/lib/use_revealed'

/** Fade/slide-in on scroll; renders the final state immediately for reduced-motion users. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const seen = useRevealed(ref)
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={seen ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}
