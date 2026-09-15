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

## Junior Engineer Orientation

This ticket deals with two different security layers that must not be confused:

```text
PropertyOS DB status
  -> decides whether backend access is allowed

Clerk session
  -> decides whether the user is still signed in at the identity provider
```

The most important ordering rule is:

```text
Remove PropertyOS access first.
Then try to revoke Clerk sessions.
```

If Clerk is temporarily down, the user must still be unable to use PropertyOS because the local account is already `inactive` or `suspended`.

Do not design the system so an external API outage keeps a locally disabled employee active.

## Why This Exists

After AUTH-003, an inactive/suspended user is rejected by the backend even if they still hold a valid Clerk token. That protects API authorization.

However, the user may remain visibly signed into Clerk on one or more devices until those sessions expire or are manually ended. Revoking sessions when access is removed gives operators predictable immediate sign-out behavior and reduces confusion.

## Current Clerk API To Use

At ticket creation time, the backend Clerk SDK is expected to support session listing and revocation operations similar to:

- list sessions for a user;
- revoke a specific session.

Before implementation, inspect the **installed** `@clerk/backend` version and TypeScript types. Do not blindly copy API names from this ticket if the SDK version differs.

If the installed SDK does not expose a supported mechanism, stop and escalate before upgrading packages or writing raw HTTP calls.

## Critical Ordering Rule

Preferred sequence:

```text
Admin requests suspension/deactivation
  -> validate target + last-admin rule
  -> commit local status = suspended/inactive
  -> PropertyOS access is now denied
  -> attempt Clerk session revocation
  -> record cleanup result
```

Never use this sequence:

```text
revoke Clerk sessions
  -> provider call fails
  -> keep local user active
```

That is fail-open behavior and is prohibited.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- optionally a small Clerk/session helper service if repository structure supports it
- user lifecycle tests
- safe logging/error handling as needed

Do not put Clerk secret/session management into controllers or frontend code.

## Required Reading

1. `Backend/src/modules/users/users.service.ts`
2. completed AUTH-010 lifecycle implementation
3. completed AUTH-006 strict `clerkUserId` mapping
4. current Clerk client construction patterns in `UsersService`
5. backend logging/error conventions
6. installed `@clerk/backend` types for session operations
7. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before editing, be able to explain why local status must remain non-active even when session revocation fails.

## Architecture Contract

### Local database

Determines whether access is allowed.

### Clerk

Manages external identity-provider sessions.

### Failure semantics

If local status update succeeds but Clerk cleanup fails:

- local account stays non-active;
- backend requests remain denied;
- provider cleanup failure is safely recorded/logged;
- local status is **not** rolled back;
- operation/result must not mislead operators into thinking the account stayed active.

### Trigger semantics

Session revocation occurs on successful transition to:

- `suspended`;
- `inactive`.

It does not occur for:

- reactivation;
- profile edits;
- geography changes;
- role changes alone unless separately approved later.

## Step-by-Step Implementation

### Step 1 - Confirm identity mapping source

AUTH-006 should make `clerkUserId` the provider identity key.

For a user being suspended/deactivated:

- if `clerkUserId` exists, use it directly;
- if missing, keep the local status transition but skip provider cleanup with a safe failure/skip result;
- do not look up the provider identity by email as fallback.

### Step 2 - Reuse existing Clerk-client construction

`UsersService` already has Clerk client behavior for user operations.

Reuse or extract a small helper if it reduces duplication.

Do not create several independent `createClerkClient` patterns with different configuration/error behavior.

If `AUTH_PROVIDER !== "clerk"`, skip Clerk cleanup deliberately and test that behavior.

### Step 3 - Create a focused revocation helper

Create a private/service helper with one responsibility, conceptually:

```text
revokeClerkSessions(clerkUserId)
```

It should return a structured internal result such as:

```text
status: success | partial | skipped | failed
sessionsSeen: N
sessionsAttempted: N
sessionsRevoked: N
sessionsFailed: N
```

Exact structure may follow repository conventions.

### Step 4 - List all relevant sessions

Use the installed SDK's supported pagination interface.

Do not assume the first page is complete.

Inspect response fields/types to determine:

- page size;
- offset/cursor;
- total count/end condition;
- session status values.

### Step 5 - Revoke only sessions that require revocation

Use provider session status semantics from the installed SDK/docs/types.

Do not repeatedly revoke sessions already revoked/ended if unnecessary.

