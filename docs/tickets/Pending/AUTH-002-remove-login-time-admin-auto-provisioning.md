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

## Junior Engineer Orientation

The key idea is simple:

```text
Logging in is not the same thing as creating an account.
```

A person may have a valid Clerk identity and still **not** be authorized to use PropertyOS. PropertyOS must already know that person through an explicit invite/bootstrap/migration process.

Your job in this ticket is to make a missing local PropertyOS user a hard stop during authentication.

You are **not** being asked to build the replacement onboarding flow here. `UsersService.invite()` already represents explicit provisioning for normal users, AUTH-005/006 handle identity mapping, and AUTH-008 handles the initial administrator bootstrap.

### Terms you must understand

- **Clerk identity:** External identity verified by Clerk.
- **PropertyOS user:** Local database row containing PropertyOS role/status/organization information.
- **Provisioning:** Creating the PropertyOS user intentionally.
- **Authentication:** Verifying and loading an already-provisioned user.

A valid Clerk user without a PropertyOS row should be treated like someone with a valid building ID but no access badge to this office: their identity may be real, but they are not provisioned for this application.

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

### Why this is dangerous

A request whose purpose is "prove who I am" is also capable of:

- creating a database row;
- granting `ADMIN`;
- activating that row;
- turning a previously unknown application identity into a privileged user.

That makes authentication a provisioning backdoor.

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

### Security invariant

For a missing local user:

```text
users_before_request == users_after_request
```

and:

```text
admin_count_before_request == admin_count_after_request
```

Authentication cannot repair the missing row automatically.

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- an auth guard spec file if one exists or is created for regression coverage

### Do Not Change In This Ticket

- admin bootstrap design: AUTH-008
- Clerk-ID-only lookup: AUTH-006
- seed admin creation: AUTH-007
- user invitation flow: keep it intact
- role naming/RBAC model
- organization/geography access

## Required Reading

Read fully:

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. `Backend/src/modules/users/users.service.ts`
3. `Backend/src/modules/users/users.controller.ts`
4. `Backend/src/modules/users/dto/users.schema.ts`
5. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Understand the difference between:

- **authentication:** determining whether the caller maps to an allowed existing user;
- **provisioning:** intentionally creating a new user through an administrator/bootstrap workflow.

Before editing, locate `UsersService.invite()` and confirm that there is already an explicit application-owned path that creates users. That is important because this ticket is **not** removing all user creation, only user creation from authentication.

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

### Allowed write boundary

A future explicit provisioning flow may create users. This ticket does **not** ban `prisma.user.create()` across the repository. It bans user creation from the request-time authentication guard.

## Step-by-Step Implementation

### Step 1 - Find the missing-user block

Open `Backend/src/shared/guards/jwt-auth.guard.ts`.

Find the local user query and then the block beginning with the equivalent of:

```text
if (!user) {
```

Read the whole block before editing.

**Why:** The missing-user block currently contains both privileged creation and ordinary rejection. You need to preserve the rejection while removing the creation branch.

### Step 2 - Identify the auto-provision path

Inside the missing-user branch, identify code that:

- checks a privileged email;
- calls `this.prisma.user.create()`;
- sets role `UserRole.ADMIN`;
- sets status `UserStatus.active`;
- logs that a master admin was auto-provisioned.

Confirm this creation happens inside request authentication.

**Verify:** Write down the exact Prisma method and fields being created. These become negative assertions in the regression test.

### Step 3 - Remove auto-provisioning

Delete the privileged creation branch.

The missing-user branch must become a direct rejection path.

Expected behavior in plain English:

1. Authentication has already verified the external identity.
2. PropertyOS cannot find a corresponding local user.
3. PropertyOS rejects access.
4. No user lifecycle state changes.

Do not create a replacement user through `UsersService` from the guard.

### Step 4 - Preserve safe rejection behavior

Keep or use the approved generic error for an unprovisioned PropertyOS user.

Do not expose unnecessary information such as:

- whether a given email exists in another system;
- whether the account almost matched an admin rule;
- secret/provider details.

### Step 5 - Remove imports made unused by this specific branch

If `UserRole` becomes unused after AUTH-003/AUTH-004 are also applied, remove it. Do not remove `UserStatus` if it is still required for active-status checking.

### Step 6 - Search for user creation inside request auth

Search `jwt-auth.guard.ts` for:

- `user.create`
- `prisma.user.create`
- `ADMIN`
- `auto-provision`
- `upsert`

Expected result for user creation/upsert: zero.

If you find an update that links `clerkUserId`, do not silently change it here unless AUTH-006 is in the same implementation PR. Record it as owned by AUTH-006.

