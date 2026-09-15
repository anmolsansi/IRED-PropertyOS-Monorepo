# AUTH-017: Add Authentication Hardening End-to-End Regression Suite

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / Authentication / Security / Integration  
**Complexity:** High  
**Depends On:** AUTH-006, AUTH-009, AUTH-010, AUTH-011, AUTH-012, AUTH-015, AUTH-016  
**Blocks:** AUTH-018 production rollout  
**Primary New File:** `Backend/test/auth-hardening.e2e-spec.ts`

## Objective

Add an HTTP-level regression suite proving the complete hardened authentication and user-lifecycle design works when the real NestJS application pieces are assembled together.

Unit tests prove components in isolation. This ticket proves that real routing, guard order, controller wiring, DTO validation, service logic, Prisma behavior, database persistence, semantic audit writes, and provider-cleanup integration do not accidentally bypass the hardened rules.

The suite must use a disposable PostgreSQL database and the real PropertyOS security/business components. Only external Clerk boundaries should be mocked.

---

## Junior Engineer Mental Model

This is not another unit test suite.

The request should travel through the same PropertyOS layers production uses:

```text
HTTP request
  -> Nest router
  -> global JwtAuthGuard
  -> RolesGuard / OrgGuard / GeographyGuard as applicable
  -> DTO validation
  -> controller
  -> real UsersService
  -> real Prisma
  -> disposable PostgreSQL
```

External Clerk verification/session APIs may be mocked so CI does not need real credentials/network access.

The most important rule is:

```text
Mock Clerk.
Do NOT mock away PropertyOS security.
```

If you override `JwtAuthGuard` with an allow-all guard, the resulting test is not an authentication E2E test.

---

## Why This Exists

Individually correct components can still fail when assembled.

Examples this suite must catch:

- the app bootstraps a different guard than the unit-tested guard;
- global guard order is wrong;
- one user controller route bypasses `UsersService` last-admin checks;
- DTO validation lets a sensitive action through without required reason;
- HTTP rejection occurs after a dangerous DB mutation;
- strict Clerk-ID lookup exists in unit code but another helper still falls back to email;
- a suspended account is repaired during app restart/startup;
- authenticated actor context is not passed into semantic audit;
- provider cleanup failure accidentally changes HTTP/local-state behavior;
- test-only wiring accidentally disables global guards.

---

## Architecture Discussion and Decisions

### Decision 1: Use real `AppModule`

**Chosen:** Boot the real application module and real guards/controllers/services.

**Rejected:** Create a simplified test module that manually omits unrelated/global security components.

**Why:** The purpose is to validate assembled production wiring.

### Decision 2: Use real disposable PostgreSQL

**Chosen:** Reuse existing Testcontainers/disposable DB E2E setup.

**Rejected:** In-memory Prisma mock.

**Why:** Persistence, transactions, constraints, restart behavior, and audit rows are part of the contract.

### Decision 3: Mock external Clerk boundary only

Mock:

- `verifyToken`;
- Clerk session list/revoke APIs required by AUTH-011.

Do not mock:

- `JwtAuthGuard`;
- `RolesGuard`;
- `UsersController`;
- `UsersService`;
- Prisma service/database.

### Decision 4: Use deterministic fake tokens rather than real JWTs

Example mapping:

```text
token-admin-a   -> clerk_admin_a
token-admin-b   -> clerk_admin_b
token-worker-a  -> clerk_worker_a
token-worker-b  -> clerk_worker_b
token-rider-a   -> clerk_rider_a
token-unmapped  -> clerk_unmapped
token-invalid   -> provider verification throws
```

The test is verifying PropertyOS behavior after Clerk verification, not Clerk cryptography.

### Decision 5: Restart test must preserve the database

To prove non-active status is durable:

```text
suspend user
-> close Nest app
-> recreate Nest app against same disposable DB
-> retry access
```

Do not reset/reseed between suspension and restart assertion.

### Decision 6: Each test is isolated

Tests must not depend on execution order.

Reset relevant tables/fixtures before each test or use another established repository isolation method.

### Decision 7: E2E assertions include DB state, not only HTTP status

A `403` is not enough if the request created/updated data before failing.

For sensitive cases reload the DB and assert exact before/after state.

---

## Facts, Assumptions, and Unknowns

### Facts / Expected State

