import { memo, useId, useRef } from 'react'
import { useLoopClock } from '~/lib/use_loop_clock'
import { useT } from '~/lib/i18n'
import {
  ARM,
  BOX,
  LOOP_SECONDS,
  STILL_TIME,
  VASE_SCALE,
  armJoints,
  fix,
  sceneAt,
  type Pose,
  type Step,
} from '~/lib/journey'

/*
 * Hero scene: a floor-mounted, three-link industrial robot arm 3D-prints a vase on a heated bed;
 * next to it a carton waits on a conveyor and a courier hands a parcel over at a door.
 * One SVG in the site palette on a fixed light ground (.palette-light), same in both themes.
 * The arm is built from joint angles (see ARM) so the next stage can animate the same drawing.
 */
const INK = '#15181c'
const STEEL = '#d7dbe0'
const STEEL_DARK = '#9aa2ab'
const HEAT = '#f0501e'
const SUN = '#ffc629'
const SKY = '#8fd3f4'
const LIME = '#c8f53c'
const BLUSH = '#ff9fb8'
const FIL = '#2f7d5b'
const KRAFT = '#c89a5e'
const KRAFT_DARK = '#a87a42'
const GROUND = '#fbf7ef'
const WALL_LINE = 'rgb(21 24 28 / 0.07)'

const VASE =
  'M42 14H78C78 32 93 44 93 66C93 92 83 108 75 110H45C37 108 27 92 27 66C27 44 42 32 42 14Z'

export const JOURNEY_STEPS: Array<{ id: Step; label: string }> = [
  { id: 'printing', label: 'Printing' },
  { id: 'packing', label: 'Packing' },
  { id: 'shipping', label: 'On its way' },
  { id: 'delivered', label: 'Delivered' },
]

function linkPath(len: number, w0: number, w1: number) {
  const a = w0 / 2
  const b = w1 / 2
  return `M0 ${-a} L${len} ${-b} A${b} ${b} 0 0 1 ${len} ${b} L0 ${a} A${a} ${a} 0 0 1 0 ${-a} Z`
}

/** One arm segment: yellow casting, shaded underside, highlight, panel seam, bolts, cable. */
function ArmLink({
  id,
  len,
  w0,
  w1,
  piston = false,
}: {
  id: string
  len: number
  w0: number
  w1: number
  piston?: boolean
}) {
  const clip = `${id}-clip`
  const d = linkPath(len, w0, w1)
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
      </defs>
      {piston && (
        <g>
          <rect
            x={10}
            y={w0 / 2 + 3}
            width={46}
            height={9}
            rx={4}
            fill={STEEL}
            stroke={INK}
            strokeWidth={2}
          />
          <rect
            x={52}
            y={w0 / 2 + 5}
            width={28}
            height={5}
            rx={2.5}
            fill={STEEL_DARK}
            stroke={INK}
            strokeWidth={1.6}
          />
          <circle cx={82} cy={w0 / 2 + 7.5} r={4} fill={INK} />
        </g>
      )}
      <path d={d} fill={SUN} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        <rect x={-w0} y={w0 / 6} width={len + w0 * 2} height={w0} fill={INK} fillOpacity={0.16} />
        <line
          x1={len * 0.55}
          y1={-w0}
          x2={len * 0.55}
          y2={w0}
          stroke={INK}
          strokeOpacity={0.35}
          strokeWidth={1.5}
        />
        <rect
          x={len * 0.2}
          y={-2}
          width={len * 0.26}
          height={4}
          rx={2}
          fill={INK}
          fillOpacity={0.22}
        />
      </g>
      <line
        x1={6}
        y1={-w0 / 2 + 4}
        x2={len - 4}
        y2={-w1 / 2 + 4}
        stroke="#fff"
        strokeOpacity={0.75}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* cable harness with clips along the top of the casting */}
      <path
        d={`M4 ${-w0 / 2 - 5} C ${len * 0.35} ${-w0 / 2 - 12}, ${len * 0.65} ${-w1 / 2 - 12}, ${len - 2} ${-w1 / 2 - 5}`}
        fill="none"
        stroke={INK}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {[0.3, 0.7].map((f) => (
        <rect
          key={f}
          x={len * f - 3}
          y={-(w0 + (w1 - w0) * f) / 2 - 10}
          width={6}
          height={8}
          rx={1.5}
          fill={STEEL}
          stroke={INK}
          strokeWidth={1.4}
        />
      ))}
      {[0.14, 0.86].map((f) => (
        <circle key={f} cx={len * f} cy={0} r={2.2} fill={INK} />
      ))}
    </g>
  )
}

