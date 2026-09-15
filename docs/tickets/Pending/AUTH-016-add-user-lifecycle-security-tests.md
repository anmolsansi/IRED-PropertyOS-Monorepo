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
- accidentally bypass lifecycle transition rules;
- reactivate users implicitly;
- lose the semantic audit trail for sensitive changes;
- roll a local suspension/deactivation back when Clerk session cleanup fails.

## Why This Exists

`UsersService` owns high-risk operations such as:

- inviting users;
- updating role;
- updating status;
- assigning geography;
- resetting passwords;
- deactivation;
- unit reassignment.

After the auth-hardening work, the service also owns explicit lifecycle rules, last-admin safety, session cleanup, and semantic auditing. These rules need direct tests independent of HTTP/controller behavior.

## Expected Files

Create/update:

- `Backend/src/modules/users/users.service.spec.ts`

Potentially add small test helpers/fixtures under existing backend test conventions if repeated setup becomes excessive. Do not build a new testing framework.

## Required Reading

1. final `Backend/src/modules/users/users.service.ts`
2. `Backend/src/modules/users/users.controller.ts`
3. `Backend/src/modules/users/dto/users.schema.ts`
4. AUTH-009, AUTH-010, AUTH-011, AUTH-012 completed implementations
5. existing service `.spec.ts` files for mocking style
6. Prisma User/AuditEvent models

## Test Boundary

These are **service unit tests**.

Mock external/infrastructure dependencies:

- `PrismaService`;
- `MailService`;
- Clerk client/session methods;
- time where stable timestamp assertions are needed.

Do not call:

- production database;
- real Clerk;
- real SMTP;
- real Render/Vercel services.

AUTH-017 handles HTTP-level E2E regression.

## Fixture Rules

Create clear fake users, for example:

- `adminA`: active ADMIN;
- `adminB`: active ADMIN;
- `workerA`: active WORKER;
- `workerB`: suspended WORKER;
- `riderA`: active RIDER.

Use fake UUIDs and `example.test` email addresses.

Keep fixtures small and explicit. Avoid giant production-like objects when the service only reads a few fields.

## Step-by-Step Implementation

### Step 1 - Create the spec skeleton

Create:

`Backend/src/modules/users/users.service.spec.ts`

Set up fresh mocks in `beforeEach`.

Reset Jest mocks after each test so call assertions do not leak across scenarios.

### Step 2 - Mock Prisma methods used by lifecycle operations

Include only the methods needed by tested paths, likely including:

- `user.findUnique`;
- `user.count`;
- `user.update`;
- `user.create` where invite tests are included;
- `auditEvent.create`;
- transaction method if lifecycle logic is transactional.

If implementation uses `$transaction`, mock it in a way that still exercises the service's actual decision logic rather than bypassing it entirely.

### Step 3 - Mock Clerk session behavior

Mock current implementation for:

- user/session lookup as required;
- `sessions.getSessionList`;
- `sessions.revokeSession`.

Never require real `CLERK_SECRET_KEY` beyond a fake test string.

### Step 4 - Test final-admin deactivation rejection

Given Admin A is the only active admin:

- target Admin A;
- request status `inactive`.

Expected:

- service rejects with the approved error;
- `user.update` not called for deactivation;
- Clerk revocation not called;
- no success semantic audit event.

### Step 5 - Test final-admin suspension rejection

Same setup, target `suspended`.

Expected same protection.

### Step 6 - Test final-admin role demotion rejection

Admin A active, no other active admin.

Attempt:

- ADMIN -> WORKER;
- ADMIN -> RIDER.

Both rejected.

### Step 7 - Test protection counts only active admins

Cases:

- Admin A active + Admin B inactive -> A cannot be removed;
- Admin A active + Admin B suspended -> A cannot be removed;
- Admin A active + Admin B active -> one may be removed.

This catches the common bug of counting all `ADMIN` rows regardless of status.

### Step 8 - Test active worker suspension

Expected:

- status becomes suspended;
- `deactivatedAt` is set;
- Clerk session cleanup starts if mapped;
- semantic audit event is recorded.

### Step 9 - Test worker deactivation

Same requirements, final status inactive.

### Step 10 - Test explicit reactivation

Suspended/inactive worker -> active.

Expected:

- status active;
- `deactivatedAt` null;
- no session revocation;
- activation semantic audit.

This is the only normal path in this test suite that restores active status.

### Step 11 - Test no implicit reactivation

Call ordinary profile update, role-neutral update, or another non-lifecycle method for inactive/suspended user.

Expected status remains unchanged.

### Step 12 - Test provider cleanup failure semantics

Mock local user update success, then make Clerk session listing/revocation throw.

Expected:

