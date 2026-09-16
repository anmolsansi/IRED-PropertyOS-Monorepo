# INV-001 — Store per field inventory verification evidence

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Inventory schema/API  
**Assessment:** P02, A06  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Store per field inventory verification evidence. Updated yesterday does not mean rent was checked yesterday. A verified fact records what was checked, by whom and until when it should be trusted.

## 2. Current behavior and evidence

Building has verificationStatus and updatedAt, but no field-specific verifiedAt/reviewDueAt/source history.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/prisma/schema.prisma](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/prisma/schema.prisma) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

Updated yesterday does not mean rent was checked yesterday. A verified fact records what was checked, by whom and until when it should be trusted.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: Updated yesterday does not mean rent was checked yesterday. A verified fact records what was checked, by whom and until when it should be trusted. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                                        | Baseline state                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/prisma/schema.prisma`                                              | Existing — inspect before editing                         |
| `Backend/prisma/migrations/20260915000900_verification_facts/migration.sql` | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/buildings/verification.service.ts`                     | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/buildings/__tests__/verification.service.spec.ts`      | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [TEN-004](../Pending/TEN-004-enforce-tenant-access-throughout-buildings.md), [DEC-005](../Pending/DEC-005-approve-sharing-retention-and-customer-data-use.md)

**Blocks:** [MATCH-001](../Pending/MATCH-001-persist-and-compute-authorized-match-runs.md), [INV-002](../Pending/INV-002-expose-the-verification-queue-and-review-actions.md), [AI-001](../Pending/AI-001-create-private-source-job-and-review-persistence.md), [AI-016](../Pending/AI-016-summarize-a-deterministic-daily-work-briefing.md), [CRM-005](../Pending/CRM-005-save-and-evaluate-access-scoped-searches.md)

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### FRESH-v1 — verification is explicit evidence

VerificationFact(id UUID, organizationId UUID FK, buildingId UUID FK, unitId UUID nullable FK, fieldKey enum availability, monthly_rent, area, contact, availability_date, valueJson Json, sourceId UUID nullable FK SourceRecord, verifiedBy UUID FK, verifiedAt DateTime, reviewDueAt DateTime, version Int default1); index organizationId/reviewDueAt and buildingId/fieldKey. Unit must belong to building. Current facts are chosen by greatest version, not last write time of an unrelated field.
POST `/buildings/:id/verifications` `{unitId?,fieldKey,value,sourceId?,reviewDueAt}` ->201 `{id,version,verifiedAt,reviewDueAt}` ADMIN only; WORKER submits a proposed change for admin review. Server sets verifiedAt; reviewDueAt must be after now and at most 90 days. Default reminder window 14 days for availability/rent, 90 days for area, explicitly visible in UI. Missing source requires a <=500-char verification note; never backdate verifiedAt during migration.
GET `/buildings/verification-queue?page=1&limit=20` -> paginated `{buildingId,unitId,fieldKey,lastVerifiedAt,reviewDueAt,reason:'missing'|'expired'}`. Expired facts remain history and are flagged in matches. Editing an unrelated property field never refreshes verification.
Persist verificationNote String nullable and requestKey String; unique organizationId/requestKey and buildingId/unitId/fieldKey/version with separate partial indexes for nullable unitId. Request includes expectedVersion Int (0 for first fact) and idempotencyKey String. Serialize concurrent append operations by locking the parent Building row; compare latest fact version in that transaction.

### ACCESS-v1 — tenant boundary (proposed; DEC-002 ratifies rollout)

`AccessContext = { actorId: UUID; organizationId: UUID; role: 'ADMIN'|'WORKER'|'RIDER'; geography: { denyAll:boolean; stateIds:UUID[];cityIds:UUID[];localityIds:UUID[] } }`.
One existing user belongs to one organization in the first release. Context is loaded from active local User and active Organization after the supported authentication guard. Missing membership is denied, never inferred from email or the first available organization. ADMIN is unrestricted geographically inside its organization, not across organizations. WORKER and RIDER retain existing route-role restrictions and geography restrictions; no new role privileges are implied. New product features default to ADMIN/WORKER, RIDER denied until explicitly specified.
`AccessPolicy.requireContext(user)` returns AccessContext or 403 `MEMBERSHIP_REQUIRED`; `buildingWhere(ctx)` returns Prisma.BuildingWhereInput with organizationId AND authorized geography; `clientWhere(ctx)` returns organizationId AND deletedAt:null; `requireBuilding(ctx,id)` / `requireClient(ctx,id)` return the permitted active record or 404. Child entities resolve their parent and must have matching organization membership. Empty/denyAll worker geography returns zero inventory; it is never `{}`. Read permission does not grant write permission.
Every service call, count, export, queued job and final apply uses the same context; jobs reload it rather than trust a stored role. Tenant changes invalidate prior jobs and grants. Platform maintenance uses separately audited offline operations; ordinary ADMIN routes never acquire a global bypass. Existing AUTH-001..018 retain identity/lifecycle ownership.

### SOURCE-v1 — private immutable intake evidence

New SourceRecord: id UUID default uuid; organizationId UUID FK Organization required; actorId UUID FK User required; kind enum(text, pdf, image, audio, csv); version Int default 1; contentHash String required; text String nullable; storageKey String nullable; mimeType String nullable; sizeBytes BigInt nullable; createdAt DateTime default now; expiresAt DateTime required; deletedAt DateTime nullable. Exactly one of text/storageKey; unique organizationId/contentHash/kind/version; index organizationId/createdAt. Hash only inside the tenant boundary; do not disclose cross-tenant deduplication.
Text <=20000 characters. Pilot PDF <=20 MiB and 100 pages; JPEG/PNG <=10 MiB; audio <=25 MiB and 10 minutes; CSV <=10 MiB/10000 rows. Private storage keys `org/<organizationId>/sources/<sourceId>/<version>`; no client-provided remote URLs. Source retention defaults to 30 days only after DEC-005 ratifies it; expiration blocks new runs and is separate from legal holds. AI evidence `{sourceId,version,page?:int,start?:int,end?:int,quote:string}` must match accessible source text, with quote <=500 chars and valid bounds. A citation is evidence, not permission.

### Ticket-specific contract and limits

Schema addition includes nullable source reference only after AI-001 creates SourceRecord. Before that deployment, use a nullable sourceId UUID without FK, then AI-001 adds/validates the FK. Append request: {fieldKey, value, unitId?, sourceId?, verificationNote?, expectedVersion:int, idempotencyKey:string, reviewDueAt?}. Do not accept client verifiedAt.

Shared contracts are included for context and compatibility. Implement only this ticket’s owned slice; consume dependency-owned tables/services without re-creating them. API route examples are relative to `/api/v1` unless that prefix is shown. Return payload examples are inside the existing success envelope unless explicitly binary.

## 9. Required implementation sequence

### Step 0 — READ and VERIFY before CHANGE

1. Confirm the target commit and read every applicable `AGENTS.md`; frontend work must read the installed Next.js documentation required by `Frontend/AGENTS.md`.
2. Inspect the evidence files and each proposed target; trace the relevant call path with the codebase graph.
3. Verify dependencies and approved decision records against merged code.
4. Run the focused baseline checks and record preexisting failures.
5. Write the red/failing regression fixtures from section 10 before changing behavior.

**Checkpoint:** attach the existing call path, exact files, dependency evidence and initial failing assertion. If the source no longer matches this ticket, stop and revise the contract before coding.

### Step 1 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/prisma/schema.prisma`

