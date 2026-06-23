# IRED PropertyOS Development Plan

Last updated: 2026-06-21

This plan turns the current audit findings into an execution roadmap for completing IRED PropertyOS as a merged frontend/backend platform. It covers confirmed defects, missing PRD scope, engineering hardening, and release readiness.

## Current State

The project is now organized as a root workspace with:

- `Backend/`: NestJS 11, Prisma 6, PostgreSQL, JWT/OTP auth, Swagger, 24 unit test suites (176 tests), 100+ API endpoints across 18 controllers, 30 Prisma models, 19 enums.
- `Frontend/`: Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui components, TanStack Query 5, TanStack Table 8, Zod 4, 12 Playwright E2E test files, ~120 source files.

Confirmed checks:

- Backend unit tests pass: 24 suites, 176 tests.
- Root TypeScript check passes for backend and frontend.
- Frontend Playwright could not be completed in the current environment because local server binding was blocked.
- Lint currently fails because backend ESLint 9 needs a flat `eslint.config.js` or a compatible ESLint version. No ESLint config file exists at `Backend/` root despite ESLint 9.x being installed.

Backend module inventory (22 modules):

- **V1**: Auth, Users, Reference, Buildings, Floors, Units, Contacts, Media, ChangeRequests, Search, Dashboard
- **V2**: Imports, Exports, Map, Clients, Proposals, Tasks, SiteVisits, Deals, Notifications, Audit, Monitoring
- **Infra**: Health, Email (MailModule)

Frontend route groups:

- `(auth)`: login, verify-otp, forgot-password, reset-password
- `(dashboard)`: dashboard, properties (list/new/[id]/[id]/edit), buildings, floors, units, approvals (list/[id]), media, activity, settings, settings/users
- `(v2)`: clients (list/new/[id]/[id]/edit), requirements, deals (list/[id]), tasks (list/[id]), site-visits (list/[id]), proposals, follow-ups, commissions, invoices, reports, map, imports, exports

## Product Goal

Build a secure internal real estate operations platform where:

- Admins manage master property inventory, users, approvals, imports, exports, media, and reports.
- Workers can add new data directly, edit existing data through change requests, and only see assigned geography.
- V1 covers core inventory, approvals, documents, audit, and role/geography access.
- V2 covers clients, requirements, proposals, tasks, follow-ups, site visits, deals, imports, exports, map, and reports.

## Delivery Principles

- Fix broken user-visible workflows before adding more UI.
- Keep frontend and backend contracts explicit and tested.
- Backend authorization is the source of truth.
- Worker geography restrictions must be enforced server-side on every relevant query.
- Every major workflow needs an end-to-end test before it is considered done.
- Avoid mock success states for production workflows.

## Phase 0: Stabilize Tooling and Runtime

Priority: P0

Purpose: Make the monorepo reliably testable before expanding features.

Tasks:

- Add root and workspace validation commands that work consistently.
- Fix backend lint by adding ESLint 9 flat config or pinning ESLint 8. Currently `Backend/package.json` has `"eslint": "^9.0.0"` but no config file exists at `Backend/` root.
- Ensure `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:backend`, and `npm run test:frontend` are documented and working.
- Confirm local dev server ports:
  - Frontend: `3000`
  - Backend: `4000`
  - Playwright frontend test server: `3100` (per `Frontend/playwright.config.ts` line 8/27)
- Remove or clearly mark legacy `Backend/frontend/` as inactive. This folder contains a full Next.js app with `node_modules/` and should be excluded from workspace or deleted.
- Update `Frontend/README.md`; it still contains default Next.js starter text (36 lines of boilerplate).
- Add a root `docs/` index if more delivery docs are added.
- Audit and remove unused `next-auth` dependency from `Frontend/package.json` (installed but `AuthProvider` is a no-op pass-through at `Frontend/src/providers/AuthProvider.tsx`).

Acceptance criteria:

- `npm run typecheck` passes.
- `npm run lint` passes or fails only on intentional tracked warnings.
- `npm run test:backend` passes.
- `npm run test:frontend` starts its own server and runs in a normal local environment.
- README instructions match the current monorepo.
- Legacy `Backend/frontend/` is removed or clearly marked inactive.
- `Frontend/README.md` reflects the actual project setup.

## Phase 1: Fix Blocking Workflow Defects

Priority: P0

Purpose: Fix flows that currently fail or present false success.

### 1. Add Property End-to-End

Current issue:

- `Frontend/src/app/(dashboard)/properties/new/page.tsx` (line 147-155) validates local state, shows success toast, and redirects without creating any backend record.
- `Frontend/src/app/(dashboard)/properties/[id]/edit/page.tsx` (line 100-108) same issue on update.
- `Frontend/src/app/(dashboard)/properties/[id]/page.tsx` (line 102-105) delete handler only shows toast without calling API.
- The `useCreateProperty()` hook exists in `use-properties.ts` (line 104-110) but is never called by the form.

Tasks:

- Convert Add Property submit to real API calls using existing `useCreateProperty()` hook.
- Support all entry types:
  - Building -> `POST /buildings` (backend: `buildings.controller.ts` line 90)
  - Floor -> `POST /buildings/:buildingId/floors` (backend: `floors.controller.ts` line 39)
  - Unit -> `POST /units` (backend: `units.controller.ts` line 51)
