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

- verifies identity;
- maps Clerk `sub` to an existing local user through `clerkUserId`;
- accepts only active users;
- never creates users;
- never reactivates users;
- never changes roles/status;
- never falls back to email;
- does not log sensitive identity/token data.

## Why This Exists

The backend currently has Jest configured with `rootDir: src` and `.*\.spec\.ts$`, but there is no dedicated `JwtAuthGuard` test file in the current repository search.

Security changes without guard-level regression coverage are easy to accidentally undo later, especially when someone is trying to fix a login problem quickly.

## Expected Files

Create:

- `Backend/src/shared/guards/jwt-auth.guard.spec.ts`

Modify production auth code only if a tiny testability refactor is required. Do not redesign auth merely to make mocking easier.

## Required Reading

1. final `Backend/src/shared/guards/jwt-auth.guard.ts` after AUTH-006/AUTH-014
2. `Backend/package.json` Jest configuration
3. `Backend/src/shared/decorators/public.decorator.ts`
4. any existing guard/service `.spec.ts` files to copy repository testing style
5. Prisma `UserRole` and `UserStatus`

## Test Strategy

Unit-test the guard without real Clerk/network/database calls.

Mock:

- `verifyToken` from `@clerk/backend`;
- `Reflector`;
- `PrismaService` user lookup;
- Nest `ExecutionContext` request/handler/class shape;
- Logger only where checking sensitive output.

Do not require real Clerk credentials for unit tests.

## Test Data Rules

Use clearly fake values only, for example:

```text
clerkUserId: user_test_123
email: sensitive@example.test
local user id: 11111111-1111-4111-8111-111111111111
```

Never use a real administrator email in test fixtures.

## Step-by-Step Implementation

### Step 1 - Inspect existing Jest style

Find at least two existing `.spec.ts` files under `Backend/src`.

Follow their:

- import style;
- mock reset pattern;
- `describe/beforeEach/afterEach` conventions;
- assertion style.

Do not add another testing library.

### Step 2 - Create the guard spec file

Create:

`Backend/src/shared/guards/jwt-auth.guard.spec.ts`

Use Jest, which is already configured.

### Step 3 - Control environment variables per test

Tests will need to set values such as:

- `AUTH_PROVIDER=clerk`;
- fake `CLERK_SECRET_KEY`;
- safe `CLERK_AUTHORIZED_PARTIES`/frontend URL as needed.

Capture original values before tests and restore them afterward so the suite does not leak environment state to other tests.

### Step 4 - Mock `verifyToken`

For success cases, return an object with a known `sub`.

For invalid-token cases, reject/throw an error.

Do not test Clerk's cryptography; test how PropertyOS responds to the SDK result.

### Step 5 - Build a reusable fake ExecutionContext

The fake request should support what the guard reads:

- headers.authorization;
- originalUrl/url;
- requestId if used;
- mutable `request.user`.

The fake context must also provide handler/class values for Reflector calls.

Keep the helper local to the spec unless other tests genuinely reuse it.

### Step 6 - Mock public-route metadata

Test both:

- route marked public -> guard returns true without Clerk/DB work;
- protected route -> Clerk auth path executes.

### Step 7 - Test missing bearer token

Protected Clerk route with no Authorization header.

Expected:

- `UnauthorizedException`;
- `verifyToken` not called;
- Prisma user lookup not called;
- no user writes.

### Step 8 - Test malformed/non-Bearer header

Use a header that does not begin with `Bearer `.

Expected same as missing token.

### Step 9 - Test missing Clerk configuration

Set `AUTH_PROVIDER=clerk` but remove `CLERK_SECRET_KEY`.

Expected:

- request rejected;
- no DB lookup/write.

### Step 10 - Test invalid Clerk token

Mock `verifyToken` to reject.

Expected:

- Unauthorized;
- no DB lookup/write after failed verification;
- logs contain safe reason code, not raw fake token.

### Step 11 - Test mapped active ADMIN

Mock:

- verified `sub=user_test_admin`;
- Prisma lookup by `clerkUserId=user_test_admin` returns active ADMIN.

Expected:

- guard returns true;
- `request.user` equals/stores the local user;
- role stays ADMIN;
- status stays active;
- no user create/update.

### Step 12 - Repeat successful mapping for WORKER and RIDER

