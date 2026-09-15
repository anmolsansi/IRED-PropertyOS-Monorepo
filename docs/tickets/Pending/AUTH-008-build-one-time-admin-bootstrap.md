# AUTH-008: Build One-Time Administrator Bootstrap

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Administration / Operations  
**Complexity:** Medium  
**Depends On:** AUTH-002, AUTH-003, AUTH-007  
**Blocks:** Production removal of privileged auth fallback  
**Operator Action Required:** Yes

## Objective

Provide a safe, explicit way to create the first PropertyOS administrator in a new environment after privileged login fallback and admin seeding are removed.

This mechanism is for **initial bootstrap only**. It must not run during normal application startup, deployment, authentication, or ordinary database seeding.

## Junior Engineer Orientation

Once AUTH-002/003/007 remove automatic privileged recovery, a brand-new environment has a practical question:

```text
If no admin exists yet, who creates the first admin?
```

The answer must be an **explicit operator action**, not a hidden login fallback.

Think of this script like initial infrastructure provisioning. It is intentionally hard to trigger accidentally and refuses to run once the environment already has an active administrator.

You are not building a permanent break-glass system. You are building a one-time initialization path.

### Security goals

The script must be:

- manual;
- deterministic;
- fail-closed;
- repeat-safe;
- tied to an exact Clerk identity;
- impossible to trigger from a public HTTP request;
- unable to silently promote/reactivate an existing conflicting user.

## Why This Exists

Once authentication can no longer auto-create/reactivate an administrator and `db:seed` no longer creates a master admin, a fresh environment needs an intentional first-admin provisioning procedure.

Without a controlled bootstrap, engineers may reintroduce insecure email fallbacks or manually edit production data inconsistently.

## Architecture Decision Implemented By This Ticket

Use an explicit one-time backend command/script.

Recommended shape:

`Backend/scripts/bootstrap-admin.ts`

Recommended command:

`npm run auth:bootstrap-admin -w ired-propertyos-backend`

Follow existing package-script conventions if names differ.

## Security Contract

The bootstrap must satisfy all of these rules:

- never runs automatically;
- never has fallback email/password values;
- never creates a default password;
- requires explicit operator-supplied identity values;
- verifies the Clerk identity exists;
- verifies supplied email corresponds to the supplied Clerk user;
- refuses to run if an active PropertyOS `ADMIN` already exists;
- never silently promotes/reactivates an existing conflicting user;
- creates an audit record if the audit architecture supports it safely;
- exits non-zero when preconditions fail.

## Required Inputs

Prefer explicit one-time environment inputs:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_CLERK_ID`
- existing `CLERK_SECRET_KEY`
- existing `DATABASE_URL`

Do **not** use `MASTER_ADMIN_EMAIL` or `MASTER_ADMIN_PASSWORD`.

Do not store bootstrap values permanently in `render.yaml` unless an architect explicitly approves that. They should be supplied to the one-time command by the authorized operator.

## Expected Files To Modify/Add

- `Backend/scripts/bootstrap-admin.ts` or equivalent existing scripts location
- `Backend/package.json`
- focused tests for bootstrap preconditions/business logic
- operational docs in coordination with AUTH-018

Potentially use existing Prisma and Clerk dependencies. Do not add a new auth library.

## Required Reading

1. `Backend/prisma/schema.prisma` User model
2. `Backend/src/modules/users/users.service.ts`
3. `Backend/src/shared/guards/jwt-auth.guard.ts`
4. `Backend/prisma/seed.ts` after AUTH-007
5. `Backend/package.json`
6. existing audit-event schema/service if used
7. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before coding, explain in your own words why this script must refuse to promote an existing local user automatically even if the email matches.

## Target Flow

```text
Operator explicitly runs bootstrap command
  -> validate required inputs
  -> connect DB
  -> count active ADMIN users
  -> if active ADMIN exists: REFUSE
  -> fetch exact Clerk user by BOOTSTRAP_ADMIN_CLERK_ID
  -> verify Clerk user's email matches BOOTSTRAP_ADMIN_EMAIL
  -> check local user conflicts by email and clerkUserId
  -> if conflict: REFUSE, do not mutate
  -> create local active ADMIN linked to Clerk ID
  -> optionally create bootstrap audit event
  -> print safe success summary
  -> exit 0
