# AUTH-017: Add Authentication Hardening End-to-End Regression Suite

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / Authentication / Security  
**Complexity:** Medium-High  
**Depends On:** AUTH-006, AUTH-009, AUTH-010, AUTH-011, AUTH-012, AUTH-015, AUTH-016  
**Blocks:** AUTH-018 production rollout  
**Primary New File:** `Backend/test/auth-hardening.e2e-spec.ts`

## Objective

Add HTTP-level regression tests proving the complete hardened authentication and user-lifecycle behavior works when NestJS guards, controllers, services, Prisma, and a disposable PostgreSQL database are wired together.

Unit tests prove individual components. This ticket proves the assembled application does not accidentally bypass those components.

## Junior Engineer Orientation

This is the final automated safety layer before production rollout.

The key rule is:

```text
Mock only the external Clerk boundary.
Do NOT mock the PropertyOS security components being tested.
```

The suite should exercise:

```text
HTTP request
 -> real Nest routing
 -> real JwtAuthGuard
 -> real RolesGuard/other global guards as applicable
 -> real controller
 -> real UsersService
 -> real Prisma
 -> disposable PostgreSQL
```

Clerk token/session calls are external and may be mocked. The PropertyOS guard/service must remain real.

A test that replaces `JwtAuthGuard` with an allow-all fake is not an auth E2E test.

## Why This Exists

The existing E2E suite mainly exercises the legacy email/password + OTP + JWT path. Production Clerk hardening changes a separate request path and administrator lifecycle.

Security can still fail when individually correct units are assembled incorrectly, for example:

- wrong global guard order;
- controller route bypasses service invariant;
- DTO allows missing reason;
- database state is mutated despite HTTP rejection;
- strict Clerk-ID lookup works in unit test but AppModule still uses another path;
- session cleanup provider failure changes API behavior unexpectedly.

## Test Architecture

Create:

`Backend/test/auth-hardening.e2e-spec.ts`

Use:

- real `AppModule`;
- real Nest guards/controllers/services;
- real disposable PostgreSQL/Testcontainers setup already used by backend E2E;
- deterministic fake local users;
- mocked Clerk SDK boundary only;
- Supertest HTTP requests.

Do **not** call real Clerk in CI.

## Required Reading

1. `Backend/test/app.e2e-spec.ts`
2. `Backend/test/setup.ts`
3. `Backend/test/jest-e2e.json`
4. final `JwtAuthGuard`
5. final UsersService lifecycle implementation
6. AUTH-015 and AUTH-016 tests/invariants
7. user controller routes/DTOs
8. `docs/tickets/TICKET_DETAIL_STANDARD.md`

## Existing E2E Detail

Backend E2E Jest config matches `*.e2e-spec.ts` under `Backend/test`, so the new file should be discovered automatically by the backend E2E command.

Verify this with a list/test run rather than assuming.

## External Boundary Mocking

Mock Clerk, not PropertyOS.

Mock:

- `verifyToken(token, options)`;
- `createClerkClient()` only for session operations still needed by lifecycle.

Do **not** override:

- `JwtAuthGuard`;
- `RolesGuard`;
- `UsersController`;
- `UsersService`;
- Prisma with an in-memory fake for this E2E suite.

## Test Identity Design

Use obvious fake bearer tokens:

```text
token-admin-a -> clerk_admin_a
token-admin-b -> clerk_admin_b
token-worker-a -> clerk_worker_a
token-worker-b -> clerk_worker_b
token-rider-a -> clerk_rider_a
token-unmapped -> clerk_unmapped
token-invalid -> verifyToken throws
```

These are test strings, not real JWTs.

Seed matching local users with exact `clerkUserId` values for mapped identities.

Use only `example.test` emails.

## Test Isolation Rules

Each test must start from known DB state.

Use one of the existing accepted patterns:

- reset/reseed relevant tables in `beforeEach`;
- transaction rollback if current Testcontainers/Prisma setup supports it safely;
- dedicated helper that restores deterministic auth fixtures.

Do not rely on test execution order.

If a test deactivates Admin B, the next test must not accidentally inherit that unless explicitly arranged.

## Step-by-Step Implementation

### Step 1 - Create the dedicated E2E file

Do not overload the large legacy E2E file unless repository owner explicitly prefers one file.