- Replace hard-coded constants in `properties/new/page.tsx` with backend reference data from `GET /reference/property-types`, `GET /reference/furnishing-statuses`, `GET /reference/availability-statuses`, `GET /reference/verification-statuses`.
- Add building selection dropdown for floor/unit creation.
- Add floor selection dropdown for unit creation.
- Create contact records after entity creation via `POST /contacts`.
- Attach uploaded media/documents after entity creation via `POST /media/upload-url` + `POST /media/complete-upload`.
- Add proper loading, error, and retry states (currently no loading indicator during submit).
- Prevent success toast unless backend creation succeeds.
- Fix property detail delete to call `useDeleteProperty()` and confirm via dialog before deletion.
- Fix property edit to call `useUpdateProperty()` on submit.

Acceptance criteria:

- Admin can create building, floor, and unit from UI.
- Worker can create new building, floor, and unit from UI.
- Created records appear in list and detail screens.
- Failed API calls show actionable errors.
- Property edit saves to backend.
- Property delete removes from backend.
- E2E test covers successful building creation.

### 2. Worker Geography Enforcement

Current issue:

- `GeographyGuard` (`Backend/src/shared/guards/geography.guard.ts`) prepares scope and attaches `request.userGeographicScope`, but inventory controllers and services do not consistently apply it.
- The `@GEOGRAPHY_SCOPE` decorator is available (`Backend/src/shared/decorators/geography-scope.decorator.ts`) but its usage needs to be verified across all controllers.

Tasks:

- Audit every controller for `@UseGuards(GeographyGuard)` and `@GEOGRAPHY_SCOPE()` decorator usage.
- Apply geography guard/decorator to buildings, floors, units, contacts, media, change requests, search, dashboard, and map APIs.
- Pass `userGeographicScope` into service query builders.
- Add additive scope logic:
  - State assignments include all cities/localities in state.
  - City assignments include all localities in city.
  - Locality assignments include only that locality.
- Ensure direct `GET /:id` access also checks geography.
- Ensure Worker cannot access unassigned sensitive contact data by ID manipulation.
- Add unit tests for query filters.
- Add API integration tests for allowed and denied geographies.

Acceptance criteria:

- Worker list APIs only return assigned records.
- Worker direct-ID access outside scope returns `403` or `404`.
- Admin remains unrestricted.
- Tests prove state, city, and locality assignment behavior.

### 3. Approval Detail Correctness

Current issue:

- `Frontend/src/app/(dashboard)/approvals/[id]/page.tsx` (line 41-49) initializes `fieldStatuses` state using `useState` with `approval?.fieldChanges`, but `approval` is still `undefined` at initial render because it loads asynchronously. This means `fieldStatuses` starts as an empty object.

Tasks:

- Initialize field statuses after approval data loads using a `useEffect` that syncs `fieldStatuses` when `approval` changes.
- Add explicit field selection controls (checkboxes per field).
- Disable approve selected when no fields are selected.
- Add edit-final-value control per field.
- Add defer control per field.
- Show conflict state and resolution action when applicable.
- Keep admin comment per action or per field where needed.
- Refresh query state after approval/rejection.

Acceptance criteria:

- Admin can approve all fields.
- Admin can reject all fields.
- Admin can approve selected fields.
- Admin can edit a proposed value before approving.
- Admin can defer a field.
- Worker receives correct resulting status.
- E2E test covers partial approval.

### 4. Proposal Creation Contract

Current issue:

- Frontend sends `unitIds: []`, while backend rejects proposals with no valid units.
- `Frontend/src/app/(v2)/proposals/page.tsx` needs a full builder flow.

Tasks:

