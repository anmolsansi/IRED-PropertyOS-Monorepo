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

## Junior Engineer Orientation

AUTH-001 through AUTH-003 remove known unsafe branches. This ticket is the deliberate **second-pass safety audit** that prevents the same class of bug from surviving under another name.

The mental model is:

```text
JwtAuthGuard asks: "Which existing PropertyOS user is this, and is the account active?"
RolesGuard asks: "Does this user's stored role satisfy the route?"
OrgGuard asks: "Which organization scope applies?"
GeographyGuard asks: "Which geographic records may this user reach?"
```

None of those authorization values should be **granted or repaired** merely because a request arrived.

A successful login should not be a synchronization job for privileges.

## Why This Exists

Authentication and authorization state are currently mixed because privileged auth recovery code can set a user's role to `ADMIN` and status to `active` while handling login.

Even after AUTH-002 and AUTH-003 remove the known creation/reactivation branches, this ticket establishes and tests the broader invariant that request authentication never mutates privileges.

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

Authentication may attach a copy/reference of this stored state to `request.user`, but it may not change the stored state.

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
- `docs/tickets/TICKET_DETAIL_STANDARD.md`

### Out Of Scope

Do not:

- redesign role names;
- create capability-based RBAC in this ticket;
- redesign tenant/geography guards;
- remove the ability for explicit admin services to change privileges;
- move authorization state to Clerk metadata;
- implement the Clerk-ID data migration owned by AUTH-005/AUTH-006.

## Required Reading

Read all global guards in registration order. Understand which concern belongs where:

- `JwtAuthGuard`: identity + active-account gate;
- `RolesGuard`: route role requirements;
- `OrgGuard`: organization scope;
- `GeographyGuard`: geography scope.

Also read the Prisma `User` model and identify which stored fields affect authorization.

Before editing, be able to answer:

1. Which values on `request.user` are consumed by downstream guards?
2. Which Prisma user fields are privilege/security state?
3. Which request-auth writes remain after AUTH-001/002/003?

## Baseline Commands

```bash
npm run typecheck:backend
npm run test:backend
```

Record any pre-existing failures before editing.

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

Identity binding via `clerkUserId` is addressed separately by AUTH-005/AUTH-006. Do not expand this ticket into an identity migration unless those tickets are implemented in the same reviewed PR.

## Step-by-Step Implementation

### Step 1 - Inventory every database write in `JwtAuthGuard`

Search the full file for:

- `.create(`
- `.update(`
- `.upsert(`
- `.delete(`
- `.createMany(`
- `.updateMany(`

Write every match into the PR notes before changing code.

**Why:** A security invariant is easier to review when the reviewer can see the exact write inventory before/after.

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

If those branches still exist, complete the dependency tickets rather than duplicating partial logic here.

### Step 4 - Inspect request-time identity-link write separately

The current pre-AUTH-006 guard may still write `clerkUserId` when missing.

Classify that as identity-linking, **not** role/status mutation. Do not silently treat it as acceptable forever. AUTH-006 removes request-time identity linking after AUTH-005 backfill.

Record it clearly so the reviewer understands why this ticket may temporarily leave one non-privilege write before AUTH-006.

### Step 5 - Remove any remaining privilege mutation

Delete or relocate any remaining privilege-changing behavior to the proper explicit administrative service.

Do not create new services unless required. Prefer existing `UsersService` for user lifecycle actions.

### Step 6 - Confirm `request.user` is derived from stored state

When auth succeeds, `request.user.role`, `status`, and `organizationId` must reflect values loaded from PropertyOS DB.

Do not reconstruct/override them using:

- Clerk private/public metadata;
- email domain;
- environment variables;
- frontend request fields.

### Step 7 - Inspect downstream guards

Read `RolesGuard`, `OrgGuard`, and `GeographyGuard` and confirm your change did not force them to rely on values no longer present on `request.user`.

