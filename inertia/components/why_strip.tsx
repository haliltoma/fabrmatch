import { EyeOff, MapPin, ShieldCheck, Timer } from 'lucide-react'
import { useT } from '~/lib/i18n'

const ITEMS = [
  {
    icon: ShieldCheck,
    tile: 'bg-lime',
    title: 'Your money is safe',
    body: 'Payment waits until the part is in your hands. Something wrong? Open a dispute with photos.',
  },
  {
    icon: MapPin,
    tile: 'bg-sky',
    title: 'Printed near you',
    body: 'Each order goes to a nearby maker whose printer and material fit the job.',
  },
  {
    icon: EyeOff,
    tile: 'bg-blush',
    title: 'Nobody sees who you are',
    body: 'Buyers and makers stay anonymous; phone numbers and links are hidden in messages.',
  },
  {
    icon: Timer,
    tile: 'bg-sun',
    title: 'A price before you sign up',
    body: 'Drop a file, see the delivered price. Sign up only when you order.',
  },
]

/** The promises the product actually enforces, in place of small vanity numbers. */
export function WhyStrip() {
  const { t } = useT()
  return (
    <section aria-labelledby="why-h" className="border-b border-line bg-paper-raised">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 id="why-h" className="sr-only">
          {t('Why Fabrmatch')}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-ink-900 ${item.tile}`}
              >
                <item.icon className="h-6 w-6 text-ink-900" aria-hidden />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold text-ink-900">
                  {t(item.title)}
                </span>
                <span className="mt-1 block text-sm text-ink-700">{t(item.body)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
