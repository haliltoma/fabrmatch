import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export type PrintKind = 'vase' | 'stand' | 'clip' | 'planter'

/** Silhouettes of printed parts; a mask lets the layer lines follow each shape. */
const SHAPES: Record<PrintKind, React.ReactNode> = {
  vase: (
    <path d="M42 14H78C78 32 93 44 93 66C93 92 83 108 75 110H45C37 108 27 92 27 66C27 44 42 32 42 14Z" />
  ),
  stand: <path d="M12 104H108V90H12ZM46 90L62 24H82L74 90ZM12 90H34V74H12Z" />,
  clip: (
    <path
      d="M90 38A34 34 0 1 0 90 86"
      fill="none"
      stroke="#fff"
      strokeWidth="15"
      strokeLinecap="round"
    />
  ),
  planter: (
    <>
      <path d="M24 46H96L88 108H32Z" />
      <path d="M20 34H100V48H20Z" />
    </>
  ),
}

const LEAVES = (
  <>
    <ellipse cx="46" cy="20" rx="8" ry="15" transform="rotate(-24 46 20)" />
    <ellipse cx="74" cy="20" rx="8" ry="15" transform="rotate(24 74 20)" />
    <ellipse cx="60" cy="14" rx="7" ry="15" />
  </>
)

export function PrintArt({
  kind,
  color,
  className,
  label,
  printing = false,
  delay = 0,
}: {
  kind: PrintKind
  color: string
  className?: string
  label?: string
  /** Loop a "being printed" animation: the part builds up from the bed, holds, then starts over. */
  printing?: boolean
  delay?: number
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const animate = printing && !reduce
  const reveal = `${id}-reveal`
  const mask = `${id}-mask`
  const lines = `${id}-lines`
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <pattern id={lines} width="4" height="3.2" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#15181c" fillOpacity="0.16" />
        </pattern>
        <mask id={mask}>
          <g fill="#fff">{SHAPES[kind]}</g>
        </mask>
        {animate && (
          <clipPath id={reveal}>
            <motion.rect
              x="0"
              width="120"
              height="130"
              initial={{ y: 130 }}
              animate={{ y: [130, 0, 0, 130] }}
              transition={{
                duration: 7,
                times: [0, 0.45, 0.9, 1],
                ease: 'easeInOut',
                repeat: Infinity,
                delay,
              }}
            />
          </clipPath>
        )}
      </defs>
      {kind === 'planter' && (
        <g fill="#2f7d5b" transform="translate(0 6)">
          {LEAVES}
        </g>
      )}
      <g mask={`url(#${mask})`} clipPath={animate ? `url(#${reveal})` : undefined}>
        <rect width="120" height="120" fill={color} />
        <rect width="120" height="120" fill={`url(#${lines})`} />
      </g>
    </svg>
  )
}
