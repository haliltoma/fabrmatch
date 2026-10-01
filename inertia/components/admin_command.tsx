import { useEffect, useMemo, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { CornerDownLeft, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import type { NavItem } from '~/layouts/dashboard'
import { useT } from '~/lib/i18n'

type Command = { id: string; label: string; hint: string; href: string }

/** An order code as people type it: FO-… (also partly), or just the eight characters. */
const ORDER_CODE = /^(fo-?[a-z0-9]{1,10}|[a-z0-9]{8})$/i

/**
 * Admin command palette (Ctrl/⌘ + K): jump to any admin page, open an order by its code, or find
 * a user by e-mail or name, without hunting through the menu. Keyboard only if you like: arrows to
 * move, Enter to open, Esc to close.
 */
export function AdminCommand({
  items,
  compact = false,
  shortcut = true,
}: {
  items: NavItem[]
  compact?: boolean
  /** listen for Ctrl/⌘ + K; off for a second copy (the phone menu) so only one palette opens */
  shortcut?: boolean
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!shortcut) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcut])

  const commands = useMemo<Command[]>(() => {
    const q = query.trim()
    const lower = q.toLowerCase()
    const pages = items
      .filter(
        (i) =>
          !q || t(i.label).toLowerCase().includes(lower) || i.label.toLowerCase().includes(lower)
      )
      .map((i) => ({
        id: i.href,
        label: t(i.label),
        hint: i.group ? t(i.group) : t('Page'),
        href: i.href,
      }))
    const lookups: Command[] = []
    if (q && ORDER_CODE.test(q)) {
      const code = /^fo/i.test(q) ? q.toUpperCase() : `FO-${q.toUpperCase()}`
      lookups.push({
        id: 'order',
        label: t('Open order {code}', { code }),
        hint: t('Orders'),
        href: `/admin/orders?q=${encodeURIComponent(code)}`,
      })
    }
    if (q.length >= 2) {
      lookups.push({
        id: 'user',
        label: t('Find people matching “{q}”', { q }),
        hint: t('Users'),
        href: `/admin/users?q=${encodeURIComponent(q)}`,
      })
    }
    return [...lookups, ...pages]
  }, [items, query, t])

  const go = (c: Command | undefined) => {
    if (!c) return
    setOpen(false)
    setQuery('')
    router.visit(c.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, commands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(commands[active])
    }
  }

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={compact ? t('Search or jump to…') : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-sm text-sidebar-muted transition-colors hover:border-sidebar-muted hover:text-sidebar-fg focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:outline-none"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        {!compact && <span className="flex-1 text-left">{t('Search or jump to…')}</span>}
        {!compact && (
          <kbd className="rounded border border-sidebar-border px-1.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        )}
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setQuery('')
        }}
      >
        <DialogContent className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">{t('Search the admin panel')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('Type a page name, an order code or a person’s e-mail.')}
          </DialogDescription>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="h-4 w-4 text-ink-500" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={t('Page, order code (FO-…) or e-mail')}
              role="combobox"
              aria-expanded="true"
              aria-controls="admin-command-list"
              aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
              aria-label={t('Search the admin panel')}
              className="h-12 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
            />
          </div>
          <ul
            id="admin-command-list"
            ref={listRef}
            role="listbox"
            className="max-h-80 overflow-y-auto p-2"
          >
            {commands.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-600">
                {t('Nothing matches. Try an order code or an e-mail.')}
              </li>
            )}
            {commands.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${c.id}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => go(c)}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  i === active ? 'bg-ink-900 text-paper' : 'text-ink-900'
                }`}
              >
                <span className="flex-1">{c.label}</span>
                <span className={`text-xs ${i === active ? 'text-ink-200' : 'text-ink-500'}`}>
                  {c.hint}
                </span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
