# Repo Context — IRED PropertyOS

Audited 2026-09-15 at local commit `47f7aa0`. This is a source review and local validation snapshot, not certification of a deployed environment. The pre-existing edit in `Frontend/src/app/(dashboard)/properties/[id]/edit/page.tsx` was preserved.

## Stack

Versions below are declared package versions/ranges, not a claim that every range resolves to its minimum.

| Layer | Current implementation | Evidence |
|---|---|---|
| Workspace | npm workspaces: `Backend`, `Frontend`; Node requirement `>=20` | `package.json` |
| Frontend | Next.js `16.2.9`, React `19.2.4`, TypeScript `^5`, Tailwind `^4` | `Frontend/package.json` |
| Frontend data/forms | TanStack Query `^5.101.0`, Table `^8.21.3`, React Hook Form `^7.79.0`, Zod `^4.4.3` | `Frontend/package.json` |
| Backend | NestJS `^11.0.0`, TypeScript `^5.6.0`, Zod `^3.23.0` | `Backend/package.json` |
| Persistence | PostgreSQL, Prisma `6.19.3` at root / `^6.19.3` backend | package files; `Backend/prisma/schema.prisma` |
| Identity | Clerk or Passport JWT; OTP/password flows remain | `Backend/src/shared/guards/jwt-auth.guard.ts`, `Backend/src/modules/auth/auth.service.ts` |
| Jobs/storage | BullMQ `^5.0.0`, Redis, S3-compatible storage; local MinIO | backend package; notifications module; media service; README |
| Telemetry | Sentry, Winston, request IDs, metrics interceptor | `Backend/src/main.ts`, `Backend/src/shared/shared.module.ts` |
| Tests | Jest 29, ts-jest, Playwright `^1.61.0`, Testcontainers | package files; `Frontend/playwright.config.ts`, `Backend/test/app.e2e-spec.ts` |

No AI orchestration, embedding, or lease-management implementation was located in the inspected module registration/schema or targeted graph searches. This is a bounded negative finding, not proof that no incidental AI-related text exists anywhere.

## Folder Map

```text
Backend/
  src/modules/       Domain controllers, services, DTO schemas and unit tests
  src/shared/        Auth/scope guards, interceptors, filters, utilities
  src/prisma/        Prisma provider
  prisma/            Schema, seed and migrations
  test/              Database-backed API test setup and suite
  docs/              Deployment and operational documentation
  monitoring/        Monitoring configuration
Frontend/
  src/app/           App Router pages, auth/dashboard/v2 route groups
  src/hooks/         TanStack Query API hooks
  src/lib/           API transport and utilities
  src/components/    Domain components and shared UI
  e2e/               Playwright tests
docs/                Product and implementation documents
.github/workflows/   CI, deployment-related and keep-alive workflows
```

`Backend/frontend/` is described as legacy in the root README and is excluded from root workspaces; do not extend it. The active frontend is `Frontend/`.

## Conventions

- Controllers use Nest decorators, URI version `1`, services injected by constructor, and Prisma queries directly in services. Examples inspected: buildings, clients, proposals controllers and search, clients, proposals services.
- DTOs live in `modules/<domain>/dto/<domain>.schema.ts`; Zod validation is used through `ZodValidationPipe`. Main also installs Nest's `ValidationPipe`. Backend and frontend use different Zod major versions.
- Prisma uses PascalCase models, camelCase fields, mapped snake_case database names, UUID identifiers, and mixed soft-delete support. Examples: Building, Client, Deal, ProposalItem.
- Frontend components use PascalCase names, `@/` imports, TanStack mutations and Sonner notifications. Examples inspected: `AddToProposalDialog.tsx`, `ContactCard.tsx`, `MediaGallery.tsx`.
- Existing service tests commonly mock Prisma. Examples inspected: search, clients, auth, proposal export. A passing mocked test is not an authorization or persistence acceptance test.

## Auth

Global guards are registered in `Backend/src/shared/shared.module.ts`: JWT, roles, organization, geography, plus throttling. Public routes use the public decorator. Clerk is selected with `AUTH_PROVIDER=clerk`; `render.yaml` selects it.

**Do not assume global registration guarantees scope enforcement.** `OrgGuard` acts only on `@OrgIsolated` metadata, bypasses `ADMIN`, and only attaches an organization ID. It does not add query filters. The inspected clients controller does not opt in, and its service does not receive an organization scope.

`@GeographyScope()` makes `GeographyGuard` load assignments into `request.user.geographicScope`; controllers read it via `@CurrentUser("geographicScope")`. Scope contains no `userId`, although proposal service code expects one. New work must use an explicit actor/organization/access context and fail closed; its contract must be approved before expanding access to external organizations.

