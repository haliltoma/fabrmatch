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
/** Maker menu: the day's work first, then the machines, then money and standing. */
export const makerNav: NavItem[] = [
  { label: 'Dashboard', href: '/maker', icon: Gauge, group: 'Work', mobileTab: true },
  {
    label: 'Work',
    href: '/maker/work',
    icon: ClipboardList,
    group: 'Work',
    badge: 'work',
    mobileTab: true,
  },
  {
    label: 'Quote requests',
    href: '/maker/rfqs',
    icon: FileQuestion,
    feature: 'rfq',
    group: 'Work',
  },
  { label: 'Printers', href: '/maker/printers', icon: Printer, group: 'Machines', mobileTab: true },
  { label: 'Capacity', href: '/maker/capacity', icon: Wrench, group: 'Machines' },
  { label: 'Finishing', href: '/maker/finishing', icon: Brush, group: 'Machines' },
  { label: 'Earnings', href: '/maker/earnings', icon: Wallet, group: 'Money', mobileTab: true },
  { label: 'Payouts and invoices', href: '/maker/payout', icon: Landmark, group: 'Money' },
  { label: 'Performance', href: '/maker/performance', icon: Award, group: 'Money' },
]

/** Seller menu: selling, then the shop's look and connections, then money, then own purchases. */
export const sellerNav: NavItem[] = [
  { label: 'Dashboard', href: '/seller', icon: TrendingUp, group: 'Sell', mobileTab: true },
  { label: 'Sales', href: '/seller/orders', icon: ReceiptText, group: 'Sell', mobileTab: true },
  { label: 'Products', href: '/seller/products', icon: Package, group: 'Sell', mobileTab: true },
  { label: 'Analytics', href: '/seller/analytics', icon: LineChart, group: 'Sell' },
  { label: 'Quote requests', href: '/rfqs', icon: FileQuestion, feature: 'rfq', group: 'Sell' },
  { label: 'Branding', href: '/seller/branding', icon: Tag, group: 'Your shop' },
  {
    label: 'Your shops',
    href: '/seller/stores',
    icon: Store,
    feature: 'externalStores',
    group: 'Your shop',
  },
  { label: 'Developers', href: '/seller/developers', icon: KeyRound, group: 'Your shop' },
  {
    label: 'Payouts and invoices',
    href: '/seller/payout',
    icon: Landmark,
    group: 'Money',
    mobileTab: true,
  },
  {
    label: 'Wallet',
    href: '/seller/wallet',
    icon: Wallet,
    feature: 'externalStores',
    group: 'Money',
  },
  { label: 'My orders', href: '/orders', icon: ClipboardList, group: 'Buying' },
  { label: 'My invoices', href: '/invoices', icon: FileText, group: 'Buying' },
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
