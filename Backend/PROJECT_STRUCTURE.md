# IRED PropertyOS Backend

**Commercial Real Estate Operations Platform API** — a NestJS backend for managing buildings, units, contacts, clients, deals, tasks, site visits, proposals, and more.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Language | TypeScript 5.6 |
| ORM | Prisma 6 (PostgreSQL) |
| Auth | JWT (access + refresh), Argon2 password hashing |
| Queue | BullMQ (Redis) — email, SMS, push workers |
| Real-time | WebSocket (Socket.IO) |
| File Storage | AWS S3 / MinIO (presigned URLs) |
| PDF | PDFKit |
| Validation | Zod schemas |
| API Docs | Swagger/OpenAPI |

---

## Project Structure

```
├── .github/workflows/ci.yml     # CI pipeline (lint, typecheck, migrate, test, build)
├── prisma/
│   ├── schema.prisma             # Database schema (all models, enums, relations)
│   ├── seed.ts                   # Reference data seeder
│   └── migrations/               # Prisma migrations
├── src/
│   ├── main.ts                   # App entry point (bootstrap, Swagger, CORS, versioning)
│   ├── app.module.ts             # Root module (all imports, middleware)
│   ├── config/
│   │   ├── config.module.ts      # AppConfigModule (validation + registerAs)
│   │   ├── configuration.ts      # Environment config mapping (app.* namespace)
│   │   └── validation.ts         # Zod env schema validation
│   ├── prisma/
│   │   ├── prisma.module.ts      # Global Prisma module
│   │   └── prisma.service.ts     # PrismaClient lifecycle service
│   ├── health/                   # GET /api/v1/health (Terminus)
│   ├── shared/
│   │   ├── shared.module.ts      # Global guards, interceptors, filters
│   │   ├── decorators/           # @CurrentUser, @Roles, @GeographyScope
│   │   ├── dto/                  # PaginationQuerySchema
│   │   ├── filters/              # AllExceptionsFilter (standardized error responses)
│   │   ├── guards/               # JwtAuthGuard, RolesGuard, GeographyGuard
│   │   ├── interceptors/         # TransformInterceptor, AuditInterceptor, VersionHeaderInterceptor
│   │   ├── logger/               # JsonLogger (production structured logging)
│   │   ├── middleware/            # RequestIdMiddleware (x-request-id propagation)
│   │   ├── pipes/                # ZodValidationPipe
│   │   ├── types/                # Express Request type augmentation
│   │   └── utils/                # CSV parser (RFC 4180 compliant)
│   └── modules/
│       ├── auth/                 # Login, OTP, refresh tokens, forgot/reset password
│       ├── users/                # User CRUD, geographic assignments
│       ├── reference/            # States, cities, localities, zones, property types, etc.
│       ├── buildings/            # Building CRUD + change request flow
│       ├── floors/               # Floor CRUD (nested under buildings)
│       ├── units/                # Unit CRUD + worker assignment
│       ├── contacts/             # Contact CRUD + view audit logging
│       ├── media/                # S3 presigned upload/download + metadata
│       ├── change-requests/      # Worker edit requests + admin approval workflow
│       ├── search/               # Advanced property/unit/contact search
│       ├── dashboard/            # Admin + worker metrics, activity feed
│       ├── clients/              # Client CRUD + contacts + requirements + shortlists
│       ├── deals/                # Deal pipeline + commissions + invoices
│       ├── tasks/                # Task CRUD + follow-ups + status transitions
│       ├── site-visits/          # Site visit scheduling + status workflow
│       ├── proposals/            # Proposal CRUD + PDF generation
│       ├── imports/              # CSV data import with column mapping
│       ├── exports/              # CSV export for all entities
│       ├── map/                  # Geographic bounds + nearby property queries
│       ├── notifications/        # Email/SMS/push queue workers + WebSocket gateway
│       └── email/                # SMTP mail service (Nodemailer)
├── test/
│   ├── app.e2e-spec.ts           # E2E tests (auth, reference, protected endpoints)
│   └── jest-e2e.json
├── .env.example                  # Environment variable template
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # Postgres + Redis + MinIO
├── tsconfig.json
├── package.json
└── README.md
```

---

## What Has Been Implemented

### Authentication & Users
- Email + password login with Argon2 hashing
- JWT access + refresh token pair with rotation
- Email OTP verification (6-digit, 10min expiry)
- Password reset via email OTP
- Mobile recovery OTP flow
- Role-based access control (ADMIN, WORKER)
- Geographic scope assignments for workers

