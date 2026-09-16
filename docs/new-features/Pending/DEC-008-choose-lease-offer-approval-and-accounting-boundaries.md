# DEC-008 — Choose lease offer approval and accounting boundaries

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Decision  
**Priority:** P1  
**Area:** Architecture decisions  
**Assessment:** P19, P20, P21, A20  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Choose lease offer approval and accounting boundaries. Deciding a safe operating contract is work. The output is a signed decision record; writing this ticket does not grant approval or implement a feature.

## 2. Current behavior and evidence

The assessment explicitly leaves this business/operational choice unresolved. No evidence of an approved decision was found in the inspected source snapshot.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/prisma/schema.prisma](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/prisma/schema.prisma) — exists at the baseline commit.
- [Backend/src/modules/deals/deals.service.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/deals/deals.service.ts) — exists at the baseline commit.
- [docs/MARKET_AI_ASSESSMENT.md](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/MARKET_AI_ASSESSMENT.md) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

Deciding a safe operating contract is work. The output is a signed decision record; writing this ticket does not grant approval or implement a feature.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: Deciding a safe operating contract is work. The output is a signed decision record; writing this ticket does not grant approval or implement a feature. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                 | Baseline state                                            |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `Backend/prisma/schema.prisma`                       | Existing — inspect before editing                         |
| `Backend/src/modules/deals/deals.service.ts`         | Existing — inspect before editing                         |
| `docs/MARKET_AI_ASSESSMENT.md`                       | Existing — inspect before editing                         |
| `docs/new-features/decisions/financial-workflows.md` | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [DEC-004](../Pending/DEC-004-approve-legacy-money-conversion-and-rounding.md), [DEC-007](../Pending/DEC-007-approve-owner-roles-and-asset-grant-policy.md)

**Blocks:** [FIN-001](../Pending/FIN-001-version-leasing-offers-and-enforce-approval-limits.md), [FIN-002](../Pending/FIN-002-export-reconciled-rent-rolls-with-source-identities.md), [FIN-003](../Pending/FIN-003-track-approved-commission-splits-and-receipt-reversals.md), [INTEGRATION-001](../Pending/INTEGRATION-001-specify-scoped-integration-api-and-webhook-delivery.md)

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

No new shared data/API schema is introduced unless specified below. Preserve existing method and transport contracts while making the described behavior change. For a decision ticket, the accepted decision file is the deliverable.

### Ticket-specific contract and limits

Decision acceptance conditions:

- Define offer comparison basis including term/escalation/deposit/tax exclusions
- Approver limits, self-approval and delegation signed
- Specify receipt allocation, reversal and reconciliation identities
- Name pilot accounting target and sandbox without production credentials

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

**Change:** Read the current behavior and collect a sanitized inventory relevant to this decision.

**Why:** A decision cannot assume production data matches fixtures.

**Verify immediately:** Record snapshot SHA, inventory counts and unavailable evidence.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `docs/new-features/decisions/financial-workflows.md`

**Change:** Write the proposed decision: Use immutable offer revisions with amount/discount approval thresholds signed per organization; no external acceptance or payment initiation. Pilot exports a reconciled rent-roll CSV. Commission entitlement is an approved ledger with partial receipt allocations and explicit reversals. Pick the first external accounting provider only after a customer demonstrates its import contract.

**Why:** The implementer must receive one explicit outcome, not a menu of guesses.

**Verify immediately:** Include alternatives, rejected options, cost/risk and a rollback boundary.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `docs/new-features/decisions/financial-workflows.md`

**Change:** Run the decision review against: Define offer comparison basis including term/escalation/deposit/tax exclusions; Approver limits, self-approval and delegation signed; Specify receipt allocation, reversal and reconciliation identities; Name pilot accounting target and sandbox without production credentials

**Why:** A signed choice must be operationally testable.

**Verify immediately:** Record reviewer, date and any remaining blocker; unresolved means Blocked.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 4 — CHANGE, TEST and CHECKPOINT

**Where:** `docs/new-features/decisions/financial-workflows.md`

**Change:** Update dependent ticket contracts only after the decision is accepted.

**Why:** A new decision can invalidate previously drafted contracts.

**Verify immediately:** List affected IDs and exact contract version; no runtime setting or production data changed.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Evidence is traceable

**Purpose:** Prove the boundary named “Evidence is traceable” for choose lease offer approval and accounting boundaries.

**Level:** Document review. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Current source snapshot and sanitized inventory.

**Action:** Compare every factual statement to evidence.

**Expected result:** Each claim has file/symbol or dated measurement; unknowns stay unknown.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Deciding a safe operating contract is work. The output is a signed decision record; writing this ticket does not grant approval or implement a feature. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Remove assumed production facts; obtain read-only evidence.

### Test 2 — Decision covers failure and recovery

**Purpose:** Prove the boundary named “Decision covers failure and recovery” for choose lease offer approval and accounting boundaries.

**Level:** Tabletop review. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Draft decision plus outage and unauthorized-user scenarios.

**Action:** Walk through each scenario with the reviewer.

**Expected result:** A single allowed behavior and recovery owner exists for every scenario.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Deciding a safe operating contract is work. The output is a signed decision record; writing this ticket does not grant approval or implement a feature. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Find an unstated authority, retention or failure assumption.

### Test 3 — No premature activation

**Purpose:** Prove the boundary named “No premature activation” for choose lease offer approval and accounting boundaries.

**Level:** Document review. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Decision file has unsigned/unresolved fields.

**Action:** Attempt ticket intake review.

**Expected result:** Dependent implementation remains blocked; no fabricated approval or completed checkbox.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Deciding a safe operating contract is work. The output is a signed decision record; writing this ticket does not grant approval or implement a feature. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check status automation and distinguish architecture proposal from approval.

### Mandatory negative assertions

- A denied read/write does not reveal hidden IDs, counts, nested fields or private source excerpts.
- A rejected/failed operation does not display or persist completed/applied/sent state.
- Retrying the same committed intent does not duplicate its business effect; changed intent does not silently reuse a different result.
- Unavailable optional AI/transport does not invent values or bypass domain permissions.
- Unrelated records, previously released snapshots and existing authenticated-role restrictions remain unchanged.

Apply the relevant invariants to this slice and record an explicit reason for any non-applicable assertion. Do not turn a document review into a claim that runtime invariants passed.

### Commands and environment

Document review only. Run `python3 docs/new-features/validate.py` after editing the ticket/index. No application tests are claimed by this decision deliverable.

## 11. Manual verification

Walk the written policy through one normal case, one denied case and one interrupted/retry case with the named decision owner. Record accepted/rejected outcome, reviewer and date. An unsigned record remains Pending/Blocked. Verify dependent tickets reflect the accepted version.

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

- [ ] Record snapshot SHA, inventory counts and unavailable evidence.
- [ ] Include alternatives, rejected options, cost/risk and a rollback boundary.
- [ ] Record reviewer, date and any remaining blocker; unresolved means Blocked.
- [ ] List affected IDs and exact contract version; no runtime setting or production data changed.

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
