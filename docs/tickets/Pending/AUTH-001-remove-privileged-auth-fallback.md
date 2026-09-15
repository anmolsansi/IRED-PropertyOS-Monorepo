# AUTH-001: Remove Privileged Auth Fallback

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Security  
**Complexity:** Small  
**Depends On:** None  
**Blocks:** AUTH-002, AUTH-003, AUTH-013, AUTH-015  
**Primary File:** `Backend/src/shared/guards/jwt-auth.guard.ts`

## Objective

Remove the hardcoded/default master-admin identity from request-time authentication. After this ticket, the auth guard must not contain any email address or environment-variable fallback that grants special treatment to a privileged user.

## Why This Exists

The current Clerk authentication guard defines `DEFAULT_MASTER_ADMIN_EMAIL` and `getMasterAdminEmail()`. That creates a privileged identity path based on an email address. Authentication should verify identity and load an already-provisioned PropertyOS user; it should not contain a secret or special email-based privilege rule.

## Current Behavior

In `Backend/src/shared/guards/jwt-auth.guard.ts`:

- a constant named `DEFAULT_MASTER_ADMIN_EMAIL` exists;
- `getMasterAdminEmail()` returns `MASTER_ADMIN_EMAIL` or the hardcoded fallback;
- later branches compare `normalizedEmail` with `getMasterAdminEmail()`;
- those branches are currently used for privileged auto-provisioning and auto-reactivation.

This ticket removes the fallback primitive itself. AUTH-002 and AUTH-003 remove the behavior that currently depends on it.

## Target Behavior

The guard must have no concept of a "master admin email".

The following must be true:

- no hardcoded privileged email exists in the guard;
- the guard does not read `MASTER_ADMIN_EMAIL`;
- no helper returns a privileged email;
- no email comparison decides whether a user receives special authentication treatment;
- normal Clerk token verification continues to work.

## Scope

