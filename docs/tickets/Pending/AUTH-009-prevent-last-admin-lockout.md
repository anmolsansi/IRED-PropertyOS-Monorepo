# AUTH-009: Prevent Last-Administrator Demotion or Deactivation

**Status:** Pending  
**Priority:** P0  
**Area:** Authorization / User Administration  
**Complexity:** Medium  
**Depends On:** AUTH-003, AUTH-008  
**Blocks:** AUTH-010, AUTH-016, AUTH-017  
**Primary File:** `Backend/src/modules/users/users.service.ts`

## Objective

Prevent normal user-management operations from leaving PropertyOS with zero active administrators.

After this ticket, the backend must reject any operation that would demote, suspend, or deactivate the final active `ADMIN`.

## Junior Engineer Orientation

Removing the magical master-admin recovery path is correct, but it creates a new operational responsibility: the normal application must not let an administrator accidentally remove the final administrator.

Think of the invariant as a database safety rule:

```text
After any ordinary user-management operation,
there must still be >= 1 user where:
role = ADMIN AND status = active
```

This rule belongs in backend service/domain logic. A disabled frontend button is not enough because an API caller, old frontend build, script, or future endpoint could still call the backend directly.

You are not creating a new admin automatically. If the operation would remove the last active admin, the correct behavior is to **reject the operation**.

## Why This Exists

The current `UsersService.updateStatus()` and `UsersService.update()` can change administrator status/role. The `DELETE /users/:id` controller route also maps to setting the target user inactive.

Once AUTH-003 removes automatic admin reactivation, an accidental final-admin status/role change could lock everyone out of administration.

## Security Invariant

At the end of every ordinary user-administration transaction:

```text
count(users where role = ADMIN and status = active) >= 1
```

This applies to ordinary product operations. It does not define emergency production recovery.

### What counts as removing an active admin?

A target currently contributes to the count only when:

```text
current.role = ADMIN
AND
current.status = active
```

A requested change removes that contribution if resulting state is anything other than active ADMIN, for example:

- ADMIN -> WORKER;
- ADMIN -> RIDER;
- active -> inactive;
- active -> suspended;
- combined update that changes both fields;
- delete/deactivate route that ultimately sets inactive.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts` only if actor/self information is required by implementation
- `Backend/src/modules/users/dto/users.schema.ts` only if error/API contract changes require it
- user service tests

No Prisma schema migration should be necessary.

## Required Reading

1. `Backend/src/modules/users/users.service.ts`
2. `Backend/src/modules/users/users.controller.ts`
3. `Backend/src/modules/users/dto/users.schema.ts`
4. Prisma `UserRole` and `UserStatus` enums
5. `Backend/src/shared/guards/roles.guard.ts`
6. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before editing, list **every production path** that can change `User.role` or `User.status`.

## Target Behavior Examples

```text
1 active ADMIN exists
 -> attempt ADMIN -> WORKER
 -> reject
```

```text
1 active ADMIN exists
 -> attempt active -> inactive
 -> reject
```

```text
1 active ADMIN exists
 -> attempt active -> suspended
 -> reject
```

```text
2 active ADMINs exist
 -> deactivate one
 -> allow
 -> 1 active ADMIN remains
```

```text
1 active ADMIN + 1 inactive ADMIN
 -> deactivate/demote active ADMIN
 -> reject
