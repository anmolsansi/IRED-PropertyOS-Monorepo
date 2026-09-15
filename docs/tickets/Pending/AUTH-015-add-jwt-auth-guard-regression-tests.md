# AUTH-015: Add Comprehensive JwtAuthGuard Regression Tests

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / Authentication / Security  
**Complexity:** Medium  
**Depends On:** AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-006, AUTH-014  
**Blocks:** AUTH-017  
**Primary New File:** `Backend/src/shared/guards/jwt-auth.guard.spec.ts`

## Objective

Create a focused unit/regression test suite for `JwtAuthGuard` that permanently protects the hardened authentication contract.

The suite must prove that request-time authentication:

- verifies identity correctly;
- maps Clerk `sub` to an existing local user through `clerkUserId`;
- accepts only active users;
- never creates users;
- never reactivates users;
- never changes roles/status/organization/geography;
- never falls back to email;
- does not silently repair missing identity mappings;
- does not log sensitive identity/token data;
- preserves existing public-route and authorized-party behavior.

## Junior Engineer Orientation

This ticket does not add new product behavior. It creates the safety net that stops later engineers from accidentally undoing AUTH-001 through AUTH-014.

A good security regression test does more than assert:

```text
request failed
```

It also proves:

```text
why it failed
which dependency was/was not called
what database state did not change
which security fallback did not occur
what sensitive data did not leak into logs
```

For example, this is too weak:

```text
expect(error).toBeUnauthorized()
```

because the guard might have created an ADMIN and then failed for another reason.

A stronger test also asserts:

```text
user.create was not called
user.update was not called
request.user was not set
```

## Why This Exists

Jest is already configured under the backend, but the current repository does not have a dedicated `JwtAuthGuard` spec protecting the hardened security behavior.

Authentication code is frequently changed under pressure when login breaks. Without focused regression tests, a future engineer may reintroduce email fallback, auto-provisioning, auto-reactivation, or sensitive debug logging while trying to restore access quickly.

## Expected Files

Create:

- `Backend/src/shared/guards/jwt-auth.guard.spec.ts`

Modify production auth code only if a **small behavior-preserving testability refactor** is genuinely required.

Do not redesign authentication simply to make mocking easier.

## Required Reading

1. final `Backend/src/shared/guards/jwt-auth.guard.ts` after dependencies
2. `Backend/package.json` Jest configuration
3. `Backend/src/shared/decorators/public.decorator.ts`
4. at least two existing backend `.spec.ts` files for project style
5. Prisma `UserRole` and `UserStatus`
6. `docs/tickets/TICKET_DETAIL_STANDARD.md`
7. AUTH-001/002/003/004/006/014 completed ticket behavior

Before writing tests, write the final auth flow on paper/PR notes:

```text
public route? -> allow
protected -> require Bearer token
verify Clerk token
lookup local user by clerkUserId=sub
missing -> reject
non-active -> reject
active -> attach stored user -> allow
```

No test should encode obsolete email-mapping behavior as the desired result.

## Test Strategy

Unit-test the guard without real Clerk/network/database calls.

Mock:

- `verifyToken` from `@clerk/backend`;
- `Reflector`;
- `PrismaService` user lookup and write methods;
- Nest `ExecutionContext` request/handler/class shape;
- Logger where testing sensitive output.

Do not require real Clerk credentials.

## Test Data Rules

Use fake values only, for example:

```text
clerkUserId: user_test_123
email: sensitive@example.test
local user id: 11111111-1111-4111-8111-111111111111
token: super-secret-test-token
```

Never use a real administrator email, real Clerk ID, production UUID, or live token in fixtures.

## Shared Test Harness Requirements

Build small helpers/fixtures for:

- protected/public `ExecutionContext`;
- fake request with mutable `request.user`;
- active ADMIN/WORKER/RIDER users;
- inactive/suspended users;
- safe environment variable setup/restore;
- logger call serialization for sensitive-marker checks.

Keep helpers inside the spec unless they are clearly reusable elsewhere.

## Step-by-Step Implementation

