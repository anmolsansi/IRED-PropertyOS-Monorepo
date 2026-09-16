# PROP-010 — Issue revoke and read scoped client share links

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Proposal portal API  
**Assessment:** P06  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Issue revoke and read scoped client share links. A client link grants one version of one public proposal. It does not authenticate the recipient as a staff member.

## 2. Current behavior and evidence

No grant-based public proposal route exists in inspected controllers; SHARE-v1 tables come from PROP-005.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/src/modules/proposals/proposals.module.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/proposals/proposals.module.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

A client link grants one version of one public proposal. It does not authenticate the recipient as a staff member.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: A client link grants one version of one public proposal. It does not authenticate the recipient as a staff member. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                         | Baseline state                                            |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| `Backend/src/modules/proposals/proposal-share.service.ts`    | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/proposals/proposal-share.controller.ts` | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/proposals/proposals.module.ts`          | Existing — inspect before editing                         |
| `Backend/src/modules/proposals/dto/proposal-share.schema.ts` | Proposed — create here or consume dependency-created file |
| `Backend/test/proposal-share.e2e-spec.ts`                    | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [PROP-006](../Pending/PROP-006-create-immutable-reviewed-proposal-releases.md), [DEC-005](../Pending/DEC-005-approve-sharing-retention-and-customer-data-use.md)

**Blocks:** [PROP-011](../Pending/PROP-011-build-the-client-proposal-feedback-portal.md)

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### SHARE-v1 — revocable invitation, not public inventory

ShareGrant(id UUID, organizationId UUID FK, releaseId UUID FK, tokenHash String unique, expiresAt DateTime, revokedAt DateTime nullable, createdBy UUID FK, createdAt DateTime); grant expires in at most 7 days. Generate 32 random bytes; persist only SHA-256 hash. Token response appears once and is excluded from logs/analytics/referrers. Public access only to that release's public snapshot and disclosed media; no inferred property, owner contact, tenant or other release access.
POST `/proposal-releases/:id/shares` `{expiresAt:ISO8601}` ->201 `{id,url,expiresAt}` for same-tenant ADMIN/WORKER. DELETE `/proposal-shares/:id` ->200 `{revoked:true}` idempotently. GET `/public/proposals/:token` ->200 `{releaseId,title,items,expiresAt}` or identical 404 for invalid/expired/revoked tokens; Cache-Control:no-store, Referrer-Policy:no-referrer. Do not cache authorized responses in a public CDN.
POST `/public/proposals/:token/feedback` `{itemId:UUID,action:'interested'|'not_suitable'|'request_visit',note?:string<=1000,clientEventId:UUID}` ->201 `{id,status:'recorded'}` with unique grantId/clientEventId. Record Feedback(id, grantId, itemId, action, note, clientEventId, createdAt). A request_visit is a request, not a confirmed calendar booking. Rate limit 30/minute/grant and IP, no account enumeration. DEC-005 must approve bearer-link disclosure before activation.

### RELEASE-v1 — immutable client disclosure

ProposalRelease(id UUID, organizationId UUID FK, proposalId UUID FK, version Int, createdBy UUID FK, snapshotJson Json, snapshotHash String, createdAt DateTime default now); unique proposalId/version. Snapshot includes public client display name, proposal title, selected allowlisted fields, active item IDs and public values, source record versions, templateVersion and disclosedMediaIds. Never include internal notes, contact phones, commission or user relations. Released data is immutable; a refresh makes a new release.
`POST /proposals/:id/releases` body `{expectedUpdatedAt:ISO8601,selectedFields:string[],templateVersion:int}` Idempotency-Key ->201 `{id,version,snapshotHash}`; same-key same request returns existing release; stale proposal or no active items 409. Maximum 50 items/50 fields, unknown/restricted field keys 400/403. Review missing critical rent/area/availability with explicit warnings before release; do not invent values.
ArtifactJob(id UUID, organizationId UUID FK, releaseId UUID FK, format enum(pdf, xlsx), status enum queued, running, ready, failed, cancelled, storageKey String nullable, errorCode String nullable, createdAt/updatedAt); unique releaseId/format. POST `/proposal-releases/:id/artifacts` `{format}` ->202 `{id,status}`; GET `/proposal-artifacts/:id` ->200 status and authorized downloadUrl only when ready. Failure never changes Proposal commercial status. Existing synchronous XLSX route remains until caller migration; it must authorize independently. Render from snapshot only.

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

**Where:** `Backend/src/modules/proposals/proposal-share.service.ts`

**Change:** Implement create/revoke routes with private actor context and random32-byte token; store hash only.

**Why:** A database leak should not expose plaintext bearer links.

**Verify immediately:** Token appears once in response, never logs.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/proposals/proposal-share.controller.ts`

**Change:** Implement public GET with identical404 outcomes and no-store/no-referrer; serve only snapshot fields/disclosed media.

**Why:** Token possession is narrowly scoped authority.

**Verify immediately:** Changing item or media ID cannot broaden access.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/proposals/proposal-share.service.ts`, `Backend/src/modules/proposals/proposal-share.controller.ts`

**Change:** Record idempotent client feedback and visit requests; enforce expiry/revocation on every request.

**Why:** Feedback is not a booking or accepted lease.

**Verify immediately:** Repeated event creates one record and no SiteVisit.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Revocation

**Purpose:** Prove the boundary named “Revocation” for issue revoke and read scoped client share links.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Valid grant then revoked.

**Action:** Read again including cached browser navigation.

**Expected result:** 404/no-store; no snapshot returned.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A client link grants one version of one public proposal. It does not authenticate the recipient as a staff member. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Check CDN/cache and DB recheck.

### Test 2 — Scope substitution

**Purpose:** Prove the boundary named “Scope substitution” for issue revoke and read scoped client share links.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Valid token for releaseA, request media from B.

**Action:** Fetch through portal.

**Expected result:** 404; no foreign bytes.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A client link grants one version of one public proposal. It does not authenticate the recipient as a staff member. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Resolve disclosure list, not broad building media.

### Test 3 — Repeated feedback

**Purpose:** Prove the boundary named “Repeated feedback” for issue revoke and read scoped client share links.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Same clientEventId twice.

**Action:** Submit interested/request_visit.

**Expected result:** One feedback; no auto-booking.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** A client link grants one version of one public proposal. It does not authenticate the recipient as a staff member. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Enforce grant-scoped uniqueness.

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
npm --prefix Backend run test:e2e -- --runInBand --runTestsByPath test/proposal-share.e2e-spec.ts
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

- [ ] Token appears once in response, never logs.
- [ ] Changing item or media ID cannot broaden access.
- [ ] Repeated event creates one record and no SiteVisit.

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
