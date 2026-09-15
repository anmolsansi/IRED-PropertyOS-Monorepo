# AUTH-016: Add User Lifecycle and Administrator Safety Tests

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / User Administration / Security  
**Complexity:** Medium  
**Depends On:** AUTH-009, AUTH-010, AUTH-011, AUTH-012  
**Blocks:** AUTH-017  
**Primary New File:** `Backend/src/modules/users/users.service.spec.ts`

## Objective

Create a comprehensive service-level test suite for the user lifecycle and administrator safety rules introduced by AUTH-009 through AUTH-012.

The suite must prove that user administration cannot:

- remove the final active administrator;
- bypass lifecycle transition rules through another service method;
- reactivate users implicitly;
- lose the semantic audit trail for sensitive changes;
- roll a local suspension/deactivation back when Clerk session cleanup fails;
- silently skip external cleanup without reporting it;
- produce partial role/status state on rejected combined updates.

## Junior Engineer Orientation

This suite tests the **business-security rules inside `UsersService`** directly.

AUTH-015 tests request authentication. AUTH-016 tests what happens when an authorized administrator intentionally changes another user's access.

The key difference is:

```text
AUTH-015:
"Can this existing user authenticate?"

AUTH-016:
"Can an administrator safely change this user's role/status/access?"
```

A service test should verify actual state decisions and side effects, not merely that `prisma.user.update` was called.

For every sensitive operation, think in four layers:

1. **Precondition:** Is the action allowed?
2. **Local mutation:** What exact user state changes?
3. **Security side effects:** Audit event, Clerk session cleanup.
4. **Failure behavior:** What must remain unchanged if one step fails?

## Why This Exists

`UsersService` owns high-risk operations such as inviting users, changing roles/status, assigning geography, resetting passwords, deactivation, and reassignment. After hardening, it also owns last-admin safety, explicit lifecycle transitions, session cleanup, and semantic auditing.

These rules need direct tests independent of HTTP/controller behavior so failures are easy to diagnose.

## Expected Files

Create/update:

- `Backend/src/modules/users/users.service.spec.ts`

Potentially add small local test helpers/fixtures if repeated setup becomes excessive. Do not build a new testing framework.

## Required Reading

1. final `Backend/src/modules/users/users.service.ts`
2. `Backend/src/modules/users/users.controller.ts`
3. `Backend/src/modules/users/dto/users.schema.ts`
4. completed AUTH-009, AUTH-010, AUTH-011, AUTH-012 implementations
5. existing service specs for repository mocking style
6. Prisma `User` and `AuditEvent` models
7. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before writing tests, list the service methods that can change role/status and identify which one is the centralized lifecycle path.

## Test Boundary

These are primarily **service unit tests**.

Mock infrastructure/external dependencies:

- `PrismaService`;
- `MailService`;
- Clerk user/session methods;
- time where stable timestamp assertions are needed;
- transaction wrapper according to actual implementation.

Do not call:

- production database;
- real Clerk;
- real SMTP;
- real hosting services.

AUTH-017 handles assembled HTTP-level E2E regression.

## Fixture Rules

Use clear fake users:

- `adminA`: active ADMIN;
- `adminB`: active ADMIN;
- `adminInactive`: inactive ADMIN;
- `adminSuspended`: suspended ADMIN;
- `workerA`: active WORKER;
- `workerSuspended`: suspended WORKER;
- `workerInactive`: inactive WORKER;
- `riderA`: active RIDER.

Use fake UUIDs, provider IDs, and `example.test` emails.

Keep fixtures small. Include only fields the tested service path actually reads.

## Shared Test Harness Requirements

Provide helpers for:

- cloning fixtures so tests cannot mutate shared objects;
- mocking active-admin counts;
- capturing Prisma update payloads;
- capturing audit-event payloads;
- mocking Clerk session pages/revocations;
- fixed/fake clock for `deactivatedAt` where practical;
- actor context with fake authenticated admin ID/reason/request ID.

Reset all mocks between tests.

## Step-by-Step Implementation

### Step 1 - Create the service spec skeleton

Set up a fresh `UsersService` per test with mocked dependencies.

Do not mock `UsersService` methods themselves. The purpose is to execute real service decision logic.

### Step 2 - Model transaction behavior honestly

If service uses `prisma.$transaction`, your mock must still execute the callback or transactional methods in a way that exercises the real service logic.

