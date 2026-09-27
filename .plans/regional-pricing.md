# Plan: Local currency display + regional pricing
Date: 2026-09-27
Status: P1 + P2 DONE 2026-09-27 (design approved: country→currency else USD; country groups; admin-set region pricing)

## Goal
Visitors see prices in their own currency, and each region (country group) is priced by its own admin-set rules instead of one global TRY price converted at the FX rate.

## Decisions (user, 2026-09-27)
- Display currency: user choice (cookie) > country (address, else Accept-Language region, e.g. en-GB→GBP) > language default (tr→TRY, otherwise USD).
- Regions: country groups (TR, EU, UK, US, Rest of world), admin-managed.
- Region price source: admin region settings (fee %, reference per-gram rate per material or multiplier, minimum order, shipping zone, rounding). Makers keep one rate; per-region maker rates = later (P3, not now).

## Tasks
### P1 — Display currency (no pricing change)
- [x] T1 `resolveDisplayCurrency(ctx)` service + unit tests (cookie > address country > Accept-Language region > language default; only currencies with an FX rate, else TRY).
- [x] T2 Share `displayCurrency` + needed FX rates via inertia_middleware share(); `/currency` POST to set the cookie (validator, functional test).
- [x] T3 Frontend `useMoney()` helper: converts minor amounts with shared rates, integer math, "≈" marker when charge currency differs; replace hardcoded 'TRY' in hero_cube, discover, income/margin bands, quick-quote, shop cards.
- [x] T4 Currency switcher next to LanguageSwitch (header, footer, panels); i18n strings; DESIGN.md §12 screenshots EN+TR at 4 widths.

Notes P1: browse surfaces only (home animation, shop, product, quick quote, file quote, materials/cities/use cases, maker income tool) show `≈` converted prices + "You pay in TRY" note; carts, orders, wallets, payouts and panels stay in the charged currency. Switch sits in the public footer and mobile menu (not in panels). Shared prop is `money` (a `currency` page prop already exists on cart/stores).

### P2 — Regional pricing
- [x] T5 Migration `pricing_regions` (code, name, currency, countries jsonb, platform_fee_bps, min_order_minor, rounding rule, shipping_zone_id, is_active) + `pricing_region_materials` (region, material, reference_rate_minor | multiplier_bps); seed TR/EU/UK/US/ROW; model + unit tests.
- [x] T6 `RegionService.forCountry(country)` + buyer-region resolution (address country > display-currency country > TR).
- [x] T7 Price engine takes a region: maker cost → region currency at locked FX, region fee, region shipping, region rounding; invariant tests (unit = parts, rounding never below cost, integer minor units, ledger balances). Orders store `pricing_region_id`.
- [x] T8 Matching/quote: region without makers (cross-border off, K-K) → "no makers in your region yet" instead of a price; tests.
- [x] T9 Admin `/admin/pricing-regions` CRUD (validator, transformer, audit log) + functional tests; UI per DESIGN.md.
- [x] T10 Docs: tasks.md X-15 + new row, PROJECT_MEMORY log, commit+push per task.

Notes P2: region = delivery country (like shipping/VAT); seeded neutral (100%, global fee, no rounding/minimum). Order pricing, matching (maker ≤ regional reference), shop/product/home strip, instant price and file quote use it; browse country = cf-ipcountry > Accept-Language region > TR; cart default = last delivery country > visitor country, currency = region currency only if switched on. Rounding surplus → platform commission. Follow-up 2026-09-27: maker price hint now uses the maker's own region and counts only orders delivered in their country; use-case pages, the seller margin preview and the home margin band price for the visitor region; an EU order charged in EUR rounds in EUR with all parts adding up (test). Only open item: real EUR/GBP/USD charging needs the payment provider (iyzico marketplace / K-E) and the admin currency flags.

## Success Criteria
- [ ] `node ace test`, `npm run typecheck`, lint, `i18n:check` green
- [ ] Existing TRY orders/ledger unchanged (regression suites)
- [ ] Browser screenshots EN/TR, 375/768/1024/1440
- [ ] Human partner approves output
