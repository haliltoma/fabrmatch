# Graph Report - fabrmatch  (2026-09-16)

## Corpus Check
- 290 files · ~65,081 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 10, .example 3, .css 1)

## Summary
- 1808 nodes · 2710 edges · 157 communities (109 shown, 48 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- main.py
- routes.ts
- request.tsx
- storefront/package.json
- manufacturer-network/package.json
- store/package.json
- api/package.json
- production_lifecycle.spec.ts
- serializers.ts
- adonisrc.ts
- dependencies
- devDependencies
- compilerOptions
- compilerOptions
- production-sync/index.ts
- webhook_delivery.ts
- compilerOptions
- env.ts
- admin/package.json
- vendor/package.json
- models/production_request.ts
- API Workspace Guide
- ProductionRequest
- compilerOptions
- compilerOptions
- compilerOptions
- store-data.ts
- match_engine.ts
- imports
- steps/create-production-requests.ts
- AccountPage.tsx
- CartPage.tsx
- mercur-custom.ts
- registry/index.ts
- fabrmatch-contract.ts
- VariantOfferPicker.tsx
- manufacturer.ts
- dependencies
- devDependencies
- Mercur Basic Template
- daily-reconciliation.ts
- disputes/route.ts
- 07 — Karar Geçmişi ve Değişim Günlüğü
- data.d.ts
- overrides
- tasks
- validators/user.ts
- production_lifecycle.ts
- Custom Pages
- Custom Pages
- resolutions
- dependencies
- record-payout-instruction.ts
- test.ts
- .mercur/routes.d.ts
- send-production-request.ts
- payout-provider.ts
- seed.ts
- BaseLayout.astro
- console.ts
- sweep_matching.ts
- devDependencies
- service.ts
- 00 — Fabrmatch Master PRD (Product Requirements Document)
- 2026-09-16
- matching_service.ts
- scripts
- 05 — PRD: Ödeme, Komisyon ve Escrow
- money
- inertia/tsconfig.json
- 06 — PRD: Tasarım Sistemi ve Tema (ZORUNLU REFERANS)
- 09 — API Sözleşmesi: Store ↔ Üretici Ağı
- scripts
- manufacturer-network/tsconfig.json
- Admin App Guide
- bundle-dashboards.mjs
- resolve/route.ts
- Custom Module
- storefront/tsconfig.json
- Fabrmatch — CLAUDE.md
- 01 — PRD: Storefront (Astro.js)
- 03 — PRD: Üretici Ağı (Sistem B — AdonisJS + Inertia + React + FastAPI)
- config/auth.ts
- api_provider.ts
- Mercur Marketplace Project
- aliases
- computeReleaseAt
- storefront-cache-revalidate.ts
- 02 — PRD: Marketplace Çekirdeği (Medusa.js v2 + Mercur 2.0)
- 3) Bileşen Kalıpları (bunlar dışında yeni bir kalıp icat edilmeden önce buraya eklenir)
- Faz 3 — Sistem B üretici ağı
- admin/eslint.config.js
- scripts
- packages/api/README.md
- Custom API Routes
- 04 — PRD: Güven, Adil Eşleştirme ve Dosya Koruma
- 08 — Obsidian Kullanım Rehberi (Proje Hafızası)
- 2026-09-15
- Faz 5 — Ödeme, escrow, uzlaştırma + uçtan uca test (tamamlandı)
- server/routes.d.ts
- allowScripts
- Custom CLI Script
- Astro Starter Kit: Minimal
- Fabrmatch geometri servisi
- ManufacturerActivate
- encryption.ts
- hash.ts
- React + TypeScript + Vite
- Migration20260915201010
- Migration20260915201103
- Migration20260915202939
- Migration20260916065310
- Migration20260916072456
- cors.ts
- shield.ts
- static.ts
- vite.ts
- overrides
- pnpm
- admin/tsconfig.json
- admin/vite.config.ts
- vendor/tsconfig.json
- vendor/vite.config.ts
- medusa-config.ts
- exports
- Custom Workflows
- store/tsconfig.json
- events.ts
- listeners.ts
- bodyparser.ts
- admin/src/i18n/index.ts
- vendor/src/i18n/index.ts
- engines
- http/README.md
- setup.js
- jest.config.js
- jobs/README.md
- fabrmatch-geometry

