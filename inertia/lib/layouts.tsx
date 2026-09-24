import type { ComponentType, ReactElement } from 'react'
import { type Data } from '@generated/data'
import DefaultLayout from '~/layouts/default'
import AuthLayout from '~/layouts/auth'
import DashboardLayout, { type NavItem } from '~/layouts/dashboard'

type Shell = ComponentType<{ children: ReactElement<Data.SharedProps> }>

type PageComponent = ComponentType<never> & {
  layout?: unknown
  dashboardProps?: { navItems: NavItem[]; title: string }
}

const shells = new WeakMap<object, Shell>()

/**
 * Pages declare `Page.layout = 'auth' | 'dashboard'` (or nothing = default). Inertia 3 wants a
 * component there, so turn the name into one once per page. Shells are regular functions
 * (not arrows) so Inertia treats them as components, not as layout resolvers.
 */
export function withLayout<T>(module: T): T {
  const page = (module as { default: unknown }).default as PageComponent
  if (typeof page.layout === 'function' || Array.isArray(page.layout)) return module

  let shell = shells.get(page)
  if (!shell) {
    const kind = typeof page.layout === 'string' ? page.layout : 'default'
    const dashboard = page.dashboardProps
    if (kind === 'auth') {
      shell = function AuthShell(props) {
        return <AuthLayout {...props} />
      }
    } else if (kind === 'dashboard') {
      shell = function DashboardShell(props) {
        return (
          <DashboardLayout
            {...props}
            navItems={dashboard?.navItems ?? []}
            title={dashboard?.title ?? 'Dashboard'}
          />
        )
      }
    } else {
      shell = function DefaultShell(props) {
        return <DefaultLayout {...props} />
      }
    }
    shells.set(page, shell)
  }
  page.layout = shell
  return module
}
