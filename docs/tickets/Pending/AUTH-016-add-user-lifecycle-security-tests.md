# AUTH-016: Add User Lifecycle and Administrator Safety Tests

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / User Administration / Security  
**Complexity:** Medium-High  
**Depends On:** AUTH-009, AUTH-010, AUTH-011, AUTH-012  
**Blocks:** AUTH-017  
**Primary New/Expanded File:** `Backend/src/modules/users/users.service.spec.ts`

## Objective

Create a comprehensive service-level security regression suite for `UsersService` covering administrator safety, explicit lifecycle transitions, semantic auditing, and Clerk session-cleanup behavior.

This suite must prove that an authorized administrator cannot accidentally or intentionally use ordinary user-management operations to violate the hardened invariants introduced by AUTH-009 through AUTH-012.

The suite must protect at least these properties:

- the final active administrator cannot be demoted, suspended, or deactivated;
- inactive/suspended administrators do not count as administrative redundancy;
- profile edits cannot implicitly reactivate users;
- generic update paths cannot bypass lifecycle rules;
- combined role/status changes cannot partially apply;
- lifecycle transitions keep `status` and `deactivatedAt` consistent;
- semantic security audits contain correct actor/target/before/after/reason data;
- failed/rejected/no-op changes do not create false success audit events;
- mandatory audit failures prevent local security-state mutation from committing;
- Clerk cleanup happens only after successful local access removal;
- Clerk failure never restores local access;
- missing `clerkUserId` never causes email-based provider fallback;
- repeated lifecycle/cleanup operations remain predictable and idempotent.

---

## Junior Engineer Mental Model

AUTH-015 answers:

```text
Can this existing user authenticate?
```

AUTH-016 answers:

```text
Can an administrator safely change another user's access?
```

Every sensitive user-management operation should be tested in four layers:

```text
1. Preconditions
   Is the action allowed?

2. Local state mutation
   What exact role/status/timestamp state commits?

3. Security side effects
   What audit event and provider cleanup should occur?

4. Failure behavior
   What must remain unchanged when any step fails?
```

A service test that only asserts `prisma.user.update()` was called is not enough. The service is the security/business-rule boundary, so test the rule and the resulting side effects.

---

## Architecture Discussion and Decisions

### Decision 1: Test real `UsersService` decision logic

Mock infrastructure, not the service methods under test.

Mock:

- Prisma service/transaction client;
- Mail service;
- Clerk user/session APIs;
- current time only where deterministic timestamp assertions matter.

Do not mock `transitionStatus`, last-admin helper, semantic-audit helper, or role-change logic if those are the behaviors being tested.

### Decision 2: Transaction mocks must execute real callback logic

If production code uses:

```text
prisma.$transaction(async tx => ...)
```

then the test mock must actually invoke the callback with a realistic transaction-client mock.

Rejected pattern:

```text
$transaction.mockResolvedValue(success)
```

when that bypasses user/audit decision logic.

### Decision 3: Freeze time only when needed

For lifecycle timestamp tests, use repository-compatible fake timers/fixed clock so assertions can compare exact `deactivatedAt` values.

Do not make broad “sometime within N seconds” assertions when deterministic time is possible.

### Decision 4: Test no-side-effect behavior on rejection

For last-admin/reason/validation failures, assert all of these where relevant:

- no user mutation;
- no semantic success audit;
- no Clerk session listing;
- no Clerk revocation;
- no partial role/profile/status write.

### Decision 5: Provider cleanup is secondary to local authorization state

Tests must encode:

```text
local non-active state can succeed even when Clerk cleanup fails
```

and must never encode:

```text
Clerk failure => reactivate local user
```

### Decision 6: Audit truthfulness is part of lifecycle correctness

A successful sensitive state change should have the expected semantic audit. A rejected/no-op/profile-only operation should not create a misleading security event.

### Decision 7: Concurrency risk deserves an integration-style service test

Final-admin safety has a count-then-mutate race risk. If production implementation uses transaction isolation/locking, add at least one disposable-DB concurrency test if practical. If the unit suite cannot prove concurrency guarantees, document the gap and ensure AUTH-017 or a focused integration spec covers it.

---

