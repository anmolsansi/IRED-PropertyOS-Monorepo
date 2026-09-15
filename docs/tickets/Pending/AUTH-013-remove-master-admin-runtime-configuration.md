# AUTH-013: Remove Master-Admin Runtime Configuration

**Status:** Pending  
**Priority:** P1  
**Area:** Configuration / Deployment / Security  
**Complexity:** Small  
**Depends On:** AUTH-001, AUTH-007, AUTH-008  
**Blocks:** AUTH-018  
**Operator Action Required:** Yes, for live environment cleanup

## Objective

Remove `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` from PropertyOS runtime/deployment configuration and active setup documentation after request-time privileged fallback and seed-time privileged bootstrap have been removed.

The running PropertyOS application must not require master-admin credentials to start, seed reference data, deploy, or authenticate normal users.

## Junior Engineer Orientation

This ticket is the cleanup that proves the old privileged mechanism is actually gone from operations, not merely hidden from one TypeScript file.

A security feature is not fully removed if:

```text
code no longer uses MASTER_ADMIN_EMAIL
but
render.yaml / .env examples / deployment docs still tell operators to configure it
```

Those stale settings create future risk because another engineer may assume the old behavior is intentional and reconnect it later.

The replacement is **not** another permanent privileged runtime variable. First-admin creation is a separate explicit one-time bootstrap from AUTH-008.

## Why This Exists

The repository currently references master-admin environment variables in multiple places, including root/backend environment examples, Render configuration, seed/deployment instructions, and historical code.

Leaving obsolete privileged settings behind causes:

1. future engineers to assume the old fallback is still supported;
2. operators to keep unnecessary privileged values in hosting configuration;
3. accidental reintroduction of special-email/password behavior;
4. confusion about whether `db:seed` or normal startup creates an administrator.

## Preconditions

Before deleting these settings:

- AUTH-001 complete: request auth does not use master-admin email;
- AUTH-007 complete: normal seed does not use master-admin credentials;
- AUTH-008 complete: first-admin bootstrap is a separate explicit procedure;
- at least one legitimate mapped active administrator is verified in any existing production environment before live config removal.

Do not remove live recovery/config values first and discover afterward that production still relied on obsolete code.

## Expected Files To Inspect/Modify

At minimum:

- `.env.example`
- `Backend/.env.render.example`
- `render.yaml`
- `docs/FREE_TIER_DEPLOYMENT.md`
- `Backend/prisma/seed.ts`
- `Backend/src/shared/guards/jwt-auth.guard.ts`
- root/backend README/setup docs returned by search
- any CI/deploy scripts that export the variables

Use repository-wide search because this list can change.

## Target State

Active runtime code, config, deployment examples, and operator instructions contain zero obsolete requirements for:

- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- the former hardcoded privileged email;
- the former hardcoded privileged password.

Historical completed tickets may describe that these values used to exist. Do not rewrite historical records merely to make text search return zero. Classify matches rather than deleting context blindly.

## Replacement Configuration

