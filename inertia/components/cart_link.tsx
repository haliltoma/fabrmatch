import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ShoppingBag } from 'lucide-react'

export function CartLink() {
  const { props } = usePage<{ cartCount?: number }>()
  const count = props.cartCount ?? 0
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-700 transition-colors hover:bg-ink-900/5"
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-heat-500 px-1 text-[10px] font-semibold text-ink-900">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