Do not modify those guards merely because you are reading them unless a compile/runtime break is directly caused by this ticket.

### Step 8 - Add immutability tests

Use known before-state fixtures and assert the same authorization state remains after successful and failed auth attempts.

Do not limit assertions to response codes.

### Step 9 - Repository search

Search authentication-related code for:

- `role: UserRole.ADMIN`
- `status: UserStatus.active`
- `organizationId:` inside auth writes
- `MASTER_ADMIN`
- writes to geographic assignment tables during auth

Review every request-time match.

### Step 10 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

### Step 11 - Review final write inventory

Repeat Step 1 and put the final result in the PR. The reviewer should be able to compare "before writes" and "after writes" quickly.

## Checkpoint

- [ ] No authentication path mutates `role`.
- [ ] No authentication path mutates `status`.
- [ ] No authentication path mutates organization access.
- [ ] No authentication path mutates geography access.
- [ ] Successful auth uses DB-stored authorization state unchanged.
- [ ] Any temporary identity-link write is explicitly owned by AUTH-006, not confused with acceptable privilege mutation.

## Detailed Test Specification

### TEST-AUTH004-01: Active ADMIN authenticates without privilege writes

**Purpose:** Prove normal admin access does not require re-granting admin privileges.

**Level:** Unit/regression.

**Setup:** Existing active ADMIN returned by local user lookup; known organization ID; valid identity.

**Action:** Authenticate.

**Expected Result:** Success.

**Required Assertions:**

- returned/request role remains `ADMIN`;
- status remains `active`;
- organization ID remains original value;
- no DB write changes role/status/org;
- no provider metadata is used to overwrite authorization fields.

**Why This Test Exists:** A future developer may add "sync admin role on login" to fix a support issue. This test prevents that.

**If This Test Fails:** Search for role/status synchronization in `JwtAuthGuard` or helper calls invoked by it.

### TEST-AUTH004-02: Active WORKER remains WORKER even if provider metadata suggests ADMIN

**Purpose:** Prove PropertyOS DB, not provider metadata, is authorization source of truth.

**Level:** Unit/regression.

**Setup:** Local user `role=WORKER`, `status=active`. If the provider mock exposes metadata, optionally give it an `ADMIN`-like value; if final auth flow no longer reads metadata, simply assert no metadata-based role logic exists.

**Action:** Authenticate.

**Expected Result:** Success as stored WORKER.

**Required Assertions:** `request.user.role === WORKER`; no role update; no ADMIN elevation.

**Why This Test Exists:** It catches automatic role synchronization from an external identity provider.

**If This Test Fails:** Remove provider-to-role mutation. Role changes belong to explicit PropertyOS administration.

### TEST-AUTH004-03: Active RIDER remains RIDER

**Purpose:** Ensure the invariant applies across all current roles, not only ADMIN/WORKER.

**Level:** Unit/regression.

**Setup:** Existing active RIDER.

**Action:** Authenticate.

**Expected Result:** Success; role unchanged; zero privilege writes.

**Required Assertions:** Same immutability checks as above.

**Why This Test Exists:** Role-specific code often accidentally omits less-common roles.

**If This Test Fails:** Look for hardcoded role branches in auth.

### TEST-AUTH004-04: Inactive ADMIN is rejected without privilege mutation

**Purpose:** Combine status rejection with privilege immutability.

**Level:** Unit/regression.

**Setup:** Existing ADMIN with `status=inactive` and known `deactivatedAt`.

**Action:** Authenticate.

**Expected Result:** Rejected.

**Required Assertions:** Role/status/deactivatedAt/org unchanged; no role/status update; no synthetic request user with elevated state.

**Why This Test Exists:** It protects AUTH-003 and the broader privilege boundary simultaneously.

**If This Test Fails:** Complete AUTH-003 or remove remaining privilege-repair logic.

### TEST-AUTH004-05: Suspended WORKER is rejected without state mutation