### Core Entities (V1)
- **Buildings** — Full CRUD, soft delete, change request flow for workers
- **Floors** — Nested under buildings, CRUD, soft delete
- **Units** — Full CRUD, worker assignment, soft delete
- **Contacts** — CRUD, view audit logging, soft delete

### CRM (V2)
- **Clients** — CRUD, nested contacts, requirements, shortlists
- **Deals** — Pipeline management (8 statuses), commissions, invoices
- **Site Visits** — Scheduling with status workflow (scheduled → confirmed → completed)
- **Proposals** — Create, generate PDF, status management

### Operations
- **Tasks** — Task management with follow-ups, status transitions
- **Change Requests** — Worker-initiated edits requiring admin approval
- **Imports** — CSV upload with column mapping and validation
- **Exports** — CSV export for buildings/units/contacts/clients/deals
- **Media** — S3 presigned URL upload/download with metadata

### Reference Data
- States, Cities, Localities, Micro Markets, Zones
- Property Types, Furnishing Statuses, Availability Statuses
- Verification Statuses, Contact Roles, Document Categories, Sources

### System Features
- Swagger/OpenAPI documentation (all 22 modules tagged)
- Global exception filter with requestId in error responses
- Audit interceptor logging all mutations (entity-aware)
- Request ID middleware (x-request-id header propagation)
- API version header (X-API-Version) on all responses
- Structured JSON logging for production
- Per-endpoint rate limiting on auth endpoints (login: 10/min, OTP: 5/min)
- WebSocket gateway for real-time notifications
- BullMQ workers for email, SMS, and push notifications

### Notifications
- **Email** — SMTP with console fallback (Nodemailer)
- **SMS** — Console, Twilio, Textlocal providers
- **Push** — Console, Firebase Cloud Messaging providers
- **WebSocket** — Real-time events for change requests, approvals, task assignments

### Database
- 25+ models with full relations
- Soft delete on all V1 and V2 entities with indexed `deletedAt` columns
- Version snapshots for change tracking
- Audit events table with actor, entity, metadata, IP, user agent
- Prisma migration for soft delete columns + performance indexes

### DevOps
- Multi-stage Dockerfile (deps → prisma generate → build → production)
- docker-compose.yml (Postgres 16, Redis 7, MinIO)
- GitHub Actions CI (lint → typecheck → prisma migrate → test → build)

---

## APIs / Routes

| Module | Base Path | Endpoints |
|--------|-----------|-----------|
| Auth | `/api/v1/auth` | login, verify-email-otp, resend-email-otp, refresh-token, logout, forgot-password, reset-password, send-mobile-recovery-otp, verify-mobile-recovery-otp, me |
| Users | `/api/v1/users` | CRUD + geographic assignments |
| Reference | `/api/v1/reference` | states, cities, localities, zones, micro-markets, property-types, furnishing-statuses, availability-statuses, verification-statuses, contact-roles, document-categories, sources |
| Buildings | `/api/v1/buildings` | CRUD + soft delete + restore |
| Floors | `/api/v1/buildings/:buildingId/floors` | CRUD + soft delete + restore |
| Units | `/api/v1/units` | CRUD + soft delete + restore |
| Contacts | `/api/v1/contacts` | CRUD + soft delete + restore + view-log |
| Media | `/api/v1/media` | upload-url, complete-upload, download-url, CRUD |
| Change Requests | `/api/v1/change-requests` | list, approve, reject, resolve |
| Search | `/api/v1/search` | properties, units, contacts |
| Dashboard | `/api/v1/dashboard` | admin metrics, worker metrics, activity |
| Clients | `/api/v1/clients` | CRUD + contacts + requirements + shortlists + soft delete + restore |
| Deals | `/api/v1/deals` | CRUD + pipeline status + commissions + invoices + soft delete + restore |
| Tasks | `/api/v1/tasks` | CRUD + follow-ups + soft delete + restore |
| Site Visits | `/api/v1/site-visits` | CRUD + status workflow + soft delete + restore |
| Proposals | `/api/v1/proposals` | CRUD + generate-pdf + status update |
| Imports | `/api/v1/imports` | upload, map-columns, validate, confirm |
| Exports | `/api/v1/exports` | buildings, units, contacts, clients, deals (CSV) |
| Map | `/api/v1/map` | bounds, nearby-properties |
| Notifications | `/api/v1/notifications` | queue status, retry |
| Health | `/api/v1/health` | liveness + readiness |

