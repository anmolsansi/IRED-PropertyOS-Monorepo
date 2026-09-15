# AUTH-015: Add Comprehensive JwtAuthGuard Regression Tests

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / Authentication / Security  
**Complexity:** Medium  
**Depends On:** AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-006, AUTH-014  
**Blocks:** AUTH-017  
**Primary New File:** `Backend/src/shared/guards/jwt-auth.guard.spec.ts`

## Objective

Create a focused regression suite that permanently protects the final hardened `JwtAuthGuard` contract.

The suite must prove that request-time authentication:

- preserves public-route behavior;
- requires and verifies a valid bearer token for Clerk-protected routes;
- maps verified Clerk `sub` directly to `User.clerkUserId`;
- never uses email as a fallback identity join;
- accepts only already-provisioned active local users;
- never creates a local user;
- never fills a missing identity mapping during login;
- never reactivates a user;
- never changes role/status/organization/geography;
- remains read-only with respect to user lifecycle/authorization state;
- preserves authorized-party/token-verification settings;
- preserves any supported non-Clerk auth mode intentionally;
- emits useful but PII/credential-minimal logs.

This test suite is the permanent guardrail against future “quick login fixes” reintroducing the vulnerabilities removed by AUTH-001 through AUTH-014.

---

## Junior Engineer Mental Model

A security regression test must prove more than the HTTP/auth result.

This is too weak:

```text
expect(authentication).toFail()
```

because the guard could have created an administrator, changed status, or linked an identity before failing for another reason.

A strong test asks four questions:

```text
1. What result did the guard return/throw?
2. Which identity lookup did it perform?
3. Which dangerous writes definitely did NOT occur?
4. What information did it expose in logs?
```

The suite should read like the final authentication state machine.

---

## Final Authentication Contract Being Tested

For Clerk mode:

```text
Is route public?
  yes -> allow without auth work
  no  -> continue

Extract Bearer token
  missing/malformed -> reject

Validate Clerk configuration
  invalid/missing -> reject

verifyToken(token, approved options)
  failure -> reject

sub = verifiedToken.sub

find local User where clerkUserId = sub
  none -> reject, zero writes

check local status
  inactive/suspended -> reject, zero writes
  active -> continue

request.user = stored local user
return true
```

The following are intentionally **not** in the flow:

```text
lookup by email
fetch Clerk profile only to discover email
create local user
link clerkUserId during request
promote ADMIN
set status active
clear deactivatedAt
sync role/org from provider metadata
```

---

## Architecture Discussion and Decisions

### Decision 1: Unit-test the real guard, mock infrastructure boundaries

Mock:

- Clerk `verifyToken`;
- Prisma service;
- `Reflector`;
- Nest `ExecutionContext`;
- logger when testing output;
- superclass Passport behavior only for the explicit legacy-provider compatibility test.

Do **not** mock `JwtAuthGuard.canActivate()` itself.

### Decision 2: Explicitly mock dangerous Prisma writes even though they should never happen

The mock must expose spies for:

```text
user.create
user.update
user.upsert
```

Why: a future regression adding any of these calls should fail existing tests immediately.

### Decision 3: Assert exact identity query key

A happy-path test must prove the local lookup uses:

```text
where.clerkUserId = verifiedToken.sub
```

A test that merely returns a local user from a generic mocked `findUnique` is insufficient because email fallback could silently return later.

### Decision 4: Do not call real Clerk or a real database

These are focused guard tests. AUTH-017 handles assembled E2E behavior with disposable PostgreSQL.

### Decision 5: Use fake sensitive markers and inspect all logger arguments

Logging tests must look for marker absence across all structured arguments, not only the first message string.

### Decision 6: Environment variables are isolated per test

Tests must not depend on developer shell state or execution order.

Capture original values, set only what each test requires, and restore afterward.

### Decision 7: Test behavior, not private implementation trivia

Assert security-significant interactions:

- verification called with correct options;
- exact identity lookup key;
- dangerous writes absent;
- state not mutated;
- logs privacy-minimal.

Avoid brittle assertions about punctuation, internal local variable names, or harmless log ordering.

---

## Facts, Assumptions, and Unknowns

### Facts / Expected State

- backend uses Jest;
- final guard supports Clerk mode and may still support a legacy Passport/JWT mode;
- AUTH-006 makes `clerkUserId` strict identity join;
- AUTH-014 defines safe logging expectations.

### Assumptions To Verify