**Purpose:** Prove the rule is not admin-specific.

**Level:** Unit/regression.

**Setup:** Suspended WORKER.

**Action:** Authenticate.

**Expected Result:** Rejected, state unchanged.

**Required Assertions:** No role/status/org mutation.

**Why This Test Exists:** Security boundaries must be uniform across roles.

**If This Test Fails:** Inspect status/role-specific branches.

### TEST-AUTH004-06: Authentication never changes organization assignment

**Purpose:** Prevent request-time tenant access escalation.

**Level:** Unit/regression.

**Setup:** Existing active user with known `organizationId`.

**Action:** Authenticate using any provider/request data that could theoretically contain a different organization hint.

**Expected Result:** Local `organizationId` remains unchanged.

**Required Assertions:** No user update containing `organizationId`; `request.user.organizationId` equals DB value.

**Why This Test Exists:** Organization membership is authorization state even though current known bug focused on ADMIN/status.

**If This Test Fails:** Remove request/provider-driven organization synchronization and escalate if there is a documented product requirement.

### TEST-AUTH004-07: Authentication never changes geographic assignments

**Purpose:** Protect location-scoped authorization from login-time mutation.

**Level:** Unit/static regression depending on guard boundaries.

**Setup:** Known geography assignment fixture or spies for assignment mutations.

**Action:** Authenticate.

**Expected Result:** No geography assignment create/update/delete call occurs.

**Required Assertions:** Assignment mutation methods remain uncalled.

**Why This Test Exists:** A complete privilege invariant includes geography, not just role.

**If This Test Fails:** Remove the mutation from auth and keep geography administration explicit.

### TEST-AUTH004-08: Repeated successful auth is privilege-idempotent

**Purpose:** Prove logging in or calling protected routes repeatedly does not drift authorization state.

**Level:** Integration/unit.

**Setup:** Active user with known role/status/org.

**Action:** Authenticate multiple times.

**Expected Result:** Every request succeeds and stored authorization state remains identical.

**Required Assertions:** No privilege writes across repetitions.

**Why This Test Exists:** Hidden synchronization often only becomes visible over repeated requests.

**If This Test Fails:** Inspect request-time sync/update helpers.

## Manual Verification

Using disposable local accounts:

1. record user role, status, organization and geography assignments;
2. perform several authenticated requests;
3. re-read the same database fields;
4. confirm no values changed because of authentication;
5. repeat for at least one ADMIN and one non-admin role;
6. attempt auth for a non-active user and confirm its state is also unchanged.

## Failure Diagnosis Guide

### Auth succeeds but DB role changed

This ticket fails even if the new role is "correct." Remove role synchronization from request auth.

### Provider metadata appears to be the only source for organization/role

Stop and escalate. The current architecture expects PropertyOS DB authorization state. Do not silently change ownership.

### Downstream RolesGuard breaks because a field disappeared

Ensure `request.user` still includes the stored fields needed downstream. Read-only does not mean remove the data.

### A remaining `prisma.user.update` only writes `clerkUserId`

That is identity-linking owned by AUTH-006. Document it; do not mislabel it as acceptable privilege mutation. Once AUTH-006 completes, request auth should be write-free for user identity/lifecycle as well.

## PR Evidence Required

Include:

- before/after list of every database write found in `JwtAuthGuard`;
- list of authorization fields reviewed;
- test results for ADMIN, WORKER, RIDER, inactive/suspended, org and geography immutability;
- confirmation that `request.user` values come from DB state;
- validation commands/results;
- any remaining request-time identity-link write explicitly linked to AUTH-006.

## Acceptance Criteria

- [ ] User role is never changed during authentication.
- [ ] User status is never changed during authentication.
- [ ] Organization/geography access is never changed during authentication.
- [ ] Clerk metadata does not silently override PropertyOS authorization state.
- [ ] Tests enforce the invariant for all current roles and non-active states.
- [ ] Repeated auth does not drift authorization state.

