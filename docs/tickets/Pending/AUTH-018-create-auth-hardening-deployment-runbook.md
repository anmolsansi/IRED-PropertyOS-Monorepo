# AUTH-018: Create and Execute Authentication Hardening Deployment Runbook

**Status:** Pending  
**Priority:** P1  
**Area:** Deployment / Operations / Security  
**Complexity:** Medium  
**Depends On:** AUTH-005, AUTH-006, AUTH-007, AUTH-008, AUTH-009, AUTH-010, AUTH-011, AUTH-012, AUTH-013, AUTH-014, AUTH-015, AUTH-016, AUTH-017  
**Operator Action Required:** Yes  
**This Ticket Closes The Auth-Hardening Workstream:** Yes

## Objective

Create a production-ready operational runbook and use it to safely deploy the completed auth-hardening work without locking legitimate administrators out of PropertyOS.

This ticket is complete only when:

- the runbook exists in the repository;
- pre-deployment production identity checks are complete;
- the hardened backend is deployed;
- smoke tests pass;
- obsolete master-admin runtime configuration is removed;
- any credential exposed by the old fallback is rotated if applicable;
- rollback/recovery steps are documented and tested conceptually.

## Why This Exists

The code changes intentionally remove automatic privileged recovery behavior. That improves security, but it raises the importance of deployment sequencing.

A careless rollout could produce a secure application that nobody can administer because real production admins were never correctly mapped to Clerk.

The deployment must therefore be treated as a security migration, not an ordinary code deploy.

## Deliverables

Create or update:

- `docs/AUTH_HARDENING_RUNBOOK.md`
- `docs/FREE_TIER_DEPLOYMENT.md` as needed so it does not contradict the runbook
- optional link from `docs/INDEX.md`

The runbook must contain the exact production sequence below, adjusted only for the actual hosting/database tooling.

## Required Reading

Before writing or executing the runbook, read the completed tickets:

- AUTH-005 identity audit/backfill
- AUTH-006 strict Clerk ID mapping
- AUTH-007 seed cleanup
- AUTH-008 bootstrap
- AUTH-009 last-admin safety
- AUTH-010 lifecycle
- AUTH-011 session revocation
- AUTH-012 semantic audit
- AUTH-013 config cleanup
- AUTH-014 logging
- AUTH-015 through AUTH-017 tests

Also read:

- `render.yaml`
- `docs/FREE_TIER_DEPLOYMENT.md`
- root README deployment/setup instructions
- Prisma migration/deploy scripts
- current hosting/database backup documentation available to the operator

## Runbook Structure Required

The new `docs/AUTH_HARDENING_RUNBOOK.md` must contain these sections:

1. Purpose
2. Scope
3. Preconditions
4. Required Access
5. Pre-Deployment Backup
6. Production Identity Audit
7. Administrator Verification
8. Deployment Sequence
9. Database/Mapping Migration Sequence
10. Smoke Tests
11. Live Config Cleanup
12. Credential Rotation
13. Monitoring After Deployment
14. Rollback Procedure
15. Lockout Recovery Procedure
16. Evidence/Completion Checklist

## Architecture/Operational Invariants

The runbook must make these statements explicit:

- login never creates a PropertyOS user;
- login never reactivates a user;
- login never promotes a role;
- production Clerk identity maps by `clerkUserId`;
- local PropertyOS role/status remain authorization source of truth;
- inactive/suspended users fail closed;
- at least one active admin must remain;
- normal seed does not create admins;
- initial admin bootstrap is explicit and one-time;
- `MASTER_ADMIN_*` is obsolete.

## Step-by-Step Implementation: Write The Runbook

### Step 1 - Create the runbook file

Create:

`docs/AUTH_HARDENING_RUNBOOK.md`

State that the document applies to the migration away from privileged auth fallback and remains useful for future auth deployments.

### Step 2 - Document required operator access

List access categories without secrets:

- GitHub repository/deployment branch;
- Render backend service or current host;
- production database/Neon controls;
- Clerk production instance;
- application admin account;
- monitoring/log access.

Do not put passwords, tokens, database URLs, or secret values into the document.

### Step 3 - Document pre-deployment backup

Before any production mapping/backfill/deploy:

1. create/verify database restore point using provider-supported mechanism;
2. record timestamp/backup identifier in a private operational record;
3. verify operator knows how to restore or branch the database;
4. do not proceed if there is no practical recovery point for a destructive data mistake.

