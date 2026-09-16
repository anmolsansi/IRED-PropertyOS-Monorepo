# MATCH-002 — Expose match runs and comparison UI

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Matching UI/API wiring  
**Assessment:** A02, P05, P14  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Expose match runs and comparison UI. A shortlist shows reasons, trade-offs and unknowns. Users must not interpret a display score as a probability of closing.

## 2. Current behavior and evidence

MATCH-001 owns computation/persistence; current requirement screen has no contracted match run output.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Frontend/src/app/(v2)/requirements/[id]/page.tsx](<https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Frontend/src/app/(v2)/requirements/[id]/page.tsx>) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

A shortlist shows reasons, trade-offs and unknowns. Users must not interpret a display score as a probability of closing.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: A shortlist shows reasons, trade-offs and unknowns. Users must not interpret a display score as a probability of closing. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                          | Baseline state                                            |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/src/modules/requirements/requirements.controller.ts` | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/requirements/requirements.module.ts`     | Proposed — create here or consume dependency-created file |
| `Frontend/src/hooks/use-matches.ts`                           | Proposed — create here or consume dependency-created file |
| `Frontend/src/components/requirements/MatchResults.tsx`       | Proposed — create here or consume dependency-created file |
| `Frontend/e2e/matches.spec.ts`                                | Proposed — create here or consume dependency-created file |
| `Frontend/src/app/(v2)/requirements/[id]/page.tsx`            | Existing — inspect before editing                         |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [MATCH-001](../Pending/MATCH-001-persist-and-compute-authorized-match-runs.md), [DATA-006](../Pending/DATA-006-enforce-shortlist-entity-relationships.md), [REQ-003](../Pending/REQ-003-build-a-requirement-editor-that-preserves-unknown-values.md)

**Blocks:** [PRODUCT-001](../Pending/PRODUCT-001-guide-onboarding-to-the-first-useful-shortlist.md)

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### MATCH-v1 — explainable deterministic shortlist

`POST /requirements/:id/match-runs` body `{expectedVersion:int}` -> 201 `{id,requirementVersion,candidates:[{unitId,score:number,classification:'eligible'|'needs_verification',matched:string[],tradeoffs:string[],missing:string[],verifiedAt:string|null}],totalEligible,truncated:boolean}`. Snapshot the requirement version and candidate record versions. Limit response to 50; evaluate the full authorized database set in batches of 200, stop at 10000 with truncated=true and an explicit narrow-filters warning. Unknown mandatory values are never eligible. Reject changed requirement with 409.
Hard predicates: tenant/geography, active/nondeleted unit/building, required locality, requested area basis/range, budget basis/range, move-in date, furnishing, parking and must-haves. Rank eligible candidates deterministically: fewer soft gaps first, fresher verification second, unitId lexical tie-break; score 0..100 is a deterministic display score, not a probability. No LLM controls filtering. All-in cost uses COST-v1; unknown cost components mean needs_verification. Save MatchRun(id UUID, organizationId UUID FK, requirementId UUID FK, requirementVersion Int, resultJson Json, createdBy UUID FK, createdAt DateTime); index organizationId/requirementId/createdAt. No client PII in resultJson.

### COST-v1 — explicit occupancy comparison

Pure function `compareOccupancy(input)` consumes `{currency:'INR',chargeableArea:string|null,monthlyRent:string|null,rentPerSqftMonth:string|null,camPerSqftMonth:string|null,maintenanceMonthly:string|null,parkingMonthly:string|null,deposit:string|null,months:int}`; months 1..120. All numeric strings nonnegative within MONEY-v1 limits. Use provided monthlyRent; derive it from rate×chargeableArea only when absent and both operands exist. If both are present and disagree by >₹1, return discrepancy instead of silently selecting one.
Output `{baseMonthly:string|null,camMonthly:string|null,recurringMonthly:string|null,deposit:string|null,totalOverTerm:string|null,missing:string[],discrepancies:string[]}`. recurringMonthly = base + CAM + maintenance + parking only when all components are known; known zero is valid. totalOverTerm = recurringMonthly×months; deposit displayed separately and excluded from cost. GST, escalation, fit-out and present value are excluded and visibly labeled. No provider call or database write.

### Transport and validation

