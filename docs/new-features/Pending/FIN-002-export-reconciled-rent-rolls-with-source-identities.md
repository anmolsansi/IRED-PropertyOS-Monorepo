# FIN-002 — Export reconciled rent rolls with source identities

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Rent roll  
**Assessment:** P20, A20  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Export reconciled rent rolls with source identities. A rent roll is an as-of view of reviewed lease terms. Export totals must reconcile to included source rows.

## 2. Current behavior and evidence

Existing invoice/export code lacks an owner lease rent-roll contract.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/prisma/schema.prisma](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/prisma/schema.prisma) — exists at the baseline commit.
- [Backend/src/app.module.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/app.module.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

A rent roll is an as-of view of reviewed lease terms. Export totals must reconcile to included source rows.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: A rent roll is an as-of view of reviewed lease terms. Export totals must reconcile to included source rows. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                     | Baseline state                                            |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/src/modules/leases/rent-roll.service.ts`        | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/leases/leases.controller.ts`        | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/leases/leases.module.ts`            | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/leases/__tests__/rent-roll.spec.ts` | Proposed — create here or consume dependency-created file |
| `docs/new-features/contracts/rent-roll-v1.md`            | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [DEC-008](../Pending/DEC-008-choose-lease-offer-approval-and-accounting-boundaries.md), [LEASE-002](../Pending/LEASE-002-review-and-activate-lease-versions-atomically.md), [OWNER-001](../Pending/OWNER-001-enforce-explicit-same-tenant-asset-capability-grants.md)

**Blocks:** [FIN-004](../Pending/FIN-004-show-offer-approvals-rent-roll-and-commission-balances.md), [REPORT-001](../Pending/REPORT-001-compute-allowlisted-portfolio-reports.md), [AI-027](../Pending/AI-027-explain-deterministic-portfolio-anomalies-with-source-evidence.md)

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### LEASE-v1 — owner records are a separate domain

Lease(id UUID, organizationId UUID FK, buildingId UUID FK, unitId UUID nullable FK, status enum draft, active, terminated, expired, version Int default1, createdBy UUID FK, createdAt/updatedAt). LeaseParty(id UUID, leaseId UUID FK, kind enum landlord, tenant, displayName String, contactId UUID nullable). LeaseVersion(id UUID, leaseId UUID FK, sequence Int, sourceId UUID FK, effectiveDate Date, terms Json, reviewedBy UUID nullable, reviewedAt DateTime nullable, supersedesId UUID nullable FK); unique leaseId/sequence. No Lease record is inferred from an ordinary closed Deal.
Terms-v1 is `{startDate:date,endDate:date,noticeDays:int,baseMonthly:string,currency:'INR',deposit:string,escalationPercent:string|null,escalationEveryMonths:int|null}` plus per-field SOURCE-v1 citations. Dates ordered, noticeDays 0..730, escalation months 1..120, all amounts MONEY-v1; null recurring terms create no escalation obligations.
LeaseObligation(id UUID, organizationId UUID FK, leaseId UUID FK, leaseVersionId UUID FK, type enum notice, renewal, escalation, dueDate Date, status enum scheduled, completed, cancelled, assigneeId UUID FK, sourceField String, completedAt DateTime nullable); unique leaseVersionId/type/dueDate. Activation requires reviewed critical terms and ADMIN approval under an explicit asset grant; review alone never activates.
New owner features remain behind owner_leasing_enabled=false until the owner pilot/asset-grant decision. Use local date arithmetic for lease dates, UTC instants for deliveries. Amendment activation cancels only pending superseded obligations; completed history remains. No automated legal interpretation, tenant credit scoring or rent collection.

### MONEY-v1 — decimal business values

New monetary API values are decimal strings, never binary floats: currency `'INR'`, amounts with at most two decimals and absolute value <= 999999999999.99; rates/percentages with at most four decimals, 0..100 for percentages. Persist money as Decimal(14,2), rates as Decimal(10,4); explicit round-half-up at the final amount boundary. Null means unknown; zero means known zero. No implicit currency conversion or GST calculation.
Legacy Float columns must be migrated through separate shadow Decimal columns, dry-run reconciliation and dual-read compatibility before removal. DEC-004 approves the exact legacy-field inventory, scale and correction policy. Incoming legacy numeric contracts continue unchanged until a versioned consumer migration is approved. New calculators use decimal arithmetic (Prisma.Decimal where supported) and decimal-string serialization; generic object serialization must not expose Decimal internals.

### ACCESS-v1 — tenant boundary (proposed; DEC-002 ratifies rollout)

`AccessContext = { actorId: UUID; organizationId: UUID; role: 'ADMIN'|'WORKER'|'RIDER'; geography: { denyAll:boolean; stateIds:UUID[];cityIds:UUID[];localityIds:UUID[] } }`.
One existing user belongs to one organization in the first release. Context is loaded from active local User and active Organization after the supported authentication guard. Missing membership is denied, never inferred from email or the first available organization. ADMIN is unrestricted geographically inside its organization, not across organizations. WORKER and RIDER retain existing route-role restrictions and geography restrictions; no new role privileges are implied. New product features default to ADMIN/WORKER, RIDER denied until explicitly specified.
`AccessPolicy.requireContext(user)` returns AccessContext or 403 `MEMBERSHIP_REQUIRED`; `buildingWhere(ctx)` returns Prisma.BuildingWhereInput with organizationId AND authorized geography; `clientWhere(ctx)` returns organizationId AND deletedAt:null; `requireBuilding(ctx,id)` / `requireClient(ctx,id)` return the permitted active record or 404. Child entities resolve their parent and must have matching organization membership. Empty/denyAll worker geography returns zero inventory; it is never `{}`. Read permission does not grant write permission.
Every service call, count, export, queued job and final apply uses the same context; jobs reload it rather than trust a stored role. Tenant changes invalidate prior jobs and grants. Platform maintenance uses separately audited offline operations; ordinary ADMIN routes never acquire a global bypass. Existing AUTH-001..018 retain identity/lifecycle ownership.

### Transport and validation

Use the existing `/api/v1` URI prefix and bearer authentication. JSON success is `{data: <payload>, meta: {timestamp: ISO8601, requestId: string|null}}`; paginated lists use `{data: [...], meta: {total,page,limit,totalPages}}`. Binary downloads use StreamableFile and the existing content headers. Empty lists return 200 with zero total; they are not errors.
New endpoints use strict Zod objects; unknown keys are rejected. Unless explicitly overridden below: UUID IDs, nonempty names capped at 200 characters, notes capped at 5000, page >=1, limit 1..100 default 20. Missing authentication is 401; known disallowed action is 403; absent or inaccessible object is 404; malformed input is 400; stale version/idempotency conflict is 409; quota exhaustion is 429; unavailable dependency is 503. Preserve the existing error envelope `{statusCode,message,errors,timestamp,path,requestId}`. Put machine reason codes inside `errors.code`, not a second envelope. Do not change unrelated existing endpoint status codes.
All new write routes reject actorId/organizationId supplied in a body. The server derives them. No partial success masquerading as a completed operation.

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

**Where:** `Backend/src/modules/leases/rent-roll.service.ts`

**Change:** GET /owner/rent-roll?asOf=YYYY-MM-DD returns/downloads CSV columns organizationId, leaseId, leaseVersionId, buildingId, unitId, currency, baseMonthly, startDate, endDate, status; UTF8 RFC4180 and formula-safe text.

**Why:** Stable IDs support later accounting reconciliation.

**Verify immediately:** Only granted active effective versions included.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/leases/leases.controller.ts`

**Change:** Return manifest rowCount, totalBaseMonthlyByCurrency, sourceHash, excludedConflictCount, generatedAt; unknown amounts excluded and counted, not zero.

**Why:** A user must see incomplete financial source data.

**Verify immediately:** Manifest sum equals exact decimal row sum.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/leases/rent-roll.service.ts`, `Backend/src/modules/leases/leases.controller.ts`

**Change:** Paginate server scan in200 rows, cap10000 and reject over-cap with explicit async-export-required error. Never silently truncate accounting exports.

**Why:** A partial rent roll can produce a wrong financial decision.

**Verify immediately:** No provider push or payment writes.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Reconcile

**Purpose:** Prove the boundary named “Reconcile” for export reconciled rent rolls with source identities.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Three exact decimal rows and one unknown.

**Action:** Export.

**Expected result:** Exact known sum;unknown exclusion count1.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A rent roll is an as-of view of reviewed lease terms. Export totals must reconcile to included source rows. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Avoid Float and null-to-zero.

### Test 2 — Boundary lease

**Purpose:** Prove the boundary named “Boundary lease” for export reconciled rent rolls with source identities.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Amendment effective on asOf.

**Action:** Export.

**Expected result:** Exactly governing version once.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A rent roll is an as-of view of reviewed lease terms. Export totals must reconcile to included source rows. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Apply effective-date interval.

### Test 3 — CSV formula

**Purpose:** Prove the boundary named “CSV formula” for export reconciled rent rolls with source identities.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Tenant label starts equals.

**Action:** Export.

**Expected result:** Literal safe cell, not formula.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A rent roll is an as-of view of reviewed lease terms. Export totals must reconcile to included source rows. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Escape formula-leading content.

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
npm --prefix Backend test -- --runInBand --runTestsByPath src/modules/leases/__tests__/rent-roll.spec.ts
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

- [ ] Only granted active effective versions included.
- [ ] Manifest sum equals exact decimal row sum.
- [ ] No provider push or payment writes.

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
