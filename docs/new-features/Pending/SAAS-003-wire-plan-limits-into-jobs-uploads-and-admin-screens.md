# SAAS-003 — Wire plan limits into jobs uploads and admin screens

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Plan integration  
**Assessment:** P24, P01  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Wire plan limits into jobs uploads and admin screens. Every expensive entry point shares the same budget authority. The browser displays the reason, not the enforcement logic.

## 2. Current behavior and evidence

SAAS-002 defines reservations; enforcement is incomplete until each consuming creation path calls it.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Backend/src/modules/media/media.service.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Backend/src/modules/media/media.service.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

Every expensive entry point shares the same budget authority. The browser displays the reason, not the enforcement logic.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: Every expensive entry point shares the same budget authority. The browser displays the reason, not the enforcement logic. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                                          | Baseline state                                            |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `Backend/src/modules/ai/intake.service.ts`                    | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/media/media.service.ts`                  | Existing — inspect before editing                         |
| `Backend/src/modules/organizations/membership.service.ts`     | Proposed — create here or consume dependency-created file |
| `Backend/src/modules/entitlements/entitlements.controller.ts` | Proposed — create here or consume dependency-created file |
| `Frontend/src/app/(v2)/settings/usage/page.tsx`               | Proposed — create here or consume dependency-created file |
| `Frontend/e2e/usage-limits.spec.ts`                           | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [SAAS-002](../Pending/SAAS-002-enforce-pilot-entitlements-and-durable-usage-limits.md), [MEDIA-005](../Pending/MEDIA-005-clean-expired-pending-uploads-without-deleting-valid-files.md), [AI-003](../Pending/AI-003-accept-text-intake-with-atomic-quotas-and-idempotency.md), [SAAS-001](../Pending/SAAS-001-invite-and-offboard-organization-members-explicitly.md)

**Blocks:** No direct dependent ticket currently recorded. Customer release still requires applicable rollout gates.

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### AIJOB-v1 — durable reviewed execution

AiJob: id UUID; organizationId/actorId/sourceId required FKs; kind String validated against the closed registry requirement_text, match_explanation, proposal_narrative, inventory_document, csv_mapping, voice_note, visit_debrief, followup, work_briefing, lease_abstraction, lease_comparison, renewal_briefing, document_question, report_intent, photo_review, portfolio_anomalies, freshness_summary; sourceVersion Int; inputHash String; idempotencyKey String; schemaVersion/promptVersion/model String; status enum queued, running, needs_review, applied, rejected, failed, cancelled; attemptCount Int default0; outputJson Json nullable; errorCode String nullable; inputTokens/outputTokens Int default0; costMicros BigInt default0; createdAt/updatedAt DateTime; unique organizationId/idempotencyKey; index organizationId/status/createdAt.
`POST /ai/intakes` body `{kind:'requirement_text',clientId:UUID,text:string}` with Idempotency-Key 1..100 chars -> 202 `{id,status:'queued'}` after source/job/outbox commit. Exact same key/input returns same job; changed input 409. `GET /ai/intakes/:id` ->200 `{id,status,draftVersion:int|null,fields:object|null,evidence:object[],questions:string[],errorCode:string|null}`. `POST /ai/intakes/:id/cancel` ->200 current status, cancels queued/needs_review or flags running for discard; applied cannot be cancelled (409). Access rechecked on every call.
AiReview: id UUID, jobId UUID unique FK, reviewerId UUID FK, draftVersion Int, selectedFields Json, resultEntityId UUID, resultVersion Int, appliedAt DateTime. `POST /ai/intakes/:id/apply` `{draftVersion:int,fields:RequirementBrief}` ->200 `{entityId,entityVersion}`. Validate source/client/access/draft version again, then create Requirement and review and mark applied in one DB transaction. Identical replay returns stored result; changed replay 409. No automatic send, master inventory update, or lease activation.
Worker retries only transient failures: 3 attempts total, base 2s exponential+jitter, deadline 60s per attempt; provider timeout returns failed after budget exhaustion. Schema/refusal/source errors require review or fail; never retry until plausible-looking output appears. Model selection is fixed by reviewed config. Pilot concurrency 2/workspace, 10 active jobs/workspace, 100 jobs/day/workspace; operations may lower caps, not silently raise them. Provider monetary cap is ratified by DEC-003; absent cap disables execution.
Command routes with hyphenated names map to the same name with underscores in the kind registry. Non-upload commands persist a private text SourceRecord containing the canonical, bounded authorized input snapshot; sourceId is never null. Record inputJson Json, inputVersion Int default1, draftVersion Int default1 on AiJob. Structured snapshot IDs are reauthorized before execution/return. The worker dispatches only registered handlers; registration includes schema, prompt version and safe provider adapter. No handler performs provider I/O directly from an HTTP request.

### SOURCE-v1 — private immutable intake evidence

New SourceRecord: id UUID default uuid; organizationId UUID FK Organization required; actorId UUID FK User required; kind enum(text, pdf, image, audio, csv); version Int default 1; contentHash String required; text String nullable; storageKey String nullable; mimeType String nullable; sizeBytes BigInt nullable; createdAt DateTime default now; expiresAt DateTime required; deletedAt DateTime nullable. Exactly one of text/storageKey; unique organizationId/contentHash/kind/version; index organizationId/createdAt. Hash only inside the tenant boundary; do not disclose cross-tenant deduplication.
Text <=20000 characters. Pilot PDF <=20 MiB and 100 pages; JPEG/PNG <=10 MiB; audio <=25 MiB and 10 minutes; CSV <=10 MiB/10000 rows. Private storage keys `org/<organizationId>/sources/<sourceId>/<version>`; no client-provided remote URLs. Source retention defaults to 30 days only after DEC-005 ratifies it; expiration blocks new runs and is separate from legal holds. AI evidence `{sourceId,version,page?:int,start?:int,end?:int,quote:string}` must match accessible source text, with quote <=500 chars and valid bounds. A citation is evidence, not permission.

### ACCESS-v1 — tenant boundary (proposed; DEC-002 ratifies rollout)

`AccessContext = { actorId: UUID; organizationId: UUID; role: 'ADMIN'|'WORKER'|'RIDER'; geography: { denyAll:boolean; stateIds:UUID[];cityIds:UUID[];localityIds:UUID[] } }`.
One existing user belongs to one organization in the first release. Context is loaded from active local User and active Organization after the supported authentication guard. Missing membership is denied, never inferred from email or the first available organization. ADMIN is unrestricted geographically inside its organization, not across organizations. WORKER and RIDER retain existing route-role restrictions and geography restrictions; no new role privileges are implied. New product features default to ADMIN/WORKER, RIDER denied until explicitly specified.
`AccessPolicy.requireContext(user)` returns AccessContext or 403 `MEMBERSHIP_REQUIRED`; `buildingWhere(ctx)` returns Prisma.BuildingWhereInput with organizationId AND authorized geography; `clientWhere(ctx)` returns organizationId AND deletedAt:null; `requireBuilding(ctx,id)` / `requireClient(ctx,id)` return the permitted active record or 404. Child entities resolve their parent and must have matching organization membership. Empty/denyAll worker geography returns zero inventory; it is never `{}`. Read permission does not grant write permission.
Every service call, count, export, queued job and final apply uses the same context; jobs reload it rather than trust a stored role. Tenant changes invalidate prior jobs and grants. Platform maintenance uses separately audited offline operations; ordinary ADMIN routes never acquire a global bypass. Existing AUTH-001..018 retain identity/lifecycle ownership.

### Transport and validation

Use the existing `/api/v1` URI prefix and bearer authentication. JSON success is `{data: <payload>, meta: {timestamp: ISO8601, requestId: string|null}}`; paginated lists use `{data: [...], meta: {total,page,limit,totalPages}}`. Binary downloads use StreamableFile and the existing content headers. Empty lists return 200 with zero total; they are not errors.
New endpoints use strict Zod objects; unknown keys are rejected. Unless explicitly overridden below: UUID IDs, nonempty names capped at 200 characters, notes capped at 5000, page >=1, limit 1..100 default 20. Missing authentication is 401; known disallowed action is 403; absent or inaccessible object is 404; malformed input is 400; stale version/idempotency conflict is 409; quota exhaustion is 429; unavailable dependency is 503. Preserve the existing error envelope `{statusCode,message,errors,timestamp,path,requestId}`. Put machine reason codes inside `errors.code`, not a second envelope. Do not change unrelated existing endpoint status codes.
All new write routes reject actorId/organizationId supplied in a body. The server derives them. No partial success masquerading as a completed operation.

### Ticket-specific contract and limits

Module imports necessary to inject EntitlementsService into AiModule, MediaModule, OrganizationsModule are explicitly allowed wiring changes; list them in PR evidence.

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

**Where:** `Backend/src/modules/ai/intake.service.ts`

**Change:** Reserve seats at invitation acceptance, bytes at pending upload creation, and AI jobs/cost before enqueue; release abandoned reservations through existing cleanup and failed jobs.

**Why:** Alternate endpoints must not bypass caps.

**Verify immediately:** No provider call/upload grant/user creation after429.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/media/media.service.ts`