Expired/ended sessions should be safely skipped according to provider behavior.

### Step 6 - Implement pagination termination carefully

Ensure each loop advances and terminates.

Protect against:

- empty page with misleading total;
- provider returning fewer than requested;
- cursor/offset not advancing;
- accidentally refetching the first page forever.

### Step 7 - Apply local lifecycle transition first

Use AUTH-010 central lifecycle method.

Only after the status change succeeds should provider session cleanup run.

If lifecycle change is rejected, such as last-admin protection, do not call Clerk cleanup.

### Step 8 - Handle provider listing failure

If listing sessions throws:

- keep local status non-active;
- return/record cleanup `failed` according to service contract;
- log safe provider error category;
- do not reactivate user.

### Step 9 - Handle individual revocation failure

If one session revoke fails:

- continue attempting remaining sessions where reasonable;
- count failure;
- return `partial`/`failed` summary;
- keep local status non-active.

Do not stop at first failure unless SDK/provider semantics require it and reviewer approves that choice.

### Step 10 - Define response/API behavior

The user lifecycle API should distinguish:

```text
local lifecycle success
from
provider cleanup status
```

Do not return a response that implies the local suspension failed when it actually succeeded.

Use repository conventions and avoid leaking provider internals to normal clients.

### Step 11 - Keep logs safe

Logs may include:

- PropertyOS user ID;
- cleanup result/category;
- session counts;
- request ID.

Do not log:

- session tokens;
- bearer tokens;
- authorization headers;
- Clerk secret key;
- raw provider payloads containing sensitive values.

### Step 12 - Make helper idempotent

Calling cleanup twice must be safe.

Already-revoked/ended sessions should not turn the operation into a local failure or change account status.

### Step 13 - Add tests with mocked Clerk client

Unit/service tests must not call real Clerk.

Mock session listing/revocation responses, pagination, partial failure, provider disabled mode, and missing `clerkUserId`.

### Step 14 - Add a test-environment multi-session manual verification

Use a non-production Clerk test user with at least two sessions/devices.

### Step 15 - Run validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Detailed Test Specification

### TEST-AUTH011-01: Suspending a mapped Clerk user revokes active sessions

**Purpose:** Prove the normal temporary-access-removal path signs the user out externally.

**Level:** Service unit test.

**Setup:** Active mapped WORKER with `clerkUserId`; lifecycle update succeeds; mocked Clerk returns two active sessions; revocation succeeds for both.

**Action:** Suspend the user.

**Expected Result:** Local status becomes suspended, then both sessions are revoked.

**Required Assertions:**

- local update occurs before provider cleanup in observable service sequence where testable;
- session listing called with exact `clerkUserId`;
- revoke called for both session IDs;
- result reports success/counts;
- local status remains suspended.

**Why This Test Exists:** It validates the main behavior and ordering boundary.

**If This Test Fails:** Check whether cleanup is triggered for suspension and whether identity uses `clerkUserId` rather than email.

### TEST-AUTH011-02: Deactivating a mapped Clerk user revokes sessions

**Purpose:** Cover permanent access removal.

**Level:** Service.

**Setup:** Active mapped user, one active session.

**Action:** Deactivate.

**Expected Result:** Local inactive; provider session revoked.

**Required Assertions:** Same ordering/security assertions as suspension.

**Why This Test Exists:** Both non-active target states require external cleanup.

**If This Test Fails:** Trigger logic may only handle `suspended`.

### TEST-AUTH011-03: Reactivation does not revoke sessions

**Purpose:** Ensure cleanup is tied only to access removal.

**Level:** Service.

**Setup:** Suspended user.

**Action:** Reactivate.

**Expected Result:** Local active; no session-list/revoke call.

**Required Assertions:** Clerk session methods uncalled.

**Why This Test Exists:** Revoke-on-every-status-change would create confusing/incorrect behavior.

**If This Test Fails:** Narrow trigger condition to target non-active states.

### TEST-AUTH011-04: Local lifecycle rejection prevents Clerk revocation

**Purpose:** Ensure provider side effects happen only after a valid local transition.

**Level:** Service.

**Setup:** Sole active ADMIN; AUTH-009 rejects suspension.

**Action:** Suspend.

**Expected Result:** Local operation rejected.

**Required Assertions:** No Clerk list/revoke calls.

**Why This Test Exists:** You should not terminate provider sessions for a status change that never happened.

