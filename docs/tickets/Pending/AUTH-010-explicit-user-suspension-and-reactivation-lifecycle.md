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

## Why This Exists

The current user service allows status changes through generic `updateStatus()` and also through generic `update()`. That works mechanically, but sensitive lifecycle operations deserve clearer business rules.

Now that AUTH-003 removes login-time reactivation, administrators need a safe and understandable way to suspend, deactivate, and reactivate users.

## Status Semantics

Use these meanings unless the product owner explicitly changes them:

### `active`

- user is currently permitted to authenticate, subject to role/org/geography authorization;
- `deactivatedAt` should be null.

### `suspended`

- temporary access lock;
- user cannot authenticate;
- used for investigation, temporary security hold, or temporary removal of access;
- `deactivatedAt` records when access was removed.

### `inactive`

- account is retired/deactivated;
- user cannot authenticate;
- typical use: employee/contractor no longer requires access;
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

A no-op transition such as `active -> active` should either return the current user safely or reject as a no-op based on existing API conventions. Do not silently perform unrelated writes.

Every transition that removes active-admin status must pass AUTH-009 last-admin protection.

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
5. AUTH-009 completed implementation
6. user-management frontend files, if present

## API Compatibility Decision

For this ticket, preserve the existing `PATCH /users/:id/status` API unless there is a strong repository reason not to.

The important change is service-layer lifecycle behavior, not an unnecessary breaking API change.

The controller may continue receiving:

```json
{ "status": "active" | "inactive" | "suspended" }
```

but it must route that request through explicit service transition logic.

## Architecture Contract

- Controller validates input and delegates.
- Service owns transition rules.
- Auth guard only reads status.
- Clerk session cleanup is AUTH-011.
- Audit-event completeness is AUTH-012.
- Last-admin invariant is AUTH-009.

## Step-by-Step Implementation

### Step 1 - Audit all status mutation paths

Search repository for:

- `status: UserStatus`
- `status: "active"`
- `status: "inactive"`
- `status: "suspended"`
- `updateStatus(`
- writes to `deactivatedAt`

List every application path that can mutate user status.

Do not include test fixtures unless they are relevant to production behavior.

### Step 2 - Centralize transition logic in `UsersService`

Create or refactor to a single internal lifecycle path, conceptually similar to:

```text
transitionStatus(userId, targetStatus)
```

Exact naming is flexible.

Every controller/service path that changes status must use the same transition logic.

### Step 3 - Load the current user first

Before mutation:

1. load target user;
2. if missing -> `NotFoundException`;
3. determine current role/status;
4. determine requested target status.

Do not update blindly without knowing current state.

### Step 4 - Apply last-admin protection

If target is currently an active ADMIN and requested state would make it non-active, call/reuse AUTH-009 protection before writing.

Do not duplicate a slightly different last-admin rule.

### Step 5 - Set `deactivatedAt` consistently

When target status becomes:

- `inactive` -> set `deactivatedAt = now`;
- `suspended` -> set `deactivatedAt = now`;
- `active` -> set `deactivatedAt = null`.

If product later needs separate `suspendedAt`, that is a schema enhancement outside this ticket.

### Step 6 - Remove status mutation from generic profile logic where practical

The generic `update()` currently permits `status`.

Preferred outcome:

- profile update handles profile fields and role according to its own rules;
- status changes go through the central lifecycle function.

If API compatibility requires `update()` to still accept status temporarily, it must internally call the same lifecycle rules rather than writing status directly.

Do not leave two independent implementations.

### Step 7 - Keep role and status updates deterministic

If a single request can currently change both role and status, calculate the resulting authorization state and apply AUTH-009 correctly.

Do not allow ordering such as "demote first, then status check" to bypass final-admin protection.

### Step 8 - Define client-facing messages

Use concise stable messages such as:

- `User activated`
- `User suspended`
- `User deactivated`

For errors, do not expose sensitive Clerk/provider details.

### Step 9 - Update admin UI if present

Where users are managed, expose explicit actions based on current status:

For active user:

- Suspend
- Deactivate

For suspended user:

- Reactivate
- Deactivate

For inactive user:

- Reactivate
- optionally Suspend only if product needs it

Require a confirmation for suspension/deactivation if that matches existing destructive-action UI patterns.

Do not make status changes happen merely by opening/editing a profile form.

### Step 10 - Prevent optimistic UI from lying

The UI must not show the new status until the backend confirms success, or it must roll back optimistic state on failure.

Last-admin rejection must display a clear error to the admin.

### Step 11 - Add tests

Cover all status transitions and protected failure cases.

### Step 12 - Validate

```bash
npm run typecheck
npm run lint
npm run test:backend
```

If frontend user-management code changes, also run the relevant frontend tests/build.

## Tests Required

### Active worker

- active -> suspended: allowed, `deactivatedAt` set;
- active -> inactive: allowed, `deactivatedAt` set.

### Suspended worker

- suspended -> active: allowed, `deactivatedAt` cleared;
- suspended -> inactive: allowed.

### Inactive worker

- inactive -> active: allowed, `deactivatedAt` cleared.

### Last active admin

- active -> suspended: rejected;
- active -> inactive: rejected.

### Two active admins

- one can be suspended/deactivated while the other remains active.

### Authentication regression

- inactive/suspended user remains denied until explicit reactivation succeeds.

## Manual Verification

Use a disposable worker account:

1. verify account is active and can authenticate;
2. suspend it through admin action;
3. verify API access is denied;
4. restart backend;
5. verify access remains denied;
6. reactivate explicitly;
7. verify access returns;
8. deactivate;
9. verify access denied;
10. reactivate again;
11. verify `deactivatedAt` behavior after each transition.

Then repeat last-admin protection with two test admins.

## Acceptance Criteria

- [ ] Status semantics are documented and implemented.
- [ ] All production status writes use one lifecycle rule path.
- [ ] Reactivation is explicit.
- [ ] `deactivatedAt` is consistent with status.
- [ ] Last active admin cannot be suspended/deactivated.
- [ ] Auth guard never participates in transitions.
- [ ] Admin UI, if present, reflects backend-confirmed state.

## Definition of Done

- [ ] Backend lifecycle implementation complete.
- [ ] Duplicate/direct status write paths removed or routed centrally.
- [ ] Tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual suspend/reactivate/deactivate flow passes.
- [ ] Reviewer confirms transition semantics.

## Rollback

If the new lifecycle service causes regression, restore the previous explicit admin API behavior temporarily, but do not restore auth-time reactivation. Preserve last-admin protection.

## Forbidden Shortcuts

Do not:

- reactivate during login;
- change status directly from frontend/database without service rules;
- bypass last-admin protection;
- treat suspended as active;
- clear `deactivatedAt` for suspended/inactive users;
- create separate inconsistent status logic in multiple controllers.

## STOP - NEEDS ARCHITECT DECISION

Stop if the business needs additional states such as `invited`, `pending`, `locked`, or `deleted`. Do not overload the existing three statuses with new meanings without a lifecycle/schema decision.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes:**