**Change:** Add VerificationFact as FRESH-v1; preserve existing verificationStatus without backfilling fake dates.

**Why:** Historical labels are not evidence timestamps.

**Verify immediately:** Legacy records appear missing, not freshly verified.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/buildings/verification.service.ts`

**Change:** Implement appendFact(ctx, buildingId, input) for ADMIN; lock latest field version, validate source/lineage and append server-time evidence.

**Why:** Concurrent verifications need ordered immutable history.

**Verify immediately:** Duplicate request key yields same version; stale comparison yields409.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/buildings/verification.service.ts`

**Change:** Implement verification queue with scope, field reason, stable ordering reviewDueAt/id and pagination.

**Why:** The queue creates explicit work rather than an unverifiable score.

**Verify immediately:** Unrelated property edits do not reset expiry.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Unrelated edit

**Purpose:** Prove the boundary named “Unrelated edit” for store per field inventory verification evidence.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Rent fact expired; building notes updated.

**Action:** Read queue/matches.

**Expected result:** Rent still expired.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Updated yesterday does not mean rent was checked yesterday. A verified fact records what was checked, by whom and until when it should be trusted. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Never derive verification from building.updatedAt.

### Test 2 — Concurrent verification

**Purpose:** Prove the boundary named “Concurrent verification” for store per field inventory verification evidence.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Two updates same field base version.