## Facts, Assumptions, and Unknowns

### Facts / Expected State

- `UsersService` owns role/status user-administration behavior;
- AUTH-009 centralizes last-active-admin safety;
- AUTH-010 centralizes lifecycle state transitions;
- AUTH-011 performs provider session cleanup after local access removal;
- AUTH-012 adds semantic security auditing and reason rules.

### Assumptions To Verify

- final `UsersService` has a single lifecycle rule path or a clearly delegated path;
- generic `update()` either no longer owns status directly or delegates correctly;
- user mutation + mandatory audit share a transaction;
- provider cleanup is invoked after local commit;
- audit actor context is passed from trusted controller/auth context.

### Unknowns That Must Not Be Guessed

- exact service method names after refactor;
- whether reactivation reason is optional/required;
- exact provider cleanup result shape;
- exact transaction isolation mechanism used for last-admin concurrency.

Read final production code before naming methods/assertions.

---

## Test Boundary

These tests are primarily service unit/regression tests.

They must not use:

- production DB;
- real Clerk;
- real SMTP;
- real Render/network services.

AUTH-017 owns assembled HTTP + disposable PostgreSQL E2E behavior.

If a specific concurrency/transaction guarantee cannot be represented honestly with mocks, create a narrowly scoped integration test using the existing disposable DB infrastructure instead of writing a false unit test.

---

## Required Reading

Before implementation:

1. final `Backend/src/modules/users/users.service.ts`
2. user controller
3. user DTO schemas
4. Prisma `User` and `AuditEvent` models
5. completed AUTH-009
6. completed AUTH-010
7. completed AUTH-011
8. completed AUTH-012
9. at least two existing service specs
10. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Intern must identify every production service method that can change:

```text
role
status
deactivatedAt
clerkUserId (for provisioning only)
```

and mark whether each should be covered here.

---

## Fixture Design

Use small fake fixtures with deterministic IDs.

Recommended:

```text
adminA          = ADMIN / active
adminB          = ADMIN / active
adminInactive   = ADMIN / inactive
adminSuspended  = ADMIN / suspended
workerA         = WORKER / active
workerB         = WORKER / active
workerInactive  = WORKER / inactive
workerSuspended = WORKER / suspended
riderA          = RIDER / active
```

Use:

- fake UUIDs;
- fake Clerk IDs such as `user_test_worker_a`;
- `example.test` emails only;
- fake request IDs;
- fake reason strings.

Clone fixtures per test so no test mutates shared objects.

---

## Shared Test Harness Requirements

Provide helpers for:

- cloning fixtures;
- configuring current target user lookup;
- configuring count of *other active admins*;
- capturing exact `user.update` payload;
- executing transaction callbacks honestly;
- capturing semantic `auditEvent.create` payloads;
- mocking session-list/revoke pages and failures;
- fixed clock;
- constructing trusted action context `{ actorUserId, requestId, reason }`;
- serializing audit/log metadata for secret-marker checks.

Reset all mocks/timers/env after each test.

---

## Step-by-Step Execution Plan for an Intern

### Phase 0 - Baseline

Run:

```bash
npm run typecheck:backend
npm run test:backend
```

Record pre-existing failures.

### Phase 1 - Inspect Final Service Shape

Create a small table before coding tests:

```text
operation | service method | DB writes | audit | Clerk cleanup | last-admin check
```

Include:

- role update;
- status update;
- generic update;
- delete/deactivate alias;
- explicit reactivation;
- invite only if needed for role-provisioning behavior;
- reset password only if auth-hardening changes affect it.

### Phase 2 - Build Honest Prisma/Transaction Mock

If production uses a transaction callback, ensure test transaction mock invokes it using a transaction object exposing the same user/audit methods.

Add separate spies for non-transaction provider work.

**Verify:** force audit write failure and prove the service sees the failure rather than receiving a fake transaction success.

### Phase 3 - Build Fixed Time Fixture

For lifecycle tests, set one known timestamp, for example:

```text
2030-01-02T03:04:05.000Z
```

Use repository-approved fake timer pattern.

### Phase 4 - Implement Last-Admin Tests First

These are highest severity.

For every rejection case, assert zero downstream side effects.