- backend already has E2E/Testcontainers infrastructure;
- E2E Jest config discovers `*.e2e-spec.ts` under `Backend/test`;
- production Clerk mode is configured through environment variables;
- AUTH-015 protects guard behavior in unit tests;
- AUTH-016 protects UsersService domain behavior in service tests.

### Assumptions To Verify

- existing Testcontainers helper can preserve a DB while recreating Nest app;
- Clerk module mocks can be installed before application module import/init;
- test app can apply the same global prefix/versioning/pipes as production;
- semantic audit rows are queryable through Prisma in tests.

### Unknowns That Must Not Be Guessed

- exact endpoint paths after final controller changes;
- exact partial-success HTTP response for provider cleanup failure;
- whether frontend/authorized-party configuration is required by `verifyToken` mock options;
- whether a minimal external-token verifier abstraction is needed to make module mocking reliable.

Read final code first.

---

## Scope

### Create

- `Backend/test/auth-hardening.e2e-spec.ts`

Potentially create small E2E-only fixture/helper utilities if repository style already supports them.

### Out Of Scope

Do not:

- call production Clerk;
- point tests to shared/developer/prod DB;
- test frontend UI here;
- override real guards with permissive test guards;
- duplicate every unit-test branch at HTTP level;
- test unrelated PropertyOS workflows.

Focus E2E effort on cross-layer security guarantees and bypass risks.

---

## Required Reading

Before coding:

1. `Backend/test/app.e2e-spec.ts`
2. `Backend/test/setup.ts`
3. `Backend/test/jest-e2e.json`
4. production app bootstrap (`main.ts`) for prefix/versioning/pipes
5. final `JwtAuthGuard`
6. global guard registration order
7. final user controller/service/DTOs
8. AUTH-015 test contract
9. AUTH-016 test contract
10. `docs/tickets/TICKET_DETAIL_STANDARD.md`

The intern must be able to draw the real request path and name which pieces are real vs mocked in this E2E suite.

---

## Test Identity and Database Fixtures

Seed at minimum:

```text
Admin A    ADMIN  active     clerk_admin_a
Admin B    ADMIN  active     clerk_admin_b
Worker A   WORKER active     clerk_worker_a
Worker B   WORKER suspended  clerk_worker_b
Rider A    RIDER  active     clerk_rider_a
```

Also create scenario-specific fixtures for:

- inactive user;
- user with null/different Clerk mapping for email-collision test;
- no local row for `clerk_unmapped`;
- known `deactivatedAt` timestamp;
- safe audit reasons/request IDs.

Use only fake UUIDs and `example.test` emails.

---

## Clerk Mock Contract

Mock verification deterministically:

```text
verifyToken(token-admin-a)  => { sub: clerk_admin_a }
verifyToken(token-worker-a) => { sub: clerk_worker_a }
verifyToken(token-unmapped) => { sub: clerk_unmapped }
verifyToken(token-invalid)  => throw
```

Session cleanup mock should support:

- zero sessions;
- multiple active sessions;
- pagination if final helper handles it at this layer;
- list failure;
- partial revoke failure;
- already-ended/revoked sessions.

Do not mock PropertyOS user lookup.

---

## Test Isolation Rules

Before each test:

1. restore deterministic auth-related tables/fixtures;
2. clear semantic audit events created by prior test;
3. reset Clerk mocks/counters;
4. reset fake provider cleanup behavior;
5. reset environment overrides needed per case.

Do not rely on:

```text
TEST-08 runs before TEST-09
```

Restart tests may intentionally perform multiple app instances within one test while preserving that test's DB state.

---

## Step-by-Step Execution Plan for an Intern

### Phase 0 - Baseline Existing E2E Infrastructure

Run current E2E suite before creating the file.

Record:

- command used;
- Testcontainers startup behavior;
- migrations applied;
- current failures.

### Phase 1 - Create Dedicated Spec File

Create:

```text
Backend/test/auth-hardening.e2e-spec.ts
```

Do not overload the existing large E2E file unless repository conventions strongly require it.

### Phase 2 - Configure Clerk Mode Before App Initialization

Set deterministic test environment values before importing/initializing the app:

```text
AUTH_PROVIDER=clerk
CLERK_SECRET_KEY=fake-test-secret
authorized parties/front-end URL if required
```

Restore them after the suite.

### Phase 3 - Install Clerk Module Mocks Early