/** Servo housing at a joint: steel drum, yellow cap, bolt circle. */
function Joint({ r = 14 }: { r?: number }) {
  const bolts = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3)
  return (
    <g>
      <circle r={r} fill={STEEL} stroke={INK} strokeWidth={2.5} />
      <path
        d={`M${-r + 3} 3 A${r - 3} ${r - 3} 0 0 0 ${r - 3} 3`}
        fill="none"
        stroke={INK}
        strokeOpacity={0.2}
        strokeWidth={4}
      />
      <circle r={r - 6} fill={SUN} stroke={INK} strokeWidth={2} />
      {bolts.map((a) => (
        <circle
          key={a}
          cx={fix(Math.cos(a) * (r - 3))}
          cy={fix(Math.sin(a) * (r - 3))}
          r={1.4}
          fill={INK}
        />
      ))}
      <circle r={3} fill={INK} />
    </g>
  )
}

/** Print head, drawn pointing along +x; the arm turns it to face the bed. */
function PrintHead() {
  return (
    <g>
      <rect
        x={-2}
        y={-13}
        width={8}
        height={26}
        rx={2}
        fill={STEEL_DARK}
        stroke={INK}
        strokeWidth={2}
      />
      <rect
        x={6}
        y={-15}
        width={22}
        height={30}
        rx={4}
        fill="#2a2f35"
        stroke={INK}
        strokeWidth={2.5}
      />
      <circle cx={17} cy={0} r={8.5} fill={STEEL} stroke={INK} strokeWidth={1.8} />
      {[0, 90, 180, 270].map((a) => (
        <path
          key={a}
          d="M17 0 Q21 -6 17 -8"
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          transform={`rotate(${a} 17 0)`}
        />
      ))}
      <circle cx={24} cy={-11} r={1.6} fill={LIME} />
      <rect x={28} y={-8} width={7} height={16} rx={1.5} fill={HEAT} stroke={INK} strokeWidth={2} />
      <path
        d="M35 -5 L42 0 L35 5 Z"
        fill={STEEL_DARK}
        stroke={INK}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </g>
  )
}

