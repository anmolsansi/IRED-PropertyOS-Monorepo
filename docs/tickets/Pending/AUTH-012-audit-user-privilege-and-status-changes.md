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
- which user was targeted;
- what the previous authorization state was;
- what the new authorization state is;
- when the change occurred;
- which request caused it where request ID is available;
- why the administrator performed the action when a reason is required/supplied.

## Junior Engineer Orientation

There are two different kinds of audit information in PropertyOS:

```text
Request audit:
"PATCH /users/123 happened"

Security/domain audit:
"Admin A changed Worker B from WORKER to ADMIN for reason X"
```

The first is useful operationally, but it is not enough for security investigation. This ticket adds the second kind.

Do **not** replace the existing `AuditInterceptor`. The interceptor and semantic security events solve different problems.

A good security audit record should let another engineer understand the change without reading the original HTTP body or guessing what `PATCH /users/:id` meant.

## Why This Exists

Privilege changes are materially more sensitive than ordinary profile edits. A generic mutation log does not tell an investigator whether the request corrected a typo or elevated someone to `ADMIN`.

PropertyOS already has an `AuditEvent` model with fields such as `actorUserId`, `eventType`, `entityType`, `entityId`, and metadata. This ticket uses that existing capability to add meaningful, structured security events.

## Event Taxonomy

Use stable event names. Do not put IDs, URLs, timestamps, or variable values into event type strings.

Recommended event model:

### Role changes

Use one event:

```text
user_role_changed
```

Metadata:

```text
previousRole
newRole
privilegeChange = granted_admin | revoked_admin | none
reason
requestId
```

This is preferred over creating two redundant rows (`user_role_changed` + `admin_privilege_granted`) for a single mutation unless the project explicitly wants multiple events.

### Status changes

Use:

- `user_activated`
- `user_suspended`
- `user_deactivated`

Metadata includes previous/new status plus reason/request ID as appropriate.

### Bootstrap

If AUTH-008 already creates a bootstrap audit event, keep a stable type such as:

- `bootstrap_admin_created`

Do not duplicate it here if already implemented correctly.

## Required Audit Metadata

For security-sensitive user changes, include only what is needed:

```text
previousRole
newRole
previousStatus
newStatus
privilegeChange
reason
requestId
```

Use:

- `actorUserId` = authenticated administrator performing the action;
- `entityType` = `user`;
- `entityId` = target user's local PropertyOS ID.

### Never store in security audit metadata

- password;
- password hash;
- temporary password;
- access token;
- refresh token;
- bearer token;
- authorization header;
- OTP;
- Clerk secret;
- raw session token;
- full raw request body.

## Expected Files To Modify

- `Backend/src/modules/users/users.service.ts`
- `Backend/src/modules/users/users.controller.ts`
- user DTO schema if `reason` is introduced/required
- tests

Potentially add a small shared audit helper only if it genuinely reduces repeated semantic-event code and follows repository patterns.

## Required Reading

1. `Backend/src/shared/interceptors/audit.interceptor.ts`
2. Prisma `AuditEvent` model
3. `Backend/src/modules/users/users.service.ts`
4. `Backend/src/modules/users/users.controller.ts`
5. `Backend/src/shared/decorators/current-user.decorator.ts`
6. completed AUTH-009 and AUTH-010 behavior
7. existing audit module/service/UI if present
8. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before editing, explain the difference between `actorUserId` and `entityId`:

- actor = who performed the change;
- entity/target = whose account was changed.

## Architecture Contract

Keep two audit layers.

### Layer 1: Request audit

Existing interceptor captures that a mutating API request occurred, along with route-level context.

### Layer 2: Domain/security audit

Service layer records the meaning of successful security-sensitive state changes with before/after values.

Do not parse arbitrary request bodies in the global interceptor to infer business meaning. The service already knows the validated current state and resulting state.

### Reliability decision

For high-value privilege/status changes, strongly prefer the user mutation and semantic audit write to share a transaction so the system does not successfully change privileges while silently losing the security audit record.

