# AUTH-006: Enforce Clerk-ID Identity Mapping

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Identity  
**Complexity:** Medium  
**Depends On:** AUTH-005  
**Blocks:** AUTH-017  
**Primary File:** `Backend/src/shared/guards/jwt-auth.guard.ts`

## Objective

Change Clerk authentication so the verified Clerk subject (`sub`) maps directly to `User.clerkUserId` instead of finding PropertyOS users by email and linking identities during a request.

After this ticket, email is not the authentication join key between Clerk and PropertyOS.

## Junior Engineer Orientation

This ticket changes **how PropertyOS identifies which local user belongs to a verified Clerk session**.

Before this ticket, the flow is roughly:

```text
Clerk says: this session belongs to Clerk user X
PropertyOS asks Clerk for X's email
PropertyOS searches local DB by that email
PropertyOS may link the Clerk ID during the request
```

After this ticket:

```text
Clerk says: this session belongs to Clerk user X
PropertyOS searches local DB by clerkUserId = X
```

The provider-issued user ID is the stable join key. Email becomes profile/contact information, not the identity join key for request authentication.

### Why this matters

Email addresses can change. They can also be typed with case differences, reassigned in some organizations, or appear in multiple systems. A provider-issued subject ID is intended to identify the external account directly.

The dangerous mistake to avoid is implementing:

```text
try Clerk ID
if not found, fall back to email
```

That would preserve the old ambiguity and make AUTH-005 meaningless.

## Why This Exists

The current guard verifies a Clerk token, calls Clerk's user API to retrieve the user's email, then queries the PropertyOS `User` table by email. If the local user's `clerkUserId` is empty, the guard fills it during authentication.

The Prisma schema already defines `clerkUserId` as a unique optional field. AUTH-005 exists to audit/backfill existing users before this stricter lookup is enabled.

A provider-issued stable ID is a safer identity join key than a mutable email address.

## Preconditions

Do not implement/deploy this ticket until AUTH-005 confirms the users who must authenticate through Clerk have correct mappings.

Before editing/deploying, the engineer/reviewer must have a documented AUTH-005 result showing:

- no unresolved ambiguous mapping for active users expected to log in;
- no duplicate `clerkUserId` data;
- approved safe backfills have been applied;
- known broken mappings are resolved or explicitly excluded by an approved decision.

If those conditions are not true, stop. Do not add email fallback to make the migration easier.

## Target Authentication Flow

```text
request
  -> extract Bearer token
  -> verify Clerk token
  -> read verifiedToken.sub
  -> query PropertyOS user WHERE clerkUserId = sub
  -> if no user: deny
  -> if user.status != active: deny
  -> attach stored user to request.user
  -> continue
```

Normal request authentication must not:

- query PropertyOS by email;
- link Clerk IDs;
- create users;
- update roles/status;
- call Clerk `getUser()` merely to discover an email for local lookup.

## Identity and Authorization Ownership

### Identity source

- Clerk token verification establishes the external identity.
- `verifiedToken.sub` is the Clerk user identifier.
- `User.clerkUserId` is the local mapping.

### Authorization source

PropertyOS database remains authoritative for:

- role;
- status;
- organization;
- geography.

Do not pull those values from email or Clerk metadata during authentication.

### Important consequence

A valid Clerk session whose `sub` has no PropertyOS mapping is **not** authorized just because the email resembles an existing user.

## Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- auth guard tests/specs

Potentially no Prisma migration is required because `clerkUserId` is already expected to be `@unique` in the current schema. Verify the schema before relying on this statement.

## Required Reading

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. Prisma `User` model
3. completed AUTH-005 audit/backfill evidence
4. Clerk-related auth tests
5. `Backend/src/modules/users/users.service.ts` to understand provisioning/link creation
6. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before editing, be able to explain why AUTH-005 must precede AUTH-006.

## Step-by-Step Implementation

### Step 1 - Confirm schema constraint

Open `Backend/prisma/schema.prisma`.

Find `User.clerkUserId`.

Confirm it remains equivalent to:

```text
String? @unique
```

If it is no longer unique, stop and escalate before continuing.

**Why:** Strict provider-ID lookup assumes one external identity maps to at most one local user.

### Step 2 - Confirm AUTH-005 results

Review the completed mapping audit.

Do not proceed if active production users expected to log in still have missing/ambiguous mappings.

Record the safe summary/counts in the PR without copying raw PII.

### Step 3 - Locate the current email-based auth sequence

In `jwt-auth.guard.ts`, identify:

