# AUTH-017: Add Authentication Hardening End-to-End Regression Suite

**Status:** Pending  
**Priority:** P0  
**Area:** Testing / Authentication / Security  
**Complexity:** Medium-High  
**Depends On:** AUTH-006, AUTH-009, AUTH-010, AUTH-011, AUTH-012, AUTH-015, AUTH-016  
**Blocks:** AUTH-018 production rollout  
**Primary New File:** `Backend/test/auth-hardening.e2e-spec.ts`

## Objective

Add HTTP-level regression tests proving the complete hardened authentication and user-lifecycle behavior works when NestJS guards, controllers, services, Prisma, and the test database are wired together.

Unit tests prove individual components. This ticket proves that the assembled application does not accidentally bypass those components.

## Why This Exists

The current backend E2E suite (`Backend/test/app.e2e-spec.ts`) primarily exercises the legacy PropertyOS email/password + OTP + JWT flow. Production Render configuration uses Clerk auth.

The security work in AUTH-001 through AUTH-016 specifically changes the Clerk request path and administrator lifecycle. It therefore needs a focused E2E suite that runs the real Nest app with a real disposable database while mocking only the external Clerk boundary.

## Test Architecture

Create a dedicated file:

`Backend/test/auth-hardening.e2e-spec.ts`

Use:

- real `AppModule`;
- real Nest guards/controllers/services;
- real disposable PostgreSQL/Testcontainers setup already used by backend E2E;
- fake test users stored in that disposable DB;
- mocked Clerk SDK boundary (`verifyToken` and provider session operations);
- Supertest HTTP requests.

Do **not** call real Clerk in CI.

## Required Reading

1. `Backend/test/app.e2e-spec.ts`
2. `Backend/test/setup.ts`
3. `Backend/test/jest-e2e.json`
4. final `Backend/src/shared/guards/jwt-auth.guard.ts`
5. final UsersService lifecycle implementation
6. AUTH-015 and AUTH-016 test fixtures/invariants

## Important Existing Test Detail

The backend E2E Jest config uses:

- root `Backend/test`;
- regex matching `*.e2e-spec.ts`.

A new `auth-hardening.e2e-spec.ts` should therefore be discovered automatically by `npm run test:e2e -w ired-propertyos-backend`.

## External Boundary Mocking

The E2E suite must mock Clerk, not the PropertyOS guard.

That means:

- use the actual `JwtAuthGuard`;
- mock `verifyToken(token, options)` so test bearer tokens resolve to deterministic Clerk `sub` values;
- mock `createClerkClient()` only for operations still required by user lifecycle, such as session listing/revocation.

Do **not** override `JwtAuthGuard` with a fake guard. That would skip the code this suite is supposed to protect.

## Test Identity Design

Use simple bearer tokens whose mapping is obvious inside the test mock, for example:

```text
token-admin-a -> clerk_admin_a
token-admin-b -> clerk_admin_b
token-worker-a -> clerk_worker_a
token-worker-b -> clerk_worker_b
token-unmapped -> clerk_unmapped
token-invalid -> throws
```

The strings are test-only and not cryptographic tokens.

Seed matching local users with `clerkUserId` for all mapped identities.

## Step-by-Step Implementation

### Step 1 - Create the dedicated E2E file

Create:

`Backend/test/auth-hardening.e2e-spec.ts`

Do not overload the already-large `app.e2e-spec.ts` unless the repository owner explicitly prefers one file.

### Step 2 - Set Clerk auth mode for this suite

Before the application module initializes, set test environment values required for Clerk mode:

- `AUTH_PROVIDER=clerk`;
- fake `CLERK_SECRET_KEY`;
- safe test authorized-party/frontend URL if required.

Capture and restore environment values after the suite.

### Step 3 - Mock Clerk module before app initialization

Mock the external module so:

- `verifyToken()` returns a `{ sub }` based on the incoming fake bearer token;
- invalid test token throws;
- `createClerkClient()` returns controlled mocks for session operations required by AUTH-011.

Make sure the Jest mock is established early enough that `AppModule`/guard imports use it.

If module-hoisting/import order prevents this, stop and solve the test seam cleanly; do not replace the real guard with a fake.

### Step 4 - Start disposable infrastructure

Reuse `setupTestContainers()` / `teardownTestContainers()` from `Backend/test/setup.ts` unless that helper cannot support a second E2E file safely.

Do not point E2E tests at developer or production databases.

### Step 5 - Seed dedicated auth-hardening users

Create deterministic test users directly in the disposable DB or through a dedicated test seed helper:

- Admin A: ADMIN, active, mapped to `clerk_admin_a`;
- Admin B: ADMIN, active, mapped to `clerk_admin_b`;
- Worker A: WORKER, active, mapped to `clerk_worker_a`;
- Worker B: WORKER, suspended or inactive as needed, mapped to `clerk_worker_b`.

Use unique fake emails under `example.test`.

Do not rely on the legacy `admin@test.com` password user for Clerk-path assertions.

### Step 6 - Add helper for authenticated requests

Use Supertest and set:

```text
Authorization: Bearer <fake-token>
```

Do not create a helper that bypasses the HTTP guard.

### Step 7 - Test protected route with no token

Call a protected endpoint such as `/api/v1/auth/me`.

Expected: 401/rejected.

### Step 8 - Test invalid token

Use `token-invalid`.

Expected:

- rejected;
- no user DB mutation.

### Step 9 - Test active mapped user

Use `token-worker-a` or admin token.

Expected:

- protected route succeeds;
- response represents the mapped local PropertyOS user;
- role/status remain unchanged.