Jest module mocking must occur before real provider functions are captured by imported modules.

If import order makes reliable mocking impossible, **STOP - NEEDS ARCHITECT DECISION** for a minimal provider-verifier abstraction. Do not solve it by replacing the real guard.

### Phase 4 - Start Disposable PostgreSQL

Reuse existing test setup.

Verify the DB connection string points only to disposable test infrastructure.

Apply migrations using existing test mechanism.

Do not use production seed if it introduces unrelated data; create focused fixtures.

### Phase 5 - Create Fixture Reset Helper

Write one test helper that restores the deterministic auth users/audit state.

The helper must not create hidden privileged behavior that production does not have.

### Phase 6 - Start Real Nest App

Use real `AppModule`.

Apply the same relevant production bootstrap configuration:

- global prefix;
- URI versioning;
- validation pipe;
- global guards through module registration;
- interceptors/middleware needed for request ID/audit behavior.

### Phase 7 - Prove The Guard Is Actually Active

Make the first test a no-token request to a protected route.

If it succeeds, stop. The E2E harness is invalid.

### Phase 8 - Add HTTP Helpers

Helpers may only simplify request construction, e.g.:

```text
getAs(token, path)
patchAs(token, path, body)
```

They must still set normal HTTP Authorization headers and travel through guards.

### Phase 9 - Add DB Assertion Helpers

Create test-only helpers to:

- reload user;
- count users/admins;
- query semantic audits;
- snapshot role/status/clerkUserId/org/deactivatedAt;
- count audit events for target/request.

### Phase 10 - Implement Authentication E2E Cases

Start with:

- missing token;
- invalid token;
- mapped active users;
- unmapped identity;
- email collision/no fallback;
- inactive/suspended immutability.

### Phase 11 - Implement Lifecycle HTTP Cases

Use real admin status/role endpoints and real DTO validation.

Assert DB state and semantic audit rows.

### Phase 12 - Implement Restart Persistence Case

Within one test:

1. suspend a user;
2. verify denial;
3. close app;
4. recreate app using same DB container/database;
5. retry user access;
6. verify still suspended.

Do not call fixture reset between steps.

### Phase 13 - Implement Last-Admin HTTP Cases

Exercise every supported route capable of removing active-admin state:

- status endpoint;
- role update;
- delete/deactivate alias;
- self-action if supported.

### Phase 14 - Implement Provider Failure Case

Configure Clerk session cleanup mock to fail after local suspension/deactivation.

Assert approved HTTP contract plus final DB denial state.

### Phase 15 - Implement Semantic Audit HTTP Actor Case

Promote/suspend through HTTP and query DB audit event.

Actor must equal the authenticated caller, not body input.

### Phase 16 - Implement Auth Read-Only Snapshot Case

Snapshot a mapped user's security fields.

Call protected endpoint repeatedly.

Reload and compare exact state.

### Phase 17 - Add Concurrency Case If Supported

If AUTH-009/016 claims concurrency-safe last-admin protection, execute concurrent HTTP/service mutations against the real disposable DB and assert final active-admin count >=1.

If the implementation does not claim concurrency safety yet, record a blocking architect decision instead of writing a test that cannot pass reliably.

### Phase 18 - Run Dedicated Spec Repeatedly

Run the new file multiple times to detect order/flakiness issues.

### Phase 19 - Run Full Validation

