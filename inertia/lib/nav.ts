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
  FileText,
  FlaskConical,
  Gauge,
  Globe,
  Landmark,
  Store,
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
  Rocket,
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
  { label: 'Your shops', href: '/seller/stores', icon: Store, feature: 'externalStores' },
  { label: 'Wallet', href: '/seller/wallet', icon: Wallet, feature: 'externalStores' },
  { label: 'Payouts and invoices', href: '/seller/payout', icon: Landmark },
  { label: 'Developers', href: '/seller/developers', icon: KeyRound },
  { label: 'My orders', href: '/orders', icon: ClipboardList },
  { label: 'My invoices', href: '/invoices', icon: FileText },
]

/**
 * Admin menu in five groups, in the order an admin works: what needs a decision today, the
 * marketplace itself, what things cost, how it is going, and the machinery. Badges count what is
 * waiting behind a link (shared `adminAttention` prop).
 */
export const adminNav: NavItem[] = [
  { label: 'Today', href: '/admin', icon: BarChart3, group: 'Today' },
  {
    label: 'Work queues',
    href: '/admin/queues',
    icon: ListChecks,
    group: 'Today',
    badge: 'queues',
  },
  {
    label: 'Matching',
    href: '/admin/matching',
    icon: Handshake,
    group: 'Today',
    badge: 'matching',
  },
  {
    label: 'Disputes',
    href: '/admin/disputes',
    icon: AlertTriangle,
    group: 'Today',
    badge: 'disputes',
  },
  { label: 'Payouts', href: '/admin/payouts', icon: Landmark, group: 'Today', badge: 'payouts' },
  { label: 'Orders', href: '/admin/orders', icon: ReceiptText, group: 'Marketplace' },
  { label: 'Users', href: '/admin/users', icon: Users, group: 'Marketplace' },
  { label: 'Makers', href: '/admin/makers', icon: Factory, group: 'Marketplace' },
  { label: 'Catalog', href: '/admin/catalog', icon: Package, group: 'Marketplace' },
  { label: 'Materials', href: '/admin/materials', icon: Layers, group: 'Pricing and supply' },
  {
    label: 'Print profiles',
    href: '/admin/profiles',
    icon: SlidersHorizontal,
    group: 'Pricing and supply',
  },
  { label: 'Finishing', href: '/admin/finishing', icon: Brush, group: 'Pricing and supply' },
  { label: 'Shipping', href: '/admin/shipping', icon: Truck, group: 'Pricing and supply' },
  {
    label: 'Region pricing',
    href: '/admin/pricing-regions',
    icon: Globe,
    group: 'Pricing and supply',
  },
  { label: 'Coupons', href: '/admin/coupons', icon: Ticket, group: 'Pricing and supply' },
  { label: 'Metrics', href: '/admin/metrics', icon: LineChart, group: 'Insights' },
  { label: 'Reports', href: '/admin/reports', icon: FileSpreadsheet, group: 'Insights' },
  { label: 'Growth', href: '/admin/growth', icon: Megaphone, group: 'Insights' },
  { label: 'Message tests', href: '/admin/experiments', icon: FlaskConical, group: 'Insights' },
  { label: 'Background jobs', href: '/admin/jobs', icon: Activity, group: 'System' },
  { label: 'Audit log', href: '/admin/audit', icon: ScrollText, group: 'System' },
  { label: 'Launch readiness', href: '/admin/launch', icon: Rocket, group: 'System' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, group: 'System' },
]

/** Best-matching panel nav for a user's roles (used on shared pages like /orders). */
export function navForRoles(roles: string[] | undefined | null): NavItem[] {
  if (roles?.includes('manufacturer')) return makerNav
  if (roles?.includes('admin')) return adminNav
  return sellerNav
}
