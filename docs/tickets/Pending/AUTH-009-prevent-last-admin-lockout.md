# AUTH-009: Prevent Last-Administrator Demotion or Deactivation

**Status:** Pending  
**Priority:** P0  
**Area:** Authorization / User Administration  
**Complexity:** Medium  
**Depends On:** AUTH-003, AUTH-008  
**Blocks:** AUTH-010, AUTH-016, AUTH-017  
**Primary File:** `Backend/src/modules/users/users.service.ts`

## Objective

Prevent normal user-management operations from leaving PropertyOS with zero active administrators.

After this ticket, the backend must reject any operation that would demote, suspend, or deactivate the final active `ADMIN`.

## Why This Exists

Removing automatic master-admin recovery is correct, but it also means the application must protect itself from accidental administrative lockout.

The current `UsersService.updateStatus()` and `UsersService.update()` can change administrator status/role. The `DELETE /users/:id` controller route also maps to setting the target user inactive.

The invariant must be enforced in backend business logic, not only in the UI.

## Security Invariant

At the end of every ordinary user-administration transaction:

```text
count(users where role = ADMIN and status = active) >= 1
```

This ticket applies to normal application operations. It does not define emergency production recovery.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts` only if actor/self information is required by implementation
- `Backend/src/modules/users/dto/users.schema.ts` only if response/error contracts need a documented field
- user service tests

No Prisma schema migration should be necessary.

## Required Reading

1. `Backend/src/modules/users/users.service.ts`
2. `Backend/src/modules/users/users.controller.ts`
3. `Backend/src/modules/users/dto/users.schema.ts`
4. Prisma `UserRole` and `UserStatus` enums
5. `Backend/src/shared/guards/roles.guard.ts`

Understand all routes that can change a user's `role` or `status`.

## Target Behavior

Examples:

```text
1 active ADMIN exists
 -> attempt ADMIN -> WORKER
 -> reject
```

```text
1 active ADMIN exists
 -> attempt active -> inactive
 -> reject
```

```text
1 active ADMIN exists
 -> attempt active -> suspended
 -> reject
```

```text
2 active ADMINs exist
 -> deactivate one
 -> allow
 -> 1 active ADMIN remains
```

## Architecture Contract

The invariant belongs in the service/domain layer so every controller/API path gets the same protection.

Do not rely on:

- frontend button disabling;
- controller-only checks;
- a count performed minutes earlier;
- client-provided role counts.

The check and mutation must be protected from obvious race conditions.

## Step-by-Step Implementation

### Step 1 - Inventory every privilege-removal path

Search `Backend/src/modules/users/` for:

- `role` updates;
- `status` updates;
- `updateStatus`;
- `update(`;
- `deactivate`;
- delete routes.

Create a short list in the PR description.

### Step 2 - Define when a change can reduce active-admin count

A target user currently contributes to the active-admin count only when:

```text
role === ADMIN && status === active
```

A requested update is dangerous when that true condition becomes false.

Examples:

- role ADMIN -> WORKER/RIDER;
- status active -> inactive;
- status active -> suspended;
- combined role/status update causing the same result.

A name/mobile/email change is not dangerous.

### Step 3 - Centralize the invariant check

Inside `UsersService`, add a private/helper method with a clear purpose, for example conceptually:

`assertCanRemoveActiveAdmin(targetUser, requestedChanges)`

Exact name may follow repository conventions.

The helper should return immediately if the target is not an active admin or the requested change does not remove active-admin status.

### Step 4 - Count other active administrators

When the operation would remove an active admin, count **other** active admins.

Use a query equivalent to:

```text
role = ADMIN
status = active
id != targetUser.id
```

If count is zero, reject.

Use a stable backend error message/code such as `CANNOT_REMOVE_LAST_ACTIVE_ADMIN` if the project's error framework supports codes.

### Step 5 - Protect `updateStatus()`

Before changing status:

1. load target user;
2. if active ADMIN and new status is not active, run last-admin check;
3. if no other active admin, reject;
4. otherwise update normally.

### Step 6 - Protect generic `update()`

Because `update()` accepts both role and status, compute the **resulting** role/status after applying the requested partial update.

Do not check only `data.role` or only `data.status`.

Example:

```text
current role=ADMIN, status=active
data={ fullName: ... }
result remains active ADMIN -> safe
```

```text
current role=ADMIN, status=active
data={ role: WORKER }
result not active ADMIN -> check required
```

### Step 7 - Protect DELETE/deactivate path indirectly through service

The controller's delete/deactivate route should continue to call the protected service method.

Do not duplicate the invariant in the controller.

### Step 8 - Consider transaction/race safety

Two admins could theoretically deactivate each other concurrently.

Use the simplest repository-compatible strategy that makes the count-and-update atomic enough for this system, preferably a Prisma transaction with appropriate checks.

If the current database/isolation setup cannot guarantee the invariant under concurrent writes without a more advanced mechanism, document the residual risk and escalate rather than pretending it is impossible.

### Step 9 - Do not auto-create a replacement admin

If the final-admin operation is rejected, return an error. Do not automatically promote another worker.

### Step 10 - Add tests

Use service-level tests with mocked or test Prisma behavior.

Cover all cases below.

### Step 11 - Run validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Tests Required

### Test 1 - only active admin cannot be deactivated

Expected: rejection; DB update not executed.

### Test 2 - only active admin cannot be suspended

Expected: rejection.

### Test 3 - only active admin cannot be demoted to WORKER

Expected: rejection.

### Test 4 - only active admin cannot be demoted to RIDER

Expected: rejection.

### Test 5 - non-security profile update on only admin

Expected: allowed.

### Test 6 - two active admins, deactivate one

Expected: allowed; one active admin remains.

### Test 7 - active admin plus inactive admin

Deactivating active admin should still be rejected because the other admin is not active.

### Test 8 - active admin plus suspended admin

Same: reject.

### Test 9 - worker status changes

Normal worker activation/deactivation behavior remains unchanged.

### Test 10 - combined role/status update

Ensure resulting-state logic works.

## Manual Verification

Use a disposable/local DB:

1. create Admin A active;
2. verify Admin A is the only active admin;
3. try deactivate A -> rejected;
4. try suspend A -> rejected;
5. try demote A -> rejected;
6. create Admin B active;
7. deactivate B -> allowed;
8. verify A remains active;
9. reactivate B through the explicit workflow;
10. demote B -> allowed;
11. verify A remains active.

## Acceptance Criteria

- [ ] Backend prevents zero active admins.
- [ ] Protection covers status and role changes.
- [ ] Protection covers the delete/deactivate API path.
- [ ] Frontend cannot bypass the invariant by calling another endpoint.
- [ ] Non-admin user lifecycle behavior remains unaffected.
- [ ] Tests cover one-admin and two-admin scenarios.

## Definition of Done

- [ ] Service invariant implemented.
- [ ] Relevant tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual verification passes.
- [ ] Reviewer checks concurrency reasoning.
- [ ] Error behavior is documented.

## Rollback

This is a safety invariant. If it causes a legitimate administrative operation to fail, fix the rule or data state. Do not remove the protection without a replacement lockout-prevention mechanism.

## Forbidden Shortcuts

Do not:

- check only in frontend;
- check only in controller;
- count all admins regardless of status;
- auto-promote a worker;
- reactivate an inactive admin automatically;
- allow bypass via `DELETE`;
- catch the invariant error and continue with update.

## STOP - NEEDS ARCHITECT DECISION

Stop if the product introduces organization-scoped administrators and the invariant needs to be "one active admin per organization" rather than one globally. The current role model is coarse; changing the boundary requires an explicit tenant/role architecture decision.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**