### Phase 5 - Implement Normal Lifecycle Matrix

Cover:

```text
active -> suspended
active -> inactive
suspended -> active
inactive -> active
suspended -> inactive
inactive -> suspended (if final state machine supports it)
no-op transitions
```

Ensure tests match AUTH-010 final policy rather than ticket assumptions if changed.

### Phase 6 - Implement Generic/Alternate-Path Bypass Tests

Exercise any method that can still accept status/role indirectly.

The same invariants must hold regardless of entry point.

### Phase 7 - Implement Semantic Audit Tests

For successful actions assert actor, target, before/after, reason, request ID, event type.

For rejected/no-op/profile-only actions assert absence of success semantic events.

### Phase 8 - Implement Audit Failure Atomicity Tests

Force semantic audit persistence failure.

Expected under mandatory-audit design:

```text
user security state does not commit
Clerk cleanup does not run
```

### Phase 9 - Implement Clerk Cleanup Tests

Cover:

- success;
- listing failure;
- partial revoke failure;
- pagination/multiple sessions if helper is inside UsersService coverage;
- missing `clerkUserId`;
- non-Clerk provider mode;
- repeated cleanup/idempotency.

### Phase 10 - Implement Combined Role + Status Tests

Ensure final-state validation occurs before write and no partial update/event happens on rejection.

### Phase 11 - Implement Sensitive-Metadata Tests

Use fake secret/token/email values in fixtures and assert semantic audit payload contains only approved fields.

### Phase 12 - Run Targeted Suite Repeatedly

Run only `users.service.spec.ts` until stable.

### Phase 13 - Run Full Backend Validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

### Phase 14 - Document Any Concurrency Gap

If last-admin concurrency cannot be faithfully proven with unit mocks, document exactly what remains for integration/E2E coverage rather than pretending the unit test solved it.

---

## Detailed Test Catalog

### TEST-AUTH016-01: Sole active admin cannot be deactivated

**Purpose:** Prevent permanent administrative lockout.

**Setup:** target Admin A active; count of other active admins = 0.

**Action:** deactivate.

**Expected Result:** approved last-admin error.

**Required Assertions:** no user update; no success audit; no Clerk list/revoke; Admin A remains active.

### TEST-AUTH016-02: Sole active admin cannot be suspended

**Purpose:** Suspension also removes administrative access.

**Expected Result:** rejected with zero side effects.

### TEST-AUTH016-03: Sole active admin cannot be demoted to WORKER

**Purpose:** Protect role-based removal.

**Required Assertions:** no role/status/profile partial write; no revocation audit.

### TEST-AUTH016-04: Sole active admin cannot be demoted to RIDER

**Purpose:** Cover every current non-admin role.

**Expected Result:** rejected; state unchanged.

### TEST-AUTH016-05: Inactive/suspended admins do not count as redundancy

**Purpose:** Count only usable active admins.

**Setup:** A active; B inactive or suspended.

**Action:** attempt to remove A's active-admin state.

**Expected Result:** rejected.

**Required Assertions:** count semantics require `role=ADMIN`, `status=active`, `id != target`.

### TEST-AUTH016-06: Two active admins allow one deactivation

**Purpose:** Avoid overblocking legitimate admin lifecycle.

**Setup:** A and B active.

**Action:** deactivate B.

**Expected Result:** success; A remains active; correct audit + cleanup behavior.

### TEST-AUTH016-07: Two active admins allow one demotion

**Purpose:** Ensure same rule for role change.

**Expected Result:** B can become WORKER/RIDER; A remains active; `user_role_changed` audit correct.

### TEST-AUTH016-08: Profile-only update on sole active admin is allowed

**Purpose:** Last-admin protection applies only when resulting active-admin state is removed.

**Action:** change name/mobile.

**Expected Result:** success; role/status unchanged; no security semantic role/status event.

### TEST-AUTH016-09: Active worker can be suspended

**Purpose:** Validate explicit temporary access removal.

**Setup:** worker active, fixed clock, mapped Clerk ID, valid reason.

**Expected Result:** status=suspended, deactivatedAt=fixed time, audit created, cleanup triggered after commit.

### TEST-AUTH016-10: Active worker can be deactivated