1. token verification;
2. `createClerkClient()`;
3. `clerk.users.getUser(verifiedToken.sub)`;
4. primary email extraction;
5. normalization;
6. `prisma.user.findUnique({ where: { email } })`;
7. request-time `clerkUserId` update.

Write these locations in the PR notes before editing.

### Step 4 - Preserve token verification

Do not weaken:

- missing bearer-token rejection;
- `CLERK_SECRET_KEY` validation;
- `authorizedParties` handling;
- `verifyToken()` error handling.

The change begins **after** the token has been successfully verified.

### Step 5 - Replace email lookup with provider-ID lookup

After verification, use `verifiedToken.sub` as the local lookup key.

The local query must use:

```text
where: { clerkUserId: verifiedToken.sub }
```

Select all fields downstream guards/controllers need, including ID, role, status, organization, and other current request-user fields.

**Verify immediately:** Put a temporary debugger/test spy if needed and confirm the Prisma query key is `clerkUserId`, not email.

### Step 6 - Remove request-time Clerk-user fetch if no longer needed

If the only reason for `clerk.users.getUser()` is to obtain the email used for local lookup, remove that call from the request auth path.

Then remove `createClerkClient` from the guard imports if it is no longer used there.

Do not remove Clerk client usage from `UsersService`; provisioning/session operations may still use it.

**Why:** This removes an unnecessary external network dependency from every authenticated request and makes the verified token subject sufficient for mapping.

### Step 7 - Remove email extraction/normalization from the guard

Delete auth-only logic that:

- chooses primary Clerk email;
- rejects because Clerk user has no email;
- normalizes that email for local lookup.

A verified provider ID with a correct local mapping must not require an additional Clerk email fetch on every request.

Do not remove email fields from the local user object if other product behavior needs them; the point is only that email is no longer the request-time join key.

### Step 8 - Remove request-time ID linking

Delete the branch equivalent to:

```text
if (!user.clerkUserId) {
  prisma.user.update(...)
}
```

Under strict mapping, a missing mapping means the user is not found by `clerkUserId` and authentication fails. Mapping creation belongs to invite/backfill flows.

### Step 9 - Define the missing-mapping rejection

If no local user exists for the verified `sub`:

- reject the request;
- perform zero user writes;
- use a generic client-facing error;
- log a safe reason code such as `AUTH_USER_NOT_PROVISIONED` without token data.

Do not fall back to email lookup.

### Step 10 - Preserve active-status check

After finding the local user:

```text
if status != active -> reject
```

Do not modify the status.

### Step 11 - Attach the existing DB user

Set `request.user` to the stored local user shape expected downstream.

Do not merge role/status values from provider metadata.

### Step 12 - Search for fallback identity joins

Search request-auth code for:

- `findUnique({ where: { email`
- `primaryEmail`
- `emailAddresses`
- request-time `clerkUserId` updates
- `getUser(verifiedToken.sub)`
- helper names suggesting email fallback

Expected result: no email-based user mapping remains in Clerk request auth.

### Step 13 - Confirm provisioning paths still populate `clerkUserId`

Inspect `UsersService.invite()` and AUTH-008 bootstrap implementation/plans.

Existing/new Clerk-provisioned users must receive `clerkUserId` at provisioning time. Do not make strict login responsible for repairing missing values.

### Step 14 - Add/adjust tests

Mock `verifyToken()` so it returns a known `sub`.

Mock Prisma so lookup by `clerkUserId` returns known states. Assert the exact lookup key and zero writes.

### Step 15 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

### Step 16 - Review operational readiness

Before deployment, confirm AUTH-005 production backfill and AUTH-018 sequencing. A local implementation can be correct while production data is still unready.

## Checkpoint

- [ ] Local user lookup uses `clerkUserId`.
- [ ] No email fallback exists.
- [ ] Request-time identity linking is gone.
- [ ] Request-time Clerk user-profile fetch is removed if no longer needed.
- [ ] Role/status come from PropertyOS DB.
- [ ] Missing mapping fails closed.
- [ ] Provisioning/bootstrap paths own creation of new mappings.

## Detailed Test Specification

### TEST-AUTH006-01: Valid mapped active user authenticates by exact Clerk ID

**Purpose:** Prove the new happy path uses provider ID.

**Level:** Unit/regression.

**Setup:** `verifyToken` returns `sub=user_test_123`; Prisma `user.findUnique` returns active local user whose `clerkUserId=user_test_123`.

**Action:** Execute guard.

**Expected Result:** Authentication succeeds.

**Required Assertions:**

