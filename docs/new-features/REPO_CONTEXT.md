# Repository context for the ticket pack

## Evidence baseline

Inspected upstream main revision: `06ce222654fbaed7bfda33802a89c305574f0e95`. Source was read from an isolated archive at `/tmp/ired-ticket-source`; that temporary path is not an implementation dependency. [Evidence hashes](SOURCE_EVIDENCE.json) identify inspected files. The original assessment used an older source snapshot and is historical context. These tickets remain proposed/unimplemented.

## Current architecture

- Backend: NestJS11, Prisma6/PostgreSQL, Zod3, BullMQ/Redis, Clerk plus legacy authentication paths. Domain modules include clients, requirements through ClientsController, buildings, floors, units, proposals, deals, site visits, tasks, media, imports and change requests.
- Frontend: Next.js16.2.9, React19.2.4, TanStack Query, Zod4, Playwright. Read `Frontend/AGENTS.md` and locally installed framework docs before implementation. Backend/frontend Zod major versions differ; do not directly import backend runtime schemas into the frontend bundle.
- Property creation is `Frontend/src/app/(dashboard)/properties/new/page.tsx`. Property intake already has a staged flow; do not add a duplicate `(v2)/properties/new` route.
- Clients, requirements, deals and proposals use `(v2)` page groups. Current browser proposal test is `Frontend/e2e/proposals.spec.ts`.
- Health lives in `Backend/src/health`, not `modules/health`.
- Existing requirement routes are POST `/api/v1/clients/:id/requirements`, PATCH `/api/v1/clients/requirements/:reqId`, POST `/api/v1/clients/requirements/:reqId/shortlists`.
- TransformInterceptor wraps ordinary payloads in data/meta, passes existing paginated envelopes and StreamableFile, and does not generally redact secret relation fields.

## Findings that motivate the work

Current source preserves the assessed risky boundaries: search OR composition and merged bounds, nullable tenant ownership, proposal hierarchy/export rules, Float commercial values, private-media URL handling, import/change-approval transaction boundaries and optional notification queues. AUTH-001–018 already describe identity/lifecycle hardening; reference those tickets instead of rebuilding it here.

The schema has no complete reviewed AI job/source pipeline or owner lease/obligation domain. Those names in new tickets are proposed additions. Latest source also contains property intake changes absent from the older assessment baseline; FIELD-001 and AI-011 explicitly reuse them.

## Local checks versus deployment

No application test, build, migration, browser acceptance or hosted deployment was performed while authoring this ticket pack. Historical assessment test results are not current acceptance evidence. CI source currently runs typecheck, lint and backend unit tests; hosted required-check/Render settings remain unverified. Playwright starts the frontend on3100 but needs a separately running isolated backend.

## Proposed architecture sequence

Server-derived tenant/access context → corrected queries and integrity → private evidence and durable outbox/jobs → confirmed requirements and deterministic comparison → reviewed AI drafts → immutable client releases → owner asset grants and reviewed leases → explicit obligations/financial ledgers → gated advanced AI and integrations.

Use a modular monolith and existing PostgreSQL/queue stack. Do not add microservices, a general autonomous agent or a vector database merely because AI is involved. Document retrieval begins with bounded PostgreSQL lexical search; evaluate semantic retrieval only when measured recall justifies another component.

## Shared contract ownership

ACCESS: TEN-001/DEC-002. BRIEF: REQ-001/002. MONEY: DEC-004/DATA-007/008. SOURCE/AIJOB: AI-001..005. OUTBOX: OPS-002..004. RELEASE/SHARE: PROP-005..010. FRESH: INV-001/002. LEASE: LEASE-001..003 and OWNER-001. EVENTS: CRM-002. REPORT: REPORT-001. Each ticket inlines the contracts it consumes.

## Decisions remain unsigned

Pilot segment sequence, provider and spending approval, tenant ownership backfill, money correction, retention, offline device policy, owner role powers, financial approval limits and billing policy require the named DEC tickets. Proposed limits in this pack are deliberate defaults for review, not evidence that a customer approved them.

## Working tree boundary

Only `docs/new-features` is authored for this request. The existing property edit page modification and earlier assessment/context files are preserved. Creating tickets does not authorize running their production migrations, closing accounts, sending messages or enabling paid services.