AUTH-005 mapping updates should be non-destructive, but backup is still required before production identity migration.

### Step 4 - Document production identity audit

Run AUTH-005 audit in read-only mode.

Record only safe counts in the deployment evidence:

- total users checked;
- valid mappings;
- safe missing mappings;
- ambiguous mappings;
- broken mappings.

Do not commit raw production identity/PII output.

### Step 5 - Require administrator redundancy

Before strict auth deployment, verify preferably at least two legitimate active ADMIN accounts exist and can be mapped to valid Clerk identities.

Minimum deploy gate:

- at least one verified active administrator is guaranteed to work after strict mapping.

Preferred deploy gate:

- two verified active administrators, tested independently.

If only one legitimate admin exists, record the risk and make sure AUTH-008/recovery procedure is available before deployment.

### Step 6 - Backfill approved mappings

Execute AUTH-005 apply mode for deterministic approved identities.

Rerun audit.

Deploy gate:

```text
ambiguous active users requiring access = 0
broken active-user mappings = 0
```

Do not deploy strict mapping if this gate fails.

### Step 7 - Run pre-deployment CI/validation

At minimum:

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run test:e2e -w ired-propertyos-backend
npm run build
```

If frontend tests are part of current root `npm test`, run them as appropriate.

Record failures. Do not wave through auth-related failures.

### Step 8 - Verify bootstrap command without using it unnecessarily

Confirm AUTH-008 command/script exists and documentation is accurate.

Do **not** run bootstrap in an already initialized production environment merely as a smoke test.

Use a disposable environment for bootstrap verification.

### Step 9 - Deploy hardened backend

Deploy the commit containing the completed auth-hardening work.

If migrations exist, use the repository's production migration command/process.

Do not run development `prisma migrate dev` against production.

### Step 10 - Immediately smoke-test known admin

Before cleaning old environment variables:

1. sign in as verified Admin A through production Clerk;
2. open a basic protected page/API;
3. open an ADMIN-only route/page;
4. confirm identity/role are correct;
5. confirm no unexpected user row/role/status mutation occurred.

If Admin A fails, stop rollout and use rollback section before making more changes.

### Step 11 - Smoke-test second admin if available

Repeat with Admin B.

This reduces single-account lockout risk.

### Step 12 - Test missing/unmapped access safely

Using a designated test identity only, verify an unmapped Clerk identity cannot enter PropertyOS and does not create a user.

Do not test with an unknown real person's account.

### Step 13 - Test inactive/suspended behavior

Use a disposable test user:

1. active user can access;
2. admin suspends user;
3. access fails;
4. refresh/re-login does not reactivate;
5. restart/redeploy if practical or rely on E2E restart regression;
6. explicit reactivation restores access only after admin action.

### Step 14 - Test last-admin safeguard

Do not endanger the real final admin.

Use test admins or ensure another active admin exists before testing.

Confirm backend rejects an operation that would remove the final active administrator.

### Step 15 - Verify semantic audit

Perform one safe test lifecycle action and confirm audit history records:

- actor;
- target;
- old/new state;
- event type;
- no secret values.

### Step 16 - Verify session revocation

With a disposable Clerk test user/session, suspend/deactivate and confirm provider sessions are revoked according to AUTH-011.

If provider cleanup fails but local access is denied, record cleanup issue separately; do not reactivate the user.

### Step 17 - Remove obsolete live environment variables

After the new auth path is proven:

- remove `MASTER_ADMIN_EMAIL` from live host config;
- remove `MASTER_ADMIN_PASSWORD` from live host config;
- redeploy/restart if required;
- verify backend starts;
- re-smoke-test admin access.

Never write the removed secret values into the runbook or PR.

### Step 18 - Credential rotation check

Because the old seed contained a default privileged password in repository history, determine whether any real account ever used it.

If yes:

- reset/rotate through supported auth provider flow;
- revoke sessions where appropriate;
- record only that rotation was completed, not the credential.

If no account ever used it, record `Not Required`.

### Step 19 - Monitor after deploy

For the initial monitoring period, watch for increases in reason codes such as:

- `AUTH_USER_NOT_PROVISIONED`;
- `AUTH_USER_INACTIVE`;
- `AUTH_USER_SUSPENDED`;
- token verification failures;
- session-revocation failures.

Do not treat every denial as an outage; distinguish expected unauthorized attempts from legitimate mapped-user failures.

### Step 20 - Update docs index

Link the runbook from `docs/INDEX.md` or the repository's documentation index if appropriate.

Ensure `FREE_TIER_DEPLOYMENT.md` no longer contradicts it.

## Rollback Procedure Required In Runbook

The runbook must define a rollback that restores the previous deploy artifact/code without reintroducing dangerous production data mutations.

Recommended logic:

```text
Legitimate mapped admins cannot access after deploy
  -> stop config cleanup
  -> inspect AUTH-005 mapping data
  -> if code regression: roll back application deployment
  -> if mapping data error: correct verified mapping or restore affected data
  -> retest admin access
