# Plan: Local currency display + regional pricing
Date: 2026-09-27
Status: PENDING (design approved: country→currency else USD; country groups; admin-set region pricing)

## Goal
Visitors see prices in their own currency, and each region (country group) is priced by its own admin-set rules instead of one global TRY price converted at the FX rate.

## Decisions (user, 2026-09-27)
- Display currency: user choice (cookie) > country (address, else Accept-Language region, e.g. en-GB→GBP) > language default (tr→TRY, otherwise USD).
- Regions: country groups (TR, EU, UK, US, Rest of world), admin-managed.
- Region price source: admin region settings (fee %, reference per-gram rate per material or multiplier, minimum order, shipping zone, rounding). Makers keep one rate; per-region maker rates = later (P3, not now).

## Tasks
### P1 — Display currency (no pricing change)
- [ ] T1 `resolveDisplayCurrency(ctx)` service + unit tests (cookie > address country > Accept-Language region > language default; only currencies with an FX rate, else TRY).
- [ ] T2 Share `displayCurrency` + needed FX rates via inertia_middleware share(); `/currency` POST to set the cookie (validator, functional test).
- [ ] T3 Frontend `useMoney()` helper: converts minor amounts with shared rates, integer math, "≈" marker when charge currency differs; replace hardcoded 'TRY' in hero_cube, discover, income/margin bands, quick-quote, shop cards.
- [ ] T4 Currency switcher next to LanguageSwitch (header, footer, panels); i18n strings; DESIGN.md §12 screenshots EN+TR at 4 widths.

### P2 — Regional pricing
- [ ] T5 Migration `pricing_regions` (code, name, currency, countries jsonb, platform_fee_bps, min_order_minor, rounding rule, shipping_zone_id, is_active) + `pricing_region_materials` (region, material, reference_rate_minor | multiplier_bps); seed TR/EU/UK/US/ROW; model + unit tests.
- [ ] T6 `RegionService.forCountry(country)` + buyer-region resolution (address country > display-currency country > TR).
- [ ] T7 Price engine takes a region: maker cost → region currency at locked FX, region fee, region shipping, region rounding; invariant tests (unit = parts, rounding never below cost, integer minor units, ledger balances). Orders store `pricing_region_id`.
- [ ] T8 Matching/quote: region without makers (cross-border off, K-K) → "no makers in your region yet" instead of a price; tests.
- [ ] T9 Admin `/admin/pricing-regions` CRUD (validator, transformer, audit log) + functional tests; UI per DESIGN.md.
- [ ] T10 Docs: tasks.md X-15 + new row, PROJECT_MEMORY log, commit+push per task.

## Success Criteria
- [ ] `node ace test`, `npm run typecheck`, lint, `i18n:check` green
- [ ] Existing TRY orders/ledger unchanged (regression suites)
- [ ] Browser screenshots EN/TR, 375/768/1024/1440
- [ ] Human partner approves output
