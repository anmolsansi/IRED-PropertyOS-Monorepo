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
```

Only an explicit administrative lifecycle operation may reactivate a user.

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- auth guard tests/specs

### Inspect But Do Not Redesign Here

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts`
- `Backend/src/modules/users/dto/users.schema.ts`

AUTH-010 owns the explicit lifecycle UX/API hardening.

## Required Reading

Read:

1. complete `jwt-auth.guard.ts`;
2. `UsersService.updateStatus()`;
3. `UsersService.update()` status handling;
4. `UsersController` status/deactivate routes;
5. Prisma `UserStatus` enum.

Confirm statuses are currently:

- `active`
- `inactive`
- `suspended`

## Architecture Contract

Account status in the PropertyOS database is authorization state.

Authentication is allowed to read it and reject access. Authentication is not allowed to change it.

Rule:

```text
status === active -> may continue
status !== active -> deny
```

There is no email exception.

## Step-by-Step Implementation

### Step 1 - Locate the reactivation branch

Open `Backend/src/shared/guards/jwt-auth.guard.ts`.

Find the conditional that checks:

- `user.status !== UserStatus.active`; and
- whether the normalized email equals the master-admin email.

Read the full branch.

### Step 2 - Record every database field it mutates

Before deleting anything, note the fields changed by the branch. At the current repository state these include:

- `role`;
- `status`;
- `deactivatedAt`;
- `emailVerifiedAt`.

This list becomes part of your regression assertions.

### Step 3 - Remove the entire special reactivation block

Delete the database update that reactivates the account.

Do not leave a reduced version that only changes one or two fields.

### Step 4 - Preserve the ordinary inactive-user rejection

Immediately after the removed block, the guard already checks whether the user is active.

Ensure the resulting behavior is equivalent to:

```text
if user.status is not active:
    log rejection
    throw
```

Both `inactive` and `suspended` must take this path.

### Step 5 - Verify no hidden reactivation remains in the auth guard

Search `jwt-auth.guard.ts` for:

- `deactivatedAt`
- `status: UserStatus.active`
- `role: UserRole.ADMIN`
- `prisma.user.update`
- `reactivat`

Any remaining user update must be justified by another ticket. Do not assume it is safe.

### Step 6 - Add regression tests

Tests must capture the local user object before authentication and compare it with the expected state afterward.

For an inactive user:

- request denied;
- status still inactive;
- role unchanged;
- `deactivatedAt` unchanged;
- no privileged update call.

Repeat for suspended.

### Step 7 - Validate

Run:

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Checkpoint

- [ ] Auth guard cannot set an inactive user to active.
- [ ] Auth guard cannot set a suspended user to active.
- [ ] Auth guard cannot clear `deactivatedAt`.
- [ ] Former privileged email receives no exception.
- [ ] Active users still authenticate normally.

## Tests Required

### Test A - inactive ADMIN

Given:

- valid Clerk identity;
- existing local user;
- role `ADMIN`;
- status `inactive`.

Expected:

- denied;
- DB state unchanged.

### Test B - suspended ADMIN

Expected:

- denied;
- DB state unchanged.

### Test C - inactive WORKER

Expected:

- denied identically to an inactive admin except for safe logging metadata;
- no special-case code path.

### Test D - active ADMIN

Expected:

- allowed;
- role/status unchanged.

### Test E - persistence across restart

In integration/E2E coverage or manual test:

1. mark test user inactive;
2. attempt login;
3. restart backend;
4. attempt login again;
5. confirm status remains inactive and access remains denied.

## Manual Verification

1. Choose a disposable test user.
2. Record role/status/deactivatedAt.
3. Set status to inactive through the explicit admin path or test fixture.
4. attempt authenticated request.
5. verify request fails.
6. query database.
7. verify status and role were not modified.
8. repeat with suspended status.

## Acceptance Criteria

- [ ] Login cannot reactivate any account.
- [ ] Inactive users remain inactive after login attempts.
- [ ] Suspended users remain suspended after login attempts.
- [ ] Login cannot clear deactivation metadata.
- [ ] No privileged email receives a status exception.
- [ ] Regression tests cover inactive and suspended users.

## Definition of Done

- [ ] Code complete.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Backend tests pass.
- [ ] Manual status-persistence test passes.
- [ ] Reviewer confirms status is read-only during auth.
- [ ] No unresolved STOP item remains.

## Rollback

If legitimate administrators become locked out, do not restore auto-reactivation. Use another authorized administrator or the controlled recovery/bootstrap process defined in AUTH-008.

## Forbidden Shortcuts

Do not:

- reactivate only ADMIN users;
- reactivate based on environment variable;
- reactivate in RolesGuard instead;
- clear `deactivatedAt` without setting status;
- treat suspended as active;
- change the database status from frontend code;
- bypass the status check for specific emails.

## STOP - NEEDS ARCHITECT DECISION

Stop if there is no remaining supported method to recover access when all administrators are inactive. That is an operational/bootstrap concern and must be solved by AUTH-008, not by preserving login-time reactivation.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**