- Prisma lookup uses `where.clerkUserId === user_test_123`;
- no email lookup occurs;
- no user write occurs;
- `request.user` receives stored role/status/org.

**Why This Test Exists:** It proves the central identity-join change, not just successful authentication.

**If This Test Fails:** Inspect the exact Prisma query and any leftover email/profile fetch path.

### TEST-AUTH006-02: Same email but wrong/missing Clerk ID is denied

**Purpose:** Prove there is no email fallback.

**Level:** Unit/regression.

**Setup:** Verified `sub=user_unmapped`; imagine a local user exists with the same fake email but a different/null `clerkUserId`. The final guard should not query by email at all.

**Action:** Authenticate with `user_unmapped`.

**Expected Result:** Rejected as unprovisioned/unmapped.

**Required Assertions:**

- no email query;
- no user update linking the ID;
- no success based on email coincidence.

**Why This Test Exists:** A `clerkUserId then email fallback` implementation would pass most happy-path tests while preserving the old risk.

**If This Test Fails:** Remove the fallback and correct mapping data through AUTH-005.

### TEST-AUTH006-03: Unknown Clerk ID is denied with zero writes

**Purpose:** Ensure valid external identity is insufficient without a local mapping.

**Level:** Unit/regression.

**Setup:** Valid token with unknown `sub`; local lookup returns null.

**Action:** Authenticate.

**Expected Result:** Rejected.

**Required Assertions:** No create/update/upsert; `request.user` unset.

**Why This Test Exists:** Protects against request-time account provisioning/link repair.

**If This Test Fails:** AUTH-002/AUTH-006 boundaries are incomplete.

### TEST-AUTH006-04: Missing local mapping cannot be repaired during login

**Purpose:** Specifically protect removal of the old `if (!user.clerkUserId) update` behavior.

**Level:** Unit/regression.

**Setup:** Arrange test seam so an email-matching local row would exist but strict `clerkUserId` lookup returns no user.

**Action:** Authenticate.

**Expected Result:** Denied; no `user.update` assigns `verifiedToken.sub`.

**Required Assertions:** No identity-link update call.

**Why This Test Exists:** Request-time backfill defeats deterministic migration and hides bad data.

**If This Test Fails:** Remove the repair branch; use AUTH-005 tooling.

### TEST-AUTH006-05: Inactive mapped user is denied without mutation

**Purpose:** Prove strict identity mapping still respects local lifecycle state.

**Level:** Unit/regression.

**Setup:** Correct `clerkUserId`, local `status=inactive`.

**Action:** Authenticate.

**Expected Result:** Rejected.

**Required Assertions:** State unchanged; no provider/email fallback; no reactivation.

**Why This Test Exists:** Correct identity is not equivalent to active authorization.

**If This Test Fails:** Preserve AUTH-003's status gate.

### TEST-AUTH006-06: Suspended mapped user is denied

**Purpose:** Same as Test 05 for temporary lock state.

**Level:** Unit/regression.

**Setup:** Correct mapping, `status=suspended`.

**Action:** Authenticate.

**Expected Result:** Rejected with state unchanged.

**Required Assertions:** No writes.

**Why This Test Exists:** Prevents strict identity work from accidentally dropping status enforcement.

**If This Test Fails:** Restore the `status === active` requirement.

### TEST-AUTH006-07: Provider profile fetch is not called on normal request if unnecessary

**Purpose:** Confirm the optimization/boundary benefit of using token `sub` directly.

**Level:** Unit.

**Setup:** Valid mapped active user. Mock `createClerkClient`/`users.getUser` if still importable in the test seam.

**Action:** Authenticate.

**Expected Result:** Success without `users.getUser` call when final implementation no longer needs it.

**Required Assertions:** Request path uses `verifyToken` + Prisma only for identity mapping.

**Why This Test Exists:** Prevents accidental reintroduction of per-request profile API dependency.

**If This Test Fails:** Determine whether `getUser` has a new approved purpose. If not, remove it.

### TEST-AUTH006-08: Stored PropertyOS role wins over provider metadata

**Purpose:** Keep identity and authorization ownership separate.

**Level:** Unit.

**Setup:** Local mapped user `role=WORKER`. If provider mock has metadata, make it suggest ADMIN.

**Action:** Authenticate.

**Expected Result:** Request user remains WORKER.

**Required Assertions:** No role update; no metadata-driven elevation.

**Why This Test Exists:** Provider ID is the identity key, not an excuse to move role ownership to Clerk.

**If This Test Fails:** Remove role synchronization and preserve PropertyOS DB authority.

### TEST-AUTH006-09: Authorized parties/token verification contract remains intact