**If This Test Fails:** Move cleanup after successful lifecycle commit.

### TEST-AUTH011-05: Clerk listing failure does not restore local access

**Purpose:** Protect fail-closed behavior when external provider is unavailable.

**Level:** Service.

**Setup:** Worker suspension local update succeeds; `getSessionList` throws.

**Action:** Suspend worker.

**Expected Result:** Worker remains suspended; cleanup result records failure.

**Required Assertions:** No code updates status back to active; safe log emitted; response/service result reflects local success + cleanup failure.

**Why This Test Exists:** External outage must never keep a disabled employee authorized.

**If This Test Fails:** Remove rollback/reactivation behavior around provider errors.

### TEST-AUTH011-06: One revocation failure does not stop remaining session attempts

**Purpose:** Maximize cleanup during partial provider failure.

**Level:** Service.

**Setup:** Three active sessions; first revoke succeeds, second fails, third succeeds.

**Action:** Suspend/deactivate.

**Expected Result:** All relevant sessions are attempted; result is partial with correct counts; local account non-active.

**Required Assertions:** Third revoke still called after second failure.

**Why This Test Exists:** A single broken session should not leave every other device active unnecessarily.

**If This Test Fails:** Catch per-session failures at appropriate granularity.

### TEST-AUTH011-07: Pagination processes every page exactly once

**Purpose:** Prevent missing sessions on users with many devices/sessions.

**Level:** Unit/service.

**Setup:** Mock at least two pages with known sessions and deterministic pagination metadata.

**Action:** Run revocation helper.

**Expected Result:** Every relevant session across pages is seen/revoked once.

**Required Assertions:** Correct offset/cursor sequence; no duplicate revoke; loop terminates.

**Why This Test Exists:** Provider APIs commonly default to a limited first page.

**If This Test Fails:** Review termination/advance logic against installed SDK response shape.

### TEST-AUTH011-08: Empty final page terminates safely

**Purpose:** Protect against infinite loops/bad end handling.

**Level:** Unit.

**Setup:** Page sequence ends with empty data according to mocked provider semantics.

**Action:** Run helper.

**Expected Result:** Helper exits normally.

**Required Assertions:** Bounded list calls; no infinite repetition.

**Why This Test Exists:** Pagination bugs can hang a user-deactivation request.

**If This Test Fails:** Add a robust end condition and advance guard.

### TEST-AUTH011-09: Missing `clerkUserId` does not trigger email fallback

**Purpose:** Preserve strict identity architecture.

**Level:** Service.

**Setup:** Active local user with `clerkUserId=null`.

**Action:** Suspend/deactivate.

**Expected Result:** Local status changes; provider cleanup marked skipped/unavailable.

**Required Assertions:** No Clerk user lookup by email; no session call; local access remains removed.

**Why This Test Exists:** Lifecycle cleanup must not reintroduce email-based identity matching.

**If This Test Fails:** Remove email fallback and resolve mapping separately through AUTH-005.

### TEST-AUTH011-10: Non-Clerk auth mode skips Clerk cleanup

**Purpose:** Avoid unnecessary provider calls in environments using another supported auth mode.

**Level:** Service.

**Setup:** `AUTH_PROVIDER` not `clerk`; user lifecycle transition valid.

**Action:** Suspend/deactivate.

**Expected Result:** Local state changes; Clerk methods not called; cleanup result skipped.

**Required Assertions:** No provider secret requirement introduced.

**Why This Test Exists:** The backend retains a legacy JWT mode and this feature should respect provider configuration.

**If This Test Fails:** Gate external cleanup by configured provider.

### TEST-AUTH011-11: Already-ended/revoked sessions are handled idempotently

**Purpose:** Ensure retries do not turn safe cleanup into errors.

**Level:** Service.

**Setup:** Provider returns mixed active and already-ended/revoked session statuses according to SDK types.

**Action:** Run cleanup twice.

**Expected Result:** Active sessions revoked; ended ones skipped safely; second run succeeds/skips without local changes.

**Required Assertions:** No attempt to reactivate or create sessions.

**Why This Test Exists:** Operators/retries may repeat cleanup.

**If This Test Fails:** Make provider status handling idempotent.

### TEST-AUTH011-12: Local update failure means no provider revocation

**Purpose:** Prevent external sign-out when PropertyOS failed to commit the requested lifecycle state.

**Level:** Service.

**Setup:** Lifecycle DB update throws after validation but before commit.