Do not stub `$transaction` to simply return success regardless of mutation/audit code.

### Step 3 - Add write spies for sensitive tables

At minimum capture calls to:

- `user.findUnique`;
- `user.count`;
- `user.update`;
- `user.create` where invite coverage is included;
- `auditEvent.create`;
- session-list/revoke methods.

### Step 4 - Freeze time where lifecycle timestamp equality matters

If testing `deactivatedAt`, use Jest fake timers or inject a fixed time only if repository/test style supports it.

Avoid broad timing assertions such as "timestamp is sometime today" when exact call payload can be tested more reliably.

### Step 5 - Implement last-admin tests first

These are highest severity and should assert **zero downstream side effects** on rejection.

### Step 6 - Implement normal lifecycle transitions

Test active -> suspended/inactive and explicit reactivation.

Assert status + metadata + audit + external cleanup trigger behavior.

### Step 7 - Implement provider failure behavior

Simulate listing/revoke failures after local state success.

Verify local state never rolls back.

### Step 8 - Implement semantic audit tests

Assert actor, target, old/new values, reason policy, and false-event prevention.

### Step 9 - Implement bypass tests

Call generic update/delete/invite paths that could accidentally bypass central rules.

### Step 10 - Run targeted suite, then entire backend validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Detailed Test Catalog

### TEST-AUTH016-01: Sole active admin cannot be deactivated

**Purpose:** Protect the final-admin invariant at service level.

**Level:** Service unit.

**Setup:** `adminA` is active ADMIN; `user.count` for other active admins returns 0.

**Action:** Transition Admin A to inactive.

**Expected Result:** Service rejects with approved last-admin error.

**Required Assertions:**

- no user update;
- no session listing/revocation;
- no success semantic audit;
- Admin A state remains active.

**Why This Test Exists:** This is the main permanent-lockout scenario.

**If This Test Fails:** Check AUTH-009 helper invocation before writes.

### TEST-AUTH016-02: Sole active admin cannot be suspended

**Purpose:** Ensure temporary lock state is treated as access removal.

**Level:** Service.

**Setup:** Same as above.

**Action:** Suspend Admin A.

**Expected Result:** Rejected with zero side effects.

**Required Assertions:** No lifecycle/provider/audit success writes.

**Why This Test Exists:** A protection that checks only `inactive` is incomplete.

**If This Test Fails:** Apply final-admin invariant to every resulting non-active state.

### TEST-AUTH016-03: Sole active admin cannot be demoted to WORKER or RIDER

**Purpose:** Protect role-based removal of the last administrator.

**Level:** Service.

**Setup:** Sole active Admin A.

**Action:** Run separate cases for ADMIN -> WORKER and ADMIN -> RIDER.

**Expected Result:** Both rejected.

**Required Assertions:** No partial profile/role/status write; no privilege-revocation success audit.

**Why This Test Exists:** Lockout protection must evaluate resulting active-admin state, not only status.

**If This Test Fails:** Ensure generic role update uses AUTH-009.

### TEST-AUTH016-04: Inactive/suspended admins do not count as redundancy

**Purpose:** Prevent false safety from unusable admin rows.

**Level:** Service.

**Setup:** Admin A active; Admin B inactive or suspended; count logic should report zero *other active* admins.

**Action:** Attempt to remove Admin A's active-admin state.

**Expected Result:** Rejected.

**Required Assertions:** Count filter includes both `role=ADMIN` and `status=active` and excludes target.

**Why This Test Exists:** Counting every ADMIN row could lock the system out.

**If This Test Fails:** Tighten count semantics.

### TEST-AUTH016-05: With two active admins, one can be deactivated/demoted

**Purpose:** Ensure safety logic does not make admin management impossible.

**Level:** Service.

**Setup:** Admin A + Admin B active; target B; one other active admin exists.

**Action:** Deactivate or demote B in separate cases.

**Expected Result:** Allowed.

**Required Assertions:** A remains active; resulting active-admin count >=1; semantic audit correct.

**Why This Test Exists:** Last-admin protection should block only the dangerous boundary.

**If This Test Fails:** Check target exclusion/count logic.

### TEST-AUTH016-06: Active worker suspension applies all local lifecycle state

**Purpose:** Validate explicit suspension behavior.

**Level:** Service.

**Setup:** Active mapped `workerA`, fixed current time, actor Admin A.