**Purpose:** Validate account retirement.

**Expected Result:** inactive + timestamp + `user_deactivated` + cleanup.

### TEST-AUTH016-11: Suspended worker explicitly reactivates

**Purpose:** Protect intended restoration path.

**Expected Result:** active, deactivatedAt=null, `user_activated`, no session revocation.

### TEST-AUTH016-12: Inactive worker explicitly reactivates

**Purpose:** Same for inactive state.

**Required Assertions:** no role/clerkUserId changes.

### TEST-AUTH016-13: Suspended -> inactive follows documented timestamp policy

**Purpose:** Test cross-non-active transition.

**Expected Result:** final state and `deactivatedAt` exactly match AUTH-010 approved policy.

### TEST-AUTH016-14: Inactive -> suspended follows state-machine policy if supported

**Purpose:** Ensure documentation and implementation agree.

**Expected Result:** supported transition works consistently or, if final architecture disallows it, test explicit rejection instead.

### TEST-AUTH016-15: No-op status transition does not rewrite timestamp or create fake audit

**Purpose:** Keep retries idempotent and audit truthful.

**Setup:** already suspended with known timestamp.

**Action:** suspend again.

**Expected Result:** safe no-op/rejection according to final policy; no misleading success event; timestamp unchanged unless architect-approved otherwise.

### TEST-AUTH016-16: Profile edit cannot implicitly reactivate inactive/suspended user

**Purpose:** Prevent generic-update recovery bug.

**Action:** change profile fields only.

**Expected Result:** profile may change; status/deactivatedAt remain non-active; no activation audit/Clerk behavior.

### TEST-AUTH016-17: Generic update cannot bypass lifecycle rules

**Purpose:** Close legacy status-update entry point.

**Setup:** last admin or sensitive worker transition.

**Action:** supply status through generic update if API still supports it.

**Expected Result:** identical rules to centralized lifecycle method.

### TEST-AUTH016-18: Delete/deactivate alias cannot bypass last-admin rule

**Purpose:** Protect convenience endpoint/service alias.

**Setup:** sole active admin.

**Action:** call the service path used by DELETE/deactivate.

**Expected Result:** rejected; zero side effects.

### TEST-AUTH016-19: Combined role + status update succeeds atomically when valid

**Purpose:** Ensure multi-field security changes do not apply in stages.

**Setup:** non-last-admin target, valid requested role/status/reason.

**Action:** combined update.

**Expected Result:** full final state commits; appropriate role and lifecycle semantic events commit together.

### TEST-AUTH016-20: Combined role + status update rejects atomically for last admin

**Purpose:** Prevent partial demotion/deactivation.

**Setup:** sole active admin.

**Expected Result:** rejected.

**Required Assertions:** no requested field partially written; no semantic events; no cleanup.

### TEST-AUTH016-21: Required reason missing/blank blocks sensitive action before side effects

**Purpose:** Enforce AUTH-012 reason policy.

**Cases:** grant ADMIN, revoke ADMIN, suspend, deactivate.

**Expected Result:** reject; no user/audit/provider work.

### TEST-AUTH016-22: WORKER -> ADMIN audit is semantically correct

**Purpose:** Protect privilege elevation traceability.

**Required Assertions:** actor/target IDs, old/new roles, `granted_admin`, reason, request ID.

### TEST-AUTH016-23: ADMIN -> WORKER audit occurs only on successful demotion

**Purpose:** Combine last-admin rule with truthful auditing.

**Cases:** two-admin success + sole-admin rejection.

**Expected Result:** success case event exists; rejection case event absent.

### TEST-AUTH016-24: Lifecycle event types match actual transitions

**Purpose:** Ensure taxonomy follows real before/after state.

**Cases:** active->suspended, active->inactive, suspended->active, inactive->active.

### TEST-AUTH016-25: Client-supplied actor cannot become audit actor

**Purpose:** Protect audit integrity.

**Setup:** trusted context Admin A plus malicious/extra actor value if service signature/DTO seam permits.

**Expected Result:** audit actor remains trusted Admin A or bad field is rejected earlier.

### TEST-AUTH016-26: Audit write failure prevents privilege mutation from committing

**Purpose:** Prove mandatory audit atomicity.