**Action:** Append both.

**Expected result:** One new version; stale update409; history preserved.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Updated yesterday does not mean rent was checked yesterday. A verified fact records what was checked, by whom and until when it should be trusted. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check field lock and compare version.

### Test 3 — Worker cannot mark verified

**Purpose:** Prove the boundary named “Worker cannot mark verified” for store per field inventory verification evidence.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Worker has property edit permission.

**Action:** Append fact directly.

**Expected result:** 403; no verified fact; review request route remains separate.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Updated yesterday does not mean rent was checked yesterday. A verified fact records what was checked, by whom and until when it should be trusted. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check action permission distinct from read.

### Mandatory negative assertions

- A denied read/write does not reveal hidden IDs, counts, nested fields or private source excerpts.
- A rejected/failed operation does not display or persist completed/applied/sent state.
- Retrying the same committed intent does not duplicate its business effect; changed intent does not silently reuse a different result.
- Unavailable optional AI/transport does not invent values or bypass domain permissions.
- Unrelated records, previously released snapshots and existing authenticated-role restrictions remain unchanged.

Apply the relevant invariants to this slice and record an explicit reason for any non-applicable assertion. Do not turn a document review into a claim that runtime invariants passed.

### Commands and environment

```sh
npm --prefix Backend run typecheck
npm --prefix Backend run lint
npm --prefix Backend run build
npm --prefix Backend test -- --runInBand --runTestsByPath src/modules/buildings/__tests__/verification.service.spec.ts
npm --prefix Backend run db:generate
# Isolated test database only: npm --prefix Backend run db:migrate:prod
```

Run from repository root with the existing workspace dependencies installed. Record exact command, commit, exit status and meaningful assertions. Backend `test:e2e` uses the existing `test/jest-e2e.json` and matches `.e2e-spec.ts`; use an isolated PostgreSQL instance for database fixtures. Never pass with zero tests (`--passWithNoTests` is forbidden). Existing frontend runner is Playwright, not Jest. Start the isolated backend separately; Playwright currently starts only the frontend on port 3100. No production credentials, live customer data, or provider spend are needed for deterministic fixtures.

## 11. Manual verification

1. Seed the primary happy path and the first test scenario in an isolated environment. Perform the actual route/UI operation and record IDs/statuses.
2. Reload/read from another request and verify persistence; compare rows, event history and any artifact content.
3. Repeat with the denied/stale/interrupted case from the test plan; verify the precise failure and absence of unintended effects.
4. Retry only where the contract allows it; confirm the same intent does not create duplicates.
5. Record request ID, fixture ID, expected/actual result and redacted screenshots or API transcripts. Do not include tokens, signed URLs or customer data.

## 12. Observability and debugging