If the current product intentionally defines audit persistence as best-effort, stop and get an explicit decision before changing that contract.

## Reason Policy

For this ticket, require a non-empty reason for:

- granting ADMIN;
- revoking ADMIN;
- suspending a user;
- deactivating a user.

Reactivation reason may remain optional unless product owner chooses otherwise.

Recommended reason validation:

- trim whitespace;
- reject empty/whitespace-only when required;
- reasonable max length, for example 500 characters if no repository convention exists;
- plain text only;
- never treated as executable markup/code.

If making `reason` mandatory would break a supported external client that cannot be updated in this task, stop and escalate rather than silently breaking the API.

## Step-by-Step Implementation

### Step 1 - Read and document current generic audit behavior

Read `AuditInterceptor` completely.

Record:

- which HTTP methods it logs;
- whether successful GETs are skipped;
- event-type format;
- current metadata fields;
- whether audit failure is currently swallowed/best-effort.

**Why:** You need to add semantic events without accidentally removing existing request-level observability.

### Step 2 - Inventory security-sensitive user mutations

From AUTH-009/010 and `UsersService`, list every path that can:

- change `role`;
- change `status`;
- bootstrap an admin if AUTH-008 integrates here.

Map each mutation to the event type/metadata it should produce.

### Step 3 - Obtain actor identity from authenticated context

Use `@CurrentUser()` or equivalent authenticated request context in the controller.

Pass only needed service context, conceptually:

```text
{
  actorUserId,
  requestId?,
  reason?
}
```

Do not pass the entire HTTP request into `UsersService`.

### Step 4 - Never accept actor identity from client input

If a request body contains `actorUserId`, ignore/reject it according to validation contract. It cannot be authoritative.

The caller cannot choose who the audit record says performed the operation.

### Step 5 - Load and retain old state before mutation

Use the same target user record needed by lifecycle/last-admin validation.

Retain:

- previous role;
- previous status.

Avoid redundant queries when current state is already loaded safely.

### Step 6 - Validate reason before mutation where required

If the change requires a reason, validate it before committing the user mutation.

A missing/invalid reason should cause zero user writes and zero success semantic audit rows.

### Step 7 - Apply AUTH-009/AUTH-010 business rules first

The audit feature must not bypass:

- last-admin protection;
- lifecycle state machine;
- deterministic combined role/status rules.

Only a successful validated mutation gets a success event.

### Step 8 - Determine semantic event from actual before/after state

Do not infer solely from request DTO because the request may omit fields or contain values normalized by service logic.

Use:

```text
previous state from DB
+
actual resulting state
```

### Step 9 - Write role-change audit

When `previousRole !== newRole`, create `user_role_changed`.

Set `privilegeChange`:

- non-ADMIN -> ADMIN = `granted_admin`;
- ADMIN -> non-ADMIN = `revoked_admin`;
- other role change = `none`.

Do not create role-change event if role did not actually change.

### Step 10 - Write status-change audit

When status truly changes:

- non-active -> active = `user_activated`;
- any -> suspended = `user_suspended`;
- any -> inactive = `user_deactivated`.

No-op lifecycle requests must not create misleading "changed" events.

### Step 11 - Use a transaction when required by chosen reliability contract

If security semantic audit is mandatory:

```text
transaction:
  validate final invariant as needed
  update user
  create semantic audit event(s)
commit together
```

Be careful with AUTH-011: external Clerk session revocation cannot participate in a DB transaction. Local user + mandatory audit can commit together, then provider cleanup occurs afterward.

### Step 12 - Keep global request audit intact

Do not remove the interceptor event because semantic audit is now better. Both can exist for the same request with different meanings.

### Step 13 - Keep metadata minimal and typed

Avoid dumping entire user objects/DTOs into `metadataJson`.

Write only approved before/after fields and reason/request ID.

### Step 14 - Update DTO/controller for reason if required

If status/role endpoints need a reason:

- add validation;
- update frontend/admin call sites if present;
- keep actor identity server-derived;
- ensure clear validation errors.

