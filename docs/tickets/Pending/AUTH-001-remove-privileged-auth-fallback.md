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

## Junior Engineer Orientation

This ticket is intentionally narrow. You are **not** being asked to redesign authentication, Clerk, roles, organizations, geography, or the user-management system.

You are removing one unsafe idea from request authentication:

```text
"If this person's email equals a special email, treat them differently."
```

That idea must disappear from the request-time authentication guard.

The important mental model is:

```text
Authentication = prove who the caller is.
Authorization = decide what an already-provisioned caller may do.
Provisioning = intentionally create/configure the caller's PropertyOS account.
```

A hardcoded or environment-configured "master admin email" mixes these responsibilities. The email itself becomes a hidden privilege rule. This ticket removes that hidden privilege rule.

Do not try to solve every auth-hardening problem in this ticket. AUTH-002 removes user creation during login, AUTH-003 removes auto-reactivation, AUTH-006 later makes Clerk ID the strict identity join key, and AUTH-008 provides the explicit first-admin bootstrap.

## Why This Exists

The current Clerk authentication guard defines `DEFAULT_MASTER_ADMIN_EMAIL` and `getMasterAdminEmail()`. That creates a privileged identity path based on an email address. Authentication should verify identity and load an already-provisioned PropertyOS user; it should not contain a secret or special email-based privilege rule.

A future engineer debugging login could otherwise accidentally preserve or recreate the bypass because the code looks convenient: "If this is the owner's email, let them in." That is exactly the behavior this ticket prevents.

## Current Behavior

In `Backend/src/shared/guards/jwt-auth.guard.ts`:

- a constant named `DEFAULT_MASTER_ADMIN_EMAIL` exists;
- `getMasterAdminEmail()` returns `MASTER_ADMIN_EMAIL` or the hardcoded fallback;
- later branches compare `normalizedEmail` with `getMasterAdminEmail()`;
- those branches are currently used for privileged auto-provisioning and auto-reactivation.

This ticket removes the fallback primitive itself. AUTH-002 and AUTH-003 remove the behavior that currently depends on it.

### Current control-flow picture

```text
Request
  -> verify Clerk token
  -> obtain Clerk email
  -> load PropertyOS user
  -> special comparison: email == master-admin email?
       -> privileged behavior may occur
```

The highlighted special comparison is the thing this ticket eliminates.

## Target Behavior

The guard must have no concept of a "master admin email".

The following must be true:

- no hardcoded privileged email exists in the guard;
- the guard does not read `MASTER_ADMIN_EMAIL`;
- no helper returns a privileged email;
- no email comparison decides whether a user receives special authentication treatment;
- normal Clerk token verification continues to work;
- a normal active user that was valid before this ticket remains valid after it;
- a missing/inactive user is not made more privileged because of their email value.

### Target control-flow picture

```text
Request
  -> verify identity
  -> load the already-provisioned PropertyOS user
  -> evaluate normal account state
  -> continue or reject

There is no "special email" branch.
```

## Scope

Change only what is required to remove the privileged email fallback from request-time auth and keep the file compiling.

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- focused auth-guard test file if regression coverage is added in the same PR

### Files To Inspect But Not Change Unless Required

- `Backend/prisma/seed.ts`
- `.env.example`
- `Backend/.env.render.example`
- `render.yaml`

Those other locations are handled by AUTH-007 and AUTH-013.

### Explicitly Out Of Scope

Do not use this ticket to:

- redesign the entire Clerk integration;
- change JWT legacy authentication behavior unrelated to the fallback;
- redesign role names;
- add tenant isolation;
- add a new admin recovery endpoint;
- remove `MASTER_ADMIN_*` from every deployment file before AUTH-007/AUTH-008 are ready;
- convert all user lookup to `clerkUserId` before AUTH-005/AUTH-006.

## Required Reading

Before changing code, read:

1. `Backend/src/shared/guards/jwt-auth.guard.ts` completely.
2. `Backend/src/shared/guards/roles.guard.ts` to understand where role authorization happens after authentication.
3. `Backend/src/shared/shared.module.ts` to confirm guard registration order.
4. `docs/tickets/TICKET_DETAIL_STANDARD.md` so the test/PR evidence requirements are understood.

Do not start editing until you can explain this flow in your own words:

`request -> JwtAuthGuard -> RolesGuard -> OrgGuard -> GeographyGuard -> controller`

You should also be able to answer these questions before editing:

- Which guard proves/loads the caller?
- Which guard checks route roles?
- Why should an email string not grant a role?
- Which later tickets own user creation/reactivation behavior?

If you cannot answer those four questions after reading the files, reread them before changing code.

