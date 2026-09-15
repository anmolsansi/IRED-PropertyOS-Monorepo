# AUTH-004: Remove Login-Time Privilege Mutation

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Authorization  
**Complexity:** Small  
**Depends On:** AUTH-001, AUTH-002, AUTH-003  
**Blocks:** AUTH-015, AUTH-017  
**Primary File:** `Backend/src/shared/guards/jwt-auth.guard.ts`

## Objective

Make user privilege state read-only during authentication.

After this ticket, `JwtAuthGuard` must not alter a user's role, account status, organization membership, geographic permissions, or any other authorization property as part of processing a request.

## Why This Exists

Authentication and authorization state are currently mixed because privileged auth recovery code can set a user's role to `ADMIN` and status to `active` while handling login.

Even after AUTH-002 and AUTH-003 remove the known creation/reactivation branches, this ticket performs a deliberate second pass to establish and test the invariant that login never mutates privileges.

## Target Security Invariant

For every authentication request:

```text
authorization state before request
=
authorization state after request
```

This includes at minimum:

- `role`;
- `status`;
- `organizationId`;
- geographic assignments;
- privilege/capability data if later introduced.

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- auth guard unit/regression tests

### Files To Inspect

- `Backend/src/shared/guards/roles.guard.ts`
- `Backend/src/shared/guards/org.guard.ts`
- `Backend/src/shared/guards/geography.guard.ts`
- `Backend/src/modules/users/users.service.ts`
- `Backend/prisma/schema.prisma`

## Required Reading

Read all global guards in their registration order. Understand which concern belongs where:

- `JwtAuthGuard`: identity + active-account gate;
- `RolesGuard`: route role requirements;
- `OrgGuard`: organization scope;
- `GeographyGuard`: geography scope.

Do not move authorization mutations between guards.

## Baseline Commands

```bash
npm run typecheck:backend
npm run test:backend
```

## Architecture Contract

The guard may attach an already-existing user object to the request. It must not grant or repair privileges.

Allowed during auth:

- read token;
- verify token;
- read identity/provider data;
- read local user;
- check `status`;
- attach user to request;
- reject.

Not allowed during auth:

- change role;
- change status;
- assign organization;
- add/remove geography;
- grant ADMIN;
- grant capabilities;
- change approval level;
- change authorization metadata.

Identity binding via `clerkUserId` is addressed separately by AUTH-005/AUTH-006. Do not expand this ticket into an identity migration unless required by those tickets.

## Step-by-Step Implementation

### Step 1 - Audit every database write in `JwtAuthGuard`

Search the full file for:

- `.create(`
- `.update(`
- `.upsert(`
- `.delete(`
- `.createMany(`
- `.updateMany(`

Write down every match.

### Step 2 - Classify each write

For every write, answer:

1. Does it change identity mapping?
2. Does it change role?
3. Does it change status?
4. Does it change tenant/org/geography?
5. Is it required for authentication or is it lifecycle/provisioning behavior?

Any write affecting privilege state is forbidden.

### Step 3 - Verify AUTH-002 and AUTH-003 outcomes

Confirm there is no code left that:

- creates an ADMIN;
- sets role to ADMIN;
- sets status to active;
- clears `deactivatedAt`.

If those branches still exist, do not duplicate work silently. Complete the dependency tickets or coordinate them in the same PR.

### Step 4 - Remove any remaining privilege mutation

Delete or relocate any remaining privilege-changing behavior to the proper explicit administrative service.

Do not create new services unless required. Prefer the existing `UsersService` for user lifecycle actions.

### Step 5 - Confirm request.user is derived from stored state

When auth succeeds, `request.user.role`, `status`, and `organizationId` should reflect the values loaded from the database, not values reconstructed from Clerk metadata or email rules.

Do not treat Clerk private metadata as the authorization source of truth in this ticket.

### Step 6 - Add immutability tests

Create tests that begin with known user authorization state, execute auth, and verify the Prisma mutation methods that could change authorization were not called.

At minimum cover:

- active ADMIN;
- active WORKER;
- active RIDER;
- inactive ADMIN;
- suspended WORKER.

### Step 7 - Repository search

Search authentication-related code for patterns such as:

- `role: UserRole.ADMIN`
- `status: UserStatus.active`
- `MASTER_ADMIN`

Review every result that executes during login/request authentication.

### Step 8 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Checkpoint

- [ ] No authentication path mutates `role`.
- [ ] No authentication path mutates `status`.
- [ ] No authentication path mutates organization access.
- [ ] No authentication path mutates geography access.
- [ ] Successful auth uses DB-stored authorization state unchanged.

## Tests Required

For each role `ADMIN`, `WORKER`, and `RIDER`:

1. create/mock existing active user;
2. authenticate successfully;
3. assert returned/request user role is unchanged;
4. assert no privilege-changing Prisma write occurred.

For inactive/suspended users:

1. attempt auth;
2. expect rejection;
3. verify stored authorization state unchanged.

## Manual Verification

Using disposable local accounts:

1. record user role, status, organization and geography assignments;
2. perform several authenticated requests;
3. re-read the same database fields;
4. confirm no values changed because of authentication.

## Acceptance Criteria

- [ ] User role is never changed during authentication.
- [ ] User status is never changed during authentication.
- [ ] Organization/geography access is never changed during authentication.
- [ ] Clerk metadata does not silently override PropertyOS authorization state.
- [ ] Tests enforce the invariant.

## Definition of Done

- [ ] Privilege write audit completed.
- [ ] Forbidden writes removed.
- [ ] Unit/regression tests pass.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Manual state comparison performed.
- [ ] Reviewer approves the authentication/authorization boundary.

## Rollback

If a removed mutation was masking missing user lifecycle operations, restore service functionality through explicit admin workflows. Do not put privilege repair back into authentication.

## Forbidden Shortcuts

Do not:

- use Clerk role metadata to overwrite DB role at login;
- synchronize `ADMIN` automatically from email/domain;
- update organization based on frontend input during auth;
- bypass RolesGuard because the role no longer auto-repairs;
- preserve mutation under a helper with a different name.

## STOP - NEEDS ARCHITECT DECISION

Stop if the current product intentionally uses Clerk as the authoritative role store and synchronizes roles on every request. The current repository behavior suggests PropertyOS DB roles are authoritative, but changing that ownership model requires an explicit architecture decision.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**