function RobotArm({ id, pose }: { id: string; pose: Pose }) {
  const { shoulder, lengths } = ARM
  const [l1, l2, l3] = lengths
  const headTurn = pose.head
  return (
    <g>
      {/* floor plinth with bolted flange and hazard band */}
      <ellipse cx={shoulder.x} cy={331} rx={58} ry={5} fill={INK} fillOpacity={0.12} />
      <path
        d="M36 330 L44 296 L128 296 L136 330 Z"
        fill={STEEL}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <rect
        x={42}
        y={306}
        width={88}
        height={10}
        fill={`url(#${id}-hazard)`}
        stroke={INK}
        strokeWidth={1.6}
      />
      {[48, 124].map((x) => (
        <circle key={x} cx={x} cy={324} r={2.5} fill={INK} />
      ))}
      {/* rotating turret with vents and a status panel */}
      <rect
        x={58}
        y={256}
        width={56}
        height={42}
        rx={8}
        fill={SUN}
        stroke={INK}
        strokeWidth={2.5}
      />
      <rect x={58} y={280} width={56} height={18} rx={4} fill={INK} fillOpacity={0.16} />
      {[66, 72, 78].map((x) => (
        <line
          key={x}
          x1={x}
          y1={264}
          x2={x}
          y2={276}
          stroke={INK}
          strokeOpacity={0.5}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
      <rect
        x={92}
        y={263}
        width={16}
        height={8}
        rx={2}
        fill={GROUND}
        stroke={INK}
        strokeWidth={1.5}
      />
      <circle cx={96} cy={267} r={1.5} fill={FIL} />
      <circle cx={102} cy={267} r={1.5} fill={HEAT} />

      {/* link chain: shoulder → elbow → wrist → print head */}
      <g transform={`translate(${shoulder.x} ${shoulder.y}) rotate(${pose.shoulder})`}>
        <ArmLink id={`${id}-l1`} len={l1} w0={30} w1={24} piston />
        <g transform={`translate(${l1} 0) rotate(${pose.elbow})`}>
          <ArmLink id={`${id}-l2`} len={l2} w0={24} w1={18} />
          <g transform={`translate(${l2} 0) rotate(${pose.wrist})`}>
            <ArmLink id={`${id}-l3`} len={l3} w0={18} w1={16} />
            <g transform={`translate(${l3} 0) rotate(${headTurn})`}>
              <PrintHead />
            </g>
            <Joint r={10} />
          </g>
          <Joint r={13} />
        </g>
        <Joint r={17} />
      </g>
    </g>
  )
}

function Person({
  x,
  shirt,
  flip = false,
  cap = false,
  hair,
  arms = false,
}: {
  x: number
  shirt: string
  flip?: boolean
  cap?: boolean
  hair?: string
  arms?: boolean
}) {
  return (
    <g transform={`translate(${x} 226) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx={1} cy={105} rx={20} ry={4} fill={INK} fillOpacity={0.12} />
      <rect
        x={-10}
        y={64}
        width={9}
        height={38}
        rx={4}
        fill="#2a2f35"
        stroke={INK}
        strokeWidth={2}
      />
      <rect x={3} y={64} width={9} height={38} rx={4} fill="#2a2f35" stroke={INK} strokeWidth={2} />
      <path d="M-13 101 h13 v5 h-15 Z M2 101 h13 l3 5 h-16 Z" fill={INK} />
      <rect
        x={-17}
        y={20}
        width={36}
        height={50}
        rx={14}
        fill={shirt}
        stroke={INK}
        strokeWidth={2.5}
      />
      <rect x={-17} y={48} width={36} height={22} rx={6} fill={INK} fillOpacity={0.1} />
      {arms && (
        <g strokeLinecap="round">
          <path d="M-14 28 C -24 38, -24 50, -20 60" fill="none" stroke={INK} strokeWidth={10} />
          <path d="M-14 28 C -24 38, -24 50, -20 60" fill="none" stroke={shirt} strokeWidth={5} />
          <circle cx={-20} cy={62} r={4.5} fill="#f0c9a4" stroke={INK} strokeWidth={2} />
          <path d="M16 28 C 26 34, 32 40, 34 44" fill="none" stroke={INK} strokeWidth={10} />
          <path d="M16 28 C 26 34, 32 40, 34 44" fill="none" stroke={shirt} strokeWidth={5} />
          <circle cx={35} cy={46} r={4.5} fill="#f0c9a4" stroke={INK} strokeWidth={2} />
        </g>
      )}
      <rect
        x={-5}
        y={14}
        width={12}
        height={9}
        rx={3}
        fill="#e8b98f"
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx={1} cy={4} r={13} fill="#f0c9a4" stroke={INK} strokeWidth={2.5} />
      {hair && (
        <path
          d="M-12 1 C -12 -14, 14 -14, 14 1 C 8 -5, -6 -5, -12 1 Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {cap && (
        <g>
          <path d="M-13 0 C -13 -15, 15 -15, 15 0 Z" fill={LIME} stroke={INK} strokeWidth={2.2} />
          <path d="M14 -1 L25 1 L14 3 Z" fill={INK} />
        </g>
      )}
    </g>
  )
}

const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k)
const pts = (p: number[]) => p.reduce((s, v, i) => s + (i % 2 ? `,${v} ` : `${v}`), '')

function Carton({ flaps, tape, label = true }: { flaps: number; tape: number; label?: boolean }) {
  const w = BOX.width
  const h = BOX.height
  const left = mix([0, 0, -20, -20, 14, -20, 20, 0], [0, 0, 0, -4, w / 2, -4, w / 2, 0], flaps)
  const right = mix(
    [w, 0, w + 20, -20, w - 14, -20, w - 20, 0],
    [w, 0, w, -4, w / 2, -4, w / 2, 0],
    flaps
  )
  return (
    <g>
      <polygon
        points={pts(left)}
        fill={KRAFT_DARK}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <polygon
        points={pts(right)}
        fill={KRAFT_DARK}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <rect width={w} height={h} fill={KRAFT} stroke={INK} strokeWidth={2.5} />
      <rect width={w} height={7} fill={INK} fillOpacity={0.12} />
      <line
        x1={2}
        y1={3}
        x2={w - 2}
        y2={3}
        stroke={INK}
        strokeOpacity={0.35}
        strokeDasharray="2 2"
      />
      {tape > 0 && (
        <rect
          x={w / 2 - 7}
          y={-5}
          width={14}
          height={5 + 24 * tape}
          fill="#e7d6b8"
          stroke={INK}
          strokeWidth={1.5}
        />
      )}
      {label && (
        <g>
          <rect
            x={44}
            y={24}
            width={36}
            height={24}
            rx={2}
            fill="#fff"
            stroke={INK}
            strokeWidth={2}
          />
          {[48, 50, 53, 55, 58, 61, 63, 66].map((x, i) => (
            <rect key={x} x={x} y={37} width={i % 3 === 0 ? 2 : 1} height={8} fill={INK} />
          ))}
          <line x1={48} y1={29} x2={74} y2={29} stroke={INK} strokeWidth={2} />
          <line
            x1={48}
            y1={33}
            x2={66}
            y2={33}
            stroke={INK}
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        </g>
      )}
      <path d="M8 50 l10 -10 M8 42 l6 -6" stroke={INK} strokeOpacity={0.35} strokeWidth={1.5} />
    </g>
  )
}

function Vase({ lines, x, y }: { lines: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x - 60 * VASE_SCALE} ${y - 110 * VASE_SCALE}) scale(${VASE_SCALE})`}>
      <path d={VASE} fill={HEAT} stroke={INK} strokeWidth={2.5 / VASE_SCALE} />
      <path d={VASE} fill={`url(#${lines})`} />
      <path
        d="M40 80 C 38 92, 42 102, 48 106"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.5}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </g>
  )
}

/** Everything that never moves, drawn once. */
const Workshop = memo(function WorkshopScene({
  id,
  lines,
  grid,
}: {
  id: string
  lines: string
  grid: string
}) {
  return (
    <g>
      <rect width="640" height="400" fill={GROUND} />
      {[80, 240, 400, 560].map((x) => (
        <line key={x} x1={x} y1={0} x2={x} y2={330} stroke={WALL_LINE} strokeWidth={2} />
      ))}
      <rect y="330" width="640" height="70" fill="#ece3d2" />
      <line x1="0" y1="330" x2="640" y2="330" stroke={INK} strokeWidth="2.5" />
      <line
        x1="0"
        y1="362"
        x2="640"
        y2="362"
        stroke={SUN}
        strokeWidth="5"
        strokeDasharray="22 14"
      />

      {/* pendant lamp above the bed */}
      <line x1="222" y1="0" x2="222" y2="40" stroke={INK} strokeWidth="2" />
      <path d="M150 190 L294 190 L234 52 L210 52 Z" fill={`url(#${id}-lamp)`} />
      <path d="M202 52 L242 52 L234 40 L210 40 Z" fill={INK} />
      <ellipse cx="222" cy="53" rx="10" ry="3" fill={SUN} />

      {/* spool rack */}
      <rect
        x="316"
        y="118"
        width="98"
        height="8"
        rx="2"
        fill={STEEL_DARK}
        stroke={INK}
        strokeWidth="2"
      />
      {(
        [
          [336, HEAT],
          [365, LIME],
          [394, SKY],
        ] as const
      ).map(([cx, color]) => (
        <g key={cx} transform={`translate(${cx} 96)`}>
          <circle r="18" fill={color} stroke={INK} strokeWidth="2.5" />
          <circle r="18" fill={`url(#${lines})`} />
          <circle r="6" fill={GROUND} stroke={INK} strokeWidth="2" />
        </g>
      ))}

      {/* print bed */}
      <ellipse cx="222" cy="331" rx="66" ry="5" fill={INK} fillOpacity="0.12" />
      <rect
        x="175"
        y="304"
        width="94"
        height="10"
        rx="2"
        fill={STEEL}
        stroke={INK}
        strokeWidth="2.5"
      />
      {[182, 254].map((x) => (
        <rect
          key={x}
          x={x}
          y={314}
          width={8}
          height={16}
          fill={STEEL_DARK}
          stroke={INK}
          strokeWidth={2}
        />
      ))}
      <rect
        x="167"
        y="296"
        width="110"
        height="9"
        rx="2"
        fill="#2a2f35"
        stroke={INK}
        strokeWidth="2.5"
      />
      <rect x="169" y="297" width="106" height="6" fill={`url(#${grid})`} />
      <line
        x1="169"
        y1="297.5"
        x2="275"
        y2="297.5"
        stroke={HEAT}
        strokeOpacity="0.8"
        strokeWidth="1.5"
      />
      <g transform="translate(206 314)">
        <rect width="30" height="14" rx="2" fill="#2a2f35" stroke={INK} strokeWidth="1.8" />
        <text
          x="15"
          y="10"
          textAnchor="middle"
          fontFamily="JetBrains Mono Variable, monospace"
          fontSize="7"
          fill={LIME}
        >
          215°
        </text>
      </g>

      {/* conveyor */}
      <ellipse cx="376" cy="331" rx="96" ry="4" fill={INK} fillOpacity="0.12" />
      {[294, 456].map((x) => (
        <rect
          key={x}
          x={x}
          y={318}
          width={8}
          height={12}
          fill={STEEL_DARK}
          stroke={INK}
          strokeWidth={2}
        />
      ))}
      <rect
        x="282"
        y="304"
        width="188"
        height="16"
        rx="8"
        fill="#2a2f35"
        stroke={INK}
        strokeWidth="2.5"
      />
      {[294, 321, 348, 375, 402, 429, 456].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="312" r="5" fill={STEEL} stroke={INK} strokeWidth="1.5" />
          <circle cx={cx} cy="312" r="1.5" fill={INK} />
        </g>
      ))}

      {/* doorway */}
      <rect x="568" y="178" width="70" height="152" fill={INK} />
      <rect x="574" y="184" width="60" height="146" fill={SKY} stroke={INK} strokeWidth="2" />
      <rect
        x="582"
        y="196"
        width="44"
        height="50"
        rx="3"
        fill="none"
        stroke={INK}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <rect
        x="582"
        y="258"
        width="44"
        height="60"
        rx="3"
        fill="none"
        stroke={INK}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle cx="582" cy="264" r="3.5" fill={SUN} stroke={INK} strokeWidth="1.5" />
      <rect
        x="598"
        y="164"
        width="22"
        height="12"
        rx="2"
        fill={GROUND}
        stroke={INK}
        strokeWidth="1.8"
      />
      <text
        x="609"
        y="173"
        textAnchor="middle"
        fontFamily="JetBrains Mono Variable, monospace"
        fontSize="8"
        fill={INK}
      >
        12
      </text>
      <rect x="560" y="330" width="80" height="6" rx="2" fill={FIL} fillOpacity="0.6" />
    </g>
  )
})

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** `time` drives the scene from outside (the hero cube); without it the scene runs its own loop. */
export function PrintJourney({ time: driven }: { time?: number } = {}) {
  const { t } = useT()
  const ref = useRef<HTMLElement>(null)
  const own = useLoopClock(ref, LOOP_SECONDS, STILL_TIME, driven === undefined)
  const time = driven ?? own
  const scene = sceneAt(time)
  const id = useId().replaceAll(':', '')
  const lines = `${id}-lines`
  const grid = `${id}-grid`
  const printed = `${id}-printed`
  const current = JOURNEY_STEPS.findIndex((s) => s.id === scene.step)
  const { joints, tip } = armJoints(scene.pose)
  const wrist = joints[joints.length - 1]

  const box = scene.box
  const carrying = scene.parcel === 'courier'
  const parcelAt =
    scene.parcel === 'buyer'
      ? { x: 540, y: 250 }
      : {
          x: lerp(scene.courierX - 22, 540, scene.handover),
          y: lerp(252, 250, scene.handover),
        }
  const boxX = lerp(BOX.x + box.dx, scene.courierX - 22, box.toCourier)
  const boxY = lerp(BOX.top, 252, box.toCourier)
  const boxScale = lerp(1, 0.5, box.toCourier)
  const boxOpacity = box.toCourier > 0 ? 1 : box.opacity

  return (
    <figure
      ref={ref}
      className="palette-light flex h-full flex-col overflow-hidden rounded-[14px] border-2 border-ink-900 bg-[#fbf7ef]"
    >
      <svg
        viewBox="0 0 640 400"
        className="block min-h-0 w-full flex-auto"
        role="img"
        aria-label={t(
          'A robot arm prints a vase layer by layer, packs it into a box, and a courier delivers it to the buyer.'
        )}
      >
        <defs>
          <pattern id={lines} width="4" height="3" patternUnits="userSpaceOnUse">
            <rect width="4" height="1" fill={INK} fillOpacity="0.2" />
          </pattern>
          <pattern id={grid} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0 H0 V10" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="1" />
          </pattern>
          <pattern
            id={`${id}-hazard`}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="12" height="12" fill={SUN} />
            <rect width="6" height="12" fill={INK} />
          </pattern>
          <clipPath id={printed}>
            <rect x="0" y={scene.printedTo} width="640" height="200" />
          </clipPath>
          <linearGradient id={`${id}-lamp`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SUN} stopOpacity="0.45" />
            <stop offset="1" stopColor={SUN} stopOpacity="0" />
          </linearGradient>
        </defs>

        <Workshop id={id} lines={lines} grid={grid} />

        {/* filament feed follows the print head */}
        <path
          d={`M336 114 C 330 170, ${wrist.x + 60} ${wrist.y - 60}, ${wrist.x + 4} ${wrist.y - 8}`}
          fill="none"
          stroke={HEAT}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* the part: ghost of the whole vase while printing, solid where it is deposited */}
        {scene.vase.mode === 'printing' && (
          <g>
            <g
              transform={`translate(${222 - 60 * VASE_SCALE} ${296 - 110 * VASE_SCALE}) scale(${VASE_SCALE})`}
            >
              <path
                d={VASE}
                fill="none"
                stroke={INK}
                strokeOpacity={0.28}
                strokeDasharray="6 6"
                strokeWidth={2 / VASE_SCALE}
              />
            </g>
            <g clipPath={`url(#${printed})`}>
              <Vase lines={lines} x={222} y={296} />
            </g>
          </g>
        )}
        {scene.vase.mode === 'held' && (
          <Vase lines={lines} x={scene.vase.bottom.x} y={scene.vase.bottom.y} />
        )}

        {/* carton: waits open, takes the vase, closes, rides the belt, goes to the courier */}
        {scene.parcel === 'none' && (
          <g opacity={boxOpacity} transform={`translate(${boxX} ${boxY}) scale(${boxScale})`}>
            {scene.vase.mode === 'boxed' && (
              <Vase lines={lines} x={BOX.width / 2} y={BOX.height - 4} />
            )}
            <Carton flaps={box.flaps} tape={box.tape} />
          </g>
        )}

        {scene.extruding && (
          <g>
            <line
              x1={tip.x - 6}
              y1={scene.printedTo}
              x2={tip.x + 6}
              y2={scene.printedTo}
              stroke={HEAT}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={tip.x} cy={tip.y + 2} r="6" fill={SUN} fillOpacity="0.7" />
            <circle cx={tip.x} cy={tip.y + 2} r="2.5" fill={HEAT} />
          </g>
        )}

        <RobotArm id={id} pose={scene.pose} />

        <Person x={600} shirt={BLUSH} flip hair="#3b2a20" arms />
        <Person x={scene.courierX} shirt={LIME} cap />
        {carrying && (
          <g strokeLinecap="round">
            {[
              [scene.courierX - 14, scene.courierX - 24],
              [scene.courierX + 14, scene.courierX + 24],
            ].map(([from, to]) => (
              <g key={from}>
                <line x1={from} y1={252} x2={to} y2={264} stroke={INK} strokeWidth={11} />
                <line x1={from} y1={252} x2={to} y2={264} stroke={LIME} strokeWidth={6} />
                <circle cx={to} cy={267} r={5} fill="#f0c9a4" stroke={INK} strokeWidth={2} />
              </g>
            ))}
          </g>
        )}
        {scene.parcel !== 'none' && (
          <g transform={`translate(${parcelAt.x} ${parcelAt.y}) scale(0.5)`}>
            <Carton flaps={1} tape={1} />
          </g>
        )}

        {scene.tick > 0 && (
          <g transform={`translate(604 146) scale(${scene.tick})`}>
            <circle r="15" fill={FIL} stroke={INK} strokeWidth="2.5" />
            <path
              d="M-6 0 L-1 5 L7 -5"
              fill="none"
              stroke="#fff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>

      <figcaption className="border-t-2 border-ink-900 bg-paper-raised px-4 py-3">
        <ol className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-semibold sm:grid-cols-4">
          {JOURNEY_STEPS.map((s, i) => (
            <li
              key={s.id}
              aria-current={i === current ? 'step' : undefined}
              className={`flex items-center gap-2 ${i <= current ? 'text-ink-900' : 'text-ink-500'}`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink-900 transition-colors ${
                  i < current ? 'bg-ink-900' : i === current ? 'bg-heat-500' : 'bg-transparent'
                }`}
              />
              {t(s.label)}
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  )
}
