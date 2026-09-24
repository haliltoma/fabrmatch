import env from '#start/env'

const fabrmatchConfig = {
  security: {
    requireAdminTwoFactor: env.get('ADMIN_2FA_REQUIRED', true),
  },
  orders: {
    autoConfirmDays: 7,
    // D3 open: no carrier API yet, so shipped orders are assumed delivered after this
    autoDeliverDaysAfterShip: 14,
    productionSlaDays: 5,
    // paid but nobody accepted (`unmatched`) → cancelled and refunded automatically after this long
    unmatchedAutoCancelDays: 3,
  },
  matching: {
    maxRounds: 5,
    offerTtlMinutes: 30,
    explorationRate: 0.2,
    explorationWindowDays: 30,
    explorationMaxCompletedJobs: 3,
  },
  // PRD §10: tier 0 → 1 → 2 is automatic, tier 3 (partner) is admin-only
  trust: {
    tier1MinJobs: 5,
    tier1MaxDisputePercent: 5,
    tier2MinJobs: 25,
    tier2MinRating: 4.5,
    // largest order total (minor units, TRY) a maker of that tier may be given; above tier2 needs partner (3)
    tier0MaxOrderMinor: 150_000,
    tier1MaxOrderMinor: 600_000,
    tier2MaxOrderMinor: 2_500_000,
  },
  // 0 = hidden in production; flip in /admin/settings when the feature is ready
  flags: {
    externalStores: 0,
    rfq: 0,
    crossBorder: 0,
    // pay in another currency: needs a payment provider that settles it (see PaymentProvider.supportedCurrencies)
    // invite a friend: needs the terms (D5) to say how rewards work before it is switched on
    referrals: 0,
    currencyUsd: 0,
    currencyEur: 0,
    currencyGbp: 0,
  },
  fraud: {
    // an account this young placing an order above the limit waits for an admin
    newAccountHours: 24,
    newAccountMaxOrderMinor: 100_000,
    ordersPerHour: 5,
  },
  referral: {
    // value of each reward coupon (TRY minor units); the platform fee still caps the real discount
    rewardMinor: 5000,
    // the friend's first order must reach this before anyone is rewarded
    minOrderMinor: 15_000,
    // rewards one member can earn in total
    maxRewards: 10,
    couponDays: 90,
  },
  pricing: {
    commissionBps: 1500,
    // buffer added to the mid rate so a rate move between pricing and payout does not cost us
    fxMarginBps: 300,
    // a stored rate older than this is not used to price an order
    fxMaxAgeHours: 72,
  },
}

export default fabrmatchConfig