## Definition of Done

- [ ] Privilege write audit completed and recorded.
- [ ] Forbidden writes removed.
- [ ] Unit/regression tests pass.
- [ ] Backend typecheck passes.
- [ ] Backend lint passes.
- [ ] Manual state comparison performed.
- [ ] Required PR evidence included.
- [ ] Reviewer approves the authentication/authorization boundary.

## Rollback

If a removed mutation was masking missing user lifecycle operations, restore service functionality through explicit admin workflows. Do not put privilege repair back into authentication.

## Forbidden Shortcuts

Do not:

- use Clerk role metadata to overwrite DB role at login;
- synchronize `ADMIN` automatically from email/domain;
- update organization based on frontend/provider input during auth;
- bypass RolesGuard because the role no longer auto-repairs;
- preserve mutation under a helper with a different name;
- weaken immutability tests because a sync seems convenient.

## STOP - NEEDS ARCHITECT DECISION

Stop if the current product intentionally uses Clerk as the authoritative role/organization store and synchronizes authorization on every request. The current repository behavior suggests PropertyOS DB roles are authoritative, but changing that ownership model requires an explicit architecture decision.

Also stop if a newly introduced authorization field is intentionally request-synchronized and is not covered by this ticket's ownership model.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Privilege Writes Before:**  
**Privilege Writes After:**  
**Tests Added/Updated:**  
**Notes:**

---

## Expanded Architecture Discussion And Decision Record

### Decision 1: Authorization state belongs to PropertyOS, not the identity provider

**Decision:** Role, local status, organization, geography, and future capability data are read from PropertyOS and remain unchanged during authentication.

**Reason:** These values represent application/business authorization decisions. Clerk is responsible for proving identity, not deciding which PropertyOS records a person may access.

**Rejected alternative:** Synchronize role/organization from Clerk metadata on every request.

**Why rejected:** That creates two competing sources of truth, makes provider metadata a hidden admin channel, and can cause silent privilege drift when metadata changes.

### Decision 2: Request-time auth must not be a privilege repair job

**Decision:** If stored privilege data is wrong or missing, fail or repair it through explicit administrative/migration operations.

**Reason:** Privilege changes need an actor, audit trail, validation, and predictable failure semantics. Request auth has none of those responsibilities.

**Rejected alternative:** "Ensure" role/status/org on every login so the system self-heals.

**Why rejected:** Self-healing security state can also self-escalate. It makes intentional deactivation/demotion unreliable.

### Decision 3: Identity-linking is temporarily separate but not a permanent exception

**Decision:** If a `clerkUserId` linking write still exists before AUTH-006, classify it explicitly as identity migration debt rather than normalizing request writes.

**Reason:** Reviewers need a truthful write inventory. AUTH-006 is responsible for removing request-time linking after backfill.

## Facts, Assumptions, And Unknowns

### Facts

- Global guards divide identity, role, organization, and geography concerns.
- Local user state includes role/status/organization information consumed downstream.
- Known unsafe auth branches currently mutate privilege state.

### Assumptions to verify

- Clerk metadata is not intentionally the canonical role/organization store.
- Geographic assignment changes occur through explicit management flows, not authentication.

### Unknowns requiring escalation

- Whether any newer authorization field was added after this ticket was written and is being synchronized during auth.
- Whether production operations rely on a hidden role-sync helper outside `JwtAuthGuard`.

## Intern Execution Sequence - No Improvisation

### Phase A - Build a complete write inventory

1. Run baseline checks.
2. Search `JwtAuthGuard` for every Prisma write method.
3. Search helpers called by the guard for writes as well.
4. Create a simple table in your notes: `location | write | fields | reason | allowed?`.
5. Mark role/status/org/geography writes as forbidden.
6. Mark identity-linking writes as temporary AUTH-006 debt.
7. Stop if a write cannot be classified confidently.