**Purpose:** Ensure identity-lookup refactor does not weaken token verification.

**Level:** Unit.

**Setup:** Configure fake secret/authorized parties.

**Action:** Authenticate.

**Expected Result:** `verifyToken` receives the expected verification options.

**Required Assertions:** Missing/invalid tokens still fail before local lookup.

**Why This Test Exists:** Refactoring post-verification logic must not accidentally bypass origin/token checks.

**If This Test Fails:** Restore verification configuration before debugging user lookup.

### TEST-AUTH006-10: Repeated mapped authentication is write-free

**Purpose:** Prove strict mapping removes request-time linking side effects.

**Level:** Unit/integration.

**Setup:** Active mapped user.

**Action:** Authenticate repeatedly.

**Expected Result:** Every request succeeds; no user write occurs.

**Required Assertions:** `clerkUserId`, role, status, org remain unchanged.

**Why This Test Exists:** Strict mapping should make the normal request path deterministic/read-only for user identity/lifecycle state.

**If This Test Fails:** Search for hidden synchronization logic.

## Manual Verification

Using test accounts whose mappings were validated by AUTH-005:

1. login as active ADMIN -> succeeds;
2. login as active WORKER -> succeeds;
3. login as active RIDER -> succeeds;
4. test an unmapped Clerk identity -> denied;
5. confirm no database write occurs during any login attempt;
6. if provider-profile fetch was removed, verify normal protected requests do not depend on Clerk `getUser` availability;
7. verify an email-coincidence case does not grant access without the matching ID.

## Failure Diagnosis Guide

### All users become unmapped after the change

Do not add email fallback. Recheck AUTH-005 backfill/environment/Clerk instance (test vs production) and exact `sub` values.

### Prisma query uses email even though tests pass

Tests are too weak. Add explicit query-key assertions. The ticket is not complete.

### `clerk.users.getUser()` failure now disappears from logs because call was removed

That is expected if the call existed only for email lookup. Token verification remains the provider authentication boundary.

### Local user has correct email but login fails

Check `clerkUserId`. Under the new architecture, matching email alone is intentionally insufficient.

### Developer proposes fallback for migration period

Use a staged deployment with AUTH-005 backfill, not fallback logic. A fallback makes it impossible to know whether strict mapping is actually working.

## PR Evidence Required

Include:

- AUTH-005 precondition/audit reference and safe counts;
- before/after request identity flow;
- exact Prisma lookup key before vs after;
- confirmation that request-time `clerkUserId` updates were removed;
- confirmation whether `clerk.users.getUser` was removed from request auth;
- detailed test names/results including email-coincidence rejection;
- typecheck/lint/test results;
- manual mapped/unmapped verification result.

## Acceptance Criteria

- [ ] Clerk `sub` is the local identity join key.
- [ ] Email is not used as a request-time identity join key.
- [ ] Missing provider mapping fails closed.
- [ ] Authentication does not create/update mappings.
- [ ] PropertyOS DB remains authorization source of truth.
- [ ] Provider-profile fetch is removed if it is no longer required.
- [ ] Tests prove email fallback does not occur.

## Definition of Done

- [ ] AUTH-005 precondition verified.
- [ ] Code complete.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Backend tests pass.
- [ ] Detailed mapping/fallback tests pass.
- [ ] Manual mapped/unmapped tests pass.
- [ ] Required PR evidence recorded.
- [ ] Reviewer verifies no email fallback remains.

## Rollback

If mapped legitimate users fail after deployment, roll back the code deployment and rerun AUTH-005 audit. Do not add email fallback to the strict implementation. Correct mapping data, then redeploy.

If the wrong Clerk environment/instance was used, fix environment configuration and re-audit mappings before redeploying.

## Forbidden Shortcuts

Do not:

- try `clerkUserId` then fall back to email;
- silently backfill during login;
- use email as a second key "just in case";
- trust frontend-provided Clerk IDs;
- take role from Clerk private metadata;
- make `status` checks optional;
- weaken query-key tests to permit email fallback.

## STOP - NEEDS ARCHITECT DECISION

Stop if AUTH-005 shows legitimate active users intentionally have no Clerk account, or if the product must support multiple auth providers simultaneously through the same production route.

Also stop if one PropertyOS user is intentionally designed to map to multiple Clerk identities or vice versa. That requires a different identity model.

## Completion Record

**Implemented By:**  
**Mapping Audit Reference:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Mapped User Smoke Tests:** Pass / Fail  
**Unmapped Rejection Test:** Pass / Fail  
**Notes:**