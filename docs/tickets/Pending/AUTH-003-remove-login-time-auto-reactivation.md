# AUTH-003: Remove Login-Time Auto-Reactivation

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Security  
**Complexity:** Small  
**Depends On:** AUTH-001  
**Blocks:** AUTH-010, AUTH-015, AUTH-017  
**Primary File:** `Backend/src/shared/guards/jwt-auth.guard.ts`

## Objective

Remove the authentication behavior that automatically changes a privileged user's account from `inactive` or `suspended` back to `active` during login.

After this ticket, an account's status must remain unchanged during authentication.

## Junior Engineer Orientation

This ticket protects a very important rule:

```text
If an administrator deliberately disables a user, logging in must not undo that decision.
```

Think of `status` as a locked door controlled by PropertyOS. Clerk can prove who is standing at the door, but Clerk login must not unlock a PropertyOS account that an administrator intentionally disabled.

You are not implementing the reactivation UI/API here. AUTH-010 owns explicit lifecycle transitions. Your job is only to make request authentication **read** account status and reject non-active accounts without changing them.

### Terms

- `active`: account may authenticate, subject to other authorization checks.
- `inactive`: account intentionally deactivated/retired.
- `suspended`: account temporarily locked.
- `deactivatedAt`: timestamp recording when access was removed.

Both `inactive` and `suspended` must fail closed during authentication.

## Why This Exists

The current auth guard contains a special branch that detects a non-active user with the privileged master-admin email and then updates that user to:

- role `ADMIN`;
- status `active`;
- `deactivatedAt = null`;
- refreshed email verification timestamp.

That means an explicit administrator suspension/deactivation can be silently undone just by logging in. This defeats the purpose of account status controls.

## Current Behavior

Current dangerous flow:

```text
valid Clerk identity
  -> find local user
  -> local user is inactive/suspended
  -> email matches privileged email
  -> database update
       role = ADMIN
       status = active
       deactivatedAt = null
  -> request succeeds
```

### Why this is more than a login bug

This behavior breaks several security expectations at once:

- an admin cannot reliably suspend another admin;
- incident-response lockout can be bypassed by logging in;
- database status does not remain authoritative;
- audit history can say "deactivated" while request-time code silently reverses it.

## Target Behavior

Required flow:

```text
valid Clerk identity
  -> find local user
  -> if status != active
       -> reject
       -> do not change role
       -> do not change status
       -> do not clear deactivatedAt
       -> do not update verification timestamps as a recovery mechanism
```

Only an explicit administrative lifecycle operation may reactivate a user.

### Security invariant

For a non-active user attempting authentication:

```text
role_after == role_before
status_after == status_before
deactivatedAt_after == deactivatedAt_before
```

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- auth guard tests/specs

### Inspect But Do Not Redesign Here

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts`
- `Backend/src/modules/users/dto/users.schema.ts`

AUTH-010 owns the explicit lifecycle UX/API hardening.

### Out Of Scope

Do not:

- create a new reactivation endpoint in this ticket;
- redesign the user status enum;
- change Clerk sessions yet (AUTH-011);
- change last-admin protection yet (AUTH-009);
- add a special bypass for emergencies.

## Required Reading

Read:

1. complete `jwt-auth.guard.ts`;
2. `UsersService.updateStatus()`;
3. `UsersService.update()` status handling;
4. `UsersController` status/deactivate routes;
5. Prisma `UserStatus` enum;
6. `docs/tickets/TICKET_DETAIL_STANDARD.md`.

Confirm statuses are currently:

- `active`
- `inactive`
- `suspended`

Before editing, identify every field the current reactivation branch writes. Those exact fields become regression assertions.

## Architecture Contract

Account status in the PropertyOS database is authorization state.

Authentication is allowed to read it and reject access. Authentication is not allowed to change it.

Rule:

```text
status === active -> may continue
status !== active -> deny
```

There is no email exception, role exception, owner exception, or environment-variable exception.

### Important distinction

This ticket does **not** say inactive users can never become active again. It says the transition must happen through a deliberate lifecycle operation, not as a side effect of login.

## Step-by-Step Implementation

### Step 1 - Locate the reactivation branch

Open `Backend/src/shared/guards/jwt-auth.guard.ts`.

Find the conditional that checks:

- `user.status !== UserStatus.active`; and
- whether the normalized email equals the master-admin email.

Read the full branch.

**Why:** You need to remove the entire recovery mutation, not only the line that sets `status`.

### Step 2 - Record every database field it mutates

Before deleting anything, note the fields changed by the branch. At the current repository state these include:

- `role`;
- `status`;
- `deactivatedAt`;
- `emailVerifiedAt`.

Also note the Prisma method used and the selected return fields.

**Why:** Tests should prove all security-relevant mutations are gone.

### Step 3 - Remove the entire special reactivation block

Delete the database update that reactivates the account.

Do not leave a reduced version that only changes one or two fields.

Incorrect examples include:

- only clearing `deactivatedAt`;
- only forcing role back to `ADMIN`;
- activating only when `NODE_ENV=production`;
- activating only one known admin email.

### Step 4 - Preserve the ordinary inactive-user rejection

Immediately after the removed block, the guard already checks whether the user is active.

Ensure the resulting behavior is equivalent to:

```text
if user.status is not active:
    log safe rejection
    throw
