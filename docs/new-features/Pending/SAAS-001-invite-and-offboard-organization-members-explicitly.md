# SAAS-001 — Invite and offboard organization members explicitly

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Organization membership  
**Assessment:** P23  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Invite and offboard organization members explicitly. An invitation authorizes joining one organization with a reviewed role. Logging in is not permission to create membership.

## 2. Current behavior and evidence

AUTH tickets own supported identity mapping, user lifecycle and revocation; organization onboarding still needs an explicit invitation/reassignment workflow.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/prisma/schema.prisma](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/prisma/schema.prisma) — exists at the baseline commit.
- [Backend/src/app.module.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/app.module.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

An invitation authorizes joining one organization with a reviewed role. Logging in is not permission to create membership.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: An invitation authorizes joining one organization with a reviewed role. Logging in is not permission to create membership. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                                        | Baseline state                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/prisma/schema.prisma`                                              | Existing — inspect before editing                         |
| `Backend/prisma/migrations/20260915002300_membership_invites/migration.sql` | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/organizations/membership.service.ts`                   | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/organizations/organizations.controller.ts`             | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/organizations/organizations.module.ts`                 | Proposed — create here or consume dependency-created file |
| `Backend/test/membership.e2e-spec.ts`                                       | Proposed — create here or consume dependency-created file |
| `Backend/src/app.module.ts`                                                 | Existing — inspect before editing                         |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [TEN-001](../Pending/TEN-001-create-an-explicit-server-derived-access-context.md), [AUTH-002](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-002-remove-login-time-admin-auto-provisioning.md), [AUTH-004](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-004-remove-login-time-privilege-mutation.md), [AUTH-006](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-006-enforce-clerk-id-identity-mapping.md), [AUTH-009](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-009-prevent-last-admin-lockout.md), [AUTH-010](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-010-explicit-user-suspension-and-reactivation-lifecycle.md), [AUTH-011](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-011-revoke-clerk-sessions-on-access-removal.md), [AUTH-012](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/docs/tickets/Pending/AUTH-012-audit-user-privilege-and-status-changes.md), [OPS-004](../Pending/OPS-004-persist-notification-outcomes-and-replay-controls.md)

**Blocks:** [SAAS-002](../Pending/SAAS-002-enforce-pilot-entitlements-and-durable-usage-limits.md), [SAAS-003](../Pending/SAAS-003-wire-plan-limits-into-jobs-uploads-and-admin-screens.md), [SAAS-004](../Pending/SAAS-004-export-tenant-data-and-execute-account-closure-safely.md), [PRODUCT-001](../Pending/PRODUCT-001-guide-onboarding-to-the-first-useful-shortlist.md)

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

### OUTBOX-v1 — transactions end before transport

OutboxEvent(id UUID PK, organizationId UUID FK, type String, schemaVersion Int default1, payload Json, dedupeKey String, createdAt DateTime default now, publishedAt DateTime nullable, attemptCount Int default0, nextAttemptAt DateTime default now); unique organizationId/dedupeKey; index publishedAt/nextAttemptAt. Payloads contain only job/source/version IDs and actorId, never documents/secrets.
Event `ai.intake.requested.v1={eventId,organizationId,jobId,sourceId,sourceVersion}`. A domain transaction inserts event with its job. Dispatcher claims batches of 50 via row locks/skip-locked in a short transaction, enqueues to BullMQ using eventId as jobId, then marks published. A crash after enqueue can repeat transport; consumer's DB claim makes effects idempotent. Preserve unsent rows when Redis is absent. 3 automatic publication attempts followed by operator-visible retry state; no silent drop. DB remains durable truth; BullMQ is delivery/execution transport.

### Ticket-specific contract and limits

Do not implement AUTH ticket code here. Invitation email delivery must use OPS-004; no email is sent while merely implementing or testing this ticket.

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

**Change:** Add OrganizationInvitation(id, organizationId, emailHash, encryptedEmail, role, tokenHash, expiresAt, acceptedAt, revokedAt, invitedBy) with one active invitation/emailHash/organization. POST /organizations/current/invitations ADMIN only, role WORKER or RIDER,7-day expiry.

**Why:** No email login fallback or automatic ADMIN provision.

**Verify immediately:** Invitation stores only hashed random32-byte token; no raw token logs.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/organizations/membership.service.ts`, `Backend/src/modules/organizations/organizations.controller.ts`

**Change:** Acceptance requires verified supported identity and explicit invite match; one transaction consumes invite and establishes membership via AUTH lifecycle service. Existing different organization membership409.

**Why:** A bearer invitation alone must not impersonate a person.

**Verify immediately:** Replay returns accepted status without duplicate user.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/organizations/membership.service.ts`

**Change:** Offboard using AUTH suspension/revocation and explicit same-tenant reassignment of clients/tasks/deals in a resumable audited job. Block new assignments immediately; preserve ownership history.

**Why:** Disabling identity and moving business work are related but distinct.

**Verify immediately:** No deletion of historical records; failed reassignment visible.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Foreign membership

**Purpose:** Prove the boundary named “Foreign membership” for invite and offboard organization members explicitly.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Invitee already in another organization.

**Action:** Accept.

**Expected result:** 409; neither membership silently moved.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** An invitation authorizes joining one organization with a reviewed role. Logging in is not permission to create membership. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** One-organization pilot boundary.

### Test 2 — Used token

**Purpose:** Prove the boundary named “Used token” for invite and offboard organization members explicitly.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Invitation consumed.

**Action:** Replay.

**Expected result:** Same result, no duplicate user/role change.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** An invitation authorizes joining one organization with a reviewed role. Logging in is not permission to create membership. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Atomic consume.

### Test 3 — Offboarding failure

**Purpose:** Prove the boundary named “Offboarding failure” for invite and offboard organization members explicitly.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Reassignment job fails midway.

**Action:** Retry.

**Expected result:** No new access; completed batches not duplicated, remaining work visible.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** An invitation authorizes joining one organization with a reviewed role. Logging in is not permission to create membership. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Keep suspension independent of job completion.

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
npm --prefix Backend run test:e2e -- --runInBand --runTestsByPath test/membership.e2e-spec.ts
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

- [ ] Invitation stores only hashed random32-byte token; no raw token logs.
- [ ] Replay returns accepted status without duplicate user.
- [ ] No deletion of historical records; failed reassignment visible.

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
