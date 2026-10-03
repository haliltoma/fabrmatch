import app from '@adonisjs/core/services/app'
import env from '#start/env'

const fabrmatchConfig = {
  security: {
    requireAdminTwoFactor: env.get('ADMIN_2FA_REQUIRED', true),
    // local dev and a test server can skip e-mail verification; live production always requires it
    requireEmailVerification:
      (app.inProduction && !env.get('STAGING', false)) ||
      env.get('EMAIL_VERIFICATION_REQUIRED', true),
  },
  orders: {
    autoConfirmDays: 7,
    // D3 open: no carrier API yet, so shipped orders are assumed delivered after this
    autoDeliverDaysAfterShip: 14,
    productionSlaDays: 5,
    // paid but nobody accepted (`unmatched`) → cancelled and refunded automatically after this long
    unmatchedAutoCancelDays: 3,
    // Paket V (V6): a shop order still waiting for a maker this long → the seller is told once
    shopWaitingNoticeHours: 24,
  },
  matching: {
    // 1 = offers go out automatically after payment; 0 = an admin picks the maker in /admin/matching
    autoOffer: env.get('MATCHING_AUTO_OFFER', false) ? 1 : 0,
    maxRounds: 5,
    offerTtlMinutes: 30,
    explorationRate: 0.2,
    explorationWindowDays: 30,
    explorationMaxCompletedJobs: 3,
    // Paket V (V3): a maker may ask more than their offer, up to the order's maker budget
    counterOffers: 1,
    // how long an admin has to answer a counter-offer before the next maker is tried
    counterTtlMinutes: 120,
    // Paket Y: how long the buyer has to answer a maker's revision request
    revisionTtlMinutes: 2880,
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
  // R7: Fabrmatch buys the work from makers (sales model B). Rates change yearly: edit in /admin/settings.
  payouts: {
    // income tax withheld on the expense voucher of a home producer (GVK 94/13), basis points
    homeExemptWithholdingBps: 200,
    // GVK 9/6 home-production exemption, yearly sales limit (2026: 1,900,000 TRY)
    homeExemptAnnualCapMinor: 190_000_000,
  },
  pricing: {
    // Paket V (docs/PAKET_V_TARTISMA.md): makers earn cost + 25–30 %, so the platform takes 10 %
    commissionBps: 1000,
    // buffer added to the mid rate so a rate move between pricing and payout does not cost us
    fxMarginBps: 300,
    // a stored rate older than this is not used to price an order
    fxMaxAgeHours: 72,
    // Paket Y: each colour after the first, per piece (TRY minor), the maker's extra work
    extraColourMinor: 2000,
  },
  // Paket V: what a maker earns (cost × (1 + profit)) and the reference maker the platform prices
  // with until makers' own cost profiles take over. All editable in /admin/settings.
  makerPay: {
    minProfitBps: 2500,
    maxProfitBps: 3000,
    referenceHourlyRateMinor: 5000,
    referenceSetupMinor: 0,
    referenceWasteBps: 1000,
    referenceFailureBps: 500,
    // the fixed price pays enough for this share of the makers who could print the order
    quoteCoverageBps: 7500,
    // the range a quote shows: the makers' prices at these two points of the market
    quoteRangeLowBps: 2000,
    quoteRangeHighBps: 8000,
    // fewer makers than this: no market, price at the reference maker (or the dearest maker)…
    quoteMinMakers: 3,
    // …and the range reaches this far above it
    quoteFallbackBandBps: 1500,
    // V5: the most a maker may add for sending to another city (or abroad, once K-K opens)
    maxDistanceBps: 3000,
  },
}

export default fabrmatchConfig
