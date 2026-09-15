# AUTH-002: Remove Login-Time Admin Auto-Provisioning

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Security  
**Complexity:** Small  
**Depends On:** AUTH-001  
**Blocks:** AUTH-008, AUTH-015, AUTH-017  
**Primary File:** `Backend/src/shared/guards/jwt-auth.guard.ts`

## Objective

Remove the behavior that creates a PropertyOS administrator automatically during authentication when a Clerk identity does not yet have a local user record.

After this ticket, authentication must never create a PropertyOS user.

## Why This Exists

The current Clerk auth path loads a user by email. If no user exists and the email matches the privileged master-admin email, the guard calls `prisma.user.create()` and creates an active `ADMIN` account during the login request.

This mixes authentication with privileged provisioning. It also makes a login request capable of changing the database and granting administrator access.

Provisioning must happen through explicit administrative/bootstrap flows, not through the authentication guard.

## Current Behavior

Current logical flow:

```text
Verify Clerk token
  -> load Clerk user
  -> get email
  -> find PropertyOS user by email
  -> if missing and email is privileged
       -> create active ADMIN
       -> continue request
  -> otherwise reject
```

## Target Behavior

Required flow after this ticket:

```text
Verify Clerk token
  -> resolve PropertyOS user
  -> if no PropertyOS user exists
       -> reject request
       -> perform zero user writes
```

The guard must never call `prisma.user.create()`.

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- an auth guard spec file if one exists or is created for regression coverage

### Do Not Change In This Ticket

- admin bootstrap design: AUTH-008
- Clerk-ID-only lookup: AUTH-006
- seed admin creation: AUTH-007
- user invitation flow: keep it intact

## Required Reading

Read fully:

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. `Backend/src/modules/users/users.service.ts`
3. `Backend/src/modules/users/users.controller.ts`
4. `Backend/src/modules/users/dto/users.schema.ts`

Understand the difference between:

- **authentication:** determining whether the caller maps to an allowed existing user;
- **provisioning:** intentionally creating a new user through an administrator/bootstrap workflow.

## Baseline Commands

From repository root:

```bash
npm run typecheck:backend
npm run test:backend
```

If either fails before your changes, record the failure and do not hide it.

## Architecture Contract

The authentication guard is read-oriented with respect to user lifecycle state.

During authentication it may:

- verify token;
- read Clerk identity information;
- read PropertyOS user information;
- attach the existing user to `request.user`;
- reject a request.

During authentication it must not:

- create a PropertyOS user;
- assign `ADMIN`;
- invite a user;
- create a password;
- activate a user;
- repair missing privileged users.

## Step-by-Step Implementation

### Step 1 - Find the missing-user block

Open `Backend/src/shared/guards/jwt-auth.guard.ts`.

Find the local user query and then the block beginning with the equivalent of:

```text
if (!user) {
```

Read the whole block before editing.

### Step 2 - Identify the auto-provision path

Inside the missing-user branch, identify code that:

- checks a privileged email;
- calls `this.prisma.user.create()`;
- sets role `UserRole.ADMIN`;
- sets status `UserStatus.active`;
- logs that a master admin was auto-provisioned.

Confirm this creation happens only in the authentication guard.

### Step 3 - Remove auto-provisioning

Delete the privileged creation branch.

The missing-user branch must become a direct rejection path.

Expected behavior in plain English:

1. Log an authentication rejection using the repository's safe logging conventions.
2. Throw the existing appropriate authentication/authorization exception.
3. Do not mutate the database.

Do not create a replacement user through `UsersService` from the guard.

### Step 4 - Preserve the normal error message unless another ticket changes it

Use the existing message or the error-contract decision specified by later auth tickets. Do not expose internal information such as whether the email is registered in Clerk.

### Step 5 - Remove imports made unused by this specific branch

For example, if `UserRole` is no longer used after AUTH-003/AUTH-004 are also applied, remove it. Do not remove `UserStatus` if it is still required for active-status checking.

### Step 6 - Search for user creation inside auth guard

Search `jwt-auth.guard.ts` for:

- `user.create`
- `prisma.user.create`
- `ADMIN`
- `auto-provision`

Expected result for user creation: zero.

### Step 7 - Confirm explicit provisioning still exists

Open `Backend/src/modules/users/users.service.ts`.

Confirm `invite()` still owns intentional user creation. Do not modify it in this ticket unless required for compilation.

### Step 8 - Add regression coverage

Create or update auth guard tests so a missing local user produces rejection and **zero calls** to:

- `prisma.user.create()`;
- `prisma.user.update()` for provisioning purposes.

If Clerk functions are mocked, keep the mock focused on a valid verified identity so the test reaches the missing-local-user branch.

### Step 9 - Run validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Checkpoint

- [ ] Missing local PropertyOS user is rejected.
- [ ] `JwtAuthGuard` contains no user creation.
- [ ] A login request cannot create `ADMIN`.
- [ ] Existing `UsersService.invite()` remains the normal explicit provisioning path.
- [ ] Regression test verifies zero creation writes.

## Tests Required

### Test A - Existing active user

Given:

- valid Clerk token;
- existing active PropertyOS user.

Expected:

- authentication succeeds;
- no user is created.

### Test B - Missing local user

Given:

- valid Clerk token;
- valid Clerk user identity;
- no matching PropertyOS user.

Expected:

- authentication rejected;
- `prisma.user.create` not called;
- no ADMIN row appears.

### Test C - Former privileged email

Given:

- valid Clerk identity using the email that used to trigger auto-provisioning;
- no local user.

Expected:

- same rejection as every other missing user;
- zero writes.

## Manual Verification

Use a disposable local/test Clerk identity or mocked auth environment:

1. Record current PropertyOS user count.
2. Authenticate with an identity that has no local PropertyOS record.
3. Confirm request is rejected.
4. Query user count again.
5. Confirm count is unchanged.
6. Confirm no new `ADMIN` was created.

## Acceptance Criteria

- [ ] Authentication never calls `prisma.user.create()`.
- [ ] Missing local user is always rejected.
- [ ] Former privileged email receives no special provisioning behavior.
- [ ] Explicit admin/user invitation flow still works outside authentication.
- [ ] Regression tests prove zero creation writes on missing user.

## Definition of Done

- [ ] Code complete.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Backend tests pass.
- [ ] Manual no-write verification performed.
- [ ] Reviewer confirms auth and provisioning are separated.
- [ ] No unresolved STOP item remains.

## Rollback

If legitimate users become unable to authenticate because they were never provisioned locally, do not restore login-time creation. Provision/backfill those users through the explicit process in AUTH-005/AUTH-008, then redeploy.

## Forbidden Shortcuts

Do not:

- move auto-provisioning into another guard;
- call `UsersService.invite()` from authentication;
- create a user with `WORKER` instead of `ADMIN` to claim the risk is fixed;
- catch the missing-user exception and continue;
- create users from frontend login callbacks;
- reintroduce a hidden email allowlist.

## STOP - NEEDS ARCHITECT DECISION

Stop if production relies on login-time user creation for normal users. Record the evidence and escalate. Do not preserve the insecure behavior without an explicit architecture decision.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**