## API Style

- Base: `/api/v1` (`Backend/src/main.ts`). Local documented port: 4000.
- Paginated service results: `{ data: [...], meta: { total, page, limit, totalPages } }`.
- Other JSON: `TransformInterceptor` wraps as `{ data, meta: { timestamp, requestId } }`; `StreamableFile` bypasses this.
- Errors: `{ statusCode, message, errors, timestamp, path, requestId }` from `AllExceptionsFilter`.
- Example from inspected code: `GET /api/v1/clients?page=1&limit=20&search=Acme` produces the paginated envelope. An empty matching result is `{ "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 } }`. This is a code-derived example, not a captured live HTTP exchange.
- Frontend uses `Frontend/src/lib/api/client.ts` and hooks such as `use-proposals.ts`; some hooks accommodate both wrapped and unwrapped data. Standardize deliberately rather than copying this ambiguity.

## Database

`Backend/prisma/schema.prisma` is the source schema. Commands in backend package: `db:generate`, `db:migrate` (development), `db:migrate:prod` (deploy). Render calls `Backend/scripts/deploy-migrations.js`; that custom path must be reviewed before any production migration.

Organization IDs are nullable on important records. Child ownership is often indirect. Monetary fields use `Float`. Requirements contain area/budget ranges and JSON preferred locations but no complete structured leasing brief. Proposal has legacy `unitIds` alongside relational items; `ProposalItem.snapshotJson` exists but the inspected export reads current entities. Shortlist's unit/building IDs lack explicit Prisma relations. These are important migration seams.

## Testing and Validation

Executed locally on 2026-09-15 with installed dependencies and Node `v25.8.1` (CI declares Node 20):

| Check | Result |
|---|---|
| `npm test -w ired-propertyos-backend -- --runInBand` | 26 suites, 197 tests passed |
| `npm run typecheck -w ired-propertyos-backend` | Passed |
| `npm run typecheck -w ired-propertyos` | Passed |
| `npm run lint` | Backend failed: 1 error, 424 warnings; frontend not reached by root command |
| `npm run lint -w ired-propertyos` | Failed: 4 errors, 47 warnings |
| Direct service query probe with mock database | Confirmed lost geography/range predicates and proposal `OR: [{}]` |
| Build, full browser E2E, database API E2E, hosted CI, deployed acceptance | Not run/verified in this audit |

Run one existing unit suite: `npm test -w ired-propertyos-backend -- --runInBand src/modules/search/__tests__/search.service.spec.ts`.

Playwright lives in `Frontend/e2e`, starts frontend port 3100, and depends on backend test authentication. Its proposal test expects old routes and CSV UI; current proposal implementation exports XLSX. CI currently declares typecheck, lint and backend unit-test jobs, not browser acceptance. Deployment has a separate Docker/test workflow and Render auto-deployment settings; deployment gating is not established by this review.

## Reusable Utilities

- `Backend/src/shared/utils/geography-filter.ts`: scope builders; repair composition and fail-closed semantics before reuse.
- `Backend/src/shared/utils/verify-entity-geography.ts`: entity geography checks.
- `Backend/src/shared/pipes/zod-validation.pipe.ts`: request validation.
- `Backend/src/shared/interceptors/transform.interceptor.ts`: JSON envelope and bigint serialization.
- `Backend/src/shared/filters/http-exception.filter.ts`: error envelope/Sentry capture.
- `Backend/src/modules/change-requests/change-requests.service.ts`: review/snapshot patterns; concurrency needs separate verification.
- `Backend/src/modules/media/media.service.ts`: storage and signed URL operations.
- `Backend/src/modules/notifications/notifications.module.ts`: existing queue registration/retry patterns.
- `Frontend/src/lib/api/client.ts`, `Frontend/src/hooks/use-proposals.ts`: API transport and cache invalidation conventions.

## Landmines

See [Market and AI assessment](./MARKET_AI_ASSESSMENT.md) for evidence and priorities. Highest risk: missing organization enforcement, search overwriting scope, proposal exports without object access checks, and unprojected user relations. Older `docs/DEVELOPMENT_PLAN.md` contains obsolete claims (missing ESLint config, older test counts, older proposal contract); do not execute it as a current defect list.

## Unknowns

- Needs Architect Decision: authoritative organization ownership/backfill and platform-admin versus tenant-admin semantics.
- Needs Architect Decision: shared physical-property identity versus each firm's private inventory and commercial terms.
- Needs Architect Decision: supported authentication mode(s), provider selection for AI, retention, region and operating budget.
- Live data quality, actual row counts, production access policies, backup recovery, external customer demand, and deployed CI status were not verified.