**Change:** Add GET /organizations/current/usage and register controller in entitlements.module.ts; display used/reserved/remaining and UTC reset instant.

**Why:** Reserved work explains temporary available-budget differences.

**Verify immediately:** Counters reconcile to ledger fixture.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Backend/src/modules/organizations/membership.service.ts`

**Change:** Offer manual request-plan-change wording with no fake checkout; on quota denial preserve unsent text/files for user-controlled retry.

**Why:** Pilot billing has no self-service payment contract.

**Verify immediately:** No success state until server accepts reservation.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Upload quota

**Purpose:** Prove the boundary named “Upload quota” for wire plan limits into jobs uploads and admin screens.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Insufficient storage bytes.

**Action:** Request upload.

**Expected result:** 429 and no signed URL.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Every expensive entry point shares the same budget authority. The browser displays the reason, not the enforcement logic. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Reserve before storage grant.

### Test 2 — Failed AI

**Purpose:** Prove the boundary named “Failed AI” for wire plan limits into jobs uploads and admin screens.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Reserved job fails terminal.

**Action:** Settle/release.

**Expected result:** Job count and actual cost follow approved policy, no double debit.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Every expensive entry point shares the same budget authority. The browser displays the reason, not the enforcement logic. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Use reservation identity.

### Test 3 — Refresh usage

**Purpose:** Prove the boundary named “Refresh usage” for wire plan limits into jobs uploads and admin screens.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Pending reservation settles.

**Action:** Reload settings.

**Expected result:** Reserved falls and consumed changes once.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** Every expensive entry point shares the same budget authority. The browser displays the reason, not the enforcement logic. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Show server aggregate.

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
npm --prefix Frontend test -- e2e/usage-limits.spec.ts --project=chromium
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

- [ ] No provider call/upload grant/user creation after429.
- [ ] Counters reconcile to ledger fixture.
- [ ] No success state until server accepts reservation.

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
