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

## Junior Engineer Orientation

Removing the magical master-admin recovery path is correct, but it creates a new operational responsibility: the normal application must not let an administrator accidentally remove the final administrator.

Think of the invariant as a database safety rule:

```text
After any ordinary user-management operation,
there must still be >= 1 user where:
role = ADMIN AND status = active
```

This rule belongs in backend service/domain logic. A disabled frontend button is not enough because an API caller, old frontend build, script, or future endpoint could still call the backend directly.

You are not creating a new admin automatically. If the operation would remove the last active admin, the correct behavior is to **reject the operation**.

## Why This Exists

The current `UsersService.updateStatus()` and `UsersService.update()` can change administrator status/role. The `DELETE /users/:id` controller route also maps to setting the target user inactive.

Once AUTH-003 removes automatic admin reactivation, an accidental final-admin status/role change could lock everyone out of administration.

## Security Invariant

At the end of every ordinary user-administration transaction:

```text
count(users where role = ADMIN and status = active) >= 1
```

This applies to ordinary product operations. It does not define emergency production recovery.

### What counts as removing an active admin?

A target currently contributes to the count only when:

```text
current.role = ADMIN
AND
current.status = active
```

A requested change removes that contribution if resulting state is anything other than active ADMIN, for example:

- ADMIN -> WORKER;
- ADMIN -> RIDER;
- active -> inactive;
- active -> suspended;
- combined update that changes both fields;
- delete/deactivate route that ultimately sets inactive.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts` only if actor/self information is required by implementation
- `Backend/src/modules/users/dto/users.schema.ts` only if error/API contract changes require it
- user service tests

No Prisma schema migration should be necessary.

## Required Reading

1. `Backend/src/modules/users/users.service.ts`
2. `Backend/src/modules/users/users.controller.ts`
3. `Backend/src/modules/users/dto/users.schema.ts`
4. Prisma `UserRole` and `UserStatus` enums
5. `Backend/src/shared/guards/roles.guard.ts`
6. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before editing, list **every production path** that can change `User.role` or `User.status`.

## Target Behavior Examples

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

```text
1 active ADMIN + 1 inactive ADMIN
 -> deactivate/demote active ADMIN
 -> reject
