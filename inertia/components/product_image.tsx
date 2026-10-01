import { useRef, useState, type PointerEvent } from 'react'
import { useT } from '~/lib/i18n'

export type ShopImage = {
  id: string
  kind: 'render' | 'maker_photo'
  url: string
  width: number | null
  height: number | null
  angle: number | null
}

const sizeLabel = (bboxMm: number[] | null) =>
  bboxMm ? bboxMm.map((d) => Math.round(d)).join(' × ') : null

/** Card thumbnail: the first picture on the layer-line plate, or the title letter while there is none. */
export function ProductThumb({
  image,
  title,
  bboxMm,
  className = 'h-36',
  letterClass = 'text-6xl',
  plateClass = 'bg-paper-sunken',
}: {
  image: ShopImage | null
  title: string
  bboxMm: number[] | null
  className?: string
  letterClass?: string
  plateClass?: string
}) {
  const { t } = useT()
  const size = sizeLabel(bboxMm)
  return (
    <div
      className={`layer-lines relative flex items-end justify-between p-4 ${plateClass} ${className}`}
    >
      {image ? (
        <img
          src={image.url}
          alt={title}
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full ${image.kind === 'maker_photo' ? 'object-cover' : 'object-contain p-2'}`}
        />
      ) : (
        <span className={`font-display font-semibold leading-none text-ink-900 ${letterClass}`}>
          {title.charAt(0)}
        </span>
      )}
      {size && (
        <span className="relative ml-auto rounded bg-paper-raised/80 px-1.5 py-0.5 font-mono text-xs text-ink-700">
          {t('{v2} mm', { v2: size })}
        </span>
      )}
    </div>
  )
}

/**
 * Product page picture: a turntable of the server renders the buyer can turn by dragging or with
 * the plate slider, plus approved photos of real prints. Only images, never the mesh (rule 4).
 */
export function ProductGallery({
  images,
  title,
  bboxMm,
}: {
  images: ShopImage[]
  title: string
  bboxMm: number[] | null
}) {
  const { t } = useT()
  const frames = images.filter((i) => i.kind === 'render')
  const photos = images.filter((i) => i.kind === 'maker_photo')
  const [view, setView] = useState<'turntable' | number>(frames.length > 0 ? 'turntable' : 0)
  const [frame, setFrame] = useState(0)
  const [turned, setTurned] = useState(false)
  const drag = useRef<{ x: number; frame: number } | null>(null)
  const size = sizeLabel(bboxMm)

  if (images.length === 0) {
    return (
      <div className="layer-lines flex h-72 items-end justify-between rounded-lg border border-line bg-paper-sunken p-6">
        <span className="font-display text-9xl font-semibold leading-none text-ink-900">
          {title.charAt(0)}
        </span>
        {size && (
          <span className="font-mono text-sm text-ink-700">{t('{v2} mm', { v2: size })}</span>
        )}
      </div>
    )
  }

  const step = (dx: number) => {
    const n = frames.length
    // one frame per 40 px of drag; turning right turns the part right
    const next = (((drag.current!.frame - Math.round(dx / 40)) % n) + n) % n
    setFrame(next)
    if (next !== drag.current!.frame) setTurned(true)
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (view !== 'turntable' || frames.length < 2) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, frame }
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) step(e.clientX - drag.current.x)
  }
  const onUp = () => {
    drag.current = null
  }

  const shown = view === 'turntable' ? frames[frame] : photos[view]

  return (
    <figure className="space-y-3">
      <div
        className={`layer-lines relative h-80 touch-pan-y select-none overflow-hidden rounded-lg border border-line bg-paper-sunken sm:h-96 ${
          view === 'turntable' && frames.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* every frame stays mounted, so turning never waits for a download */}
        {view === 'turntable' ? (
          frames.map((f, i) => (
            <img
              key={f.id}
              src={f.url}
              alt={i === frame ? t('{title}, turned to {deg}°', { title, deg: f.angle ?? 0 }) : ''}
              aria-hidden={i !== frame}
              width={f.width ?? undefined}
              height={f.height ?? undefined}
              draggable={false}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-contain p-4 ${i === frame ? '' : 'invisible'}`}
            />
          ))
        ) : (
          <img
            src={shown.url}
            alt={t('Photo of a printed {title}', { title })}
            width={shown.width ?? undefined}
            height={shown.height ?? undefined}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {size && (
          <span className="absolute bottom-3 right-3 rounded bg-paper-raised/85 px-2 py-0.5 font-mono text-sm text-ink-700">
            {t('{v2} mm', { v2: size })}
          </span>
        )}
        {view === 'turntable' && frames.length > 1 && !turned && (
          <span
            className="pointer-events-none absolute left-3 top-3 rounded bg-paper-raised/85 px-2 py-0.5 text-xs text-ink-700"
            aria-hidden="true"
          >
            {t('Drag to turn')}
          </span>
        )}
      </div>

      {view === 'turntable' && frames.length > 1 && (
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            step={1}
            value={frame}
            onChange={(e) => {
              setFrame(Number(e.target.value))
              setTurned(true)
            }}
            aria-label={t('Turn the part')}
            aria-valuetext={`${frames[frame].angle ?? 0}°`}
            className="w-full accent-ink-900"
            list="turntable-ticks"
          />
          <datalist id="turntable-ticks">
            {frames.map((f, i) => (
              <option key={f.id} value={i} />
            ))}
          </datalist>
        </div>
      )}

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('Pictures')}>
          {frames.length > 0 && (
            <button
              type="button"
              onClick={() => setView('turntable')}
              aria-pressed={view === 'turntable'}
              className={`layer-lines h-16 w-16 overflow-hidden rounded-md border bg-paper-sunken ${
                view === 'turntable' ? 'border-ink-900 ring-2 ring-ink-900' : 'border-line'
              }`}
            >
              <img src={frames[0].url} alt={t('Render')} className="h-full w-full object-contain" />
            </button>
          )}
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setView(i)}
              aria-pressed={view === i}
              className={`h-16 w-16 overflow-hidden rounded-md border ${
                view === i ? 'border-ink-900 ring-2 ring-ink-900' : 'border-line'
              }`}
            >
              <img
                src={p.url}
                alt={t('Photo {n}', { n: i + 1 })}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <figcaption className="text-sm text-ink-600">
        {view === 'turntable'
          ? t(
              'Computer render of the model. The printed part shows fine layer lines, and its colour follows the material you pick.'
            )
          : t('Photo of a real print from a maker on Fabrmatch.')}
      </figcaption>
    </figure>
  )
}