### Step 15 - Add detailed tests

Test mutation **and** audit record together. Also test that failed/no-op/profile-only operations do not create false success security events.

### Step 16 - Run validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

If frontend reason fields are added, run corresponding frontend validation/build/tests.

## Detailed Test Specification

### TEST-AUTH012-01: WORKER -> ADMIN creates correct role audit

**Purpose:** Record privilege elevation with trustworthy actor/target/before/after data.

**Level:** Service test.

**Setup:** Admin A performs action on Worker B; B is WORKER; another active admin exists as needed; valid reason provided.

**Action:** Change B role to ADMIN.

**Expected Result:** Role update succeeds and one semantic role-change audit is created.

**Required Assertions:**

- actorUserId = Admin A local ID;
- entityType = `user`;
- entityId = Worker B ID;
- metadata previousRole=WORKER;
- metadata newRole=ADMIN;
- `privilegeChange=granted_admin`;
- reason equals normalized validated reason;
- no secrets/raw body included.

**Why This Test Exists:** Admin elevation is one of the highest-value events for later investigation.

**If This Test Fails:** Verify actor context comes from auth, old state is captured before mutation, and event uses actual result.

### TEST-AUTH012-02: ADMIN -> WORKER creates privilege-revocation audit

**Purpose:** Track removal of administrator privilege.

**Level:** Service.

**Setup:** Two active admins so demotion is allowed; Admin A demotes Admin B with reason.

**Action:** Change B to WORKER.

**Expected Result:** Successful mutation + `user_role_changed` event.

**Required Assertions:** `previousRole=ADMIN`, `newRole=WORKER`, `privilegeChange=revoked_admin`, correct actor/target.

**Why This Test Exists:** Privilege removal is security-relevant and should be explainable later.

**If This Test Fails:** Check role-change taxonomy and AUTH-009 interaction.

### TEST-AUTH012-03: Failed last-admin demotion creates no success semantic event

**Purpose:** Prevent audit history from claiming a change occurred when business rules rejected it.

**Level:** Service.

**Setup:** Sole active admin targeted for demotion.

**Action:** Attempt demotion.

**Expected Result:** Rejected.

**Required Assertions:** User unchanged; no `user_role_changed` success event.

**Why This Test Exists:** False security audit entries are almost as damaging as missing ones.

**If This Test Fails:** Move semantic event creation after successful validation/mutation or inside the same transaction.

### TEST-AUTH012-04: Suspension creates status audit with before/after values

**Purpose:** Track temporary access removal.

**Level:** Service.

**Setup:** Active worker; valid reason.

**Action:** Suspend.

**Expected Result:** Status suspended + `user_suspended` event.

**Required Assertions:** `previousStatus=active`, `newStatus=suspended`, actor/target/reason correct.

**Why This Test Exists:** Security/HR access holds need traceability.

**If This Test Fails:** Verify lifecycle service exposes old/new state to audit logic.

### TEST-AUTH012-05: Deactivation creates deactivation audit

**Purpose:** Track account retirement/access removal.

**Level:** Service.

**Setup:** Active user; valid reason.

**Action:** Deactivate.

**Expected Result:** `user_deactivated` event with correct states.

**Required Assertions:** No token/password/session content in metadata.

**Why This Test Exists:** Deactivation is a material access-control action.

**If This Test Fails:** Review event mapping for target status.

### TEST-AUTH012-06: Reactivation creates activation audit

**Purpose:** Track restoration of access.

**Level:** Service.

**Setup:** Suspended/inactive user.

**Action:** Explicitly reactivate.

**Expected Result:** `user_activated` with previous non-active state and new active state.

**Required Assertions:** Actor/target correct; reason behavior matches optional/required policy.

**Why This Test Exists:** Restoring access should be as traceable as removing it.

**If This Test Fails:** Ensure no-op/active state is distinguished from actual transition.

### TEST-AUTH012-07: No-op status request creates no fake status-change event

**Purpose:** Keep audit history semantically truthful.

**Level:** Service.