### Step 10 - Test unknown Clerk mapping

Use `token-unmapped` whose `sub` has no local row.

Expected:

- rejected;
- user count unchanged;
- no new ADMIN/other user created.

### Step 11 - Test former-email-fallback behavior indirectly

If useful, create a local record/email fixture resembling the old scenario but with no matching provider ID.

Expected strict provider-ID behavior: email coincidence does not grant access.

Never use a real personal email in test data.

### Step 12 - Test inactive and suspended mapped users

For each state:

1. attempt protected request;
2. expect rejection;
3. reload DB row;
4. confirm status unchanged;
5. confirm role unchanged;
6. confirm `deactivatedAt` unchanged where relevant.

### Step 13 - Test explicit suspension through HTTP

As Admin A, call the real user-status API to suspend Worker A.

Expected:

- success;
- DB status suspended;
- semantic audit event exists;
- Clerk session revocation mock called for `clerk_worker_a`;
- subsequent Worker A protected request rejected.

If AUTH-012 requires a reason, include it.

### Step 14 - Test backend restart persistence

After suspending a user:

1. close the Nest app without destroying the test DB;
2. recreate/reinitialize the app against the same disposable DB;
3. attempt Worker A request again;
4. verify still denied;
5. verify DB still suspended.

This directly protects against the old login-time auto-reactivation class of bug.

### Step 15 - Test explicit reactivation

As Admin A, reactivate Worker A through the real API.

Expected:

- status active;
- `deactivatedAt` null;
- activation audit exists;
- Worker A can access protected route again with mapped token.

### Step 16 - Test final-admin protection through HTTP

Arrange only Admin A as active admin (Admin B inactive/suspended).

Attempt as Admin A to:

- deactivate Admin A;
- suspend Admin A;
- demote Admin A through the supported API.

Expected each forbidden operation to fail and Admin A remain active ADMIN.

### Step 17 - Test two-admin behavior

Reactivate Admin B so two active admins exist.

Deactivate or demote Admin B.

Expected: operation succeeds and Admin A remains active.

### Step 18 - Test session-revocation failure

Configure Clerk session mock to fail for a worker.

Suspend/deactivate worker through HTTP.

Expected:

- local status is non-active;
- subsequent PropertyOS API request is denied;
- provider cleanup failure does not restore local access.

### Step 19 - Test semantic audit via API/database

For one role change and one status change, query audit records from DB or real audit API if appropriate.

Assert:

- actor = Admin A;
- entity = target user;
- old/new values correct;
- no secret/token content in metadata.

### Step 20 - Test zero auth-time writes

Capture target row timestamps/fields where practical before and after repeated successful authentication calls.

At minimum assert role/status/clerkUserId do not change simply because `/auth/me` is called repeatedly.

### Step 21 - Clean up between tests

Use deterministic reset/transactions/fixtures so tests do not depend on execution order.

If a test intentionally changes Admin B status, restore or reseed before the next scenario.

### Step 22 - Run focused E2E suite

Run the new file alone first using Jest E2E config/path filtering.

Then run all backend E2E tests:

```bash
npm run test:e2e -w ired-propertyos-backend
```

### Step 23 - Run full validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
npm run test:e2e -w ired-propertyos-backend
npm run build:backend
```

## Required E2E Matrix

| Scenario | Expected |
|---|---|
| No token | denied |
| Invalid Clerk token | denied |
| Active mapped user | allowed |
| Unmapped Clerk sub | denied, zero user creation |
| Email coincidence without ID mapping | denied |
| Inactive mapped user | denied, remains inactive |
| Suspended mapped user | denied, remains suspended |
| Admin suspends worker | worker immediately denied |
| Restart after suspension | worker still denied |
| Explicit reactivation | worker allowed again |
| Last active admin deactivation | rejected |
| Last active admin suspension | rejected |
| Last active admin demotion | rejected |
| Two admins, remove one | allowed |
| Clerk session cleanup fails | local access still denied |
| Security-sensitive change | semantic audit created |

## Checkpoint

- [ ] Real JwtAuthGuard is used.
- [ ] Only external Clerk boundary is mocked.
- [ ] Real controllers/services/Prisma test DB are used.
- [ ] Restart persistence scenario passes.
- [ ] Last-admin API behavior passes.
- [ ] Audit/session cleanup behavior is exercised.

## Acceptance Criteria

- [ ] Dedicated auth-hardening E2E file exists.
- [ ] No real Clerk/network secrets required.
- [ ] No production DB required.
- [ ] Required matrix passes.
- [ ] Suite catches reintroduction of auto-provisioning/auto-reactivation/email fallback.
- [ ] Existing E2E suite still passes.

## Definition of Done

- [ ] New E2E suite passes locally/CI-capable environment.
- [ ] Existing E2E suite passes.
- [ ] Unit tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Backend build passes.
- [ ] Reviewer confirms the real guard is not bypassed.

## Rollback

Do not remove the E2E suite merely because it exposes a regression. Fix the product behavior or update the suite only after an approved architecture change.

## Forbidden Shortcuts

Do not:

- override JwtAuthGuard with an allow-all test guard;
- call real Clerk in CI;
- use production credentials/database;
- rely on test execution order;
- skip restart-persistence test;
- assert only status codes without checking DB security state;
- mark security scenarios `.skip` to get CI green.

## STOP - NEEDS ARCHITECT DECISION

Stop if the test environment cannot initialize Clerk-mode AppModule without substantial production-code changes. Propose a minimal dependency-injection seam for token verification rather than bypassing the guard or making live external calls.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**E2E Result:**  
**Notes:**