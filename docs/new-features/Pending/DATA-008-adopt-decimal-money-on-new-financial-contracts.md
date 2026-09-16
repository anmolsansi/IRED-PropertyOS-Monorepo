# DATA-008 — Adopt decimal money on new financial contracts

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Money contracts  
**Assessment:** D12, P05  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Adopt decimal money on new financial contracts. New exact decimal contracts must coexist with old numeric consumers during migration. A shadow column without dual writes immediately becomes stale.

## 2. Current behavior and evidence

Deal/commission/invoice service methods currently write numeric amounts directly; transform recursively serializes objects.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/src/modules/deals/deals.service.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/deals/deals.service.ts) — exists at the baseline commit.
- [Backend/src/modules/deals/deals.controller.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/deals/deals.controller.ts) — exists at the baseline commit.
- [Backend/src/modules/deals/dto/deals.schema.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/deals/dto/deals.schema.ts) — exists at the baseline commit.
- [Backend/src/shared/interceptors/transform.interceptor.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/shared/interceptors/transform.interceptor.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

New exact decimal contracts must coexist with old numeric consumers during migration. A shadow column without dual writes immediately becomes stale.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: New exact decimal contracts must coexist with old numeric consumers during migration. A shadow column without dual writes immediately becomes stale. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                       | Baseline state                                            |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/src/modules/deals/deals.service.ts`               | Existing — inspect before editing                         |
| `Backend/src/modules/deals/deals.controller.ts`            | Existing — inspect before editing                         |
| `Backend/src/modules/deals/dto/deals.schema.ts`            | Existing — inspect before editing                         |
| `Backend/src/shared/interceptors/transform.interceptor.ts` | Existing — inspect before editing                         |
| `Backend/test/money-contract.e2e-spec.ts`                  | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [DATA-007](../Pending/DATA-007-migrate-financial-values-through-shadow-decimal-columns.md), [TEN-007](../Pending/TEN-007-enforce-tenant-access-throughout-deals.md)

**Blocks:** [FIN-001](../Pending/FIN-001-version-leasing-offers-and-enforce-approval-limits.md), [FIN-003](../Pending/FIN-003-track-approved-commission-splits-and-receipt-reversals.md)

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### MONEY-v1 — decimal business values

New monetary API values are decimal strings, never binary floats: currency `'INR'`, amounts with at most two decimals and absolute value <= 999999999999.99; rates/percentages with at most four decimals, 0..100 for percentages. Persist money as Decimal(14,2), rates as Decimal(10,4); explicit round-half-up at the final amount boundary. Null means unknown; zero means known zero. No implicit currency conversion or GST calculation.
Legacy Float columns must be migrated through separate shadow Decimal columns, dry-run reconciliation and dual-read compatibility before removal. DEC-004 approves the exact legacy-field inventory, scale and correction policy. Incoming legacy numeric contracts continue unchanged until a versioned consumer migration is approved. New calculators use decimal arithmetic (Prisma.Decimal where supported) and decimal-string serialization; generic object serialization must not expose Decimal internals.

### Transport and validation

Use the existing `/api/v1` URI prefix and bearer authentication. JSON success is `{data: <payload>, meta: {timestamp: ISO8601, requestId: string|null}}`; paginated lists use `{data: [...], meta: {total,page,limit,totalPages}}`. Binary downloads use StreamableFile and the existing content headers. Empty lists return 200 with zero total; they are not errors.
New endpoints use strict Zod objects; unknown keys are rejected. Unless explicitly overridden below: UUID IDs, nonempty names capped at 200 characters, notes capped at 5000, page >=1, limit 1..100 default 20. Missing authentication is 401; known disallowed action is 403; absent or inaccessible object is 404; malformed input is 400; stale version/idempotency conflict is 409; quota exhaustion is 429; unavailable dependency is 503. Preserve the existing error envelope `{statusCode,message,errors,timestamp,path,requestId}`. Put machine reason codes inside `errors.code`, not a second envelope. Do not change unrelated existing endpoint status codes.
All new write routes reject actorId/organizationId supplied in a body. The server derives them. No partial success masquerading as a completed operation.

### Ticket-specific contract and limits

New route POST /api/v1/deals/:id/financial-entries consumes {kind: invoice|commission, amount:decimal-string, rate?:decimal-string, dueDate?:ISO8601}. Only same-tenant ADMIN can call; disallow rate on invoice and dueDate on commission. Return 201 {id, kind, amount, currency:INR, rate:null|string, dueDate:null|ISO8601} inside the standard data envelope. Existing roles on legacy routes remain. Scope is Deal/Commission/Invoice consumers only; Unit and Requirement shadow adoption must be verified in REQ-001/COST-001 before money matching is enabled.

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

**Where:** `Backend/src/modules/deals/dto/deals.schema.ts`

**Change:** Introduce strict decimal-string fields only on a new explicit v2 money DTO under existing URI version1 route `/deals/:id/financial-entries`; preserve old routes pending separate migration.

**Why:** Do not silently change old numeric response shapes.

**Verify immediately:** Old consumers still receive their prior shape; new route rejects exponent/NaN/infinity.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/deals/deals.service.ts`

**Change:** New route command writes exact decimal and compatible legacy amount atomically after org/deal checks; legacy write paths dual-write shadows at the approved precision.

**Why:** One source of truth must remain synchronized during migration.

**Verify immediately:** Read-back new amount equals submitted string normalized to two decimals.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/shared/interceptors/transform.interceptor.ts`

**Change:** Serialize Decimal as canonical string before generic object traversal; keep bigint/date/StreamableFile handling intact.

**Why:** Internal Decimal properties must never leak as API data.

**Verify immediately:** Nested decimal amounts serialize as strings; binary export unchanged.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Exact decimal round trip

**Purpose:** Prove the boundary named “Exact decimal round trip” for adopt decimal money on new financial contracts.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Own deal; amount "0.10".

**Action:** Create financial entry and reread.

**Expected result:** "0.10" returned and stored exactly; legacy shadow compatible.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** New exact decimal contracts must coexist with old numeric consumers during migration. A shadow column without dual writes immediately becomes stale. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check numeric conversion before persistence.

### Test 2 — Old route dual writes

**Purpose:** Prove the boundary named “Old route dual writes” for adopt decimal money on new financial contracts.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Legacy numeric invoice payload.

**Action:** Create through existing route.

**Expected result:** Both columns agree under approved policy; old response unchanged.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** New exact decimal contracts must coexist with old numeric consumers during migration. A shadow column without dual writes immediately becomes stale. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Find legacy write path bypassing dual write.

### Test 3 — Invalid financial shape

**Purpose:** Prove the boundary named “Invalid financial shape” for adopt decimal money on new financial contracts.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** "NaN", exponent or foreign deal.

**Action:** Submit each new entry.

**Expected result:** 400/404; no invoice/commission row.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** New exact decimal contracts must coexist with old numeric consumers during migration. A shadow column without dual writes immediately becomes stale. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check strict DTO and authorization order.

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
npm --prefix Backend run test:e2e -- --runInBand --runTestsByPath test/money-contract.e2e-spec.ts
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

- [ ] Old consumers still receive their prior shape; new route rejects exponent/NaN/infinity.
- [ ] Read-back new amount equals submitted string normalized to two decimals.
- [ ] Nested decimal amounts serialize as strings; binary export unchanged.

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
