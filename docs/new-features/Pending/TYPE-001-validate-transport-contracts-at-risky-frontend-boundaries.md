# TYPE-001 — Validate transport contracts at risky frontend boundaries

**Status:** Pending  
**Readiness:** Blocked by dependencies; revalidate after they land  
**Type:** Implementation  
**Priority:** P1  
**Area:** Transport types  
**Assessment:** D18  
**Source baseline:** `06ce222654fbaed7bfda33802a89c305574f0e95`  
**Implementation owner:** Assigned at intake; no work recorded  
**Architect/reviewer:** Assigned before implementation; no approval recorded

## 1. Objective

Validate transport contracts at risky frontend boundaries. An adapter translates a server contract; it must not invent business facts to satisfy a TypeScript interface.

## 2. Current behavior and evidence

Current adapters use broad unknown/any mappings and can substitute zero/default values for missing requirement data.

The baseline below is source inspection, not production verification. Read these exact files before editing:

- [Frontend/src/hooks/use-clients.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Frontend/src/hooks/use-clients.ts) — exists at the baseline commit.
- [Frontend/src/hooks/use-properties.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Frontend/src/hooks/use-properties.ts) — exists at the baseline commit.
- [Frontend/src/hooks/use-media.ts](https://github.com/anmolsansi/IRED-PropertyOS-Monorepo/blob/06ce222654fbaed7bfda33802a89c305574f0e95/Frontend/src/hooks/use-media.ts) — exists at the baseline commit.

Read [repository context](../REPO_CONTEXT.md), [ticket standard](../TICKET_DETAIL_STANDARD.md), and the source assessment items above. New targets listed below are proposals unless explicitly marked existing. A file existing does not prove every proposed behavior in this ticket is already implemented.

## 3. Engineer mental model

An adapter translates a server contract; it must not invent business facts to satisfy a TypeScript interface.

## 4. Facts, assumptions and unresolved decisions

- **Facts:** the current-behavior paragraph and linked source paths describe the inspected commit. See the evidence manifest for content hashes.
- **Proposed decisions:** contracts and limits in this ticket are the recommended implementation design. They are not a record of customer or architect approval.
- **Assumptions:** work starts from a current main-based branch after dependencies are merged; development uses synthetic data and isolated services.
- **Unknowns:** production data distribution, hosted bucket/branch-protection settings, actual provider account capabilities and human decision approvals have not been verified by writing this ticket.
- **STOP — NEEDS ARCHITECT DECISION:** a dependency contract is missing, actual schema/route conflicts with the stated contract, migration data cannot be reconciled, or completing this slice requires a new business authority. Record the exact conflict and proposed resolution; do not invent a fallback.

## 5. Architecture decisions and rejected alternatives

Chosen approach: An adapter translates a server contract; it must not invent business facts to satisfy a TypeScript interface. The numbered implementation steps below identify the owning boundary and the reason for each choice.

Rejected alternatives: automatic inference of missing authorization/business values; success recorded before persistence; direct provider output applied without domain validation; expanding the slice into adjacent roadmap features. These would invalidate the stated tests and completion criteria.

## 6. Scope and file boundaries

### Files permitted to change

| File                                   | Baseline state                                            |
| -------------------------------------- | --------------------------------------------------------- |
| `Frontend/src/hooks/use-clients.ts`    | Existing — inspect before editing                         |
| `Frontend/src/hooks/use-properties.ts` | Existing — inspect before editing                         |
| `Frontend/src/hooks/use-media.ts`      | Existing — inspect before editing                         |
| `Frontend/src/lib/api-contracts.ts`    | Proposed — create here or consume dependency-created file |
| `Frontend/e2e/api-contracts.spec.ts`   | Proposed — create here or consume dependency-created file |

The current ticket and its index/completion record may also change. Additional wiring or migration files are allowed only when explicitly named in the ticket-specific contract below. Do not create a parallel module because a dependency-owned file has not landed. Never edit generated Prisma client files. Keep unrelated working-tree edits untouched.

### Out of scope

Implementation of dependencies; enabling a paid provider; production data migration or deletion; external messages; changing unrelated roles, models, routes or deployment settings. The implementation may add fixtures and the tests listed here; it may not mark another ticket complete without its own evidence.

## 7. Dependencies and execution order

**Depends On:** [REQ-002](../Pending/REQ-002-expose-atomic-brief-read-and-replacement-endpoints.md), [MEDIA-003](../Pending/MEDIA-003-serve-private-media-with-short-lived-authorized-urls.md)

**Blocks:** No direct dependent ticket currently recorded. Customer release still requires applicable rollout gates.

Dependency completion means its implementation/review evidence is accepted, not simply that its Markdown file exists. External AUTH tickets remain owned by `docs/tickets`; this pack does not duplicate or mark their work completed.

## 8. Data and API contracts

### BRIEF-v1 — confirmed commercial requirement

Extend Requirement additively with `version Int default 1`, `areaBasis enum(carpet,chargeable) nullable`, `budgetBasis enum(base_monthly,all_in_monthly) nullable`, `currency String default INR`, `moveInDate date nullable`, `furnishingStatusId UUID nullable FK`, `parkingSpaces Int nullable`, `mustHaveKeys Json default []` (unique subset of lift, power_backup, main_road), and normalized preferred locality IDs. Keep existing title/description/status and legacy fields during migration.
`RequirementBrief={title:string,description?:string,minArea?:number,maxArea?:number,areaBasis?:'carpet'|'chargeable',minBudget?:string,maxBudget?:string,budgetBasis?:'base_monthly'|'all_in_monthly',currency:'INR',preferredLocalityIds:UUID[],moveInDate?:'YYYY-MM-DD',furnishingStatusId?:UUID,parkingSpaces?:integer,mustHaveKeys:string[]}`. At most 20 locality IDs; areas >0 and <=100000000; parking 0..10000; minima <= maxima. Missing basis remains null and prevents a definitive match; no default carpet area or inferred all-in price.
Existing POST `/clients/:id/requirements` and PATCH `/clients/requirements/:reqId` retain their route spelling and legacy payload compatibility. New versioned consumers use the dedicated brief endpoint. New explicit endpoint `PUT /requirements/:id/brief` with `{expectedVersion,brief}` returns `{id,version,brief,status}` (200), 409 on stale version, 404 across tenants. A dedicated RequirementsController owns this new route. No status transition or record creation occurs on invalid brief.

### MONEY-v1 — decimal business values

New monetary API values are decimal strings, never binary floats: currency `'INR'`, amounts with at most two decimals and absolute value <= 999999999999.99; rates/percentages with at most four decimals, 0..100 for percentages. Persist money as Decimal(14,2), rates as Decimal(10,4); explicit round-half-up at the final amount boundary. Null means unknown; zero means known zero. No implicit currency conversion or GST calculation.
Legacy Float columns must be migrated through separate shadow Decimal columns, dry-run reconciliation and dual-read compatibility before removal. DEC-004 approves the exact legacy-field inventory, scale and correction policy. Incoming legacy numeric contracts continue unchanged until a versioned consumer migration is approved. New calculators use decimal arithmetic (Prisma.Decimal where supported) and decimal-string serialization; generic object serialization must not expose Decimal internals.

### Transport and validation

Use the existing `/api/v1` URI prefix and bearer authentication. JSON success is `{data: <payload>, meta: {timestamp: ISO8601, requestId: string|null}}`; paginated lists use `{data: [...], meta: {total,page,limit,totalPages}}`. Binary downloads use StreamableFile and the existing content headers. Empty lists return 200 with zero total; they are not errors.
New endpoints use strict Zod objects; unknown keys are rejected. Unless explicitly overridden below: UUID IDs, nonempty names capped at 200 characters, notes capped at 5000, page >=1, limit 1..100 default 20. Missing authentication is 401; known disallowed action is 403; absent or inaccessible object is 404; malformed input is 400; stale version/idempotency conflict is 409; quota exhaustion is 429; unavailable dependency is 503. Preserve the existing error envelope `{statusCode,message,errors,timestamp,path,requestId}`. Put machine reason codes inside `errors.code`, not a second envelope. Do not change unrelated existing endpoint status codes.
All new write routes reject actorId/organizationId supplied in a body. The server derives them. No partial success masquerading as a completed operation.

### SOURCE-v1 — private immutable intake evidence

New SourceRecord: id UUID default uuid; organizationId UUID FK Organization required; actorId UUID FK User required; kind enum(text, pdf, image, audio, csv); version Int default 1; contentHash String required; text String nullable; storageKey String nullable; mimeType String nullable; sizeBytes BigInt nullable; createdAt DateTime default now; expiresAt DateTime required; deletedAt DateTime nullable. Exactly one of text/storageKey; unique organizationId/contentHash/kind/version; index organizationId/createdAt. Hash only inside the tenant boundary; do not disclose cross-tenant deduplication.
Text <=20000 characters. Pilot PDF <=20 MiB and 100 pages; JPEG/PNG <=10 MiB; audio <=25 MiB and 10 minutes; CSV <=10 MiB/10000 rows. Private storage keys `org/<organizationId>/sources/<sourceId>/<version>`; no client-provided remote URLs. Source retention defaults to 30 days only after DEC-005 ratifies it; expiration blocks new runs and is separate from legal holds. AI evidence `{sourceId,version,page?:int,start?:int,end?:int,quote:string}` must match accessible source text, with quote <=500 chars and valid bounds. A citation is evidence, not permission.

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

**Where:** `Frontend/src/hooks/use-clients.ts`

**Change:** Add strict runtime response parsing for requirement brief, property intake and media grants; preserve null versus zero and defined envelope metadata.

**Why:** Bad API data should be visible at a boundary.

**Verify immediately:** Missing budget remains null; malformed amount fails parsing.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 2 — CHANGE, TEST and CHECKPOINT

**Where:** `Frontend/src/hooks/use-properties.ts`

**Change:** Replace unsafe casts only within listed hooks and typed shared schemas; keep current consumers compatible through explicit adapters.

**Why:** A repo-wide type rewrite increases unrelated risk.

**Verify immediately:** No new any or double cast hides undefined fields.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Step 3 — CHANGE, TEST and CHECKPOINT

**Where:** `Frontend/src/hooks/use-media.ts`

**Change:** Add fixtures for current server payload, legacy shape and denied/error response; surface safe contract error with requestId.

**Why:** A200 with wrong shape is not valid business data.

**Verify immediately:** No secret payload logged; UI receives recoverable error.

**Checkpoint:** capture the focused assertion/output proving this result before continuing. If it fails, inspect this boundary and its transaction/context inputs; do not bypass validation to reach the next step.

### Final step — inspect the complete change

Review the diff against permitted files and contracts. Execute the negative scenarios as well as the happy path. Check schema compatibility and prior consumers. Record unrun checks honestly; a green unit test does not substitute for the required real-database or browser evidence.

## 10. Detailed test plan

### Test 1 — Missing amount

**Purpose:** Prove the boundary named “Missing amount” for validate transport contracts at risky frontend boundaries.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Response budgetnull.

**Action:** Adapt.

**Expected result:** Null remains null.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** An adapter translates a server contract; it must not invent business facts to satisfy a TypeScript interface. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Remove default0.

### Test 2 — Wrong envelope

**Purpose:** Prove the boundary named “Wrong envelope” for validate transport contracts at risky frontend boundaries.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Server shape missing required data.

**Action:** Parse.

**Expected result:** Typed error, no fabricated empty record.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** An adapter translates a server contract; it must not invent business facts to satisfy a TypeScript interface. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Validate wrapper before fields.

### Test 3 — Media access

**Purpose:** Prove the boundary named “Media access” for validate transport contracts at risky frontend boundaries.

**Level:** Service / integration. Use a real isolated database whenever the expected result depends on locks, constraints, relations or rollback; mocks alone are insufficient.

**Setup:** Download response has expired grant.

**Action:** Adapt/retry.

**Expected result:** Refresh through authorized endpoint, not public URL construction.

**Required assertions:** Assert the exact response/result and persisted state described above. Inspect relevant rows/events/jobs before and after; where denied or rolled back, assert no forbidden mutation, artifact or provider/delivery call. Do not assert only that a method was called.

**Why this test matters:** An adapter translates a server contract; it must not invent business facts to satisfy a TypeScript interface. This scenario verifies that rule under a specific failure or lifecycle condition.

**Likely failure diagnosis:** Remove URL guessing.

### Mandatory negative assertions

- A denied read/write does not reveal hidden IDs, counts, nested fields or private source excerpts.
- A rejected/failed operation does not display or persist completed/applied/sent state.
- Retrying the same committed intent does not duplicate its business effect; changed intent does not silently reuse a different result.
- Unavailable optional AI/transport does not invent values or bypass domain permissions.
- Unrelated records, previously released snapshots and existing authenticated-role restrictions remain unchanged.

Apply the relevant invariants to this slice and record an explicit reason for any non-applicable assertion. Do not turn a document review into a claim that runtime invariants passed.

### Commands and environment

```sh
npm --prefix Frontend run typecheck
npm --prefix Frontend run lint
npm --prefix Frontend run build
npm --prefix Frontend test -- e2e/api-contracts.spec.ts --project=chromium
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

- [ ] Missing budget remains null; malformed amount fails parsing.
- [ ] No new any or double cast hides undefined fields.
- [ ] No secret payload logged; UI receives recoverable error.

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
