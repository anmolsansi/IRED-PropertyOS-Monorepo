# AUTH-013: Remove Master-Admin Runtime Configuration

**Status:** Pending  
**Priority:** P1  
**Area:** Configuration / Deployment / Security  
**Complexity:** Small  
**Depends On:** AUTH-001, AUTH-007, AUTH-008  
**Blocks:** AUTH-018  
**Operator Action Required:** Yes, for live environment cleanup

## Objective

Remove `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` from PropertyOS runtime/deployment configuration and documentation after request-time privileged fallback and seed-time privileged bootstrap have been removed.

The running PropertyOS application must not require master-admin credentials to start or authenticate users.

## Why This Exists

The repository currently references master-admin environment variables in multiple places, including root/backend environment examples, Render configuration, and deployment documentation.

Leaving obsolete privileged settings behind causes three problems:

1. future engineers may assume the old privileged fallback is still supported;
2. operators may continue storing unnecessary privileged values in production configuration;
3. a future refactor could accidentally reconnect these values to authentication.

## Preconditions

Before deleting these settings:

- AUTH-001 completed: auth guard no longer reads `MASTER_ADMIN_EMAIL`;
- AUTH-007 completed: normal seed no longer reads master-admin credentials;
- AUTH-008 completed: first-admin bootstrap has a separate explicit procedure.

Do not remove the settings first and leave production without a documented bootstrap path.

## Expected Files To Inspect/Modify

At the current repository state, inspect at least:

- `.env.example`
- `Backend/.env.render.example`
- `render.yaml`
- `docs/FREE_TIER_DEPLOYMENT.md`
- `Backend/prisma/seed.ts`
- `Backend/src/shared/guards/jwt-auth.guard.ts`
- any README/setup docs returned by repository search

Use repository-wide search; this list may not be exhaustive after other changes.

## Target State

Repository-wide production/runtime code and config should contain zero active references to:

- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- the former hardcoded privileged email
- the former hardcoded privileged password

Historical completed tickets may describe that these values used to exist; do not rewrite history merely to remove words from documentation. The rule applies to executable/configuration instructions that could re-enable the behavior.

## Replacement Configuration

If AUTH-008 uses one-time bootstrap variables such as:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_CLERK_ID`

those belong in the bootstrap runbook/command documentation, not as mandatory long-lived production runtime settings.

Do not add `BOOTSTRAP_ADMIN_PASSWORD` unless an architect has explicitly approved a password-based bootstrap design.

## Step-by-Step Implementation

### Step 1 - Repository-wide search

From repository root, search for:

```text
MASTER_ADMIN_EMAIL
MASTER_ADMIN_PASSWORD
MasterAdmin
Master Admin
```

Also search for the exact previous fallback email/password values if known from Git history/current code.

Create a checklist of every current active reference.

### Step 2 - Classify each match

For each result mark it as one of:

- runtime code;
- environment example;
- deployment config;
- setup/runbook documentation;
- historical ticket/documentation;
- unrelated text.

Only remove/change references that are part of the obsolete privileged mechanism.

### Step 3 - Clean `.env.example`

Remove master-admin runtime values and any comments that instruct developers to set them for normal startup/seed.

Do not replace real values with another example privileged credential.

If bootstrap variables are documented here, clearly label them `one-time bootstrap only` and optional; preferred location is the bootstrap runbook rather than ordinary runtime env.

### Step 4 - Clean `Backend/.env.render.example`

Remove the master-admin email/password entries and comments implying they are needed for normal deployment or seeding.

### Step 5 - Clean `render.yaml`

Remove environment entries for:

- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`

Do not add one-time bootstrap variables as persistent Render service env entries unless the architecture/runbook explicitly requires them.

### Step 6 - Update deployment documentation

In `docs/FREE_TIER_DEPLOYMENT.md` and related docs:

- remove instructions telling operators to configure master-admin email/password;
- remove seed commands that imply seed creates the admin;
- replace first-admin setup with a reference to AUTH-008's explicit bootstrap command;
- state that routine deploy/redeploy must not create or reactivate administrators.

### Step 7 - Confirm application no longer reads the settings

Search TypeScript and Prisma scripts for both variable names.

Expected active-code result: zero.

If code still reads either value, stop and complete the appropriate dependency ticket rather than deleting config prematurely.

### Step 8 - Clean live environment variables

This step requires an authorized operator with Render/hosting access.

After the new code is deployed and bootstrap/recovery access is verified:

1. open backend service environment settings;
2. remove `MASTER_ADMIN_EMAIL`;
3. remove `MASTER_ADMIN_PASSWORD`;
4. save/redeploy if hosting platform requires it;
5. confirm application starts successfully;
6. confirm existing mapped admin can authenticate.

Never paste the old values into the ticket/PR.

### Step 9 - Credential exposure follow-up

If any real user account ever used the old fallback password, rotate that credential through the supported auth provider flow and revoke applicable sessions.

Do not consider repository string removal equivalent to credential rotation.

### Step 10 - Run validation

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run build:backend
```

Then run repository search again.

## Checkpoint

- [ ] No active runtime code reads `MASTER_ADMIN_*`.
- [ ] Environment examples no longer request them.
- [ ] `render.yaml` no longer requests them.
- [ ] deployment docs use explicit bootstrap instead.
- [ ] live hosting variables are scheduled/removed by authorized operator.

## Tests / Verification Required

This is mainly configuration/documentation work, but verify:

1. backend starts without either variable;
2. normal database seed runs without either variable;
3. normal Clerk authentication works without either variable;
4. bootstrap is a separate explicit action;
5. build/typecheck/tests pass.

## Manual Verification

Start backend locally with both `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` completely unset.

Expected:

- startup succeeds;
- active mapped user can authenticate;
- missing/inactive user receives no special behavior;
- `db:seed` does not request those values.

## Acceptance Criteria

- [ ] Obsolete master-admin runtime variables are removed from active code/config/docs.
- [ ] Backend works without them.
- [ ] First-admin provisioning is documented separately.
- [ ] Live production variables are removed by an authorized operator after safe rollout.
- [ ] No new privileged fallback variables replace them.

## Definition of Done

- [ ] Repository cleanup complete.
- [ ] Search results reviewed.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Backend tests/build pass.
- [ ] Local no-variable startup passes.
- [ ] Production config cleanup recorded without exposing values.
- [ ] Reviewer approves docs/config consistency.

## Rollback

If deployment fails because obsolete code still depends on these variables, roll back the code deployment or complete the missing dependency. Do not restore privileged behavior as the permanent fix.

## Forbidden Shortcuts

Do not:

- rename `MASTER_ADMIN_*` and keep the same mechanism;
- commit actual production values;
- store bootstrap credentials permanently for convenience;
- remove config before ensuring a legitimate admin can access production;
- assume deleting a Git string rotates an exposed password.

## STOP - NEEDS ARCHITECT DECISION

Stop if another supported subsystem outside authentication/seed legitimately uses `MASTER_ADMIN_*`. Identify it and obtain an ownership decision before deleting its configuration.

## Completion Record

**Implemented By:**  
**Live Config Cleaned By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Credential Rotation Performed:** Yes / No / Not Required  
**Notes:**