### Step 2 - Establish Clerk-mode environment before module initialization

Set fake/test:

- `AUTH_PROVIDER=clerk`;
- `CLERK_SECRET_KEY`;
- authorized parties/frontend URL as needed.

Restore environment after suite.

### Step 3 - Mock Clerk module early enough

Jest module mocking/hoisting must happen before the application imports the real SDK behavior.

Map fake tokens to deterministic `sub` values.

Provider session client mock must support AUTH-011 scenarios.

If import order makes this impossible, stop and create/approve a minimal external-token verifier abstraction rather than mocking the real guard.

### Step 4 - Start disposable PostgreSQL

Reuse existing `setupTestContainers()` and migration/seed setup where safe.

Never point tests at developer/shared/production DB.

### Step 5 - Seed auth-hardening fixtures

At minimum:

- Admin A active/mapped;
- Admin B active/mapped;
- Worker A active/mapped;
- Worker B suspended or inactive/mapped;
- Rider A active/mapped;
- no row for `clerk_unmapped`.

Keep known timestamps for non-active users where state immutability is asserted.

### Step 6 - Start real Nest application

Apply the same global prefix/versioning/pipes required to match production app setup.

Prefer using shared app-bootstrap test helper if repository has one, but do not remove global security guards.

### Step 7 - Add HTTP helper functions

Helpers may set bearer token and issue Supertest requests, but cannot bypass auth.

Example conceptual helper:

```text
getAs(token, path)
patchAs(token, path, body)
```

### Step 8 - Add DB assertion helpers

Create small helpers to reload user, count users/admins, and query semantic audit records. Keep them test-only.

### Step 9 - Implement authentication tests first

Cover no token, invalid token, mapped success, unmapped rejection, email-collision rejection, non-active rejection.

### Step 10 - Implement lifecycle HTTP tests

Exercise real status/role endpoints, including reasons where required.

### Step 11 - Implement restart persistence test

Close and recreate the Nest app **without destroying the disposable DB** between suspension and second access attempt.

This is a key regression test for old auto-reactivation behavior.

### Step 12 - Implement provider cleanup failure scenario

Configure mock session API to fail after local status update. Assert HTTP/local behavior according to AUTH-011 approved contract and reload DB.

### Step 13 - Implement audit assertions

Query DB semantic audit rows. Assert actor/target/before/after/reason and no secret markers.

### Step 14 - Implement zero-auth-write regression

Capture mapped user's role/status/clerkUserId/organization and relevant timestamps before repeated `/auth/me` or protected requests. Compare after.

### Step 15 - Run dedicated file until stable

Use E2E Jest config/path filtering.

