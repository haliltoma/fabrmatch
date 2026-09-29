# Graph Report - fabrmatch-adonis  (2026-09-27)

## Corpus Check
- Large corpus: 959 files · ~807,450 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4432 nodes · 14778 edges · 199 communities (129 shown, 70 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 223 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- helpers: order fixtures + rfq http.spec
- pages: index + show
- services: ledger service + admin users audit.spec
- database: 1790170000000 create payments tables + 17901176482
- services: matching service + matching effects
- components: card + index
- pages: quick quote + stl viewer
- pages: index + index
- components: sheet + theme
- services: quick quote + shipping service
- database: schema + consent
- transformers: order transformer + packing slip service
- lib: journey + print journey
- services: store service + role middleware
- services: printer service + capacity service
- services: notification service + catalog
- services: ranking + settings service
- pages: show + index
- pages: index + product image
- services: rfq invite service + rfq service
- services: pricing region service + admin pricing region cont
- services: dashboard service + auth
- transformers: store transformer + external stores.spec
- services: file access service + file access grant
- helpers: fake shops + shopify adapter
- controllers: onboarding controller + onboarding service
- lib: display money + index
- services: growth service + marketing controller
- services: webhook service + webhook url
- services: coupon service + admin coupon controller
- services: fx provider + fx service
- services: order service + order state machine
- services: etsy adapter + etsy oauth service
- jobs: expire stale offers + reconcile payments
- services: content service + content controller
- services: fake store adapter + shopify adapter
- middleware: inertia middleware + display currency
- services: referral service + lifecycle service
- services: financial report service + tax report service
- controllers: storefront controller + tool controller
- services: rfq service + rfq controller
- components: payee payout + stores
- services: mesh parser + analyze model file
- services: pagination + admin order controller
- services: queue monitor service + health service
- services: carrier provider + fake carrier
- services: branding service + seller branding controller
- services: payout document service + tax reports.spec
- services: dispute service + dispute controller
- services: message service + order message controller
- services: price engine + home stats service
- services: payment service + payment return controller
- services: model renderer + product image service
- services: order pricing + slice estimate service
- services: invoice service + invoice controller
- services: finishing service + admin finishing controller
- validators: order + dispute transformer
- services: api key service + api key middleware
- helpers: fake iyzico + iyzico client
- controllers: seller insight controller + seller analytics se
- services: webhook service + seller developer controller
- services: fulfillment service + auto confirm delivery
- services: payee profile service + iban
- services: order notifier + catalog
- functional: seller wallet.spec + admin matching http.spec
- services: experiment service + experiments
- services: reference catalog service + admin reference catalo
- services: storefront service + city page service
- services: legal service + status controller
- services: provider + iyzico provider
- services: file scanner + clamav live.spec
- services: encryption service + key rotation service
- services: tax treatment + payout service
- services: slicer + cli slicer
- services: dfm analyzer + stl analyzer.spec
- services: iyzico client + iyzico provider
- services: two factor service + two factor middleware
- services: launch readiness service + admin launch controller
- services: trust tier service + admin maker controller
- controllers: auth security controller + auth security servic
- controllers: maker work controller + maker work service
- services: seller product service + seller product controller
- config: encryption + logger
- controllers: account security controller + user session serv
- controllers: seller payout controller + payout transformer
- models: verification token + two factor service.spec
- services: stl analyzer + model renderer.spec
- services: openapi + api controller
- services: model file service + model file controller
- controllers: seller wallet controller + wallet service
- services: test checkout service + test checkout controller
- transformers: seller product transformer + seller product
- services: printer model defaults + printer service
- validators: account security + limiter
- controllers: admin catalog controller + catalog service
- controllers: admin print profile controller + print profile 
- services: totp service + totp service.spec
- services: iyzico provider + sub merchant directory
- tests: bootstrap + session
- inertia: client + app
- services: privacy service + account privacy controller
- services: fraud service + admin queue controller
- contracts: store adapter contract + store adapter
- transformers: payee tax profile transformer + admin payout c
- services: queue service + admin queue controller
- services: content report service + content report controller
- services: catalog service + category
- database: schema + content report
- contracts: payment provider contract + fake provider
- controllers: admin payout controller
- controllers: admin queue controller
- controllers: admin user controller + user admin service
- services: landing service + session controller
- controllers: admin category controller + category service
- controllers: product image controller + product image
- controllers: seller store controller
- services: print profile service + slice model file
- services: provider call store + iyzico provider
- services: provider + payment service
- database: demo meshes + demo seeder
- middleware: initialize bouncer middleware + main
- services: support service + support controller
- controllers: order controller
- services: qc photo service
- services: shipping table + shipping service
- inertia: tsconfig.json
- controllers: admin metrics controller + metrics service
- services: shop photo service + maker work controller
- database: 1790510000000 create finishing options + 179059000
- services: provider registry + payment deploy guard.spec
- pages: performance
- services: chargeback service + admin queue controller
- controllers: maker performance controller + earnings service
- validators: printer + printer controller
- validators: seller product + seller product controller
- controllers: two factor challenge controller + two factor ht
- jobs: ping + ping job.spec
- middleware: feature middleware + feature flags
- models: coupon redemption + support request
- services: print profile defaults + 1790250000000 create prin
- services: reference defaults + 1790230000000 create material
- services: shipping defaults + 1790240000000 create shipping 
- database: 1790630000000 create payee tax and documents
- database: 1790670000000 seller wallet
- controllers: cart controller
- config: mail
- validators: model file + model file controller
- exceptions: handler
- middleware: stateless return middleware
- models: finishing option + schema
- config: drive
- config: hash
- database: 1790160000000 create orders tables
- start: routes
- middleware: container bindings middleware
- middleware: silent auth middleware
- models: payment webhook + schema
- models: setting + schema
- models: slice estimate + schema
- models: two factor backup code + schema
- config: cache
- config: cors
- config: static
- config: vite
- unit: cube story.spec
- unit: journey.spec

## God Nodes (most connected - your core abstractions)
1. `useT()` - 326 edges
2. `User` - 145 edges
3. `createUser()` - 125 edges
4. `DomainError` - 115 edges
5. `Order` - 115 edges
6. `RoleService` - 104 edges
7. `OrderService` - 91 edges
8. `Button` - 81 edges
9. `StoreConnection` - 76 edges
10. `PaymentService` - 76 edges

## Surprising Connections (you probably didn't know these)
- `AuditLog` --inherits--> `AuditLogSchema`  [EXTRACTED]
  app/models/audit_log.ts → database/schema.ts
- `CartItem` --inherits--> `CartItemSchema`  [EXTRACTED]
  app/models/cart_item.ts → database/schema.ts
- `Category` --inherits--> `CategorySchema`  [EXTRACTED]
  app/models/category.ts → database/schema.ts
- `Chargeback` --inherits--> `ChargebackSchema`  [EXTRACTED]
  app/models/chargeback.ts → database/schema.ts
- `Color` --inherits--> `ColorSchema`  [EXTRACTED]
  app/models/color.ts → database/schema.ts

## Import Cycles
- None detected.

## Communities (199 total, 70 thin omitted)

### Community 0 - "helpers: order fixtures + rfq http.spec"
Cohesion: 0.04
Nodes (92): ManufacturerProfileData, SellerProfileData, RoleService, CartService, Config, DEFAULTS, live, bodyParserConfig (+84 more)

### Community 1 - "pages: index + show"
Cohesion: 0.02
Nodes (132): LayerStepper(), StepperEntry, postJson(), uploadDisputeEvidence(), formatDateTime(), formatMoney(), intlLocale(), currentLocale() (+124 more)

### Community 2 - "services: ledger service + admin users audit.spec"
Cohesion: 0.04
Nodes (76): AuditLog, Chargeback, Dispute, DisputeResolution, DisputeStatus, DisputeEvidence, belongsTo, hasMany (+68 more)

### Community 3 - "database: 1790170000000 create payments tables + 17901176482"
Cohesion: 0.02
Nodes (8): ProfileStatus, WeeklySchedule, WalletMovement, dbConfig, LEDGER_ACCOUNTS, ADDRESS, PRODUCTS, ref_adonisjs_lucid

### Community 4 - "services: matching service + matching effects"
Cohesion: 0.05
Nodes (56): ExpireOffer, ExpireOfferPayload, RunMatchingRound, RunMatchingRoundPayload, MatchOffer, MatchOfferStatus, belongsTo, OrderItem (+48 more)

### Community 5 - "components: card + index"
Cohesion: 0.07
Nodes (70): PageHeader(), LOOK, RfqStatus(), Badge(), BadgeProps, badgeVariants, Card, CardContent (+62 more)

### Community 6 - "pages: quick quote + stl viewer"
Cohesion: 0.03
Nodes (73): inertiaConfig, Audience, AUDIENCES, AudienceTabs(), Step, ClosingBand(), CountUp(), countryName() (+65 more)

### Community 7 - "pages: index + index"
Cohesion: 0.05
Nodes (70): EmptyState(), faceFor(), FACES, MakerSetup(), Setup, SetupChecklist(), SetupStep, Amount (+62 more)

### Community 8 - "components: sheet + theme"
Cohesion: 0.06
Nodes (61): CartLink(), LanguageSwitch(), Logo(), NotificationBell(), OPTIONS, ThemeSwitch(), Avatar, AvatarFallback (+53 more)

### Community 9 - "services: quick quote + shipping service"
Cohesion: 0.08
Nodes (39): AdminShippingController, priceValidator, QuoteController, MarginOption, ShopImage, ScanCheck, USE_CASES, UseCaseDefinition (+31 more)

### Community 10 - "database: schema + consent"
Cohesion: 0.08
Nodes (66): Consent, AuditLogSchema, CapacitySlotSchema, CarrierEventSchema, CartItemSchema, CatalogProductSchema, CategorySchema, ChargebackSchema (+58 more)

### Community 11 - "transformers: order transformer + packing slip service"
Cohesion: 0.06
Nodes (32): payStep(), SellerOrderController, JobQcPhoto, ProductionJob, ProductionJobStatus, belongsTo, hasMany, CONTENT_TYPES (+24 more)

### Community 12 - "lib: journey + print journey"
Cohesion: 0.06
Nodes (54): ART, clamp(), ease(), FaceFrame(), HeroCube(), kindFor(), margin(), OrderFace() (+46 more)

### Community 13 - "services: store service + role middleware"
Cohesion: 0.07
Nodes (17): etsyCategories(), StoreWebhookController, POLICIES, RoleMiddleware, Role, hasMany, hasOne, User (+9 more)

### Community 14 - "services: printer service + capacity service"
Cohesion: 0.06
Nodes (27): CapacityController, toIsoDate(), PrinterController, CapacitySlot, belongsTo, column, dateTime, PrinterMaterial (+19 more)

### Community 15 - "services: notification service + catalog"
Cohesion: 0.07
Nodes (26): NotificationController, preferenceValidator, SendNotificationEmail, NotificationMail, NotificationMailData, Notification, money(), NOTIFICATION_TYPES (+18 more)

### Community 16 - "services: ranking + settings service"
Cohesion: 0.06
Nodes (27): AdminMatchingController, AdminSettingsController, resetValidator, updateValidator, EligibilityExplainer, MatchSuggestionService, byScoreDesc(), isInExplorationPool() (+19 more)

### Community 17 - "pages: show + index"
Cohesion: 0.05
Nodes (48): CloseLabel(), inertia_components_ui_dialog_dialog, DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle (+40 more)

### Community 18 - "pages: index + product image"
Cohesion: 0.06
Nodes (42): ChargeNote(), PaintColour, PaintColourField(), ProductGallery(), ProductThumb(), ShopImage, sizeLabel(), TermsCheckbox() (+34 more)

### Community 19 - "services: rfq invite service + rfq service"
Cohesion: 0.08
Nodes (30): AnalysisStatus, ModelFile, ModelFileFormat, belongsTo, column, dateTime, RfqBid, Rfq (+22 more)

### Community 20 - "services: pricing region service + admin pricing region cont"
Cohesion: 0.08
Nodes (23): AdminPricingRegionController, FormInput, toChanges(), PricingRegionMaterial, PricingRegion, column, hasMany, MissedOrdersService (+15 more)

### Community 21 - "services: dashboard service + auth"
Cohesion: 0.06
Nodes (27): AdminDashboardController, SellerDashboardController, VerifiedMiddleware, SellerProfile, belongsTo, column, dateTime, hasMany (+19 more)

### Community 22 - "transformers: store transformer + external stores.spec"
Cohesion: 0.07
Nodes (32): connectValidator, listValidator, mapValidator, publishValidator, unpublishValidator, ExternalListing, belongsTo, ExternalOrder (+24 more)

### Community 23 - "services: file access service + file access grant"
Cohesion: 0.07
Nodes (22): FileAccessGrant, belongsTo, column, dateTime, FileDownloadLog, belongsTo, column, dateTime (+14 more)

### Community 24 - "helpers: fake shops + shopify adapter"
Cohesion: 0.09
Nodes (20): FAKE_STORE_SIGNATURE_HEADER, escapeHtml(), numericId(), SHOPIFY_API_VERSION, ShopifyOrder, decimalPrice(), PublishInput, PublishResult (+12 more)

### Community 25 - "controllers: onboarding controller + onboarding service"
Cohesion: 0.07
Nodes (16): OnboardingController, AuthMiddleware, IdempotencyMiddleware, OnboardingMiddleware, ProfileMiddleware, ThrottleMiddleware, ThrottleOptions, INTENDED_URL (+8 more)

### Community 26 - "lib: display money + index"
Cohesion: 0.07
Nodes (30): CurrencySwitch(), Reveal(), WaitlistForm(), active, activeMoney(), convertPrice(), setActiveMoney(), SharedMoney (+22 more)

### Community 27 - "services: growth service + marketing controller"
Cohesion: 0.10
Nodes (16): AdminGrowthController, MarketingController, waitlistValidator, AttributionMiddleware, Lead, MarketingEvent, Attribution, clean() (+8 more)

### Community 28 - "services: webhook service + webhook url"
Cohesion: 0.10
Nodes (29): WebhookDelivery, WebhookEndpoint, safeStoreHttp(), StoreHttpRequest, StoreHttpResponse, BACKOFF_MINUTES, DISABLE_AFTER_FAILURES, MAX_ATTEMPTS (+21 more)

### Community 29 - "services: coupon service + admin coupon controller"
Cohesion: 0.10
Nodes (19): AdminCouponController, toMinor(), CartItem, belongsTo, Coupon, Referral, normalizeReferralCode(), REFERRAL_CODE (+11 more)

### Community 30 - "services: fx provider + fx service"
Cohesion: 0.11
Nodes (21): CurrencyController, validator, BASE_CURRENCY, decimalToMicro(), FOREIGN_CURRENCIES, ForeignCurrency, isForeignCurrency(), FxProvider (+13 more)

### Community 31 - "services: order service + order state machine"
Cohesion: 0.11
Nodes (18): OrderChannel, OrderStatus, requiredTierForTotal(), OrderInputError, CreateDraftInput, generateOrderCode(), OrderService, OrderStateMachine (+10 more)

### Community 32 - "services: etsy adapter + etsy oauth service"
Cohesion: 0.11
Nodes (13): apiKey(), ETSY_API, ETSY_SCOPES, EtsyAdapter, etsyConfigured(), EtsyReceipt, exchangeToken(), form() (+5 more)

### Community 33 - "jobs: expire stale offers + reconcile payments"
Cohesion: 0.10
Nodes (18): AutoConfirmDelivery, CancelStaleUnmatched, CheckProductionSla, CloseRfqs, DeliverWebhooks, ExpireStaleOffers, IssueInvoices, PollStoreOrders (+10 more)

### Community 34 - "services: content service + content controller"
Cohesion: 0.09
Nodes (16): ContentController, siteUrl(), HomeController, MaterialPageController, siteUrl(), Material, ContentEntry, ContentKind (+8 more)

### Community 35 - "services: fake store adapter + shopify adapter"
Cohesion: 0.12
Nodes (6): StoreConnection, FakeStoreAdapter, gid(), ShopifyAdapter, StoreAdapter, WooCommerceAdapter

### Community 36 - "middleware: inertia middleware + display currency"
Cohesion: 0.10
Nodes (22): LanguageController, validator, @adonisjs/inertia/types, InertiaMiddleware, MiddlewareSharedProps, SharedProps, isLocale(), Locale (+14 more)

### Community 37 - "services: referral service + lifecycle service"
Cohesion: 0.10
Nodes (10): AccountReferralController, NewAccountController, RunLifecycle, randomCode(), ReferralService, LifecycleService, email(), loginValidator (+2 more)

### Community 38 - "services: financial report service + tax report service"
Cohesion: 0.16
Nodes (18): AdminReportController, monthValidator, periodFrom(), csvCell(), minorToDecimal(), toCsv(), FinancialReportService, monthPeriod() (+10 more)

### Community 39 - "controllers: storefront controller + tool controller"
Cohesion: 0.11
Nodes (14): siteUrl(), StorefrontController, DEFAULTS, ToolController, validator, siteUrl(), UseCasePageController, CoverageService (+6 more)

### Community 40 - "services: rfq service + rfq controller"
Cohesion: 0.10
Nodes (11): bidView(), MakerRfqController, resolver(), resolver(), RfqController, RfqBidService, rfqCode(), RfqError (+3 more)

### Community 41 - "components: payee payout + stores"
Cohesion: 0.09
Nodes (21): minorToInput(), parseMoneyToMinor(), MoneyInput(), InvoiceForm(), PayeePayout(), PayeePayoutProps, PayeeProfile, PayoutDocument (+13 more)

### Community 42 - "services: mesh parser + analyze model file"
Cohesion: 0.11
Nodes (21): AnalyzeModelFile, AnalyzeModelFilePayload, ModelFormat, apply(), attrs(), compose(), IDENTITY, Matrix (+13 more)

### Community 43 - "services: pagination + admin order controller"
Cohesion: 0.12
Nodes (12): AdminAuditController, validator, AdminOrderController, listValidator, AuditSearchService, OrderHealthService, DEFAULT_PER_PAGE, MAX_PER_PAGE (+4 more)

### Community 44 - "services: queue monitor service + health service"
Cohesion: 0.11
Nodes (12): AdminQueueMonitorController, runAgainValidator, HealthController, HealthReport, HealthService, QUEUE_WAITING_LIMIT, WEBHOOK_LAG_MINUTES, failedIndexKey() (+4 more)

### Community 45 - "services: carrier provider + fake carrier"
Cohesion: 0.16
Nodes (12): CarrierWebhookController, CarrierEvent, CarrierProvider, CarrierStatus, InvalidCarrierSignatureError, Label, LabelRequest, CarrierOutcome (+4 more)

### Community 46 - "services: branding service + seller branding controller"
Cohesion: 0.13
Nodes (9): SellerBrandingController, validator, DomainError, Color, BrandingError, BrandingService, clean(), logoType() (+1 more)

### Community 47 - "services: payout document service + tax reports.spec"
Cohesion: 0.13
Nodes (15): PayoutDocument, belongsTo, Payout, belongsTo, hasOne, Payee, escapeHtml(), format() (+7 more)

### Community 49 - "services: dispute service + dispute controller"
Cohesion: 0.13
Nodes (5): AdminDisputeController, DisputeController, DisputeError, DisputeService, verifyEvidenceObject()

### Community 50 - "services: message service + order message controller"
Cohesion: 0.14
Nodes (13): AdminMessageController, MakerOrderMessageController, OrderMessageController, sendValidator, OrderMessage, FilterResult, maskContactDetails(), maskPhoneLike() (+5 more)

### Community 51 - "services: price engine + home stats service"
Cohesion: 0.13
Nodes (17): FAQ, validator, HOME_MIN_MAKERS, HOME_MIN_RATINGS, HomeStats, HomeStatsService, estimateMakerIncome(), MakerIncomeEstimate (+9 more)

### Community 52 - "services: payment service + payment return controller"
Cohesion: 0.15
Nodes (5): PaymentReturnController, PaymentWebhookController, PaymentError, PaymentService, checkout()

### Community 53 - "services: model renderer + product image service"
Cohesion: 0.11
Nodes (21): Payload, RenderModelFile, ProductImageService, toShopImage(), cross(), DEFAULT_ANGLES, DEFAULT_COLOR, dot() (+13 more)

### Community 54 - "services: order pricing + slice estimate service"
Cohesion: 0.13
Nodes (18): SliceModelFile, convertItems(), PricedItem, PricedOrder, priceOrder(), roundItems(), scaleBbox(), slicedNumbers() (+10 more)

### Community 55 - "services: invoice service + invoice controller"
Cohesion: 0.16
Nodes (8): InvoiceController, Invoice, belongsTo, FakeInvoiceProvider, InvoiceService, InvoiceDraft, InvoiceProvider, InvoiceTransformer

### Community 56 - "services: finishing service + admin finishing controller"
Cohesion: 0.13
Nodes (7): AdminFinishingController, MakerFinishingController, FinishingError, FinishingService, finishingCreateValidator, finishingUpdateValidator, makerFinishingValidator

### Community 57 - "validators: order + dispute transformer"
Cohesion: 0.12
Nodes (16): DisputeTransformer, evidenceOf(), cartAddValidator, cartCheckoutValidator, cartQuantityValidator, createOrderValidator, CURRENCIES, evidenceUploadValidator (+8 more)

### Community 58 - "services: api key service + api key middleware"
Cohesion: 0.15
Nodes (12): @adonisjs/core/http, ApiKeyMiddleware, HttpContext, ApiKey, ApiKeyError, ApiKeyService, hashKey(), MAX_ACTIVE_KEYS (+4 more)

### Community 59 - "helpers: fake iyzico + iyzico client"
Cohesion: 0.14
Nodes (14): authorization(), fromPrice(), IyzicoCredentials, IyzicoTransport, sameHex(), IYZICO_SIGNATURE_HEADER, MemoryProviderCallStore, validIdentityNumber() (+6 more)

### Community 60 - "controllers: seller insight controller + seller analytics se"
Cohesion: 0.12
Nodes (13): analyticsValidator, previewValidator, SellerInsightController, MarginPreviewService, Amount, SellerAnalytics, SellerAnalyticsService, sendStatement() (+5 more)

### Community 61 - "services: webhook service + seller developer controller"
Cohesion: 0.16
Nodes (3): SellerDeveloperController, now(), WebhookService

### Community 62 - "services: fulfillment service + auto confirm delivery"
Cohesion: 0.20
Nodes (4): dispatchPayoutRelease(), FulfillmentError, FulfillmentService, shipped()

### Community 63 - "services: payee profile service + iban"
Cohesion: 0.19
Nodes (12): isValidIban(), LENGTHS, maskIban(), normalizeIban(), isValidTckn(), isValidVkn(), documentType(), PayeeProfileError (+4 more)

### Community 65 - "functional: seller wallet.spec + admin matching http.spec"
Cohesion: 0.11
Nodes (14): setPaymentProvider(), inertia, paidOrder(), quiet, flags, inertia, ledger, wallets (+6 more)

### Community 66 - "services: experiment service + experiments"
Cohesion: 0.17
Nodes (10): AdminExperimentController, ExperimentResult, ExperimentService, normalCdf(), twoProportionP(), VariantResult, experimentByKey(), ExperimentDefinition (+2 more)

### Community 67 - "services: reference catalog service + admin reference catalo"
Cohesion: 0.17
Nodes (6): AdminReferenceCatalogController, colorValidator, materialValidator, toggleValidator, ReferenceCatalogError, ReferenceCatalogService

### Community 68 - "services: storefront service + city page service"
Cohesion: 0.17
Nodes (8): CityPageController, siteUrl(), cityKey(), CityPage, CityPageService, MIN_MAKERS_FOR_CITY_PAGE, slugify(), StorefrontService

### Community 69 - "services: legal service + status controller"
Cohesion: 0.16
Nodes (10): LegalController, ALARM_LABELS, StatusController, requestLocale(), ACCEPTANCE_VERSION, escapeHtml(), inline(), LEGAL_DOCS (+2 more)

### Community 70 - "services: provider + iyzico provider"
Cohesion: 0.16
Nodes (12): CheckoutFormResult, countryName(), ItemTransaction, iyzicoAddress(), summary(), ApproveItemRequest, CheckoutAddress, CheckoutBuyer (+4 more)

### Community 71 - "services: file scanner + clamav live.spec"
Cohesion: 0.15
Nodes (18): ACTIVE_MARKERS, ASCII_STL_LINE, checkObj(), checkStl(), checkZip(), clamavScan(), EICAR, EXECUTABLE_SIGNATURES (+10 more)

### Community 72 - "services: encryption service + key rotation service"
Cohesion: 0.19
Nodes (5): deriveKey(), ENCRYPTED_COLUMNS, EncryptionService, KeyRotationService, RotationReport

### Community 73 - "services: tax treatment + payout service"
Cohesion: 0.17
Nodes (13): PAYEE_TAX_STATUSES, PayeeSplit, saleBreakdown(), splitPayeeShare(), TaxTreatment, treatmentFor(), PayoutError, splitGross() (+5 more)

### Community 74 - "services: slicer + cli slicer"
Cohesion: 0.22
Nodes (11): CliSlicer, run, FakeSlicer, configuredSlicer(), SlicedNumbers, parseGcodeStats(), Slicer, SlicerError (+3 more)

### Community 75 - "services: dfm analyzer + stl analyzer.spec"
Cohesion: 0.18
Nodes (13): analyzeDfm(), betterOrientation(), countBodies(), cross(), DfmLevel, DfmTriangle, heightOf(), ORIENTATIONS (+5 more)

### Community 76 - "services: iyzico client + iyzico provider"
Cohesion: 0.19
Nodes (6): IyzicoClient, IyzicoError, toPrice(), IyzicoPaymentProvider, RefundRequest, WebhookEvent

### Community 77 - "services: two factor service + two factor middleware"
Cohesion: 0.22
Nodes (7): TwoFactorMiddleware, hashCode(), newBackupCode(), normalise(), TwoFactorError, TwoFactorService, enrolled()

### Community 78 - "services: launch readiness service + admin launch controller"
Cohesion: 0.20
Nodes (11): AdminLaunchController, evaluateLaunch(), LaunchCheck, LaunchInputs, LaunchReadinessService, local(), MIN_PAYABLE_MAKERS, PaymentRuntime (+3 more)

### Community 79 - "services: trust tier service + admin maker controller"
Cohesion: 0.18
Nodes (8): AdminMakerController, tierValidator, ManufacturerStats, computeTier(), MAX_TIER, TierChange, TrustTierError, TrustTierService

### Community 80 - "controllers: auth security controller + auth security servic"
Cohesion: 0.18
Nodes (5): AuthSecurityController, AuthSecurityService, forgotPasswordValidator, resetPasswordValidator, verifyEmailValidator

### Community 81 - "controllers: maker work controller + maker work service"
Cohesion: 0.20
Nodes (3): MakerDashboardController, MakerWorkController, MakerWorkService

### Community 82 - "services: seller product service + seller product controller"
Cohesion: 0.20
Nodes (6): SellerProductController, SellerProduct, belongsTo, column, dateTime, SellerProductService

### Community 83 - "config: encryption + logger"
Cohesion: 0.11
Nodes (11): appUrl, http, @adonisjs/core/types, encryptionConfig, EncryptorsList, @adonisjs/core/types, loggerConfig, LoggersList (+3 more)

### Community 84 - "controllers: account security controller + user session serv"
Cohesion: 0.15
Nodes (3): AccountSecurityController, UserSessionMiddleware, UserSessionService

### Community 85 - "controllers: seller payout controller + payout transformer"
Cohesion: 0.18
Nodes (9): MakerPayoutController, invoiceValidator, PayoutPageError, profileValidator, SellerPayoutController, PayeeType, companyDetails(), documentOf() (+1 more)

### Community 86 - "models: verification token + two factor service.spec"
Cohesion: 0.18
Nodes (9): UserSession, TokenType, belongsTo, column, dateTime, VerificationToken, describeDevice(), service (+1 more)

### Community 87 - "services: stl analyzer + model renderer.spec"
Cohesion: 0.21
Nodes (12): DfmIssue, hasBlocker(), analyzeStl(), analyzeTriangles(), isBinaryStl(), isManifold(), parseAsciiStl(), parseBinaryStl() (+4 more)

### Community 88 - "services: openapi + api controller"
Cohesion: 0.14
Nodes (11): ApiController, ErrorBody, errors, money(), openApiDocument(), ORDER_SCHEMA, ORDER_STATUSES, OrderItem (+3 more)

### Community 90 - "controllers: seller wallet controller + wallet service"
Cohesion: 0.13
Nodes (6): autoPayValidator, SellerWalletController, topUpValidator, MAX_TOP_UP_MINOR, MIN_TOP_UP_MINOR, WalletService

### Community 91 - "services: test checkout service + test checkout controller"
Cohesion: 0.24
Nodes (5): TestCheckoutController, TEST_CARD, TestCheckoutError, TestCheckoutService, testCardValidator

### Community 92 - "transformers: seller product transformer + seller product"
Cohesion: 0.15
Nodes (8): CatalogProduct, belongsTo, column, dateTime, SellerProductStatus, Reason, CreateSellerProductData, SellerProductTransformer

### Community 93 - "services: printer model defaults + printer service"
Cohesion: 0.19
Nodes (7): PrinterModel, PrinterTechnology, DEFAULT_PRINTER_MODELS, DefaultPrinterModel, CreateMaterialData, CreatePrinterData, PricingItemInput

### Community 94 - "validators: account security + limiter"
Cohesion: 0.22
Nodes (9): TWO_FACTOR_PENDING, TWO_FACTOR_PENDING_MINUTES, changePasswordValidator, codeValidator, disableTwoFactorValidator, @adonisjs/limiter/types, limiterConfig, LimitersList (+1 more)

### Community 95 - "controllers: admin catalog controller + catalog service"
Cohesion: 0.27
Nodes (5): AdminCatalogController, usableModelFile(), CatalogService, createCatalogProductValidator, updateCatalogProductValidator

### Community 96 - "controllers: admin print profile controller + print profile "
Cohesion: 0.20
Nodes (4): AdminPrintProfileController, createValidator, toggleValidator, PrintProfileService

### Community 97 - "services: totp service + totp service.spec"
Cohesion: 0.21
Nodes (7): base32Decode(), base32Encode(), TotpService, RFC-6238, totp, RFC-6238, userWithTwoFactor()

### Community 98 - "services: iyzico provider + sub merchant directory"
Cohesion: 0.18
Nodes (4): IyzicoSubMerchantInput, SubMerchantDirectory, DbSubMerchantDirectory, MemorySubMerchantDirectory

### Community 99 - "tests: bootstrap + session"
Cohesion: 0.14
Nodes (10): sessionConfig, shieldConfig, ref_adonisjs_session, ref_adonisjs_shield, ref_japa_api_client, ref_japa_assert, ref_japa_browser_client, ref_japa_plugin_adonisjs (+2 more)

### Community 100 - "inertia: client + app"
Cohesion: 0.22
Nodes (9): adonisjs_client_registry_index, adonisjs_client_registry_index_registry, client, urlFor, inertia_css_app, withLayout(), render(), ref_react_dom (+1 more)

### Community 101 - "services: privacy service + account privacy controller"
Cohesion: 0.24
Nodes (4): AccountPrivacyController, deleteValidator, PrivacyError, PrivacyService

### Community 103 - "contracts: store adapter contract + store adapter"
Cohesion: 0.24
Nodes (5): IncomingOrder, ShippingAddress, order, storeAdapterContract(), StoreHarness

### Community 104 - "transformers: payee tax profile transformer + admin payout c"
Cohesion: 0.26
Nodes (7): decisionValidator, paidValidator, PayeeProfileStatus, PayeeTaxProfile, PayeeTaxStatus, mask(), PayeeTaxProfileTransformer

### Community 105 - "services: queue service + admin queue controller"
Cohesion: 0.33
Nodes (3): AdminQueueService, QueueError, fraudCount()

### Community 106 - "services: content report service + content report controller"
Cohesion: 0.21
Nodes (5): ContentReportController, validator, ContentReportError, ContentReportService, REPORT_REASONS

### Community 107 - "services: catalog service + category"
Cohesion: 0.27
Nodes (6): Category, CreateCatalogData, normaliseScales(), normaliseTags(), CategoryError, idsOf()

### Community 108 - "database: schema + content report"
Cohesion: 0.18
Nodes (8): ContentReport, FraudFlag, NotificationPreference, RfqInvite, ContentReportSchema, FraudFlagSchema, NotificationPreferenceSchema, RfqInviteSchema

### Community 109 - "contracts: payment provider contract + fake provider"
Cohesion: 0.24
Nodes (4): WebhookEventType, buyerDetails, paymentProviderContract(), ProviderHarness

### Community 111 - "controllers: admin queue controller"
Cohesion: 0.18
Nodes (6): ackValidator, AdminQueueController, chargebackValidator, fraudDecisionValidator, makerValidator, reportDecisionValidator

### Community 112 - "controllers: admin user controller + user admin service"
Cohesion: 0.25
Nodes (5): AdminUserController, searchValidator, suspendValidator, UserAdminError, UserAdminService

### Community 113 - "services: landing service + session controller"
Cohesion: 0.24
Nodes (4): SessionController, GuestMiddleware, LandingService, redirectAfterSignIn()

### Community 114 - "controllers: admin category controller + category service"
Cohesion: 0.24
Nodes (4): AdminCategoryController, createValidator, toggleValidator, CategoryService

### Community 115 - "controllers: product image controller + product image"
Cohesion: 0.29
Nodes (5): ProductImageController, ProductImage, ProductImageKind, ProductImageStatus, belongsTo

### Community 117 - "services: print profile service + slice model file"
Cohesion: 0.27
Nodes (4): Payload, PrintProfile, PrintProfileError, Technology

### Community 118 - "services: provider call store + iyzico provider"
Cohesion: 0.27
Nodes (5): IyzicoOptions, CallOutcomeUnknownError, DbProviderCallStore, isDefiniteFailure(), ProviderCallStore

### Community 120 - "database: demo meshes + demo seeder"
Cohesion: 0.22
Nodes (6): demoMeshFor(), SHAPES, toBinaryStl(), Tri, V, DemoSeeder

### Community 121 - "middleware: initialize bouncer middleware + main"
Cohesion: 0.22
Nodes (6): adonisjs_server_policies, adonisjs_server_policies_policies, editUser, @adonisjs/core/http, HttpContext, InitializeBouncerMiddleware

### Community 122 - "services: support service + support controller"
Cohesion: 0.25
Nodes (3): SupportController, SupportError, SupportService

### Community 126 - "inertia: tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, module, paths, extends, include, @generated/*, @adonisjs/tsconfig/tsconfig.client.json

### Community 127 - "controllers: admin metrics controller + metrics service"
Cohesion: 0.32
Nodes (4): AdminMetricsController, validator, Metrics, MetricsService

### Community 130 - "services: provider registry + payment deploy guard.spec"
Cohesion: 0.43
Nodes (5): PaymentNotConfiguredError, assertPaymentConfigured(), currentPaymentRuntime(), IyzicoRuntime, base

### Community 131 - "pages: performance"
Cohesion: 0.32
Nodes (7): MakerPerformance(), minutes(), percent(), Requirement, Scorecard, TIER_ACCESS, TIER_NAMES

### Community 134 - "validators: printer + printer controller"
Cohesion: 0.52
Nodes (5): createMaterialValidator, createPrinterValidator, profilesValidator, updateMaterialValidator, updatePrinterValidator

### Community 135 - "validators: seller product + seller product controller"
Cohesion: 0.47
Nodes (3): sampleOrderValidator, createSellerProductValidator, updateSellerProductValidator

### Community 136 - "controllers: two factor challenge controller + two factor ht"
Cohesion: 0.47
Nodes (3): TwoFactorChallengeController, twoFactorThrottleKey(), clearThrottle()

### Community 138 - "middleware: feature middleware + feature flags"
Cohesion: 0.60
Nodes (3): FeatureMiddleware, featureEnabled(), FeatureName

### Community 139 - "models: coupon redemption + support request"
Cohesion: 0.40
Nodes (4): CouponRedemption, SupportRequest, CouponRedemptionSchema, SupportRequestSchema

### Community 147 - "config: mail"
Cohesion: 0.40
Nodes (4): @adonisjs/mail/types, mailConfig, MailersList, smtpUser

### Community 151 - "models: finishing option + schema"
Cohesion: 0.67
Nodes (3): FinishingOption, column, FinishingOptionSchema

### Community 152 - "config: drive"
Cohesion: 0.50
Nodes (3): @adonisjs/drive/types, driveConfig, DriveDisks

### Community 153 - "config: hash"
Cohesion: 0.50
Nodes (3): @adonisjs/core/types, hashConfig, HashersList

## Knowledge Gaps
- **667 isolated node(s):** `editUser`, `deleteValidator`, `validator`, `createValidator`, `toggleValidator` (+662 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DomainError` connect `services: branding service + seller branding controller` to `services: shop photo service + maker work controller`, `helpers: order fixtures + rfq http.spec`, `services: ledger service + admin users audit.spec`, `services: provider registry + payment deploy guard.spec`, `services: matching service + matching effects`, `services: chargeback service + admin queue controller`, `services: quick quote + shipping service`, `transformers: order transformer + packing slip service`, `services: store service + role middleware`, `services: printer service + capacity service`, `services: ranking + settings service`, `services: rfq invite service + rfq service`, `services: pricing region service + admin pricing region cont`, `transformers: store transformer + external stores.spec`, `services: file access service + file access grant`, `helpers: fake shops + shopify adapter`, `services: growth service + marketing controller`, `services: webhook service + webhook url`, `services: coupon service + admin coupon controller`, `services: fx provider + fx service`, `services: order service + order state machine`, `services: etsy adapter + etsy oauth service`, `services: rfq service + rfq controller`, `services: queue monitor service + health service`, `services: carrier provider + fake carrier`, `services: payout document service + tax reports.spec`, `services: dispute service + dispute controller`, `services: message service + order message controller`, `services: payment service + payment return controller`, `services: order pricing + slice estimate service`, `services: finishing service + admin finishing controller`, `services: api key service + api key middleware`, `helpers: fake iyzico + iyzico client`, `services: fulfillment service + auto confirm delivery`, `services: payee profile service + iban`, `services: reference catalog service + admin reference catalo`, `services: legal service + status controller`, `services: provider + iyzico provider`, `services: tax treatment + payout service`, `services: iyzico client + iyzico provider`, `services: two factor service + two factor middleware`, `services: trust tier service + admin maker controller`, `controllers: seller payout controller + payout transformer`, `services: test checkout service + test checkout controller`, `transformers: seller product transformer + seller product`, `services: printer model defaults + printer service`, `services: iyzico provider + sub merchant directory`, `services: privacy service + account privacy controller`, `services: fraud service + admin queue controller`, `services: queue service + admin queue controller`, `services: content report service + content report controller`, `services: catalog service + category`, `controllers: admin user controller + user admin service`, `services: print profile service + slice model file`, `services: provider call store + iyzico provider`, `services: support service + support controller`, `services: qc photo service`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `User` connect `services: store service + role middleware` to `helpers: order fixtures + rfq http.spec`, `services: ledger service + admin users audit.spec`, `database: 1790170000000 create payments tables + 17901176482`, `services: matching service + matching effects`, `services: quick quote + shipping service`, `transformers: order transformer + packing slip service`, `services: printer service + capacity service`, `services: notification service + catalog`, `services: rfq invite service + rfq service`, `services: dashboard service + auth`, `transformers: store transformer + external stores.spec`, `services: file access service + file access grant`, `controllers: onboarding controller + onboarding service`, `services: growth service + marketing controller`, `services: coupon service + admin coupon controller`, `services: order service + order state machine`, `services: etsy adapter + etsy oauth service`, `services: referral service + lifecycle service`, `services: rfq service + rfq controller`, `services: branding service + seller branding controller`, `services: payment service + payment return controller`, `services: invoice service + invoice controller`, `services: finishing service + admin finishing controller`, `services: api key service + api key middleware`, `services: payee profile service + iban`, `services: two factor service + two factor middleware`, `controllers: auth security controller + auth security servic`, `controllers: maker work controller + maker work service`, `models: verification token + two factor service.spec`, `services: model file service + model file controller`, `services: printer model defaults + printer service`, `validators: account security + limiter`, `services: privacy service + account privacy controller`, `services: landing service + session controller`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `useT()` connect `pages: index + show` to `pages: performance`, `components: card + index`, `pages: quick quote + stl viewer`, `pages: index + index`, `components: sheet + theme`, `components: payee payout + stores`, `lib: journey + print journey`, `pages: show + index`, `pages: index + product image`, `lib: display money + index`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `editUser`, `deleteValidator`, `validator` to the rest of the system?**
  _667 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `helpers: order fixtures + rfq http.spec` be split into smaller, more focused modules?**
  _Cohesion score 0.04042432992279204 - nodes in this community are weakly interconnected._
- **Should `pages: index + show` be split into smaller, more focused modules?**
  _Cohesion score 0.02019271051529116 - nodes in this community are weakly interconnected._
- **Should `services: ledger service + admin users audit.spec` be split into smaller, more focused modules?**
  _Cohesion score 0.04279435577145501 - nodes in this community are weakly interconnected._