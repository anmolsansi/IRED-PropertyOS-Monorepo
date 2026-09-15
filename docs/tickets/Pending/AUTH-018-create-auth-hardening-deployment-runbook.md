# AUTH-018: Create and Execute Authentication Hardening Deployment Runbook

**Status:** Pending  
**Priority:** P1  
**Area:** Deployment / Operations / Security  
**Complexity:** Medium  
**Depends On:** AUTH-005, AUTH-006, AUTH-007, AUTH-008, AUTH-009, AUTH-010, AUTH-011, AUTH-012, AUTH-013, AUTH-014, AUTH-015, AUTH-016, AUTH-017  
**Operator Action Required:** Yes  
**This Ticket Closes The Auth-Hardening Workstream:** Yes

## Objective

Create a production-ready operational runbook and use it to safely deploy the completed authentication-hardening work without locking legitimate administrators out of PropertyOS.

This ticket is complete only when the runbook exists **and the production rollout has actually been executed and verified**.

Writing the document alone does not complete this ticket.

## Junior Engineer Orientation

The code changes in this workstream intentionally remove automatic privilege recovery. That is correct security design, but it means deployment order matters more than before.

The dangerous rollout sequence would be:

```text
Deploy strict Clerk-ID auth
  -> discover production admins were never mapped
  -> nobody can administer PropertyOS
```

The safe sequence is:

```text
Audit real mappings first
  -> resolve ambiguity
  -> verify admin redundancy/recovery
  -> run all automated tests
  -> deploy hardened code
  -> immediately smoke-test real admin access
  -> only then remove obsolete live fallback configuration
```

This ticket is therefore a **security migration runbook**, not a normal "deploy and see" checklist.

## Why This Exists

A secure codebase can still be deployed unsafely.

This workstream changes:

- how Clerk identity maps to local users;
- how first admins are created;
- how inactive/suspended users behave;
- how final-admin removal is prevented;
- how provider sessions are revoked;
- how privilege changes are audited;
- which runtime secrets/config values are obsolete.

Production data/config must be compatible before strict behavior is turned on.

## Deliverables

Create or update:

- `docs/AUTH_HARDENING_RUNBOOK.md`
- `docs/FREE_TIER_DEPLOYMENT.md` so it does not contradict the runbook
- `docs/INDEX.md` link if appropriate
- any safe operator checklist/reference needed by the repository

Do not put real production secrets, raw identity exports, database URLs, tokens, or credentials in Git.

## Required Reading

Before writing or executing the runbook, read completed AUTH-005 through AUTH-017 plus:

- `render.yaml`
- `docs/FREE_TIER_DEPLOYMENT.md`
- root README setup/deployment instructions
- Prisma production migration scripts
- current hosting/database backup/restore documentation available to the operator
- current deployment workflow/CI status

Do not execute production steps from memory. Use the committed runbook.

## Required Runbook Sections

`docs/AUTH_HARDENING_RUNBOOK.md` must contain:

1. Purpose
2. Scope
3. Architecture Invariants
4. Preconditions / Go-No-Go Gates
5. Required Operator Access
6. Communication / Change Window
7. Pre-Deployment Database Recovery Point
8. Production Identity Audit
9. Administrator Verification
10. Approved Mapping Backfill
11. Automated Validation Gate
12. Bootstrap Verification
13. Deployment Sequence
14. Immediate Smoke Tests
15. User Lifecycle Smoke Tests
16. Session Revocation Verification
17. Semantic Audit Verification
18. Live Configuration Cleanup
19. Credential Rotation
20. Monitoring / Alert Review
21. Rollback Decision Tree
22. Lockout Recovery Procedure
23. Evidence / Completion Checklist
24. Post-Deployment Sign-Off

## Architecture / Operational Invariants

The runbook must state these explicitly:

- login never creates a PropertyOS user;
- login never reactivates a user;
- login never promotes a role;
- production Clerk identity maps by `clerkUserId`;
- email is not a request-time identity fallback;
- local PropertyOS role/status remain authorization source of truth;
- inactive/suspended users fail closed;
- at least one active admin must remain under normal app operations;
- normal seed does not create admins;
- initial admin bootstrap is explicit/manual;
- provider session cleanup failure does not restore local access;
- semantic security audits capture privilege/lifecycle changes;
- `MASTER_ADMIN_*` is obsolete after verified rollout.

## Production Change Ownership

The runbook must identify roles, not secrets:

- **Deployment operator:** deploys backend and hosting config.
- **Database operator:** can create/verify restore point and run AUTH-005 tooling.
- **Clerk operator:** can verify production identities/session behavior.
- **Application admin tester:** validates real admin access.
- **Reviewer/security/staff engineer:** confirms go/no-go gates and rollback decisions.

One person may hold multiple roles in a small team, but the responsibilities must still be explicit.

## Go / No-Go Gates

The runbook must use hard gates. If a required gate fails, stop rather than improvising.

### Gate A: Code readiness

- dependency tickets completed/approved;
- auth unit/service/E2E tests pass;
- typecheck/lint/build pass.

### Gate B: Identity readiness

- AUTH-005 production dry run complete;
- no unresolved ambiguous active users needing access;
- no broken active-user mappings;
- strict mapping behavior matches production Clerk instance.

### Gate C: Administrative access readiness

Minimum:

- at least one verified active production ADMIN with correct Clerk mapping.

Preferred:

- two independently verified active production ADMINs.

If only one admin exists, document elevated rollout risk and verify recovery plan before deploy.

### Gate D: Recovery readiness

- database restore point/branch/snapshot available for risky data operations;
- prior deployment artifact/commit known;
- operator knows how to roll app back;
- lockout recovery procedure reviewed.

### Gate E: Observability readiness

- logs/monitoring accessible;
- safe auth reason codes available after AUTH-014;
- operator knows what signals indicate mapping outage vs expected denial.

## Step-by-Step Implementation: Write The Runbook

### Step 1 - Create the runbook file

Create `docs/AUTH_HARDENING_RUNBOOK.md`.

State:

- which auth-hardening migration it covers;
- that it must not contain secrets;
- that production execution evidence is recorded separately/safely where necessary.

### Step 2 - Write explicit prerequisites

List exact tickets/features that must be complete before production execution.

Do not say vague things such as "make sure auth works."

Use concrete gates such as:

```text
AUTH-005 post-backfill audit: 0 unresolved active-user ambiguities
AUTH-017 E2E: pass
At least one production active admin mapping: manually verified
```

### Step 3 - Document required operator access

List categories:

- source/deployment;
- hosting;
- database;
- Clerk production instance;
- app admin access;
- logs/monitoring.

Never include credentials.

### Step 4 - Document change-window communication

Before rollout, note:

- who is executing;
- who can approve rollback;
- expected maintenance/user impact if any;
- where operational communication occurs.

Do not overbuild incident management. A simple named owner and rollback approver is sufficient.

### Step 5 - Document database recovery point

Before production mapping changes:

1. create/verify provider-supported restore point/branch/snapshot;
2. record timestamp/identifier in private operational evidence;
3. verify how restoration would be performed;
4. confirm no destructive migration is being run casually.

Do not proceed without practical recovery for data-migration mistakes.

### Step 6 - Run AUTH-005 production audit in dry-run mode

Record safe counts only:

- local users scanned;
- already mapped;
- safe backfills;
- no-match;
- ambiguous;
- broken existing mappings;
- provider-ID conflicts.

Do not commit raw PII output.

### Step 7 - Verify administrator mappings manually

For each planned production admin smoke-test account:

- local user exists;
- status = active;
- role = ADMIN;
- `clerkUserId` matches the intended production Clerk account;
- account can sign into Clerk before strict deploy if current system permits validation.

Prefer two admins.

### Step 8 - Apply only approved deterministic mapping backfills

Use AUTH-005 apply mode.

