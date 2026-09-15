# AUTH-013: Remove Master-Admin Runtime Configuration

**Status:** Pending  
**Priority:** P1  
**Area:** Configuration / Deployment / Security  
**Complexity:** Small-Medium  
**Depends On:** AUTH-001, AUTH-007, AUTH-008  
**Blocks:** AUTH-018  
**Operator Action Required:** Yes, for live hosting cleanup

## Objective

Remove the obsolete `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` mechanism from all active PropertyOS runtime configuration, deployment definitions, environment examples, seed/setup guidance, and operator documentation.

After this ticket:

- normal backend startup does not need master-admin values;
- normal seed does not need master-admin values;
- normal authentication does not need master-admin values;
- Render/deployment config does not persist master-admin values;
- first-admin creation is documented only through the explicit AUTH-008 bootstrap flow;
- existing production environments can safely remove the obsolete live variables after administrator access is verified.

---

## Junior Engineer Mental Model

Deleting an unsafe branch from TypeScript is only half the work.

If deployment files still contain:

```text
MASTER_ADMIN_EMAIL
MASTER_ADMIN_PASSWORD
```

then future engineers may assume the old privileged mechanism is intentional and reconnect it later.

This ticket is therefore both code/config cleanup and **architecture cleanup**.

The replacement model is:

```text
Normal application runtime
  -> no master-admin config

Normal database seed
  -> no admin creation

First administrator in a new environment
  -> explicit manual AUTH-008 bootstrap command
```

Do not replace the old permanent variables with differently named permanent privileged variables.

---

## Architecture Discussion and Decisions

### Decision 1: Master-admin values are obsolete runtime configuration

**Chosen:** Remove them from active application/deployment configuration.

**Rejected:** Keep them “just in case” even though no supported code uses them.

**Why:** Stale security configuration creates confusion, secret-management burden, and a path for accidental reintroduction.

### Decision 2: Bootstrap inputs are not permanent service configuration

AUTH-008 may require one-time values such as:

```text
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_CLERK_ID
```

Those belong to a manual operator invocation, not `render.yaml` as ordinary service env vars.

### Decision 3: Historical references may remain if clearly historical

Completed tickets/history can describe the old mechanism.

Do not rewrite history merely to make a global text search return zero.

Instead classify every remaining match as:

- active executable/config/docs: must be removed or updated;
- historical record: may remain;
- unrelated string: document if necessary.

### Decision 4: Removing a committed password string is not credential rotation

If any real account ever used the old fallback credential, treat it as potentially compromised/public and rotate it through the supported authentication provider flow.

Git cleanup does not invalidate a credential already used elsewhere.

---

## Facts, Assumptions, and Unknowns

### Facts / Expected Current State

Search previously identified master-admin references in:

- `.env.example`
- `Backend/.env.render.example`
- `render.yaml`
- `docs/FREE_TIER_DEPLOYMENT.md`
- historical seed/auth code

AUTH-001 removes runtime special-email auth behavior. AUTH-007 removes privileged seed behavior. AUTH-008 provides explicit bootstrap.

### Assumptions To Verify

- no active config validation schema still marks `MASTER_ADMIN_*` as required;
- no CI/deploy script exports them indirectly;
- no current deployment command invokes privileged seed/bootstrap automatically;
- at least one legitimate mapped active production ADMIN exists before live variable removal.

### Unknowns That Must Not Be Guessed

- whether the old fallback password was ever used by a real environment;
- whether another external operational script outside obvious repo paths still consumes the variables;
- whether the hosting platform requires restart/redeploy when variables are removed.

Record these as operational checks rather than assumptions.

---

## Scope

### Files To Inspect At Minimum

- `.env.example`
- `Backend/.env.render.example`
- `render.yaml`
- `docs/FREE_TIER_DEPLOYMENT.md`
- root README and backend README/setup docs
- `Backend/prisma/seed.ts`
- `Backend/src/shared/guards/jwt-auth.guard.ts`
- root/backend package scripts
- CI/deployment workflow files

Use repository-wide search. Do not trust this list to be exhaustive.

### Out Of Scope

Do not:

- delete unrelated secrets/config;
- redesign all environment management;
- add a secret manager migration;
- rewrite Git history;
- invent a new break-glass admin system;
- execute production cleanup without verified admin access and rollback plan.

---

## Required Reading

Before editing:

1. completed AUTH-001
2. completed AUTH-007
3. completed AUTH-008
4. `.env.example`
5. `Backend/.env.render.example`
6. `render.yaml`
7. `docs/FREE_TIER_DEPLOYMENT.md`
8. package scripts / deployment workflow
9. `docs/tickets/TICKET_DETAIL_STANDARD.md`

The intern must be able to answer:

- Why does normal runtime no longer need these values?
- How is the first admin created now?
- Why must live config removal happen after admin verification?
- Why does deleting a password from Git not rotate it?

---

## Pre-Flight Search Inventory

Before changing any file, search for:

```text
MASTER_ADMIN_EMAIL
MASTER_ADMIN_PASSWORD
MasterAdmin
Master Admin
```

Also search for the known former fallback credential strings if available to the authorized engineer.

Build a table in the PR description:

```text
path | match | category | action
```

Categories:

- runtime code
- seed/script
- env example
- deployment/hosting config
- active documentation
- historical documentation/ticket
- unrelated

Do not proceed until every active match has an owner/action.

---

## Step-by-Step Execution Plan for an Intern

### Phase 0 - Verify Dependencies

Inspect final `JwtAuthGuard` and normal seed.

Expected:

- auth does not read `MASTER_ADMIN_EMAIL`;
- auth does not read `MASTER_ADMIN_PASSWORD`;
- seed does not read either;
- seed does not create/reactivate/promote an admin.

If any are false, stop and finish AUTH-001/AUTH-007 first.

### Phase 1 - Establish Baseline

With variables currently unset locally if safe:

```bash
npm run typecheck:backend
npm run test:backend
```

Record pre-existing failures.

### Phase 2 - Clean Root `.env.example`

Remove obsolete keys and comments suggesting they are required.

Do not add real values or replacement permanent privileged config.

**Verify:** A new developer reading `.env.example` cannot conclude that routine startup/seed creates a master administrator.

### Phase 3 - Clean `Backend/.env.render.example`

Remove obsolete declarations/comments.

Review nearby comments for stale statements such as:

```text
set master admin before seed
seed creates administrator
```

Update them to the explicit bootstrap model.

### Phase 4 - Clean `render.yaml`

Remove `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` service environment declarations.

Inspect:

- build command;
- pre-deploy command;
- start command;
- migration command;
- any seed invocation.

Confirm none implicitly require old values.

Do **not** add permanent `BOOTSTRAP_ADMIN_*` values.

### Phase 5 - Update Deployment Documentation

Update `docs/FREE_TIER_DEPLOYMENT.md` and any active setup docs so they say:

- normal deploy/start does not create an administrator;
- normal seed is reference-data-only;
- new environment first admin uses explicit AUTH-008 bootstrap;
- restart/redeploy does not reactivate disabled users;
- existing production admins must be verified before obsolete config removal.

### Phase 6 - Review Package/CI/Deploy Scripts

Search shell/YAML/package commands for old variables.

If a script exports them only for old seed behavior, remove/update it.

If a currently supported subsystem still legitimately consumes them, stop for architecture review.

### Phase 7 - Validate With Variables Absent

Explicitly unset both variables.