### Step 1 - Inspect existing Jest conventions

Find at least two existing backend unit specs.

Follow repository conventions for:

- `describe` structure;
- provider mocks;
- resetting mocks;
- async exception assertions;
- environment cleanup.

Do not add another testing framework.

### Step 2 - Create the spec file and minimal guard instance

Construct `JwtAuthGuard` with mocked `Reflector` and `PrismaService`.

If superclass `AuthGuard("jwt")` makes direct construction tricky, follow Nest testing-module patterns already used in repo. Do not mock `canActivate()` itself.

### Step 3 - Add environment isolation

Capture original values of auth-related environment variables.

Each test must explicitly establish what it needs. Restore values in `afterEach`/`afterAll` so test ordering cannot change results.

### Step 4 - Add explicit Prisma write spies

Even though hardened guard should not call them, include mocked/spied methods for:

- `user.create`;
- `user.update`;
- `user.upsert`.

This is deliberate. A future regression that adds one of these calls should make tests fail.

### Step 5 - Build a reusable protected request context

The fake request must support what the guard reads:

- `headers.authorization`;
- `originalUrl`/`url`;
- request ID if used by logging;
- mutable `request.user`.

Reflector should be configurable per test for public/protected behavior.

### Step 6 - Mock `verifyToken` by outcome

Success tests return a known `{ sub }`.

Failure tests throw/reject.

Do not test Clerk cryptography. Test PropertyOS behavior based on the SDK result.

### Step 7 - Implement tests in security-flow order

Recommended ordering:

1. public-route bypass;
2. token/config failures;
3. mapped active users;
4. missing mapping/email fallback regression;
5. inactive/suspended users;
6. no-write/privilege immutability;
7. authorized parties;
8. safe logging.

This makes the test file readable like the auth flow.

### Step 8 - Add comments only where the security reason is not obvious

Do not narrate every Jest line. Use test names and small comments to explain why a negative assertion matters.

### Step 9 - Run targeted test repeatedly while building

Use backend workspace Jest path/pattern to run only `jwt-auth.guard.spec.ts` until stable.

Then run the entire backend suite.

### Step 10 - Run full validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

Optionally run backend coverage and inspect the guard's untested branches.

Coverage percentage is evidence, not the goal. Do not write meaningless tests only to reach 100%.

## Detailed Test Catalog

### TEST-AUTH015-01: Public route bypasses auth dependencies

**Purpose:** Preserve existing public-route contract while hardening protected routes.

**Level:** Unit.

**Setup:** Reflector marks route public; request has no token.

**Action:** Call `canActivate()`.

**Expected Result:** Returns `true`.

**Required Assertions:** `verifyToken` not called; Prisma user lookup/write methods not called.

**Why This Test Exists:** A security refactor should not accidentally make health/public routes require Clerk.

**If This Test Fails:** Check public metadata handling before debugging token logic.

### TEST-AUTH015-02: Protected route with missing token is rejected before provider/DB work

**Purpose:** Protect authentication entry boundary.

**Level:** Unit.

**Setup:** Protected route, no authorization header.

**Action:** Call guard.

**Expected Result:** Unauthorized.

**Required Assertions:** `verifyToken` not called; Prisma lookup/write methods not called; `request.user` unset.

**Why This Test Exists:** Missing credentials should fail early and read/write nothing.

**If This Test Fails:** Inspect bearer extraction/order.

### TEST-AUTH015-03: Malformed/non-Bearer header behaves like missing token

**Purpose:** Prevent accidental acceptance of unsupported auth schemes.

**Level:** Unit.

**Setup:** `Authorization: Basic ...` or malformed header.

**Action:** Call guard.

**Expected Result:** Unauthorized; no provider/DB work.

**Required Assertions:** Same negative calls as missing-token test.

**Why This Test Exists:** Prefix parsing is part of the security boundary.

**If This Test Fails:** Tighten bearer extraction without logging raw header.

### TEST-AUTH015-04: Clerk mode with missing secret fails before local lookup

**Purpose:** Fail closed on provider misconfiguration.

