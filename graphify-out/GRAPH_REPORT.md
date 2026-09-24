# Graph Report - fabrmatch-adonis (2026-09-23)

## Corpus Check

- 80 files · ~24,758 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 761 nodes · 1220 edges · 64 communities (42 shown, 22 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 54,675 input · 0 output

## Community Hubs (Navigation)

- Inertia Pages & UI Components
- Middleware & Error Handling
- Bouncer Policies & Abilities
- Production Dependencies
- CLAUDE.md Stack Rules
- Package Metadata
- Client Registry & Routes
- Dev Dependencies
- Onboarding Controller & Roles
- Models & Identity Services
- Dashboard Controllers
- Package Import Aliases
- Generated Controllers Registry
- Auth Controllers (Login/Signup)
- Inertia Shared Data & Types
- Auth Security Controller
- User Model & Policies
- App & DB Configuration
- PRD Domain Concepts
- CLI Entrypoints
- Startup & Routing
- Onboarding Service & Profiles
- Queue Jobs & Config
- Manufacturer Profile Model
- Encryption Service
- Inertia TypeScript Config
- Database Schema Classes
- NPM Scripts
- TypeScript Configuration
- Verification Token Model
- Vite & Tailwind Config
- API Serialization Provider
- Generated Routes Types
- Onboarding Validators
- Drive (S3/R2) Config
- Redis Config
- Encryption Config
- Hash Config
- Transmit (SSE) Config
- Allowed Scripts
- Anonymity & Transformers
- Cache Config
- ESLint Override (React)
- PNPM Overrides
- CI/CD & Docker
- Event Types
- Listener Types
- Open Decision D1 (Stripe)
- ESLint Config
- Node Engine Constraint
- Hot Hook Config
- Domain Services Pattern
- React Inertia SSR
- Column Decorator
- DateTime Type
- Admin Role Concept
- Manufacturer Role Concept
- Pricing Formula
- RFQ Concept
- Seller Role Concept
- Session Close Prompt

## God Nodes (most connected - your core abstractions)

1. `cn()` - 45 edges
2. `@adonisjs/core` - 42 edges
3. `User` - 40 edges
4. `imports` - 20 edges
5. `react` - 19 edges
6. `@adonisjs/inertia` - 18 edges
7. `@adonisjs/lucid` - 17 edges
8. `RoleService` - 16 edges
9. `Button` - 12 edges
10. `AuthSecurityService` - 11 edges

## Surprising Connections (you probably didn't know these)

- `CI Pipeline (GitHub Actions)` --semantically_similar_to--> `Docker Compose Local Services (postgres, redis, minio)` [INFERRED] [semantically similar]
  .github/workflows/ci.yml → docker-compose.yml
- `Queue Pinned at 0.6.2 (Experimental Risk)` --rationale_for--> `@adonisjs/queue` [EXTRACTED]
  docs/adr/001-stack.md → package.json
- `AdonisJS v7 (ADR-001)` --semantically_similar_to--> `AdonisJS v7` [INFERRED] [semantically similar]
  docs/adr/001-stack.md → CLAUDE.md
- `Order State Machine (PRD §6)` --semantically_similar_to--> `OrderStateMachine` [INFERRED] [semantically similar]
  docs/FABRMATCH_FULLSTACK_PRD.md → CLAUDE.md
- `Integer Minor Unit Principle` --semantically_similar_to--> `Integer Minor Unit Money Model` [INFERRED] [semantically similar]
  docs/adr/002-money-model.md → CLAUDE.md

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **Payment Adapter Pattern: Port + iyzico + Stripe** — docs_adr_003_payment_adapter_payment_port_interface, docs_adr_003_payment_adapter_iyzico_adapter, docs_adr_003_payment_adapter_stripe_adapter [EXTRACTED 1.00]
- **Money Model: Integer Units + Double-Entry Ledger + No-Float Rule** — docs_adr_002_money_model_integer_minor_unit, docs_adr_002_money_model_double_entry_ledger, docs_adr_002_money_model_no_float_js [EXTRACTED 1.00]
- **Matching Algorithm: Eligibility Filter + Scoring + Exploration Quota** — docs_fabrmatch_fullstack_prd_matching_algorithm, docs_fabrmatch_fullstack_prd_exploration_quota, docs_project_memory_run_matching_round_job [INFERRED 0.85]

## Communities (64 total, 22 thin omitted)

### Community 0 - "Inertia Pages & UI Components"

Cohesion: 0.06
Nodes (61): @adonisjs/inertia/types, ExtractProps, InertiaPages, inertiaConfig, Avatar, AvatarFallback, AvatarImage, Badge() (+53 more)

### Community 1 - "Middleware & Error Handling"

Cohesion: 0.05
Nodes (16): HttpExceptionHandler, AuthMiddleware, ContainerBindingsMiddleware, GuestMiddleware, SilentAuthMiddleware, @adonisjs/auth/types, @adonisjs/core/types, authConfig (+8 more)

### Community 2 - "Bouncer Policies & Abilities"

Cohesion: 0.05
Nodes (6): policies, editUser, @adonisjs/core/http, HttpContext, InitializeBouncerMiddleware, @adonisjs/bouncer

### Community 3 - "Production Dependencies"

Cohesion: 0.05
Nodes (42): dependencies, @adonisjs/auth, @adonisjs/bouncer, @adonisjs/cache, @adonisjs/core, @adonisjs/cors, @adonisjs/drive, @adonisjs/inertia (+34 more)

### Community 4 - "CLAUDE.md Stack Rules"

Cohesion: 0.05
Nodes (40): AdonisJS v7, Bouncer (Authorization), Drive (S3/R2) — Cloudflare R2, Integer Minor Unit Money Model, ledger_entries (Double-Entry Ledger), Lucid v22 + PostgreSQL, Redis, VineJS v4 (+32 more)

### Community 5 - "Package Metadata"

Cohesion: 0.06
Nodes (34): license, name, prettier, private, type, version, @adonisjs/assembler, @adonisjs/prettier-config (+26 more)

### Community 6 - "Client Registry & Routes"

Cohesion: 0.10
Nodes (22): placeholder, registry, routes, @tuyau/core/types, UserRegistry, adonisjs_client_registry_schema_d_registry, ApiDefinition, client (+14 more)

### Community 7 - "Dev Dependencies"

Cohesion: 0.07
Nodes (27): devDependencies, @adonisjs/assembler, @adonisjs/eslint-config, @adonisjs/prettier-config, @adonisjs/tsconfig, eslint, eslint-plugin-react, eslint-plugin-react-hooks (+19 more)

### Community 8 - "Onboarding Controller & Roles"

Cohesion: 0.15
Nodes (9): OnboardingController, OnboardingMiddleware, Role, belongsTo, column, dateTime, UserRole, RoleService (+1 more)

### Community 9 - "Models & Identity Services"

Cohesion: 0.13
Nodes (4): ProfileStatus, TokenType, @adonisjs/lucid, luxon

### Community 10 - "Dashboard Controllers"

Cohesion: 0.10
Nodes (9): AdminDashboardController, MakerDashboardController, SellerDashboardController, APP_ROOT, bodyParserConfig, corsConfig, @adonisjs/core, @japa/runner (+1 more)

### Community 11 - "Package Import Aliases"

Cohesion: 0.10
Nodes (20): imports, #abilities/_, #config/_, #controllers/_, #database/_, #events/_, #exceptions/_, #generated/* (+12 more)

### Community 12 - "Generated Controllers Registry"

Cohesion: 0.15
Nodes (5): ParamValue, controllers, @vinejs/vine, VineGlobalTransforms, @vinejs/vine/types

### Community 13 - "Auth Controllers (Login/Signup)"

Cohesion: 0.12
Nodes (8): NewAccountController, SessionController, loginValidator, signupValidator, @adonisjs/limiter/types, limiterConfig, LimitersList, @adonisjs/limiter

### Community 14 - "Inertia Shared Data & Types"

Cohesion: 0.14
Nodes (11): Data, FlashMessages, ManufacturerPublic, SharedProps, User, Variants, @adonisjs/inertia/types, InertiaMiddleware (+3 more)

### Community 15 - "Auth Security Controller"

Cohesion: 0.18
Nodes (5): AuthSecurityController, AuthSecurityService, forgotPasswordValidator, resetPasswordValidator, verifyEmailValidator

### Community 16 - "User Model & Policies"

Cohesion: 0.17
Nodes (6): User, AdminPolicy, ManufacturerPolicy, SellerPolicy, hasMany, hasOne

### Community 17 - "App & DB Configuration"

Cohesion: 0.13
Nodes (10): appUrl, http, dbConfig, @adonisjs/core/types, loggerConfig, LoggersList, @adonisjs/mail/types, mailConfig (+2 more)

### Community 18 - "PRD Domain Concepts"

Cohesion: 0.18
Nodes (13): Encryption Service (AES-256-GCM), Fabrmatch Project, file_access_grants (IP Protection), OrderStateMachine, New Manufacturer Exploration Quota (20%), Fabrmatch Marketplace (Fullstack PRD), Matching Algorithm (Fair Opportunity), Order State Machine (PRD §6) (+5 more)

### Community 19 - "CLI Entrypoints"

Cohesion: 0.22
Nodes (3): APP_ROOT, APP_ROOT, @poppinss/ts-exec

### Community 20 - "Startup & Routing"

Cohesion: 0.18
Nodes (8): sessionConfig, @adonisjs/session, @japa/api-client, @japa/assert, @japa/browser-client, @japa/plugin-adonisjs, plugins, runnerHooks

### Community 21 - "Onboarding Service & Profiles"

Cohesion: 0.27
Nodes (5): SellerProfile, belongsTo, column, dateTime, OnboardingService

### Community 22 - "Queue Jobs & Config"

Cohesion: 0.24
Nodes (5): Ping, PingPayload, queueConfig, Queue Pinned at 0.6.2 (Experimental Risk), @adonisjs/queue

### Community 23 - "Manufacturer Profile Model"

Cohesion: 0.29
Nodes (6): ManufacturerProfile, ProfileStatus, belongsTo, column, dateTime, ManufacturerPublicTransformer

### Community 24 - "Encryption Service"

Cohesion: 0.27
Nodes (4): EncryptionService, ManufacturerProfileData, SellerProfileData, ref_node_crypto

### Community 25 - "Inertia TypeScript Config"

Cohesion: 0.22
Nodes (8): compilerOptions, jsx, module, paths, extends, include, @generated/*, @adonisjs/tsconfig/tsconfig.client.json

### Community 26 - "Database Schema Classes"

Cohesion: 0.54
Nodes (7): ManufacturerProfileSchema, SellerProfileSchema, column, dateTime, UserRoleSchema, UserSchema, VerificationTokenSchema

### Community 27 - "NPM Scripts"

Cohesion: 0.25
Nodes (8): scripts, build, dev, format, lint, start, test, typecheck

### Community 28 - "TypeScript Configuration"

Cohesion: 0.25
Nodes (7): @adonisjs/tsconfig/tsconfig.app.json, compilerOptions, jsx, outDir, rootDir, extends, references

### Community 29 - "Verification Token Model"

Cohesion: 0.29
Nodes (4): belongsTo, column, dateTime, VerificationToken

### Community 30 - "Vite & Tailwind Config"

Cohesion: 0.29
Nodes (5): viteBackendConfig, @adonisjs/vite, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 31 - "API Serialization Provider"

Cohesion: 0.29
Nodes (5): @adonisjs/core/http, ApiSerializer, HttpContext, serialize, serializer

### Community 32 - "Generated Routes Types"

Cohesion: 0.50
Nodes (4): @adonisjs/core/types/http, ParamValue, RoutesList, ScannedRoutes

### Community 33 - "Onboarding Validators"

Cohesion: 0.70
Nodes (3): manufacturerProfileValidator, roleSelectionValidator, sellerProfileValidator

### Community 34 - "Drive (S3/R2) Config"

Cohesion: 0.40
Nodes (4): @adonisjs/drive/types, driveConfig, DriveDisks, @adonisjs/drive

### Community 35 - "Redis Config"

Cohesion: 0.40
Nodes (4): @adonisjs/redis/types, redisConfig, RedisConnections, @adonisjs/redis

### Community 36 - "Encryption Config"

Cohesion: 0.50
Nodes (3): @adonisjs/core/types, encryptionConfig, EncryptorsList

### Community 37 - "Hash Config"

Cohesion: 0.50
Nodes (3): @adonisjs/core/types, hashConfig, HashersList

### Community 39 - "Allowed Scripts"

Cohesion: 0.50
Nodes (4): allowScripts, esbuild, fsevents, @swc/core

### Community 40 - "Anonymity & Transformers"

Cohesion: 0.67
Nodes (3): Manufacturer Anonymity Business Rule, Transformer Pattern (Response Serialization), Manufacturer Public Alias (FM-XXXX)

### Community 43 - "ESLint Override (React)"

Cohesion: 0.67
Nodes (3): eslint, overrides, eslint-plugin-react

### Community 44 - "PNPM Overrides"

Cohesion: 0.67
Nodes (3): eslint-plugin-react>eslint, pnpm, overrides

## Knowledge Gaps

- **251 isolated node(s):** `EncryptorsList`, `HashersList`, `LoggersList`, `MailersList`, `RedisConnections` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 402 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `@adonisjs/core` connect `Dashboard Controllers` to `Inertia Pages & UI Components`, `Middleware & Error Handling`, `Bouncer Policies & Abilities`, `Package Metadata`, `Client Registry & Routes`, `Onboarding Controller & Roles`, `Models & Identity Services`, `Generated Controllers Registry`, `Auth Controllers (Login/Signup)`, `Inertia Shared Data & Types`, `Auth Security Controller`, `App & DB Configuration`, `Startup & Routing`, `Queue Jobs & Config`, `Manufacturer Profile Model`, `API Serialization Provider`, `Generated Routes Types`, `Onboarding Validators`, `Encryption Config`, `Hash Config`?**
  _High betweenness centrality (0.285) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Production Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `@adonisjs/inertia` connect `Inertia Pages & UI Components` to `Bouncer Policies & Abilities`, `Package Metadata`, `Inertia Shared Data & Types`, `Client Registry & Routes`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `EncryptorsList`, `HashersList`, `LoggersList` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Inertia Pages & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05584158415841584 - nodes in this community are weakly interconnected._
- **Should `Middleware & Error Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.04541062801932367 - nodes in this community are weakly interconnected._
- **Should `Bouncer Policies & Abilities` be split into smaller, more focused modules?**
  _Cohesion score 0.05110336817653891 - nodes in this community are weakly interconnected._