AUTH-008 may use one-time operator inputs such as:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_CLERK_ID`

These are one-time bootstrap inputs, not normal long-lived service configuration.

Do not add `BOOTSTRAP_ADMIN_PASSWORD` unless separately approved.

## Step-by-Step Implementation

### Step 1 - Run a repository-wide search before editing

Search for:

```text
MASTER_ADMIN_EMAIL
MASTER_ADMIN_PASSWORD
MasterAdmin
Master Admin
```

Also search for exact former fallback credential strings if known from current history.

Put the list of current active matches in the PR notes before editing.

**Why:** This provides a reviewable before/after inventory and prevents missing one deployment surface.

### Step 2 - Classify every match

Mark each result as:

- runtime application code;
- seed/script code;
- environment example;
- hosting/deployment config;
- active operator documentation;
- historical ticket/documentation;
- unrelated text.

Do not delete historical/audit context simply because it contains the string.

### Step 3 - Verify dependency tickets actually removed code usage

Inspect `JwtAuthGuard` and normal seed.

If either still reads `MASTER_ADMIN_*`, stop. Complete AUTH-001/AUTH-007 before deleting config.

### Step 4 - Clean `.env.example`

Remove obsolete master-admin keys and comments telling developers to configure them for normal startup or seed.

If one-time bootstrap inputs are documented here, label them explicitly as temporary/manual, but prefer the AUTH-008/AUTH-018 runbook rather than normal runtime env examples.

### Step 5 - Clean `Backend/.env.render.example`

Remove obsolete keys and comments.

Check surrounding comments so there is no sentence such as "Admin seed" left implying ordinary seed creates the administrator.

### Step 6 - Clean `render.yaml`

Remove persistent environment declarations for the obsolete keys.

Do not replace them with persistent bootstrap values for convenience.

Review `preDeployCommand`, build/start scripts, and seed/migration commands to ensure none expect them indirectly.

### Step 7 - Update active deployment documentation

In `docs/FREE_TIER_DEPLOYMENT.md` and other setup docs:

- remove instructions to set master-admin email/password;
- correct any statement that routine seed creates an admin;
- point first-admin initialization to the explicit AUTH-008 bootstrap command/runbook;
- state that redeploy/restart/seed does not create/reactivate privileged users.

### Step 8 - Search application/scripts again

Search TypeScript/Prisma/shell/YAML/package scripts for both env names.

Expected result: no active executable/config requirement remains.

If another supported subsystem legitimately uses the same names, stop for ownership review rather than deleting it blindly.

### Step 9 - Validate locally with variables absent

Ensure both variables are unset in the shell/process.

Run:

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run build:backend
```

Run normal seed against disposable DB and start backend according to local setup.

### Step 10 - Verify normal auth without obsolete variables

Use mapped active test user under Clerk auth.

Confirm:

- backend starts;
- active mapped user authenticates;
- missing user does not get privileged fallback;
- inactive/suspended user remains denied.

### Step 11 - Verify bootstrap remains separate

The normal backend must not require `BOOTSTRAP_ADMIN_*` either.

Only the explicit AUTH-008 command should need bootstrap inputs when it is intentionally invoked.

### Step 12 - Clean live hosting values only after safe rollout

Authorized operator:

1. verifies legitimate production admin access;
2. opens backend hosting environment settings;
3. removes `MASTER_ADMIN_EMAIL`;
4. removes `MASTER_ADMIN_PASSWORD`;
5. saves/redeploys if platform requires;
6. verifies backend health/startup;
7. verifies existing admin login;
8. verifies ordinary protected route.

Do not paste old/new values into PR/ticket comments.

### Step 13 - Handle credential exposure separately

If any real account ever used the old fallback password, rotate/reset through the supported auth provider and revoke sessions as appropriate.

Deleting the string from current Git content is not credential rotation.

### Step 14 - Run final search and record evidence

Repeat repository search. Classify any remaining historical references and record why they are safe.

## Detailed Test / Verification Specification

### TEST-AUTH013-01: Backend typecheck/build succeeds with both variables unset

**Purpose:** Prove normal application code has no compile/build dependency on obsolete config.

**Level:** Build/config verification.

**Setup:** Unset `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD`.

**Action:** Run backend typecheck and build.

**Expected Result:** Commands succeed.

**Required Assertions:** No config-validation/startup code reports either variable as required.

**Why This Test Exists:** A stale environment schema/config loader can survive after business logic is removed.

**If This Test Fails:** Search config validation and imported helpers before re-adding any variable.

### TEST-AUTH013-02: Backend startup succeeds without master-admin variables

**Purpose:** Prove runtime does not require obsolete privilege configuration.

**Level:** Manual/integration.

**Setup:** Valid normal local/test runtime configuration except both obsolete keys absent.

**Action:** Start backend.

**Expected Result:** Service starts and health endpoint works.

**Required Assertions:** No startup fallback/secret error references master admin.

**Why This Test Exists:** Build success alone does not prove runtime config validation is clean.