**Level:** Unit.

**Setup:** `AUTH_PROVIDER=clerk`, token present, `CLERK_SECRET_KEY` unset.

**Action:** Call guard.

**Expected Result:** Unauthorized/config rejection.

**Required Assertions:** No Prisma user lookup/write; no secret value logged.

**Why This Test Exists:** Misconfigured auth must not silently bypass verification.

**If This Test Fails:** Restore explicit secret requirement.

### TEST-AUTH015-05: Invalid Clerk token is rejected with zero DB work

**Purpose:** Ensure local identity is never trusted before external token verification succeeds.

**Level:** Unit.

**Setup:** Fake bearer token; `verifyToken` throws.

**Action:** Call guard.

**Expected Result:** Unauthorized.

**Required Assertions:** No local lookup/write; raw token absent from logs.

**Why This Test Exists:** Verification order must stay provider-first.

**If This Test Fails:** Check ordering and logging.

### TEST-AUTH015-06: Active mapped ADMIN succeeds without writes

**Purpose:** Protect normal administrator authentication after hardening.

**Level:** Unit.

**Setup:** `verifyToken` returns admin sub; `findUnique` by `clerkUserId` returns active ADMIN.

**Action:** Call guard.

**Expected Result:** `true`.

**Required Assertions:** `request.user` is existing local user; exact lookup key is `clerkUserId`; no create/update/upsert; role/status unchanged.

**Why This Test Exists:** Security changes should not require privileged repair for legitimate admins.

**If This Test Fails:** Inspect strict mapping and status path; do not add fallback.

### TEST-AUTH015-07: Active mapped WORKER succeeds without admin-specific logic

**Purpose:** Prove auth success is role-neutral.

**Level:** Unit.

**Setup:** Active mapped WORKER.

**Action:** Authenticate.

**Expected Result:** Allowed; request user stays WORKER.

**Required Assertions:** No role mutation/writes.

**Why This Test Exists:** Auth should identify users; RolesGuard decides route permissions later.

**If This Test Fails:** Remove role-specific success behavior from JwtAuthGuard.

### TEST-AUTH015-08: Active mapped RIDER succeeds

**Purpose:** Cover every current role.

**Level:** Unit.

**Setup:** Active mapped RIDER.

**Action:** Authenticate.

**Expected Result:** Allowed; role unchanged; no writes.

**Required Assertions:** Same as WORKER case.

**Why This Test Exists:** Less-common roles are easy to omit in refactors.

**If This Test Fails:** Ensure guard does not whitelist only ADMIN/WORKER.

### TEST-AUTH015-09: Unknown Clerk ID is rejected with zero writes

**Purpose:** Protect explicit provisioning requirement.

**Level:** Unit.

**Setup:** Valid token sub; Prisma lookup by `clerkUserId` returns null.

**Action:** Authenticate.

**Expected Result:** Rejected.

**Required Assertions:** no create/update/upsert; `request.user` unset.

**Why This Test Exists:** Prevents auto-provisioning and request-time identity repair.

**If This Test Fails:** Check AUTH-002/AUTH-006 regressions.

### TEST-AUTH015-10: Email collision does not provide fallback access

**Purpose:** Prove email is not a second identity key.

**Level:** Unit.

**Setup:** Verified `sub` has no local mapping. If needed, model a local row that would match the same fake email, but production guard must never query by email.

**Action:** Authenticate.

**Expected Result:** Rejected.

**Required Assertions:** Only `clerkUserId` lookup occurred; no email lookup/linking.

**Why This Test Exists:** `try ID then email` is the most likely future shortcut.

**If This Test Fails:** Remove fallback; mapping must be fixed outside auth.

### TEST-AUTH015-11: Former privileged-email scenario has no special handling

**Purpose:** Permanently protect AUTH-001.

**Level:** Unit.

**Setup:** Fake email representing the old special-email condition, but unknown/unmapped provider ID.

**Action:** Authenticate.

**Expected Result:** Same rejection as any unknown mapping.

