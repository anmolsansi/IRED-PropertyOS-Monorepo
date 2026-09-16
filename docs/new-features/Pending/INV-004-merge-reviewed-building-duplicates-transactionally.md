# INV-004 — Merge reviewed building duplicates transactionally

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Inventory quality  
**Assessment:** P03  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Merge reviewed building duplicates transactionally. A merge is an explicit relocation of links with an audit record. It must preserve published history and stop on ambiguous child identity.

## 2. Current behavior and evidence

INV-003 identifies candidates but deliberately performs no merge.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/prisma/schema.prisma](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/prisma/schema.prisma) — exists at the baseline commit.
- [Backend/src/modules/buildings/buildings.controller.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/buildings/buildings.controller.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

A merge is an explicit relocation of links with an audit record. It must preserve published history and stop on ambiguous child identity.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: A merge is an explicit relocation of links with an audit record. It must preserve published history and stop on ambiguous child identity. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                                         | Baseline state                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/prisma/schema.prisma`                                               | Existing — inspect before editing                         |
| `Backend/prisma/migrations/20260915001300_building_merges/migration.sql`     | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/buildings/building-merge.service.ts`                    | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/buildings/buildings.controller.ts`                      | Existing — inspect before editing                         |
| `Backend/src/modules/buildings/__tests__/building-merge.integration.spec.ts` | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [INV-003](../Pending/INV-003-preview-duplicate-inventory-candidates-without-merging.md), [DATA-006](../Pending/DATA-006-enforce-shortlist-entity-relationships.md), [PROP-004](../Pending/PROP-004-enforce-proposal-item-uniqueness-under-concurrency.md), [TEN-005](../Pending/TEN-005-enforce-tenant-access-throughout-units.md)

**Blocks:** No direct dependent ticket currently recorded. Customer release still requires applicable rollout gates.

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### ACCESS-v1 — tenant boundary (proposed; DEC-002 ratifies rollout)

`AccessContext = { actorId: UUID; organizationId: UUID; role: 'ADMIN'|'WORKER'|'RIDER'; geography: { denyAll:boolean; stateIds:UUID[];cityIds:UUID[];localityIds:UUID[] } }`.
One existing user belongs to one organization in the first release. Context is loaded from active local User and active Organization after the supported authentication guard. Missing membership is denied, never inferred from email or the first available organization. ADMIN is unrestricted geographically inside its organization, not across organizations. WORKER and RIDER retain existing route-role restrictions and geography restrictions; no new role privileges are implied. New product features default to ADMIN/WORKER, RIDER denied until explicitly specified.
`AccessPolicy.requireContext(user)` returns AccessContext or 403 `MEMBERSHIP_REQUIRED`; `buildingWhere(ctx)` returns Prisma.BuildingWhereInput with organizationId AND authorized geography; `clientWhere(ctx)` returns organizationId AND deletedAt:null; `requireBuilding(ctx,id)` / `requireClient(ctx,id)` return the permitted active record or 404. Child entities resolve their parent and must have matching organization membership. Empty/denyAll worker geography returns zero inventory; it is never `{}`. Read permission does not grant write permission.
Every service call, count, export, queued job and final apply uses the same context; jobs reload it rather than trust a stored role. Tenant changes invalidate prior jobs and grants. Platform maintenance uses separately audited offline operations; ordinary ADMIN routes never acquire a global bypass. Existing AUTH-001..018 retain identity/lifecycle ownership.

### Transport and validation

Use the existing `/api/v1` URI prefix and bearer authentication. JSON success is `{data: <payload>, meta: {timestamp: ISO8601, requestId: string|null}}`; paginated lists use `{data: [...], meta: {total,page,limit,totalPages}}`. Binary downloads use StreamableFile and the existing content headers. Empty lists return 200 with zero total; they are not errors.
New endpoints use strict Zod objects; unknown keys are rejected. Unless explicitly overridden below: UUID IDs, nonempty names capped at 200 characters, notes capped at 5000, page >=1, limit 1..100 default 20. Missing authentication is 401; known disallowed action is 403; absent or inaccessible object is 404; malformed input is 400; stale version/idempotency conflict is 409; quota exhaustion is 429; unavailable dependency is 503. Preserve the existing error envelope `{statusCode,message,errors,timestamp,path,requestId}`. Put machine reason codes inside `errors.code`, not a second envelope. Do not change unrelated existing endpoint status codes.
All new write routes reject actorId/organizationId supplied in a body. The server derives them. No partial success masquerading as a completed operation.

### RELEASE-v1 — immutable client disclosure

ProposalRelease(id UUID, organizationId UUID FK, proposalId UUID FK, version Int, createdBy UUID FK, snapshotJson Json, snapshotHash String, createdAt DateTime default now); unique proposalId/version. Snapshot includes public client display name, proposal title, selected allowlisted fields, active item IDs and public values, source record versions, templateVersion and disclosedMediaIds. Never include internal notes, contact phones, commission or user relations. Released data is immutable; a refresh makes a new release.
`POST /proposals/:id/releases` body `{expectedUpdatedAt:ISO8601,selectedFields:string[],templateVersion:int}` Idempotency-Key ->201 `{id,version,snapshotHash}`; same-key same request returns existing release; stale proposal or no active items 409. Maximum 50 items/50 fields, unknown/restricted field keys 400/403. Review missing critical rent/area/availability with explicit warnings before release; do not invent values.
ArtifactJob(id UUID, organizationId UUID FK, releaseId UUID FK, format enum(pdf, xlsx), status enum queued, running, ready, failed, cancelled, storageKey String nullable, errorCode String nullable, createdAt/updatedAt); unique releaseId/format. POST `/proposal-releases/:id/artifacts` `{format}` ->202 `{id,status}`; GET `/proposal-artifacts/:id` ->200 status and authorized downloadUrl only when ready. Failure never changes Proposal commercial status. Existing synchronous XLSX route remains until caller migration; it must authorize independently. Render from snapshot only.

### Ticket-specific contract and limits

No child deduplication in this slice. A conflicting pair remains blocked for separate explicit correction. Register service in buildings.module.ts as the one additional wiring file allowed.

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

**Change:** Add BuildingMerge(id, organizationId, sourceId, targetId, requestKey, manifestJson, createdBy, createdAt) with unique organizationId/requestKey and sourceId. POST /buildings/:targetId/merge {sourceId, sourceUpdatedAt, targetUpdatedAt, requestKey, previewHash}. ADMIN only.

**Why:** A stored manifest makes retries and investigations possible.

**Verify immediately:** Preview hash/version mismatch409 with no writes.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/buildings/building-merge.service.ts`, `Backend/src/modules/buildings/buildings.controller.ts`

**Change:** Lock both IDs in lexical order; reject different tenant/locality, active leases on both, conflicting child identity or duplicate logical proposal items; move only unambiguous floor/unit/media/task/shortlist links and archive source atomically.

**Why:** Never guess whether two units are the same physical space.

**Verify immediately:** Any failed FK or conflict rolls back every moved link.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/buildings/building-merge.service.ts`

**Change:** Keep released snapshots unchanged, store all prior link IDs and values, and serve old building lookup as mergedIntoId to authorized staff. No automatic reverse-merge endpoint.

**Why:** Published client evidence must remain historically stable.

**Verify immediately:** Replay returns original manifest; ordinary source listings exclude merged record.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Conflicting children

**Purpose:** Prove the boundary named “Conflicting children” for merge reviewed building duplicates transactionally.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Both buildings have ambiguous unitA.

**Action:** Merge.

**Expected result:** 409 and zero moved links.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A merge is an explicit relocation of links with an audit record. It must preserve published history and stop on ambiguous child identity. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Validate complete preview before transaction.

### Test 2 — Mid-transaction failure

**Purpose:** Prove the boundary named “Mid-transaction failure” for merge reviewed building duplicates transactionally.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Throw after moving floors.

**Action:** Merge.

**Expected result:** All parent links/source status unchanged.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A merge is an explicit relocation of links with an audit record. It must preserve published history and stop on ambiguous child identity. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Use one transaction client.

### Test 3 — Release preservation

**Purpose:** Prove the boundary named “Release preservation” for merge reviewed building duplicates transactionally.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Source appears in released proposal.

**Action:** Merge safe duplicate.

**Expected result:** Snapshot/hash unchanged; live links resolve permitted survivor.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A merge is an explicit relocation of links with an audit record. It must preserve published history and stop on ambiguous child identity. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Do not rewrite immutable releases.

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
npm --prefix Backend test -- --runInBand --runTestsByPath src/modules/buildings/__tests__/building-merge.integration.spec.ts
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

- [ ] Preview hash/version mismatch409 with no writes.
- [ ] Any failed FK or conflict rolls back every moved link.
- [ ] Replay returns original manifest; ordinary source listings exclude merged record.

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
