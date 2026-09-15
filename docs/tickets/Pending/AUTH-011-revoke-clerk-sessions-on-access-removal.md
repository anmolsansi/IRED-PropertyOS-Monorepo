# AUTH-011: Revoke Clerk Sessions When Access Is Removed

**Status:** Pending  
**Priority:** P1  
**Area:** Authentication / Session Security  
**Complexity:** Medium  
**Depends On:** AUTH-006, AUTH-010  
**Blocks:** AUTH-016, AUTH-017  
**External Dependency:** Clerk Backend API

## Objective

When an administrator suspends or deactivates a PropertyOS user, immediately remove that user's active Clerk sessions in addition to marking the local account non-active.

The PropertyOS database remains the authorization source of truth. Clerk session revocation is defense-in-depth and improves immediate sign-out behavior across devices.

## Why This Exists

After AUTH-003, an inactive/suspended user is rejected by the backend even if they still hold a valid Clerk token. That protects API authorization.

However, the user may remain visibly signed into Clerk on one or more devices until those sessions expire or are manually ended. Revoking sessions when access is removed gives operators predictable immediate access termination.

## Current Clerk API To Use

At ticket creation time, Clerk's backend SDK supports:

- `clerkClient.sessions.getSessionList({ userId })` to list sessions for a user;
- `clerkClient.sessions.revokeSession(sessionId)` to revoke a session.

Before implementation, confirm the repository's installed `@clerk/backend` version exposes the same API shape. Do not upgrade the package solely for this ticket unless required and approved.

## Critical Ordering Rule

Local authorization must fail closed even when Clerk is unavailable.

Preferred sequence:

```text
Admin requests suspension/deactivation
  -> validate user + last-admin rule
  -> commit local status = suspended/inactive
  -> local access is now denied
  -> attempt Clerk session revocation
  -> report/log external cleanup result
```

Do **not** leave the local user active merely because Clerk session revocation failed.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- optionally a small Clerk/session helper service if repository structure supports it
- user lifecycle tests
- configuration/error logging as necessary

Do not put Clerk session management into controllers.

## Required Reading

1. `Backend/src/modules/users/users.service.ts`
2. AUTH-010 implementation
3. AUTH-006 strict `clerkUserId` mapping
4. current Clerk client helper patterns already used by `UsersService`
5. backend logging/error conventions

## Architecture Contract

### Local database

Determines whether access is allowed.

### Clerk

Manages external sessions.

### Failure semantics

If local status update succeeds but Clerk revocation fails:

- return behavior must not imply the user remained active;
- local account stays non-active;
- log/record session-revocation failure for operational follow-up;
- do not roll local status back to active.

## Step-by-Step Implementation

### Step 1 - Confirm `clerkUserId` availability

AUTH-006 should make `clerkUserId` the identity mapping key.

For a user being suspended/deactivated:

- if `clerkUserId` exists, attempt session cleanup;
- if missing, local status still changes, but record that provider cleanup could not be performed.

Do not find the Clerk user by email as a fallback.

### Step 2 - Reuse the existing Clerk-client construction pattern

`UsersService` already creates a Clerk client from `CLERK_SECRET_KEY` for Clerk-managed operations.

Reuse or safely extract that logic rather than creating multiple inconsistent client factories.

If `AUTH_PROVIDER !== "clerk"`, do not call Clerk.

### Step 3 - Add a focused session-revocation helper

Create a private/service method with one responsibility, conceptually:

`revokeClerkSessions(clerkUserId)`

It should:

1. get sessions for the user;
2. identify sessions that are revocable/active according to returned status;
3. revoke each relevant session;
4. handle pagination if total sessions can exceed the SDK's returned page size;
5. return a summary such as attempted/revoked/failed counts.

Do not assume the default 10-session page contains every session.

### Step 4 - Handle pagination correctly

Clerk session-list responses are paginated.

Use a safe page size supported by the installed SDK and continue until all relevant sessions are inspected.

Do not create an infinite pagination loop. Advance offset by the number/page size processed and stop when all results are exhausted.

### Step 5 - Decide which local transitions trigger revocation

Revoke sessions when the target transitions to:

- `suspended`;
- `inactive`.