**Action:** Suspend with valid reason.

**Expected Result:** Worker becomes suspended.

**Required Assertions:** `deactivatedAt` set to fixed time; role/org unchanged; semantic `user_suspended` audit created; Clerk cleanup triggered after local transition.

**Why This Test Exists:** Tests complete lifecycle behavior, not just `status` field.

**If This Test Fails:** Determine whether lifecycle, audit, or provider trigger is missing.

### TEST-AUTH016-07: Active worker deactivation applies all local lifecycle state

**Purpose:** Validate permanent access removal.

**Level:** Service.

**Setup:** Active mapped worker.

**Action:** Deactivate with reason.

**Expected Result:** Inactive + timestamp + audit + provider cleanup.

**Required Assertions:** No role/provider mapping changes.

**Why This Test Exists:** Deactivation and suspension share mechanics but different semantic events.

**If This Test Fails:** Check target-status event mapping.

### TEST-AUTH016-08: Suspended/inactive worker explicitly reactivates

**Purpose:** Protect the only intended normal restoration path.

**Level:** Service.

**Setup:** Run parameterized cases for suspended and inactive worker.

**Action:** Transition to active.

**Expected Result:** Active, `deactivatedAt=null`, activation audit.

**Required Assertions:** No session revocation call; role/clerkUserId unchanged.

**Why This Test Exists:** Reactivation should be explicit and must not recreate sessions automatically.

**If This Test Fails:** Fix AUTH-010 lifecycle path, not auth guard.

### TEST-AUTH016-09: Ordinary profile update cannot implicitly reactivate

**Purpose:** Ensure non-lifecycle operations do not repair account access.

**Level:** Service.

**Setup:** Suspended/inactive worker.

**Action:** Update name/mobile only.

**Expected Result:** Profile field may change; status/deactivatedAt remain non-active.

**Required Assertions:** No activation audit; no session behavior.

**Why This Test Exists:** Generic update paths are common lifecycle bypasses.

**If This Test Fails:** Separate profile and lifecycle state handling.

### TEST-AUTH016-10: Generic status update cannot bypass central lifecycle rules

**Purpose:** Test compatibility path if `update()` still accepts status.

**Level:** Service.

**Setup:** Last active admin or active worker fixture.

**Action:** Submit status through generic update method.

**Expected Result:** Same behavior as `transitionStatus`, including final-admin rule and metadata.

**Required Assertions:** No independent direct status write.

**Why This Test Exists:** Centralization is incomplete if a legacy method bypasses it.

**If This Test Fails:** Delegate to lifecycle method/remove status from generic path per approved contract.

### TEST-AUTH016-11: Clerk listing failure leaves local user suspended/inactive

**Purpose:** Protect fail-closed external cleanup semantics.

**Level:** Service.

**Setup:** Local lifecycle mutation succeeds; mocked Clerk list throws.

**Action:** Suspend/deactivate.

**Expected Result:** Local user remains non-active; cleanup result signals failure.

**Required Assertions:** No update back to active; safe log/result produced.

**Why This Test Exists:** External identity-provider outage must never reopen local access.

**If This Test Fails:** Remove rollback-on-provider-error logic.

### TEST-AUTH016-12: One Clerk session revoke failure does not prevent remaining attempts

**Purpose:** Validate partial cleanup behavior.

**Level:** Service.

**Setup:** Three sessions; middle revoke throws.

**Action:** Suspend/deactivate.

**Expected Result:** First/third attempts happen; local user non-active; partial summary recorded.

**Required Assertions:** Later revoke called; no local rollback.

**Why This Test Exists:** Maximizes sign-out coverage during partial provider failure.

**If This Test Fails:** Catch failures per session according to AUTH-011 design.

### TEST-AUTH016-13: Missing `clerkUserId` still allows local access removal without email fallback

**Purpose:** Keep local security independent of provider mapping health.

**Level:** Service.

**Setup:** Active worker, `clerkUserId=null`.

**Action:** Suspend/deactivate.

**Expected Result:** Local state changes; provider cleanup skipped.

**Required Assertions:** No provider lookup by email; no failure that keeps user active.

**Why This Test Exists:** Broken provider mapping must not prevent access removal.

**If This Test Fails:** Separate local lifecycle success from provider cleanup eligibility.

### TEST-AUTH016-14: WORKER -> ADMIN audit includes actor/target/before/after/reason