**Setup:** valid WORKER->ADMIN; audit create throws inside transaction.

**Expected Result:** service fails; worker remains WORKER; no provider side effect.

### TEST-AUTH016-27: Audit write failure prevents suspension from committing

**Purpose:** Same for lifecycle state.

**Expected Result:** worker remains active; no Clerk cleanup.

### TEST-AUTH016-28: Successful suspension revokes all mocked active sessions

**Purpose:** Validate AUTH-011 happy path from lifecycle entry point.

**Setup:** mapped worker, multiple sessions, all revoke successfully.

**Expected Result:** local suspended, cleanup success counts correct.

### TEST-AUTH016-29: Clerk session-list failure leaves local user non-active

**Purpose:** Protect fail-closed cross-system behavior.

**Setup:** local transaction succeeds; session listing throws.

**Expected Result:** local status remains suspended/inactive; semantic audit remains committed; cleanup reports failure.

**Required Assertions:** no update back to active.

### TEST-AUTH016-30: One session revoke failure does not stop remaining attempts

**Purpose:** Maximize cleanup during partial provider failure.

**Setup:** three sessions; middle revoke fails.

**Expected Result:** first/third attempted; partial result; local state remains non-active.

### TEST-AUTH016-31: Missing `clerkUserId` does not prevent local access removal

**Purpose:** Provider mapping health must not block local security.

**Setup:** active worker, no Clerk ID.

**Action:** suspend/deactivate.

**Expected Result:** local state + audit commit; cleanup skipped/failed-safe; no email provider lookup.

### TEST-AUTH016-32: Non-Clerk auth mode skips Clerk cleanup

**Purpose:** Respect configured auth provider.

**Expected Result:** local lifecycle works; no Clerk secret/session calls.

### TEST-AUTH016-33: Repeated cleanup/lifecycle request is idempotent according to policy

**Purpose:** Protect retry behavior.

**Setup:** already non-active user / already revoked sessions.

**Action:** repeat supported operation.

**Expected Result:** no unintended reactivation, duplicate privilege drift, or misleading duplicate semantic state-change events.

### TEST-AUTH016-34: Semantic audit metadata excludes sensitive markers

**Purpose:** Prevent security audit from becoming PII/credential dump.

**Setup:** fixtures contain fake email/token/provider-secret strings.

**Action:** successful sensitive change.

**Expected Result:** serialized semantic audit metadata excludes those markers.

### TEST-AUTH016-35: Concurrent final-admin-removal risk is tested or explicitly escalated

**Purpose:** Prevent false confidence from unit-only count checks.

**Level:** integration if practical.

**Setup:** two active admins, concurrent operations that would each remove one.

**Expected Result:** final DB count remains >=1 under chosen transaction/isolation design.

**If unit environment cannot prove this:** mark as explicit integration requirement for AUTH-017 and do not claim concurrency safety here.

---

## Test Matrix Summary

The final suite should visibly cover these dimensions:

| Dimension | Cases |
|---|---|
| Role safety | ADMIN, WORKER, RIDER, demotion, elevation |
| Status | active, suspended, inactive |
| Admin redundancy | 0 other active admin, 1+ other active admin |
| Entry points | lifecycle method, generic update, delete/deactivate alias |
| Audit | success, rejection, no-op, failure/rollback |
| Provider cleanup | success, missing mapping, provider off, list failure, partial revoke |
| Atomicity | combined role+status, audit failure |
| Idempotency | repeated lifecycle/cleanup |
| Privacy | no secrets/PII in semantic metadata |
| Concurrency | simultaneous final-admin removal risk |

---

## Failure Diagnosis Guide

### Last-admin test passes only because mocked count always returns zero

Add both rejection and allowed-two-admin cases. The test must prove count semantics, not just one branch.

### Transaction tests pass even when audit callback is never executed

Your `$transaction` mock is fake. Invoke the real callback with a transaction client mock.

### Suspension test asserts status but not audit/cleanup

Incomplete test. Sensitive lifecycle behavior includes all designed side effects.

### Provider failure makes service return user as active

Critical regression. Local authorization state must remain non-active.

### Missing Clerk ID causes lookup by email

