# AUTH-010: Make User Suspension, Deactivation, and Reactivation Explicit

**Status:** Pending  
**Priority:** P1  
**Area:** User Administration / Security  
**Complexity:** Medium  
**Depends On:** AUTH-003, AUTH-009  
**Blocks:** AUTH-011, AUTH-012, AUTH-016, AUTH-017  
**Primary Files:** `Backend/src/modules/users/users.service.ts`, `Backend/src/modules/users/users.controller.ts`

## Objective

Turn account status changes into an explicit, predictable user lifecycle instead of treating `status` as a generic field that can be modified without clearly defined transition rules.

After this ticket:

- `active`, `inactive`, and `suspended` have documented meanings;
- backend service logic owns status transitions;
- reactivation is an explicit administrator action;
- authentication never changes user status;
- last-admin protection from AUTH-009 is honored;
- frontend/admin flows use intentional actions rather than hidden automatic recovery.

## Junior Engineer Orientation

A user account status is not an ordinary profile field like `fullName`. Changing `active` to `suspended` changes whether a real person can access PropertyOS, so that transition deserves its own business rules.

The key mental model is:

```text
Authentication reads status.
Administration changes status.
```

The authentication guard must never repair status. The user administration service owns intentional lifecycle transitions.

This ticket does **not** add more lifecycle states. It makes the three states that already exist behave consistently.

### Why there are two non-active states

`inactive` and `suspended` both deny access, but they communicate different business meaning:

- `suspended` = temporary access removal;
- `inactive` = account is retired/deactivated.

They can share current implementation details such as `deactivatedAt`, but do not silently treat them as the same business concept in UI/text.

## Why This Exists

The current user service allows status changes through generic `updateStatus()` and generic `update()`. That works mechanically, but sensitive lifecycle operations deserve clearer business rules.

Now that AUTH-003 removes login-time reactivation, administrators need a safe and understandable way to suspend, deactivate, and reactivate users.

Without central lifecycle rules, different endpoints can drift. One may set `deactivatedAt`, another may forget it, one may protect the last admin, another may bypass it.

## Status Semantics

Use these meanings unless the product owner explicitly changes them.

### `active`

- user is currently permitted to authenticate, subject to role/org/geography authorization;
- `deactivatedAt` should be `null`;
- reactivation into this state must be explicit.

### `suspended`

- temporary access lock;
- user cannot authenticate;
- typical reasons: investigation, temporary security hold, temporary removal of access;
- `deactivatedAt` records when access was removed under the current schema.

### `inactive`

- account is retired/deactivated;
- user cannot authenticate;
- typical reason: employee/contractor no longer requires access;
- `deactivatedAt` records when access was removed.

## Target State Machine

Allowed transitions:

```text
active -> suspended
active -> inactive
suspended -> active
suspended -> inactive
inactive -> active
inactive -> suspended
```

A no-op transition such as `active -> active` should be handled predictably. Prefer returning the already-current user without changing security state if that matches existing service conventions, or reject as a no-op if the project establishes that convention. Do not perform unrelated writes just because a status request arrived.

Every transition that removes active-admin status must pass AUTH-009 last-admin protection.

### State/metadata invariant

After any successful lifecycle operation:

```text
status = active
=> deactivatedAt = null
```

and:

```text
status = inactive OR suspended
=> deactivatedAt is set
```

Do not use login/authentication to enforce this invariant after the fact. The lifecycle write itself must create consistent state.

## Expected Files To Modify