**If This Test Fails:** Inspect runtime config loaders and startup scripts.

### TEST-AUTH013-03: Normal reference seed succeeds without master-admin variables

**Purpose:** Protect AUTH-007 separation.

**Level:** Integration with disposable DB.

**Setup:** Both variables absent.

**Action:** Run normal seed.

**Expected Result:** Reference seed completes without prompting/reading privileged values.

**Required Assertions:** No admin user is created/reactivated by seed.

**Why This Test Exists:** Seed instructions/config are a major historical source of these values.

**If This Test Fails:** AUTH-007 is incomplete or docs/scripts still chain old behavior.

### TEST-AUTH013-04: Normal Clerk authentication succeeds without obsolete variables

**Purpose:** Prove legitimate users do not rely on special config.

**Level:** Integration/manual.

**Setup:** Active mapped Clerk test user; obsolete keys absent.

**Action:** Access protected route.

**Expected Result:** Authentication succeeds via strict Clerk ID mapping.

**Required Assertions:** No master-admin config read/log occurs.

**Why This Test Exists:** Operators need confidence removing live variables will not break ordinary auth.

**If This Test Fails:** Inspect auth code for stale config dependency. Do not restore fallback.

### TEST-AUTH013-05: Missing/inactive user gets no special behavior without variables

**Purpose:** Confirm config removal cannot expose a hidden default fallback.

**Level:** Integration/unit.

**Setup:** Missing or inactive user under valid Clerk identity.

**Action:** Authenticate.

**Expected Result:** Denied; zero privilege/lifecycle writes.

**Required Assertions:** No implicit default master email/password is used.

**Why This Test Exists:** Removing env vars is unsafe if code falls back to a built-in default.

**If This Test Fails:** Search for hardcoded defaults and complete AUTH-001/007.

### TEST-AUTH013-06: Explicit bootstrap works only when invoked separately

**Purpose:** Demonstrate replacement operational model.

**Level:** Manual/script verification.

**Setup:** Disposable new environment, normal app starts without bootstrap inputs.

**Action:** Start app, then separately invoke AUTH-008 bootstrap with explicit values.

**Expected Result:** App does not auto-bootstrap; explicit command can initialize first admin.

**Required Assertions:** No `BOOTSTRAP_ADMIN_*` requirement for ordinary runtime.

**Why This Test Exists:** Prevents replacing one permanent privileged runtime mechanism with another.

**If This Test Fails:** Separate bootstrap command/config from application startup.

### TEST-AUTH013-07: Active config repository search has no obsolete references

**Purpose:** Verify cleanup across all repo surfaces.

**Level:** Static/manual verification.

**Setup:** Final branch.

**Action:** Search names/former credential strings.

**Expected Result:** Remaining matches are only intentionally historical documentation/tickets, if any.

**Required Assertions:** No runtime code, active env example, deploy YAML, package script, or current setup instructions use obsolete keys.

**Why This Test Exists:** Stale operational config is the main risk addressed by this ticket.

**If This Test Fails:** Classify and remove/update active matches.

### TEST-AUTH013-08: Render/deployment config parses/builds after key removal

**Purpose:** Ensure YAML/config cleanup did not break deployment syntax or commands.

**Level:** Static/build/deployment preview where available.

**Setup:** Updated `render.yaml`/deployment config.

**Action:** Run available validation/build or inspect platform deploy preview.

**Expected Result:** Config remains valid and backend build/start commands unchanged except obsolete env entries.

**Required Assertions:** No new persistent bootstrap secret keys added as replacement.

**Why This Test Exists:** Security cleanup should not cause unrelated deployment breakage.

**If This Test Fails:** Fix syntax/config references without restoring obsolete keys.

### TEST-AUTH013-09: Live environment smoke passes after operator removes variables

**Purpose:** Prove production no longer depends on them.

**Level:** Production smoke test, authorized operator only.

**Setup:** New secure code deployed; legitimate admin access already verified; rollback plan available.

