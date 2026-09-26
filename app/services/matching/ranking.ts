import type { MatchCandidate, Rng, ScoredCandidate, Selection } from '#services/matching/types'

export interface RankingOptions {
  explorationRate: number
  explorationWindowDays: number
  explorationMaxCompletedJobs: number
}

// Neutral priors so manufacturers without history are not punished to zero.
const NEUTRAL_RATING = 3.5
const NEUTRAL_ON_TIME = 0.8

export function isInExplorationPool(c: MatchCandidate, opts: RankingOptions): boolean {
  return (
    c.joinedDaysAgo <= opts.explorationWindowDays &&
    c.completedJobs < opts.explorationMaxCompletedJobs
  )
}

export const SCORE_WEIGHTS = { quality: 0.35, onTime: 0.25, distance: 0.2, load: 0.2 } as const

/** The four parts of the score, each in [0,1], and their weighted total (shown to admins). */
export function scoreParts(c: MatchCandidate) {
  const rating = c.avgRating ?? NEUTRAL_RATING
  const quality = (rating / 5) * (1 - Math.min(Math.max(c.disputeRate, 0), 1))
  const onTime = c.onTimeRate ?? NEUTRAL_ON_TIME
  const distance = c.sameCity ? 1 : 0.5
  const load = 1 / (1 + Math.max(c.activeJobs, 0))
  const total =
    SCORE_WEIGHTS.quality * quality +
    SCORE_WEIGHTS.onTime * onTime +
    SCORE_WEIGHTS.distance * distance +
    SCORE_WEIGHTS.load * load
  return { quality, onTime, distance, load, total }
}

/** PRD §8: 0.35·quality + 0.25·on_time + 0.20·distance + 0.20·load_balance, each in [0,1]. */
export function scoreCandidate(c: MatchCandidate): number {
  return scoreParts(c).total
}

function byScoreDesc(a: ScoredCandidate, b: ScoredCandidate) {
  return b.score - a.score || a.manufacturerProfileId - b.manufacturerProfileId
}

export function rankCandidates(
  candidates: MatchCandidate[],
  rng: Rng,
  opts: RankingOptions
): { ranked: ScoredCandidate[]; selection: Selection | null } {
  const ranked = candidates
    .map((c) => ({
      ...c,
      score: scoreCandidate(c),
      isExplorationPool: isInExplorationPool(c, opts),
    }))
    .sort(byScoreDesc)

  if (ranked.length === 0) return { ranked, selection: null }

  const pool = ranked.filter((c) => c.isExplorationPool)
  // Always draw so the RNG stream is independent of pool size (reproducible simulations).
  const roll = rng()
  if (pool.length > 0 && roll < opts.explorationRate) {
    return { ranked, selection: { candidate: pool[0], isExploration: true } }
  }
  return { ranked, selection: { candidate: ranked[0], isExploration: false } }
}

/** Deterministic PRNG for tests/simulations. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