- service result/error follows AUTH-011 contract;
- local user remains suspended/inactive;
- no code changes local status back to active.

If implementation records cleanup failure, assert that safe signal.

### Step 13 - Test multi-session cleanup

Mock multiple Clerk sessions.

Expected every relevant session is attempted.

If one revocation fails, assert remaining sessions are still attempted according to AUTH-011 design.

### Step 14 - Test missing `clerkUserId`

Suspend/deactivate an otherwise valid worker with no provider mapping.

Expected:

- local status changes;
- provider cleanup skipped safely;
- warning/cleanup result is safe;
- no email-based provider lookup fallback.

### Step 15 - Test semantic audit for role elevation

WORKER -> ADMIN with required reason/context.

Expected audit contains:

- actor user ID;
- target user ID;
- previous role WORKER;
- new role ADMIN;
- approved reason field if required.

### Step 16 - Test semantic audit for demotion

With two active admins, demote Admin B to WORKER.

Expected:

- allowed;
- audit old/new values correct;
- one active admin remains.

### Step 17 - Test status audit events

Cover:

- active -> suspended;
- active -> inactive;
- suspended/inactive -> active.

Assert event type/metadata according to AUTH-012's chosen taxonomy.

### Step 18 - Test audit actor cannot be spoofed

If service receives actor context from controller, verify it uses the method/context argument, not any target DTO field claiming to be actor.

If DTO rejects unknown fields through Zod/ValidationPipe at controller level, service test still should not expose an actor override property.

### Step 19 - Test reason validation where owned by service

If reason is required for sensitive actions:

- valid reason -> success;
- blank/whitespace reason -> reject;
- missing reason -> reject where required.

DTO-only validation can be covered at controller/E2E level instead; do not duplicate responsibility unnecessarily.

### Step 20 - Test ordinary updates do not generate false security events

Change only:

- full name;
- mobile number;

Expected:

- no role/status semantic security event.

Generic request audit is outside this service unit test.

### Step 21 - Test invite behavior remains explicit

At minimum ensure invite still creates the requested role/status through the explicit admin service path and does not depend on JwtAuthGuard auto-provisioning.

If invite creates Clerk users, mock that dependency.

### Step 22 - Run targeted tests

Run the new spec alone first.

Fix behavior, not assertions, when a real security invariant fails.

### Step 23 - Run full backend validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Required Test Matrix

| Scenario | Expected |
|---|---|
| Only active ADMIN -> inactive | reject |
| Only active ADMIN -> suspended | reject |
| Only active ADMIN -> WORKER | reject |
| Two active ADMINs -> deactivate one | allow |
| Active + inactive ADMIN -> deactivate active | reject |
| Worker active -> suspended | allow + session cleanup + audit |
| Worker active -> inactive | allow + session cleanup + audit |
| Worker suspended -> active | allow + activation audit |
| Clerk cleanup failure | local access remains removed |
| Missing Clerk ID | local status changes, provider cleanup skipped |
| WORKER -> ADMIN | allow for authorized admin + audit |
| ADMIN -> WORKER with another admin | allow + audit |
| Profile-only update | no security semantic event |

## Checkpoint

- [ ] Last-admin rules have direct service tests.
- [ ] Every lifecycle transition has direct tests.
- [ ] Session cleanup failure is tested.
- [ ] Audit old/new values are tested.
- [ ] No test calls real Clerk or SMTP.
- [ ] Test fixtures use fake identities only.

## Acceptance Criteria

- [ ] `users.service.spec.ts` exists.
- [ ] Required matrix is implemented.
- [ ] Tests fail if last-admin protection is removed.
- [ ] Tests fail if implicit reactivation is introduced.
- [ ] Tests fail if local suspension is rolled back on Clerk failure.
- [ ] Tests fail if semantic security auditing disappears.
- [ ] Full backend test suite passes.

## Definition of Done

- [ ] Targeted service suite passes.
- [ ] Full backend tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Reviewer checks security assertions.
- [ ] No real external services are required by the suite.

## Rollback

Do not delete these tests because implementation changes. Update them only when an approved lifecycle/security contract changes, and preserve equivalent coverage.

## Forbidden Shortcuts

Do not:

- mock `UsersService` itself;
- assert only that methods were called without checking security outcomes;
- remove last-admin tests to simplify mocks;
- make provider failure tests expect reactivation;
- use real Clerk credentials;
- mark tests skipped in committed code without explicit reviewer approval.

## STOP - NEEDS ARCHITECT DECISION

Stop if AUTH-009 through AUTH-012 were implemented with materially different lifecycle/audit semantics. Reconcile the ticket with the approved implementation before encoding contradictory tests.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**UsersService Coverage:**  
**Notes:**