Change only what is required to remove the privileged email fallback from request-time auth and keep the file compiling.

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`

### Files To Inspect But Not Change Unless Required

- `Backend/prisma/seed.ts`
- `.env.example`
- `Backend/.env.render.example`
- `render.yaml`

Those other locations are handled by AUTH-007 and AUTH-013.

## Required Reading

Before changing code, read:

1. `Backend/src/shared/guards/jwt-auth.guard.ts` completely.
2. `Backend/src/shared/guards/roles.guard.ts` to understand where role authorization happens after authentication.
3. `Backend/src/shared/shared.module.ts` to confirm guard registration order.

Do not start editing until you can explain this flow in your own words:

`request -> JwtAuthGuard -> RolesGuard -> OrgGuard -> GeographyGuard -> controller`

## Baseline Commands

From repository root:

```bash
npm install
npm run typecheck:backend
npm run test:backend
```

Record any pre-existing failures in the PR description before making changes.

## Architecture Contract

Authentication may determine **who the caller is**. It must not contain an email-based exception that determines **who gets privileged access**.

Do not replace the current hardcoded email with:

- a different hardcoded email;
- an array of privileged emails;
- a domain check;
- a hidden config file;
- a different environment variable;
- a Clerk email metadata check.

The desired result is **no privileged email fallback at all**.

## Step-by-Step Implementation

### Step 1 - Open the auth guard

Open:

`Backend/src/shared/guards/jwt-auth.guard.ts`

Do not modify anything yet.

### Step 2 - Find the fallback constant

Find:

`DEFAULT_MASTER_ADMIN_EMAIL`

Confirm every reference in the file.

Expected references include the helper that resolves `MASTER_ADMIN_EMAIL`.

### Step 3 - Find the helper

Find:

`getMasterAdminEmail()`

Use IDE "Find References" or repository search and confirm whether the function is referenced outside this file.

If it is referenced outside this file, stop and report the paths before continuing.

### Step 4 - Identify dependent branches

Find every expression that compares a user's email with `getMasterAdminEmail()`.

Write down the branches before editing. At the current repository state, the comparisons are part of:

- missing-user auto-provisioning;
- inactive-user auto-reactivation.

Do not redesign those flows in this ticket. AUTH-002 and AUTH-003 own those behavioral changes.

### Step 5 - Remove the privileged fallback declaration

Remove:

- `DEFAULT_MASTER_ADMIN_EMAIL`;
- `getMasterAdminEmail()`.

### Step 6 - Make the file compile without introducing a replacement fallback

Because existing branches still refer to the helper, coordinate this ticket with AUTH-002 and AUTH-003 in the same implementation PR or remove the now-invalid special branches exactly as specified by those tickets.

Do **not** temporarily replace the helper with a new privileged mechanism just to make TypeScript compile.

### Step 7 - Clean unused imports only

After the relevant privileged branches are removed, inspect imports.

If an import became unused only because of this auth-hardening work, remove it. Do not reorder or refactor unrelated imports.

### Step 8 - Search the guard again

Search this file for:

- `MASTER_ADMIN`
- `master admin`
- the previously hardcoded email value
- `getMasterAdminEmail`

Expected result: zero matches in `jwt-auth.guard.ts`.

### Step 9 - Run validation

Run:

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

Do not continue if typecheck fails because of the auth guard.

## Checkpoint

Before marking implementation complete, confirm:

- [ ] `DEFAULT_MASTER_ADMIN_EMAIL` is gone from the auth guard.
- [ ] `getMasterAdminEmail()` is gone from the auth guard.
- [ ] `MASTER_ADMIN_EMAIL` is not read by the auth guard.
- [ ] No replacement privileged-email mechanism was added.
- [ ] Backend typecheck passes.

## Tests Required

At minimum, the auth test suite introduced/expanded by AUTH-015 must assert:

1. A valid Clerk identity whose email equals the former fallback address gets no special handling.
2. Missing local user remains a missing local user.
3. Inactive local user remains inactive.
4. No email value changes authorization behavior.

If AUTH-015 has not yet been implemented, add the smallest regression test necessary to protect the removed fallback, then allow AUTH-015 to expand the matrix later.

## Manual Verification

With a local test database:

1. Start backend with Clerk auth configured or use the project's Clerk test/mocking approach.
2. Use an existing active PropertyOS account and verify normal authentication still succeeds.
3. Use a Clerk identity that has no local PropertyOS user and verify it does not receive privileged treatment.
4. Inspect the database before and after the request. This ticket must not introduce any new user or role changes.

## Acceptance Criteria

- [ ] No hardcoded privileged email exists in `JwtAuthGuard`.
- [ ] `JwtAuthGuard` does not read `MASTER_ADMIN_EMAIL`.
- [ ] No email comparison grants exceptional authentication treatment.
- [ ] Existing normal authentication flow still compiles and passes tests.
- [ ] No new fallback mechanism was introduced elsewhere to replace this one.

## Definition of Done

- [ ] Required code changes are committed.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Relevant tests pass.
- [ ] Manual verification completed.
- [ ] Reviewer confirms no privileged-email fallback remains in request-time auth.
- [ ] No unresolved STOP item remains.

## Rollback

If this change causes unexpected authentication failure, revert the implementation commit. Do not restore a hardcoded privileged email as an emergency fix. Restore access through the explicit user provisioning/bootstrap procedure defined by AUTH-008.

## Forbidden Shortcuts

Do not:

- rename the fallback and keep the same behavior;
- replace email matching with domain matching;
- store the privileged email in another file;
- disable auth checks to recover access;
- create a special `if (email === ...)` anywhere else;
- add a temporary admin bypass without reviewer approval.

## STOP - NEEDS ARCHITECT DECISION

Stop and escalate if:

- another module outside the auth guard depends on `getMasterAdminEmail()`;
- removing the special branch would leave production with no known administrator;
- the repository has changed so the current behavior no longer matches this ticket.

Do not invent a replacement privileged mechanism.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**