**Action:** Suspend/deactivate.

**Expected Result:** Operation fails; Clerk cleanup not called.

**Required Assertions:** Session methods uncalled.

**Why This Test Exists:** Provider side effect must follow confirmed local state transition.

**If This Test Fails:** Cleanup is happening too early.

### TEST-AUTH011-13: Logs contain counts/reason but no tokens/secrets

**Purpose:** Make cleanup observable without increasing credential exposure.

**Level:** Unit/logging test.

**Setup:** Fake sensitive session/token strings in mocked provider errors/results.

**Action:** Trigger success and failure cleanup paths.

**Expected Result:** Logs contain safe user ID/result/count information only.

**Required Assertions:** Secret/session token strings absent from captured logs.

**Why This Test Exists:** Session-management code handles sensitive provider objects.

**If This Test Fails:** Sanitize log payloads and avoid raw provider object/error serialization.

## Manual Verification

Using a non-production test Clerk user with two browser/device sessions:

1. sign in on Browser A;
2. sign in on Browser B;
3. confirm both can access PropertyOS;
4. suspend user from administrator account;
5. confirm subsequent PropertyOS API requests are denied immediately;
6. refresh Browser A and Browser B;
7. verify Clerk sessions were revoked/sign-in is required;
8. reactivate user;
9. confirm reactivation does not magically restore old revoked sessions;
10. sign in again and verify access works;
11. repeat with deactivation;
12. optionally simulate provider cleanup failure in test environment and verify local denial remains effective.

## Failure Diagnosis Guide

### User stays active when Clerk API fails

This is a critical ordering bug. Local lifecycle must commit first and never roll back to active because of provider cleanup failure.

### Only one browser is logged out

Inspect pagination and all-session iteration. Do not assume first provider response contains every session.

### Last admin gets signed out even though suspension was rejected

Provider cleanup is executing before local lifecycle validation/commit. Move it after successful transition.

### Missing `clerkUserId` causes email lookup

Remove fallback. Strict identity mapping must remain intact.

### API returns generic 500 after local suspension succeeded and clients retry repeatedly

Review partial-success response/error contract. Avoid encouraging duplicate lifecycle mutations when local state is already secure.

## PR Evidence Required

Include:

- installed Clerk session API shape verified;
- provider cleanup helper design/result structure;
- ordering explanation: local commit before provider cleanup;
- detailed unit test results including pagination/partial failure;
- proof no email fallback exists;
- safe-log test result;
- non-production two-session manual verification result;
- validation commands/results.

## Acceptance Criteria

- [ ] Suspend/deactivate closes local authorization first.
- [ ] Clerk sessions are revoked for mapped users.
- [ ] Provider failure cannot reactivate or preserve local access.
- [ ] Last-admin/local-transition rejection prevents provider side effects.
- [ ] Pagination/end conditions are handled and tested.
- [ ] Missing mapping does not trigger email fallback.
- [ ] Non-Clerk mode skips provider cleanup safely.
- [ ] No token/secret data is logged.
- [ ] Unit tests cover full/partial/skipped/failure results.

## Definition of Done

- [ ] Implementation complete.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Detailed tests pass.
- [ ] Multi-session manual test passes in test environment.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms local DB remains source of truth and ordering is fail-closed.

## Rollback

If Clerk session cleanup is unstable, disable/remove only the provider cleanup portion while preserving local suspension/deactivation. Never roll back local status security behavior merely because external sign-out is failing.

## Forbidden Shortcuts

Do not:

- set local user back to active when Clerk fails;
- delete the Clerk user as a substitute for session revocation;
- use email to locate provider identity;
- revoke only the first session returned;
- log session/token values;
- call Clerk from frontend admin UI using secret credentials;
- run provider cleanup before local lifecycle commit;
- ignore pagination because "most users have one session."

## STOP - NEEDS ARCHITECT DECISION

Stop if the installed Clerk SDK lacks a supported backend session-list/revoke mechanism or if production intentionally uses another session provider.

Also stop if:

- provider cleanup must become an asynchronous/background job rather than inline request work;
- product requires role demotion to force provider sign-out;
- API needs a formal partial-success contract incompatible with current response envelope.

Do not invent those architecture changes in this ticket.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Pagination Tests:** Pass / Fail  
**Partial Failure Test:** Pass / Fail  
**Manual Multi-Session Test:** Pass / Fail  
**Notes:**