import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'fm_theme'
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(pref: ThemePref) {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystem = () => {
    if (readPref() === 'system') apply('system')
    onChange()
  }
  mq.addEventListener('change', onSystem)
  return () => {
    listeners.delete(onChange)
    mq.removeEventListener('change', onSystem)
  }
}

// the snapshot is "pref:dark" so both the choice and the resolved look re-render subscribers
const snapshot = () =>
  `${readPref()}:${document.documentElement.classList.contains('dark') ? 1 : 0}`

/** The visitor's theme choice; stored in this browser only, applied before first paint by the layout script. */
export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'system:0')
  const [pref, dark] = value.split(':')

  function choose(next: ThemePref) {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // private mode: the choice lasts for this page only
    }
    apply(next)
    for (const l of listeners) l()
  }

  return { pref: pref as ThemePref, dark: dark === '1', choose }
}
