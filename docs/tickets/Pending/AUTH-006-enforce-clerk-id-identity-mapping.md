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

## Why This Exists

The current guard verifies a Clerk token, then calls Clerk's user API to retrieve the user's email, then queries the PropertyOS `User` table by email. If the local user's `clerkUserId` is empty, the guard fills it during authentication.

The Prisma schema already defines `clerkUserId` as a unique optional field. AUTH-005 exists to audit/backfill existing users before this stricter lookup is enabled.

A provider-issued immutable ID is a safer identity join key than a mutable email address.

## Preconditions

Do not implement/deploy this ticket until AUTH-005 confirms the users who must authenticate through Clerk have correct mappings.

Before editing, the engineer/reviewer must have a documented result from AUTH-005 showing:

- no unresolved ambiguous mapping for active users expected to log in;
- no duplicate `clerkUserId` data;
- approved safe backfills have been applied.

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

## Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- auth guard tests/specs

Potentially:

- no Prisma migration should be required because `clerkUserId` is already `@unique` in the current schema.

## Required Reading

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. Prisma `User` model
3. AUTH-005 completed ticket/report
4. Clerk-related auth tests
5. `Backend/src/modules/users/users.service.ts` to understand provisioning/link creation

## Architecture Contract

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

Do not pull these values from email or Clerk metadata during authentication.

## Step-by-Step Implementation

### Step 1 - Confirm schema constraint

Open `Backend/prisma/schema.prisma`.

Find `User.clerkUserId`.

Confirm it remains equivalent to:

```text
String? @unique
```

If it is no longer unique, stop and escalate before continuing.

### Step 2 - Confirm AUTH-005 results

Review the completed mapping audit.

Do not proceed if active production users expected to log in still have missing/ambiguous mappings.

### Step 3 - Locate the current email-based auth sequence

In `jwt-auth.guard.ts`, identify:

1. token verification;
2. `createClerkClient()`;
3. `clerk.users.getUser(verifiedToken.sub)`;
4. primary email extraction;
5. normalization;
6. `prisma.user.findUnique({ where: { email } })`;
7. request-time `clerkUserId` update.

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

Select the fields required by downstream guards/controllers, including the current ID/role/status/organization fields.

### Step 6 - Remove request-time Clerk-user fetch if no longer needed

If the only reason for `clerk.users.getUser()` is to obtain the email used for local lookup, remove that call from the request auth path.

Then remove `createClerkClient` from the guard imports if it is no longer used there.

Do not remove Clerk client usage from `UsersService`; provisioning still uses it.

### Step 7 - Remove email extraction/normalization from the guard

Delete auth-only logic that:

- chooses primary Clerk email;
- rejects because Clerk user has no email;
- normalizes that email for local lookup.

A verified provider ID with a correct local mapping must not require an additional Clerk email fetch on every request.

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

Search the auth guard for:

- `findUnique({ where: { email`
- `primaryEmail`
- `emailAddresses`
- `clerkUserId: verifiedToken.sub` updates
- `getUser(verifiedToken.sub)`

Expected result: no email-based user mapping remains in request auth.

### Step 13 - Add/adjust tests

Mock `verifyToken()` so it returns a known `sub`.

Mock Prisma so lookup by `clerkUserId` returns a known user.

Assert the exact lookup key.

### Step 14 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Checkpoint

- [ ] Local user lookup uses `clerkUserId`.
- [ ] No email fallback exists.
- [ ] Request-time identity linking is gone.
- [ ] Request-time Clerk user-profile fetch is removed if no longer needed.
- [ ] Role/status come from PropertyOS DB.
- [ ] Missing mapping fails closed.

## Tests Required

### Test A - valid mapped active user

`verifyToken -> sub=clerk_123`

Local user has `clerkUserId=clerk_123`, status active.

Expected: allowed.

### Test B - email matches but ID does not

Provider identity has an email equal to a local user's email, but `clerkUserId` differs/missing.

Expected: denied. No email fallback.

### Test C - unknown provider ID

Expected: denied and zero writes.

### Test D - inactive mapped user

Expected: denied, state unchanged.

### Test E - suspended mapped user

Expected: denied, state unchanged.

### Test F - exact Prisma lookup assertion

Assert the auth guard queries the user by `clerkUserId`, not email.

## Manual Verification

Using test accounts whose mappings were validated by AUTH-005:

1. login as active ADMIN -> succeeds;
2. login as active WORKER -> succeeds;
3. login as active RIDER -> succeeds;
4. test an unmapped Clerk identity -> denied;
5. confirm no database write occurs during any login attempt;
6. verify request latency no longer depends on a Clerk `getUser` call if that call was removed.

## Acceptance Criteria

- [ ] Clerk `sub` is the local identity join key.
- [ ] Email is not used as a request-time identity join key.
- [ ] Missing provider mapping fails closed.
- [ ] Authentication does not create/update mappings.
- [ ] PropertyOS DB remains authorization source of truth.
- [ ] Tests prove email fallback does not occur.

## Definition of Done

- [ ] AUTH-005 precondition verified.
- [ ] Code complete.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Backend tests pass.
- [ ] Manual mapped/unmapped tests pass.
- [ ] Reviewer verifies no email fallback remains.

## Rollback

If mapped legitimate users fail after deployment, roll back the code deployment and rerun AUTH-005 audit. Do not add email fallback to the strict implementation. Correct mapping data, then redeploy.

## Forbidden Shortcuts

Do not:

- try `clerkUserId` then fall back to email;
- silently backfill during login;
- use email as a second key "just in case";
- trust frontend-provided Clerk IDs;
- take role from Clerk private metadata;
- make `status` checks optional.

## STOP - NEEDS ARCHITECT DECISION

Stop if AUTH-005 shows legitimate active users intentionally have no Clerk account, or if the product must support multiple auth providers simultaneously through the same production route. That requires an identity architecture decision beyond this ticket.

## Completion Record

**Implemented By:**  
**Mapping Audit Reference:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**