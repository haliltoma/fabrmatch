export interface MatchCandidate {
  manufacturerProfileId: number
  printerId: number
  slotDate: string
  joinedDaysAgo: number
  completedJobs: number
  avgRating: number | null
  disputeRate: number
  onTimeRate: number | null
  activeJobs: number
  sameCity: boolean
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