---

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Generate Prisma client
npx prisma generate

# 5. Run migrations
npx prisma migrate dev

# 6. Seed reference data
npm run db:seed

# 7. Start development server
npm run start:dev
```

**API:** http://localhost:3000
**Swagger:** http://localhost:3000/api/docs

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start:prod` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm test` | Unit tests (22 suites, 158 tests) |
| `npm run test:e2e` | E2E tests |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:migrate:prod` | Prisma migrate deploy (production) |
| `npm run db:seed` | Seed reference data |
| `npm run db:studio` | Prisma Studio |
| `npm run docker:up` | Start Docker infrastructure |
| `npm run docker:down` | Stop Docker infrastructure |

---

## Environment Variables

See `.env.example` for the full template.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `development`, `production`, or `test` |
| `APP_PORT` | `3000` | Server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host for BullMQ |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_ACCESS_SECRET` | — | Secret for access tokens (min 16 chars) |
| `JWT_REFRESH_SECRET` | — | Secret for refresh tokens (min 16 chars) |
| `SMTP_HOST` | — | SMTP server (falls back to console logging) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `S3_ENDPOINT` | — | S3/MinIO endpoint |
| `S3_BUCKET` | `propertyos-media` | S3 bucket name |
| `SMS_PROVIDER` | `console` | `console`, `twilio`, or `textlocal` |
| `SMS_API_KEY` | — | SMS provider API key |
| `PUSH_PROVIDER` | `console` | `console` or `fcm` |
| `PUSH_FCM_SERVER_KEY` | — | Firebase Cloud Messaging key |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

---

## Known Issues & Missing Pieces

1. **No database seeding data** — `seed.ts` exists but may need population with initial reference data
2. **No frontend** — Backend only; no admin dashboard or client portal yet
3. **E2E tests require running infrastructure** — Tests hit real Postgres/Redis
4. **WebSocket auth** — Gateway uses JWT but no room-based multi-tenancy yet
5. **No file upload size limits** — Media upload has no multer config for file size caps
6. **No email templates** — Only OTP and notification emails have HTML templates
7. **No API key auth** — Only JWT; no API key or OAuth2 client credentials

---

## What Still Needs to Be Built

1. **Frontend** — Admin dashboard (React/Next.js) + client portal
2. **Email templates** — Branded HTML templates for all notification types
3. **SMS/FCM integration testing** — Real provider integration tests
4. **File size limits** — Multer configuration for upload constraints
5. **Rate limiting per role** — Different limits for admin vs worker
6. **Data export scheduling** — Cron-based periodic exports
7. **Audit log viewer** — Admin UI for viewing audit events
8. **Multi-tenancy** — Organization/branch isolation
9. **API versioning strategy** — v2 breaking change migration plan

---

## Suggested Next Development Plan (Priority Order)

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Frontend admin dashboard (React/Next.js) | Large |
| 2 | Email template system (branded HTML) | Medium |
| 3 | Data export scheduling (cron jobs) | Small |
| 4 | Audit log admin viewer | Small |
| 5 | File upload size limits + validation | Small |
| 6 | Multi-tenancy / organization isolation | Large |
| 7 | API documentation improvements (request/response examples) | Medium |
| 8 | Performance monitoring (OpenTelemetry/Prometheus) | Medium |
| 9 | Database backup automation | Small |
| 10 | Deployment pipeline (Docker → cloud) | Medium |

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Zod over class-validator** | Schema-first validation; lighter, composable, shared with frontend |
| **Soft delete everywhere** | Data recovery; audit trail preservation |
| **Change request flow for workers** | Workers propose edits; admins approve — prevents accidental data corruption |
| **BullMQ over @nestjs/bull** | Better Redis support, TypeScript-first, active maintenance |
| **Prisma over TypeORM** | Type-safe queries, migration management, single schema file |
| **JWT with refresh rotation** | Stateless auth with token revocation capability |
| **Presigned URLs for uploads** | No server-side file buffering; direct S3 upload |
| **Global audit interceptor** | Automatic logging of all mutations without per-controller boilerplate |
| **Request ID middleware** | End-to-end request tracing across services |
| **JSON logger in production** | Machine-parseable logs for log aggregation (ELK, Datadog) |