```

Important:

- do not restore hardcoded fallback as the first recovery action;
- do not mass-reactivate users;
- do not mass-clear `clerkUserId` values;
- do not run bootstrap blindly on an initialized environment.

## Lockout Recovery Procedure Required

Document what an authorized operator does if zero administrators can access production.

The procedure should prioritize:

1. verify whether admins are active/mapped in DB;
2. verify Clerk identity IDs;
3. correct a proven mapping/data/config error through controlled operator access;
4. use approved bootstrap/recovery mechanism only when its preconditions truly apply;
5. preserve audit evidence of the recovery action.

If AUTH-008 bootstrap intentionally refuses after initial setup, do not tell operators to weaken it. A true break-glass procedure must be architect-approved.

## Evidence Checklist

The runbook/ticket completion record should capture safe evidence only:

- deployment commit SHA;
- deployment timestamp;
- identity audit counts;
- admin smoke test pass/fail;
- inactive/suspended test pass/fail;
- last-admin test pass/fail;
- semantic audit test pass/fail;
- live `MASTER_ADMIN_*` removal completed yes/no;
- credential rotation completed/not required;
- operator/reviewer names.

Do not attach raw tokens, secrets, or PII exports.

## Acceptance Criteria

- [ ] `docs/AUTH_HARDENING_RUNBOOK.md` exists.
- [ ] Runbook contains all required sections.
- [ ] Production identity audit/backfill is complete.
- [ ] Hardened code passes validation suite.
- [ ] At least one legitimate production admin is verified after deploy; two preferred.
- [ ] Unmapped user cannot auto-provision.
- [ ] Inactive/suspended user cannot auto-reactivate.
- [ ] Last-admin safety works.
- [ ] Semantic audit works.
- [ ] Obsolete live master-admin config is removed.
- [ ] Exposed fallback credential is rotated if it was ever used.
- [ ] Rollback and lockout recovery are documented.

## Definition of Done

- [ ] All dependency tickets are Completed or explicitly approved as not applicable.
- [ ] Runbook committed.
- [ ] Deployment executed.
- [ ] Smoke tests passed.
- [ ] Production config cleanup completed.
- [ ] Monitoring reviewed after deployment.
- [ ] Completion evidence recorded safely.
- [ ] Security/staff reviewer approves rollout.
- [ ] This ticket is moved to `Completed/` only after actual rollout, not merely after writing the runbook.

## Forbidden Shortcuts

Do not:

- deploy strict Clerk-ID mapping before mapping audit;
- delete live config before verifying legitimate admin access;
- run bootstrap casually in production;
- paste production secrets into Git/PR/ticket;
- test lockout by disabling the only real admin;
- restore hardcoded fallback as the standard rollback;
- claim deployment complete based only on CI tests.

## STOP - NEEDS ARCHITECT DECISION

Stop deployment if:

- there is no verified administrator mapping;
- identity audit contains unresolved ambiguous active users;
- database restore capability is unavailable for a risky data operation;
- strict auth behavior differs from the approved architecture;
- a break-glass recovery path is required but has not been approved.

## Completion Record

**Runbook Written By:**  
**Deployment Executed By:**  
**Reviewed By:**  
**PR:**  
**Production Commit:**  
**Deployment Date/Time:**  
**Identity Audit:** Pass / Fail  
**Admin A Smoke Test:** Pass / Fail  
**Admin B Smoke Test:** Pass / Fail / N/A  
**Inactive/Suspended Test:** Pass / Fail  
**Last-Admin Test:** Pass / Fail  
**Audit Event Test:** Pass / Fail  
**MASTER_ADMIN_* Removed:** Yes / No  
**Credential Rotation:** Completed / Not Required / Pending  
**Notes:**