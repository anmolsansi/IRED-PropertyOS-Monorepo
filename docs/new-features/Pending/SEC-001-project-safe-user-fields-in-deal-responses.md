# SEC-001 — Project safe user fields in deal responses

**Status:** Pending  
**Readiness:** Ready for focused implementation intake on the verified target branch  
**Type:** Implementation  
**Priority:** P0  
**Area:** Response security  
**Assessment:** D05  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Project safe user fields in deal responses. The database user record is not an API user summary. Select only fields the deal screen needs before serialization.

## 2. Current behavior and evidence

DealsService.findAll/findOne includes assignee:true; User has passwordHash. TransformInterceptor serializes nested objects without redaction.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/src/modules/deals/deals.service.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/deals/deals.service.ts) — exists at the baseline commit.
- [Backend/src/modules/deals/**tests**/deals.service.spec.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/deals/__tests__/deals.service.spec.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

The database user record is not an API user summary. Select only fields the deal screen needs before serialization.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: The database user record is not an API user summary. Select only fields the deal screen needs before serialization. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                        | Baseline state                                            |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/src/modules/deals/deals.service.ts`                | Existing — inspect before editing                         |
| `Backend/src/modules/deals/__tests__/deals.service.spec.ts` | Existing — inspect before editing                         |
| `Backend/test/deal-response-secrets.e2e-spec.ts`            | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** None within this pack; complete the READ/VERIFY checkpoint first.

**Blocks:** No direct dependent ticket currently recorded. Customer release still requires applicable rollout gates.

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

No new shared data/API schema is introduced unless specified below. Preserve existing method and transport contracts while making the described behavior change. For a decision ticket, the accepted decision file is the deliverable.

### Ticket-specific contract and limits

No new API/schema. This narrow fix does not claim all response surfaces are audited; OPS-005 includes response boundary review.

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

**Where:** `Backend/src/modules/deals/deals.service.ts`

**Change:** Inspect both assignee includes and replace with select {id:true, fullName:true, email:true}. Keep creator already projected.

**Why:** An allowlist prevents future sensitive user columns leaking.

**Verify immediately:** No assignee:true remains in this service.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/deals/__tests__/deals.service.spec.ts`

**Change:** Assert Prisma receives the explicit projection; seed a fake password hash and token-like extra fields in integration fixtures.

**Why:** A shallow result assertion would miss nested secrets.

**Verify immediately:** Decoded list/detail JSON contains no passwordHash, refresh token or provider raw object.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/test/deal-response-secrets.e2e-spec.ts`

**Change:** Call both routes with an assigned and unassigned deal, preserving null shape.

**Why:** Privacy repair must not break empty assignees.

**Verify immediately:** UI-required ID/name/email survive; null stays null.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Assigned deal is redacted

**Purpose:** Prove the boundary named “Assigned deal is redacted” for project safe user fields in deal responses.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Assigned user fixture includes fake passwordHash.

**Action:** GET deal list and detail.

**Expected result:** Safe fields only at every nested user; forbidden keys absent.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** The database user record is not an API user summary. Select only fields the deal screen needs before serialization. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check Prisma select, not a UI mask.

### Test 2 — Unassigned deal remains valid

**Purpose:** Prove the boundary named “Unassigned deal remains valid” for project safe user fields in deal responses.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Deal with assignedTo=null.

**Action:** Read detail.

**Expected result:** assignee=null; 200; no serializer exception.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** The database user record is not an API user summary. Select only fields the deal screen needs before serialization. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Avoid assuming assignee exists.

### Test 3 — Adding a sensitive column cannot expand DTO

**Purpose:** Prove the boundary named “Adding a sensitive column cannot expand DTO” for project safe user fields in deal responses.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Mock/schema-compatible user has extra internal field.

**Action:** Inspect selected projection and serialized response.

**Expected result:** Extra field never requested/emitted.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** The database user record is not an API user summary. Select only fields the deal screen needs before serialization. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Use explicit allowlist rather than omit known secrets.

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
npm --prefix Backend test -- --runInBand --runTestsByPath src/modules/deals/__tests__/deals.service.spec.ts
npm --prefix Backend run test:e2e -- --runInBand --runTestsByPath test/deal-response-secrets.e2e-spec.ts
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

- [ ] No assignee:true remains in this service.
- [ ] Decoded list/detail JSON contains no passwordHash, refresh token or provider raw object.
- [ ] UI-required ID/name/email survive; null stays null.

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