- existing Jest module mocking can replace `verifyToken` before guard import/use;
- `Reflector.getAllAndOverride` or current metadata method can be configured per test;
- the request object has path/originalUrl/request ID fields used by final logging;
- `request.user` is mutable in test context.

### Unknowns That Must Not Be Guessed

- exact exception class/status used for each final failure path if implementation changed;
- exact legacy-auth superclass test seam;
- exact authorized-party environment variable precedence after final implementation.

Read the final guard before writing assertions.

---

## Scope

### Create / Modify

- `Backend/src/shared/guards/jwt-auth.guard.spec.ts`

Production code may be changed only for a small behavior-preserving testability improvement if genuinely necessary and reviewed.

### Out Of Scope

Do not:

- redesign auth architecture;
- build integration/E2E DB tests here;
- call real Clerk;
- test Clerk cryptography;
- test full RBAC behavior owned by `RolesGuard` beyond logging/interaction necessary to auth contract;
- weaken the guard solely to simplify mocks.

---

## Required Reading

Before implementation:

1. final `Backend/src/shared/guards/jwt-auth.guard.ts`
2. `Backend/src/shared/guards/roles.guard.ts`
3. public decorator/metadata implementation
4. backend Jest config/package scripts
5. at least two current `.spec.ts` examples
6. Prisma User model/enums
7. AUTH-001, 002, 003, 004, 006, 014 completion behavior
8. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Intern must be able to write the final auth state machine from memory before coding the test.

---

## Test Data Rules

Use fake-only values:

```text
local user IDs: deterministic fake UUIDs
clerk IDs: user_test_admin_a, user_test_worker_a
tokens: token-admin-a, super-secret-test-token
emails: *.example.test
request IDs: req-test-001
```

Never place a real personal email, real Clerk ID, production UUID, token, or secret in test fixtures.

---

## Shared Test Harness Design

Create small local helpers for:

- public/protected execution context;
- request object with headers/path/request ID/mutable user;
- active ADMIN/WORKER/RIDER fixtures;
- inactive/suspended fixture cloning;
- environment setup/restore;
- Prisma read/write spies;
- serialization of all logger calls for sensitive-marker assertions.

Prefer small helpers inside the spec. Do not create a new cross-project test framework unless repeated use is already established.

---

## Step-by-Step Execution Plan for an Intern

### Phase 0 - Baseline

Run current backend tests before adding the file.

```bash
npm run typecheck:backend
npm run test:backend
```

Record existing failures.

### Phase 1 - Inspect Existing Jest Style

Open two representative backend specs.

Record conventions for:

- `describe` nesting;
- async rejection assertions;
- provider mocks;
- mock reset;
- Nest testing module use;
- fake timers/environment cleanup.

### Phase 2 - Create the Spec Skeleton

Instantiate real `JwtAuthGuard` with mocked dependencies.

If direct construction conflicts with `AuthGuard('jwt')`, use existing Nest testing patterns.

Do not replace the guard with a fake.

### Phase 3 - Build Environment Isolation

Capture original auth-related env values.

Use `beforeEach` to set deterministic defaults and `afterEach`/`afterAll` to restore them.

At minimum consider:

```text
AUTH_PROVIDER
CLERK_SECRET_KEY
CLERK_AUTHORIZED_PARTIES or equivalent
FRONTEND_URL if used for authorized parties
```

### Phase 4 - Build Prisma Mock With Read + Forbidden Write Spies

Required methods include final lookup plus:

```text
user.create
user.update
user.upsert
```

Default forbidden writes to Jest fns so every relevant test can assert zero calls.

### Phase 5 - Build Request/ExecutionContext Helper

Request fixture must support whatever final guard reads:

- authorization header;
- URL/path;
- request ID;
- `request.user`.

Reflector result must be configurable for public/protected.

### Phase 6 - Mock Clerk Verification

Map fake token -> fake `sub`.

For invalid-token tests, throw a fake provider error containing sensitive markers so logging sanitation is also exercised.

### Phase 7 - Write Tests In State-Machine Order

Recommended file order:

1. public bypass;
2. token parsing/config;
3. token verification options;
4. active mapped users;
5. missing mapping / no email fallback;
6. inactive/suspended;
7. no-write/immutability;
8. provider profile/network dependency absence;
9. safe logging;
10. legacy provider behavior if supported.

### Phase 8 - Make Negative Assertions Mandatory

For every failure path where relevant, assert:

```text
user.create not called
user.update not called
user.upsert not called
request.user remains unset
```

### Phase 9 - Run Targeted Test During Development

Use backend Jest pattern/path to run only this spec while iterating.

Do not repeatedly run the entire repo for every line change.

### Phase 10 - Check Coverage Intelligently

Coverage should reveal missed auth branches, but 100% is not the goal.

Do not write meaningless implementation-detail tests solely to increase percentage.

### Phase 11 - Run Full Validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

Then confirm AUTH-017 can rely on this suite as a dependency.

---

## Detailed Test Catalog

### TEST-AUTH015-01: Public route bypasses auth work

**Purpose:** Preserve intended public endpoints.

**Setup:** reflector marks route public; no token.

**Action:** `canActivate()`.

**Expected Result:** `true`.

**Required Assertions:** no `verifyToken`; no Prisma read/write.

**If Fails:** fix public metadata handling, not token logic.

### TEST-AUTH015-02: Missing token rejects before provider/DB work

**Purpose:** Fail early at credential boundary.

**Setup:** protected route, no Authorization header.

**Action:** guard.

**Expected Result:** unauthorized.

**Required Assertions:** no verify; no DB read/write; request.user unset; safe reason log.

### TEST-AUTH015-03: Malformed/non-Bearer header is rejected

**Purpose:** Prevent unsupported scheme acceptance.

**Setup:** malformed or `Basic` auth header.

**Expected Result:** same security outcome as missing bearer.

**Required Assertions:** no provider/DB work; raw header not logged.

### TEST-AUTH015-04: Clerk mode without required secret fails closed

**Purpose:** Prevent misconfiguration from bypassing verification.

**Setup:** Clerk mode, bearer token present, secret unset.

**Expected Result:** reject before local lookup.

**Required Assertions:** no DB work; secret values absent from logs.

### TEST-AUTH015-05: Invalid token rejects with zero DB work

**Purpose:** Ensure provider verification precedes local trust.

**Setup:** `verifyToken` throws.

**Expected Result:** unauthorized.

**Required Assertions:** no local lookup/write; raw token/provider secret markers absent from logs.

### TEST-AUTH015-06: Verification receives authorized-party options

**Purpose:** Preserve token validation hardening while identity lookup changes.

**Setup:** deterministic authorized-party env values.

**Action:** valid token path.

**Expected Result:** `verifyToken` called with expected verification options.

**Required Assertions:** values used for verification, not exposed in logs unnecessarily.

### TEST-AUTH015-07: Active mapped ADMIN authenticates by Clerk ID

**Purpose:** Protect legitimate admin path.

**Setup:** verified `sub=user_test_admin`; Prisma returns active ADMIN for `clerkUserId`.

**Expected Result:** success.

**Required Assertions:** lookup key exactly `clerkUserId`; request.user is stored user; no writes.

### TEST-AUTH015-08: Active mapped WORKER authenticates without role mutation

**Purpose:** Auth is role-neutral.

**Expected Result:** success as WORKER.

**Required Assertions:** no ADMIN logic/update.

### TEST-AUTH015-09: Active mapped RIDER authenticates

**Purpose:** Cover all current roles.

**Expected Result:** success; role unchanged; zero writes.

### TEST-AUTH015-10: Unknown Clerk ID is denied with zero writes

**Purpose:** Protect explicit provisioning boundary.

**Setup:** token valid; lookup by `clerkUserId` returns null.

**Expected Result:** reject.

**Required Assertions:** no create/update/upsert; request.user unset.

### TEST-AUTH015-11: Same/similar email cannot provide fallback access

**Purpose:** Permanently protect strict identity join.

**Setup:** unmapped `sub`; model an email-collision local user if needed in mocked DB behavior.

**Expected Result:** reject.

**Required Assertions:** guard never queries local user by email; no link update.

### TEST-AUTH015-12: Former master-email scenario receives no exception

**Purpose:** Permanently protect AUTH-001.

**Setup:** fake `example.test` email representing the old special-email branch, but unmapped provider ID.

**Expected Result:** same rejection as any unmapped identity.

**Required Assertions:** no create/reactivate/promote.

### TEST-AUTH015-13: Inactive mapped user is denied and immutable

**Purpose:** Protect AUTH-003.

**Setup:** mapped inactive user with known role/deactivatedAt.

**Expected Result:** reject.

**Required Assertions:** no update; role/status/deactivatedAt unchanged.

### TEST-AUTH015-14: Suspended mapped user is denied and immutable