```

## Important Fresh-Environment Boundary

This ticket intentionally uses `active ADMIN exists` as the main refusal condition for initial bootstrap, but do not assume that means the script is a valid emergency recovery tool later.

If a previously initialized environment later has zero active admins because all admins were disabled, automatically allowing bootstrap again may create a security bypass.

If the product needs a persistent "environment already initialized" marker or a separate break-glass process, that is an architect decision. Do not silently turn this bootstrap into recovery logic.

## Step-by-Step Implementation

### Step 1 - Inspect existing script conventions

Search `Backend/` for operational scripts.

If a `scripts/` directory already exists, use it. Otherwise create `Backend/scripts/`.

Do not place bootstrap logic inside:

- `src/main.ts`;
- module constructors/on-init hooks;
- Prisma seed;
- migrations;
- frontend code.

### Step 2 - Add an explicit package command

Add a clearly named command such as:

`auth:bootstrap-admin`

It must run only when invoked manually.

Do not chain it into:

- `start`;
- `build`;
- `postinstall`;
- `db:seed`;
- migration commands;
- Render deploy/start commands.

### Step 3 - Validate environment inputs before database changes

Read required values.

If any required bootstrap identity value is missing/blank:

- print a safe error naming the missing variable;
- perform zero writes;
- exit non-zero.

Normalize email only for comparison. Do not transform the Clerk ID.

### Step 4 - Initialize Prisma and Clerk

Use repository's existing Prisma/Clerk patterns.

Do not print `DATABASE_URL`, `CLERK_SECRET_KEY`, tokens, or provider response bodies containing sensitive material.

### Step 5 - Check whether bootstrap is allowed

Query active ADMIN users.

If count >= 1:

- print a safe refusal message;
- perform zero writes;
- exit non-zero.

Do not add `--force` as a shortcut unless an architect explicitly designs one.

### Step 6 - Fetch the exact Clerk identity by supplied ID

Use `BOOTSTRAP_ADMIN_CLERK_ID` directly.

If the Clerk user cannot be found, refuse.

Do not search by name or choose an account by a loose query.

### Step 7 - Verify email consistency

Read the appropriate primary/verified email from the Clerk user according to the installed SDK/data model.

Compare normalized provider email with `BOOTSTRAP_ADMIN_EMAIL`.

If they differ, refuse with zero writes.

**Why:** The operator must prove both the exact provider ID and the expected human account identity match.

### Step 8 - Check local conflict by Clerk ID

Query local `User` by `clerkUserId`.

If any local user already owns that provider ID:

- do not promote/reactivate/change it;
- report a safe conflict reason;
- stop for manual review.

### Step 9 - Check local conflict by email

Query local `User` by normalized email.

If a user exists with that email but different/missing Clerk identity:

- do not promote;
- do not reactivate;
- do not relink automatically;
- stop and require identity reconciliation.

### Step 10 - Prepare the exact create payload

Only after all checks pass, prepare one new user with:

- normalized email;
- verified exact Clerk user ID;
- appropriate full name from Clerk or explicit safe source;
- `role = ADMIN`;
- `status = active`;
- schema-required fields only.

Do not create a reusable/default password.

If `passwordHash` remains schema-required, use only the project's approved Clerk-managed sentinel/non-login pattern after reviewer confirmation. Do not generate a real fallback credential.

### Step 11 - Use a transaction where multiple local writes must be atomic

If creating both user and audit event, use a Prisma transaction so you do not leave half-bootstrap state.

If audit persistence is intentionally best-effort in current architecture and transaction semantics are unclear, stop for reviewer decision rather than inventing a different audit reliability model.

### Step 12 - Print a safe result

On success print only what operator needs:

- local user ID;
- role/status;
- optionally normalized email if operator-output policy permits;
- confirmation bootstrap succeeded.

Never print secrets/tokens/passwords.

### Step 13 - Ensure cleanup and exit codes

Always disconnect Prisma in a `finally` path or equivalent.

Success -> exit code 0.

Precondition/provider/conflict/write failure -> non-zero.

### Step 14 - Add tests before manual execution

Mock Clerk and DB logic. Test every refusal path and exact success payload.

### Step 15 - Validate in a disposable environment

Run bootstrap once -> exactly one admin.

Run it again -> refusal, still exactly one admin.

Then verify normal Clerk login for the bootstrapped identity in that disposable environment.

## Checkpoint

- [ ] Bootstrap is manual only.
- [ ] No fallback email exists.
- [ ] No fallback password exists.
- [ ] Exact Clerk ID is verified.
- [ ] Email/ID conflict fails closed.
- [ ] Existing active admin causes refusal.
- [ ] Existing conflicting local user is not promoted/reactivated.
- [ ] Second run is safe.
- [ ] No public bootstrap endpoint exists.

## Detailed Test Specification

### TEST-AUTH008-01: Missing email input refuses with zero writes

**Purpose:** Prove bootstrap requires explicit operator intent/data.

**Level:** Unit/script test.

**Setup:** `BOOTSTRAP_ADMIN_EMAIL` absent/blank; other dependencies mocked.

**Action:** Run bootstrap logic.

**Expected Result:** Non-zero/failure before DB mutation.

**Required Assertions:** No user create/update; no Clerk lookup if validation happens first.

**Why This Test Exists:** A script with fallback values recreates the original privileged-default problem.

**If This Test Fails:** Remove fallback/default email and validate inputs before side effects.

### TEST-AUTH008-02: Missing Clerk ID refuses with zero writes

**Purpose:** Ensure bootstrap cannot identify the provider account only by email.

**Level:** Unit/script.

**Setup:** Email present, `BOOTSTRAP_ADMIN_CLERK_ID` missing.

**Action:** Run.

**Expected Result:** Refusal; zero writes.

**Required Assertions:** No email-only provider selection.

**Why This Test Exists:** Exact provider ID is part of the security proof.

**If This Test Fails:** Make Clerk ID mandatory.

### TEST-AUTH008-03: Existing active admin blocks bootstrap

**Purpose:** Make one-time behavior repeat-safe.

**Level:** Service/script integration.

**Setup:** DB contains at least one active ADMIN.

**Action:** Run bootstrap with otherwise valid inputs.

**Expected Result:** Refused.

**Required Assertions:** No Clerk/user create/update needed after refusal point; admin count unchanged.

**Why This Test Exists:** Prevents bootstrap from becoming a general privilege-escalation command.

**If This Test Fails:** Ensure active-admin check occurs before creation and cannot be bypassed by ordinary flags.

### TEST-AUTH008-04: Clerk ID not found refuses

**Purpose:** Prevent creation tied to a nonexistent external identity.

**Level:** Unit.

**Setup:** Zero active admins; provider fetch by supplied ID throws/not found.

**Action:** Run.

**Expected Result:** Refused; zero local writes.

**Required Assertions:** No user created.

**Why This Test Exists:** Local admin must be linked to a real verified provider account.

**If This Test Fails:** Move local creation after successful provider verification.

### TEST-AUTH008-05: Clerk email mismatch refuses

**Purpose:** Catch operator typo/wrong Clerk ID.

**Level:** Unit.

**Setup:** Supplied Clerk ID exists but provider email differs from supplied bootstrap email.

**Action:** Run.

**Expected Result:** Refusal; zero local writes.

**Required Assertions:** Existing provider/local data unchanged.

**Why This Test Exists:** It creates a two-piece identity consistency check.

**If This Test Fails:** Add normalized email comparison before local creation.

### TEST-AUTH008-06: Existing local Clerk-ID conflict refuses without promotion

**Purpose:** Prevent bootstrap from hijacking an existing account mapping.

**Level:** Unit/integration.

**Setup:** No active admin, but local non-admin/inactive user already owns supplied `clerkUserId`.

**Action:** Run.

**Expected Result:** Refused.

**Required Assertions:** Existing user's role/status/mapping unchanged; no second user created.

**Why This Test Exists:** A pre-existing identity mapping is security evidence requiring review.

**If This Test Fails:** Remove any auto-promotion/reactivation path.

### TEST-AUTH008-07: Existing local email conflict refuses without relinking

**Purpose:** Prevent email-based privilege promotion.

**Level:** Unit/integration.

**Setup:** Local user exists with bootstrap email but different/null Clerk ID.

**Action:** Run.

**Expected Result:** Refused.

**Required Assertions:** No role/status/clerkUserId change.

**Why This Test Exists:** Otherwise bootstrap would recreate privileged email matching in another form.

**If This Test Fails:** Require AUTH-005-style identity reconciliation.

### TEST-AUTH008-08: Clean fresh environment creates exactly one active admin

**Purpose:** Prove the intended success path works.

**Level:** Integration with disposable DB + mocked/test Clerk.

**Setup:** Zero active admins, no email/ID conflicts, Clerk identity exists and email matches.

**Action:** Run bootstrap.

**Expected Result:** Success.

**Required Assertions:** Exactly one local user created; exact Clerk ID; role ADMIN; status active; no default password; only intended fields written.

**Why This Test Exists:** Security controls are useful only if legitimate initialization still works.

**If This Test Fails:** Fix the explicit bootstrap path; do not restore login-time provisioning.

### TEST-AUTH008-09: Second execution is refused and idempotent

**Purpose:** Prove bootstrap cannot be reused after successful initialization.

**Level:** Integration.

**Setup:** Run successful Test 08 first or pre-create active admin.

**Action:** Run command again.

**Expected Result:** Refused.

**Required Assertions:** Total user/admin count unchanged; no modifications to first admin.

**Why This Test Exists:** Repeat-safe behavior prevents accidental/admin-sprawl during deployment troubleshooting.

**If This Test Fails:** Ensure active-admin precondition is checked every invocation.

### TEST-AUTH008-10: Script is not reachable through application HTTP routes

**Purpose:** Ensure bootstrap remains an operator command, not an attackable API.

**Level:** Static/E2E route inspection.

**Setup:** Running application/routes or repository search.

**Action:** Search controllers/routes for bootstrap endpoint and inspect package/start scripts.

**Expected Result:** No public/admin HTTP endpoint invokes bootstrap; start/build/seed do not chain it.

**Required Assertions:** Bootstrap only exists as explicit script/command.

**Why This Test Exists:** A protected-looking HTTP endpoint can still become a severe privilege escalation surface.

**If This Test Fails:** Remove route/automatic invocation and retain CLI/operator path only.

### TEST-AUTH008-11: Failure during audit-event creation follows approved atomicity

**Purpose:** Prevent partially-created privileged state when the implementation intends transactional user+audit creation.

**Level:** Unit/integration.

**Setup:** Clean success preconditions; force audit write failure inside transaction if audit is transactionally required.

**Action:** Run bootstrap.

**Expected Result:** According to approved design, transaction rolls back and no admin remains if audit is mandatory.

**Required Assertions:** No partial privileged user when transaction contract says atomic.

**Why This Test Exists:** Partial bootstrap state is difficult to reason about operationally.

**If This Test Fails:** Fix transaction boundary or escalate if audit is intentionally best-effort.

## Manual Verification

On a fresh/disposable environment:

1. verify zero active admins;
2. supply test bootstrap identity values;
3. run command;
4. query DB and verify exact values;
5. authenticate through normal Clerk login;
6. confirm admin can access an ADMIN-only route;
7. run bootstrap command again;
8. confirm second run refuses;
9. confirm no second admin created;
10. confirm no bootstrap route exists in Swagger/router output.

## Failure Diagnosis Guide

### Script creates admin despite an existing active admin

Check precondition query/order. It must execute before creation and use `role=ADMIN AND status=active`.

### Existing local user gets promoted instead of conflict error

This violates the ticket. Remove auto-promotion/reactivation and require manual identity reconciliation.

### Script requires/prints a password

For Clerk-based bootstrap, do not create a reusable fallback password. Review schema-required password handling and escalate if a safe sentinel design is unclear.

### Second run creates another admin

One-time guard is broken. Verify first admin is committed as active before command completes and that subsequent count sees it.

### Operator wants `--force`

Do not add it casually. A force mode is effectively privileged recovery and needs separate architect review/audit controls.

## PR Evidence Required

Include:

- command/script path and package command;
- proof it is not chained to start/build/seed/deploy;
- list of preconditions/refusal paths;
- test results for every refusal and success case;
- disposable bootstrap first-run and second-run output summary (no secrets);
- proof normal Clerk login works for bootstrapped test admin;
- confirmation no default password exists;
- audit-event behavior/decision.

## Acceptance Criteria

- [ ] Fresh environment can intentionally create its first admin.
- [ ] Bootstrap requires explicit verified identity input.
- [ ] No default credential exists.
- [ ] Existing active admin prevents another bootstrap.
- [ ] Existing conflicting user is not silently promoted/reactivated/relinked.
- [ ] Script never runs automatically.
- [ ] No HTTP bootstrap endpoint exists.
- [ ] Tests cover all refusal paths and second-run behavior.

## Definition of Done

- [ ] Script/command implemented.
- [ ] Detailed tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Disposable-environment manual test passes.
- [ ] AUTH-018 documentation references the command.
- [ ] Required PR evidence recorded.
- [ ] Security reviewer approves bootstrap conditions.

## Rollback

Removing the bootstrap script does not require DB rollback. If a test bootstrap created an unwanted disposable user, remove it only through normal test cleanup.

Never delete or demote a legitimate production admin without explicit authorization.

## Forbidden Shortcuts

Do not:

- run bootstrap at server startup;
- use `MASTER_ADMIN_*`;
- include a default email/password;
- auto-promote existing users;
- auto-reactivate inactive users;
- accept frontend-provided bootstrap requests;
- expose a public `/bootstrap-admin` HTTP endpoint;
- allow repeated bootstrap after an active admin exists;
- add an unreviewed `--force` bypass.

## STOP - NEEDS ARCHITECT DECISION

Stop if the current Prisma schema requires a password representation that cannot safely support a Clerk-only bootstrap without creating a fake reusable credential.

Also stop if:

- business requires a formal break-glass recovery account;
- an initialized environment with zero active admins must reuse this bootstrap;
- you need a persistent environment-initialized marker;
- bootstrap must operate in a multi-organization future role model.

Those are broader security design decisions.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Disposable Bootstrap Test:** Pass / Fail  
**Second Run Refused:** Pass / Fail  
**Normal Admin Login:** Pass / Fail  
**Notes:**

---

## Expanded Architecture Discussion And Decision Record

### Decision 1: Bootstrap is initialization, not recovery

**Decision:** The bootstrap command exists to create the first administrator in a genuinely fresh environment. It is not a reusable way to restore access after administrators were intentionally disabled.

**Reason:** A reusable zero-admin recovery command can become a second privileged bypass. Recovery after an initialized environment loses all admins requires a separately designed break-glass process with stronger operational controls.

**Rejected alternative:** Allow bootstrap whenever active-admin count is zero.

**Why rejected:** An attacker/operator could first deactivate the last admin, then invoke bootstrap to create a new privileged identity if command access were available.

**Future reconsideration trigger:** If the business formally requires emergency recovery, create a separate reviewed ticket for break-glass design rather than broadening this script silently.

### Decision 2: Exact provider identity is required before local privilege creation

**Decision:** Operator supplies exact Clerk user ID plus expected email, and the script verifies both before creating the local admin.

**Reason:** The provider ID is the stable identity key. Email provides an additional operator sanity check without being used as the runtime identity join.

**Rejected alternative:** Search Clerk by email and bootstrap the first result.

**Why rejected:** Search ambiguity or provider-data mistakes could bind admin privilege to the wrong external account.

### Decision 3: Existing local records are conflicts, not promotion candidates

**Decision:** If email or provider ID is already attached to a local user, bootstrap refuses rather than promoting/reactivating/relinking that row.

**Reason:** Existing local state may encode intentional role/status/security decisions. First-admin bootstrap is not authorized to overwrite them.

### Decision 4: No reusable password is introduced for Clerk bootstrap

**Decision:** The bootstrap must not create a known/default reusable credential. If schema requirements make that impossible, stop for architecture review.

**Reason:** The entire auth-hardening effort would be undermined by replacing one fallback credential with another.

## Facts, Assumptions, And Unknowns

### Facts

- After AUTH-002/003/007 there is no approved login-time or seed-time privileged creation path.
- Clerk is the intended identity provider for this bootstrap design.
- PropertyOS local DB owns role/status.

### Assumptions to verify

- A fresh environment can be distinguished operationally from an initialized environment needing recovery.
- Operator can securely obtain the intended Clerk user ID without committing it as a permanent secret/config default.
- Schema permits creation of a Clerk-managed user without a reusable fallback password, or has an already-approved sentinel approach.

### Unknowns requiring architect decision

- Whether a persistent environment-initialized marker is needed beyond active-admin count.
- Whether audit creation must be transactionally mandatory with the user create.
- Whether the product needs a formal break-glass recovery path.

## Intern Execution Sequence - No Improvisation

### Phase A - Prove the script cannot run accidentally

1. Find package/start/build/deploy/seed scripts.
2. Add bootstrap only as a standalone explicit command.
3. Search all package/deploy files for the command name.
4. Confirm no automatic script references it.
5. Search controllers for any bootstrap route.
6. Record these search results before implementing business logic.

### Phase B - Implement pure precondition validation first

1. Validate required inputs.
2. Validate email syntax/normalization using existing project patterns where available.
3. Reject blank/malformed provider ID.
4. Query active-admin count.
5. Do not create/update anything in this phase.
6. Add tests proving each failed precondition performs zero writes.

### Phase C - Verify provider identity

1. Fetch exact Clerk user by supplied ID.
2. Extract the approved primary/verified email field.
3. Compare normalized email to explicit operator input.
4. Treat provider lookup errors/timeouts as failure, not permission to continue.
5. Do not dump the provider object in logs.

### Phase D - Detect local conflicts

1. Query by `clerkUserId`.
2. Query by normalized email.
3. If either record exists, refuse and print a safe conflict reason.
4. Do not update that record.
5. Add tests for inactive user, non-admin user, and mismatched mapping conflicts.

### Phase E - Create atomically

1. Construct the minimal create payload only after all checks pass.
2. If semantic audit event is required in the same transaction, create user + audit atomically.
3. Confirm exactly one user becomes active ADMIN.
4. Never set unrelated organization/geography automatically unless explicitly required by current schema/product design.
5. Return/print a safe success summary.

### Phase F - Repeat-safety and real login proof

1. Run bootstrap in disposable environment.
2. Query exact resulting row.
3. Authenticate normally using the mapped Clerk identity.
4. Verify an admin-only route.
5. Run bootstrap a second time.
6. Confirm refusal and zero DB change.
7. Restart the backend and verify the bootstrapped admin still works through normal auth, not bootstrap behavior.

## Additional Test Cases And Explanations

### TEST-AUTH008-12: Concurrent bootstrap attempts create at most one admin

**Purpose:** Protect against two operators/processes invoking bootstrap at nearly the same time.

**Level:** Integration/concurrency test if feasible.

**Setup:** Fresh disposable DB with zero active admins. Two invocations use the same valid test identity and begin close together.

**Action:** Execute both concurrently.

**Expected Result:** At most one successful privileged user creation. The other invocation fails cleanly due to uniqueness/precondition/transaction conflict.

**Required Assertions:** Final active-admin count is exactly one; no duplicate local rows; no partial conflict state.

**Database Assertions:** Unique `clerkUserId`/email constraints remain satisfied.

**Why This Test Exists:** A simple `count admin -> create` sequence is race-prone without DB constraints/transaction reasoning.

**False Positive To Avoid:** Running the commands sequentially, which does not exercise the race.

**If This Test Fails:** Strengthen the transaction/constraint strategy. Do not introduce a force flag.

### TEST-AUTH008-13: Clerk timeout refuses without local mutation

**Purpose:** Ensure external uncertainty fails closed.

**Level:** Unit/integration.

**Setup:** Fresh DB and valid-looking explicit inputs. Clerk exact-user lookup times out/throws transient error.

**Action:** Run bootstrap.

**Expected Result:** Non-zero failure, zero local user/audit creation unless a failure audit is intentionally supported separately.

**External-Service Assertions:** No fallback email search or locally fabricated identity.

**Why This Test Exists:** Operator pressure during provider outages is exactly when unsafe fallback behavior tends to be introduced.

**False Positive To Avoid:** Returning provider `not found`; timeout and confirmed absence are different error paths.

**If This Test Fails:** Move all local writes after successful exact provider verification.

### TEST-AUTH008-14: Previously initialized environment with zero active admins does not silently become bootstrap-eligible without approved recovery design

**Purpose:** Protect the initialization-vs-recovery boundary.

**Level:** Manual/integration depending on chosen initialization marker/design.

**Setup:** Environment history indicates it was initialized, but all admins are now inactive/suspended.

**Action:** Attempt bootstrap.

**Expected Result:** Follow the architect-approved behavior. If no explicit recovery design exists, this is a STOP condition, not a successful bootstrap.

**Required Assertions:** No new admin is created merely because active-admin count is zero if the environment is known initialized.

**Why This Test Exists:** Zero active admins can mean either "fresh" or "locked/revoked." Those are security-different states.

**False Positive To Avoid:** Using a brand-new empty DB, which tests initial bootstrap rather than recovery misuse.

**If This Test Fails:** Do not patch around it ad hoc. Escalate break-glass/environment-marker design.

## Observability And Audit Expectations

A successful bootstrap should leave enough evidence to answer: when it ran, which local user was created, which provider ID was linked, and that the result was an active ADMIN. Do not record secrets or raw provider payloads.

If AUTH-012 semantic auditing is available, prefer an event concept such as `user.bootstrap_admin_created` with system/operator context that can be safely represented. If audit atomicity is not yet approved, document the behavior rather than silently inventing reliability guarantees.

Failed preconditions may be logged to operator output with safe reason codes. Never echo `CLERK_SECRET_KEY`, `DATABASE_URL`, tokens, or reusable credentials.

## Reviewer Walkthrough

1. Prove the command is manual-only by reviewing package/deploy/start references.
2. Review all precondition checks before the create statement.
3. Confirm exact Clerk ID fetch plus email consistency check.
4. Confirm existing email/ID rows are refused, never promoted.
5. Inspect the minimal user create payload.
6. Inspect transaction/audit behavior.
7. Review second-run and concurrent-run tests.
8. Verify no default password/fallback identity exists.
9. Verify normal auth, not bootstrap, is used after creation.
10. Verify recovery semantics are not silently mixed into initialization.

## Handoff Notes

After AUTH-008 completes:

- production can remove privileged login/seed fallbacks without losing a documented fresh-environment initialization path;
- AUTH-013 can remove persistent master-admin runtime variables confidently;
- AUTH-018 can document exactly when/how the one-time command is used and what evidence to capture;
- future emergency recovery must not reuse this mechanism unless separately designed and approved.

This ticket creates the first admin. It does not define ongoing admin lifecycle safety. AUTH-009/AUTH-010 own that responsibility.