Do not revoke sessions when:

- updating profile information;
- changing geography only;
- activating/reactivating a user.

If role demotion from ADMIN to WORKER should force session refresh, that is a separate decision; the backend already reads current role on every API request. Do not expand scope without approval.

### Step 6 - Apply local status first

Use AUTH-010's lifecycle method.

Once the DB status is committed non-active, backend authorization is immediately closed.

Then call Clerk cleanup.

### Step 7 - Handle Clerk failures safely

Catch provider errors around session listing/revocation.

Log:

- internal PropertyOS user ID;
- safe error category;
- number of sessions attempted if known;
- request ID if available.

Do not log:

- `CLERK_SECRET_KEY`;
- session tokens;
- bearer tokens;
- full authorization headers.

### Step 8 - Define API response behavior

The status operation must clearly indicate the local account was changed even if provider cleanup had a problem.

Use the repository's response/error conventions. Do not return a 500 that encourages clients to retry status changes blindly if the local status already succeeded unless the API contract explicitly models partial external cleanup.

A reasonable internal service result is:

```text
user status updated
session cleanup: success | partial | skipped | failed
```

Do not expose unnecessary provider internals to normal clients.

### Step 9 - Make revocation idempotent

Calling the cleanup helper again should be safe.

Already revoked/expired sessions must not cause local reactivation or data corruption.

### Step 10 - Add tests with mocked Clerk client

Do not make unit tests call real Clerk.

Mock:

- `getSessionList()`;
- `revokeSession()`.

### Step 11 - Run validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Tests Required

### Test 1 - suspend mapped Clerk user

Expected:

- local status becomes suspended;
- sessions are listed;
- active sessions are revoked.

### Test 2 - deactivate mapped Clerk user

Same cleanup behavior.

### Test 3 - reactivate user

Expected: no session revocation call.

### Test 4 - Clerk unavailable

Expected:

- local status remains suspended/inactive;
- cleanup failure is logged/returned internally;
- local status is not rolled back.

### Test 5 - no `clerkUserId`

Expected:

- local status changes;
- Clerk call skipped;
- safe warning/summary produced.

### Test 6 - multiple pages of sessions

Expected: every relevant session across pages is processed.

### Test 7 - one revoke fails, others continue

Expected:

- remaining sessions are attempted;
- failure count recorded;
- local account remains non-active.

### Test 8 - last-admin rejection

If AUTH-009 rejects the status transition, Clerk session revocation must not run because the user was not actually suspended/deactivated.

## Manual Verification

Using a non-production test Clerk user with two browser/device sessions:

1. sign in on Browser A;
2. sign in on Browser B;
3. confirm both can access PropertyOS;
4. suspend user from administrator account;
5. confirm subsequent API requests are denied immediately;
6. refresh Browser A and Browser B;
7. verify Clerk sessions were revoked/sign-in is required;
8. reactivate user;
9. confirm they must sign in again before access returns.

## Acceptance Criteria

- [ ] Suspend/deactivate closes local authorization first.
- [ ] Clerk sessions are revoked for mapped users.
- [ ] Provider failure cannot reactivate or preserve local access.
- [ ] Pagination is handled.
- [ ] No token/secret data is logged.
- [ ] Unit tests mock Clerk and cover partial failure.

## Definition of Done

- [ ] Implementation complete.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Multi-session manual test passes in test environment.
- [ ] Reviewer confirms local DB remains source of truth.

## Rollback

If Clerk session cleanup is unstable, disable/remove only the provider cleanup portion while preserving local suspension/deactivation. Never roll back the local status security behavior merely because external sign-out is failing.

## Forbidden Shortcuts

Do not:

- set local user back to active when Clerk fails;
- delete the Clerk user as a substitute for session revocation;
- use email to locate provider identity;
- revoke only the first session returned;
- log session/token values;
- call Clerk from frontend admin UI using secret credentials.

## STOP - NEEDS ARCHITECT DECISION

Stop if the installed Clerk SDK lacks a supported backend session-list/revoke mechanism or if production intentionally uses another session provider. Confirm current provider APIs before inventing a raw HTTP integration.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Manual Multi-Session Test:** Pass / Fail  
**Notes:**