AUTH-006 architecture has been reintroduced indirectly. Remove fallback.

### Failed last-admin action still writes audit success event

Event creation occurs too early or outside transaction/validation.

### No-op request creates another lifecycle event

Audit is based on endpoint invocation instead of actual state difference.

### Tests depend on order/shared fixture mutation

Clone fixtures and reset mocks/timers.

---

## Reviewer Walkthrough

Reviewer should verify:

1. real UsersService logic is executed;
2. transaction mock is honest;
3. last-admin rejection has zero downstream side effects;
4. allowed two-admin cases exist;
5. full lifecycle matrix matches final state-machine policy;
6. generic/delete paths cannot bypass central rules;
7. combined changes are atomic;
8. audit success/rejection/failure semantics are tested;
9. Clerk failure never restores local access;
10. no email fallback appears in provider cleanup;
11. sensitive audit metadata is tested;
12. idempotency/retry behavior is covered;
13. concurrency guarantee is either proven or explicitly handed off.

---

## PR Evidence Required

Include:

- service-method mutation inventory;
- fixture matrix;
- test count/list;
- transaction-mock design explanation;
- targeted service-spec result;
- full backend test result;
- typecheck/lint result;
- concurrency test result or explicit gap/handoff;
- proof of audit rollback tests;
- proof of provider-failure fail-closed tests;
- sensitive-metadata marker test result.

---

## Acceptance Criteria

- [ ] Last active admin safety is comprehensively tested.
- [ ] Normal admin lifecycle remains usable with redundancy.
- [ ] All supported lifecycle transitions are tested.
- [ ] Generic/alternate paths cannot bypass rules.
- [ ] Combined role/status operations are atomic.
- [ ] Required reasons are enforced before side effects.
- [ ] Semantic audit truthfulness and atomicity are tested.
- [ ] Provider cleanup success/failure/partial/skip behavior is tested.
- [ ] Provider failure never restores local access.
- [ ] Missing mapping never triggers email fallback.
- [ ] Sensitive audit metadata excludes secrets/PII.
- [ ] Idempotency/retry behavior is protected.
- [ ] Concurrency risk is tested or explicitly escalated.

---

## Definition of Done

- [ ] Service spec implemented/expanded.
- [ ] Targeted suite passes repeatedly.
- [ ] Full backend tests pass.
- [ ] Typecheck/lint pass.
- [ ] No real external services used.
- [ ] PR evidence complete.
- [ ] Reviewer confirms the suite protects AUTH-009 through AUTH-012, not merely method call counts.

---

## Rollback

Do not remove or weaken these tests merely because later implementation changes fail them.

If architecture intentionally changes, update the approved behavior/ticket first, then update tests with reviewer sign-off.

---

## Forbidden Shortcuts

Do not:

- mock the service method under test;
- fake `$transaction` success without executing callback logic;
- assert only `user.update` call count;
- omit negative provider/audit assertions on rejection;
- call real Clerk/SMTP/production DB;
- use real identity data;
- make test fixtures mutable/shared across tests;
- allow email fallback in provider cleanup;
- weaken atomicity tests because mocking is inconvenient;
- claim concurrency safety from a non-concurrent unit test.

---

## STOP - NEEDS ARCHITECT DECISION

Stop if:

- final lifecycle state machine differs materially from AUTH-010 assumptions;
- audit persistence is intentionally best-effort instead of mandatory;
- provider cleanup is moved to an async worker/job;
- user roles become organization-scoped so “last admin” becomes per-organization;
- transaction/isolation design for concurrency is not defined.

Update the expected test contract before encoding guesses.

---

## Handoff To AUTH-017

AUTH-017 may assume service tests prove the domain rules independently.

The E2E suite should then prove:

- real routes reach these service rules;
- real global guards cannot be bypassed;
- real DTO validation enforces required inputs;
- real Prisma/PostgreSQL state persists correctly;
- restart does not reactivate users;
- actor context flows from authenticated HTTP request to semantic audit.

---

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Targeted Service Suite:** Pass / Fail  
**Full Backend Suite:** Pass / Fail  
**Concurrency Coverage:** Pass / Handed to AUTH-017 / Needs Decision  
**Tests Added/Updated:**  
**Notes:**