### Step 7 - Confirm explicit provisioning still exists

Open `Backend/src/modules/users/users.service.ts`.

Confirm `invite()` still owns intentional user creation.

**Why:** We are separating responsibilities, not removing the ability to add employees.

### Step 8 - Add regression coverage

Create or update auth guard tests so a missing local user produces rejection and **zero calls** to user creation/provisioning mutations.

If Clerk functions are mocked, make token verification succeed. The test must reach the missing-local-user branch. A test that fails earlier because the token is invalid does not prove auto-provisioning is gone.

### Step 9 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

### Step 10 - Inspect the final diff

Confirm you changed the missing-user behavior and tests only. Do not combine unrelated user-service refactors into this ticket.

## Checkpoint

- [ ] Missing local PropertyOS user is rejected.
- [ ] `JwtAuthGuard` contains no user creation/upsert.
- [ ] A login request cannot create `ADMIN`.
- [ ] Existing `UsersService.invite()` remains an explicit provisioning path.
- [ ] Regression tests verify zero creation writes.
- [ ] Normal existing active-user authentication remains intact.

## Detailed Test Specification

### TEST-AUTH002-01: Existing active user is still allowed without creation

**Purpose:** Prove the fix removes only automatic provisioning and does not break normal authentication.

**Level:** Unit/regression test of `JwtAuthGuard`.

**Setup:**

- Clerk token verification succeeds;
- local user lookup returns an existing `active` PropertyOS user;
- give the user a normal role such as `WORKER`;
- spies exist for `prisma.user.create`, `update`, and `upsert` where applicable.

**Action:** Call the guard for a protected route.

**Expected Result:** Authentication succeeds.

**Required Assertions:**

- existing user is attached to `request.user`;
- `user.create` was not called;
- `user.upsert` was not called;
- role/status are unchanged.

**Why This Test Exists:** A junior engineer might delete too much of the missing-user/normal-user code while removing auto-provisioning. This test protects the ordinary path.

**If This Test Fails:** Inspect whether normal local-user lookup/status validation was accidentally removed. Restore normal read behavior, not provisioning.

### TEST-AUTH002-02: Missing local user is rejected with zero writes

**Purpose:** Protect the central invariant of this ticket.

**Level:** Unit/regression.

**Setup:**

- valid verified Clerk identity;
- Prisma local-user lookup returns `null`;
- mock all potentially relevant user write methods.

**Action:** Execute the guard.

**Expected Result:** Authentication is rejected.

**Required Assertions:**

- `prisma.user.create` not called;
- `prisma.user.upsert` not called;
- `prisma.user.update` not called for provisioning;
- `request.user` remains unset;
- no synthetic ADMIN object is returned.

**Why This Test Exists:** This is the direct regression check for request-time account creation.

**If This Test Fails:** Search the guard and any helper it calls for provisioning logic. Do not change the test to allow a default `WORKER`; creating *any* user during auth violates the ticket.

### TEST-AUTH002-03: Former privileged-email scenario is treated like every other missing user

**Purpose:** Ensure removal of auto-provisioning is not limited to ordinary emails while a hidden admin exception remains.

**Level:** Unit/regression.

**Setup:** Same as the missing-user test, with a fake test email representing the former privileged-email branch. Do not use a real personal email fixture.

**Action:** Attempt authentication.

**Expected Result:** Same rejection path as every other missing user.

**Required Assertions:** Zero user writes; zero role assignment; no special log claiming provisioning succeeded.

**Why This Test Exists:** The original vulnerability is specifically privileged missing-user auto-provisioning.

**If This Test Fails:** AUTH-001 is incomplete or an equivalent privileged allowlist remains.

### TEST-AUTH002-04: Missing user cannot be auto-created as a lower role either

**Purpose:** Prevent a superficial fix where automatic `ADMIN` creation is replaced with automatic `WORKER`/`RIDER` creation.

**Level:** Unit/regression.

**Setup:** Valid identity, no local user.

**Action:** Authenticate.

**Expected Result:** Rejected with zero local-user creation regardless of role.

**Required Assertions:** No call to any generic user-creation path, including `UsersService.invite()` if it is mocked/injected in a future refactor.

**Why This Test Exists:** The architecture requirement is "authentication never provisions users," not merely "authentication never creates admins."

**If This Test Fails:** Remove the replacement auto-provision path. User onboarding must remain explicit.

### TEST-AUTH002-05: Repeated missing-user attempts remain idempotently read-only

**Purpose:** Prove repeated login attempts cannot slowly create/modify account state.