**Purpose:** Preserve temporary lock.

**Expected Result:** reject; zero writes; remains suspended.

### TEST-AUTH015-15: Active successful auth never mutates authorization state

**Purpose:** Protect AUTH-004.

**Setup:** active user with known role/status/org/geography-relevant state.

**Action:** authenticate multiple times.

**Expected Result:** success every time.

**Required Assertions:** zero user writes; returned authorization fields remain DB values.

### TEST-AUTH015-16: Provider metadata cannot elevate stored role

**Purpose:** Keep authorization source of truth in PropertyOS.

**Setup:** if provider mock exposes metadata, make it suggest ADMIN while local role=WORKER.

**Expected Result:** request.user remains WORKER.

**Required Assertions:** no role update.

### TEST-AUTH015-17: Request-time identity mapping cannot be repaired

**Purpose:** Protect AUTH-006 migration boundary.

**Setup:** strict lookup misses; another mocked local row could conceptually match email.

**Expected Result:** reject.

**Required Assertions:** no `user.update` assigning `clerkUserId`.

### TEST-AUTH015-18: Normal auth does not require Clerk profile fetch after strict mapping

**Purpose:** Prevent reintroduction of per-request profile/email dependency.

**Setup:** active mapped user.

**Action:** authenticate.

**Expected Result:** success using verified `sub` + Prisma lookup only, if final design removed profile fetch.

**Required Assertions:** `clerk.users.getUser` equivalent not called.

**If final guard has an approved different provider call, update test to assert the approved reason rather than blindly removing it.**

### TEST-AUTH015-19: Missing-user log is privacy-minimal

**Purpose:** Protect AUTH-014.

**Setup:** fake token/email/provider ID markers; local lookup null.

**Expected Result:** safe reason log.

**Required Assertions:** sensitive markers absent across all logger args.

### TEST-AUTH015-20: Invalid-token log does not leak token/provider error payload

**Purpose:** Protect credential/log hygiene.

**Setup:** provider error contains fake secret/token/email.

**Expected Result:** safe category only.

**Required Assertions:** marker absence.

### TEST-AUTH015-21: Success log excludes email/provider ID/token

**Purpose:** Prevent high-volume PII logs.

**Setup:** active mapped user with fake sensitive markers.

**Expected Result:** success; only safe local context logged if success logging exists.

### TEST-AUTH015-22: Repeated unmapped attempts remain read-only

**Purpose:** Catch retry/second-attempt repair behavior.

**Setup:** unmapped valid identity.

**Action:** call guard 3 times.

**Expected Result:** same rejection each time.

**Required Assertions:** zero cumulative writes.

### TEST-AUTH015-23: Repeated non-active attempts remain immutable

**Purpose:** Catch hidden login recovery on retries.

**Setup:** suspended/inactive fixture.

**Action:** repeated guard calls.

**Expected Result:** repeated denial; zero writes.

### TEST-AUTH015-24: Public route does not require Clerk environment configuration

**Purpose:** Ensure public health/setup routes stay independent of provider config.

**Setup:** public metadata, Clerk secret absent.

**Expected Result:** allow without provider config validation.

### TEST-AUTH015-25: Legacy non-Clerk mode delegates to supported Passport behavior

**Purpose:** Preserve intentional multi-provider compatibility if it still exists.

**Setup:** `AUTH_PROVIDER` set to supported non-Clerk mode.

**Action:** call guard through an approved superclass spy/test seam.

**Expected Result:** existing Passport/JWT path runs; Clerk-specific mapping does not.

**STOP:** If legacy mode is no longer supported by final architecture, remove this case intentionally and document that decision rather than preserving dead behavior.

### TEST-AUTH015-26: Test environment is isolated between cases

**Purpose:** Prevent false passes/failures caused by leaked env/mocks.

**Setup:** one test changes secret/provider/authorized parties.

**Action:** next test starts.

**Expected Result:** deterministic default state restored.

**Required Assertions:** no dependence on test order.

---

## Test Quality Rules

For security-relevant tests, response/exception assertion alone is insufficient.

Where relevant, also assert:

- exact Prisma lookup key;
- no forbidden writes;
- request.user state;
- provider calls/not-called;
- logger sensitive-marker absence;
- environment isolation;
- role/status/org immutability.

Do not delete a negative assertion merely because new implementation violates it. First determine whether the implementation regressed the security contract.

---

## Failure Diagnosis Guide

