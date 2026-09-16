/**
 * MobileMenu — hamburger butonu + tam ekran navigasyon çekmecesi
 * client:load olarak yüklenir, Header.astro içinde kullanılır
 */
import { useState, useEffect } from 'react'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  // Escape ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Menü açıkken body scroll kilitle
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        className={`fm-hamburger${open ? ' fm-hamburger--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="fm-mobile-nav"
        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fm-mobile-menu__backdrop"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Çekmece */}
      <nav
        id="fm-mobile-nav"
        className={`fm-mobile-menu${open ? ' fm-mobile-menu--open' : ''}`}
        aria-label="Mobil navigasyon"
        aria-hidden={!open}
      >
        <a href="/urunler"      onClick={close}>ürünler</a>
        <a href="/ozel-tasarim" onClick={close}>özel tasarım</a>
        <a href="/nasil-calisir" onClick={close}>nasıl çalışır</a>
        <div className="fm-mobile-menu__divider" aria-hidden="true" />
        <a href="/hesabim"      onClick={close}>hesabım</a>
        <a href="/sepet"        onClick={close}>sepet</a>
      </nav>
    </>
  )
}