Then rerun dry-run audit.

Required deploy gate:

```text
ambiguous active users requiring access = 0
broken active-user mappings = 0
unsafe conflicts = 0
```

Do not force strict deploy through unresolved identity ambiguity.

### Step 9 - Run automated validation gate

At minimum:

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run test:e2e -w ired-propertyos-backend
npm run build
```

Also run frontend tests/build if root scripts/current CI require them.

Any auth-related test failure is a no-go.

### Step 10 - Verify bootstrap in disposable environment only

Confirm AUTH-008 script exists and its documentation works.

Test first-run/second-run behavior outside initialized production.

Do not run production bootstrap just to "make sure it works."

### Step 11 - Record rollback anchor

Before deployment record:

- currently deployed known-good commit/release;
- target commit;
- DB recovery point identifier location;
- operator who can execute rollback.

Do not put secrets in this record.

### Step 12 - Deploy hardened backend

Use normal approved production deployment process.

If Prisma migrations exist, use production migration command/process, never `prisma migrate dev` against production.

Do not remove `MASTER_ADMIN_*` live values yet. First prove the new auth path works.

### Step 13 - Immediate health/startup check

Before login smoke tests verify:

- deployment completed;
- health endpoint/application startup is healthy;
- no migration/startup crash;
- logs do not show widespread auth/config initialization errors.

If backend is unhealthy, rollback code/deploy before experimenting with user data.

### Step 14 - Smoke-test Admin A immediately

Using verified production Admin A:

1. authenticate through production Clerk;
2. open basic protected route/page;
3. open ADMIN-only route/page;
4. verify correct local user/role/status;
5. confirm no unexpected role/status/mapping mutation occurred.

If this fails, **stop**. Do not remove old live config or make unrelated changes.

### Step 15 - Smoke-test Admin B if available

Repeat independently.

If Admin A works but Admin B fails, investigate B's mapping/data. Do not declare migration fully successful for all admins until understood.

### Step 16 - Verify unmapped identity fails closed

Using a designated test identity:

- valid Clerk identity;
- no local mapping.

Expected:

- access denied;
- no local user created;
- user/admin count unchanged.

Never use an unknown real employee as an experiment.

### Step 17 - Verify inactive/suspended persistence

Using disposable test user:

1. confirm active access;
2. suspend through admin UI/API;
3. verify immediate denial;
4. refresh/re-login and confirm no reactivation;
5. verify DB state;
6. explicitly reactivate;
7. verify access returns only afterward.

If redeploy/restart is practical/safe, perform it; otherwise rely on AUTH-017 restart test and monitor after actual deploy restart.

### Step 18 - Verify last-admin protection safely

Do not test by disabling the only real production admin.

Use a designated test/admin setup with another active admin guaranteed.

Confirm backend rejects the final-admin boundary according to approved test method.

### Step 19 - Verify semantic audit

Perform one safe test lifecycle/role action.

Confirm audit record contains:

- authenticated actor;
- target user;
- previous/new value;
- reason if required;
- no token/secret/raw request body.

### Step 20 - Verify Clerk session revocation

With disposable production/test user and multiple sessions if practical:

- suspend/deactivate;
- confirm PropertyOS denies immediately;
- confirm provider sessions end according to AUTH-011.

If provider cleanup fails while local access is denied, record/provider-remediate separately. Do not reactivate the user to make session cleanup look green.

### Step 21 - Remove obsolete live `MASTER_ADMIN_*` values

Only after real admin access is proven:

1. remove `MASTER_ADMIN_EMAIL`;
2. remove `MASTER_ADMIN_PASSWORD`;
3. save/redeploy/restart if platform requires;
4. verify health;
5. re-smoke-test Admin A and preferably Admin B.

Do not write removed values into runbook/PR.

### Step 22 - Perform credential rotation decision

Determine whether any real account ever used the old committed fallback password.

If yes:

- rotate/reset through supported identity-provider flow;
- revoke applicable sessions;
- record `Completed` without recording credential.

If definitively never used, record `Not Required`.

If unknown, record `Pending` and treat as unresolved security follow-up rather than claiming done.

### Step 23 - Monitor post-deploy auth signals

Watch safe reason codes/error rates such as:

- `AUTH_USER_NOT_PROVISIONED`;
- token invalid/config errors;
- inactive/suspended denials;
- role denials;
- session cleanup failures.

Distinguish expected denials from a sudden spike affecting legitimate mapped users.

### Step 24 - Update documentation/index

Ensure `FREE_TIER_DEPLOYMENT.md`, `docs/INDEX.md`, bootstrap docs, and runbook tell one consistent story.

### Step 25 - Complete sign-off evidence

Record safe evidence/check results and move AUTH-018 to Completed only after real rollout/sign-off.

## Detailed Production Validation Cases

These are operational tests, not unit tests. Execute only with safe designated accounts/data.

### PROD-AUTH018-01: Verified Admin A can authenticate after hardened deploy

**Purpose:** Prevent production administrative lockout.

**Setup:** Admin A mapping verified before deployment.

**Action:** Sign in and access protected + ADMIN-only function.

**Expected Result:** Success with correct stored role/status.

**Evidence:** Pass/fail, timestamp, operator; no token/email secret dump.

**Why It Exists:** This is the first production go/no-go check after deploy.

**If It Fails:** Stop rollout. Do not clean config. Follow rollback decision tree and inspect mapping/config/code.

### PROD-AUTH018-02: Verified Admin B independently succeeds

**Purpose:** Reduce single-account recovery risk.

**Setup:** Second verified active admin available.

**Action:** Independent login/access test.

**Expected Result:** Success.

**Evidence:** Pass/fail or N/A with documented reason.

**If It Fails:** Investigate B mapping before calling administrator redundancy healthy.

### PROD-AUTH018-03: Unmapped designated identity is denied without auto-provisioning

**Purpose:** Confirm old fallback/provisioning behavior is absent in production.

**Setup:** Safe test Clerk identity with no local user.

**Action:** Attempt PropertyOS access.

**Expected Result:** Denied.

**Evidence/Assertions:** User count/mapping check confirms no new local user; no ADMIN created.

**If It Fails:** Stop rollout and rollback/hotfix auth before further cleanup.

### PROD-AUTH018-04: Suspended user remains denied across refresh/re-login

**Purpose:** Verify local lifecycle authority in production.

**Setup:** Disposable test user active/mapped.

**Action:** Suspend, attempt access/re-login.

**Expected Result:** Denied and stays suspended.

**Evidence:** Status/timestamp check and pass/fail.

**If It Fails:** Stop. Auto-reactivation/security regression exists.

### PROD-AUTH018-05: Explicit reactivation restores access

**Purpose:** Confirm approved lifecycle recovery works.

**Setup:** Same suspended test user.

**Action:** Reactivate explicitly then sign in/access.

**Expected Result:** Access returns only after successful admin action.

**Evidence:** Pass/fail + audit event verification.

**If It Fails:** Fix lifecycle path; do not restore login-time repair.

### PROD-AUTH018-06: Last-admin safeguard is demonstrated safely

**Purpose:** Verify lockout prevention under real deployment.

**Setup:** Safe scenario where another active admin/test admin ensures no actual lockout risk.

**Action:** Exercise documented last-admin boundary test.

**Expected Result:** Dangerous operation rejected.

**Evidence:** Pass/fail; target state unchanged.

**If It Fails:** Treat as P0 rollout blocker.

### PROD-AUTH018-07: Semantic audit contains correct actor/target/before/after

**Purpose:** Verify security audit integration in production.

**Setup:** Safe test lifecycle/role change.

**Action:** Execute action and inspect audit.

**Expected Result:** Correct semantic event; no secrets.

**Evidence:** Sanitized description only, no raw PII export.

**If It Fails:** If audit is mandatory, treat as rollout blocker; otherwise follow explicitly approved audit reliability policy.

### PROD-AUTH018-08: Session revocation removes external sessions without affecting local fail-closed state

**Purpose:** Verify provider cleanup integration.

**Setup:** Test user signed into two sessions if practical.

**Action:** Suspend/deactivate.

**Expected Result:** PropertyOS denies immediately; Clerk sessions revoked.

**Evidence:** Pass/partial/fail counts or manual result, no tokens.

**If It Fails:** If local denial still works, record provider cleanup incident and remediate. Do not reactivate user.

### PROD-AUTH018-09: Service remains healthy after live config removal

**Purpose:** Prove obsolete `MASTER_ADMIN_*` config is truly unnecessary.

**Setup:** New auth path already verified; rollback anchor known.

**Action:** Remove obsolete live values and restart/redeploy if required.

**Expected Result:** Service healthy; Admin A/B still work.

**Evidence:** health + admin smoke pass.

**If It Fails:** Roll back deploy/config per runbook and find stale dependency. Do not permanently restore privileged behavior.

### PROD-AUTH018-10: Monitoring shows no unexpected mapped-user failure spike

**Purpose:** Catch issues not covered by selected smoke accounts.

**Setup:** Access to logs/monitoring with safe reason codes.

**Action:** Observe agreed initial post-deploy window.

**Expected Result:** No unexplained spike in `AUTH_USER_NOT_PROVISIONED`/token failures for legitimate users.

**Evidence:** High-level pass/incident reference, no PII dump.

**If It Fails:** Pause further cleanup/change, investigate affected mapping/config cohort and decide rollback vs targeted correction.

## Rollback Decision Tree

The runbook must contain a concrete decision tree similar to:

```text
Backend unhealthy immediately after deploy?
  YES -> roll back application deployment to known-good commit.

