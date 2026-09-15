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