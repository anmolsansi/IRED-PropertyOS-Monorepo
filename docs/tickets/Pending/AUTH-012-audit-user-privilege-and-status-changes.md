# AUTH-012: Audit User Privilege and Status Changes

**Status:** Pending  
**Priority:** P1  
**Area:** Security / Auditability / User Administration  
**Complexity:** Medium  
**Depends On:** AUTH-009, AUTH-010  
**Blocks:** AUTH-016, AUTH-017  
**Primary Files:** `Backend/src/modules/users/users.service.ts`, `Backend/src/modules/users/users.controller.ts`

## Objective

Create explicit domain audit records for security-sensitive user administration changes, including role changes and account lifecycle changes.

The existing global `AuditInterceptor` records mutation requests, but its event type is primarily HTTP method + URL and does not capture the old/new authorization values needed for a useful security trail.

After this ticket, a reviewer must be able to answer:

- who changed this user's role/status;
- what the old value was;
- what the new value is;
- when the change occurred;
- which user was targeted;
- what request caused it;
- optionally, why the administrator performed it when a reason is supplied.

## Why This Exists

Privilege changes are materially more sensitive than ordinary profile edits. A generic `PATCH /users/:id` log does not tell an investigator whether the change was a spelling correction or an elevation to `ADMIN`.

PropertyOS already has an `AuditEvent` model with fields including `actorUserId`, `eventType`, `entityType`, `entityId`, and metadata. It also has a global interceptor. This ticket extends the audit trail with explicit semantic events rather than replacing the interceptor.

## Events Required

At minimum create stable event types equivalent to:

- `user_role_changed`
- `user_activated`
- `user_suspended`
- `user_deactivated`
- `admin_privilege_granted`
- `admin_privilege_revoked`

If bootstrap auditing from AUTH-008 is implemented here or already exists, use:

- `bootstrap_admin_created`