**Purpose:** Protect semantic privilege-elevation auditing.

**Level:** Service.

**Setup:** Admin A changes Worker A to ADMIN with valid reason.

**Action:** Change role.

**Expected Result:** Role changes; semantic audit created.

**Required Assertions:** Correct actor/target IDs, previous/new roles, `granted_admin`, reason, no secrets.

**Why This Test Exists:** Elevation must be reconstructable later.

**If This Test Fails:** Review AUTH-012 context/event logic.

### TEST-AUTH016-15: ADMIN -> WORKER audit is written only when demotion succeeds

**Purpose:** Combine last-admin rule and semantic audit truthfulness.

**Level:** Service.

**Setup:** Two admins for success case, sole admin for failure case.

**Action:** Demote target.

**Expected Result:** Success case creates revocation audit; failure case creates no success audit.

**Required Assertions:** Audit taxonomy/old-new roles correct.

**Why This Test Exists:** Audit history must not claim rejected changes happened.

**If This Test Fails:** Move event creation into successful mutation transaction/result path.

### TEST-AUTH016-16: Status audit events match actual transitions

**Purpose:** Cover lifecycle semantic auditing systematically.

**Level:** Service parameterized test.

**Setup:** Cases active->suspended, active->inactive, suspended->active, inactive->active.

**Action:** Execute each transition.

**Expected Result:** Event type matches actual resulting state.

**Required Assertions:** Previous/new status correct; actor/target/reason policy correct.

**Why This Test Exists:** Prevents generic/misclassified security events.

**If This Test Fails:** Derive event from actual before/after state.

### TEST-AUTH016-17: Missing/blank required reason prevents sensitive mutation

**Purpose:** Enforce explanation policy for high-risk actions.

**Level:** Service/DTO depending on ownership.

**Setup:** ADMIN grant/revoke, suspension, deactivation with missing/whitespace reason.

**Action:** Execute sensitive action.

**Expected Result:** Rejected before mutation.

**Required Assertions:** No user write; no success audit; no provider cleanup.

**Why This Test Exists:** Required reason must be enforced before side effects.

**If This Test Fails:** Move reason validation before mutation in owning layer.

### TEST-AUTH016-18: Client/DTO cannot spoof audit actor

**Purpose:** Protect audit integrity at service contract.

**Level:** Service/controller boundary test.

**Setup:** Authenticated actor context Admin A; malicious/extra DTO actor ID points to Admin B if such field could be passed.

**Action:** Perform allowed change.

**Expected Result:** Audit actor remains Admin A or invalid extra field is rejected before service call.

**Required Assertions:** Client actor never becomes authoritative.

**Why This Test Exists:** Administrators must not be able to falsify who performed an action.

**If This Test Fails:** Remove actor from DTO and derive from auth context.

### TEST-AUTH016-19: Profile-only update produces no semantic role/status event

**Purpose:** Keep security audit high-signal.

**Level:** Service.

**Setup:** Active worker.

**Action:** Update only name/mobile.

**Expected Result:** Profile update succeeds; no role/status semantic audit.

**Required Assertions:** Generic request audit is outside unit scope; semantic audit create not called for security event.

**Why This Test Exists:** Avoid misleading/noisy privilege history.

**If This Test Fails:** Trigger semantic events only on actual state change.

### TEST-AUTH016-20: Explicit invite remains a provisioning path independent of auth guard

**Purpose:** Ensure removing auth auto-provisioning did not remove legitimate onboarding.

**Level:** Service.

**Setup:** Authorized admin; valid fake invite; mocked Clerk user creation/reuse if Clerk mode.

**Action:** `invite()`.

**Expected Result:** User is created explicitly with requested supported role/status according to current contract.

**Required Assertions:** No dependency on `JwtAuthGuard`; failure rollback behavior for Clerk/local create preserved.

**Why This Test Exists:** It documents the correct creation boundary for future engineers.

**If This Test Fails:** Fix explicit provisioning, not request-time auth.

### TEST-AUTH016-21: Combined role/status rejection produces no partial state

**Purpose:** Protect atomic authorization changes.

**Level:** Service/integration-style unit.

**Setup:** Last active admin, request attempts demotion + inactive plus profile edits.

**Action:** Execute combined supported update.

**Expected Result:** Rejected entirely.

**Required Assertions:** No role, status, timestamp, or profile field partially written; no success audit/provider cleanup.