## God Nodes (most connected - your core abstractions)
1. `ProductionRequest` - 28 edges
2. `compilerOptions` - 22 edges
3. `compilerOptions` - 22 edges
4. `07 — Karar Geçmişi ve Değişim Günlüğü` - 21 edges
5. `Manufacturer` - 20 edges
6. `imports` - 20 edges
7. `ProductionSyncModuleService` - 20 edges
8. `MatchOffer` - 19 edges
9. `compilerOptions` - 19 edges
10. `compilerOptions` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Üretici ödemesi` --references--> `PayoutProvider`  [INFERRED]
  docs/gunlukler/2026-09-16.md → apps/store/packages/api/src/lib/payout-provider.ts
- `Anlaşmazlık modeli ve API` --references--> `attemptPayout()`  [INFERRED]
  docs/gunlukler/2026-09-16.md → apps/store/packages/api/src/workflows/steps/execute-payout.ts
- `Kapsam` --references--> `OrderGroupItem`  [INFERRED]
  docs/gunlukler/2026-09-16.md → apps/storefront/src/lib/mercur-custom.ts
- `Kapsam` --references--> `OrderGroupOrder`  [INFERRED]
  docs/gunlukler/2026-09-16.md → apps/storefront/src/lib/mercur-custom.ts
- `[2026-09-15] Geometri servisi: mesh tabanlı tahminci + Embree` --references--> `MaterialEstimate`  [INFERRED]
  docs/07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md → services/geometry/src/fabrmatch_geometry/schemas.py

## Import Cycles
- None detected.

## Communities (157 total, 48 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.06
Nodes (77): BaseModel, BaseSettings, Depends, File, fixture, Form, get, Header (+69 more)

### Community 1 - "routes.ts"
Cohesion: 0.05
Nodes (16): ParamValue, controllers, ProductionRequestsApiController, AuthMiddleware, ContainerBindingsMiddleware, GuestMiddleware, SilentAuthMiddleware, createProductionRequestValidator (+8 more)

### Community 2 - "request.tsx"
Cohesion: 0.08
Nodes (25): @adonisjs/inertia/types, ExtractProps, InertiaPages, date(), duration(), money(), STATUS_LABELS, statusLabel() (+17 more)

### Community 3 - "storefront/package.json"
Cohesion: 0.05
Nodes (37): allowScripts, esbuild, dependencies, astro, @astrojs/node, @astrojs/react, @medusajs/js-sdk, @medusajs/types (+29 more)

### Community 4 - "manufacturer-network/package.json"
Cohesion: 0.05
Nodes (36): engines, node, hotHook, boundaries, eslint, eslint-plugin-react-hooks, prettier, react (+28 more)

### Community 5 - "store/package.json"
Cohesion: 0.06
Nodes (33): eslint, eslint-plugin-react-hooks, prettier, react, react-dom, react-router-dom, @types/react, @types/react-dom (+25 more)

### Community 6 - "api/package.json"
Cohesion: 0.07
Nodes (27): author, description, engines, node, @types/node, keywords, license, name (+19 more)

### Community 7 - "production_lifecycle.spec.ts"
Cohesion: 0.20
Nodes (18): MatchOffer, MatchOfferStatus, SelectionReason, belongsTo, column, ScoreBreakdown, findByLineItem(), IntakePayload (+10 more)

### Community 8 - "serializers.ts"
Cohesion: 0.14
Nodes (17): ManufacturerOnboardingController, uniquePublicCode(), ACTIVE_STATUSES, PanelController, ProductionStepsController, findManufacturerForUser(), serializeJob(), serializeJobDetail() (+9 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @adonisjs/auth, @adonisjs/core, @adonisjs/cors, @adonisjs/inertia, @adonisjs/lucid, @adonisjs/queue, @adonisjs/redis (+17 more)

### Community 11 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, @adonisjs/assembler, @adonisjs/eslint-config, @adonisjs/prettier-config, @adonisjs/tsconfig, eslint, eslint-plugin-react, eslint-plugin-react-hooks (+17 more)

### Community 12 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, experimentalDecorators, jsx, lib, module, moduleDetection (+16 more)

### Community 13 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, experimentalDecorators, jsx, lib, module, moduleDetection (+16 more)

### Community 14 - "production-sync/index.ts"
Cohesion: 0.15
Nodes (16): PRODUCTION_SYNC_MODULE, ProductionSyncModuleService, ResolveDisputeInput, resolveDisputeWorkflow, attemptPayout(), ExecutePayoutInput, ExecutePayoutOutput, PayoutInstructionLike (+8 more)

### Community 15 - "webhook_delivery.ts"
Cohesion: 0.13
Nodes (16): DeliverWebhookEvent, DeliverWebhookEventPayload, SweepDueWebhooksPayload, DeliveryState, signedWebhookHeaders(), signPayload(), SIGNATURE_HEADER, TIMESTAMP_HEADER (+8 more)

### Community 16 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, checkJs, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, inlineSourceMap (+15 more)

### Community 17 - "env.ts"
Cohesion: 0.09
Nodes (14): ServiceAuthMiddleware, appUrl, http, dbConfig, @adonisjs/core/types, loggerConfig, LoggersList, @adonisjs/redis/types (+6 more)

### Community 18 - "admin/package.json"
Cohesion: 0.09
Nodes (21): dependencies, @mercurjs/admin, react, react-dom, react-router-dom, devDependencies, @types/node, react (+13 more)

### Community 19 - "vendor/package.json"
Cohesion: 0.09
Nodes (21): dependencies, @mercurjs/vendor, react, react-dom, react-router-dom, devDependencies, @types/node, react (+13 more)

### Community 20 - "models/production_request.ts"
Cohesion: 0.15
Nodes (14): WebhookEventsApiController, OutboundWebhookEvent, beforeCreate, belongsTo, column, PRODUCTION_STATUSES, ProductionStatus, ManufacturerAccount (+6 more)

### Community 21 - "API Workspace Guide"
Cohesion: 0.10
Nodes (18): Blocks and backend coupling, Dashboard wiring, Preferred patterns, Routing, Scope, Vendor App Guide, Verification, API Workspace Guide (+10 more)

### Community 22 - "ProductionRequest"
Cohesion: 0.11
Nodes (15): RegionCapabilityController, Manufacturer, belongsTo, column, hasMany, PayoutInstruction, PayoutInstructionStatus, beforeCreate (+7 more)

### Community 23 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 24 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 25 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, checkJs, disableSourceOfProjectReferenceRedirect, esModuleInterop, incremental, isolatedModules, lib (+12 more)

### Community 26 - "store-data.ts"
Cohesion: 0.17
Nodes (15): prices, ProductMetadata, Category, getDefaultRegion(), getProductByHandle(), listAllProducts(), listLeafCategories(), Product (+7 more)

### Community 27 - "match_engine.ts"
Cohesion: 0.18
Nodes (15): clamp(), estimatePayout(), hasReputationData(), isEligible(), jobGrams(), MatchCandidate, MatchDecision, MATCHING_RULES (+7 more)

### Community 28 - "imports"
Cohesion: 0.10
Nodes (20): imports, #abilities/*, #config/*, #controllers/*, #database/*, #events/*, #exceptions/*, #generated/* (+12 more)

### Community 29 - "steps/create-production-requests.ts"
Cohesion: 0.17
Nodes (14): config, releaseDuePayoutsJob(), errorMessage(), parsePrintEstimate(), config, orderPlacedProductionHandler(), createProductionRequestsWorkflow, ReleasePayoutInput (+6 more)

### Community 30 - "AccountPage.tsx"
Cohesion: 0.29
Nodes (16): AccountLink(), AccountPage(), onLogout(), AuthPage(), submit(), AUTH_CHANGED_EVENT, getSessionCustomer(), loginCustomer() (+8 more)

### Community 31 - "CartPage.tsx"
Cohesion: 0.16
Nodes (17): AddressFormState, Cart, CartPage(), placeOrder(), submitAddress(), updateQuantity(), Confirmation, emptyAddress (+9 more)

### Community 32 - "mercur-custom.ts"
Cohesion: 0.14
Nodes (16): OrderGroupDetail(), StatusBadge(), getOrderGroup(), ORDER_GROUP_FIELDS, OrderGroup, OrderGroupCompleteResponse, OrderGroupItem, OrderGroupOrder (+8 more)

### Community 33 - "registry/index.ts"
Cohesion: 0.18
Nodes (11): placeholder, registry, routes, @tuyau/core/types, UserRegistry, ApiDefinition, client, urlFor (+3 more)

### Community 34 - "fabrmatch-contract.ts"
Cohesion: 0.18
Nodes (15): verifyFabrmatchSignature(), DispatchResult, ManufacturerAccount, PrintEstimate, PRODUCTION_STATUS_RANK, ProductionRequestPayload, ProductionStatus, SIGNATURE_HEADER (+7 more)

### Community 35 - "VariantOfferPicker.tsx"
Cohesion: 0.20
Nodes (13): CartCount(), getOrCreateCartId(), matchesSelection(), Props, VariantOfferPicker(), addOffer(), CART_UPDATED_EVENT, getStoredCartId() (+5 more)

### Community 36 - "manufacturer.ts"
Cohesion: 0.22
Nodes (12): MANUFACTURER_STATUSES, ManufacturerStatus, User, ManufacturerSchema, MatchOfferSchema, OutboundWebhookEventSchema, PayoutInstructionSchema, ProductionRequestSchema (+4 more)

### Community 37 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @hookform/resolvers, jsonwebtoken, @medusajs/icons, @medusajs/ui, @mercurjs/client, @mercurjs/dashboard-sdk, @mercurjs/dashboard-shared (+10 more)

### Community 38 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, ajv, esbuild, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+10 more)

### Community 39 - "Mercur Basic Template"
Cohesion: 0.11
Nodes (17): Adding Blocks, AI agents, API Routes, Apps and Packages, Build, Clone, Development, How It Works (+9 more)

### Community 40 - "daily-reconciliation.ts"
Cohesion: 0.15
Nodes (10): HttpExceptionHandler, config, dailyReconciliationJob(), fetchSistemBWebhookEvents(), buildReconciliationReport(), ReconciliationResult, SistemBWebhookEvent, event() (+2 more)

### Community 41 - "disputes/route.ts"
Cohesion: 0.18
Nodes (11): POST(), OpenDisputeInput, openDisputeWorkflow, CreateDisputeInput, createDisputeStep, HoldPayoutForDisputeInput, HoldPayoutForDisputeOutput, holdPayoutForDisputeStep (+3 more)

### Community 42 - "07 — Karar Geçmişi ve Değişim Günlüğü"
Cohesion: 0.12
Nodes (17): 07 — Karar Geçmişi ve Değişim Günlüğü, [2026-09-15] Akış 1'e opsiyonel `print_estimate` eklendi, [2026-09-15] API sözleşmesi v1 netleştirildi (09), [2026-09-15] Depo düzeni ve hafıza altyapısı kuruldu, [2026-09-15] Geometri servisi: mesh tabanlı tahminci + Embree, [2026-09-15] İki Sistem Mimarisine Geçiş, [2026-09-15] Marka Adı: Printloop → Fabrmatch, [2026-09-15] Mercur Geri Alındı (2.0 sürümüyle) (+9 more)

### Community 43 - "data.d.ts"
Cohesion: 0.15
Nodes (10): Data, FlashMessages, SharedProps, User, Variants, @adonisjs/inertia/types, InertiaMiddleware, MiddlewareSharedProps (+2 more)

### Community 44 - "overrides"
Cohesion: 0.23
Nodes (16): overrides, @medusajs/admin-sdk, @medusajs/admin-shared, @medusajs/cli, @medusajs/core-flows, @medusajs/dashboard, @medusajs/draft-order, @medusajs/framework (+8 more)

### Community 45 - "tasks"
Cohesion: 0.12
Nodes (15): dependsOn, env, inputs, outputs, dependsOn, cache, persistent, dependsOn (+7 more)

### Community 46 - "validators/user.ts"
Cohesion: 0.16
Nodes (6): NewAccountController, SessionController, email(), loginValidator, password(), signupValidator

### Community 47 - "production_lifecycle.ts"
Cohesion: 0.32
Nodes (10): OfferActionsController, acceptOffer(), advanceProduction(), afterCommit(), ALLOWED_FROM, declineOffer(), InvalidTransitionException, lockOwnedRequest() (+2 more)

### Community 48 - "Custom Pages"
Cohesion: 0.14
Nodes (13): 1. Create a Page File, 2. File-Based Routing, 3. Add a Sidebar Menu Item, 4. Add Data Loading, 5. Add Route Metadata, Config Options, Custom fields, section displays & list tables — `src/custom-fields/*.tsx`, Custom Pages (+5 more)

### Community 49 - "Custom Pages"
Cohesion: 0.14
Nodes (13): 1. Create a Page File, 2. File-Based Routing, 3. Add a Sidebar Menu Item, 4. Add Data Loading, 5. Add Route Metadata, Config Options, Custom fields, section displays & list tables — `src/custom-fields/*.tsx`, Custom Pages (+5 more)

### Community 50 - "resolutions"
Cohesion: 0.14
Nodes (14): resolutions, @medusajs/admin-sdk, @medusajs/admin-shared, @medusajs/cli, @medusajs/core-flows, @medusajs/dashboard, @medusajs/draft-order, @medusajs/framework (+6 more)

### Community 51 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, http-proxy-middleware, @medusajs/admin-sdk, @medusajs/admin-shared, @medusajs/cli, @medusajs/core-flows, @medusajs/dashboard, @medusajs/draft-order (+6 more)

### Community 52 - "record-payout-instruction.ts"
Cohesion: 0.22
Nodes (10): ProductionStatusWebhookSchema, POST(), applyProductionStatusWorkflow, RecordInboundWebhookEventInput, recordInboundWebhookEventStep, RecordPayoutInstructionInput, RecordPayoutInstructionOutput, recordPayoutInstructionStep (+2 more)

### Community 53 - "test.ts"
Cohesion: 0.15
Nodes (9): APP_ROOT, plugins, runnerHooks, @adonisjs/core, @japa/api-client, @japa/assert, @japa/browser-client, @japa/plugin-adonisjs (+1 more)

### Community 54 - ".mercur/routes.d.ts"
Cohesion: 0.21
Nodes (4): client, client, Routes, @mercurjs/client

### Community 55 - "send-production-request.ts"
Cohesion: 0.32
Nodes (8): config, retryProductionDispatchJob(), sendProductionRequest(), dispatchProductionRequestWorkflow, recordDispatchResultStep, SendProductionRequestInput, SendProductionRequestOutput, sendProductionRequestStep

### Community 56 - "payout-provider.ts"
Cohesion: 0.29
Nodes (10): createStripeConnectPayoutProvider(), getPayoutProvider(), manualPayoutProvider, PAYOUT_RELEASE_WINDOW_HOURS, PayoutRequest, PayoutResult, setPayoutProviderForTesting(), toMinorUnits() (+2 more)

### Community 57 - "seed.ts"
Cohesion: 0.18
Nodes (11): ALL_COUNTRIES, CATALOG, CatalogItem, CATEGORY_TREE, COLORS, convert(), MATERIALS, REGIONS (+3 more)

### Community 58 - "BaseLayout.astro"
Cohesion: 0.17
Nodes (3): sellerSignupUrl, year, prerender

### Community 59 - "console.ts"
Cohesion: 0.22
Nodes (3): APP_ROOT, APP_ROOT, @poppinss/ts-exec

### Community 60 - "sweep_matching.ts"
Cohesion: 0.29
Nodes (8): SweepDueWebhooks, SweepMatching, SweepMatchingPayload, expireStaleOffers(), retryUnmatchedRequests(), Uygulama Durumu (2026-09-16), [2026-09-16] Sistem B zamanlaması: `@boringnode/queue` cron desteği, Zamanlanmış işler (Faz 3 kapanışı)

### Community 61 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @acme/admin, @acme/vendor, jest, @medusajs/test-utils, prop-types, @swc/core, @swc/jest (+3 more)

### Community 62 - "service.ts"
Cohesion: 0.27
Nodes (5): Dispute, InboundWebhookEvent, PayoutInstruction, ProductionRequest, ReconciliationReport

### Community 64 - "00 — Fabrmatch Master PRD (Product Requirements Document)"
Cohesion: 0.18
Nodes (11): 00 — Fabrmatch Master PRD (Product Requirements Document), 1) Ürün Vizyonu, 2) Kullanıcı Personaları, 3) Mimari Karar Kaydı (ADR — Architecture Decision Record), 4.1) Uygulama Durumu (2026-09-16), 4) Kapsam (Scope), 5) Başarı Metrikleri (henüz taslak — ilk veri geldikçe netleşecek), 6) Modül PRD'leri (bu dosyanın altında detaylanır) (+3 more)

### Community 65 - "2026-09-16"
Cohesion: 0.18
Nodes (11): 2026-09-16, Bilinçli ertelenen, Bilinçli kapsam dışı, Doğrulama, Faz 4 — Astro storefront (başlıyor), Faz 4 — Astro storefront (çekirdek tamamlandı), Faz 5 sonrası — Storefront hesap girişi + sipariş takibi, Karşılaşılan hatalar (düzeltildi) (+3 more)

### Community 66 - "matching_service.ts"
Cohesion: 0.31
Nodes (6): MatchProductionRequest, MatchProductionRequestPayload, ACTIVE_WORK_STATUSES, buildCandidates(), buildJob(), matchProductionRequest()

### Community 67 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, cloud:prebuild, codegen, dev, seed, start, test:integration:http (+2 more)

### Community 68 - "05 — PRD: Ödeme, Komisyon ve Escrow"
Cohesion: 0.20
Nodes (9): PayoutProvider, 05 — PRD: Ödeme, Komisyon ve Escrow, Başarı Kriterleri, Hedefler, Kapsam DAHİLİNDE, Kapsam DIŞINDA, Problem, Uygulama Durumu (2026-09-16) (+1 more)

### Community 69 - "money"
Cohesion: 0.31
Nodes (6): CustomDesignForm(), MATERIALS, AnalysisResult, ManufacturabilityIssue, duration(), money()

### Community 70 - "inertia/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, module, paths, extends, include, @generated/*, @adonisjs/tsconfig/tsconfig.client.json

### Community 71 - "06 — PRD: Tasarım Sistemi ve Tema (ZORUNLU REFERANS)"
Cohesion: 0.22
Nodes (8): 06 — PRD: Tasarım Sistemi ve Tema (ZORUNLU REFERANS), 1) Renk Paleti (KESİN DEĞERLER — başka yeşil tonu icat edilmez), 2) Tipografi Kuralları, 4) İkon Kütüphanesi Kuralı, 5) Kesinlikle YAPILMAYACAKLAR, 6) Yeni Bir Şey Eklerken Kontrol Listesi (her PR/değişiklik öncesi), Neden Bu Dosya Var, Uygulama Talimatı — Claude Code'un Bunu Her Zaman Hatırlaması İçin

### Community 72 - "09 — API Sözleşmesi: Store ↔ Üretici Ağı"
Cohesion: 0.22
Nodes (9): 09 — API Sözleşmesi: Store ↔ Üretici Ağı, AI Kodlama Asistanına Talimat, Akış 1 — Sipariş Oluştuğunda (Sistem A → Sistem B), Akış 2 — Üretim Durumu Değiştiğinde (Sistem B → Sistem A, webhook), Akış 3 — Günlük Uzlaştırma (Sistem A → Sistem B), Akış 4 — Bölgesel Üretici Verisi (Sistem B → Sistem A, periyodik), Güvenlik Kuralları, Temel Prensip (+1 more)

### Community 73 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, format, lint, start, test, typecheck

### Community 74 - "manufacturer-network/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, outDir, rootDir, extends, references, @adonisjs/tsconfig/tsconfig.app.json

### Community 75 - "Admin App Guide"
Cohesion: 0.25
Nodes (7): Admin App Guide, Dashboard wiring, Preferred patterns, Routing, Scope, Verification, Which skill to use

### Community 76 - "bundle-dashboards.mjs"
Cohesion: 0.25
Nodes (6): apiDir, artifactDir, artifactPkg, artifactPkgPath, PANELS, repoRoot

### Community 77 - "resolve/route.ts"
Cohesion: 0.32
Nodes (5): POST(), CreateDisputeSchema, disputeMiddlewares, ResolveDisputeSchema, productionStatusWebhookMiddlewares

### Community 78 - "Custom Module"
Cohesion: 0.25
Nodes (7): 1. Create a Data Model, 2. Create a Service, 3. Export Module Definition, 4. Add Module to Medusa's Configurations, 5. Generate and Run Migrations, Custom Module, Use Module

### Community 79 - "storefront/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, jsxImportSource, exclude, extends, include, astro/tsconfigs/strict

### Community 80 - "Fabrmatch — CLAUDE.md"
Cohesion: 0.25
Nodes (7): Depo düzeni, Fabrmatch — CLAUDE.md, Kod grafiği, Proje hafızası — ZORUNLU, Sistemler arası sözleşme — ZORUNLU, Tasarım kuralları — ZORUNLU, Yerel altyapı

### Community 81 - "01 — PRD: Storefront (Astro.js)"
Cohesion: 0.25
Nodes (8): 01 — PRD: Storefront (Astro.js), Başarı Kriterleri, Hedefler, Kapsam DAHİLİNDE, Kapsam DIŞINDA (bu PRD'de değil), Problem, Teknik Yaklaşım, Uygulama Durumu (2026-09-16)

### Community 82 - "03 — PRD: Üretici Ağı (Sistem B — AdonisJS + Inertia + React + FastAPI)"
Cohesion: 0.25
Nodes (8): 03 — PRD: Üretici Ağı (Sistem B — AdonisJS + Inertia + React + FastAPI), Başarı Kriterleri, Hedefler, Kapsam DAHİLİNDE, Kapsam DIŞINDA, Notlar, Problem, Teknik Yaklaşım

### Community 83 - "config/auth.ts"
Cohesion: 0.29
Nodes (6): @adonisjs/auth/types, @adonisjs/core/types, authConfig, Authenticators, EventsList, @adonisjs/auth

### Community 84 - "api_provider.ts"
Cohesion: 0.29
Nodes (5): @adonisjs/core/http, ApiSerializer, HttpContext, serialize, serializer

### Community 85 - "Mercur Marketplace Project"
Cohesion: 0.29
Nodes (6): Configuration Files, Documentation, Getting Started, Mercur Marketplace Project, Project Structure, Read the docs first

### Community 86 - "aliases"
Cohesion: 0.29
Nodes (6): aliases, admin, api, vendor, registries, $schema

### Community 87 - "computeReleaseAt"
Cohesion: 0.29
Nodes (7): computeReleaseAt(), [2026-09-16] Anlaşmazlık çözüm süreci: escrow'a gerçek bir bekleme penceresi eklendi, Anlaşmazlık modeli ve API, Anlaşmazlık çözüm süreci (Faz 5 sonrası ek iş, tamamlandı), Bilinçli ertelenen, Doğrulama, Escrow penceresi

### Community 88 - "storefront-cache-revalidate.ts"
Cohesion: 0.38
Nodes (6): buildTags(), config, EventPayload, resolveProductHandle(), storefrontCacheRevalidateHandler(), @medusajs/framework

### Community 89 - "02 — PRD: Marketplace Çekirdeği (Medusa.js v2 + Mercur 2.0)"
Cohesion: 0.29
Nodes (7): 02 — PRD: Marketplace Çekirdeği (Medusa.js v2 + Mercur 2.0), Başarı Kriterleri, Hedefler, Kapsam DAHİLİNDE, Kapsam DIŞINDA, Problem, Teknik Yaklaşım

### Community 90 - "3) Bileşen Kalıpları (bunlar dışında yeni bir kalıp icat edilmeden önce buraya eklenir)"
Cohesion: 0.29
Nodes (7): 3) Bileşen Kalıpları (bunlar dışında yeni bir kalıp icat edilmeden önce buraya eklenir), 3D önizleme rozeti (ürün kartlarında), Birincil buton (CTA), Durum rozeti (sipariş/sipariş kalemi durumu — 2026-09-16 eklendi), Giriş kartı (B2C / B2B ayrımı — Sistem A anasayfa), Güven şeridi (anasayfa, 3 sütun — her zaman dengeli, biri öne çıkmaz), Malzeme verimliliği çubuğu (ürün detay sayfası — ZORUNLU her zaman görünür)

### Community 91 - "Faz 3 — Sistem B üretici ağı"
Cohesion: 0.29
Nodes (7): Altyapı, Eşleştirme motoru ([[04-PRD-GUVEN-VE-KALITE]]), Faz 3 — Sistem B üretici ağı, Sözleşme uçları ([[09-API-SOZLESMESI]]), Test durumu, Veri modeli, Üretici paneli (Inertia + React, [[06-PRD-TASARIM-SISTEMI]])

### Community 92 - "admin/eslint.config.js"
Cohesion: 0.53
Nodes (4): @eslint/js, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 93 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, check-types, dev, format, lint

### Community 94 - "packages/api/README.md"
Cohesion: 0.33
Nodes (5): Community & Contributions, Compatibility, Getting Started, Other channels, What is Medusa

### Community 95 - "Custom API Routes"
Cohesion: 0.33
Nodes (5): Custom API Routes, Middleware, Parameters, Supported HTTP methods, Using the container

### Community 96 - "04 — PRD: Güven, Adil Eşleştirme ve Dosya Koruma"
Cohesion: 0.33
Nodes (6): 04 — PRD: Güven, Adil Eşleştirme ve Dosya Koruma, Başarı Kriterleri, Hedefler, Kapsam DAHİLİNDE, Kapsam DIŞINDA, Problem

### Community 97 - "08 — Obsidian Kullanım Rehberi (Proje Hafızası)"
Cohesion: 0.33
Nodes (6): 08 — Obsidian Kullanım Rehberi (Proje Hafızası), Claude Code + Graphify ile Birlikte Çalışma Akışı, Neden İki Ayrı Dosya (Master PRD + Günlük) ve Tek Dosya Değil, Obsidian'da Bağlantı (Backlink) Kullanımı, Vault Yapısı, Üç Katmanlı Hafıza Modeli

### Community 98 - "2026-09-15"
Cohesion: 0.33
Nodes (6): 2026-09-15, Doğrulanan sürümler, Faz 0 — repo iskeleti ve hafıza altyapısı, Faz 1 — Sistem A (çekirdek tamamlandı), Faz 2 — Geometri servisi (tamamlandı), Faz 3 hazırlık

### Community 99 - "Faz 5 — Ödeme, escrow, uzlaştırma + uçtan uca test (tamamlandı)"
Cohesion: 0.33
Nodes (6): Faz 5 — Ödeme, escrow, uzlaştırma + uçtan uca test (tamamlandı), Günlük uzlaştırma, Komisyon, Test durumu, Uçtan uca doğrulama (üç gerçek servis, gerçek tarayıcı), Üretici ödemesi

### Community 100 - "server/routes.d.ts"
Cohesion: 0.50
Nodes (4): @adonisjs/core/types/http, ParamValue, RoutesList, ScannedRoutes

### Community 101 - "allowScripts"
Cohesion: 0.40
Nodes (5): allowScripts, better-sqlite3, esbuild, fsevents, @swc/core

### Community 102 - "Custom CLI Script"
Cohesion: 0.40
Nodes (4): Custom CLI Script, Custom CLI Script Arguments, How to Create a Custom CLI Script?, How to Run Custom CLI Script?

### Community 103 - "Astro Starter Kit: Minimal"
Cohesion: 0.40
Nodes (4): Astro Starter Kit: Minimal, 🧞 Commands, 🚀 Project Structure, 👀 Want to learn more?

### Community 104 - "Fabrmatch geometri servisi"
Cohesion: 0.40
Nodes (4): Fabrmatch geometri servisi, Tahmin modeli, Uçlar, Çalıştırma

### Community 106 - "encryption.ts"
Cohesion: 0.50
Nodes (3): @adonisjs/core/types, encryptionConfig, EncryptorsList

### Community 107 - "hash.ts"
Cohesion: 0.50
Nodes (3): @adonisjs/core/types, hashConfig, HashersList

### Community 108 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 125 - "overrides"
Cohesion: 0.67
Nodes (3): eslint, overrides, eslint-plugin-react

### Community 126 - "pnpm"
Cohesion: 0.67
Nodes (3): eslint-plugin-react>eslint, pnpm, overrides

### Community 132 - "exports"
Cohesion: 0.67
Nodes (3): exports, ./_generated, types

## Knowledge Gaps
- **840 isolated node(s):** `Data`, `User`, `Variants`, `SharedProps`, `FlashMessages` (+835 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1032 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `07 — Karar Geçmişi ve Değişim Günlüğü` connect `07 — Karar Geçmişi ve Değişim Günlüğü` to `05 — PRD: Ödeme, Komisyon ve Escrow`, `computeReleaseAt`, `sweep_matching.ts`, `00-MASTER-PRD.md`, `CartPage.tsx`?**
  _High betweenness centrality (0.266) - this node is a cross-community bridge._
- **Why does `[2026-09-16] Sistem B zamanlaması: `@boringnode/queue` cron desteği` connect `sweep_matching.ts` to `07 — Karar Geçmişi ve Değişim Günlüğü`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `[2026-09-16] Anlaşmazlık çözüm süreci: escrow'a gerçek bir bekleme penceresi eklendi` connect `computeReleaseAt` to `07 — Karar Geçmişi ve Değişim Günlüğü`, `production-sync/index.ts`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **What connects `Data`, `User`, `Variants` to the rest of the system?**
  _840 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05568039950062422 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054693877551020405 - nodes in this community are weakly interconnected._
- **Should `request.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._