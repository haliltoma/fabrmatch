import { test } from '@japa/runner'
import {
  isInExplorationPool,
  rankCandidates,
  scoreCandidate,
  seededRng,
} from '#services/matching/ranking'
import type { MatchCandidate } from '#services/matching/types'

const OPTS = { explorationRate: 0.2, explorationWindowDays: 30, explorationMaxCompletedJobs: 3 }

function candidate(id: number, overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    manufacturerProfileId: id,
    printerId: id * 10,
    slotDate: '2026-09-24',
    joinedDaysAgo: 365,
    completedJobs: 50,
    avgRating: 4.5,
    disputeRate: 0.02,
    onTimeRate: 0.95,
    activeJobs: 2,
    sameCity: false,
    ...overrides,
  }
}

test.group('ranking: scoreCandidate', () => {
  test('score is within [0,1] and uses PRD weights', ({ assert }) => {
    const perfect = candidate(1, {
      avgRating: 5,
      disputeRate: 0,
      onTimeRate: 1,
      sameCity: true,
      activeJobs: 0,
    })
    assert.closeTo(scoreCandidate(perfect), 1, 1e-9)

    const worst = candidate(2, {
      avgRating: 0,
      disputeRate: 1,
      onTimeRate: 0,
      sameCity: false,
      activeJobs: 1_000_000,
    })
    // only distance floor (0.5 × 0.20) remains, plus a vanishing load term
    assert.closeTo(scoreCandidate(worst), 0.1, 1e-3)
  })

  test('less loaded manufacturer scores higher, all else equal', ({ assert }) => {
    assert.isAbove(
      scoreCandidate(candidate(1, { activeJobs: 0 })),
      scoreCandidate(candidate(2, { activeJobs: 5 }))
    )
  })

  test('disputes lower the quality component', ({ assert }) => {
    assert.isAbove(
      scoreCandidate(candidate(1, { disputeRate: 0 })),
      scoreCandidate(candidate(2, { disputeRate: 0.3 }))
    )
  })

  test('manufacturer without history gets neutral priors, not zero', ({ assert }) => {
    const fresh = candidate(1, { avgRating: null, onTimeRate: null, completedJobs: 0 })
    assert.isAbove(scoreCandidate(fresh), 0.5)
  })
})

test.group('ranking: exploration pool', () => {
  test('new (≤30 days) with <3 completed jobs is in the pool', ({ assert }) => {
    assert.isTrue(isInExplorationPool(candidate(1, { joinedDaysAgo: 5, completedJobs: 0 }), OPTS))
    assert.isTrue(isInExplorationPool(candidate(1, { joinedDaysAgo: 30, completedJobs: 2 }), OPTS))
    assert.isFalse(isInExplorationPool(candidate(1, { joinedDaysAgo: 31, completedJobs: 0 }), OPTS))
    assert.isFalse(isInExplorationPool(candidate(1, { joinedDaysAgo: 5, completedJobs: 3 }), OPTS))
  })
})

test.group('ranking: rankCandidates', () => {
  test('empty candidate list yields no selection', ({ assert }) => {
    const { selection, ranked } = rankCandidates([], seededRng(1), OPTS)
    assert.isNull(selection)
    assert.lengthOf(ranked, 0)
  })

  test('same seed → same result (deterministic)', ({ assert }) => {
    const list = [
      candidate(1),
      candidate(2, { activeJobs: 0 }),
      candidate(3, { joinedDaysAgo: 3, completedJobs: 0, avgRating: null }),
    ]
    const a = Array.from({ length: 50 }, (_, i) => rankCandidates(list, seededRng(i), OPTS))
    const b = Array.from({ length: 50 }, (_, i) => rankCandidates(list, seededRng(i), OPTS))
    assert.deepEqual(
      a.map((r) => [r.selection?.candidate.manufacturerProfileId, r.selection?.isExploration]),
      b.map((r) => [r.selection?.candidate.manufacturerProfileId, r.selection?.isExploration])
    )
  })

  test('ranked output is sorted by score desc with id tie-break', ({ assert }) => {
    const { ranked } = rankCandidates(
      [candidate(3), candidate(1), candidate(2)],
      seededRng(7),
      OPTS
    )
    assert.deepEqual(
      ranked.map((c) => c.manufacturerProfileId),
      [1, 2, 3]
    )
  })

  test('exploit path picks the top score; explore path picks top of pool', ({ assert }) => {
    const veteran = candidate(1, { avgRating: 5, onTimeRate: 1, activeJobs: 0, sameCity: true })
    const newbie = candidate(2, { joinedDaysAgo: 2, completedJobs: 0, avgRating: null })
    const newbieBetter = candidate(3, {
      joinedDaysAgo: 2,
      completedJobs: 1,
      avgRating: null,
      sameCity: true,
    })

    const exploit = rankCandidates([veteran, newbie, newbieBetter], () => 0.99, OPTS)
    assert.equal(exploit.selection?.candidate.manufacturerProfileId, 1)
    assert.isFalse(exploit.selection?.isExploration)

    const explore = rankCandidates([veteran, newbie, newbieBetter], () => 0.01, OPTS)
    assert.equal(explore.selection?.candidate.manufacturerProfileId, 3)
    assert.isTrue(explore.selection?.isExploration)
  })

  test('no exploration when pool is empty', ({ assert }) => {
    const { selection } = rankCandidates([candidate(1), candidate(2)], () => 0, OPTS)
    assert.isFalse(selection?.isExploration)
  })

  test('10,000 simulated rounds → exploration share is 20% ± 2%', ({ assert }) => {
    const rng = seededRng(42)
    const list = [
      candidate(1, { avgRating: 5, onTimeRate: 1, activeJobs: 0 }),
      candidate(2),
      candidate(3, { joinedDaysAgo: 4, completedJobs: 0, avgRating: null, onTimeRate: null }),
    ]
    const N = 10_000
    let explored = 0
    let newbieWins = 0
    for (let i = 0; i < N; i++) {
      const { selection } = rankCandidates(list, rng, OPTS)
      if (selection?.isExploration) explored++
      if (selection?.candidate.manufacturerProfileId === 3) newbieWins++
    }
    assert.closeTo(explored / N, 0.2, 0.02)
    // Newbie never wins on score here, so every one of its offers comes from exploration.
    assert.equal(newbieWins, explored)
  })
})