- Add proposal builder flow:
  - Select client (from `GET /clients`).
  - Select requirement (from client's requirements).
  - Search/select units (from `GET /units` or `GET /search/units`).
  - Reorder selected units.
  - Choose client-facing fields.
  - Preview.
  - Save draft.
- Align frontend validation with backend DTO (`Backend/src/modules/proposals/dto/proposals.schema.ts`).
- Add PDF generation and download from UI via `POST /proposals/:id/generate-pdf`.
- Add Excel generation if backend supports it, or add backend support.
- Add send-email backend endpoint or remove UI promise until implemented.
- Ensure confidential fields are excluded.

Acceptance criteria:

- Proposal can be created with at least one unit.
- Proposal PDF can be generated and downloaded.
- Proposal preview hides owner phones, internal notes, brokerage, and audit data.
- E2E test covers proposal draft creation.

### 5. Map Contract and Real Map

Current issue:

- Frontend expects `city`, `status`, `lat`, `lng` on `MapProperty` interface (`Frontend/src/app/(v2)/map/page.tsx` line 31-42), but backend `MapService` (`Backend/src/modules/map/map.service.ts` line 14-31) returns only `id, name, buildingCode, latitude, longitude, availabilityStatus.name` — missing `city`, `locality`, `type`, `area`, `rent`.
- UI is a placeholder map with pseudo-positioned pins using index modulo math (`map/page.tsx` line 131-133: `left: \`${10 + (i * 17) % 80}%\``).

Tasks:

- Decide map provider: Google Maps, Mapbox, or OpenStreetMap/Leaflet.
- Normalize backend map response DTO to include: `id`, `name`, `buildingCode`, `city` (from relation), `locality` (from relation), `latitude`, `longitude`, `status` (from `availabilityStatus`), `propertyType`, `availableArea`, `monthlyRent`.
- Update `MapService.findByBounds()` and `MapService.findNearby()` to include `city`, `locality`, `propertyType`, and unit summary fields in the select clause.
- Replace pseudo-positioned pins with real coordinates.
- Implement bounds query with proper viewport passing.
- Implement radius search via `GET /map/properties/nearby`.
- Add clustering for dense areas.
- Add property preview drawer.
- Add open detail action.

Acceptance criteria:

- Real map renders in desktop and mobile.
- Pins are placed by real coordinates.
- Bounds and radius filters call backend.
- Clicking a pin opens a property preview.

### 6. Settings Profile Update

Current issue:

- Frontend (`Frontend/src/app/(dashboard)/settings/page.tsx` line 23) calls `PATCH /auth/me`, but backend only exposes `GET /auth/me` (`Backend/src/modules/auth/auth.controller.ts` line 124-132). There is no `PATCH` handler.
- Settings page shows hardcoded phone number `"+91 98765 43210"` (line 89).
- Password change shows a toast "sent to your email" without calling any backend endpoint (line 36).
- Notification preferences are not persisted anywhere (lines 114-131).

Tasks:

- Add backend `PATCH /auth/me` endpoint in `auth.controller.ts` and `auth.service.ts`.
- Validate allowed editable profile fields (fullName, email).
- Prevent users from changing role/status through profile endpoint.
- Remove hardcoded phone number or add phone field to backend profile if applicable.
- Connect password change to actual `POST /auth/forgot-password` flow.
- Persist notification preferences or remove the UI until backend support exists.
- Add success/error UI.

Acceptance criteria:

- User can update permitted profile fields.
- Unauthorized or invalid profile updates are rejected.
- No hardcoded data in settings form.

### 7. Mock Auth Routes

Current issue:

- `Frontend/src/app/api/auth/verify-otp/route.ts` (line 24) sets `mock-jwt-token` as the auth-session cookie. Accepts any 6-digit OTP.
- `Frontend/src/app/api/auth/send-otp/route.ts` just logs to console.
- `Frontend/src/app/api/auth/forgot-password/route.ts` just logs to console.
- All three have `TODO: Integrate with actual` comments.

Tasks:

- Remove server-side mock auth API routes or redirect them to backend endpoints.
- Ensure frontend auth hooks (`use-auth.ts`) call backend `POST /auth/login`, `POST /auth/verify-email-otp`, `POST /auth/forgot-password`, `POST /auth/reset-password` directly.
- Verify token storage and refresh flow works with real backend.
- Remove or replace `AuthProvider` no-op (`Frontend/src/providers/AuthProvider.tsx`).

Acceptance criteria:

- Login flow uses real backend OTP.
- Password reset flow uses real backend endpoints.
- No mock tokens are set in cookies.

### 8. Mock Activity and Notifications

Current issue:

- `Frontend/src/app/(dashboard)/activity/page.tsx` (lines 7-85) uses entirely hardcoded `MOCK_ACTIVITY` data.
- `Frontend/src/components/layout/TopBar.tsx` (lines 17-23) uses hardcoded `MOCK_NOTIFICATIONS`.
- `Frontend/src/components/layout/TopBar.tsx` (lines 25-55) uses hardcoded `SEARCH_RESULTS` for Cmd+K search.

Tasks:

- Replace activity page mock data with real API calls to `GET /audit` endpoint.
- Add filters (user, date range, entity type, event type).
- Replace notification mock data with real API calls or remove the notifications dropdown until backend notification system is ready.
- Replace Cmd+K search with real search API calls to `GET /search/properties`, `GET /search/contacts`.
- Remove hardcoded search results.

Acceptance criteria:

- Activity page shows real audit data.
- Notifications dropdown shows real data or is hidden.
- Cmd+K search returns real results.

### 9. Import Upload URL Mismatch

Current issue:

- `Frontend/src/hooks/use-imports.ts` (line 32) defaults to `http://localhost:3000/api/v1` instead of `http://localhost:4000/api/v1`.
- UI says "Supports .csv, .xlsx" but backend only parses CSV.

Tasks:

- Fix default URL to use `http://localhost:4000/api/v1`.
- Add XLSX parsing support in backend or remove XLSX from frontend until supported.
- Ensure import upload works end-to-end.

Acceptance criteria:

- Import upload reaches the correct backend endpoint.
- File type support matches between frontend and backend.

### 10. Export Entity Type Mismatch

Current issue:

- Frontend export types (`Frontend/src/app/(v2)/exports/page.tsx` lines 19-48) use `"properties"`, `"clients"`, `"deals"`, `"requirements"` but backend `GET /exports/:entityType` needs to accept these values.
- Backend export returns JSON array, not CSV string.

Tasks:

- Verify backend export endpoint accepts frontend entity type values.
- Add CSV generation in backend export service.
- Add XLSX generation if needed.
- Align response format with frontend expectations.

Acceptance criteria:

- Export download works for all entity types.
- Downloaded file is valid CSV or XLSX.

## Phase 2: Complete V1 Core Platform

Priority: P1

Purpose: Finish the V1 PRD scope so the platform is operational for internal inventory management.

### 1. Inventory Lists and Detail Screens

Current state:

- Properties list (`Frontend/src/app/(dashboard)/properties/page.tsx`) has filters for state, city, property type, furnishing, availability, workers, area range, and rent range. Sorting and pagination exist.
- Buildings, Floors, Units list pages exist but may lack full filtering.
- Property detail page exists but passes empty arrays for contacts and media (`properties/[id]/page.tsx` lines 529, 532).

Tasks:

- Complete Properties, Buildings, Floors, and Units list filters:
  - global search
  - state
  - city
  - locality
  - property type
  - furnishing
  - availability
  - verification status
  - rent range
  - area range
  - assigned worker
  - duplicate status
- Add sorting and pagination to every list.
- Persist filter state within session.
- Complete detail screens with:
  - contacts (currently hardcoded empty `[]`)
  - floors
  - units
  - media/documents (currently hardcoded empty `[]`)
  - notes
  - pending changes
  - version history
  - recent activity
  - restore/delete actions where authorized.

Acceptance criteria:

- Admin can inspect full building/floor/unit hierarchy.
- Worker sees scoped inventory only.
- Lists stay usable with large seeded datasets.

### 2. Add/Edit Property Workflow

Current state:

- 8-step multi-step form exists in both new and edit pages.
- Edit form has placeholder steps for Contacts and Media (lines 442-453 of `properties/[id]/edit/page.tsx`).
- No GPS capture, no duplicate detection.

Tasks:

- Add local draft persistence.
- Add autosave where practical.
- Add GPS capture with browser geolocation.
- Add Google Maps URL parsing if feasible.
- Add duplicate check before final submit.
- Add duplicate warning panel.
- Require duplicate override reason when continuing.
- Clearly distinguish:
  - new record creates Master Data
  - existing record edit creates Change Request for Worker.
- Highlight changed fields during edit.
- Complete edit form Contacts and Media steps (currently empty placeholders).

Acceptance criteria:

- Worker can complete add-property flow on mobile.
- Worker existing-record edits create change requests.
- Admin direct edits update master records.
- Duplicate warning appears before final creation when match exists.

### 3. Change Requests and Approvals

Current state:

- Approval list page exists (`approvals/page.tsx`).
- Approval detail page exists (`approvals/[id]/page.tsx`) with approve all, reject all, approve selected, per-field status management, and admin comment.
- Hooks `useApproveChangeRequestItems` and `useRejectChangeRequestItems` exist in `use-approvals.ts`.
- Backend supports: `GET /change-requests`, `GET /change-requests/:id`, `POST /change-requests/:id/approve-items`, `POST /change-requests/:id/reject-items`, `POST /change-requests/:id/resolve-conflict`, `POST /change-requests/:id/withdraw`.

Tasks:

- Complete Approval Center filters:
  - worker
  - city
  - locality
  - date
  - entity type
  - priority
  - conflict status.
- Add queue metrics:
  - pending count
  - high priority
  - rejected
  - approved today.
- Add grouped list views.
- Add conflict detection for simultaneous field edits.
- Add conflict resolution UI.
- Add field-level history.
- Add worker withdraw/revise pending request.
- Add notifications after admin decision.

Acceptance criteria:

- Admin can approve, reject, edit, defer, and resolve conflicts field by field.
- Batch approve/reject works.
- Worker can see pending, approved, rejected, and comments.

### 4. Media and Documents

Current state:

- Media list page exists (`media/page.tsx`).
- `MediaUploadButton` component exists.
- Backend media module has presigned URL upload flow (`POST /media/upload-url`, `POST /media/complete-upload`, `GET /media/:id/download-url`).
- Property detail page passes empty media array.

Tasks:

- Require entity association on upload.
- Validate file type and size on frontend before upload.
- Implement upload progress per file.
- Add failed upload retry.
- Add image preview.
- Add PDF preview.
- Add video thumbnail/player.
- Add authorized download action.
- Add admin delete.
- Add restore deleted files within retention window.
- Add filters:
  - category
  - property
  - uploader
  - file name search.
- Ensure private storage and signed URL flow is used.
- Connect media upload to property detail page.

Acceptance criteria:

- Files are private.
- Users only access authorized files.
- Upload/download/preview/delete/restore all work.

### 5. Contacts and Sensitive Data

Current state:

- `ContactCard` component exists (`components/properties/ContactCard.tsx`).
- Backend contacts module has CRUD, view-log, and soft-delete.
- Property detail page passes empty contacts array.
- Encryption service exists for sensitive fields.

Tasks:

- Complete contact add/edit/delete/restore.
- Hide sensitive contact values in generic previews.
- Add explicit reveal/view action.
- Ensure backend audit event is created on sensitive contact view (`POST /contacts/:id/view-log`).
- Enforce geography scope for contact access.
- Connect contacts to property detail page.

Acceptance criteria:

- Contact view is audited.
- Worker cannot view contacts outside assigned geography.

### 6. Dashboard and Activity Log

Current state:

- Dashboard page exists with `useDashboard()` hook calling `GET /dashboard/admin`.
- Activity page uses entirely hardcoded mock data.
- Backend has `GET /dashboard/admin`, `GET /dashboard/worker`, `GET /dashboard/activity`.

Tasks:

- Normalize backend and frontend dashboard contracts.
- Build separate Admin and Worker dashboard widgets.
- Add duplicate warnings widget.
- Add recently uploaded media/documents widget.
- Add worker assignment metrics.
- Replace activity page mock data with real API calls.
- Complete Activity Log filters:
  - user
  - date range
  - entity type
  - event type
  - property/building
  - city/locality.
- Show old value/new value where available.
- Link activity events to affected records.

Acceptance criteria:

- Admin dashboard reflects all data.
- Worker dashboard reflects only scoped data.
- Audit log is usable for investigation.

### 7. User and Assignment Management

Current state:

- User management page exists (`settings/users/page.tsx`) with create, edit, delete dialogs.
- Backend supports: `GET /users`, `POST /users/invite`, `PATCH /users/:id`, `DELETE /users/:id`, `POST /users/:id/geographic-assignments`, `POST /users/:id/reset-password`.
- Invite form includes password field but backend generates temporary password.

Tasks:

- Complete user invite flow.
- Remove password field from invite UI or clearly mark as ignored if backend generates temporary password.
- Add assignment management UI:
  - states
  - cities
  - localities
  - active/inactive assignments.
- Add deactivate/reactivate user.
- Add reset password.
- Add assigned inventory count.

Acceptance criteria:

- Admin can invite, edit, deactivate, and assign workers.
- Worker scope changes affect data access immediately.

## Phase 3: Complete V2 Business Modules

Priority: P1/P2

Purpose: Build CRM, transaction, and operational workflows beyond inventory.

### 1. Clients and Requirements

Current state:

- Client list, create, edit, detail pages exist under `(v2)/clients/`.
- Requirements page exists (`(v2)/requirements/page.tsx`).
- Backend has full CRUD: `GET /clients`, `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`, `POST /clients/:id/contacts`, `DELETE /clients/:clientId/contacts/:contactId`, `POST /clients/:id/requirements`, `PATCH /clients/requirements/:reqId`, `POST /clients/requirements/:reqId/shortlists`, `PATCH /clients/shortlists/:shortlistId`.
- Hooks `use-clients.ts` and `use-requirements.ts` exist.

Tasks:

- Complete client list, create, edit, archive/restore.
- Add client profile detail page.
- Add multiple contacts per client.
- Add requirements CRUD.
- Add suggested matching properties.
- Add shortlist management.
- Link requirements to proposals, tasks, site visits, and deals.

Acceptance criteria:

- User can manage client lifecycle.
- Requirement can produce shortlist and proposal.

### 2. Proposal Builder

Current state:

- Proposals list page exists (`(v2)/proposals/page.tsx`).
- Backend supports: `GET /proposals`, `GET /proposals/:id`, `POST /proposals`, `POST /proposals/:id/generate-pdf`, `PATCH /proposals/:id/status`.
- Hook `use-proposals.ts` exists.
- Backend `Proposal` Prisma model exists with `unitIds` JSON field.

Tasks:

- Build full proposal builder from requirement shortlist.
- Support reorder properties.
- Support field visibility selection.
- Add client-safe preview.
- Generate PDF via `POST /proposals/:id/generate-pdf`.
- Generate XLSX (add backend support if needed).
- Save draft.
- Send by email if SMTP is configured.

Acceptance criteria:

- Proposal is useful to send externally.
- Confidential information is excluded by tests.

### 3. Tasks and Follow-Ups

Current state:

- Tasks list and detail pages exist under `(v2)/tasks/`.
- Follow-ups page exists (`(v2)/follow-ups/page.tsx`).
- Backend supports: `GET /tasks`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/follow-ups`, `GET /tasks/:id/follow-ups`, `PATCH /tasks/follow-ups/:followUpId`, `DELETE /tasks/:id`, `POST /tasks/:id/restore`.
- Hooks `use-tasks.ts` and `use-follow-ups.ts` exist.

Tasks:

- Complete task list, my tasks, assigned tasks.
- Add create/edit/delete/restore.
- Add due date, priority, status, reminders.
- Link task to client/property/requirement/deal.
- Add overdue indicators.
- Complete follow-up list and actions.

Acceptance criteria:

- Worker can manage daily tasks and follow-ups.
- Admin can review team workload.

### 4. Site Visits

Current state:

- Site visits list and detail pages exist under `(v2)/site-visits/`.
- Backend supports: `GET /site-visits`, `GET /site-visits/:id`, `POST /site-visits`, `PATCH /site-visits/:id`, `POST /site-visits/:id/complete`, `POST /site-visits/:id/cancel`, `DELETE /site-visits/:id`, `POST /site-visits/:id/restore`.
- Hook `use-site-visits.ts` exists.

Tasks:

- Add calendar view.
- Add agenda view.
- Create/edit/reschedule/cancel visits.
- Link client, requirement, property/unit, and worker.
- Add visit notes.
- Mark completed.
- Add reminders.

Acceptance criteria:

- Site visit lifecycle works from schedule to completion.

### 5. Deals, Commissions, Invoices, Payments

Current state:

- Deals list and detail pages exist under `(v2)/deals/`.
- Commissions and invoices pages exist.
- Backend supports: `GET /deals`, `GET /deals/:id`, `POST /deals`, `PATCH /deals/:id`, `POST /deals/:id/commissions`, `POST /deals/:id/invoices`, `PATCH /deals/invoices/:invoiceId/pay`, `DELETE /deals/:id`, `POST /deals/:id/restore`.
- Hook `use-deals.ts` exists.

Tasks:

- Complete Kanban and list views.
- Implement pipeline stages:
  - requirement received
  - properties shortlisted
  - site visit scheduled
  - site visit completed
  - negotiation
  - agreement shared
  - deal closed
  - lost.
- Add deal create/edit/delete/restore.
- Add commission records.
- Add invoice records.
- Add payment status tracking.
- Link deals to client, requirement, property/unit, assigned worker.

Acceptance criteria:

- Deal pipeline is usable for daily sales operations.
- Closed deals can track commission, invoice, and payment status.

### 6. Imports

Current state:

- Imports page exists (`(v2)/imports/page.tsx`) with upload UI and import history.
- Backend supports: `GET /imports`, `GET /imports/:id`, `POST /imports/upload`, `POST /imports/:id/map-columns`, `POST /imports/:id/validate`, `POST /imports/:id/confirm`.
- Hook `use-imports.ts` exists.
- Upload uses `fetch()` directly with wrong base URL (defaults to `localhost:3000`).

Tasks:

- Fix import upload API base URL (currently defaults to `localhost:3000`).
- Add XLSX parsing support or remove XLSX from UI until supported.
- Add column mapping UI.
- Add required field validation UI.
- Add row-level error display.
- Add duplicate preview.
- Add confirm import.
- Add progress tracking.
- Add import history detail page.
- Add error report download.
- Prevent silent overwrite of master data.

Acceptance criteria:

- Admin can import CSV/XLSX through upload -> map -> validate -> preview -> confirm.
- Invalid rows are visible and downloadable.

### 7. Exports

Current state:

- Exports page exists (`(v2)/exports/page.tsx`) with entity type selection, CSV/Excel format toggle, and download.
- Backend has `GET /exports/:entityType` that returns CSV-ready JSON.
- Hook `use-exports.ts` exists.
- Frontend entity types: `properties`, `clients`, `deals`, `requirements`.

Tasks:

- Align frontend entity names with backend export types.
- Add async export jobs if needed for large data.
- Add field selection.
- Add filters.
- Add sensitive-field exclusion.
- Add CSV and XLSX output (backend currently returns JSON, not CSV).
- Add export history.
- Add completed download URLs.

Acceptance criteria:

- Admin can export filtered operational datasets.
- Sensitive fields are excluded unless explicitly authorized.

### 8. Reports

Current state:

- Reports page exists (`(v2)/reports/page.tsx`).
- No backend reports endpoint exists yet.

Tasks:

- Define report inventory:
  - inventory summary
  - availability
  - approvals
  - worker activity
  - imports/exports
  - client pipeline
  - deal pipeline
  - site visits.
- Add backend report endpoints.
- Add filters and export action.
- Add charts only where they support operational decisions.

Acceptance criteria:

- Reports are filterable and exportable.

## Phase 4: Security, Reliability, and Performance

Priority: P1

Purpose: Make the system safe for real internal data.

### Security

Current state:

- JWT auth with access (15m) and refresh (7d) tokens.
- RBAC via `@Roles()` decorator and `RolesGuard`.
- Geography guard registered globally in `SharedModule`.
- Org guard for multi-tenant isolation.
- Encryption service (`AES-256-GCM`) for sensitive fields.
- Audit interceptor logs non-GET mutations.
- Request ID middleware for traceability.

Tasks:

- Enforce RBAC on every endpoint (audit all controllers).
- Enforce geography authorization at query and direct-ID access level.
- Audit sensitive contact views (verify `POST /contacts/:id/view-log` is called).
- Audit file download URL generation.
- Add session/device tracking.
- Add refresh token rotation tests.
- Add account disabled/session expired UI states.
- Ensure signed upload and download URLs expire.
- Add file size/type validation on frontend and backend.
- Add future malware scanning integration point.

Acceptance criteria:

- Worker cannot access unauthorized data by URL/API manipulation.
- Sensitive actions are auditable.

### Reliability

Current state:

- Health endpoint exists (`GET /health`).
- Docker Compose for local and production.
- Monitoring module exists with Prometheus metrics.
- Structured JSON logger exists.
- Request ID middleware exists.

Tasks:

- Verify health check covers database, Redis, and storage.
- Add structured logs with request IDs (already partially implemented).
- Add global error tracking integration (Sentry or similar).
- Add backup and restore runbook verification (runbook exists at `Backend/docs/DEPLOYMENT-RUNBOOK.md`).
- Add background job retry policy (BullMQ is installed).
- Add object storage lifecycle policy.

Acceptance criteria:

- Production operations are documented and monitorable.

### Performance

Current state:

- Pagination exists on list endpoints.
- Prisma `fullTextSearchPostgres` preview feature is enabled.
- Indexes exist from migrations.

Tasks:

- Add database indexes for:
  - geography (state/city/locality IDs)
  - property status
  - property type
  - rent
  - area
  - building name
  - contacts
  - timestamps.
- Seed/load-test 50,000 property records.
- Benchmark:
  - property search under 2 seconds
  - paginated property list under 2 seconds
  - approval queue under 2 seconds.
- Add pagination to all large lists.
- Avoid returning sensitive or unnecessary fields.

Acceptance criteria:

- Core list/search targets meet PRD performance goals with realistic data.

## Phase 5: Testing and QA Matrix

Priority: P1

Current state:

- Backend: 24 unit test suites, 176 tests passing. E2E test covers health, auth flow, reference data, protected endpoints, and Swagger validation.
- Frontend: 12 Playwright E2E test files covering auth, navigation, search/filter, properties, detail pages, edit flows, delete confirmation, status changes, pagination, accessibility, features, and clients-deals.
- No frontend unit tests exist.
- Playwright config uses port `3100` with auth setup project.

Testing layers:

- Unit tests for services and helpers.
- API integration tests for auth, inventory, approvals, media, imports, exports, and geography.
- Playwright E2E tests for user workflows.
- Accessibility checks for forms, dialogs, tables, and navigation.
- Mobile viewport tests for worker workflows.

Required E2E workflows:

- Admin login with OTP.
- Worker login with OTP.
- Forgot password and reset password.
- Admin creates worker and assigns geography.
- Worker sees only assigned inventory.
- Worker creates building.
- Worker edits existing building and creates change request.
- Admin partially approves a change request.
- Admin rejects a change request with comment.
- Admin resolves conflict.
- Upload media to property.
- Download authorized media.
- Import CSV through full flow.
- Export filtered CSV/XLSX.
- Create client.
- Create requirement.
- Shortlist properties.
- Generate proposal PDF.
- Create task and follow-up.
- Schedule and complete site visit.
- Move deal through pipeline.

Manual QA checklist:

- Desktop navigation.
- Mobile navigation.
- Mobile Add Property flow.
- Keyboard navigation.
- Focus states.
- Dialog close/cancel behavior.
- Error and loading states.
- Empty states.
- Unauthorized access handling.
- Session expired handling.

## Phase 6: Deployment Readiness

Priority: P2

Current state:

- `Backend/.env.example` and `Backend/.env.production.example` exist.
- Docker Compose files exist: `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.staging.yml`.
- Deployment runbook exists at `Backend/docs/DEPLOYMENT-RUNBOOK.md`.
- DNS setup docs exist at `Backend/docs/DNS-SETUP.md`.
- Blue-green deploy script exists at `Backend/scripts/blue-green-deploy.sh`.
- ECS deploy script exists at `Backend/scripts/deploy-ecs.sh`.
- SSL setup and renewal scripts exist.
- Database backup and verify scripts exist.
- Nginx configs exist for blue-green deployment.
- GitHub Actions CI workflow exists at `Backend/.github/workflows/ci.yml`.

Tasks:

- Finalize `.env.example` and environment docs.
- Verify Docker Compose production/staging guidance works.
- Verify migrations from empty database.
- Verify seed script idempotency.
- Add staging deployment checklist.
- Add production deployment checklist.
- Add rollback process.
- Add backup restore drill.
- Add monitoring dashboards (Loki and Promtail configs exist at `Backend/monitoring/`).
- Add uptime checks (UptimeRobot doc exists).

Acceptance criteria:

- A new developer can run the system from README.
- Staging can be deployed from clean environment.
- Production release has rollback and backup plans.

## Suggested Milestones

### Milestone 1: Stabilized Local Platform

Target outcome:

- Tooling works.
- Login works end-to-end with real backend OTP.
- Main screens load without console errors.
- Critical contract mismatches fixed.
- No mock auth routes or fake success states.

Includes:

- Phase 0
- Phase 1 items 3, 4, 5, 6, 7, 8, 9, 10

### Milestone 2: V1 Inventory and Approvals Complete

Target outcome:

- Admin and Worker can operate core property inventory.
- Worker edits safely route through approvals.
- Geography access is enforced.
- Add/Edit Property forms submit to real backend.
- Property detail shows real contacts and media.

Includes:

- Phase 1 items 1 and 2
- Phase 2 items 1, 2, 3, 7

### Milestone 3: V1 Documents, Audit, and Dashboards Complete

Target outcome:

- Media/documents and audit are production usable.
- Dashboards show meaningful scoped metrics.
- Activity log shows real audit data.

Includes:

- Phase 2 items 4, 5, 6

### Milestone 4: V2 CRM and Operations Complete

Target outcome:

- Clients, requirements, proposals, tasks, visits, and deals work end to end.

Includes:

- Phase 3 items 1, 2, 3, 4, 5

### Milestone 5: V2 Data Operations Complete

Target outcome:

- Imports, exports, reports, and map workflows are usable.

Includes:

- Phase 3 items 6, 7, 8

### Milestone 6: Production Readiness

Target outcome:

- Security, reliability, performance, and deployment readiness gates pass.

Includes:

- Phase 4
- Phase 5
- Phase 6

## Definition of Done

A feature is done only when:

- Frontend and backend contracts are aligned.
- Backend authorization is enforced.
- Loading, empty, success, and error states are implemented.
- Unit or integration tests cover backend behavior.
- Playwright or manual QA covers the user workflow.
- The workflow is documented if setup or operational behavior is non-obvious.
- No known console errors appear during the workflow.
- Typecheck and relevant tests pass.

## Immediate Next Sprint Recommendation

Sprint goal: remove false success states and unblock core workflows.

Recommended tickets:

1. Fix lint/tooling and README drift. (Phase 0)
2. Fix Add Property to create real backend records. (Phase 1.1 — `properties/new/page.tsx` line 147)
3. Fix Property Edit to create real backend records. (Phase 1.1 — `properties/[id]/edit/page.tsx` line 100)
4. Fix Property Delete to call real API. (Phase 1.1 — `properties/[id]/page.tsx` line 102)
5. Enforce worker geography on buildings list/detail. (Phase 1.2)
6. Fix Approval Detail async field status initialization. (Phase 1.3 — `approvals/[id]/page.tsx` line 41)
7. Fix Proposal create contract and add unit selection. (Phase 1.4)
8. Fix Map response mapping and replace placeholder with real map. (Phase 1.5 — `map.service.ts` missing fields, `map/page.tsx` pseudo-pins)
9. Fix Settings profile endpoint mismatch. (Phase 1.6 — add `PATCH /auth/me` to backend)
10. Remove mock auth routes and connect to real backend. (Phase 1.7)
11. Replace mock activity data with real API calls. (Phase 1.8 — `activity/page.tsx` lines 7-85)
12. Fix Import URL fallback. (Phase 1.9 — `use-imports.ts` line 32)
13. Fix Export entity type mismatch. (Phase 1.10)
14. Add E2E smoke tests for login, create building, approval partial approve. (Phase 5)

## Additional Things We Can Add

This section captures valuable additions beyond the original PRDs. These should be prioritized after the core V1 workflows are reliable unless a business need makes one urgent.

### Product and Workflow Enhancements

- Universal command palette for quick navigation and actions.
- Saved views for property searches, approval queues, tasks, deals, and reports.
- Bulk edit for admin-managed inventory fields.
- Bulk assign/reassign workers by geography or selected records.
- Duplicate merge assistant with side-by-side comparison and merge history.
- Property completeness score based on missing fields, media, contacts, GPS, and verification.
- Data quality dashboard for missing coordinates, stale listings, unverified contacts, and duplicate risk.
- Worker productivity dashboard with additions, edits, approvals, rejections, visits, and follow-ups.
- Notification center for approvals, assigned tasks, site visits, imports, exports, and deal updates.
- Comment threads on properties, requirements, deals, and approval requests.
- Internal notes with visibility levels: admin-only, team-visible, worker-visible.
- Watch/follow records so users can subscribe to property or client updates.
- Recently viewed records and pinned records.
- Favorites/shortcuts for high-priority buildings, clients, and deals.
- SLA indicators for pending approvals, follow-ups, and site visits.
- Stale listing reminders when availability or rent has not been verified recently.
- Contact verification workflow with verified/unverified/needs-callback status.
- Lead source tracking for clients, requirements, and properties.
- Broker/channel partner management.
- Owner relationship history across multiple properties.
- Tenant history and occupancy timeline.
- Rent revision history and escalation timeline.
- Deal loss reason tracking and analytics.
- Proposal template library.
- Branded proposal themes for different client segments.
- Client-facing proposal share links with expiry.
- Proposal view tracking and client activity events.
- Calendar sync for site visits and follow-ups.
- Route planning for field workers across multiple site visits.
- Offline-capable field data capture with later sync.
- Draft queue for workers in poor network conditions.
- Mobile photo compression before upload.
- GPS accuracy warnings and retake flow.
- Nearby duplicate alerts while capturing GPS.
- Map heatmaps for availability, demand, and deal activity.
- Locality/micro-market intelligence notes.
- Pricing benchmark view by locality and property type.
- Requirement-to-property match scoring.
- Automatic shortlist suggestions.
- Deal probability scoring.
- Commission forecast dashboard.
- Invoice aging dashboard.
- Payment reminders.
- Role-specific onboarding checklist.
- In-app help center and SOP links.

### AI-Assisted Features

- Natural-language property search.
- AI-generated property summaries for internal use.
- AI-generated client-safe proposal descriptions.
- AI duplicate detection using address, coordinates, building names, and contact overlap.
- AI field extraction from uploaded brochures, rent sheets, and property PDFs.
- AI import column mapping suggestions.
- AI data quality suggestions for incomplete records.
- AI call/visit note summarization.
- AI follow-up drafting.
- AI task suggestions from client notes and deal status.
- AI report narrative summaries for management.

### Analytics and Reporting Additions

- City/locality inventory coverage report.
- Available area by city/locality/property type.
- Rent trend report.
- Worker activity report.
- Approval turnaround report.
- Duplicate risk report.
- Stale data report.
- Media completeness report.
- Client demand heatmap.
- Requirement conversion report.
- Site visit conversion report.
- Deal funnel report.
- Commission forecast and actuals report.
- Exportable management dashboard snapshots.

### Admin and Operations Additions

- Feature flags for staged rollout.
- Maintenance mode.
- Admin impersonation with audit logging.
- Configurable reference data management UI.
- Configurable approval rules by field/entity/role.
- Configurable required fields by entity type.
- Configurable duplicate matching thresholds.
- Data retention policy UI.
- Restore center for deleted properties, media, users, and clients.
- System job dashboard for imports, exports, media processing, notifications, and backups.
- Audit event export.
- Security event dashboard.
- User session management and forced logout.
- Device/session list per user.
- IP allowlist support for admin access.

### Integration Opportunities

- Google Maps or Mapbox geocoding.
- WhatsApp notification integration.
- SMS provider integration.
- Email provider integration with deliverability logs.
- Google Calendar or Outlook Calendar sync.
- Google Drive export/archive integration.
- Accounting integration for invoices/payments.
- CRM import/export connectors.
- Webhook system for internal automations.
- Public listing export feed if the business later wants selected public inventory.

### Engineering Quality Additions

- API contract tests generated from OpenAPI.
- Shared TypeScript API client generated from Swagger/OpenAPI.
- Shared DTO package between frontend and backend.
- Storybook or component playground for core UI states.
- Visual regression tests for dashboards, tables, forms, and modals.
- Accessibility CI checks.
- Seed scenarios for admin, worker, approvals, media, clients, and deals.
- Large-data seed for 50,000 property performance testing.
- Database query performance tests.
- Background job integration tests.
- Error boundary coverage in frontend layouts.
- Centralized frontend route guard tests.
- Structured logging dashboard.
- Request tracing across frontend/backend.
- Release checklist automation.
- Conventional commits and changelog generation.
- GitHub Actions CI for typecheck, lint, tests, build, and Playwright.
- Dependency update automation.
- Security scanning for dependencies and secrets.
- Docker image build validation.
- Staging smoke test after deploy.

## GitHub and Deployment Track

The unified codebase should be published as a new repository rather than using the existing separate backend/frontend repositories.

Recommended repository:

- `anmolsansi/IRED-PropertyOS-Monorepo`

Repository contents should include:

- Root workspace files.
- `Backend/` source, Prisma schema, docs, tests, and config.
- `Frontend/` source, public assets, tests, and config.
- Root `docs/`.
- Root `.env.example`.
- Root `.gitignore`.

Repository contents should exclude:

- `node_modules/`
- `.next/`
- `dist/`
- coverage reports
- logs
- local `.env` files
- nested `.git/` directories
- generated test artifacts

Initial GitHub setup tasks:

- Create the new repository.
- Push a clean initial commit from a temporary export or from a converted root repo.
- Add repository description.
- Add topics: `nestjs`, `nextjs`, `prisma`, `property-management`, `real-estate`, `typescript`.
- Add branch protection after CI is working.
- Add GitHub Actions for:
  - install
  - typecheck
  - lint
  - backend tests
  - frontend tests
  - build.
- Add issue labels:
  - `P0`
  - `P1`
  - `P2`
  - `backend`
  - `frontend`
  - `auth`
  - `inventory`
  - `approvals`
  - `media`
  - `v2`
  - `testing`
  - `security`
  - `deployment`.

Deployment options:

- Local Docker Compose for development infrastructure.
- Low-cost VPS deployment for early internal testing.
- Vercel frontend plus containerized backend for faster frontend preview deployments.
- Full container deployment for staging and production.

Initial deployment target recommendation:

- Publish code to GitHub first.
- Add CI next.
- Deploy staging only after Phase 0 and the P0 contract fixes are complete.
- Do not deploy production until geography authorization, auth, media privacy, backups, and audit logging are verified.