### Happy-path test succeeds even if lookup key changes to email

Your mock is too permissive. Assert the exact `findUnique` call arguments.

### Missing-user test rejects but `user.create` was called

The test correctly found a serious regression. Do not weaken it.

### Inactive-user test rejects but `user.update` happened

Authentication is still mutating lifecycle state. Fix the guard.

### Logging test only fails on the second argument

Good catch: structured metadata is leaking. Stop passing full objects.

### Tests pass only in one order

Environment/mock reset is incomplete.

### Legacy-provider test is hard to implement

Do not fake away the whole guard. Inspect Nest superclass behavior and use the smallest safe spy seam. If legacy mode is obsolete, escalate removal instead.

### Real Clerk credential seems required

The mocking boundary is wrong. Unit tests must not call real Clerk.

---

## Reviewer Walkthrough

Reviewer should verify:

1. tests execute real guard logic;
2. all external infrastructure is mocked, not security behavior;
3. exact `clerkUserId` query is asserted;
4. dangerous write spies exist;
5. all current roles are covered;
6. missing/inactive/suspended cases include negative writes;
7. no email fallback is modeled as acceptable;
8. provider profile fetch absence/approved purpose is checked;
9. authorized-party verification survives refactor;
10. logging tests inspect all arguments;
11. environment cleanup prevents order dependence;
12. legacy auth behavior is explicitly preserved or explicitly retired.

---

## PR Evidence Required

Include:

- test file path;
- final auth state-machine summary;
- list/count of test cases;
- targeted Jest command/result;
- full backend test result;
- typecheck/lint results;
- coverage notes for significant untested auth branches, if any;
- explicit proof of exact `clerkUserId` lookup test;
- explicit proof of no-write assertions;
- logging sensitive-marker test evidence;
- legacy-provider decision.

---

## Acceptance Criteria

- [ ] Dedicated JwtAuthGuard spec exists.
- [ ] Public-route behavior is protected.
- [ ] Token/config verification paths are protected.
- [ ] Exact Clerk-ID lookup is asserted.
- [ ] Email fallback is explicitly regression-tested as forbidden.
- [ ] Missing user cannot be created/linked.
- [ ] Inactive/suspended users cannot be reactivated.
- [ ] Successful auth cannot mutate privilege/lifecycle state.
- [ ] Provider metadata cannot override local authorization.
- [ ] Authorized-party verification remains tested.
- [ ] Sensitive log markers are absent.
- [ ] Tests are environment/order isolated.
- [ ] Supported legacy provider behavior is intentionally covered or retired.

---

## Definition of Done

- [ ] Test file implemented.
- [ ] Targeted suite passes repeatedly.
- [ ] Full backend suite passes.
- [ ] Typecheck/lint pass.
- [ ] No real external services required.
- [ ] PR evidence complete.
- [ ] Reviewer confirms tests fail for the historical regression patterns they are designed to prevent.

---

## Rollback

Tests themselves should not be rolled back simply because future code changes fail them.

If a test becomes incompatible with an intentional architecture change, update the ticket/architecture decision first, then change the test with explicit reviewer approval.

---

## Forbidden Shortcuts

Do not:

- mock `JwtAuthGuard.canActivate`;
- use a real Clerk token/secret;
- let `findUnique` return a user without asserting query key;
- omit write spies because “the current code has no writes”;
- test only HTTP/exception status;
- use real personal identity data;
- rely on test ordering;
- assert brittle full log strings instead of security signals;
- delete failing security assertions to accommodate a regression.

---

## STOP - NEEDS ARCHITECT DECISION

Stop if:

- final auth architecture intentionally removes legacy JWT mode;
- `verifyToken` cannot be safely mocked without a small abstraction change;
- final guard intentionally performs a request-time external profile call for a new approved purpose;
- failure HTTP/exception semantics materially changed from the ticket assumptions.

Update the expected contract before encoding a guessed behavior.

---

## Handoff To AUTH-017

AUTH-017 may assume the unit suite proves:

- exact strict identity mapping;
- no request-time user/privilege/lifecycle writes;
- non-active failure behavior;
- public/token/config semantics;
- log privacy invariants.

The E2E suite should then focus on proving real routing/guards/controllers/services/DB wiring cannot bypass those tested rules.

---

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Test Count:**  
**Targeted Suite:** Pass / Fail  
**Full Backend Suite:** Pass / Fail  
**Legacy Provider Decision:** Covered / Retired / Needs Decision  
**Notes:**