## Baseline Commands

From repository root:

```bash
npm install
npm run typecheck:backend
npm run test:backend
```

Record any pre-existing failures in the PR description before making changes.

### Why baseline commands matter

If the repository already has a failing test before your change, you need to distinguish an existing problem from a regression you introduced. Never hide a pre-existing failure, but also do not claim your ticket caused it without evidence.

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

### Invariant this ticket establishes

For two otherwise identical authentication attempts, changing only the email string must not turn a rejected caller into a privileged caller.

That means:

```text
same valid identity state + same local-user state + different email text
=> same authorization outcome
```

Later AUTH-006 will make the provider ID, not email, the strict identity mapping key.

## Step-by-Step Implementation

### Step 1 - Open the auth guard

Open:

`Backend/src/shared/guards/jwt-auth.guard.ts`

Do not modify anything yet.

**Why:** You need to see the fallback in context before deleting it. Removing one declaration without understanding the dependent branches can leave uncompilable or partially privileged behavior behind.

**Verify before continuing:** You can identify token verification, user lookup, missing-user behavior, inactive-user behavior, and where `request.user` is assigned.

### Step 2 - Find the fallback constant

Find:

`DEFAULT_MASTER_ADMIN_EMAIL`

Confirm every reference in the file.

Expected references include the helper that resolves `MASTER_ADMIN_EMAIL`.

**Why:** The goal is to remove the entire primitive, not only the visible comparison.

**Verify before continuing:** IDE/repository search shows every reference you expect and you have not yet edited anything.

### Step 3 - Find the helper

Find:

`getMasterAdminEmail()`

Use IDE "Find References" or repository search and confirm whether the function is referenced outside this file.

If it is referenced outside this file, stop and report the paths before continuing.

**Why:** If another production module depends on the helper, deleting it may change behavior outside the approved ticket scope.

### Step 4 - Identify dependent branches

Find every expression that compares a user's email with `getMasterAdminEmail()`.

Write down the branches before editing. At the current repository state, the comparisons are part of:

- missing-user auto-provisioning;
- inactive-user auto-reactivation.

Do not redesign those flows in this ticket. AUTH-002 and AUTH-003 own those behavioral changes.

**Verify before continuing:** You can point to every special-email branch and describe what mutation it currently performs.

### Step 5 - Remove the privileged fallback declaration

Remove:

- `DEFAULT_MASTER_ADMIN_EMAIL`;
- `getMasterAdminEmail()`.

**Why:** There should be no reusable helper a future branch can call to recover the old special-email behavior.

### Step 6 - Make the file compile without introducing a replacement fallback

Because existing branches still refer to the helper, coordinate this ticket with AUTH-002 and AUTH-003 in the same implementation PR or remove the now-invalid special branches exactly as specified by those tickets.

Do **not** temporarily replace the helper with a new privileged mechanism just to make TypeScript compile.

**Correct response to a compile error:** Complete/remove the dependent special branches according to AUTH-002/AUTH-003.

**Incorrect response:** Add `const masterEmail = process.env.SOMETHING_ELSE` and keep the branch alive.

### Step 7 - Clean unused imports only

After the relevant privileged branches are removed, inspect imports.

If an import became unused only because of this auth-hardening work, remove it. Do not reorder or refactor unrelated imports.

**Why:** Keep the PR reviewable. This is a security behavior change, not a style-cleanup PR.

### Step 8 - Search the guard again

Search this file for:

- `MASTER_ADMIN`
- `master admin`
- the previously hardcoded email value
- `getMasterAdminEmail`

Expected result: zero matches in `jwt-auth.guard.ts`.

Also search for suspicious equivalent patterns such as:

- `email ===`
- `normalizedEmail ===`
- email allowlist arrays

Review any match manually. A comparison can be legitimate, but no email comparison may create privileged authentication behavior.

### Step 9 - Run validation

Run:

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

Do not continue if typecheck fails because of the auth guard.

### Step 10 - Inspect the final diff

Before committing, read the final diff line by line.

Confirm the diff does **not** contain:

- a renamed fallback;
- new environment-variable privilege logic;
- unrelated auth refactoring;
- weakened status/role checks;
- deleted tests used only to make CI pass.

## Checkpoint

Before marking implementation complete, confirm:

- [ ] `DEFAULT_MASTER_ADMIN_EMAIL` is gone from the auth guard.
- [ ] `getMasterAdminEmail()` is gone from the auth guard.
- [ ] `MASTER_ADMIN_EMAIL` is not read by the auth guard.
- [ ] No replacement privileged-email mechanism was added.
- [ ] No email value can turn a missing/inactive account into a privileged account.
- [ ] Normal active-user authentication still follows the existing supported path.
- [ ] Backend typecheck passes.