### Step 16 - Run full backend validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
npm run test:e2e -w ired-propertyos-backend
npm run build:backend
```

## Detailed E2E Test Catalog

### TEST-AUTH017-01: Protected route without token is denied

**Purpose:** Prove real global guard protects the route.

**Level:** E2E.

**Setup:** Real app/test DB running.

**Action:** `GET /api/v1/auth/me` or another known protected route without Authorization header.

**Expected Result:** 401/rejected according to final contract.

**Required Assertions:** No user row changes; Clerk verify mock not called if missing-token branch fails earlier.

**Why This Test Exists:** Ensures test app has not accidentally disabled the real guard.

**If This Test Fails:** Check global guard registration/app bootstrap before changing auth logic.

### TEST-AUTH017-02: Invalid fake Clerk token is denied

**Purpose:** Prove real guard uses mocked external verifier and fails closed.

**Level:** E2E.

**Setup:** `token-invalid` makes mocked `verifyToken` throw.

**Action:** Protected request with token-invalid.

**Expected Result:** Rejected.

**Required Assertions:** User table unchanged; no synthetic request user/provisioning.

**Why This Test Exists:** Validates provider-verification integration through HTTP.

**If This Test Fails:** Check Jest module mock ordering and real guard use.

### TEST-AUTH017-03: Active mapped ADMIN/WORKER/RIDER can reach appropriate protected behavior

**Purpose:** Prove strict mapping works across roles in assembled app.

**Level:** E2E parameterized.

**Setup:** Seed mapped active users for each role.

**Action:** Call `/auth/me` and, where useful, role-appropriate route.

**Expected Result:** Authentication succeeds; role in response/context matches DB.

**Required Assertions:** DB role/status/clerkUserId unchanged after requests.

**Why This Test Exists:** Ensures hardening did not make login admin-specific or break less-common RIDER role.

**If This Test Fails:** Inspect guard lookup vs downstream role guard separately.

### TEST-AUTH017-04: Unmapped Clerk subject is denied with zero user creation

**Purpose:** Protect explicit provisioning boundary end to end.

**Level:** E2E.

**Setup:** `token-unmapped` resolves to a `sub` with no local row. Record user count/admin count.

**Action:** Protected request.

**Expected Result:** Rejected.

**Required Assertions:** User count/admin count unchanged; no row with `clerk_unmapped` appears.

**Why This Test Exists:** Directly catches request-time auto-provisioning through real app wiring.

**If This Test Fails:** Search auth path for create/upsert or test fixture accidentally pre-seeded mapping.

### TEST-AUTH017-05: Email coincidence cannot substitute for Clerk-ID mapping

**Purpose:** Protect strict identity join at assembled level.

**Level:** E2E.

**Setup:** Local fake user has same fake email conceptually associated with unmapped token but different/null `clerkUserId`.

**Action:** Request using unmapped token.

**Expected Result:** Denied.

**Required Assertions:** Existing local row unchanged and not linked to token sub.

**Why This Test Exists:** Prevents hidden email fallback in a helper/service outside unit-tested guard code.

**If This Test Fails:** Remove email-based join/repair outside explicit migration/provisioning.

### TEST-AUTH017-06: Inactive mapped user remains inactive after request

**Purpose:** Protect removal of login-time auto-reactivation through real DB.

**Level:** E2E.

**Setup:** Seed inactive mapped user with known `deactivatedAt`.

**Action:** Protected request with mapped token.

**Expected Result:** Rejected.

**Required Assertions:** Reload row: status, role, clerkUserId, deactivatedAt unchanged.

**Why This Test Exists:** A rejection status alone would not catch mutation-before-failure.

**If This Test Fails:** Inspect request-time DB writes.

### TEST-AUTH017-07: Suspended mapped user remains suspended

**Purpose:** Same protection for temporary security lock.

**Level:** E2E.

**Setup:** Suspended mapped user.

**Action:** Protected request.

**Expected Result:** Rejected; row unchanged.

**Required Assertions:** No reactivation/metadata change.

**Why This Test Exists:** Ensures status gate handles all non-active states.

**If This Test Fails:** Restore `status === active` invariant.

### TEST-AUTH017-08: Admin suspends worker through real API and access is immediately denied

**Purpose:** Validate assembled lifecycle + auth + audit + session cleanup path.

**Level:** E2E.

**Setup:** Admin A active; Worker A active/mapped; provider session mock configured; valid reason if required.

**Action:** Admin calls real status endpoint to suspend Worker A, then Worker A calls protected endpoint.

**Expected Result:** Admin request succeeds; worker request denied.

**Required Assertions:** DB status suspended; deactivatedAt set; semantic audit exists; provider cleanup mock called for worker's `clerkUserId`.

**Why This Test Exists:** This is the central user-facing hardening workflow.

**If This Test Fails:** Determine which layer failed instead of weakening E2E expectations.

### TEST-AUTH017-09: Suspended state survives backend restart

**Purpose:** Protect persistence and old auto-reactivation regression.

**Level:** E2E restart scenario.

**Setup:** Suspend Worker A successfully.

**Action:** Close Nest app, recreate app against same test DB, retry Worker A protected request.

**Expected Result:** Still denied.

**Required Assertions:** DB remains suspended; no startup/auth repair; role/deactivatedAt unchanged.

**Why This Test Exists:** Demonstrates disabled state is durable across process lifecycle.

**If This Test Fails:** Search startup seed/hooks and auth reactivation logic.

### TEST-AUTH017-10: Explicit reactivation restores access only after admin action

**Purpose:** Prove approved restoration path end to end.

**Level:** E2E.

**Setup:** Worker A suspended.

**Action:** Admin A calls reactivation endpoint, then Worker A calls protected endpoint.

**Expected Result:** Reactivation succeeds; worker subsequently authenticates.

**Required Assertions:** DB active; deactivatedAt null; activation audit exists; no session revoke triggered by reactivation.

**Why This Test Exists:** Replaces hidden login recovery with intentional administration.

**If This Test Fails:** Fix lifecycle endpoint/service, not auth fallback.

### TEST-AUTH017-11: Sole active admin cannot deactivate/suspend/demote themselves

**Purpose:** Protect final-admin invariant at HTTP route level.

**Level:** E2E parameterized.

**Setup:** Admin A active; Admin B inactive/suspended so A is sole active admin.

**Action:** As A, attempt deactivate, suspend, and supported demotion operations against A.

**Expected Result:** Each rejected.

**Required Assertions:** Reload A after each: still ADMIN/active; no success semantic audit/provider cleanup.

**Why This Test Exists:** Proves controllers/routes cannot bypass UsersService safety.

**If This Test Fails:** Identify bypassing endpoint or missing actor/target state handling.

### TEST-AUTH017-12: With two active admins, one can be removed safely

**Purpose:** Ensure operational usability.

**Level:** E2E.

**Setup:** A and B active admins.

**Action:** A deactivates or demotes B with required reason.

**Expected Result:** Success.

**Required Assertions:** A remains active; B reflects requested final state; semantic audit correct.

**Why This Test Exists:** Safety control should block only last-admin boundary.

**If This Test Fails:** Inspect count logic/fixture state.

### TEST-AUTH017-13: Clerk session cleanup failure never restores local access

**Purpose:** Validate fail-closed external dependency behavior through HTTP.

**Level:** E2E.

**Setup:** Worker active; mock Clerk session listing/revoke to fail according to AUTH-011 scenario.

**Action:** Admin suspends/deactivates Worker; then Worker requests protected route.

**Expected Result:** Local operation reflects approved partial-cleanup contract; worker is denied afterward.

**Required Assertions:** DB remains non-active; no rollback to active.

**Why This Test Exists:** This is the highest-risk cross-system failure case.

**If This Test Fails:** Fix ordering/error contract, not by allowing access.

### TEST-AUTH017-14: Security-sensitive role change creates semantic audit with real HTTP actor

**Purpose:** Validate controller `@CurrentUser` -> service -> audit wiring.

**Level:** E2E.

**Setup:** Admin A, Worker A, valid reason.

**Action:** Promote Worker A through real supported API.

**Expected Result:** Role changes and semantic audit created.

**Required Assertions:** actorUserId=A; entityId=Worker A; previous/new roles; reason; no secret markers.

**Why This Test Exists:** Service unit tests cannot prove controller passes authenticated actor correctly.

**If This Test Fails:** Check controller actor-context wiring and transaction/event creation.

### TEST-AUTH017-15: Client cannot spoof audit actor through HTTP body

**Purpose:** Protect semantic audit integrity at external API boundary.

**Level:** E2E.

**Setup:** Admin A authenticated. Send an extra/malicious actor field if DTO validation path permits testing it.

**Action:** Perform allowed sensitive action.

**Expected Result:** Unknown field rejected by whitelist/forbid policy or ignored by DTO contract; semantic audit actor remains Admin A.

**Required Assertions:** Client-provided actor ID never becomes audit actor.

**Why This Test Exists:** HTTP is where spoofing attempts originate.

**If This Test Fails:** Remove actor authority from DTO and rely on authenticated context.

### TEST-AUTH017-16: Missing required reason is rejected with zero security mutation

**Purpose:** Validate DTO/controller/service reason policy together.

**Level:** E2E.

**Setup:** Sensitive action requiring reason.

**Action:** Omit/blank reason.

**Expected Result:** Validation/business rejection.

**Required Assertions:** Target user unchanged; no success semantic audit; no provider cleanup.

**Why This Test Exists:** Unit validation may pass while route DTO wiring forgets the field/rule.

**If This Test Fails:** Fix validation/service ordering.

### TEST-AUTH017-17: Repeated successful auth performs zero identity/privilege writes

**Purpose:** Prove hardened request path is stable under normal traffic.

**Level:** E2E.

**Setup:** Active mapped Worker A; record role/status/clerkUserId/org/updatedAt where appropriate.

**Action:** Call `/auth/me` or protected route multiple times.

**Expected Result:** All requests succeed.

**Required Assertions:** Security fields unchanged; no mapping/lifecycle drift. If `updatedAt` changes for unrelated reasons, investigate rather than relying solely on it.

**Why This Test Exists:** Hidden synchronization often appears only on normal successful requests.

**If This Test Fails:** Search auth path for request-time writes.

### TEST-AUTH017-18: Auth/log response does not expose fake sensitive markers

**Purpose:** Validate AUTH-014 through assembled app.

**Level:** E2E/manual log capture if practical.

**Setup:** Fake sensitive token/email/provider-ID marker; trigger invalid/missing mapping condition.

**Action:** HTTP request.

**Expected Result:** Client response generic; captured test logs contain no sensitive markers according to logging policy.

**Required Assertions:** No raw token/provider error/PII in response.

**Why This Test Exists:** Integration layers can reintroduce leakage outside unit-tested logger branch.

**If This Test Fails:** Identify leaking layer and sanitize there.

## Checkpoint

- [ ] Real JwtAuthGuard is used.
- [ ] Only external Clerk boundary is mocked.
- [ ] Real controllers/services/Prisma test DB are used.
- [ ] Tests are independent/order-safe.
- [ ] Restart-persistence scenario passes.
- [ ] Last-admin API behavior passes.
- [ ] Audit/session-cleanup/reason behavior is exercised.
- [ ] DB state is checked after rejection/failure, not only HTTP status.

## Failure Diagnosis Guide

### Every protected request returns 401

Check mock module initialization/`verifyToken` token mapping and whether app started in Clerk mode. Do not bypass guard.

### Clerk mock is not being used

Jest import/hoisting order is wrong. Establish mock before importing/compiling AppModule or create an approved DI seam.

### Tests hang during restart

Ensure app closes cleanly without tearing down Testcontainers DB, and no dangling worker/socket handles remain.

### Test passes alone but fails full E2E suite

Fixture/env/container state is leaking. Reset environment/database deterministically; do not depend on test order.

### Status code is correct but DB state changed unexpectedly

Treat as real security regression. Add state assertions and fix implementation.

### Existing legacy E2E suite breaks in Clerk mode

Keep environment isolation between files. One E2E suite should not leave `AUTH_PROVIDER=clerk` for another.

## PR Evidence Required

Include:

- E2E file path and test count;
- statement that real PropertyOS guard/controller/service/Prisma are used;
- exact Clerk boundary mocked;
- fixture identity map (fake IDs only);
- targeted new-suite result;
- full existing E2E result;
- unit/typecheck/lint/build results;
- restart-persistence result;
- last-admin HTTP cases result;
- provider-failure result;
- audit/reason/spoofing result;
- statement that no live Clerk/production DB credentials are needed.

## Acceptance Criteria

- [ ] Dedicated auth-hardening E2E file exists.
- [ ] No real Clerk/network secret required.
- [ ] No production/shared developer DB required.
- [ ] Detailed catalog above passes or equivalent coverage is documented.
- [ ] Suite catches auto-provisioning/auto-reactivation/email fallback regressions.
- [ ] Suite catches controller/service last-admin bypass.
- [ ] Suite catches local-access rollback on provider failure.
- [ ] Suite validates semantic audit actor/reason behavior.
- [ ] Existing E2E suite still passes.

## Definition of Done

- [ ] New E2E suite passes locally/CI-capable environment.
- [ ] Existing E2E suite passes.
- [ ] Unit tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Backend build passes.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms real guard/security stack is not bypassed.

## Rollback

Do not remove the E2E suite because it exposes a regression. Fix product behavior or update the suite only after an approved architecture change.

## Forbidden Shortcuts

Do not:

- override JwtAuthGuard with allow-all fake;
- mock UsersService/controller logic under test;
- call real Clerk in CI;
- use production credentials/database;
- rely on test order;
- skip restart-persistence scenario;
- assert only HTTP status without DB security state;
- mark security scenarios `.skip` to get CI green.

## STOP - NEEDS ARCHITECT DECISION

Stop if test environment cannot initialize Clerk-mode AppModule without substantial production-code changes. Propose the smallest DI seam for the **external** token/session provider boundary rather than bypassing PropertyOS guards.

Also stop if existing Testcontainers helper fundamentally cannot support multiple E2E files safely. Reconcile shared test infrastructure rather than pointing the suite to a persistent database.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**New E2E Test Count:**  
**New E2E Result:** Pass / Fail  
**Existing E2E Result:** Pass / Fail  
**Restart Persistence:** Pass / Fail  
**Notes:**