These tests prove the guard does not have admin-specific success logic.

### Step 13 - Test unknown Clerk ID

Verified token succeeds, but Prisma lookup returns null.

Expected:

- request rejected;
- no email lookup fallback;
- no create;
- no update.

### Step 14 - Test email-collision regression

Set up mocks so a local user could theoretically have the same email, but the verified Clerk ID is not mapped.

Because the final guard should not query by email, assert:

- only `clerkUserId` lookup occurs;
- request is rejected.

Do not mock an email query that production code no longer makes.

### Step 15 - Test inactive mapped user

Expected:

- denied;
- status remains inactive;
- role unchanged;
- `deactivatedAt` unchanged;
- no update.

### Step 16 - Test suspended mapped user

Same immutable behavior.

### Step 17 - Assert no privilege writes

Across successful and failed cases, explicitly assert relevant mocked Prisma methods are not called:

- `user.create`;
- `user.update` for role/status/identity linking;
- `user.upsert`.

If the Prisma mock only exposes methods actually used, add spies specifically so a future regression calling them fails the test.

### Step 18 - Test authorized parties input

When configured, verify `verifyToken` is called with the expected secret/authorized parties shape.

Do not assert secret values are logged.

### Step 19 - Test safe logging

Use known fake sensitive strings:

- token: `super-secret-test-token`;
- email: `sensitive@example.test`;
- Clerk ID: `user_sensitive_test`.

Capture relevant logger calls and assert the token/email/provider ID are absent where AUTH-014 requires them to be absent.

Prefer asserting reason codes are present instead of exact whole log strings.

### Step 20 - Run only the new test first

From root, use a targeted Jest invocation through the backend workspace or run the backend test command with the spec path.

Then run the full backend suite.

### Step 21 - Run full validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

Optionally:

```bash
npm run test:cov -w ired-propertyos-backend
```

Review coverage for the guard; do not chase 100% coverage by writing meaningless assertions.

## Required Test Matrix

| Scenario | Expected | DB writes |
|---|---|---:|
| Public route | allowed | 0 |
| Missing token | 401/rejected | 0 |
| Invalid token | 401/rejected | 0 |
| Missing Clerk config | rejected | 0 |
| Active mapped ADMIN | allowed | 0 |
| Active mapped WORKER | allowed | 0 |
| Active mapped RIDER | allowed | 0 |
| Unknown Clerk ID | rejected | 0 |
| Email matches but Clerk ID not mapped | rejected | 0 |
| Inactive mapped user | rejected | 0 |
| Suspended mapped user | rejected | 0 |
| Former privileged email with no mapping | rejected | 0 |

## Checkpoint

- [ ] Every security-relevant branch has a test.
- [ ] Tests use provider ID mapping, not email mapping.
- [ ] Tests prove no user create/update during auth.
- [ ] Inactive/suspended immutability is asserted.
- [ ] Sensitive-log regression is covered.
- [ ] Tests use only fake identities/secrets.

## Acceptance Criteria

- [ ] `jwt-auth.guard.spec.ts` exists under `Backend/src`.
- [ ] Required matrix is implemented.
- [ ] No real Clerk API calls occur in unit tests.
- [ ] No real secrets are required.
- [ ] Tests fail if email fallback, auto-provisioning, or auto-reactivation is reintroduced.
- [ ] Full backend unit suite passes.

## Definition of Done

- [ ] Test file complete.
- [ ] Targeted test passes.
- [ ] Full backend tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Coverage reviewed for guard branches.
- [ ] Reviewer verifies assertions test behavior rather than implementation trivia.

## Rollback

Do not remove security regression tests merely because a future refactor breaks them. Update tests to the newly approved architecture while preserving the security invariants.

## Forbidden Shortcuts

Do not:

- skip difficult cases;
- call real Clerk from unit tests;
- use the former real privileged email as fixture data;
- mock the guard method being tested instead of its dependencies;
- delete assertions that detect DB writes;
- use snapshot-only tests for security behavior;
- lower Jest/lint/typecheck standards to make the suite pass.

## STOP - NEEDS ARCHITECT DECISION

Stop if the final authentication design after preceding tickets differs materially from the provider-ID flow described here. Update this ticket architecture before writing tests; do not encode obsolete behavior just because the ticket was created earlier.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Guard Coverage:**  
**Notes:**