## Detailed Test Specification

If AUTH-015 already exists, add these scenarios there. If AUTH-015 is not yet implemented, add focused regression coverage now and allow AUTH-015 to consolidate/expand it later.

### TEST-AUTH001-01: Former privileged email cannot bypass missing local user

**Purpose:** Prove that the old special email no longer grants access or special handling.

**Level:** Unit/regression test of `JwtAuthGuard`.

**Setup:**

- `AUTH_PROVIDER=clerk`;
- Clerk token verification succeeds;
- provider identity is valid;
- use a fake test email representing the *former privileged-email scenario* (do not use a real person's email in the test fixture);
- Prisma local-user lookup returns `null`;
- spies exist for `prisma.user.create`, `prisma.user.update`, and `prisma.user.upsert` if the mock shape supports them.

**Action:** Execute `canActivate()` for a protected route with the valid test bearer token.

**Expected Result:** Authentication is rejected using the same missing-user behavior as any other unprovisioned identity.

**Required Assertions:**

- guard does not return success;
- no local user is created;
- no local user is updated;
- no `ADMIN` role is assigned;
- `request.user` is not populated with a privileged synthetic user.

**Why This Test Exists:** This is the exact regression the ticket is designed to prevent. Without it, a future engineer could re-add a "master email" branch while fixing a login issue.

**If This Test Fails:** Inspect `jwt-auth.guard.ts` for any email comparison, allowlist, fallback helper, missing-user creation branch, or exception path that continues after the user lookup returns null. Do **not** weaken the expected rejection.

### TEST-AUTH001-02: Changing only email text does not change missing-user outcome

**Purpose:** Prove email content itself is not a privilege signal.

**Level:** Unit/regression.

**Setup:** Run the same missing-local-user scenario twice. Keep token validity/provider ID/local DB result identical; vary only the provider/profile email string if that data is still present in the pre-AUTH-006 test seam.

**Action:** Attempt authentication for both cases.

**Expected Result:** Both attempts have the same rejection outcome.

**Required Assertions:**

- both are rejected;
- both perform zero privilege/user writes;
- there is no branch-specific admin behavior for either email.

**Why This Test Exists:** It tests the architecture invariant rather than only one known string. A future developer cannot bypass the test by replacing the old email with another hardcoded email.

**If This Test Fails:** Search for any email-based branching that changes missing-user, inactive-user, role, or status behavior.

### TEST-AUTH001-03: Existing active user still authenticates normally

**Purpose:** Ensure removing the fallback does not break legitimate users.

**Level:** Unit/regression.

**Setup:**

- valid Clerk verification;
- local PropertyOS user exists;
- `status=active`;
- use a non-special fake email/identity;
- local role can be `WORKER` for this test.

**Action:** Execute the guard.

**Expected Result:** Authentication succeeds according to the currently approved normal path.

**Required Assertions:**

- guard returns success;
- `request.user` is the existing local user;
- role/status remain unchanged;
- no user creation or privilege mutation occurs.

**Why This Test Exists:** Security fixes should remove the bypass without accidentally removing ordinary authentication.

**If This Test Fails:** Check whether the implementation deleted normal user lookup/status logic together with the special branch. Restore normal flow, not the privileged fallback.

### TEST-AUTH001-04: Inactive user with former privileged-email scenario stays inactive

**Purpose:** Prevent the old fallback from surviving indirectly through the reactivation path.

**Level:** Unit/regression, coordinated with AUTH-003.

**Setup:**

- valid identity;
- existing local user;
- `status=inactive`;
- role may be `ADMIN` to reproduce the highest-risk case;
- capture initial role, status, and `deactivatedAt`.

**Action:** Attempt authentication.

**Expected Result:** Request is rejected and account state is unchanged.

**Required Assertions:**

- status remains `inactive`;
- role remains unchanged;
- `deactivatedAt` remains unchanged;
- no update call sets the user to active.

**Why This Test Exists:** Merely deleting the fallback declaration is insufficient if equivalent privileged handling remains in another branch.

**If This Test Fails:** Complete AUTH-003 behavior. Do not create a replacement exception for administrators.

### TEST-AUTH001-05: Static/repository search finds no request-time master-admin primitive

**Purpose:** Catch the primitive being moved/renamed rather than truly removed.

**Level:** Manual/static verification.

**Setup:** Updated branch after code changes.

**Action:** Search request-time auth code for `MASTER_ADMIN`, `master admin`, known fallback strings, and suspicious email privilege comparisons.

**Expected Result:** No active request-auth implementation uses a master-admin email mechanism.

**Required Assertions:** Record the search command/result in the PR evidence. Historical tickets/docs may still mention the old concept; executable request-auth code may not.

**Why This Test Exists:** Unit tests can miss a dormant fallback path that is not reached by the chosen fixture.

**If This Test Fails:** Inspect every result. Remove active fallback code or escalate if another supported subsystem truly owns the reference.

## Manual Verification

With a local test database:

1. Start backend with Clerk auth configured or use the project's Clerk test/mocking approach.
2. Use an existing active PropertyOS account and verify normal authentication still succeeds.
3. Use a Clerk identity that has no local PropertyOS user and verify it does not receive privileged treatment.
4. Inspect the database before and after the request. This ticket must not introduce any new user or role changes.
5. Repeat a missing-user attempt using a different fake email/profile value and confirm the outcome is identical.
6. If AUTH-003 is implemented in the same PR, repeat with an inactive admin fixture and confirm it remains inactive.

## Failure Diagnosis Guide

### TypeScript says `getMasterAdminEmail` is missing

Most likely cause: you deleted the helper before deleting/rewriting the branches that call it.

Correct response: complete the dependent special-branch removals described by AUTH-002/AUTH-003 or coordinate those tickets in the same PR.

Incorrect response: recreate the helper under another name.

### Existing active users can no longer authenticate

Most likely cause: normal user lookup/status logic was removed together with the special branch.

Inspect the diff and restore the normal path. Do not restore the fallback.

### Missing user still gets created

AUTH-002 is not complete or an equivalent provisioning call remains. The test is revealing a real security problem. Do not change the test to permit creation.

### Inactive admin becomes active

AUTH-003 is not complete or another reactivation path exists. Do not special-case admins.

### Tests need a real personal email to reproduce behavior

They do not. Use a fake `example.test` email and model the old branch condition through the relevant mock/test seam. Tests must not depend on real personal data.

## PR Evidence Required

Put the following in the PR description:

- exact files changed;
- before/after auth-flow summary in 3-6 lines;
- repository-search result showing no `MASTER_ADMIN` primitive in request-time auth;
- commands run (`typecheck`, `lint`, tests) and pass/fail result;
- names of the regression tests added/updated;
- confirmation that active-user normal auth was manually/automatically verified;
- confirmation that missing-user auth performed zero user writes;
- any pre-existing failures clearly separated from new failures.

Do not include real emails, tokens, secrets, or production identity exports.

## Acceptance Criteria

- [ ] No hardcoded privileged email exists in `JwtAuthGuard`.
- [ ] `JwtAuthGuard` does not read `MASTER_ADMIN_EMAIL`.
- [ ] No email comparison grants exceptional authentication treatment.
- [ ] Existing normal authentication flow still compiles and passes tests.
- [ ] No new fallback mechanism was introduced elsewhere to replace this one.
- [ ] Detailed regression tests prove email text cannot create privileged behavior.
- [ ] Missing/inactive user state is not mutated by the removed fallback behavior.

## Definition of Done

- [ ] Required code changes are committed.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Relevant tests pass.
- [ ] Detailed test assertions include negative DB-write checks where applicable.
- [ ] Manual verification completed.
- [ ] Required PR evidence is present.
- [ ] Reviewer confirms no privileged-email fallback remains in request-time auth.
- [ ] No unresolved STOP item remains.

## Rollback

If this change causes unexpected authentication failure, revert the implementation commit. Do not restore a hardcoded privileged email as an emergency fix. Restore access through the explicit user provisioning/bootstrap procedure defined by AUTH-008.

Before rollback, determine whether the failure is actually missing user provisioning/mapping. If so, correct the data/provisioning problem rather than reintroducing the bypass.

## Forbidden Shortcuts

Do not:

- rename the fallback and keep the same behavior;
- replace email matching with domain matching;
- store the privileged email in another file;
- disable auth checks to recover access;
- create a special `if (email === ...)` anywhere else;
- add a temporary admin bypass without reviewer approval;
- delete/relax a regression test because the old bypass makes it fail;
- use real personal identity data in test fixtures.

## STOP - NEEDS ARCHITECT DECISION

Stop and escalate if:

- another module outside the auth guard depends on `getMasterAdminEmail()`;
- removing the special branch would leave production with no known administrator;
- the repository has changed so the current behavior no longer matches this ticket;
- normal production authentication intentionally relies on an email allowlist outside this documented fallback.

Do not invent a replacement privileged mechanism.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Tests Added/Updated:**  
**Manual Verification:** Pass / Fail  
**Notes:**