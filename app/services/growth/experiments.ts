export interface ExperimentDefinition {
  key: string
  /** what is being tested, in one line (shown to admins) */
  hypothesis: string
  variants: Array<{ name: string; weight: number }>
  /** each variant needs at least this many visitors before any result is called */
  minPerVariant: number
  enabled: boolean
}

/**
 * Message tests from docs/marketing.md §11. A variant may only say what is true today: no
 * integrations we do not have, no guarantees beyond what the escrow does.
 */
export const EXPERIMENTS: ExperimentDefinition[] = [
  {
    key: 'maker_headline',
    hypothesis:
      'Naming the payment protection in the headline gets more makers on the waiting list.',
    variants: [
      { name: 'A', weight: 1 },
      { name: 'B', weight: 1 },
    ],
    minPerVariant: 200,
    enabled: true,
  },
  {
    key: 'seller_headline',
    hypothesis: 'Saying "no stock" up front gets more sellers on the waiting list.',
    variants: [
      { name: 'A', weight: 1 },
      { name: 'B', weight: 1 },
    ],
    minPerVariant: 200,
    enabled: true,
  },
]

export const experimentByKey = (key: string) => EXPERIMENTS.find((e) => e.key === key) ?? null