**Level:** Integration/unit depending on available test seam.

**Setup:** Missing local user, valid identity.

**Action:** Attempt authentication 2-3 times.

**Expected Result:** Every attempt is rejected identically.

**Required Assertions:**

- no user row appears after any attempt;
- user count remains unchanged in integration coverage;
- no provisioning write method is called in unit coverage.

**Why This Test Exists:** A hidden "first attempt failed, second attempt repairs account" behavior would still violate the boundary.

**If This Test Fails:** Inspect retries/catch blocks/provider sync helpers for write-on-retry behavior.

### TEST-AUTH002-06: Explicit invitation still creates users outside authentication

**Purpose:** Confirm the application still has a supported provisioning path.

**Level:** Service test or existing user-service regression test.

**Setup:** Authorized admin context and valid invite input using the existing `UsersService.invite()` test conventions.

**Action:** Invoke the explicit invite path.

**Expected Result:** The explicit admin-owned provisioning flow still creates the user according to its contract.

**Required Assertions:** User creation occurs through `UsersService`, not `JwtAuthGuard`; the auth guard is not involved.

**Why This Test Exists:** It demonstrates the intended architecture separation to future engineers.

**If This Test Fails:** Fix the explicit provisioning flow separately if your auth change accidentally touched it. Do not restore login-time creation.

## Manual Verification

Use a disposable local/test Clerk identity or mocked auth environment:

1. Record current PropertyOS user count.
2. Authenticate with an identity that has no local PropertyOS record.
3. Confirm request is rejected.
4. Query user count again.
5. Confirm count is unchanged.
6. Confirm no new `ADMIN`, `WORKER`, or `RIDER` was created.
7. Repeat the request and confirm the count still does not change.
8. Authenticate an existing active user and confirm they still succeed.

## Failure Diagnosis Guide

### Missing-user test unexpectedly succeeds

Look for a remaining branch after local lookup returns null. Search for `create`, `upsert`, `invite`, role assignment, or a catch block that returns true.

### User count increases even though request returns an error

This is still a failure. The request may be creating a row and then failing later. Inspect write ordering and remove the write from authentication.

### Existing user test fails

Check whether you removed the whole user-resolution block rather than only the missing-user creation branch.

### TypeScript complains about unused `UserRole`

If it became unused due to removing admin creation/reactivation and no approved auth branch needs it, remove the import. Do not keep dead privileged code to preserve the import.

### Someone suggests calling `UsersService.invite()` from the guard

Do not do it. That only moves provisioning behind a service call while preserving the same architectural violation.

## PR Evidence Required

Include:

- before/after missing-user flow;
- files changed;
- search result showing no `user.create`/`upsert` in request auth;
- test names and results;
- evidence that missing-user attempts cause zero user writes;
- evidence that existing active users still authenticate;
- evidence that explicit invitation still exists outside auth;
- commands run and their results.

Do not include production user lists, tokens, or real emails.

## Acceptance Criteria

- [ ] Authentication never calls `prisma.user.create()`/`upsert()` to provision a caller.
- [ ] Missing local user is always rejected.
- [ ] Former privileged-email scenario receives no special provisioning behavior.
- [ ] Explicit admin/user invitation flow still works outside authentication.
- [ ] Regression tests prove zero creation writes on missing user.
- [ ] Repeated missing-user attempts remain read-only/idempotent.

## Definition of Done

- [ ] Code complete.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Backend tests pass.
- [ ] Detailed tests include negative write assertions.
- [ ] Manual no-write verification performed.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms auth and provisioning are separated.
- [ ] No unresolved STOP item remains.

## Rollback

If legitimate users become unable to authenticate because they were never provisioned locally, do not restore login-time creation. Provision/backfill those users through the explicit process in AUTH-005/AUTH-008, then redeploy.

## Forbidden Shortcuts

Do not:

- move auto-provisioning into another guard;
- call `UsersService.invite()` from authentication;
- create a user with `WORKER` instead of `ADMIN` and call the risk fixed;
- catch the missing-user exception and continue;
- create users from frontend login callbacks;
- reintroduce a hidden email allowlist;
- weaken tests so a user write becomes acceptable.

## STOP - NEEDS ARCHITECT DECISION

Stop if production relies on login-time user creation for normal users. Record the evidence and escalate. Do not preserve the insecure behavior without an explicit architecture decision.

Also stop if another authentication provider intentionally provisions users during login and shares this same guard path. That requires a broader identity/provisioning decision.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Tests Added/Updated:**  
**Manual User-Count Verification:** Pass / Fail  
**Notes:**