```

Both `inactive` and `suspended` must take this path.

### Step 5 - Verify status is read-only throughout authentication

Search `jwt-auth.guard.ts` for:

- `deactivatedAt`
- `status: UserStatus.active`
- `role: UserRole.ADMIN`
- `prisma.user.update`
- `reactivat`

Review every remaining write. If request-time identity linking remains, note that AUTH-006 owns it. No remaining write may alter role/status/deactivation state.

### Step 6 - Confirm explicit lifecycle path exists

Read `UsersService.updateStatus()` and the user status controller endpoint.

You do not need to improve them here, but confirm there is a separate administrative place where status can be intentionally changed. AUTH-010 will make that path more explicit.

### Step 7 - Add regression tests

For inactive and suspended fixtures, capture/define the starting state and assert it remains unchanged after the failed authentication attempt.

Negative assertions matter. A test that only expects `401/403` is insufficient if the account was silently reactivated before an unrelated later failure.

### Step 8 - Validate

Run:

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

### Step 9 - Review the diff for hidden recovery behavior

Search the changed auth code for synonyms/alternative helpers such as:

- `ensureAdmin`
- `repairAdmin`
- `activateAdmin`
- `syncStatus`
- `restoreAccess`

No hidden login-time status repair should remain.

## Checkpoint

- [ ] Auth guard cannot set an inactive user to active.
- [ ] Auth guard cannot set a suspended user to active.
- [ ] Auth guard cannot clear `deactivatedAt`.
- [ ] Auth guard cannot restore `ADMIN` as part of login.
- [ ] Former privileged email receives no exception.
- [ ] Active users still authenticate normally.

## Detailed Test Specification

### TEST-AUTH003-01: Inactive administrator stays inactive after login attempt

**Purpose:** Protect the exact high-risk regression that existed in the guard.

**Level:** Unit/regression.

**Setup:**

- valid verified Clerk identity;
- existing local user with `role=ADMIN` and `status=inactive`;
- set a known `deactivatedAt` timestamp;
- set a known `emailVerifiedAt` timestamp if the current user shape includes it;
- spy on `prisma.user.update`.

**Action:** Execute the auth guard for a protected request.

**Expected Result:** Request is rejected because the account is not active.

**Required Assertions:**

- `status` remains `inactive`;
- `role` remains `ADMIN` (unchanged, not re-granted);
- `deactivatedAt` remains the original value;
- no update sets `status=active`;
- no update clears `deactivatedAt`;
- no update refreshes fields as part of recovery.

**Why This Test Exists:** It catches the original auto-reactivation behavior even if the request eventually throws for another reason.

**If This Test Fails:** Search request-time auth for any `user.update` or recovery helper. Do not permit reactivation just because the target is an administrator.

### TEST-AUTH003-02: Suspended administrator stays suspended

**Purpose:** Ensure temporary security suspension cannot be defeated by logging in.

**Level:** Unit/regression.

**Setup:** Same as Test 01 but `status=suspended`.

**Action:** Attempt authentication.

**Expected Result:** Rejected.

**Required Assertions:** Status remains `suspended`; `deactivatedAt` unchanged; no role/status mutation occurs.

**Why This Test Exists:** Suspension is often used during security/HR investigation. Silent reactivation would invalidate that control.

**If This Test Fails:** Check whether code handles `inactive` but accidentally treats `suspended` as recoverable/active.

### TEST-AUTH003-03: Inactive worker receives the same non-active rule

**Purpose:** Prove status behavior is role-neutral.

**Level:** Unit/regression.

**Setup:** Existing `WORKER`, status `inactive`, valid identity.

**Action:** Attempt authentication.

**Expected Result:** Rejected with no mutation.

**Required Assertions:** No special admin-only status handling affects the outcome; worker state remains unchanged.

**Why This Test Exists:** The correct architecture is `status != active => deny`, not a collection of role-specific branches.

**If This Test Fails:** Consolidate the status gate so it is independent of role.

### TEST-AUTH003-04: Active administrator remains active without unnecessary status write

**Purpose:** Ensure normal access works and authentication does not rewrite status even for valid users.

**Level:** Unit/regression.

**Setup:** Active mapped/existing `ADMIN` user.

**Action:** Authenticate.

**Expected Result:** Allowed.

**Required Assertions:** `request.user` contains the stored active user; no update is required merely to preserve active status.

**Why This Test Exists:** A developer might replace reactivation with an unconditional "ensure active" update on every request. That still violates the read-only status boundary.

**If This Test Fails:** Remove status synchronization from auth. Existing DB state should be read, not rewritten.

### TEST-AUTH003-05: Login attempt does not change any protected status fields even when rejection happens later

**Purpose:** Catch mutation-before-error bugs.

**Level:** Unit/integration.

**Setup:** Non-active user and a downstream condition that also causes an error if practical.

**Action:** Attempt authentication.

**Expected Result:** Rejected.

**Required Assertions:** Compare role/status/deactivatedAt before and after. They must be identical regardless of which exception ultimately reaches the caller.

**Why This Test Exists:** HTTP status alone cannot prove state safety.

**If This Test Fails:** Inspect write ordering. Remove the mutation rather than moving the throw.

### TEST-AUTH003-06: Non-active state survives application restart

**Purpose:** Prove disabled state is persisted and not repaired by startup/login behavior.

**Level:** E2E/manual; AUTH-017 will own the final automated version.

**Setup:** Disposable test user is marked inactive or suspended in the test database.

**Action:** Attempt access, restart/recreate the backend against the same DB, attempt access again.

**Expected Result:** Both attempts are denied and the stored status remains non-active.

**Required Assertions:** No startup/auth path changes status; database state is unchanged.

**Why This Test Exists:** This recreates the real operational expectation after an admin disables an account.

**If This Test Fails:** Search startup hooks, seed behavior, auth guard, and lifecycle helpers for automatic reactivation.

### TEST-AUTH003-07: Explicit reactivation remains separate from authentication

**Purpose:** Demonstrate the correct ownership boundary.

**Level:** Service/manual until AUTH-010 is complete.

**Setup:** Inactive disposable user and authorized admin lifecycle path.

**Action:** First attempt normal login (must fail), then explicitly reactivate through the supported admin service/API, then attempt login again.

**Expected Result:** Access returns only after the explicit admin action.

**Required Assertions:** The state transition is attributable to the admin lifecycle operation, not the login attempt.

**Why This Test Exists:** It teaches the engineer the intended replacement behavior rather than merely removing functionality.

**If This Test Fails:** Do not restore auto-reactivation. Complete/fix AUTH-010 lifecycle behavior.

## Manual Verification

1. Choose a disposable test user.
2. Record role/status/deactivatedAt.
3. Set status to inactive through the explicit admin path or test fixture.
4. Attempt authenticated request.
5. Verify request fails.
6. Query database.
7. Verify status, role, and deactivated timestamp were not modified.
8. Repeat with suspended status.
9. Restart the backend and repeat one non-active access attempt.
10. If explicit reactivation is available, reactivate through that path and confirm only then does access return.

## Failure Diagnosis Guide

### Request is rejected but user became active in DB

Ticket is **not complete**. A test that checks only the response code is insufficient. Search for writes before the exception.

### Inactive is denied but suspended is allowed

The status gate is too specific. The intended rule is `status !== active -> deny`.

### Admin is denied but worker test behaves differently

Look for role-specific branching. Status enforcement should be role-neutral.

### `deactivatedAt` becomes null while status stays inactive

Still a failure. Authentication must not mutate lifecycle metadata.

### Team says auto-reactivation is needed to recover the last admin

That recovery concern belongs to AUTH-008/operational recovery. Do not use request authentication as the recovery mechanism.

## PR Evidence Required

Include:

- removed reactivation branch summary;
- list of fields the old branch mutated;
- test names/results for inactive, suspended, active, and persistence cases;
- proof that auth performs no status/deactivation mutation;
- manual before/after DB state for a disposable user (safe IDs only, no sensitive data);
- validation command results.

## Acceptance Criteria

- [ ] Login cannot reactivate any account.
- [ ] Inactive users remain inactive after login attempts.
- [ ] Suspended users remain suspended after login attempts.
- [ ] Login cannot clear deactivation metadata.
- [ ] Login cannot re-grant ADMIN as a recovery side effect.
- [ ] No privileged email receives a status exception.
- [ ] Regression tests cover inactive and suspended users with negative mutation assertions.

## Definition of Done

- [ ] Code complete.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Backend tests pass.
- [ ] Manual status-persistence test passes.
- [ ] Detailed tests prove DB state immutability, not only request rejection.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms status is read-only during auth.
- [ ] No unresolved STOP item remains.

## Rollback

If legitimate administrators become locked out, do not restore auto-reactivation. Use another authorized administrator or the controlled recovery/bootstrap process defined in AUTH-008.

If the problem is incorrect production status/mapping data, fix that verified data through an authorized operational process rather than weakening authentication.

## Forbidden Shortcuts

Do not:

- reactivate only ADMIN users;
- reactivate based on environment variable;
- reactivate in RolesGuard instead;
- clear `deactivatedAt` without setting status;
- treat suspended as active;
- change the database status from frontend code;
- bypass the status check for specific emails;
- alter tests to permit state mutation before rejection.

## STOP - NEEDS ARCHITECT DECISION

Stop if there is no remaining supported method to recover access when all administrators are inactive. That is an operational/bootstrap concern and must be solved by AUTH-008, not by preserving login-time reactivation.

Also stop if another documented subsystem intentionally changes user status during every request. That would conflict with the architecture contract and requires explicit review.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Tests Added/Updated:**  
**Manual Persistence Test:** Pass / Fail  
**Notes:**