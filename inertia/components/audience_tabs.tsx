import { useRef, useState, type KeyboardEvent } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

type Step = { title: string; body: string }
type Audience = {
  id: 'buyer' | 'seller' | 'maker'
  label: string
  heading: string
  steps: Step[]
  cta: { label: string; href: string }
}

const AUDIENCES: Audience[] = [
  {
    id: 'buyer',
    label: 'I want a part printed',
    heading: 'Four steps, one timeline.',
    steps: [
      {
        title: 'Upload and get a price',
        body: 'Drop in an STL, 3MF or OBJ. We measure volume and size, and show what it costs in your material before you commit.',
      },
      {
        title: 'A verified maker is matched',
        body: 'Orders go to a nearby maker whose printer, material and free capacity fit. New makers get a fair share of offers too.',
      },
      {
        title: 'Printed and shipped',
        body: 'The maker prints, packs and adds a tracking number. You follow every status change on one timeline.',
      },
      {
        title: 'Paid only when it arrives',
        body: 'Your money is held while the part is made. Confirm delivery and it is released. Something wrong? Open a dispute with photos.',
      },
    ],
    cta: { label: 'Get an instant price', href: '/tools/quick-quote' },
  },
  {
    id: 'seller',
    label: 'I want to sell products',
    heading: 'Sell without stock or a printer.',
    steps: [
      {
        title: 'Pick a design',
        body: 'Choose a ready-made design from the catalog. Sizes and materials are already priced.',
      },
      {
        title: 'Set your margin',
        body: 'The buyer sees production cost plus your margin. You see your share before you list.',
      },
      {
        title: 'We print and ship',
        body: 'Each order is made after it is paid, by a verified maker. You carry no inventory risk.',
      },
      {
        title: 'You keep the margin',
        body: 'Your share is released after the buyer confirms delivery. You never see who prints or buys.',
      },
    ],
    cta: { label: 'See how selling works', href: '/for-sellers' },
  },
  {
    id: 'maker',
    label: 'I own a 3D printer',
    heading: 'Turn idle printer hours into orders.',
    steps: [
      {
        title: 'Add your machines',
        body: 'List printers, materials, colours and free hours. Offers only reach you when the part fits.',
      },
      {
        title: 'Accept an offer',
        body: 'You have a short window to accept or pass. New makers get a reserved share of offers.',
      },
      {
        title: 'Print, photograph, ship',
        body: 'Add photos of the finished part, then enter the carrier and tracking number.',
      },
      {
        title: 'Get paid after delivery',
        body: 'The buyer’s money is held from the start and released once delivery is confirmed.',
      },
    ],
    cta: { label: 'See how printing works', href: '/for-makers' },
  },
]

/** Audience switcher: the same page speaks to buyers, sellers and makers without three landing pages. */
export function AudienceTabs() {
  const { t } = useT()
  const [active, setActive] = useState<Audience['id']>('buyer')
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const current = AUDIENCES.find((a) => a.id === active) ?? AUDIENCES[0]

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = AUDIENCES.length - 1
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % AUDIENCES.length
        : event.key === 'ArrowLeft'
          ? (index + last) % AUDIENCES.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    setActive(AUDIENCES[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={t('Who are you?')} className="flex flex-wrap gap-2">
        {AUDIENCES.map((a, i) => (
          <button
            key={a.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            type="button"
            id={`aud-tab-${a.id}`}
            aria-selected={active === a.id}
            aria-controls={`aud-panel-${a.id}`}
            tabIndex={active === a.id ? 0 : -1}
            onClick={() => setActive(a.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-11 rounded-md border-2 px-4 py-2 text-sm font-semibold transition-[transform,border-width] duration-150 ${
              active === a.id
                ? 'border-ink-900 border-b-4 bg-lime text-ink-900'
                : 'border-line bg-paper-raised text-ink-800 hover:-translate-y-0.5 hover:border-ink-900'
            }`}
          >
            {t(a.label)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`aud-panel-${current.id}`}
        aria-labelledby={`aud-tab-${current.id}`}
        tabIndex={0}
        className="mt-10 focus-visible:outline-none"
      >
        <h2 className="max-w-2xl font-display text-4xl font-semibold text-ink-900">
          {t(current.heading)}
        </h2>
        <ol className="mt-10 grid gap-x-10 gap-y-2 md:grid-cols-2">
          {current.steps.map((step, i) => (
            <li key={step.title} className="flex gap-5 border-t border-ink-900/20 py-6">
              <span className="font-mono text-sm text-heat-700">0{i + 1}</span>
              <div>
                <h3 className="font-display text-xl font-semibold text-ink-900">{t(step.title)}</h3>
                <p className="mt-2 max-w-md text-ink-700">{t(step.body)}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button className="mt-4" variant={current.id === 'buyer' ? 'accent' : 'outline'} asChild>
          <Link href={current.cta.href}>
            {t(current.cta.label)} <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  )
}
