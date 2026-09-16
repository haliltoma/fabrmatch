/**
 * HeroText — Framer Motion stagger entrance
 * Yüklenme sırası: region badge → h1 → p → actions
 * Easing: cubic-bezier(0.16, 1, 0.3, 1) — Emil Kowalski / Linear tarzı "overshoot yok" giriş
 * prefers-reduced-motion: tüm animasyonlar anında tamamlanır
 */
'use client'

import { motion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1] as const

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const item = {
  hidden:  { opacity: 0, y: 20 },
  show:    { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
}

interface HeroTextProps {
  region: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
}

export default function HeroText({
  region,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: HeroTextProps) {
  return (
    <motion.div
      className="fm-hero__text"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Konum rozeti */}
      <motion.span className="fm-hero__region" variants={item}>
        <i className="ti ti-map-pin" aria-hidden="true" />
        {region}
      </motion.span>

      {/* Ana başlık */}
      <motion.h1 variants={item} dangerouslySetInnerHTML={{ __html: title }} />

      {/* Açıklama */}
      <motion.p variants={item}>{description}</motion.p>

      {/* CTA butonları */}
      <motion.div className="fm-hero__actions" variants={item}>
        <motion.a
          href={primaryHref}
          className="fm-button fm-button--primary fm-button--lg"
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <i className="ti ti-shopping-bag" aria-hidden="true" />
          {primaryLabel}
        </motion.a>
        <motion.a
          href={secondaryHref}
          className="fm-button fm-button--lg"
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <i className="ti ti-upload" aria-hidden="true" />
          {secondaryLabel}
        </motion.a>
      </motion.div>
    </motion.div>
  )
}