Backend:

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts`
- `Backend/src/modules/users/dto/users.schema.ts`
- user-service tests

Frontend if user-management UI exists:

- inspect the settings/users admin page and its API client/hooks;
- update status actions/labels only where current UI exposes this functionality.

Do not redesign the entire user-management page.

## Required Reading

1. `Backend/src/modules/users/users.service.ts`
2. `Backend/src/modules/users/users.controller.ts`
3. `Backend/src/modules/users/dto/users.schema.ts`
4. `Backend/src/shared/guards/jwt-auth.guard.ts`
5. completed AUTH-009 implementation
6. user-management frontend files, if present
7. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before changing code, list all current production code paths that can write `User.status` or `deactivatedAt`.

## API Compatibility Decision

For this ticket, preserve the existing `PATCH /users/:id/status` API unless there is a strong repository reason not to.

The controller may continue receiving:

```json
{ "status": "active" | "inactive" | "suspended" }
```

but it must route that request through explicit service transition logic.

Do not introduce unnecessary breaking API version changes merely to make status handling cleaner internally.

## Architecture Contract

- Controller validates input and delegates.
- Service owns transition rules.
- Auth guard only reads status.
- Clerk session cleanup is AUTH-011.
- Audit-event completeness is AUTH-012.
- Last-admin invariant is AUTH-009.
- Frontend reflects backend-confirmed status and never owns authorization truth.

## Step-by-Step Implementation

### Step 1 - Audit all status mutation paths

Search repository for:

- `status: UserStatus`
- `status: "active"`
- `status: "inactive"`
- `status: "suspended"`
- `updateStatus(`
- writes to `deactivatedAt`
- direct `prisma.user.update` calls that can modify status

List every production path in the PR description.

**Why:** Centralization is incomplete if one old endpoint keeps direct-write behavior.

### Step 2 - Classify each mutation path

For each path, record:

- controller/route or internal caller;
- whether it changes only status or role + status;
- whether it currently updates `deactivatedAt`;
- whether it currently applies last-admin protection;
- whether it is still needed after centralization.

### Step 3 - Centralize lifecycle transition logic in `UsersService`

Create/refactor to a single internal/service lifecycle path, conceptually:

```text
transitionStatus(userId, targetStatus, context?)
```

Exact naming is flexible.

Every production path that changes status must use the same transition rules.

**Verify:** A repository search after refactor should not show independent business logic setting status in multiple service methods.

### Step 4 - Load current user before mutation

Before any transition:

1. load target user;
2. if missing -> `NotFoundException`;
3. record current role/status/deactivatedAt;
4. validate target status;
5. determine whether the request is a no-op or a real transition.

Do not blindly call update with the requested status without current-state context.

### Step 5 - Apply last-admin protection before writes

If the target is currently an active ADMIN and requested state is not active, call/reuse AUTH-009 protection.

Do not duplicate a slightly different count rule here.

If the transition is rejected, perform zero lifecycle writes.

### Step 6 - Calculate transition metadata once

For target status:

- `inactive` -> `deactivatedAt = now`;
- `suspended` -> `deactivatedAt = now`;
- `active` -> `deactivatedAt = null`.

Capture `now` once per operation so tests/audit can reason about a stable timestamp.

If product later needs separate `suspendedAt`, that is a schema enhancement outside this ticket.

### Step 7 - Handle no-op transitions intentionally

Examples:

- active -> active;
- inactive -> inactive;
- suspended -> suspended.

Do not silently rewrite `deactivatedAt` on a no-op unless the architecture explicitly says reissuing the same status refreshes the timestamp.

Recommended default: leave current state unchanged and return current user/result according to existing service conventions.

If the product wants status reassertion to reset timestamps, stop for architect/product decision.

### Step 8 - Remove direct status mutation from generic profile logic where practical

The generic `update()` currently permits `status`.

Preferred outcome:

- profile update handles profile fields/role according to its own rules;
- status changes go through central lifecycle method.

If compatibility requires generic `update()` to accept `status`, it must delegate to/reuse the same transition logic. It cannot write status independently.

### Step 9 - Handle combined role/status updates deterministically

If one request can change role and status together, calculate the resulting authorization state **before any write** and apply AUTH-009 correctly.

Avoid multi-step behavior such as:

```text
write role first
then validate status
```

because a later failure could leave partial state.

Prefer one transaction/atomic operation when both security-sensitive fields change.

### Step 10 - Preserve authentication boundary

Inspect `JwtAuthGuard` after lifecycle refactor.

It should only check:

```text
status === active
```

and reject otherwise. Do not call lifecycle service from authentication.

### Step 11 - Define stable client-facing behavior

Use concise messages/error codes consistent with backend conventions, for example:

- `User activated`
- `User suspended`
- `User deactivated`
- `CANNOT_REMOVE_LAST_ACTIVE_ADMIN`

Do not expose Clerk/session internals in lifecycle responses.

### Step 12 - Update admin UI if present

Where users are managed, expose intentional actions based on current status.

For active user:

- Suspend
- Deactivate

For suspended user:

- Reactivate
- Deactivate

For inactive user:

- Reactivate
- optionally Suspend only if that workflow is genuinely useful

Use confirmation for suspension/deactivation if existing destructive-action patterns support it.

### Step 13 - Prevent optimistic UI from lying

Preferred simple behavior for this ticket: show pending/loading state and update displayed status only after backend success.

If existing Query mutation code is optimistic, it must rollback accurately on backend failure.

Last-admin rejection must leave UI showing the original active state.

### Step 14 - Add focused lifecycle tests

Test each real transition plus no-op/protected/bypass cases. Detailed cases are below.

### Step 15 - Run validation

```bash
npm run typecheck
npm run lint
npm run test:backend
```

If frontend user-management code changes, also run relevant frontend tests/typecheck/build.

### Step 16 - Re-run status-write repository search

Confirm all production status writes are centralized/delegated through the lifecycle rule path.

Put the final mutation-path list in PR evidence.

## Detailed Test Specification

### TEST-AUTH010-01: Active worker can be suspended

**Purpose:** Prove normal temporary access removal works.

**Level:** Service test.

**Setup:** Existing WORKER with `status=active`, `deactivatedAt=null`; another active admin exists if needed for actor context.

**Action:** Transition worker to `suspended`.

**Expected Result:** Success.

**Required Assertions:**

- status becomes `suspended`;
- `deactivatedAt` becomes a timestamp from this operation;
- role/org/geography unchanged;
- auth data unrelated to lifecycle unchanged.

**Why This Test Exists:** Suspension is one of the primary explicit actions introduced by the lifecycle model.

**If This Test Fails:** Check transition centralization and timestamp calculation. Do not special-case status in controller.

### TEST-AUTH010-02: Active worker can be deactivated

**Purpose:** Prove permanent/retired access removal works.

**Level:** Service.

**Setup:** Active WORKER.

**Action:** Transition to `inactive`.

**Expected Result:** Success.

**Required Assertions:** Status inactive; `deactivatedAt` set; unrelated fields unchanged.

**Why This Test Exists:** Deactivation must use the same lifecycle rules as suspension.

**If This Test Fails:** Inspect whether `updateStatus()` and generic update still have competing implementations.

### TEST-AUTH010-03: Suspended worker can be explicitly reactivated

**Purpose:** Demonstrate the approved replacement for login-time auto-reactivation.

**Level:** Service.

**Setup:** WORKER `status=suspended`, known `deactivatedAt`.

**Action:** Authorized admin transitions to `active`.

**Expected Result:** Success.

**Required Assertions:** Status active; `deactivatedAt=null`; role unchanged.

**Why This Test Exists:** Reactivation should exist, but only as an explicit administrative action.

**If This Test Fails:** Fix lifecycle service. Do not restore auth-time reactivation.

### TEST-AUTH010-04: Inactive worker can be explicitly reactivated

**Purpose:** Cover retired/inactive to active path.

**Level:** Service.

**Setup:** Inactive WORKER.

**Action:** Transition to active.

**Expected Result:** Active, `deactivatedAt=null`.

**Required Assertions:** No role elevation or Clerk mapping changes.

**Why This Test Exists:** Both non-active states require intentional reactivation.

**If This Test Fails:** Check current-state assumptions that only suspended accounts can activate.

### TEST-AUTH010-05: Suspended worker can be changed to inactive

**Purpose:** Support temporary hold becoming permanent deactivation.

**Level:** Service.

**Setup:** Suspended worker with old deactivation timestamp.

**Action:** Transition to inactive.

**Expected Result:** Status inactive.

**Required Assertions:** `deactivatedAt` follows the documented policy for a real transition. If implementation sets a new timestamp, assert that; if preserving original access-removal timestamp is architect-approved, document/test that choice consistently.

**Why This Test Exists:** Cross-non-active transitions are easy to overlook.

**If This Test Fails:** Clarify timestamp policy rather than inventing inconsistent behavior in one path.

### TEST-AUTH010-06: Inactive worker can be changed to suspended if supported

**Purpose:** Cover the declared state machine fully.

**Level:** Service.

**Setup:** Inactive worker.

**Action:** Transition to suspended.

**Expected Result:** Suspended according to documented state machine.

**Required Assertions:** Lifecycle metadata consistent; no implicit activation.

**Why This Test Exists:** Every declared allowed transition should either be tested or removed from the state-machine documentation.

**If This Test Fails:** Reconcile implementation and documented state machine. Do not leave contradictory rules.

### TEST-AUTH010-07: No-op transition does not rewrite lifecycle metadata

**Purpose:** Keep repeated status requests idempotent and predictable.

**Level:** Service.

**Setup:** User already suspended with known `deactivatedAt`.

**Action:** Request `suspended` again.

**Expected Result:** Safe no-op according to chosen convention.

**Required Assertions:** Existing timestamp not silently refreshed; no unrelated writes; result remains suspended.

**Why This Test Exists:** Repeated API retries should not create misleading lifecycle timestamps.

**If This Test Fails:** Make no-op handling explicit before write.

### TEST-AUTH010-08: Last active admin cannot be suspended

**Purpose:** Ensure lifecycle service reuses AUTH-009.

**Level:** Service.

**Setup:** Target is sole active ADMIN.

**Action:** Transition to suspended.

**Expected Result:** Rejected.

**Required Assertions:** No status/timestamp change.

**Why This Test Exists:** Central lifecycle logic must not bypass the administrator lockout invariant.

**If This Test Fails:** Route transition through AUTH-009 helper before writing.

### TEST-AUTH010-09: Last active admin cannot be deactivated

**Purpose:** Same safety for inactive transition.

**Level:** Service.

**Setup:** Sole active ADMIN.

**Action:** Transition to inactive.

**Expected Result:** Rejected; account stays active.

**Required Assertions:** No lifecycle write.

**Why This Test Exists:** Suspension and deactivation both remove access.

**If This Test Fails:** Ensure resulting active-admin state is checked regardless of target non-active status.

### TEST-AUTH010-10: With two active admins, one admin can be suspended/deactivated

**Purpose:** Ensure lifecycle remains usable when redundancy exists.

**Level:** Service/integration.

**Setup:** Admin A and B active; target B.

**Action:** Suspend or deactivate B.

**Expected Result:** Success; A remains active.

**Required Assertions:** Active-admin count remains >=1.

**Why This Test Exists:** Safety rule must not overblock legitimate operations.

**If This Test Fails:** Inspect AUTH-009 count/exclusion logic.

### TEST-AUTH010-11: Generic user update cannot bypass lifecycle rules

**Purpose:** Close the second current status-mutation path.

**Level:** Service.

**Setup:** Last active admin or another lifecycle-sensitive fixture.

**Action:** Call generic `update()` with a status change if API compatibility still permits it.

**Expected Result:** Same result as central lifecycle method, including last-admin rejection and metadata handling.

**Required Assertions:** No direct independent status write.

**Why This Test Exists:** Centralization is meaningless if generic update bypasses it.

**If This Test Fails:** Delegate generic status handling to central lifecycle path or remove status from generic DTO according to compatibility plan.

### TEST-AUTH010-12: Combined role + status update is atomic/safe

**Purpose:** Prevent partial authorization state.

**Level:** Service/integration.

**Setup:** User whose requested update changes both role and status; include last-admin case.

**Action:** Submit combined update through supported path.

**Expected Result:** Either full valid transition succeeds or full operation rejects.

**Required Assertions:** No partial role-only/status-only write after rejection.

**Why This Test Exists:** Multi-field security changes can bypass invariants if applied sequentially.

**If This Test Fails:** Compute resulting state before mutation and use one transaction/update boundary.

### TEST-AUTH010-13: Authentication remains denied until explicit reactivation

**Purpose:** Verify lifecycle and auth boundaries work together.

**Level:** Integration/E2E/manual; AUTH-017 will automate final assembled behavior.

**Setup:** Start with active user, suspend through lifecycle service/API.

**Action:** Attempt auth before and after explicit reactivation.

**Expected Result:** Denied while suspended; allowed only after successful explicit reactivation.

**Required Assertions:** Login attempts do not change status.

**Why This Test Exists:** This is the user-visible security behavior created by AUTH-003 + AUTH-010.

**If This Test Fails:** Determine whether auth is mutating state or lifecycle update did not persist.

### TEST-AUTH010-14: UI does not display successful status change when backend rejects

**Purpose:** Prevent admin UI from lying, especially on last-admin rejection.

**Level:** Frontend test/manual if frontend touched.

**Setup:** Last active admin displayed as active.

**Action:** Trigger suspend/deactivate and mock/receive backend rejection.

**Expected Result:** UI remains active and shows error; action/loading state ends cleanly.

**Required Assertions:** Cached/server state is not left as suspended/inactive.

**Why This Test Exists:** False UI state can cause dangerous operator confusion.

**If This Test Fails:** Remove premature local state mutation or implement proper rollback/invalidation.

### TEST-AUTH010-15: Invalid status value is rejected before service mutation

**Purpose:** Protect the finite state machine at API validation boundary.

**Level:** DTO/controller/E2E.

**Setup:** Request with unsupported status such as `deleted`.

**Action:** Call status endpoint.

**Expected Result:** Validation error; no user mutation.

**Required Assertions:** Service transition method not executed for invalid input.

**Why This Test Exists:** New lifecycle states must be explicit architecture decisions, not arbitrary client strings.

**If This Test Fails:** Ensure Zod DTO enum/validation remains authoritative.

## Manual Verification

Use a disposable worker account:

1. verify account is active and can authenticate;
2. suspend it through admin action;
3. verify DB status + timestamp;
4. verify API access is denied;
5. restart backend;
6. verify access remains denied;
7. reactivate explicitly;
8. verify status active and `deactivatedAt=null`;
9. verify access returns;
10. deactivate;
11. verify access denied;
12. reactivate again;
13. verify no-op status behavior;
14. repeat last-admin protection with test admins;
15. verify generic update cannot bypass the same rules;
16. if frontend changed, verify rejected operation does not leave incorrect UI state.

## Failure Diagnosis Guide

### `PATCH /status` works but generic update bypasses it

Status logic is not centralized. Route generic status updates through the same lifecycle function or remove status from generic update contract if approved.

### Reactivation works only after logging in twice

Look for lingering request-time linking/status behavior. Reactivation should persist in DB before next login.

### `deactivatedAt` is inconsistent

Check no-op/cross-state transition policy and ensure timestamp is set/cleared in one lifecycle method.

### Last-admin rule works in one endpoint only

Lifecycle path is duplicated or controller-specific. Reuse AUTH-009 service invariant.

### UI changes status before backend confirms and does not rollback

Use pending/loading + server-confirmed update or correct optimistic rollback.

## PR Evidence Required

Include:

- status mutation-path inventory before/after;
- documented state machine;
- no-op policy;
- `deactivatedAt` policy;
- test results for every declared transition;
- last-admin tests;
- generic-update bypass test;
- combined role/status atomicity test;
- auth-denied-until-reactivation evidence;
- frontend failure-state evidence if UI changed;
- validation commands/results.

## Acceptance Criteria

- [ ] Status semantics are documented and implemented.
- [ ] Every declared state-machine transition is implemented/tested or explicitly removed from the documented state machine.
- [ ] All production status writes use one lifecycle rule path.
- [ ] Reactivation is explicit.
- [ ] `deactivatedAt` is consistent with status and no-op policy.
- [ ] Last active admin cannot be suspended/deactivated.
- [ ] Generic update cannot bypass lifecycle rules.
- [ ] Combined role/status updates cannot partially bypass safety rules.
- [ ] Auth guard never participates in transitions.
- [ ] Admin UI, if present, reflects backend-confirmed state.

## Definition of Done

- [ ] Backend lifecycle implementation complete.
- [ ] Duplicate/direct status write paths removed or routed centrally.
- [ ] Detailed lifecycle tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual suspend/reactivate/deactivate flow passes.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms transition/timestamp/no-op semantics.

## Rollback

If the new lifecycle service causes regression, restore the previous explicit admin API behavior temporarily, but do not restore auth-time reactivation. Preserve last-admin protection.

If one frontend action breaks, keep secure backend lifecycle rules and fix/temporarily hide the affected UI action rather than weakening the backend.

## Forbidden Shortcuts

Do not:

- reactivate during login;
- change status directly from frontend/database without service rules;
- bypass last-admin protection;
- treat suspended as active;
- clear `deactivatedAt` for suspended/inactive users;
- create separate inconsistent status logic in multiple controllers/services;
- refresh lifecycle timestamp on no-op without an explicit decision;
- weaken backend validation to accept arbitrary statuses.

## STOP - NEEDS ARCHITECT DECISION

Stop if the business needs additional states such as `invited`, `pending`, `locked`, or `deleted`.

Also stop if:

- `suspendedAt`/`inactiveAt` must be tracked separately;
- no-op transitions should intentionally refresh timestamps;
- status deletion/soft-delete semantics overlap with this state machine;
- external HR/IdP systems are supposed to become authoritative for lifecycle state.

Do not invent those semantics in this ticket.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**State-Machine Tests:** Pass / Fail  
**Manual Lifecycle Verification:** Pass / Fail  
**Frontend Verification:** Pass / Fail / N/A  
**Notes:**