**Setup:** User already active.

**Action:** Request active again under AUTH-010 no-op policy.

**Expected Result:** No security status-change event.

**Required Assertions:** No `user_activated` event merely because endpoint was called.

**Why This Test Exists:** Audit should represent state changes, not API invocation volume.

**If This Test Fails:** Base event creation on actual previous/resulting state difference.

### TEST-AUTH012-08: Profile-only update creates no role/status semantic event

**Purpose:** Avoid noise and misleading security history.

**Level:** Service.

**Setup:** Existing worker.

**Action:** Change only name/mobile.

**Expected Result:** Profile update succeeds; generic request audit may exist, but no `user_role_changed`/status event.

**Required Assertions:** Semantic security audit create not called for role/status event.

**Why This Test Exists:** Investigators need high-signal security events.

**If This Test Fails:** Narrow event trigger to actual authorization state changes.

### TEST-AUTH012-09: Client cannot spoof actor ID

**Purpose:** Protect audit integrity.

**Level:** Controller/E2E + service contract.

**Setup:** Authenticated Admin A; request body attempts to include another user's actor ID if validation permits unknown fields in a test seam.

**Action:** Perform allowed role/status change.

**Expected Result:** Audit actor is Admin A from authenticated context.

**Required Assertions:** Client value ignored/rejected; never used as `actorUserId`.

**Why This Test Exists:** An attacker/admin must not be able to make actions appear to come from another person.

**If This Test Fails:** Remove actor field from DTO and derive actor only from request auth context.

### TEST-AUTH012-10: Required reason rejects missing/blank input before mutation

**Purpose:** Ensure sensitive actions are explainable when reason policy requires it.

**Level:** DTO/service/controller.

**Setup:** Sensitive action such as suspend or ADMIN grant; reason missing or whitespace-only.

**Action:** Submit request.

**Expected Result:** Validation/business error.

**Required Assertions:** No user mutation; no success semantic audit.

**Why This Test Exists:** A reason requirement is meaningless if empty strings pass.

**If This Test Fails:** Trim/validate reason before mutation.

### TEST-AUTH012-11: Reason length limit is enforced

**Purpose:** Keep audit metadata bounded and predictable.

**Level:** DTO/service.

**Setup:** Reason exceeds chosen max length.

**Action:** Submit sensitive change.

**Expected Result:** Rejected before mutation.

**Required Assertions:** No user/audit success write.

**Why This Test Exists:** Prevents unbounded audit payloads and abuse.

**If This Test Fails:** Add length validation consistent with documented policy.

### TEST-AUTH012-12: Audit metadata never contains secrets/raw request body

**Purpose:** Protect privacy/security of the audit store.

**Level:** Service/unit.

**Setup:** Request/test context includes fake password/token/authorization-like strings outside approved metadata.

**Action:** Perform a security change.

**Expected Result:** Audit metadata contains only approved fields.

**Required Assertions:** Fake sensitive strings absent from serialized metadata.

**Why This Test Exists:** Audit tables are long-lived and widely useful; leaking credentials there is high impact.

**If This Test Fails:** Replace object/request spreading with an explicit metadata allowlist.

### TEST-AUTH012-13: Mandatory-audit transaction rolls back user change if audit write fails

**Purpose:** Verify chosen security-audit reliability contract.

**Level:** Service/integration.

**Setup:** Valid role/status change; force semantic audit insert to fail inside transaction.

**Action:** Perform change.

**Expected Result:** If mandatory transaction contract is approved, whole operation fails and user state remains unchanged.

**Required Assertions:** No successful privilege/status mutation without corresponding audit.

**Why This Test Exists:** Otherwise a database/audit error can create unaudited privilege changes.

**If This Test Fails:** Fix transaction boundary. If audit is intentionally best-effort instead, stop and update architecture/ticket with explicit approval before changing the test.

### TEST-AUTH012-14: Generic request audit remains present

**Purpose:** Ensure semantic auditing does not remove existing request observability.

**Level:** Integration/manual.