**Why This Test Exists:** Sequential updates can leave dangerous half-state.

**If This Test Fails:** Compute resulting state and apply mutation transactionally.

### TEST-AUTH016-22: Mandatory audit failure rolls back local privilege/status change

**Purpose:** Protect AUTH-012 reliability contract if security audit is transactional.

**Level:** Service.

**Setup:** Valid sensitive operation; audit insert throws inside mocked transaction.

**Action:** Execute change.

**Expected Result:** Whole local mutation fails/rolls back under approved contract.

**Required Assertions:** No committed authorization state without audit.

**Why This Test Exists:** Security audit cannot be optional accidentally if architecture says mandatory.

**If This Test Fails:** Fix transaction mock/implementation or reconcile approved audit reliability before altering test.

## Test Organization Recommendation

Group specs by concern so a junior engineer can find failures quickly:

```text
describe('last-admin safety')
describe('status lifecycle')
describe('Clerk session cleanup')
describe('semantic security audit')
describe('explicit provisioning regressions')
```

Do not create one 500-line `describe` with unrelated setup hidden between tests.

## Checkpoint

- [ ] Last-admin rules have direct tests.
- [ ] Every supported lifecycle transition has direct tests.
- [ ] Generic-update bypass is tested.
- [ ] Provider cleanup full/partial/skipped/failure paths are tested.
- [ ] Audit actor/before/after/reason behavior is tested.
- [ ] No implicit reactivation is tested.
- [ ] Explicit invite boundary is tested.
- [ ] No test calls real Clerk/SMTP/database.
- [ ] Fake identities only.

## Failure Diagnosis Guide

### Service tests pass individually but fail together

Shared fixture or mock state is leaking. Clone fixtures, reset mocks, and restore environment/time per test.

### `$transaction` mock makes every test pass without executing callback

The mock is invalid. Configure it to execute callback with mocked transactional client or model actual implementation closely enough to test decisions.

### Provider failure test expects service to throw, but implementation returns partial result

Use AUTH-011 approved contract. The important invariant is local access stays removed and cleanup failure is observable. Reconcile expectation to approved behavior, not personal preference.

### Audit tests are brittle around generated timestamps

Freeze time or assert expected fixed time/range. Do not weaken before/after/security assertions.

### Last-admin tests require many mock calls

Create focused helper fixtures/count mocks. Do not skip the cases.

## PR Evidence Required

Include:

- test file path and total case count;
- test group names;
- targeted service suite result;
- full backend suite result;
- typecheck/lint result;
- explicit list of last-admin cases covered;
- session cleanup failure/partial tests covered;
- audit actor/reason/transaction tests covered;
- statement that no real external service is called;
- service coverage summary if available.

## Acceptance Criteria

- [ ] `users.service.spec.ts` exists.
- [ ] Detailed catalog above is implemented or equivalent coverage is documented.
- [ ] Tests fail if last-admin protection is removed.
- [ ] Tests fail if implicit reactivation is introduced.
- [ ] Tests fail if local suspension is rolled back on Clerk failure.
- [ ] Tests fail if semantic security auditing disappears or can be spoofed.
- [ ] Tests cover explicit provisioning boundary.
- [ ] Full backend test suite passes.

## Definition of Done

- [ ] Targeted service suite passes.
- [ ] Full backend tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Security assertions reviewed.
- [ ] No real external services are required by suite.
- [ ] Required PR evidence recorded.

## Rollback

Do not delete these tests because implementation changes. Update them only when an approved lifecycle/security contract changes, preserving equivalent protection.

## Forbidden Shortcuts

Do not:

- mock `UsersService` itself;
- assert only calls without checking resulting security state;
- remove last-admin cases to simplify mocks;
- make provider failure tests expect reactivation;
- use real Clerk credentials;
- skip committed tests without explicit approval;
- build a transaction mock that bypasses service logic;
- use production-like identity values.

## STOP - NEEDS ARCHITECT DECISION

Stop if AUTH-009 through AUTH-012 were implemented with materially different lifecycle/audit semantics.

Also stop if security audit reliability or provider cleanup failure contract is unresolved. Tests must encode approved architecture, not decide it silently.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**UsersService Test Count:**  
**UsersService Coverage:**  
**Targeted Suite:** Pass / Fail  
**Full Backend Suite:** Pass / Fail  
**Notes:**