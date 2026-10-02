export interface MatchCandidate {
  manufacturerProfileId: string
  printerId: string
  slotDate: string
  joinedDaysAgo: number
  completedJobs: number
  avgRating: number | null
  disputeRate: number
  onTimeRate: number | null
  activeJobs: number
  sameCity: boolean
  /** Paket V: what this maker is paid for the order (their own floor, TRY); null = legacy order */
  makerPayMinor: number | null
}

export interface ScoredCandidate extends MatchCandidate {
  score: number
  isExplorationPool: boolean
}

export interface Selection {
  candidate: ScoredCandidate
  isExploration: boolean
}

export type Rng = () => number