**Setup:** Successful sensitive mutation through HTTP.

**Action:** Inspect audit records/log behavior.

**Expected Result:** Existing generic request audit mechanism still operates alongside semantic event according to current interceptor design.

**Required Assertions:** Interceptor remains registered/functional.

**Why This Test Exists:** The two audit layers are complementary.

**If This Test Fails:** Restore generic interceptor unless an explicit observability redesign was approved.

## Manual Verification

1. Login as Admin A.
2. Change Worker B to ADMIN with a reason.
3. Query Activity/Audit UI or database.
4. Confirm actor = Admin A and target = Worker B.
5. Confirm previous/new role values and privilege classification.
6. Suspend Worker B with reason.
7. Confirm separate semantic status event.
8. Reactivate and verify activation event.
9. Attempt a forbidden last-admin operation.
10. Confirm no success semantic event claims it occurred.
11. Edit only Worker B's name and confirm no fake role/status event.
12. Inspect metadata and confirm no secret values/raw body.

## Failure Diagnosis Guide

### Audit actor equals target accidentally

Check parameter naming/context flow. Actor comes from authenticated request; target comes from route/entity ID.

### Successful role change has no audit row

If mandatory-audit architecture is chosen, transaction/service path is incomplete. Do not rely solely on generic interceptor.

### Failed operation creates success event

Event creation is happening too early or outside proper transaction/result checks.

### Every profile update creates `user_role_changed`

Compare old/new role before creating semantic event.

### Client-provided actor appears in audit

Remove actor from request DTO authority immediately.

### Audit row contains entire DTO/request body

Replace with explicit metadata fields only.

## PR Evidence Required

Include:

- chosen event taxonomy;
- actor/target context flow;
- reason-required action list and max length;
- audit reliability decision (transactional mandatory vs explicitly approved best-effort);
- test results for elevation, demotion, lifecycle changes, failed operations, spoofing, secret exclusion, transaction failure;
- sample **sanitized** audit metadata using fake IDs/data;
- confirmation generic interceptor remains intact;
- validation command results.

## Acceptance Criteria

- [ ] Role changes produce semantic audit records.
- [ ] Status changes produce semantic audit records.
- [ ] Actor is derived from authenticated request, never client input.
- [ ] Before/after values are recorded.
- [ ] Required reasons are validated before sensitive mutations.
- [ ] Sensitive secrets/raw request bodies are never recorded.
- [ ] Failed/no-op operations do not create misleading success events.
- [ ] Existing generic request audit remains intact.
- [ ] Approved audit reliability contract is tested.

## Definition of Done

- [ ] Audit implementation complete.
- [ ] Reason behavior implemented/documented.
- [ ] Detailed tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual audit-history verification passes.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms event taxonomy and reliability behavior.

## Rollback

If semantic audit writing breaks user mutations because of an implementation error, fix the audit transaction/service. Do not silently remove auditing from high-risk privilege changes without explicit approval.

If mandatory audit is causing an outage, use an approved rollback of the whole implementation rather than changing production to unaudited privilege writes ad hoc.

## Forbidden Shortcuts

Do not:

- log/store raw request bodies containing secrets;
- accept actor ID from client;
- rely only on generic URL audit logs;
- write success audit before mutation succeeds;
- record new value without previous value;
- hide privilege changes under generic `user_updated` only;
- generate duplicate redundant event rows without an explicit taxonomy decision;
- swallow mandatory audit write errors while still committing privilege change.

## STOP - NEEDS ARCHITECT DECISION

Stop if audit-event persistence is currently intentionally best-effort and the team must decide whether security audit records should become transactionally required.

Also stop if introducing mandatory reasons would break a supported external client that cannot be updated, or if compliance policy requires additional immutable/audit-retention guarantees beyond the existing `AuditEvent` model.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Audit Taxonomy Used:**  
**Audit Reliability:** Transactional / Best-Effort (Architect Approved)  
**Reason Validation Tests:** Pass / Fail  
**Secret Exclusion Test:** Pass / Fail  
**Notes:**