### Phase B - Map downstream consumers

1. Read `RolesGuard`.
2. Read `OrgGuard`.
3. Read `GeographyGuard`.
4. Write down exactly which `request.user` fields each one consumes.
5. Confirm the auth change will still populate those fields from the DB row.

### Phase C - Protect behavior with fixtures

Create at minimum:

```text
Admin A: active ADMIN, org-1
Worker B: active WORKER, org-1
Rider C: active RIDER, org-1
Admin D: inactive ADMIN, org-1
Worker E: suspended WORKER, org-1
```

Where practical, add geography assignments to B/C and prove auth does not change them.

### Phase D - Remove privilege mutations

1. Remove forbidden writes.
2. Keep reads/checks.
3. Keep `request.user` populated from stored state.
4. Do not replace writes with Clerk metadata synchronization.
5. Run focused tests after each removed write group.

### Phase E - Repeat the write inventory

1. Re-run all search patterns.
2. Compare before/after inventory.
3. Explain every remaining write in the PR.
4. A reviewer must be able to see that no remaining write changes authorization state.

## Additional Test Cases And Explanations

### TEST-AUTH004-09: Provider metadata changes between requests but local role does not

**Purpose:** Prove request-time provider metadata cannot cause privilege drift.

**Level:** Unit/regression.

**Setup:** Local user remains `WORKER`. First provider fixture contains neutral metadata; second fixture contains an admin-like metadata value if the seam permits.

**Action:** Authenticate twice using the two provider fixtures.

**Expected Result:** Both requests attach the same local `WORKER` role.

**Required Assertions:** No role write; no local role change; same DB authorization state after both requests.

**Why This Test Exists:** A one-time test can miss a synchronization implementation that changes behavior only when metadata changes.

**False Positive To Avoid:** Mocking out the code that reads provider metadata so the test never exercises the possible sync path.

**If This Test Fails:** Remove provider-to-local privilege synchronization from request auth.

### TEST-AUTH004-10: Failed authentication cannot partially mutate privileges

**Purpose:** Detect write-before-throw bugs.

**Level:** Unit/integration.

**Setup:** Use a request that reaches local-user evaluation and then fails for a controlled reason.

**Action:** Authenticate and capture before/after local role/status/org plus assignment state.

**Expected Result:** Request fails and all authorization state remains identical.

**Required Assertions:** No privilege write methods called; DB state unchanged.

**Why This Test Exists:** A failing response does not imply the database was not modified first.

**False Positive To Avoid:** Only asserting the exception/status code.

**If This Test Fails:** Inspect write ordering and remove the mutation, not the assertion.

## Observability And Audit Expectations

Authentication logs may describe the result of checking stored authorization state but should not claim they synchronized or repaired privileges. Explicit role/status/org/geography changes should be attributable to their administrative workflow and, after AUTH-012, semantic audit events.

Do not add logs containing tokens, authorization headers, secrets, or unnecessary PII. AUTH-014 owns log cleanup.

## Reviewer Walkthrough

1. Compare the documented write inventory before/after.
2. Inspect `request.user` construction and confirm values come from the local row.
3. Inspect role/status/org/geography tests.
4. Review provider-metadata drift test.
5. Search for indirect helper/service writes from auth.
6. Verify any remaining identity-link write is explicitly deferred to AUTH-006.
7. Reject the PR if it merely relocates privilege synchronization.

## Handoff Notes

After AUTH-004:

- AUTH-005/AUTH-006 can focus on identity mapping without privilege synchronization being mixed into the same path.
- AUTH-009/AUTH-010 can own explicit privilege/lifecycle transitions.
- AUTH-012 can audit real administrative changes instead of request-time hidden mutations.
- AUTH-015/AUTH-017 can assert that successful and failed authentication are privilege-idempotent.

Future role/capability features must preserve the same invariant: authentication may load authorization state, never grant or repair it.