Backend healthy but verified mapped admins all fail?
  -> STOP config cleanup
  -> inspect token verification config + Clerk environment + mapping audit
  -> if code regression confirmed -> roll back application
  -> if mapping error confirmed -> correct only verified affected mapping / restore data as approved

Admin A works, specific users fail as not provisioned?
  -> do not restore global fallback
  -> run targeted AUTH-005 audit for affected users
  -> correct deterministic mappings

Provider session revocation fails but local non-active denial works?
  -> keep secure local state
  -> remediate provider cleanup separately
  -> do not reactivate

Audit mandatory write fails and blocks lifecycle operations?
  -> follow approved audit rollback/incident plan
  -> do not silently disable mandatory audit
```

## Lockout Recovery Procedure

If zero administrators can access production:

1. stop further config/deploy changes;
2. verify application health independently of login;
3. inspect production DB via authorized operator access for admin rows/status/mappings;
4. verify corresponding Clerk production IDs;
5. determine whether problem is mapping, status, provider configuration, or code;
6. correct only proven data/config error through controlled operator procedure;
7. roll back application if code regression is the cause;
8. use bootstrap only if its documented preconditions actually apply;
9. do not weaken AUTH-008 or create a hidden email fallback as emergency normal behavior;
10. create/retain audit evidence of recovery action.

A permanent break-glass system is outside this ticket unless architect-approved.

## Runbook Self-Test / Review Cases

Before production execution, another engineer/reviewer must read the runbook and be able to answer:

- What exactly blocks deployment if mapping audit has ambiguity?
- Which admin account is tested first?
- At what point are `MASTER_ADMIN_*` values removed?
- What do we do if Clerk session revocation fails?
- What do we do if local admin login fails immediately after deploy?
- What data can be safely recorded in Git and what must remain private?
- How do we recover without restoring the old privileged fallback?

If the runbook cannot answer those questions unambiguously, it is not ready.

## PR / Deployment Evidence Required

Record safely:

- runbook file/commit;
- target production commit SHA;
- previous known-good commit/release;
- AUTH-005 safe audit counts;
- automated validation results;
- Admin A/B smoke-test results;
- unmapped-user test result;
- lifecycle/restart/reactivation result;
- last-admin safeguard result;
- semantic audit result;
- session cleanup result;
- live obsolete-config removal result;
- credential rotation status;
- monitoring review result;
- deployment operator + reviewer names.

Do not include raw tokens, secrets, DB URLs, full production identity lists, or credential values.

## Acceptance Criteria

- [ ] `docs/AUTH_HARDENING_RUNBOOK.md` exists and answers the required recovery/go-no-go questions.
- [ ] Production identity audit/backfill is complete.
- [ ] Hardened code passes unit/service/E2E/build validation.
- [ ] At least one legitimate production admin is verified after deploy; two preferred.
- [ ] Unmapped user cannot auto-provision.
- [ ] Inactive/suspended user cannot auto-reactivate.
- [ ] Explicit reactivation works.
- [ ] Last-admin safety works.
- [ ] Semantic audit works according to approved reliability contract.
- [ ] Provider session cleanup is verified or safely recorded as a separate partial issue while local denial remains secure.
- [ ] Obsolete live master-admin config is removed.
- [ ] Exposed fallback credential is rotated if ever used.
- [ ] Monitoring review shows no unresolved widespread auth regression.
- [ ] Rollback and lockout recovery are documented and understood.

## Definition of Done

- [ ] All dependency tickets are Completed or explicitly approved as not applicable.
- [ ] Runbook committed and reviewed.
- [ ] Production change window/owners identified.
- [ ] Recovery point verified.
- [ ] Identity audit/backfill gate passed.
- [ ] Automated validation gate passed.
- [ ] Deployment executed.
- [ ] Production smoke/validation cases passed or explicitly handled under approved partial-failure rules.
- [ ] Production config cleanup completed.
- [ ] Credential rotation completed/not required with evidence status.
- [ ] Monitoring reviewed after deployment.
- [ ] Completion evidence recorded safely.
- [ ] Security/staff reviewer signs off.
- [ ] Ticket moves to `Completed/` only after actual rollout, never just after writing docs.

## Forbidden Shortcuts

Do not:

- deploy strict Clerk-ID mapping before mapping audit;
- delete live config before verifying real admin access;
- run bootstrap casually in initialized production;
- paste production secrets/PII exports into Git/PR/ticket;
- test lockout by disabling the only real admin;
- restore hardcoded fallback as standard rollback;
- mass-reactivate users to recover access;
- mass-clear `clerkUserId` values without verified plan;
- claim deployment complete based only on CI;
- continue rollout after a failed hard go/no-go gate without explicit escalation.

## STOP - NEEDS ARCHITECT DECISION

Stop deployment if:

- there is no verified administrator mapping;
- identity audit contains unresolved ambiguous active users;
- database recovery capability is unavailable for planned risky data changes;
- strict auth behavior differs from approved architecture;
- a break-glass recovery path is required but not approved;
- audit reliability contract remains unresolved;
- production uses another identity/session provider in a way not covered by this runbook.

## Completion Record

**Runbook Written By:**  
**Deployment Executed By:**  
**Reviewed By:**  
**PR:**  
**Production Commit:**  
**Previous Known-Good Commit:**  
**Deployment Date/Time:**  
**Recovery Point Verified:** Yes / No  
**Identity Audit:** Pass / Fail  
**Automated Validation Gate:** Pass / Fail  
**Admin A Smoke Test:** Pass / Fail  
**Admin B Smoke Test:** Pass / Fail / N/A  
**Unmapped User Test:** Pass / Fail  
**Inactive/Suspended Test:** Pass / Fail  
**Explicit Reactivation Test:** Pass / Fail  
**Last-Admin Test:** Pass / Fail  
**Audit Event Test:** Pass / Fail  
**Session Revocation Test:** Pass / Partial / Fail  
**MASTER_ADMIN_* Removed:** Yes / No  
**Credential Rotation:** Completed / Not Required / Pending  
**Monitoring Review:** Pass / Incident Opened  
**Notes:**