Run:

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run build:backend
```

Use actual root/workspace command names if different.

Run normal seed against disposable DB.

Start backend with valid normal auth config.

### Phase 8 - Verify Authentication Behavior

With obsolete variables absent:

- mapped active ADMIN succeeds;
- mapped active WORKER succeeds;
- missing mapping is denied;
- inactive user is denied;
- suspended user is denied;
- no user/role/status is mutated by login.

### Phase 9 - Verify Bootstrap Separation

A normal start must not require `BOOTSTRAP_ADMIN_*`.

Only explicitly invoking AUTH-008 bootstrap should require its one-time inputs.

### Phase 10 - Final Repository Search

Repeat the pre-flight search.

Every remaining match must be classified as historical or unrelated.

No active runtime/config/current docs may retain the obsolete mechanism.

### Phase 11 - Live Hosting Cleanup

This is an authorized-operator step, not an intern improvisation step.

Before touching live config:

1. verify production deploy includes hardened auth;
2. verify Admin A maps correctly and can log in;
3. preferably verify Admin B;
4. confirm rollback anchor from AUTH-018;
5. remove obsolete variables;
6. save/redeploy/restart if required;
7. verify health;
8. re-test Admin A/B;
9. monitor auth error reasons.

If admin login fails, stop. Follow AUTH-018 rollback decision tree. Do not recreate the old fallback code.

### Phase 12 - Credential Rotation Decision

Determine whether a real account ever used the old committed fallback password.

Record one of:

```text
Not Required - verified never used
Completed - credential rotated and sessions handled
Pending/Unknown - unresolved security follow-up
```

Never record the credential itself.

---

## Detailed Test / Verification Specification

### TEST-AUTH013-01: Backend typecheck/build succeeds with obsolete vars unset

**Purpose:** Prove compile/build/config code no longer depends on them.

**Setup:** Explicitly unset both variables.

**Action:** Run typecheck/build.

**Expected Result:** Success.

**Required Assertions:** No config-validation error names either variable.

**If Fails:** Search config schema/helpers. Do not add variables back.

### TEST-AUTH013-02: Backend runtime starts without them

**Purpose:** Prove runtime config is clean.

**Setup:** Valid normal local/test env except obsolete vars absent.

**Action:** Start backend and hit health endpoint.

**Expected Result:** Healthy startup.

**Why:** Build success does not prove runtime validation.

### TEST-AUTH013-03: Reference seed works without them

**Purpose:** Protect AUTH-007 separation.

**Setup:** Disposable DB; vars absent.

**Action:** Run normal seed.

**Expected Result:** Reference data seeds; no admin is created/reactivated/promoted/reset.

### TEST-AUTH013-04: Active mapped Clerk user authenticates without them

**Purpose:** Prove ordinary authentication has no hidden dependency.

**Setup:** Active mapped test user.

**Action:** Protected request.

**Expected Result:** Success through strict Clerk-ID mapping.

**Required Assertions:** no master-admin config read/log.

### TEST-AUTH013-05: Missing identity receives no built-in fallback

**Purpose:** Ensure removing env values cannot reveal a hardcoded fallback.

**Setup:** Valid Clerk token, no local mapping.

**Action:** Authenticate.

**Expected Result:** Denied with zero user writes.

**If Fails:** Search for hardcoded privileged defaults.

### TEST-AUTH013-06: Inactive/suspended users remain denied

**Purpose:** Prove obsolete config removal does not alter lifecycle rules.

**Setup:** mapped inactive/suspended fixtures.

**Action:** Authenticate.

**Expected Result:** Denied; state unchanged.

### TEST-AUTH013-07: Normal runtime does not require bootstrap variables

**Purpose:** Prevent replacement of one permanent privileged config with another.

**Setup:** no bootstrap variables.

**Action:** Start normal app.

**Expected Result:** Healthy startup.

**Required Assertions:** only explicit bootstrap command validates bootstrap inputs.

### TEST-AUTH013-08: Repository active-config search is clean

**Purpose:** Catch stale operational references.

**Action:** Search old variable names and former fallback strings.

**Expected Result:** no active runtime/env/deploy/current-setup use remains.

**Required Assertions:** historical matches documented, not blindly deleted.

### TEST-AUTH013-09: Deployment YAML remains valid

**Purpose:** Ensure config cleanup did not break deployment.

**Action:** run available validation/build/deployment preview or careful syntax review.

**Expected Result:** Render config remains valid; no replacement privileged env added.

### TEST-AUTH013-10: Live smoke succeeds after operator removes obsolete variables

**Purpose:** Prove production is truly independent.

**Level:** Production operator verification.

**Precondition:** Admin A already verified before removal.

**Action:** remove variables, apply hosting change, verify health/admin route.

**Expected Result:** production remains healthy and Admin A/B still authenticate.

**If Fails:** stop cleanup and follow AUTH-018 rollback process.

### TEST-AUTH013-11: Normal redeploy/seed does not create or recover an admin

**Purpose:** Verify operational behavior matches new architecture.

**Setup:** disposable environment with zero users or disabled test user.

**Action:** run ordinary deploy/start/seed sequence.

**Expected Result:** no privileged user is created/reactivated automatically.

**Why:** This prevents operational scripts from preserving the old behavior after code cleanup.

---

## Manual Verification Checklist

Local/test:

- [ ] variables unset;
- [ ] typecheck/lint/tests/build pass;
- [ ] seed passes;
- [ ] backend starts;
- [ ] mapped active user authenticates;
- [ ] unmapped user denied;
- [ ] inactive/suspended denied;
- [ ] normal runtime does not request bootstrap vars;
- [ ] final search reviewed.

Production/operator:

- [ ] known active mapped admin verified before cleanup;
- [ ] rollback anchor known;
- [ ] obsolete hosting values removed;
- [ ] health passes;
- [ ] admin login passes afterward;
- [ ] credential-rotation decision recorded.

---

## Failure Diagnosis Guide

### Startup says a master-admin variable is required

There is still a config loader/schema dependency. Find and remove/update it. Do not restore the mechanism.

### Seed asks for a privileged password

AUTH-007 is incomplete or an obsolete seed path/script is still in use.

### Active admin cannot log in after variable removal

Check Clerk environment, `clerkUserId` mapping, deployed commit, and runtime config. The fix is not to reintroduce email/password fallback.

### Search still finds matches in completed tickets

That can be acceptable historical context. Confirm they are not active instructions.

### Render deploy fails because a command referenced old variables

Fix the stale command/script. Do not recreate unused secrets to satisfy it.

### Operator wants permanent bootstrap values in hosting config

Do not do this without architecture approval. Bootstrap is one-time/manual by design.

---

## Observability During Cleanup

Immediately after live config removal, monitor:

- startup/config errors;
- `AUTH_USER_NOT_PROVISIONED` rate;
- token verification/config failures;
- admin route authorization failures;
- health checks.

A sudden increase in mapped-user failures means stop and diagnose the deployed/configured auth path.

---

## Reviewer Walkthrough

Reviewer should verify:

1. all old-variable matches were inventoried/classified;
2. auth/seed dependency tickets truly removed code usage;
3. env examples no longer teach obsolete behavior;
4. `render.yaml` no longer persists old values;
5. bootstrap inputs were not made permanent replacements;
6. active deployment docs tell one consistent story;
7. local app/seed/auth work with values absent;
8. historical references are clearly historical;
9. production cleanup sequence verifies admin access first;
10. credential exposure is handled as rotation, not string deletion.

---

## PR Evidence Required

Include:

- before/after search inventory;
- files cleaned;
- intentionally retained historical references and reason;
- typecheck/lint/test/build results with vars unset;
- seed result;
- mapped/unmapped/non-active auth verification;
- bootstrap separation verification;
- live config cleanup status: `Pending Operator` / `Completed`;
- credential rotation status without secret values.

---

## Acceptance Criteria

- [ ] No active runtime code uses `MASTER_ADMIN_*`.
- [ ] No normal seed uses them.
- [ ] No active env example/deployment config requires them.
- [ ] Current deployment docs no longer teach the old flow.
- [ ] Backend builds/starts without them.
- [ ] Normal mapped auth works without them.
- [ ] Missing/non-active identities get no privileged fallback.
- [ ] Bootstrap remains explicit and separate.
- [ ] Live values are removed only after verified safe rollout.
- [ ] Exposed credential handling is tracked separately.

---

## Definition of Done

- [ ] Repository cleanup complete.
- [ ] Search inventory complete.
- [ ] Validation passes with variables absent.
- [ ] Documentation is consistent.
- [ ] Production operator step is completed or explicitly handed to AUTH-018.
- [ ] PR evidence complete.
- [ ] Reviewer approves config/ops story.

---

## Rollback

If live removal exposes an unexpected stale dependency:

1. stop additional auth changes;
2. use the known-good deployment/config rollback documented in AUTH-018;
3. restore service availability if required using the prior known-good configuration only as a temporary rollback state;
4. fix the stale dependency;
5. redeploy hardened architecture;
6. repeat cleanup.

Do not turn temporary rollback into permanent support for master-admin fallback.

---

## Forbidden Shortcuts

Do not:

- rename old variables and preserve behavior;
- add hidden defaults;
- keep obsolete secrets “for safety” without a supported consumer;
- put bootstrap inputs permanently in `render.yaml`;
- remove live config before verifying admin access;
- commit actual production values;
- claim credential rotation because a string was deleted;
- delete historical evidence simply to achieve zero search matches.

---

## STOP - NEEDS ARCHITECT DECISION

Stop if:

- another supported subsystem legitimately still consumes `MASTER_ADMIN_*`;
- hosting requires a long-lived privileged recovery mechanism;
- production has no verified mapped active administrator;
- AUTH-008 bootstrap cannot safely initialize a fresh environment;
- credential exposure cannot be assessed and requires a broader incident/security process.

---

## Handoff To AUTH-018

AUTH-018 may assume:

- active repository config no longer depends on old master-admin variables;
- live hosting cleanup has a documented operator sequence;
- bootstrap is separate/manual;
- local validation with vars absent succeeds;
- credential rotation status is known or explicitly unresolved.

---

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Local No-Variable Validation:** Pass / Fail  
**Live Config Cleanup:** Complete / Pending AUTH-018  
**Credential Rotation:** Completed / Not Required / Pending  
**Historical Matches Reviewed:** Yes / No  
**Notes:**