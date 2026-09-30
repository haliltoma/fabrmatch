import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useNavigationPhase } from '~/lib/use_navigation'
import { useT } from '~/lib/i18n'

/**
 * What a person sees while a page change or a form post takes a moment.
 *
 * - `site` (public pages and the buyer, seller and maker panels): a "print layer" runs across the
 *   top, an orange bead leading it like a nozzle; after a second a lime "Loading…" chip appears at
 *   the bottom, so a slow connection never looks like a dead click.
 * - `admin`: a thin, quiet ink line and a small status chip in the top corner; admins do this all
 *   day and need to see it happen, not be entertained by it.
 *
 * Nothing shows for visits under 200 ms. Reduced motion: the bar stands still at two thirds.
 */
export function NavigationProgress({ variant = 'site' }: { variant?: 'site' | 'admin' }) {
  const { t } = useT()
  const phase = useNavigationPhase()
  const still = useReducedMotion() ?? false
  const busy = phase !== 'idle'
  const admin = variant === 'admin'

  return (
    <>
      <AnimatePresence>
        {busy && (
          <motion.div
            key="bar"
            role="progressbar"
            aria-label={t('Loading the page')}
            aria-busy="true"
            className={`pointer-events-none fixed inset-x-0 top-0 z-[70] ${admin ? 'h-0.5' : 'h-1'}`}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
          >
            {!admin && <div className="absolute inset-0 bg-ink-900/10" />}
            <motion.div
              className={`absolute inset-y-0 left-0 w-full origin-left ${admin ? 'bg-ink-900' : 'bg-heat-500'}`}
              initial={{ scaleX: still ? 0.66 : 0.08 }}
              animate={{ scaleX: still ? 0.66 : 0.9 }}
              exit={{ scaleX: 1, transition: { duration: 0.15 } }}
              transition={{ duration: still ? 0 : 8, ease: [0.1, 0.7, 0.3, 1] }}
            />
            {!admin && !still && (
              // the layer below, laid down a beat behind the first
              <motion.div
                className="absolute inset-x-0 bottom-0 h-px w-full origin-left bg-ink-900"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 0.75 }}
                transition={{ duration: 9, ease: [0.1, 0.7, 0.3, 1], delay: 0.3 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'slow' && (
          <motion.div
            key="chip"
            role="status"
            initial={still ? false : { opacity: 0, y: admin ? -6 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={
              admin
                ? 'pointer-events-none fixed top-3 right-4 z-[70] inline-flex items-center gap-2 rounded-md border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm'
                : 'palette-light pointer-events-none fixed bottom-5 left-1/2 z-[70] inline-flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-ink-900 bg-lime px-4 py-2 text-sm font-semibold text-ink-900'
            }
          >
            {admin ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <span className="flex h-3.5 w-3.5 flex-col justify-center gap-[2px]" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-[3px] rounded-[1px] bg-ink-900"
                    animate={still ? undefined : { scaleX: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    style={{ originX: 0 }}
                  />
                ))}
              </span>
            )}
            {admin ? t('Loading page…') : t('Loading…')}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