```

The inactive admin does not count as an available administrator.

## Architecture Contract

The invariant belongs in the service/domain layer so every controller/API path gets the same protection.

Do not rely on:

- frontend button disabling;
- controller-only checks;
- a count performed long before mutation;
- client-provided role counts;
- auto-promoting another worker;
- login-time recovery.

The check and mutation must be protected from obvious race conditions as far as practical with the current Prisma/PostgreSQL architecture.

## Step-by-Step Implementation

### Step 1 - Inventory every privilege-removal path

Search `Backend/src/modules/users/` and repository-wide for:

- role updates;
- status updates;
- `updateStatus`;
- `update(`;
- deactivate/delete routes;
- any direct `prisma.user.update` outside `UsersService` that can change role/status.

Create a short list in the PR description.

**Why:** The invariant is useless if one endpoint bypasses it.

### Step 2 - Model current and resulting authorization state

For a partial update, calculate:

```text
resultingRole = data.role ?? current.role
resultingStatus = data.status ?? current.status
```

Then compare:

```text
currentIsActiveAdmin
resultingIsActiveAdmin
```

A last-admin check is required only when current is active admin and resulting is not.

### Step 3 - Centralize the invariant check

Inside `UsersService`, add/reuse one helper with a clear purpose, conceptually:

`assertCanRemoveActiveAdmin(targetUser, requestedChanges)`

Do not duplicate slightly different last-admin logic in `update()`, `updateStatus()`, and controller routes.

### Step 4 - Count other active administrators

When the operation would remove an active admin, count **other** active admins:

```text
role = ADMIN
status = active
id != targetUser.id
```

If count is zero, reject using a stable backend error/message such as `CANNOT_REMOVE_LAST_ACTIVE_ADMIN` if the project has/introduces error codes.

### Step 5 - Protect `updateStatus()`

Before changing status:

1. load target;
2. determine whether it is currently active ADMIN;
3. if target status is non-active, run invariant;
4. reject if no other active admin;
5. otherwise update normally.

### Step 6 - Protect generic `update()`

Because `update()` accepts role and status, compute resulting state from both current + requested values.

Do not check only `data.role` or only `data.status`.

### Step 7 - Protect DELETE/deactivate path through the same service rule

The controller's delete/deactivate route should continue to call protected service logic.

Do not add an independent controller count check and assume that is enough.

### Step 8 - Decide self-deactivation behavior through the same invariant

An admin may target their own account if current API permits it.

Rule for this ticket:

- if another active admin exists, self-deactivation may follow normal lifecycle behavior;
- if this user is the last active admin, reject.

Do not special-case self actions to bypass the invariant.

### Step 9 - Consider transaction/race safety

Two active admins could issue concurrent operations that each see the other as active and both become non-active.

Use the simplest repository-compatible transactional strategy. At minimum, group the relevant read/check/update in a Prisma transaction and document the isolation assumptions.

If true serializable protection is needed but current transaction API/isolation is not clear, stop for architect review. Do not claim a race is solved merely because `$transaction` exists.

### Step 10 - Never auto-create/promote replacement admin

If last-admin removal is rejected, return an error.

Do not:

- promote oldest worker;
- reactivate an inactive admin;
- invoke bootstrap automatically.

### Step 11 - Add service tests

Test current/resulting state combinations and negative update assertions.

### Step 12 - Add API/E2E coverage later through AUTH-017

Service tests prove the invariant implementation; E2E proves every route reaches it.

### Step 13 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Detailed Test Specification

### TEST-AUTH009-01: Only active admin cannot be deactivated

**Purpose:** Protect the core lockout invariant.

**Level:** Service unit/integration.

**Setup:** Target Admin A is `ADMIN/active`. Count query for other active admins returns 0.

**Action:** Request status `inactive` through protected service method.

**Expected Result:** Operation rejected.

**Required Assertions:**

- `user.update` for deactivation not called;
- Admin A remains active;
- no Clerk session revocation should occur in AUTH-011 path because status change never committed;
- no success audit event created.

**Why This Test Exists:** This is the most direct accidental-lockout scenario.

**If This Test Fails:** Verify count query excludes target and filters both role and active status before update.

### TEST-AUTH009-02: Only active admin cannot be suspended

**Purpose:** Suspension removes administrative access just like deactivation.

**Level:** Service.

**Setup:** Same as Test 01.

**Action:** Target `suspended`.

**Expected Result:** Rejected; no status mutation.

**Required Assertions:** Admin remains `active`.

**Why This Test Exists:** A rule checking only `inactive` would leave a simple bypass.

**If This Test Fails:** Treat every resulting non-active state consistently.

### TEST-AUTH009-03: Only active admin cannot be demoted to WORKER

**Purpose:** Protect role-based removal from bypassing status protection.

**Level:** Service.

**Setup:** Last active ADMIN.

**Action:** Generic update with `role=WORKER`.

**Expected Result:** Rejected.

**Required Assertions:** Role remains ADMIN; status remains active; no update.

**Why This Test Exists:** The invariant is about resulting active-admin state, not only status field.

**If This Test Fails:** Ensure generic `update()` participates in the same helper.

### TEST-AUTH009-04: Only active admin cannot be demoted to RIDER

**Purpose:** Cover every current non-admin role.

**Level:** Service.

**Setup/Action:** Same as above with `RIDER`.

**Expected Result:** Rejected.

**Required Assertions:** No update.

**Why This Test Exists:** Hardcoded WORKER-only checks can miss RIDER.

**If This Test Fails:** Compare resulting role generically against ADMIN.

### TEST-AUTH009-05: Profile-only update on last admin is allowed

**Purpose:** Avoid overblocking safe updates.

**Level:** Service.

**Setup:** Last active admin.

**Action:** Change only `fullName` or `mobileNumber`.

**Expected Result:** Allowed.

**Required Assertions:** Role/status unchanged; helper does not reject merely because target is last admin.

**Why This Test Exists:** The rule applies only when the operation removes active-admin status.

**If This Test Fails:** Your helper is checking target identity without computing resulting state.

### TEST-AUTH009-06: Two active admins allow one to be deactivated

**Purpose:** Ensure legitimate admin lifecycle remains possible.

**Level:** Service/integration.

**Setup:** Admin A and Admin B both active. Target B; count of other active admins = 1.

**Action:** Deactivate B.

**Expected Result:** Allowed; A remains active.

**Required Assertions:** Exactly one active admin remains after operation.

**Why This Test Exists:** Safety controls should not make admin accounts impossible to manage.

**If This Test Fails:** Verify count query and condition only reject when zero *other* active admins exist.

### TEST-AUTH009-07: Inactive/suspended admins do not satisfy redundancy requirement

**Purpose:** Prevent counting unusable admins.

**Level:** Service.

**Setup:** Admin A active; Admin B inactive or suspended.

**Action:** Try to remove active-admin state from A.

**Expected Result:** Rejected.

**Required Assertions:** Count query requires `status=active`.

**Why This Test Exists:** Counting all ADMIN rows would create a false sense of recoverability.

**If This Test Fails:** Tighten count filter.

### TEST-AUTH009-08: Worker/Rider status changes are not blocked by admin invariant

**Purpose:** Prevent collateral damage to normal user lifecycle.

**Level:** Service.

**Setup:** Active worker/rider; one active admin exists separately.

**Action:** Suspend/deactivate worker/rider.

**Expected Result:** Allowed according to normal lifecycle rules.

**Required Assertions:** Last-admin helper returns early for non-admin target.

**Why This Test Exists:** A broad "must always count admin first" implementation may unnecessarily complicate/deny all status changes.

**If This Test Fails:** Limit invariant to operations that actually reduce active-admin count.

### TEST-AUTH009-09: Combined role/status update uses resulting state

**Purpose:** Catch partial-update logic bugs.

**Level:** Service.

**Setup:** Last active ADMIN.

**Action:** Send update containing multiple fields, e.g. `role=WORKER`, `status=inactive`, plus profile fields.

**Expected Result:** Rejected before mutation.

**Required Assertions:** None of the requested fields are partially written.

**Why This Test Exists:** Checking only one field or mutating in stages can bypass/partially apply security rules.

**If This Test Fails:** Compute resulting state before any update and write atomically.

### TEST-AUTH009-10: DELETE/deactivate endpoint reaches same protection

**Purpose:** Ensure alternate API route cannot bypass service invariant.

**Level:** Controller/E2E or service-call verification.

**Setup:** Last active admin.

**Action:** Invoke route that maps `DELETE /users/:id` to inactive.

**Expected Result:** Rejected; admin remains active.

**Required Assertions:** Controller delegates to protected service path; no separate direct Prisma write.

**Why This Test Exists:** Security rules often get bypassed through convenience endpoints.

**If This Test Fails:** Route is not using centralized lifecycle logic.

### TEST-AUTH009-11: Self-deactivation follows the same rule

**Purpose:** Protect against an admin locking themselves out when they are the last active admin.

**Level:** Service/E2E.

**Setup:** Actor and target are Admin A; no other active admin.

**Action:** Deactivate self.

**Expected Result:** Rejected.

**Required Assertions:** State unchanged.

**Why This Test Exists:** Self-actions are still ordinary user-management operations with the same system invariant.

**If This Test Fails:** Remove self-specific bypass.

### TEST-AUTH009-12: Concurrent last-admin removal risk is tested/documented

**Purpose:** Verify race handling matches implementation's transaction guarantees.

**Level:** Integration/concurrency test if practical; otherwise explicit documented review with a focused transaction test.

**Setup:** Two active admins and concurrent operations attempting to remove each other's active-admin state.

**Action:** Execute operations concurrently against disposable DB using the chosen transaction/isolation strategy.

**Expected Result:** At least one operation must fail or final state must still have one active admin according to approved concurrency design.

**Required Assertions:** Final DB count of active admins >= 1.

**Why This Test Exists:** Two individually correct count-then-update calls can race.

**If This Test Fails:** Do not ignore it. Review transaction isolation/locking/serializable strategy with architect.

## Manual Verification

Use a disposable/local DB:

1. create Admin A active;
2. verify A is the only active admin;
3. try deactivate A -> rejected;
4. try suspend A -> rejected;
5. try demote A to WORKER/RIDER -> rejected;
6. update A's name -> allowed;
7. create Admin B active;
8. deactivate B -> allowed;
9. verify A remains active;
10. reactivate B through explicit workflow;
11. demote B -> allowed;
12. verify A remains active;
13. exercise DELETE/deactivate path for last-admin case;
14. if practical, run the concurrency scenario.

## Failure Diagnosis Guide

### Last admin can still be removed through one endpoint

Your rule is not centralized. Inventory all role/status mutation paths again and route them through the same service invariant.

### Two admins exist but removal is incorrectly rejected

Check whether query excludes target user. Counting the target as the "other" admin is wrong.

### Inactive admin is being counted

Ensure count filters `status=active`.

### Profile edit is rejected

Compute resulting role/status before invoking the safety check. Do not block safe profile changes.

### Concurrency test leaves zero admins

Simple read-then-update transaction is insufficient under current isolation. Escalate and implement an appropriate atomic/locking/serializable strategy.

## PR Evidence Required

Include:

- inventory of all role/status mutation paths;
- central helper/service design;
- exact active-admin count query semantics;
- test results for last-admin status changes, role changes, DELETE path, safe profile update, two-admin cases, and concurrency reasoning;
- manual test results;
- documented transaction/isolation approach and residual risk if any.

## Acceptance Criteria

- [ ] Backend prevents zero active admins.
- [ ] Protection covers status and role changes.
- [ ] Protection covers delete/deactivate API path.
- [ ] Protection applies to self-deactivation.
- [ ] Inactive/suspended admins do not count as active redundancy.
- [ ] Frontend/API alternatives cannot bypass the invariant.
- [ ] Non-admin user lifecycle behavior remains unaffected.
- [ ] Concurrency behavior is tested or explicitly architect-reviewed.

## Definition of Done

- [ ] Service invariant implemented once and reused.
- [ ] Detailed tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual verification passes.
- [ ] Required PR evidence recorded.
- [ ] Reviewer checks resulting-state and concurrency reasoning.
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
- catch the invariant error and continue with update;
- ignore a demonstrated concurrency race;
- add a hidden force parameter without security review.

## STOP - NEEDS ARCHITECT DECISION

Stop if the product introduces organization-scoped administrators and the invariant needs to be "one active admin per organization" rather than one globally.

Also stop if the current database transaction/isolation approach cannot reliably protect against concurrent final-admin removal. Do not claim race safety without evidence.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Mutation Paths Reviewed:**  
**Concurrency Test/Review:**  
**Notes:**