import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  ClipboardList,
  Factory,
  Brush,
  FileQuestion,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  Landmark,
  Tag,
  Ticket,
  KeyRound,
  Layers,
  LineChart,
  Megaphone,
  ListChecks,
  Package,
  Printer,
  ReceiptText,
  SlidersHorizontal,
  ScrollText,
  Settings,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
  Handshake,
} from 'lucide-react'
import type { NavItem } from '~/layouts/dashboard'

/**
 * Single source of truth for panel navigation.
 * Only routes that actually exist may appear here.
 */
export const makerNav: NavItem[] = [
  { label: 'Dashboard', href: '/maker', icon: Gauge },
  { label: 'Work', href: '/maker/work', icon: ClipboardList },
  { label: 'Printers', href: '/maker/printers', icon: Printer },
  { label: 'Capacity', href: '/maker/capacity', icon: Wrench },
  { label: 'Quote requests', href: '/maker/rfqs', icon: FileQuestion, feature: 'rfq' },
  { label: 'Finishing', href: '/maker/finishing', icon: Brush },
  { label: 'Performance', href: '/maker/performance', icon: Award },
  { label: 'Earnings', href: '/maker/earnings', icon: Wallet },
  { label: 'Payouts and invoices', href: '/maker/payout', icon: Landmark },
]

export const sellerNav: NavItem[] = [
  { label: 'Dashboard', href: '/seller', icon: TrendingUp },
  { label: 'Sales', href: '/seller/orders', icon: ReceiptText },
  { label: 'Products', href: '/seller/products', icon: Package },
  { label: 'Analytics', href: '/seller/analytics', icon: LineChart },
  { label: 'Quote requests', href: '/rfqs', icon: FileQuestion, feature: 'rfq' },
  { label: 'Branding', href: '/seller/branding', icon: Tag },
  { label: 'Payouts and invoices', href: '/seller/payout', icon: Landmark },
  { label: 'Developers', href: '/seller/developers', icon: KeyRound },
  { label: 'My orders', href: '/orders', icon: ClipboardList },
]

export const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'Queues', href: '/admin/queues', icon: ListChecks },
  { label: 'Background jobs', href: '/admin/jobs', icon: Activity },
  { label: 'Metrics', href: '/admin/metrics', icon: LineChart },
  { label: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
  { label: 'Growth', href: '/admin/growth', icon: Megaphone },
  { label: 'Message tests', href: '/admin/experiments', icon: FlaskConical },
  { label: 'Matching', href: '/admin/matching', icon: Handshake },
  { label: 'Orders', href: '/admin/orders', icon: ReceiptText },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Makers', href: '/admin/makers', icon: Factory },
  { label: 'Catalog', href: '/admin/catalog', icon: Package },
  { label: 'Materials', href: '/admin/materials', icon: Layers },
  { label: 'Print profiles', href: '/admin/profiles', icon: SlidersHorizontal },
  { label: 'Finishing', href: '/admin/finishing', icon: Brush },
  { label: 'Shipping', href: '/admin/shipping', icon: Truck },
  { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { label: 'Disputes', href: '/admin/disputes', icon: AlertTriangle },
  { label: 'Payouts', href: '/admin/payouts', icon: Landmark },
  { label: 'Audit log', href: '/admin/audit', icon: ScrollText },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

/** Best-matching panel nav for a user's roles (used on shared pages like /orders). */
export function navForRoles(roles: string[] | undefined | null): NavItem[] {
  if (roles?.includes('manufacturer')) return makerNav
  if (roles?.includes('admin')) return adminNav
  return sellerNav
}
