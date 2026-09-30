import { useId, type ReactNode } from 'react'

/** Black inside a mask cuts a hole (screw holes, windows) through the printed part. */
const HOLE = '#000'

function gearPath() {
  const cx = 60
  const cy = 64
  const points: string[] = []
  for (let k = 0; k < 10; k++) {
    const c = k * 36
    for (const [r, a] of [
      [32, c - 12],
      [44, c - 6],
      [44, c + 6],
      [32, c + 12],
    ] as const) {
      const rad = (a * Math.PI) / 180
      points.push(`${(cx + r * Math.cos(rad)).toFixed(1)} ${(cy + r * Math.sin(rad)).toFixed(1)}`)
    }
  }
  return `M${points.join('L')}Z M72 64A12 12 0 1 0 48 64A12 12 0 1 0 72 64Z`
}

/** Printed-part silhouettes on a 120 × 120 grid, each standing on y = 110 (the bed). */
const SHAPES = {
  vase: (
    <path d="M42 14H78C78 32 93 44 93 66C93 92 83 108 75 110H45C37 108 27 92 27 66C27 44 42 32 42 14Z" />
  ),
  planter: (
    <>
      <path d="M24 48H96L88 110H32Z" />
      <path d="M20 36H100V50H20Z" />
      <ellipse cx="46" cy="22" rx="8" ry="15" transform="rotate(-24 46 22)" />
      <ellipse cx="74" cy="22" rx="8" ry="15" transform="rotate(24 74 22)" />
      <ellipse cx="60" cy="16" rx="7" ry="15" />
    </>
  ),
  gear: <path fillRule="evenodd" d={gearPath()} />,
  enclosure: (
    <>
      <path d="M22 52H98V110H22Z" />
      <path d="M16 40H104V54H16Z" />
      <rect x="30" y="64" width="22" height="9" rx="2" fill={HOLE} />
      <circle cx="26" cy="47" r="3" fill={HOLE} />
      <circle cx="94" cy="47" r="3" fill={HOLE} />
      <path d="M62 82H90V86H62ZM62 92H90V96H62Z" fill={HOLE} />
    </>
  ),
  organizer: (
    <>
      <path d="M18 56Q18 52 22 52H44Q48 52 48 56V110H18Z" />
      <path d="M50 30Q50 26 54 26H72Q76 26 76 30V110H50Z" />
      <path d="M78 70Q78 66 82 66H100Q104 66 104 70V110H78Z" />
    </>
  ),
  stand: <path d="M12 110H108V96H12ZM46 96L62 30H82L74 96ZM12 96H34V80H12Z" />,
  knight: (
    <>
      <path d="M28 110H92V98H28ZM36 98H84V90H36Z" />
      <path d="M42 90C44 76 52 68 48 58C42 56 32 60 26 54L38 34C44 24 54 16 66 16C84 18 94 38 90 62C88 76 80 84 80 90Z" />
      <circle cx="58" cy="34" r="3.5" fill={HOLE} />
    </>
  ),
  clip: (
    <path
      d="M90 44A34 34 0 1 0 90 92"
      fill="none"
      stroke="#fff"
      strokeWidth="15"
      strokeLinecap="round"
    />
  ),
  rocket: (
    <>
      <path d="M60 10C77 24 81 46 79 86H41C39 46 43 24 60 10Z" />
      <path d="M42 62L24 94V110L42 94ZM78 62L96 94V110L78 94Z" />
      <path d="M48 86H72L68 100H52Z" />
      <circle cx="60" cy="44" r="9" fill={HOLE} />
    </>
  ),
  lamp: (
    <>
      <path d="M38 16H82L100 70H20Z" />
      <path d="M56 70H64V100H56ZM32 100H88V110H32Z" />
      <circle cx="46" cy="38" r="4" fill={HOLE} />
      <circle cx="60" cy="30" r="3" fill={HOLE} />
      <circle cx="72" cy="42" r="5" fill={HOLE} />
      <circle cx="56" cy="52" r="4" fill={HOLE} />
      <circle cx="82" cy="58" r="3" fill={HOLE} />
      <circle cx="38" cy="58" r="3" fill={HOLE} />
    </>
  ),
} satisfies Record<string, ReactNode>

export type ShapeKind = keyof typeof SHAPES

/** A printed part with layer lines that follow its outline. */
export function Part({ kind, color, id }: { kind: ShapeKind; color: string; id: string }) {
  return (
    <>
      <defs>
        <pattern id={`${id}-l`} width="4" height="3.2" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#15181c" fillOpacity="0.18" />
        </pattern>
        <mask id={`${id}-m`}>
          <g fill="#fff">{SHAPES[kind]}</g>
        </mask>
      </defs>
      <g mask={`url(#${id}-m)`}>
        <rect width="120" height="120" fill={color} />
        <rect width="120" height="120" fill={`url(#${id}-l)`} />
      </g>
    </>
  )
}

export function PartIcon({
  kind,
  color,
  className,
}: {
  kind: ShapeKind
  color: string
  className?: string
}) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Part kind={kind} color={color} id={id} />
    </svg>
  )
}