**Required Assertions:** No user creation/reactivation/role assignment.

**Why This Test Exists:** Prevents reintroduction of owner/master-email bypass.

**If This Test Fails:** Search for special email/domain/allowlist logic.

### TEST-AUTH015-12: Inactive mapped user is denied and immutable

**Purpose:** Permanently protect AUTH-003.

**Level:** Unit.

**Setup:** Correct mapped user, `status=inactive`, known role/deactivatedAt.

**Action:** Authenticate.

**Expected Result:** Rejected.

**Required Assertions:** no write; status/role/deactivatedAt unchanged.

**Why This Test Exists:** Response rejection alone does not prove auto-reactivation is gone.

**If This Test Fails:** Remove lifecycle mutation from guard.

### TEST-AUTH015-13: Suspended mapped user is denied and immutable

**Purpose:** Protect temporary account locks.

**Level:** Unit.

**Setup:** Mapped suspended user.

**Action:** Authenticate.

**Expected Result:** Rejected, zero writes.

**Required Assertions:** status remains suspended.

**Why This Test Exists:** Suspended must never be treated as active/recoverable at login.

**If This Test Fails:** Restore `status === active` gate.

### TEST-AUTH015-14: Auth never mutates role/status/org for successful user

**Purpose:** Protect AUTH-004 broader privilege immutability.

**Level:** Unit.

**Setup:** Active mapped user with known role/status/org.

**Action:** Authenticate repeatedly.

**Expected Result:** Success each time.

**Required Assertions:** no user writes; same local authorization state returned each time.

**Why This Test Exists:** Prevents request-time privilege synchronization from external metadata.

**If This Test Fails:** Remove auth-side sync/repair writes.

### TEST-AUTH015-15: Authorized parties are passed to token verification

**Purpose:** Preserve token origin/audience-related verification configuration.

**Level:** Unit.

**Setup:** Set fake `CLERK_AUTHORIZED_PARTIES` or frontend URL.

**Action:** Authenticate.

**Expected Result:** `verifyToken` invoked with expected secret/authorized parties shape.

**Required Assertions:** Values are used for verification but not logged.

**Why This Test Exists:** Identity-mapping refactor must not weaken token validation options.

**If This Test Fails:** Restore provider verification configuration independently of DB lookup.

### TEST-AUTH015-16: Missing-user safe log contains reason code and no sensitive markers

**Purpose:** Protect AUTH-014 at guard level.

**Level:** Unit/log capture.

**Setup:** Fake token/email/provider ID markers; local lookup returns null.

**Action:** Authenticate.

**Expected Result:** Rejected with safe reason log.

**Required Assertions:** token/email/provider ID absent across all logger args; reason/request context present.

**Why This Test Exists:** Login regression fixes often add temporary sensitive debug logging.

**If This Test Fails:** Sanitize logging, not test expectations.

### TEST-AUTH015-17: Successful auth log excludes email/provider/token

**Purpose:** Prevent high-volume success logging from collecting PII.

**Level:** Unit/log capture.

**Setup:** Active mapped user with fake sensitive markers.

**Action:** Authenticate.

**Expected Result:** Success.

**Required Assertions:** Sensitive markers absent from logger args; local ID/role may remain.

**Why This Test Exists:** Success paths produce the largest log volume.

**If This Test Fails:** Replace full-object/profile logging with allowlisted fields.

### TEST-AUTH015-18: Legacy non-Clerk provider delegates to Passport guard as expected

**Purpose:** Protect current multi-provider compatibility if still supported.

**Level:** Unit.

**Setup:** `AUTH_PROVIDER` not `clerk`; configure/method-spy superclass behavior using a safe test seam.

**Action:** Call guard.

**Expected Result:** Existing JWT/Passport path is used, without executing Clerk-specific mapping.

**Required Assertions:** `verifyToken` not called in non-Clerk mode.

**Why This Test Exists:** Clerk hardening should not accidentally route every environment through Clerk.

**If This Test Fails:** Confirm whether legacy mode is still intentionally supported. If not, STOP for architecture cleanup rather than silently deleting support in a test ticket.