Use the existing `/api/v1` URI prefix and bearer authentication. JSON success is `{data: <payload>, meta: {timestamp: ISO8601, requestId: string|null}}`; paginated lists use `{data: [...], meta: {total,page,limit,totalPages}}`. Binary downloads use StreamableFile and the existing content headers. Empty lists return 200 with zero total; they are not errors.
New endpoints use strict Zod objects; unknown keys are rejected. Unless explicitly overridden below: UUID IDs, nonempty names capped at 200 characters, notes capped at 5000, page >=1, limit 1..100 default 20. Missing authentication is 401; known disallowed action is 403; absent or inaccessible object is 404; malformed input is 400; stale version/idempotency conflict is 409; quota exhaustion is 429; unavailable dependency is 503. Preserve the existing error envelope `{statusCode,message,errors,timestamp,path,requestId}`. Put machine reason codes inside `errors.code`, not a second envelope. Do not change unrelated existing endpoint status codes.
All new write routes reject actorId/organizationId supplied in a body. The server derives them. No partial success masquerading as a completed operation.

### Ticket-specific contract and limits

Mount MatchResults on the existing Frontend/src/app/(v2)/requirements/[id]/page.tsx. All matching logic stays in MATCH-001; the UI uses the server result and pure COST-v1 output. No unmounted component counts as acceptance.

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

**Where:** `Backend/src/modules/requirements/requirements.controller.ts`

**Change:** Expose POST match-runs as MATCH-v1 and register service; controller passes context/version, never raw query predicates.

**Why:** Thin wiring must preserve the checked service boundary.

**Verify immediately:** HTTP response matches the frozen contract.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/requirements/requirements.controller.ts`

**Change:** Build typed hook/results component showing eligible and needs-verification separately, price components, last verification and source IDs.

**Why:** The interface must make incomplete data visible.

**Verify immediately:** No undefined value rendered as0 or best match.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Frontend/src/hooks/use-matches.ts`

**Change:** Offer Add to shortlist through existing authorized client shortlist endpoint; on stale-version/access error stop and refresh.

**Why:** AI/ranking result is a suggestion, not an automatic mutation.

**Verify immediately:** No shortlist write until user action.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Mixed results

**Purpose:** Prove the boundary named “Mixed results” for expose match runs and comparison ui.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Eligible+needs_verification+truncated fixture.

**Action:** Render results.

**Expected result:** Distinct groups and narrow-filters warning visible.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A shortlist shows reasons, trade-offs and unknowns. Users must not interpret a display score as a probability of closing. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check classification mapping.

### Test 2 — Stale requirement

**Purpose:** Prove the boundary named “Stale requirement” for expose match runs and comparison ui.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** POST returns409.

**Action:** Click Find matches.

**Expected result:** Keep brief, show rerun/reload notice; no stale cards adopted.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A shortlist shows reasons, trade-offs and unknowns. Users must not interpret a display score as a probability of closing. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check mutation cache key includes version.

### Test 3 — Manual shortlist action

**Purpose:** Prove the boundary named “Manual shortlist action” for expose match runs and comparison ui.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Valid card initially visible.

**Action:** Select Add then repeat.

**Expected result:** One shortlist; conflict handled; no auto-add on render.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A shortlist shows reasons, trade-offs and unknowns. Users must not interpret a display score as a probability of closing. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check click handler and duplicate response.

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
npm --prefix Frontend run typecheck
npm --prefix Frontend run lint
npm --prefix Frontend run build
npm --prefix Frontend test -- e2e/matches.spec.ts --project=chromium
```

Run from repository root with the existing workspace dependencies installed. Record exact command, commit, exit status and meaningful assertions. Backend `test:e2e` uses the existing `test/jest-e2e.json` and matches `.e2e-spec.ts`; use an isolated PostgreSQL instance for database fixtures. Never pass with zero tests (`--passWithNoTests` is forbidden). Existing frontend runner is Playwright, not Jest. Start the isolated backend separately; Playwright currently starts only the frontend on port 3100. No production credentials, live customer data, or provider spend are needed for deterministic fixtures.

## 11. Manual verification

1. Seed the primary happy path and the first test scenario in an isolated environment. Perform the actual route/UI operation and record IDs/statuses.
2. Reload/read from another request and verify persistence; compare rows, event history and any artifact content.
3. Repeat with the denied/stale/interrupted case from the test plan; verify the precise failure and absence of unintended effects.
4. Retry only where the contract allows it; confirm the same intent does not create duplicates.
5. Record request ID, fixture ID, expected/actual result and redacted screenshots or API transcripts. Do not include tokens, signed URLs or customer data.

**UI acceptance:** verify initial loading, empty content, editable draft, pending submit, success after server confirmation, validation failure, 409 conflict, offline/server failure and access revocation where applicable. Keep entered values on retryable errors. Use accessible labels/focus and keyboard submission. No inaccessible stale response remains visible after denial. A component test without the required page mount is incomplete.

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

- [ ] HTTP response matches the frozen contract.
- [ ] No undefined value rendered as0 or best match.
- [ ] No shortlist write until user action.

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