```

The inactive admin does not count as an available administrator.

## Architecture Contract

The invariant belongs in the service/domain layer so every controller/API path gets the same protection.

Do not rely on:

- frontend button disabling;
- controller-only checks;
- a count performed long before mutation;
- client-provided role counts;
- auto-promoting another worker;
- login-time recovery.

The check and mutation must be protected from obvious race conditions as far as practical with the current Prisma/PostgreSQL architecture.

## Step-by-Step Implementation

### Step 1 - Inventory every privilege-removal path

Search `Backend/src/modules/users/` and repository-wide for:

- role updates;
- status updates;
- `updateStatus`;
- `update(`;
- deactivate/delete routes;
- any direct `prisma.user.update` outside `UsersService` that can change role/status.

Create a short list in the PR description.

**Why:** The invariant is useless if one endpoint bypasses it.

### Step 2 - Model current and resulting authorization state

For a partial update, calculate:

```text
resultingRole = data.role ?? current.role
resultingStatus = data.status ?? current.status
```

Then compare:

```text
currentIsActiveAdmin
resultingIsActiveAdmin
```

A last-admin check is required only when current is active admin and resulting is not.

### Step 3 - Centralize the invariant check

Inside `UsersService`, add/reuse one helper with a clear purpose, conceptually:

`assertCanRemoveActiveAdmin(targetUser, requestedChanges)`

Do not duplicate slightly different last-admin logic in `update()`, `updateStatus()`, and controller routes.

### Step 4 - Count other active administrators

When the operation would remove an active admin, count **other** active admins:

```text
role = ADMIN
status = active
id != targetUser.id
```

If count is zero, reject using a stable backend error/message such as `CANNOT_REMOVE_LAST_ACTIVE_ADMIN` if the project has/introduces error codes.

### Step 5 - Protect `updateStatus()`

Before changing status:

1. load target;
2. determine whether it is currently active ADMIN;
3. if target status is non-active, run invariant;
4. reject if no other active admin;
5. otherwise update normally.

### Step 6 - Protect generic `update()`

Because `update()` accepts role and status, compute resulting state from both current + requested values.

Do not check only `data.role` or only `data.status`.

### Step 7 - Protect DELETE/deactivate path through the same service rule

The controller's delete/deactivate route should continue to call protected service logic.

Do not add an independent controller count check and assume that is enough.

### Step 8 - Decide self-deactivation behavior through the same invariant

An admin may target their own account if current API permits it.

Rule for this ticket:

- if another active admin exists, self-deactivation may follow normal lifecycle behavior;
- if this user is the last active admin, reject.

Do not special-case self actions to bypass the invariant.

### Step 9 - Consider transaction/race safety

Two active admins could issue concurrent operations that each see the other as active and both become non-active.

Use the simplest repository-compatible transactional strategy. At minimum, group the relevant read/check/update in a Prisma transaction and document the isolation assumptions.

If true serializable protection is needed but current transaction API/isolation is not clear, stop for architect review. Do not claim a race is solved merely because `$transaction` exists.

### Step 10 - Never auto-create/promote replacement admin

If last-admin removal is rejected, return an error.

Do not:

- promote oldest worker;
- reactivate an inactive admin;
- invoke bootstrap automatically.

### Step 11 - Add service tests

Test current/resulting state combinations and negative update assertions.

### Step 12 - Add API/E2E coverage later through AUTH-017

Service tests prove the invariant implementation; E2E proves every route reaches it.

### Step 13 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Detailed Test Specification

### TEST-AUTH009-01: Only active admin cannot be deactivated

**Purpose:** Protect the core lockout invariant.

**Level:** Service unit/integration.

**Setup:** Target Admin A is `ADMIN/active`. Count query for other active admins returns 0.

**Action:** Request status `inactive` through protected service method.

**Expected Result:** Operation rejected.

**Required Assertions:**

- `user.update` for deactivation not called;
- Admin A remains active;
- no Clerk session revocation should occur in AUTH-011 path because status change never committed;
- no success audit event created.

**Why This Test Exists:** This is the most direct accidental-lockout scenario.

**If This Test Fails:** Verify count query excludes target and filters both role and active status before update.

### TEST-AUTH009-02: Only active admin cannot be suspended

**Purpose:** Suspension removes administrative access just like deactivation.

**Level:** Service.

**Setup:** Same as Test 01.

**Action:** Target `suspended`.

**Expected Result:** Rejected; no status mutation.

**Required Assertions:** Admin remains `active`.

**Why This Test Exists:** A rule checking only `inactive` would leave a simple bypass.

**If This Test Fails:** Treat every resulting non-active state consistently.

### TEST-AUTH009-03: Only active admin cannot be demoted to WORKER

**Purpose:** Protect role-based removal from bypassing status protection.

**Level:** Service.

**Setup:** Last active ADMIN.

**Action:** Generic update with `role=WORKER`.

**Expected Result:** Rejected.

**Required Assertions:** Role remains ADMIN; status remains active; no update.

**Why This Test Exists:** The invariant is about resulting active-admin state, not only status field.

**If This Test Fails:** Ensure generic `update()` participates in the same helper.

### TEST-AUTH009-04: Only active admin cannot be demoted to RIDER

**Purpose:** Cover every current non-admin role.

**Level:** Service.

**Setup/Action:** Same as above with `RIDER`.

**Expected Result:** Rejected.

**Required Assertions:** No update.

**Why This Test Exists:** Hardcoded WORKER-only checks can miss RIDER.

**If This Test Fails:** Compare resulting role generically against ADMIN.

### TEST-AUTH009-05: Profile-only update on last admin is allowed

**Purpose:** Avoid overblocking safe updates.

**Level:** Service.

**Setup:** Last active admin.

**Action:** Change only `fullName` or `mobileNumber`.

**Expected Result:** Allowed.

**Required Assertions:** Role/status unchanged; helper does not reject merely because target is last admin.

**Why This Test Exists:** The rule applies only when the operation removes active-admin status.

**If This Test Fails:** Your helper is checking target identity without computing resulting state.

### TEST-AUTH009-06: Two active admins allow one to be deactivated

**Purpose:** Ensure legitimate admin lifecycle remains possible.

**Level:** Service/integration.

**Setup:** Admin A and Admin B both active. Target B; count of other active admins = 1.

**Action:** Deactivate B.

**Expected Result:** Allowed; A remains active.

**Required Assertions:** Exactly one active admin remains after operation.

**Why This Test Exists:** Safety controls should not make admin accounts impossible to manage.

**If This Test Fails:** Verify count query and condition only reject when zero *other* active admins exist.

### TEST-AUTH009-07: Inactive/suspended admins do not satisfy redundancy requirement

**Purpose:** Prevent counting unusable admins.

**Level:** Service.

**Setup:** Admin A active; Admin B inactive or suspended.

**Action:** Try to remove active-admin state from A.

**Expected Result:** Rejected.

**Required Assertions:** Count query requires `status=active`.

**Why This Test Exists:** Counting all ADMIN rows would create a false sense of recoverability.

**If This Test Fails:** Tighten count filter.

### TEST-AUTH009-08: Worker/Rider status changes are not blocked by admin invariant

**Purpose:** Prevent collateral damage to normal user lifecycle.

**Level:** Service.

**Setup:** Active worker/rider; one active admin exists separately.

**Action:** Suspend/deactivate worker/rider.

**Expected Result:** Allowed according to normal lifecycle rules.

**Required Assertions:** Last-admin helper returns early for non-admin target.

**Why This Test Exists:** A broad "must always count admin first" implementation may unnecessarily complicate/deny all status changes.

**If This Test Fails:** Limit invariant to operations that actually reduce active-admin count.

### TEST-AUTH009-09: Combined role/status update uses resulting state

**Purpose:** Catch partial-update logic bugs.

**Level:** Service.

**Setup:** Last active ADMIN.

**Action:** Send update containing multiple fields, e.g. `role=WORKER`, `status=inactive`, plus profile fields.

**Expected Result:** Rejected before mutation.

**Required Assertions:** None of the requested fields are partially written.

**Why This Test Exists:** Checking only one field or mutating in stages can bypass/partially apply security rules.

**If This Test Fails:** Compute resulting state before any update and write atomically.

### TEST-AUTH009-10: DELETE/deactivate endpoint reaches same protection

**Purpose:** Ensure alternate API route cannot bypass service invariant.

**Level:** Controller/E2E or service-call verification.

**Setup:** Last active admin.

**Action:** Invoke route that maps `DELETE /users/:id` to inactive.

**Expected Result:** Rejected; admin remains active.

**Required Assertions:** Controller delegates to protected service path; no separate direct Prisma write.

**Why This Test Exists:** Security rules often get bypassed through convenience endpoints.

**If This Test Fails:** Route is not using centralized lifecycle logic.

### TEST-AUTH009-11: Self-deactivation follows the same rule

**Purpose:** Protect against an admin locking themselves out when they are the last active admin.

**Level:** Service/E2E.

**Setup:** Actor and target are Admin A; no other active admin.

**Action:** Deactivate self.

**Expected Result:** Rejected.

**Required Assertions:** State unchanged.

**Why This Test Exists:** Self-actions are still ordinary user-management operations with the same system invariant.

**If This Test Fails:** Remove self-specific bypass.

### TEST-AUTH009-12: Concurrent last-admin removal risk is tested/documented

**Purpose:** Verify race handling matches implementation's transaction guarantees.

**Level:** Integration/concurrency test if practical; otherwise explicit documented review with a focused transaction test.

**Setup:** Two active admins and concurrent operations attempting to remove each other's active-admin state.

**Action:** Execute operations concurrently against disposable DB using the chosen transaction/isolation strategy.

**Expected Result:** At least one operation must fail or final state must still have one active admin according to approved concurrency design.

**Required Assertions:** Final DB count of active admins >= 1.

**Why This Test Exists:** Two individually correct count-then-update calls can race.

**If This Test Fails:** Do not ignore it. Review transaction isolation/locking/serializable strategy with architect.

## Manual Verification

Use a disposable/local DB:

1. create Admin A active;
2. verify A is the only active admin;
3. try deactivate A -> rejected;
4. try suspend A -> rejected;
5. try demote A to WORKER/RIDER -> rejected;
6. update A's name -> allowed;
7. create Admin B active;
8. deactivate B -> allowed;
9. verify A remains active;
10. reactivate B through explicit workflow;
11. demote B -> allowed;
12. verify A remains active;
13. exercise DELETE/deactivate path for last-admin case;
14. if practical, run the concurrency scenario.

## Failure Diagnosis Guide

### Last admin can still be removed through one endpoint

Your rule is not centralized. Inventory all role/status mutation paths again and route them through the same service invariant.

### Two admins exist but removal is incorrectly rejected

Check whether query excludes target user. Counting the target as the "other" admin is wrong.

### Inactive admin is being counted

Ensure count filters `status=active`.

### Profile edit is rejected

Compute resulting role/status before invoking the safety check. Do not block safe profile changes.

### Concurrency test leaves zero admins

Simple read-then-update transaction is insufficient under current isolation. Escalate and implement an appropriate atomic/locking/serializable strategy.

## PR Evidence Required

Include:

- inventory of all role/status mutation paths;
- central helper/service design;
- exact active-admin count query semantics;
- test results for last-admin status changes, role changes, DELETE path, safe profile update, two-admin cases, and concurrency reasoning;
- manual test results;
- documented transaction/isolation approach and residual risk if any.

## Acceptance Criteria

- [ ] Backend prevents zero active admins.
- [ ] Protection covers status and role changes.
- [ ] Protection covers delete/deactivate API path.
- [ ] Protection applies to self-deactivation.
- [ ] Inactive/suspended admins do not count as active redundancy.
- [ ] Frontend/API alternatives cannot bypass the invariant.
- [ ] Non-admin user lifecycle behavior remains unaffected.
- [ ] Concurrency behavior is tested or explicitly architect-reviewed.

## Definition of Done

- [ ] Service invariant implemented once and reused.
- [ ] Detailed tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual verification passes.
- [ ] Required PR evidence recorded.
- [ ] Reviewer checks resulting-state and concurrency reasoning.
- [ ] Error behavior is documented.

## Rollback

This is a safety invariant. If it causes a legitimate administrative operation to fail, fix the rule or data state. Do not remove the protection without a replacement lockout-prevention mechanism.

## Forbidden Shortcuts

Do not:

- check only in frontend;
- check only in controller;
- count all admins regardless of status;
- auto-promote a worker;
- reactivate an inactive admin automatically;
- allow bypass via `DELETE`;
- catch the invariant error and continue with update;
- ignore a demonstrated concurrency race;
- add a hidden force parameter without security review.

## STOP - NEEDS ARCHITECT DECISION

Stop if the product introduces organization-scoped administrators and the invariant needs to be "one active admin per organization" rather than one globally.

Also stop if the current database transaction/isolation approach cannot reliably protect against concurrent final-admin removal. Do not claim race safety without evidence.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Mutation Paths Reviewed:**  
**Concurrency Test/Review:**  
**Notes:**

---

## Expanded Architecture Discussion And Decision Record

### Decision 1: The invariant is based on resulting state, not the requested field name

**Decision:** Determine whether an operation removes an active admin by comparing the current user state with the complete resulting role/status state.

**Reason:** Privilege can be removed by role change, status change, combined update, or an alternate delete/deactivate route. Field-specific checks are easy to bypass accidentally.

**Rejected alternative:** Add one guard inside `updateStatus()` and assume the problem is solved.

**Why rejected:** Generic `update()` can demote an admin without touching status, and DELETE can route differently.

### Decision 2: The invariant belongs in the backend service/domain layer

**Decision:** Centralize the safety rule in `UsersService` (or an equivalent domain service), and make all relevant routes reuse it.

**Reason:** UI checks are advisory. The backend owns the final state mutation and must enforce the invariant for every caller.

**Rejected alternative:** Disable the dangerous buttons in the frontend only.

**Why rejected:** Direct API calls, scripts, stale frontends, tests, and future controllers would bypass it.

### Decision 3: Rejection is safer than automatic replacement

**Decision:** When removal would leave zero active admins, return a stable error and perform no mutation.

**Reason:** Automatically promoting/reactivating another user would be an unrequested privilege grant and could create a larger security incident than the lockout being prevented.

### Decision 4: Concurrency is part of correctness

**Decision:** The chosen implementation must document and test how two simultaneous admin-removal transactions cannot both succeed and leave zero active admins.

**Reason:** A sequential unit test is insufficient for a count-then-update invariant. Two callers can each see the other admin before either commit.

## Facts, Assumptions, And Unknowns

### Facts

- `UsersService.updateStatus()` and generic `update()` can affect the active-admin set.
- DELETE/deactivate behavior ultimately changes status.
- Current roles include `ADMIN`, `WORKER`, and `RIDER`; statuses include active/inactive/suspended.

### Assumptions to verify

- The current product invariant is global, not one active admin per organization.
- All role/status writes can be routed through the protected service logic.
- PostgreSQL/Prisma transaction features available in the deployed versions can support the chosen race-safety strategy.

### Unknowns requiring architect decision

- Whether future organization-scoped admins need a per-organization invariant.
- Exact isolation/locking strategy if a simple transaction cannot prove race safety.
- Whether self-deactivation should require an additional UX confirmation beyond the backend invariant (not required for backend correctness).

## Intern Execution Sequence - No Improvisation

### Phase A - Build the mutation-path map

1. Search repository-wide for writes to `role` and `status`.
2. List controller route -> service method -> Prisma write for each path.
3. Mark paths that can turn an active ADMIN into anything else.
4. Verify DELETE/deactivate path is included.
5. Stop if you find a production direct Prisma write that bypasses the users service and cannot safely be routed through it.

### Phase B - Write a resulting-state helper and unit tests

1. Given current user + partial update, calculate resulting role/status.
2. Unit-test safe profile-only changes.
3. Unit-test demotion only.
4. Unit-test inactive only.
5. Unit-test suspended only.
6. Unit-test combined role+status changes.
7. Do not query DB yet in this pure-resulting-state helper if separation is practical.

### Phase C - Add the active-admin invariant

1. Only invoke expensive safety logic when current user is active ADMIN and resulting state is not active ADMIN.
2. Count other `ADMIN/active` users, excluding target ID.
3. If none exist, throw the stable last-admin error before mutation.
4. If at least one exists, proceed to the normal update.
5. Confirm non-admin changes do not perform unnecessary admin counts if the implementation can avoid them cleanly.

### Phase D - Make race behavior explicit

1. Put check + mutation into the selected transaction boundary.
2. Add a concurrency integration test using two active admins.
3. Fire both removal operations close enough to overlap.
4. Query final active-admin count.
5. If it reaches zero, stop and escalate transaction design.
6. Do not mark ticket complete with a note saying the race is "unlikely."

### Phase E - Verify every route

1. Test generic PATCH update.
2. Test status-specific route.
3. Test DELETE/deactivate route.
4. Test self-targeting if allowed.
5. Verify every one reaches the same invariant.
6. Confirm no controller has a direct user write.

## Additional Test Cases And Explanations

### TEST-AUTH009-13: No-op role/status update on last admin is allowed

**Purpose:** Prevent the invariant from blocking an update that leaves the target as active ADMIN.

**Level:** Service unit/integration.

**Setup:** Only active admin. Request explicitly includes `role=ADMIN` and/or `status=active` plus an allowed profile change.

**Action:** Execute update.

**Expected Result:** Allowed because resulting state still contributes one active admin.

**Required Assertions:** No last-admin rejection; final role/status remain active ADMIN.

**Why This Test Exists:** Implementations that trigger purely on presence of `role`/`status` fields can overblock harmless updates.

**False Positive To Avoid:** Omitting role/status entirely, which tests a different profile-only path.

**If This Test Fails:** Base the condition on resulting state, not field presence.

### TEST-AUTH009-14: Failed last-admin operation does not trigger downstream side effects

**Purpose:** Ensure rejection happens before session revocation, audit-success creation, notifications, or other lifecycle effects.

**Level:** Service unit/integration.

**Setup:** Last active admin plus mocks/spies for Clerk session revocation, audit success event, notifications if wired.

**Action:** Attempt deactivation/suspension.

**Expected Result:** Rejected with no downstream success side effects.

**Required Assertions:** User unchanged; provider revoke not called; success audit not created; no lifecycle notification claiming deactivation succeeded.

**Why This Test Exists:** A correct final DB row is not enough if external side effects already happened before the invariant rejected the operation.

**False Positive To Avoid:** Not wiring the side-effect spies, which cannot prove ordering.

**If This Test Fails:** Move the invariant before side effects and align transaction/orchestration ordering.

### TEST-AUTH009-15: Two concurrent distinct removal paths still preserve one admin

**Purpose:** Exercise concurrency across different APIs, not only two identical service calls.

**Level:** Integration/E2E if practical.

**Setup:** Two active admins. Operation A uses status deactivation; Operation B uses role demotion or DELETE path concurrently.

**Action:** Start both operations concurrently.

**Expected Result:** At most one removes active-admin state; final active-admin count remains >= 1.

**Why This Test Exists:** Different mutation paths can have different transaction boundaries even if each passes isolated tests.

**False Positive To Avoid:** Routing both test operations through the same mocked helper without exercising real DB/transaction behavior.

**If This Test Fails:** Centralization/transaction coverage is incomplete.

## Observability And Audit Expectations

Successful privilege removals should later produce semantic audit events through AUTH-012. A rejected last-admin operation must not create a **success** event stating the role/status changed. If rejection attempts are audited, they should be clearly marked as denied attempts rather than state changes.

Use a stable, non-sensitive error code such as `CANNOT_REMOVE_LAST_ACTIVE_ADMIN` so frontend/operator behavior can distinguish this invariant from generic validation failures. Do not include a list of administrator emails in the client error.

## Reviewer Walkthrough

1. Review the repository-wide mutation-path inventory.
2. Review resulting-state calculation before the DB count.
3. Review count filter: `ADMIN`, `active`, target excluded.
4. Review every relevant route and confirm centralized service enforcement.
5. Review no-op and profile-only safe cases.
6. Review negative assertions proving rejected operations have zero side effects.
7. Review the actual DB-backed concurrency test and transaction/isolation explanation.
8. Query final active-admin count in the concurrency test.
9. Reject any auto-promotion/reactivation fallback.

## Handoff Notes

After AUTH-009 completes:

- AUTH-010 can expose explicit suspend/reactivate lifecycle operations without risking ordinary removal of the final active admin.
- AUTH-011 can revoke provider sessions only after a lifecycle transition has passed this invariant.
- AUTH-012 can audit approved privilege changes at a centralized service boundary.
- AUTH-016/AUTH-017 can treat `>=1 active ADMIN` as a permanent regression invariant.

If the role model later becomes organization-scoped, revisit this ticket's global invariant explicitly rather than assuming it still matches product semantics.