## Negative Assertion Checklist

Where applicable, every test should consider asserting that these were **not** called:

- `prisma.user.create`;
- `prisma.user.update`;
- `prisma.user.upsert`;
- any email-based local lookup helper;
- provider profile fetch when AUTH-006 removed it;
- logger with fake sensitive values.

Do not copy every negative assertion into every test if it adds noise, but high-risk missing/non-active/success cases must explicitly protect zero-write behavior.

## Checkpoint

- [ ] Every security-relevant guard branch has a focused test.
- [ ] Tests assert exact provider-ID lookup behavior.
- [ ] Tests fail if email fallback is introduced.
- [ ] Tests fail if user create/update/reactivation is introduced.
- [ ] Inactive/suspended immutability is asserted.
- [ ] Sensitive-log regressions are covered.
- [ ] Environment is restored between tests.
- [ ] Tests use fake identities/secrets only.

## Failure Diagnosis Guide

### Tests fail only when run as full suite

Likely environment/mocks are leaking between tests. Restore `process.env`, clear/reset Jest mocks, and avoid module-level mutable fixtures.

### Guard test is difficult because of `AuthGuard("jwt")` inheritance

Use Nest TestingModule/spies around dependencies/super behavior. Do not mock the actual `JwtAuthGuard.canActivate()` implementation.

### Test needs real Clerk to pass

The unit boundary is wrong. Mock the Clerk SDK call/result. Real-provider behavior belongs in controlled E2E/manual verification, not unit tests.

### Email collision test seems impossible after email code is removed

That is okay. Assert exact `findUnique` call uses only `clerkUserId` and that no email lookup helper/API exists/calls. The test protects absence of fallback.

### Security test breaks after legitimate architecture change

Do not delete it reflexively. Update the ticket/architecture decision first, then change tests while preserving the intended security invariant.

## PR Evidence Required

Include:

- test file path;
- total test count;
- list of scenarios covered;
- targeted Jest result;
- full backend Jest result;
- typecheck/lint result;
- optional guard coverage summary;
- explicit statement that tests use no real Clerk/network/secrets;
- explicit statement that high-risk tests assert zero DB writes;
- any intentionally uncovered branch with reason.

## Acceptance Criteria

- [ ] `jwt-auth.guard.spec.ts` exists under `Backend/src`.
- [ ] Detailed test catalog above is implemented or an equivalent test is documented for each invariant.
- [ ] No real Clerk API calls occur in unit tests.
- [ ] No real secrets/identities are required.
- [ ] Tests fail if email fallback, auto-provisioning, auto-reactivation, or privilege writes are reintroduced.
- [ ] Tests fail if sensitive auth logging is reintroduced.
- [ ] Full backend unit suite passes.

## Definition of Done

- [ ] Test file complete.
- [ ] Targeted test passes.
- [ ] Full backend tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Coverage reviewed for meaningful untested guard branches.
- [ ] Required PR evidence recorded.
- [ ] Reviewer verifies assertions test behavior/security invariants rather than implementation trivia.

## Rollback

Do not remove security regression tests merely because a future refactor breaks them. Update tests to the newly approved architecture while preserving the security invariants.

## Forbidden Shortcuts

Do not:

- skip difficult negative cases;
- call real Clerk from unit tests;
- use former real privileged identity as fixture data;
- mock the guard method being tested instead of dependencies;
- delete zero-write assertions;
- use snapshot-only tests for security behavior;
- rely only on response status without state/call assertions;
- lower Jest/lint/typecheck standards to make the suite pass.

## STOP - NEEDS ARCHITECT DECISION

Stop if final authentication architecture differs materially from the strict Clerk-ID flow described here.

Also stop if legacy non-Clerk auth mode is being removed as part of a broader architecture change. This test ticket should reflect the approved provider model rather than deciding it implicitly.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Guard Test Count:**  
**Guard Coverage:**  
**Targeted Suite:** Pass / Fail  
**Full Backend Suite:** Pass / Fail  
**Notes:**