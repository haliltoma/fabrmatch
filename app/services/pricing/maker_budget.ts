/**
 * Paket V (K-V1): the maker budget of an order from the prices of the makers who could print it.
 * Pure. Every maker price here is that maker's floor for the whole order (maker_cost.ts), in TRY.
 */

export interface BudgetRules {
  /** share of makers whose floor the budget covers, basis points */
  coverageBps: number
  lowBps: number
  highBps: number
  minMakers: number
  fallbackBandBps: number
}

export interface MakerBudget {
  /** what the order pays makers; the buyer price is built on it */
  budgetMinor: number
  /** the range a quote shows, budget inside it */
  lowMinor: number
  highMinor: number
  /** how many makers' prices it was built from (0 = reference only) */
  makers: number
}

/** The value that `shareBps` of the sorted prices are at or below (the "covers p %" point). */
export function covering(sorted: number[], shareBps: number): number {
  const index = Math.ceil((sorted.length * shareBps) / 10_000) - 1
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)]
}

export function makerBudget(
  floors: number[],
  referenceMinor: number,
  rules: BudgetRules
): MakerBudget {
  const sorted = [...floors].sort((a, b) => a - b)
  if (sorted.length >= rules.minMakers) {
    const budgetMinor = covering(sorted, rules.coverageBps)
    return {
      budgetMinor,
      lowMinor: Math.min(covering(sorted, rules.lowBps), budgetMinor),
      highMinor: Math.max(covering(sorted, rules.highBps), budgetMinor),
      makers: sorted.length,
    }
  }
  // no market yet: the reference maker, raised to pay the known makers up to the band above it;
  // a maker asking more than that is not matched (one outlier must not set the price)
  const ceiling = Math.ceil((referenceMinor * (10_000 + rules.fallbackBandBps)) / 10_000)
  const budgetMinor = Math.max(referenceMinor, Math.min(Math.max(0, ...sorted), ceiling))
  return {
    budgetMinor,
    lowMinor: Math.min(budgetMinor, ...sorted),
    highMinor: ceiling,
    makers: sorted.length,
  }
}