**Action:** Remove variables, redeploy/restart if required, check health and admin auth.

**Expected Result:** Service healthy; mapped admin authenticates; protected route works.

**Required Assertions:** No need to restore variables; no privileged fallback behavior.

**Why This Test Exists:** Repository correctness does not guarantee live platform config has no hidden dependency.

**If This Test Fails:** Use AUTH-018 rollback decision tree. Do not permanently re-enable privileged fallback.

## Manual Verification

Local:

1. unset both variables;
2. build/typecheck/test;
3. run seed on disposable DB;
4. start backend;
5. authenticate mapped active user;
6. test missing/inactive user rejection;
7. confirm normal startup does not ask for bootstrap variables.

Production/operator:

1. verify at least one legitimate admin first;
2. remove old hosting values;
3. verify health/startup;
4. verify admin login and protected route;
5. record completion without exposing secrets.

## Failure Diagnosis Guide

### Startup says `MASTER_ADMIN_EMAIL` is required

Search config validation/helpers. One dependency is incomplete. Do not restore variable as permanent solution.

### Seed asks for admin password

AUTH-007 is incomplete or old script/docs are still being used.

### Active mapped admin cannot log in after removal

Check whether strict Clerk mapping/config is correct. The fix is identity/config correctness, not reintroducing master-admin values.

### Search still finds references in completed tickets

Historical documentation can remain. Confirm it is clearly descriptive, not active setup instructions.

### Hosting deploy fails because removed key is referenced in command

Update the command/script to the new architecture. Do not recreate the key merely to satisfy stale scripting.

## PR Evidence Required

Include:

- before/after search inventory;
- active references removed by file;
- classification of intentionally retained historical references;
- build/typecheck/test results with variables unset;
- seed result without variables;
- mapped-user auth verification;
- bootstrap-separation verification;
- live config cleanup status (`Pending operator` or completed by named authorized operator), without secret values;
- credential rotation status: required/not required/completed.

## Acceptance Criteria

- [ ] Obsolete master-admin runtime variables are removed from active code/config/docs.
- [ ] Backend builds/starts without them.
- [ ] Normal seed runs without them and creates no admin.
- [ ] Normal mapped authentication works without them.
- [ ] First-admin provisioning is documented/executed separately.
- [ ] Live production variables are removed by authorized operator after safe rollout.
- [ ] No new permanent privileged fallback variables replace them.
- [ ] Old fallback credential exposure is handled separately from string removal.

## Definition of Done

- [ ] Repository cleanup complete.
- [ ] Search results reviewed/classified.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Backend tests/build pass.
- [ ] Local no-variable startup/seed/auth verification passes.
- [ ] Production config cleanup recorded or explicitly pending operator step in AUTH-018.
- [ ] Required PR evidence recorded.
- [ ] Reviewer approves docs/config consistency.

## Rollback

If live deployment fails because obsolete code still depends on these variables, roll back to the last known-good application deployment while preserving production data, identify the stale dependency, and fix it. Do not make privileged fallback the permanent solution.

## Forbidden Shortcuts

Do not:

- rename `MASTER_ADMIN_*` and keep the same mechanism;
- commit actual production values;
- store bootstrap credentials permanently for convenience;
- remove live config before verifying legitimate admin access;
- assume deleting a Git string rotates an exposed password;
- add hidden defaults when env vars are absent;
- delete historical audit/ticket context merely to force a zero-result text search.

## STOP - NEEDS ARCHITECT DECISION

Stop if another supported subsystem outside authentication/seed legitimately uses `MASTER_ADMIN_*`.

Also stop if the hosting platform requires a long-lived bootstrap/recovery mechanism. That must be designed explicitly rather than keeping obsolete master-admin values silently.

## Completion Record

**Implemented By:**  
**Live Config Cleaned By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Local No-Variable Verification:** Pass / Fail  
**Live Smoke Test:** Pass / Fail / Pending Operator  
**Credential Rotation Performed:** Yes / No / Not Required  
**Notes:**