Do not encode IDs or URLs into the event type itself.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts`
- user DTO schema only if optional/required reason is introduced
- tests

Potentially add a small shared audit helper only if it removes real duplication and follows repository patterns.

## Required Reading

1. `Backend/src/shared/interceptors/audit.interceptor.ts`
2. Prisma `AuditEvent` model
3. `Backend/src/modules/users/users.service.ts`
4. `Backend/src/modules/users/users.controller.ts`
5. `Backend/src/shared/decorators/current-user.decorator.ts`
6. AUTH-009 and AUTH-010 completed behavior

## Architecture Contract

Keep two audit layers:

### Request audit

Existing interceptor captures that a mutating API request occurred.

### Domain/security audit

This ticket records the meaning of sensitive user-state changes with before/after values.

Do not delete the generic interceptor just because semantic events are added.

## Required Audit Metadata

For role/status events, include only necessary structured metadata such as:

```text
previousRole
newRole
previousStatus
newStatus
reason (if supplied)
requestId (if available)
```

Use:

- `actorUserId` = administrator performing the action;
- `entityType` = `user`;
- `entityId` = target user's PropertyOS ID.

Do not store:

- password;
- password hash;
- access token;
- refresh token;
- Clerk secret;
- authorization header;
- OTP;
- raw session token.

## Step-by-Step Implementation

### Step 1 - Understand current global audit behavior

Read `AuditInterceptor` completely.

Confirm it already logs non-GET mutations and errors, but its event type is route-based.

Do not try to force business before/after values into the interceptor by parsing request bodies globally. This ticket should record semantic events where the service knows the actual state transition.

### Step 2 - Determine how the actor ID reaches `UsersService`

`CurrentUser` can expose the authenticated user from `request.user`.

For sensitive controller operations, pass the actor's local user ID to the service.

Do not trust `actorUserId` supplied in the request body.

### Step 3 - Update service method signatures carefully

Sensitive operations may need an additional context argument, conceptually:

```text
actorUserId
reason?
requestId?
```

Use a small typed context object if that is clearer than multiple loose parameters.

Do not pass the full HTTP request into the service.

### Step 4 - Capture the old state before mutation

Before role/status mutation, load the target user and retain:

- old role;
- old status.

Use the same target record already needed for lifecycle/invariant checks rather than performing unnecessary duplicate queries.

### Step 5 - Perform the validated mutation

Apply AUTH-009 and AUTH-010 rules first.

Only successful state changes generate success domain events.

If the operation is rejected before mutation, the global interceptor may already record the failed request. Do not generate a fake success event.

### Step 6 - Write the semantic audit event

After the mutation is known to have succeeded, write the appropriate audit event.

For high-value security changes, prefer including the user mutation and audit-event creation in the same database transaction when practical so a successful privilege change cannot silently exist without its semantic audit record.

If the current architecture intentionally treats audit persistence as best-effort, STOP for reviewer decision before changing that reliability contract.

### Step 7 - Role-change event rules

Whenever `previousRole !== newRole`, create `user_role_changed` metadata.

Additionally:

- non-ADMIN -> ADMIN: create/use `admin_privilege_granted` semantic event;
- ADMIN -> non-ADMIN: create/use `admin_privilege_revoked` semantic event.

Avoid writing two redundant events if the chosen event taxonomy already makes the role change clear. Pick one consistent scheme and document it in tests. Recommended:

- always `user_role_changed`;
- include metadata `privilegeChange: granted_admin | revoked_admin | none`.

This keeps one event per actual role change.

### Step 8 - Status event rules

Map final status transition to semantic event:

- any non-active -> active: `user_activated`;
- any -> suspended: `user_suspended`;
- any -> inactive: `user_deactivated`.

Metadata includes old/new status.

### Step 9 - Add an optional/required reason policy

For this ticket, require a non-empty reason for:

- granting ADMIN;
- revoking ADMIN;
- suspending a user;
- deactivating a user.

Reactivation reason may be optional unless product owner requires it.

If adding `reason` would break current frontend/API clients unexpectedly, add DTO/API support and frontend input in the same ticket or escalate before making it mandatory.

### Step 10 - Validate reason input

If a reason is accepted:

- trim it;
- reject empty/whitespace-only value where required;
- apply a sensible max length using repository conventions;
- treat it as text, not executable content;
- do not log the entire request body.

### Step 11 - Ensure actor cannot be spoofed

Controller gets actor identity from `@CurrentUser()` or request auth context.

Never accept:

```json
{ "actorUserId": "..." }
```

from the client as authoritative.

### Step 12 - Add tests

Test both mutation result and audit row creation.

### Step 13 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Tests Required

### Role elevation

WORKER -> ADMIN:

- role changes;
- semantic audit exists;
- actor ID is administrator;
- target ID is worker;
- old/new roles correct;
- reason persisted if required.

### Role demotion

ADMIN -> WORKER:

- last-admin rule respected;
- audit written only if change succeeds.

### Suspend

- status changes to suspended;
- audit contains old/new status.

### Deactivate

- same behavior with deactivation event.

### Reactivate

- audit contains previous status and active target state.

### Failed last-admin operation

- privilege/status change rejected;
- no success semantic audit event is created.

### Ordinary profile edit

Changing full name/mobile only must not create a fake role/status security event.

### Actor spoof attempt

Client-provided data cannot change recorded actor ID.

## Manual Verification

1. Login as Admin A.
2. Change Worker B to ADMIN with a reason.
3. Query/use Activity/Audit UI.
4. Confirm actor = Admin A and target = Worker B.
5. Confirm previous/new role values.
6. Suspend Worker B.
7. Confirm a separate semantic status event.
8. Attempt a forbidden last-admin operation.
9. Confirm no success event claims it happened.

## Acceptance Criteria

- [ ] Role changes produce semantic audit records.
- [ ] Status changes produce semantic audit records.
- [ ] Actor is derived from authenticated request, never client input.
- [ ] Before/after values are recorded.
- [ ] Sensitive secrets are never recorded.
- [ ] Failed operations do not create success audit events.
- [ ] Existing generic request audit remains intact.

## Definition of Done

- [ ] Audit implementation complete.
- [ ] Required reason behavior implemented/documented.
- [ ] Tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual audit-history verification passes.
- [ ] Reviewer confirms event taxonomy.

## Rollback

If semantic audit writing breaks user mutations because of an implementation error, fix the audit transaction/service. Do not silently remove auditing from high-risk privilege changes without explicit approval.

## Forbidden Shortcuts

Do not:

- log raw request bodies containing secrets;
- accept actor ID from client;
- rely only on generic URL audit logs;
- write success audit before the DB mutation succeeds;
- record new value without previous value;
- hide privilege changes under generic `user_updated` only.

## STOP - NEEDS ARCHITECT DECISION

Stop if audit-event persistence is currently intentionally best-effort and the team must decide whether security audit records should become transactionally required. Also stop if introducing mandatory reasons would break an external client that cannot be updated in this task.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Audit Taxonomy Used:**  
**Notes:**