# ADR-001: Stack Secimi

## Durum

Kabul edildi — 2026-09-01

## Baglam

Fabrmatch, 3D baski print-on-demand pazar yeri. Turkiye merkezli, kuresel olceklendirmeye acik olmali. Seller (alici/satici), manufacturer (uretici) ve admin rolleri var. Eslesme, escrow odeme, dosya yonetimi, kuyruk isleri gibi karmasik is mantigi iceriyor.

## Karar

| Katman               | Secim                 | Gerekce                                                                                         |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| Backend framework    | AdonisJS v7           | Full-stack TS, built-in auth/bouncer/queue/mail/drive, Inertia entegrasyonu, Laravel benzeri DX |
| Runtime              | Node.js 24            | LTS, native TS destegiyle uyumlu                                                                |
| Frontend             | React 19 + Inertia.js | SPA UX, SSR hazir, server-driven routing                                                        |
| ORM                  | Lucid v22             | AdonisJS native, migration + model + query builder                                              |
| Veritabani           | PostgreSQL 16         | ACID, JSON, full-text search, production proven                                                 |
| Cache / Queue broker | Redis 7               | Session, cache, queue, pub/sub, rate limiter hepsi tek store                                    |
| Dosya depolama       | Cloudflare R2         | S3 uyumlu, egress ucretsiz, global CDN                                                          |
| Dogrulama            | VineJS v4             | AdonisJS native, tip-guvenli, performansli                                                      |
| Yetkilendirme        | Bouncer v4            | Policy-based, AdonisJS native                                                                   |
| Test                 | Japa                  | AdonisJS native, unit/functional/browser suite                                                  |
| CI/CD                | GitHub Actions        | Lint, typecheck, test pipeline                                                                  |
| Konteyner            | Docker Compose        | Lokal dev: PostgreSQL, Redis, MinIO                                                             |

## Alternatifler

- **NestJS**: Daha enterprise, ama over-engineering riski. AdonisJS daha pragmatik.
- **Next.js + tRPC**: Full React ama backend convention'lar zayif. Queue, mail, drive icin ayri cozumler gerekir.
- **Laravel + Livewire**: PHP ekosistemi. Takim TS odakli.

## Sonuclar

- Tum backend+frontend tek dilde (TypeScript)
- AdonisJS v7 dokumanlari tek kaynak — v6 ornekleri gecersiz
- Lucid migration-first yaklasim (schema generate)
- Queue pinned @0.6.2 (experimental, breaking change riski)
