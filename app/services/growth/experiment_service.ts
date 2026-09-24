import { createHash, createHmac } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import {
  EXPERIMENTS,
  experimentByKey,
  type ExperimentDefinition,
} from '#services/growth/experiments'

const BOT = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|lighthouse/i

export interface VariantResult {
  variant: string
  visitors: number
  conversions: number
  rate: number
}

export interface ExperimentResult {
  key: string
  hypothesis: string
  enabled: boolean
  minPerVariant: number
  variants: VariantResult[]
  /** two-sided p-value of "the two rates differ", null until every variant has enough visitors */
  pValue: number | null
  verdict: 'not_enough_data' | 'no_clear_difference' | 'winner'
  winner: string | null
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 on erf). */
function normalCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2)
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  const erf = 1 - poly * Math.exp(-(z * z) / 2)
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)
}

/** Two-proportion z-test, two-sided. */
export function twoProportionP(c1: number, n1: number, c2: number, n2: number): number {
  const pooled = (c1 + c2) / (n1 + n2)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  if (se === 0) return 1
  const z = (c1 / n1 - c2 / n2) / se
  return 2 * (1 - normalCdf(Math.abs(z)))
}

export default class ExperimentService {
  /** Keyed hash of the session id: the same visitor always maps to the same value, no raw id is kept. */
  visitorHash(sessionId: string): string {
    return createHmac('sha256', env.get('APP_KEY').release())
      .update(`exp:${sessionId}`)
      .digest('hex')
  }

  /** Deterministic weighted pick: a visitor keeps their variant for as long as the experiment exists. */
  assign(experiment: ExperimentDefinition, visitor: string): string {
    const total = experiment.variants.reduce((a, v) => a + v.weight, 0)
    const digest = createHash('sha256').update(`${experiment.key}:${visitor}`).digest()
    let point = (digest.readUInt32BE(0) / 0x1_0000_0000) * total
    for (const v of experiment.variants) {
      if (point < v.weight) return v.name
      point -= v.weight
    }
    return experiment.variants[0].name
  }

  /**
   * The variant to show, and — unless it is a bot or the test is off — a one-time exposure record.
   * A disabled or unknown experiment always shows the control (the first variant).
   */
  async expose(key: string, sessionId: string, userAgent = ''): Promise<string> {
    const experiment = experimentByKey(key)
    if (!experiment) return 'A'
    if (!experiment.enabled) return experiment.variants[0].name
    const visitor = this.visitorHash(sessionId)
    const variant = this.assign(experiment, visitor)
    if (!BOT.test(userAgent)) {
      await db
        .table('experiment_events')
        .insert({
          experiment: key,
          variant,
          event: 'exposure',
          visitor_hash: visitor,
          created_at: new Date(),
        })
        .onConflict(['experiment', 'visitor_hash', 'event'])
        .ignore()
    }
    return variant
  }

  /** Counts one conversion per visitor, and only for visitors who actually saw the test. */
  async convert(key: string, sessionId: string): Promise<boolean> {
    const visitor = this.visitorHash(sessionId)
    const seen = await db
      .from('experiment_events')
      .where({ experiment: key, visitor_hash: visitor, event: 'exposure' })
      .first()
    if (!seen) return false
    const inserted = await db
      .table('experiment_events')
      .insert({
        experiment: key,
        variant: seen.variant,
        event: 'conversion',
        visitor_hash: visitor,
        created_at: new Date(),
      })
      .onConflict(['experiment', 'visitor_hash', 'event'])
      .ignore()
      .returning('id')
    return inserted.length > 0
  }

  async results(): Promise<ExperimentResult[]> {
    const rows = await db
      .from('experiment_events')
      .groupBy('experiment', 'variant', 'event')
      .select('experiment', 'variant', 'event')
      .count('* as n')
    return EXPERIMENTS.map((experiment) => {
      const count = (variant: string, event: string) =>
        Number(
          rows.find(
            (r) => r.experiment === experiment.key && r.variant === variant && r.event === event
          )?.n ?? 0
        )
      const variants = experiment.variants.map((v) => {
        const visitors = count(v.name, 'exposure')
        const conversions = count(v.name, 'conversion')
        return {
          variant: v.name,
          visitors,
          conversions,
          rate: visitors === 0 ? 0 : conversions / visitors,
        }
      })
      const enough = variants.every((v) => v.visitors >= experiment.minPerVariant)
      let pValue: number | null = null
      let verdict: ExperimentResult['verdict'] = 'not_enough_data'
      let winner: string | null = null
      if (enough && variants.length === 2) {
        const [a, b] = variants
        pValue = twoProportionP(a.conversions, a.visitors, b.conversions, b.visitors)
        if (pValue < 0.05) {
          verdict = 'winner'
          winner = a.rate > b.rate ? a.variant : b.variant
        } else {
          verdict = 'no_clear_difference'
        }
      }
      return {
        key: experiment.key,
        hypothesis: experiment.hypothesis,
        enabled: experiment.enabled,
        minPerVariant: experiment.minPerVariant,
        variants,
        pValue,
        verdict,
        winner,
      }
    })
  }
}