Use requestId/jobId/entityId, organizationId, actorId, version and a bounded reason code appropriate to this slice. Record durations, attempts and status transitions where work is asynchronous. Never log provider input/output, password hashes, tokens, private contact data, raw document text or signed URLs. For a decision/document-only ticket, capture review evidence instead of inventing runtime metrics.

Debug in order: request validation → active access context → version/transaction boundary → persisted state → worker/transport → rendering. Compare the failure diagnosis in section 10 before changing another layer.

## 13. PR evidence required

- Problem and resulting behavior, linked ticket and exact implementation commit.
- Changed files and explanation of any explicitly permitted wiring/migration additions.
- Dependency/decision evidence, schema/API contract compatibility and migration dry-run counts if applicable.
- Exact checks run, results and meaningful assertions; distinguish unit, DB integration, browser, hosted CI and deployed verification.
- Redacted manual proof for the happy path and failure/retry path.
- Rollback/disable procedure and unresolved limitations.

Writing the ticket or passing this pack’s documentation validator is not implementation evidence.

## 14. Acceptance criteria

- [ ] Legacy records appear missing, not freshly verified.
- [ ] Duplicate request key yields same version; stale comparison yields409.
- [ ] Unrelated property edits do not reset expiry.

- [ ] All named test scenarios pass at their required evidence level.
- [ ] Required negative assertions and manual behavior are verified.
- [ ] No unapproved authority, default value or external side effect was introduced.

## 15. Definition of done

- [ ] Dependencies and required architect/business decisions are accepted.
- [ ] Implementation is reviewed and matches this ticket’s contracts.
- [ ] Relevant focused tests, typecheck, lint and build pass; preexisting failures are explicitly resolved or reviewed, never hidden.
- [ ] Required database/browser and migration evidence exists where applicable.
- [ ] Logs/diagnostics are safe; recovery behavior is verified.
- [ ] PR evidence and completion record include exact commit/CI links.
- [ ] Move this file from Pending to Completed only after acceptance; update README and coverage links. Deploy status is recorded separately.

For a Decision ticket, completion means the decision deliverable is reviewed and accepted; it does not mean the proposed feature is implemented.

## 16. Rollback and recovery

Disable the newly introduced feature/worker/action at its configuration boundary while preserving canonical records, immutable versions and audit evidence. Keep reads/manual workflows available when the contract permits. For schema changes use an additive forward repair after reconciliation; do not drop new columns or restore an authorization leak as a quick rollback. For interrupted jobs resume from durable status and recheck permissions/version.

Before rollout, attach the slice-specific last-safe version and disable/recovery command or runbook. Decision/document-only rollback is a superseding decision record with affected dependent IDs. No destructive production operation is authorized by this ticket.

## 17. Forbidden shortcuts and STOP conditions

Do not use `{}` as a deny-all predicate, trust browser tenant/role fields, default unknown money/area to zero, mark work complete before commit/storage, silently swallow missing queue/provider dependencies, or let generated text choose an irreversible action. Do not loosen tests to accommodate a bug, enable production test-login, or use live customer data as an unapproved fixture.

STOP — NEEDS ARCHITECT DECISION if any current dependency contract disagrees, a requested field lacks evidence/basis, existing data violates a new constraint, required provider/configuration approval is absent, or scope expands beyond the explicit files. Write the observed conflict and smallest proposed resolution; leave dependent work Pending.

## 18. Completion record

| Evidence                      | Recorded value |
| ----------------------------- | -------------- |
| Implementation commit / PR    | Not performed  |
| Architect/reviewer acceptance | Not recorded   |
| Focused automated checks      | Not performed  |
| Real database checks          | Not performed  |
| Browser/manual verification   | Not performed  |
| Hosted CI                     | Not performed  |
| Deployment and rollback proof | Not performed  |
| Completed by / date           | Not completed  |

[Back to ticket index](../README.md) · [Assessment coverage](../ASSESSMENT_COVERAGE.md)