At minimum:

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
npm run test:e2e -w ired-propertyos-backend
npm run build:backend
```

Use actual repository command names if changed.

---

## Detailed E2E Test Catalog

### TEST-AUTH017-01: Protected route without token is denied

**Purpose:** Prove real global auth guard is active.

**Action:** call known protected route without auth header.

**Expected Result:** 401/approved rejection.

**Required Assertions:** no user DB state change; provider verification not called if guard fails before it.

### TEST-AUTH017-02: Malformed/non-Bearer header is denied

**Purpose:** Protect bearer parsing through real HTTP headers.

**Expected Result:** rejection; no local mutation.

### TEST-AUTH017-03: Invalid fake Clerk token is denied

**Purpose:** Verify external verifier wiring through real guard.

**Setup:** `token-invalid` causes mocked `verifyToken` to throw.

**Expected Result:** rejection; user table unchanged.

### TEST-AUTH017-04: Active mapped ADMIN reaches protected and ADMIN-only route

**Purpose:** Prevent production admin lockout from hardening.

**Required Assertions:** role/status/mapping unchanged after request.

### TEST-AUTH017-05: Active mapped WORKER authenticates but is denied ADMIN-only route

**Purpose:** Prove authentication and role authorization remain separate.

**Expected Result:** `/auth/me`/normal protected route succeeds; ADMIN-only route denied.

**Required Assertions:** WORKER is not promoted.

### TEST-AUTH017-06: Active mapped RIDER follows stored role

**Purpose:** Cover less-common current role through real app.

### TEST-AUTH017-07: Unmapped Clerk subject is denied with zero user creation

**Purpose:** Protect explicit provisioning boundary end to end.

**Setup:** no local row for `clerk_unmapped`; record user/admin counts.

**Expected Result:** reject.

**Required Assertions:** counts unchanged; no new mapping/user/admin.

### TEST-AUTH017-08: Email coincidence cannot substitute for provider-ID mapping

**Purpose:** Detect fallback outside the unit-tested guard.

**Setup:** local user with same fake email concept but null/different Clerk ID; token resolves to unmapped sub.

**Expected Result:** reject; local row not linked/modified.

### TEST-AUTH017-09: Inactive mapped user remains inactive after rejected request

**Purpose:** Catch mutation-before-error.

**Required Assertions:** role/status/clerkUserId/deactivatedAt unchanged after DB reload.

### TEST-AUTH017-10: Suspended mapped user remains suspended

**Purpose:** Protect temporary lock end to end.

**Expected Result:** reject; exact row unchanged.

### TEST-AUTH017-11: Repeated protected requests are auth-write-free

**Purpose:** Prove request-time auth is read-only in assembled app.

**Setup:** snapshot active user's role/status/clerkUserId/org/lifecycle fields.

**Action:** issue repeated protected requests.

**Expected Result:** all security fields identical afterward.

### TEST-AUTH017-12: Admin suspends worker and worker loses access immediately

**Purpose:** Validate central lifecycle workflow.

**Action:** Admin A calls real status endpoint with valid reason, then Worker A calls protected route.

**Expected Result:** suspension succeeds; worker denied.

**Required Assertions:** DB suspended + timestamp; semantic audit exists; provider cleanup mock invoked after local success.

### TEST-AUTH017-13: Suspended state survives app restart

**Purpose:** Permanently prevent old auto-reactivation/startup repair regression.

**Action:** suspend -> close app -> recreate against same DB -> retry worker.

**Expected Result:** still denied; DB still suspended.

### TEST-AUTH017-14: Explicit reactivation restores access only after admin action

**Purpose:** Validate intended restoration path.

**Action:** admin reactivates suspended worker, worker retries.

**Expected Result:** active, deactivatedAt=null, activation audit, subsequent auth succeeds.

### TEST-AUTH017-15: Deactivation denies access and persists

**Purpose:** Cover permanent non-active path separately from suspension.

### TEST-AUTH017-16: Sole active admin cannot suspend themselves

**Purpose:** Protect lockout boundary through controller/HTTP wiring.

**Required Assertions:** HTTP rejects; DB unchanged; no success audit; no provider cleanup.

### TEST-AUTH017-17: Sole active admin cannot deactivate themselves

**Purpose:** Same for inactive transition.

### TEST-AUTH017-18: Sole active admin cannot demote themselves

**Purpose:** Protect role-based lockout path.

### TEST-AUTH017-19: Delete/deactivate route cannot bypass last-admin protection

**Purpose:** Test alternate convenience endpoint.

### TEST-AUTH017-20: With two active admins, one can be safely removed

**Purpose:** Ensure safety does not overblock operations.

**Required Assertions:** one active admin remains; target final state/audit correct.

### TEST-AUTH017-21: Inactive/suspended second admin does not satisfy redundancy

**Purpose:** Prove HTTP path uses active-admin semantics, not raw ADMIN count.

### TEST-AUTH017-22: Required reason is enforced by real DTO/controller path

**Purpose:** Prove validation is wired, not only service-tested.

**Cases:** suspend, deactivate, ADMIN grant/revoke as supported.

**Expected Result:** missing/blank reason rejected before mutation.

### TEST-AUTH017-23: Invalid status string rejected before service mutation

**Purpose:** Protect finite state machine at HTTP boundary.

**Action:** send unsupported status.

**Expected Result:** validation error; DB/audit/provider untouched.

### TEST-AUTH017-24: Sensitive role change creates semantic audit with authenticated actor

**Purpose:** Prove `@CurrentUser`/request context wiring.

**Action:** Admin A promotes Worker A with reason.

**Required Assertions:** audit actor=A, target=Worker, old/new role, reason/request ID, no secrets.

### TEST-AUTH017-25: Client cannot spoof semantic-audit actor

**Purpose:** Protect audit integrity at external boundary.

**Action:** send malicious/extra actor field if possible.

**Expected Result:** unknown field rejected or ignored by contract; stored actor remains authenticated Admin A.

### TEST-AUTH017-26: Rejected last-admin action creates no success semantic event

**Purpose:** Audit truthfulness through full HTTP stack.

### TEST-AUTH017-27: Profile-only update creates no role/status semantic event

**Purpose:** Keep security audit high-signal end to end.

### TEST-AUTH017-28: Audit persistence failure follows mandatory atomicity contract

**Purpose:** Verify real transaction behavior if failure can be safely induced in test seam.

**Setup:** controlled test-only DB/audit failure technique without mocking service away.

**Expected Result:** user security mutation does not commit.

**If inducing failure would require unrealistic wiring, rely on AUTH-016 service test and document why rather than corrupting E2E design.**

### TEST-AUTH017-29: Clerk session cleanup failure never restores local access

**Purpose:** Highest-risk cross-system failure case.

**Setup:** provider cleanup mock fails after local access removal.

**Action:** admin suspends/deactivates worker; worker retries access.

**Expected Result:** worker remains non-active and denied according to approved partial-success HTTP contract.

### TEST-AUTH017-30: Partial session revoke still leaves local user denied

**Purpose:** Provider cleanup quality cannot affect authorization truth.

### TEST-AUTH017-31: Missing `clerkUserId` user can still be disabled locally without email fallback

**Purpose:** Broken provider mapping must not block local access removal.

**Expected Result:** status/audit commit; cleanup skipped; no provider email lookup.

### TEST-AUTH017-32: Repeated lifecycle request is idempotent according to final policy

**Purpose:** Verify retries do not rewrite timestamps/create misleading duplicate state-change audits.

### TEST-AUTH017-33: Auth logs through HTTP contain safe reason signals without fake sensitive markers

**Purpose:** Add one assembled check for AUTH-014.

**Setup:** invalid/unmapped fake tokens/identities.

**Expected Result:** safe logs; fake token/email/provider ID absent.

### TEST-AUTH017-34: Concurrent final-admin removal cannot leave zero active admins

**Purpose:** Verify real DB transaction/isolation design.

**Setup:** two active admins; launch concurrent allowed-looking operations that each remove one.

**Expected Result:** at least one fails/retries; final DB active-admin count >=1.

**Required Assertions:** no state where both committed non-active/non-admin.

**STOP:** If final architecture has not solved this race, this test becomes a rollout blocker/architect decision rather than something to disable.

### TEST-AUTH017-35: Test suite does not depend on execution order

**Purpose:** Prevent false security confidence/flakiness.

**Action:** run file repeatedly/randomized order if supported.

**Expected Result:** deterministic pass because fixtures reset each test.

---

## Manual Review of E2E Harness Before Trusting Results

A reviewer must confirm:

- `AppModule` is real;
- `JwtAuthGuard` is not overridden;
- `UsersService` is not mocked;
- Prisma points to disposable Postgres;
- Clerk is the only mocked external security boundary;
- validation pipe/global prefix/versioning match production behavior relevant to tests;
- fixture reset does not invoke privileged seed/bootstrap behavior;
- restart test truly reuses same DB state.

A green suite with the wrong harness is worse than no suite because it creates false confidence.

---

## Failure Diagnosis Guide

### No-token protected request succeeds

Stop. Your test app does not have real auth guards registered. Fix harness before any other test.

### Unmapped user is rejected but user count increases

Critical regression. Authentication is still provisioning/mutating before failure.

### Restart test passes only after fixture reseed

Invalid test. Preserve the same DB across app recreation.

### Last-admin unit tests pass but HTTP route succeeds

A controller/alternate service path bypasses centralized invariant.

### Audit actor is null/wrong

Controller is not passing authenticated context into service correctly.

### Provider failure causes 500 but DB is safely non-active

Compare with AUTH-011 approved partial-success API contract. Fix response handling, but do not reactivate the user.

### E2E requires real Clerk secret

External mocking seam is wrong. Do not put real credentials in CI.

### Concurrency test leaves zero admins intermittently

Treat as real architecture defect. Do not mark test flaky/skip without resolving transaction strategy.

---

## Reviewer Walkthrough

Reviewer should verify:

1. harness authenticity;
2. strict Clerk-ID mapping through real HTTP path;
3. no email fallback;
4. unmapped requests are write-free;
5. non-active DB state is immutable through login;
6. restart persistence works;
7. every admin-removal route respects last-admin invariant;
8. reason/DTO validation is real;
9. semantic actor/target wiring is real;
10. provider failure remains fail-closed locally;
11. audit/log privacy assertions exist at assembled level;
12. concurrency behavior matches production claim;
13. repeated runs are deterministic.

---

## PR Evidence Required

Include:

- E2E architecture diagram/list of real vs mocked components;
- test file path;
- fixture identities/roles without real PII;
- dedicated E2E command/result;
- full E2E suite result;
- unit/service suite result references;
- typecheck/lint/build results;
- restart-persistence result;
- last-admin route coverage result;
- provider-failure result;
- semantic audit actor result;
- concurrency result or explicit rollout blocker;
- confirmation no real Clerk/database credentials were used.

---

## Acceptance Criteria

- [ ] Real AppModule/global guards/controllers/services/Prisma are exercised.
- [ ] Only external Clerk boundary is mocked.
- [ ] Disposable PostgreSQL is used.
- [ ] Strict provider-ID mapping is proven through HTTP.
- [ ] Unmapped identity cannot create/link a user.
- [ ] Inactive/suspended state cannot be repaired by request or restart.
- [ ] Explicit reactivation is the only normal restoration path.
- [ ] Last-admin rule covers all real routes.
- [ ] Required reason/validation works through HTTP.
- [ ] Semantic audit actor/target/before/after is correct.
- [ ] Provider cleanup failure never restores local access.
- [ ] Auth requests remain DB-write-free for user security state.
- [ ] Concurrency guarantee is proven or blocks rollout.
- [ ] Suite is isolated and deterministic.

---

## Definition of Done

- [ ] Dedicated E2E file implemented.
- [ ] Dedicated file passes repeatedly.
- [ ] Full E2E suite passes.
- [ ] AUTH-015/016 suites pass.
- [ ] Typecheck/lint/build pass.
- [ ] No real external credentials required.
- [ ] PR evidence complete.
- [ ] Security/staff reviewer confirms harness is meaningful.
- [ ] No unresolved P0/STOP item remains before AUTH-018.

---

## Rollback

This ticket adds tests. Do not remove them because hardened code fails.

If an intentional architecture/API change invalidates an E2E expectation, update the documented architecture and dependent tickets first, then modify the test with explicit review.

---

## Forbidden Shortcuts

Do not:

- override `JwtAuthGuard` with allow-all;
- mock `UsersService`;
- mock Prisma with in-memory objects for this E2E suite;
- call real Clerk;
- use production/shared DB;
- reseed between suspension and restart assertion;
- assert only HTTP status on state-sensitive cases;
- skip concurrency failure as “flaky” if production claims safety;
- use real personal identity data;
- make tests order-dependent.

---

## STOP - NEEDS ARCHITECT DECISION

Stop if:

- Clerk cannot be mocked reliably without a small adapter abstraction;
- final provider-cleanup API response contract is undefined;
- last-admin transaction strategy does not survive real concurrency testing;
- organization-scoped admin roles change the invariant;
- app E2E bootstrap differs materially from production security wiring.

AUTH-018 production rollout must not proceed while a P0 STOP item from this suite remains unresolved.

---

## Handoff To AUTH-018

AUTH-018 may treat a green AUTH-017 as evidence that the assembled application satisfies the hardened contract in a production-like disposable environment.

It does **not** replace production identity audit/admin verification/rollback preparation. Those remain operational gates.

---

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Dedicated E2E Suite:** Pass / Fail  
**Full E2E Suite:** Pass / Fail  
**Restart Persistence:** Pass / Fail  
**Concurrency Test:** Pass / Fail / Needs Decision  
**Provider Failure Test:** Pass / Fail  
**Notes:**