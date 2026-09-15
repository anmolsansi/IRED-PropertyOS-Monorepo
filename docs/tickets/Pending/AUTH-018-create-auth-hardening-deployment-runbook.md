# AUTH-018: Create and Execute Authentication Hardening Deployment Runbook

**Status:** Pending  
**Priority:** P1  
**Area:** Deployment / Operations / Security / Recovery  
**Complexity:** High Operational Risk  
**Depends On:** AUTH-005, AUTH-006, AUTH-007, AUTH-008, AUTH-009, AUTH-010, AUTH-011, AUTH-012, AUTH-013, AUTH-014, AUTH-015, AUTH-016, AUTH-017  
**Operator Action Required:** Yes  
**Closes Auth-Hardening Workstream:** Yes

## Objective

Create a production-ready authentication-hardening runbook and use it to safely roll the completed workstream into production without locking legitimate administrators out, misbinding identities, restoring disabled access, or losing recovery capability.

This ticket is not complete when the Markdown runbook is merely written.

It is complete only when:

1. the runbook exists and is reviewed;
2. every required go/no-go gate is satisfied;
3. the production rollout is executed using that runbook;
4. smoke tests pass;
5. obsolete live master-admin configuration is removed at the correct stage;
6. required credential rotation is resolved;
7. post-deployment monitoring shows no unexplained auth regression;
8. safe completion evidence is recorded.

---

## Junior Engineer Mental Model

This workstream removes automatic privilege recovery on purpose.

That means deployment sequencing matters.

Unsafe sequence:

```text
Deploy strict clerkUserId auth
-> discover production admins are unmapped
-> admins cannot log in
-> team panics and reintroduces insecure fallback
```

Safe sequence:

```text
prove production identity data first
-> prove admin redundancy/recovery
-> prove code/tests
-> record rollback anchor
-> deploy hardened code
-> smoke-test real admin access immediately
-> validate lifecycle/audit/session behavior
-> only then remove obsolete live fallback configuration
-> monitor
```

The runbook exists so an operator does not need to design the migration while production is changing.

---

## Architecture Discussion and Decisions

### Decision 1: Data readiness precedes strict-auth deployment

AUTH-005 production mapping audit/backfill must happen before AUTH-006 strict mapping is enabled in production.

Do not use an email fallback as a “temporary migration bridge.” That hides unresolved identity data and defeats the hardened design.

### Decision 2: Real admin access is verified before old live config is removed

Even when code no longer uses `MASTER_ADMIN_*`, leave the live values untouched until the hardened deployment is healthy and at least one legitimate mapped production admin has successfully authenticated.

Then remove obsolete config and smoke-test again.

### Decision 3: Prefer two verified active admins before rollout

Minimum acceptable gate:

```text
>= 1 verified mapped active ADMIN
```

Preferred gate:

```text
>= 2 independently verified mapped active ADMINs
```

One admin is a higher-risk rollout. If only one exists, recovery must be explicitly reviewed before proceeding.

### Decision 4: Bootstrap is not a casual production recovery command

AUTH-008 is for initial environment initialization. Do not run it in an already initialized production environment simply because an admin login failed.

If zero-admin recovery requires bootstrap/break-glass reuse, that must be an approved recovery design, not operator improvisation.

### Decision 5: Application rollback and data recovery are different

Possible failure classes:

```text
bad code/config deployment
-> application rollback may be enough

wrong identity backfill/data mutation
-> database correction/recovery may be required
```

The runbook must identify both recovery anchors before rollout.

### Decision 6: Local authorization remains authoritative during provider cleanup failure

If Clerk session cleanup fails after a user is suspended/deactivated:

- local access stays denied;
- do not reactivate to make provider cleanup green;
- remediate provider cleanup separately.

### Decision 7: Production validation uses designated safe accounts/data

Do not test hardening by disabling the only real production admin or experimenting with unknown employees.

Use designated admin/test accounts and reversible lifecycle actions.

---

## Required Deliverables

Create/update:

- `docs/AUTH_HARDENING_RUNBOOK.md`
- `docs/FREE_TIER_DEPLOYMENT.md` so it agrees with hardened architecture
- `docs/INDEX.md` or relevant docs index if one exists
- bootstrap operator instructions from AUTH-008
- safe completion checklist/evidence section

Do not store in Git:

- passwords;
- tokens;
- Clerk secrets;
- database URLs;
- raw production identity exports;
- unredacted production user lists;
- restore credentials.

---

## Required Runbook Sections

`docs/AUTH_HARDENING_RUNBOOK.md` must contain at least:

1. Purpose
2. Scope
3. Architecture invariants
4. Change summary
5. Operator roles/responsibilities
6. Required access
7. Communication/change window
8. Pre-deployment go/no-go gates
9. Database recovery point
10. Application rollback anchor
11. Production Clerk identity audit
12. Mapping backfill procedure
13. Admin redundancy verification
14. Automated test/build gate
15. Bootstrap verification in disposable environment
16. Deployment sequence
17. Immediate health checks
18. Admin A smoke test
19. Admin B smoke test
20. Unmapped-identity validation
21. Non-active lifecycle validation
22. Explicit reactivation validation
23. Last-admin safety validation
24. Clerk session revocation validation
25. Semantic audit validation
26. Auth-log/privacy validation
27. Obsolete live config cleanup
28. Credential rotation decision
29. Monitoring window/signals
30. Rollback decision tree
31. Lockout recovery procedure
32. Data-correction procedure
33. Evidence checklist
34. Post-deployment sign-off
35. Follow-up/unresolved risks

---

## Architecture Invariants The Runbook Must State Explicitly

After hardened rollout:

- login never creates a PropertyOS user;
- login never fills a missing identity mapping;
- login never reactivates a user;
- login never promotes a role;
- Clerk `sub` maps to local `User.clerkUserId`;
- email is not a request-time identity fallback;
- PropertyOS DB role/status/org/geography remain authorization truth;
- only `active` users authenticate;
- inactive/suspended state survives request/restart;
- ordinary user management cannot remove the final active admin;
- normal seed does not create/recover admins;
- first-admin bootstrap is explicit/manual;
- suspension/deactivation deny locally before provider session cleanup;
- provider cleanup failure cannot restore local access;
- semantic security audits describe successful role/lifecycle changes;
- auth logs use safe reason codes without routine credentials/PII;
- `MASTER_ADMIN_*` is obsolete after verified rollout.

---

## Production Roles and Responsibilities

The runbook names responsibilities, not secrets.

### Deployment Operator

- deploys target commit;
- can roll back application deployment;
- can change hosting environment variables.

### Database Operator

- creates/verifies recovery point;
- runs AUTH-005 audit/backfill;
- can safely query verification counts.

### Clerk Operator

- verifies correct production Clerk instance;
- validates intended identities;
- can inspect/revoke sessions if required.

### Application Admin Tester

- validates actual admin login and ADMIN-only access.

### Reviewer / Security / Staff Engineer

- approves go/no-go gates;
- approves rollback when signals are ambiguous;
- verifies evidence.

One person may hold multiple roles in a small team. The responsibilities must still be explicit.

---

## Facts, Assumptions, and Unknowns

### Facts / Expected State Before Execution

- AUTH-005 through AUTH-017 are completed and reviewed;
- AUTH-017 is the final automated assembled-app gate;
- production uses Clerk mode according to current deployment config;
- Render/hosting and DB recovery mechanisms exist.

### Assumptions To Verify

- operator can obtain a real DB restore point/branch/snapshot;
- prior known-good deployed commit/release is identifiable;
- production Clerk instance is distinguishable from test/dev;
- operator can safely verify at least one ADMIN mapping;
- monitoring/logs are accessible after deploy.

### Unknowns That Block Rollout Until Resolved

- ambiguous active-user identity mappings;
- broken/duplicate provider mappings;
- no known mapped active admin;
- failing P0 auth test;
- unproven last-admin concurrency safety if production claims it;
- no application rollback anchor;
- no data recovery path for the backfill operation.

---

## Hard Go / No-Go Gates

The runbook must use explicit gates. A failed gate means **STOP**.

### Gate A - Code Readiness

Required:

- AUTH dependencies completed/reviewed;
- AUTH-015 passes;
- AUTH-016 passes;
- AUTH-017 passes;
- typecheck passes;
- lint passes;
- backend build passes;
- relevant frontend build/tests pass if admin UI changed.

Any auth-related P0 test failure = NO-GO.

### Gate B - Identity Readiness

Required production AUTH-005 result:

```text
ambiguous active users requiring access = 0
broken active-user mappings = 0
duplicate/conflicting provider mappings = 0
approved safe backfills applied
post-backfill audit completed
```

No email fallback is allowed to bypass this gate.

### Gate C - Administrative Access Readiness

Minimum:

- at least one mapped active ADMIN manually verified.

Preferred:

- two mapped active ADMINs independently verified.

If only one exists:

- document elevated risk;
- verify application rollback and recovery path;
- do not perform risky final-admin production tests.

### Gate D - Recovery Readiness

Required:

- DB restore point available and identified privately;
- prior known-good application commit/release identified;
- deployment rollback procedure known;
- operator knows how to distinguish code rollback from data correction;
- lockout recovery procedure reviewed.

### Gate E - Observability Readiness

Required:

- health/startup logs accessible;
- safe auth reason codes visible;
- operator can identify `AUTH_USER_NOT_PROVISIONED`, invalid-token/config errors, non-active denials, role denials, provider cleanup failures;
- no reliance on logging real tokens/emails for diagnosis.

### Gate F - Change Ownership

Required:

- named operator;
- rollback approver/reviewer;
- change window/communication channel;
- stop authority understood.

---

## Step-by-Step Execution Plan for an Intern Writing the Runbook

The intern may author/document the runbook. Production execution must be performed/approved by authorized operators.

### Phase 0 - Read Every Dependency Completion Record

Do not write the runbook from memory.

Extract from AUTH-005 through AUTH-017:

- final architecture decisions;
- commands actually implemented;
- test names/commands;
- bootstrap command;
- audit event taxonomy;
- provider cleanup contract;
- config cleanup status;
- STOP/known-risk items.

### Phase 1 - Create `docs/AUTH_HARDENING_RUNBOOK.md`

Add a warning at the top:

```text
Do not store secrets or raw production identity exports in this document.
```

### Phase 2 - Write Architecture Invariants

Copy the approved invariants from this ticket and dependency completion records.

Do not invent a fallback path.

### Phase 3 - Write Exact Go/No-Go Checklist

Use checkboxable, measurable gates.

Bad:

```text
Make sure authentication looks okay.
```

Good:

```text
AUTH-005 post-backfill audit shows 0 ambiguous active users requiring access.
AUTH-017 passes.
Admin A local role=ADMIN/status=active and clerkUserId manually verified.
```

### Phase 4 - Document Required Access and Ownership

List access categories and operator roles, never credentials.

### Phase 5 - Document Recovery Anchors

Explain how operator records privately:

- DB restore point identifier/timestamp;
- currently deployed known-good release/commit;
- target release/commit;
- rollback operator.

### Phase 6 - Document AUTH-005 Production Audit/Apply

Include exact safe command names from implemented scripts.

Require dry run first.

Record safe counts only in version-controlled completion evidence.

### Phase 7 - Document Admin Verification

For each designated production admin tester, verify privately:

- local row exists;
- role=ADMIN;
- status=active;
- `clerkUserId` points to intended production Clerk user;
- account can authenticate to correct Clerk tenant/instance.

### Phase 8 - Document Automated Validation Gate

Use exact repository commands after implementation. At minimum equivalent to:

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run test:e2e -w ired-propertyos-backend
npm run build
```

### Phase 9 - Document Disposable Bootstrap Verification

Verify AUTH-008 in a new/disposable environment:

```text
first run -> creates exactly one admin
second run -> refuses
normal runtime -> does not auto-bootstrap
```

Do not run bootstrap against initialized production merely as a smoke test.

### Phase 10 - Document Deployment Sequence

The hardened code deployment occurs **before** obsolete live master-admin values are removed.

### Phase 11 - Document Immediate Smoke Tests

Health first, then Admin A, then Admin B if available.

### Phase 12 - Document Lifecycle/Audit/Provider Smoke Tests

Use a designated disposable production test user, not a random employee.

### Phase 13 - Document Live Config Cleanup

Only after hardened admin login is proven:

- remove obsolete master-admin env values;
- apply hosting change;
- health check;
- admin smoke again.

### Phase 14 - Document Monitoring Window

State what signals to watch and what spike triggers rollback/investigation.

### Phase 15 - Write Rollback Decision Tree

Separate:

- app unhealthy;
- admin mapping failure;
- widespread mapped-user failure;
- wrong backfill/data;
- provider cleanup failure only;
- audit failure;
- obsolete-config cleanup failure.

### Phase 16 - Write Lockout Recovery Procedure

The procedure must explicitly say what **not** to do:

- do not reintroduce special-email auth;
- do not run first-admin bootstrap in initialized production unless approved recovery design says so;
- do not manually promote arbitrary users without identity verification/audit.

### Phase 17 - Review The Runbook As If On-Call

A second engineer should be able to execute it without asking the author what a step means.

Every step should say:

```text
precondition
action
expected result
failure/stop action
evidence to record
```

---

# Production Execution Procedure

The final committed runbook should contain the following operational sequence adapted to actual commands/platform.

## Step 1 - Declare Change Window

Record privately/safely:

- deployment operator;
- reviewer/rollback approver;
- expected start;
- communication channel;
- target commit/release.

## Step 2 - Freeze Unrelated Auth/User-Admin Changes

Avoid merging/deploying unrelated auth changes during the migration window.

## Step 3 - Confirm Gate A: Code Readiness

Run/verify CI and required commands.

If any auth test fails: STOP.

## Step 4 - Create/Verify Database Recovery Point

Before mapping writes:

- create provider-supported snapshot/branch/restore point;
- record identifier privately;
- verify restore procedure is understood.

Do not simply assume automatic backups are sufficient without knowing recovery mechanics.

## Step 5 - Record Current Application Rollback Anchor

Record current production commit/release and how to restore it.

## Step 6 - Confirm Correct Production Clerk Instance

Avoid backfilling IDs from test/dev tenant.

Verify tenant/instance context using safe operational identifiers, not secrets in Git.

## Step 7 - Run AUTH-005 Production Dry Run

Record safe counts:

```text
users scanned
already mapped
safe backfills
no match
ambiguous
broken existing mappings
provider-ID conflicts
```

Raw identity report stays in authorized operational channel only.

## Step 8 - Resolve Ambiguous/Broken Active Users

Do not continue strict rollout while a legitimate active user/admin remains ambiguously mapped.

## Step 9 - Apply Approved Deterministic Backfills

Use explicit apply mode.

Then rerun dry-run audit.

Deploy gate requires zero unresolved active-user conflicts.

## Step 10 - Manually Verify Admin A

Before deploying strict auth, verify intended Clerk ID/local row/role/status.

## Step 11 - Manually Verify Admin B If Available

Prefer independent second admin.

## Step 12 - Confirm Gate D Recovery Readiness Again

Operators must know both app rollback and DB recovery before deployment starts.

## Step 13 - Deploy Hardened Application Code

Use approved production deploy path.

Use production Prisma migration process if migrations exist. Never use `prisma migrate dev` against production.

Do **not** remove old live `MASTER_ADMIN_*` variables yet.

## Step 14 - Check Health/Startup Before Login Tests

Verify:

- deployment finished;
- health endpoint green;
- no migration crash;
- no widespread provider/config initialization error.

If app is unhealthy: rollback application before changing user data/config further.

## Step 15 - Smoke Test Admin A Immediately

Admin A must:

1. sign in through production Clerk;
2. reach a normal protected route/page;
3. reach an ADMIN-only route/page;
4. observe expected role/status;
5. not be mutated by login.

If this fails: STOP. Do not remove old config. Diagnose mapping/config/deployment and use rollback decision tree.

## Step 16 - Smoke Test Admin B

Repeat independently if available.

If A succeeds and B fails, investigate B specifically before declaring admin redundancy healthy.

## Step 17 - Validate Designated Unmapped Identity

Use a safe test identity with no local user.

Expected:

- denied;
- no local user created;
- no identity mapping written;
- admin/user counts unchanged.

If a local row appears: P0 failure, stop rollout.

## Step 18 - Validate Suspended User Behavior

With designated test user:

1. confirm active access;
2. suspend through normal admin flow with reason;
3. confirm DB status/timestamp;
4. confirm immediate access denial;
5. refresh/re-login and confirm no auto-reactivation.

## Step 19 - Validate Explicit Reactivation

Reactivate the same designated user.

Expected:

- status active;
- `deactivatedAt=null`;
- activation audit exists;
- user can sign in again;
- old revoked provider sessions do not magically reappear.

## Step 20 - Validate Deactivation Separately If Safe

Use disposable test user and restore explicitly afterward if appropriate.

## Step 21 - Validate Last-Admin Safety Without Risking Lockout

Do not attempt to disable the only production admin.

Use a safe setup where another verified admin remains, and validate the documented boundary through a non-destructive/reversible scenario.

If backend allows a true zero-admin result: P0 blocker.

## Step 22 - Validate Semantic Audit

Perform one safe role/lifecycle action.

Verify:

- actor local ID correct;
- target correct;
- previous/new value correct;
- reason/request ID correct;
- no token/password/raw request body.

## Step 23 - Validate Session Revocation

With designated user and multiple sessions if practical:

- suspend/deactivate;
- local API denial must happen immediately;
- provider sessions should be revoked according to AUTH-011.

If provider cleanup fails but local denial holds, treat cleanup as a provider-remediation issue, not a reason to reactivate.

## Step 24 - Validate Auth Logging Privacy

Inspect safe production logs around test requests.

Expected:

- reason codes visible;
- request correlation works;
- no bearer token/email/provider subject/secret dumped by changed auth guards.

## Step 25 - Remove Obsolete Live Master-Admin Configuration

Only after Admin A/B hardened access is proven:

1. remove `MASTER_ADMIN_EMAIL`;
2. remove `MASTER_ADMIN_PASSWORD`;
3. apply hosting change/restart if required;
4. check health;
5. smoke Admin A again;
6. smoke Admin B again if available.

Do not record old values.

## Step 26 - Credential Rotation Decision

Determine whether any real account ever used the old committed fallback password.

If yes/possible:

- reset/rotate using approved auth-provider flow;
- revoke relevant sessions;
- record completion only, never credential.

If unknown, keep as unresolved security follow-up. Do not mark ticket fully complete until disposition is accepted.

## Step 27 - Monitoring Window

Watch:

- health/startup;
- `AUTH_USER_NOT_PROVISIONED` spike;
- token verification/config errors;
- inactive/suspended denial counts;
- unexpected ADMIN role denials;
- session cleanup failure rates;
- user support reports of legitimate lockout.

Compare expected test denials vs broad user impact.

## Step 28 - Final Sign-Off

Record:

- target deployment commit;
- gates passed;
- safe mapping counts;
- admin smoke results;
- lifecycle/audit/session checks;
- config cleanup result;
- credential rotation disposition;
- rollback not needed / used and outcome;
- remaining follow-ups.

No secrets/raw PII.

---

# Detailed Production Validation Cases

### PROD-AUTH018-01: Admin A authenticates after hardened deploy

**Purpose:** Prevent production administrative lockout.

**Precondition:** mapping manually verified.

**Action:** login + protected + ADMIN-only action/page.

**Expected Result:** success with stored ADMIN/active state.

**Evidence:** pass/fail, timestamp, operator, target deploy reference.

**Failure Action:** STOP rollout; no config cleanup; diagnose/rollback.

### PROD-AUTH018-02: Admin B independently authenticates

**Purpose:** Verify redundancy.

**Expected Result:** success.

**If unavailable:** document single-admin risk and approved recovery readiness.

### PROD-AUTH018-03: Unmapped designated identity is denied without provisioning

**Purpose:** Confirm removed login-time creation in real production wiring.

**Expected Result:** denied; no new user/mapping/admin.

**Failure Action:** P0 stop/rollback.

### PROD-AUTH018-04: Inactive designated user remains denied

**Purpose:** Verify local lifecycle authority.

**Required Assertions:** no role/status/deactivatedAt mutation from login attempt.

### PROD-AUTH018-05: Suspended user stays denied across refresh/re-login

**Purpose:** Confirm no auto-reactivation.

### PROD-AUTH018-06: Explicit reactivation restores access

**Purpose:** Prove intended recovery path.

**Expected Result:** access only after admin action; activation audit present.

### PROD-AUTH018-07: Last-admin safeguard demonstrated safely

**Purpose:** Verify lockout prevention without risking actual lockout.

**Failure Action:** P0 rollout blocker.

### PROD-AUTH018-08: Semantic audit is correct

**Purpose:** Validate security investigation trail.

**Expected Result:** trusted actor, target, before/after, reason/request ID; no secret/raw body.

### PROD-AUTH018-09: Session revocation works for designated user

**Purpose:** Validate defense-in-depth sign-out.

**Expected Result:** local denial immediately; provider sessions revoked when provider available.

### PROD-AUTH018-10: Clerk cleanup failure still leaves local denial

**Purpose:** Validate fail-closed cross-system behavior.

**Setup:** only if failure can be simulated safely in production-like staging; production execution may rely on AUTH-017 rather than deliberately breaking provider.

**Expected Result:** never reactivate due to provider failure.

### PROD-AUTH018-11: Removing live `MASTER_ADMIN_*` does not affect health/admin access

**Purpose:** Prove obsolete config is truly unused.

**Action:** remove values after hardened admin smoke, apply config, re-smoke.

**Expected Result:** healthy service and successful mapped admins.

### PROD-AUTH018-12: Normal seed/redeploy does not create/reactivate admin

**Purpose:** Confirm operational architecture.

**Execute in safe disposable/staging environment if production seed is not normally run.**

### PROD-AUTH018-13: Auth logs show safe reason codes without credential/PII leakage

**Purpose:** Validate AUTH-014 in deployed environment.

**Use only designated test traffic.**

### PROD-AUTH018-14: No unexplained `AUTH_USER_NOT_PROVISIONED` spike after deploy

**Purpose:** Detect missed production mappings.

**Action:** monitor during change window.

**Expected Result:** only expected designated test events or understood cases.

### PROD-AUTH018-15: Active-admin count remains healthy after validation actions

**Purpose:** Final database safety check.

**Expected Result:** >=1 active ADMIN, preferably >=2.

---

# Rollback Decision Tree

## Scenario A - Backend Fails Health/Startup

Likely category:

- build/runtime config/migration issue.

Action:

1. stop rollout;
2. do not modify more user/config data;
3. roll application back to known-good deployment;
4. verify health;
5. investigate offline.

## Scenario B - Admin A Cannot Authenticate, Health Is Good

Check in order:

1. correct production Clerk instance;
2. deployed commit;
3. Admin A `clerkUserId` mapping;
4. Admin A role/status;
5. token verification config/authorized parties;
6. safe auth reason code.

Do not:

- add email fallback;
- auto-reactivate;
- run first-admin bootstrap casually.

If widespread/unclear, roll back application while preserving audited mapping data for investigation.

## Scenario C - Many Legitimate Users Become `AUTH_USER_NOT_PROVISIONED`

Likely identity migration/readiness problem.

Action:

- stop rollout;
- compare AUTH-005 audit/backfill with production Clerk instance;
- roll back strict-auth application if needed;
- correct deterministic mappings;
- rerun audit before redeploy.

## Scenario D - Wrong Identity Mapping Was Applied

This is a data integrity/security issue.

Action:

1. stop rollout/user activity if risk warrants;
2. identify exact affected mapping(s);
3. verify real identities manually;
4. correct targeted records or use DB recovery procedure as appropriate;
5. do not mass-relink by email blindly;
6. re-audit before redeploy.

## Scenario E - Suspension Works But Clerk Session Cleanup Fails

Local security is still effective.

Action:

- keep user non-active;
- remediate/retry provider cleanup according to approved process;
- do not roll local status back to active merely for cleanup success.

Application rollback is usually unnecessary if only defense-in-depth provider cleanup is degraded and local denial is correct, subject to approved policy.

## Scenario F - Semantic Audit Missing/Incorrect

If audit is mandatory for sensitive mutations:

- stop using affected administrative mutation path;
- decide rollback/hotfix according to scope;
- do not continue silently unaudited privilege changes.

## Scenario G - Removing Obsolete Hosting Variables Breaks Deployment

Action:

- restore previous known-good hosting config temporarily if necessary for service availability;
- identify stale dependency;
- do not restore privileged runtime behavior as permanent design;
- fix/redeploy and repeat cleanup.

---

# Lockout Recovery Rules

If legitimate admins cannot access PropertyOS:

1. confirm application health;
2. confirm correct production Clerk tenant/config;
3. inspect safe auth reason code;
4. verify local admin role/status/mapping directly through authorized DB/operator access;
5. compare target Clerk identity exactly;
6. roll application back if strict-auth code/config is defective;
7. correct proven mapping/data errors through authorized deterministic process;
8. document recovery action/audit.

Do **not**:

- reintroduce special-email auth;
- change inactive admin to active through login logic;
- promote a random user;
- choose a Clerk user by approximate name/email match when ambiguous;
- run initial bootstrap in an initialized production environment unless an approved recovery design explicitly allows it.

---

# Evidence Checklist

Version-controlled/safe evidence may include:

- deployment commit/release IDs;
- pass/fail test results;
- safe aggregate mapping counts;
- admin smoke pass/fail identifiers such as `Admin A`/`Admin B` rather than raw PII;
- timestamp/operator names according to team policy;
- config cleanup complete/pending;
- credential rotation complete/not required/pending;
- rollback used/not used;
- unresolved follow-up ticket IDs.

Do not include raw production identity exports or credentials.

---

## Failure Diagnosis Guide For Runbook Author

### A step says “verify auth works”

Too vague. Rewrite with exact action, expected result, failure action, evidence.

### Runbook removes old live config before new admin smoke

Unsafe order. Move config cleanup after hardened admin verification.

### Runbook uses bootstrap as normal recovery

Architecture mismatch. Stop for explicit break-glass decision.

### Runbook has no DB recovery point before identity backfill

Incomplete. Data migration requires recovery planning.

### Runbook says rollback but does not name rollback anchor/process

Incomplete operational instruction.

### Runbook contains real emails/tokens/DB URLs

Remove them. Use role labels/placeholders and private operational channels.

### Runbook treats provider cleanup failure as local suspension failure

Wrong architecture. Local denial is authoritative.

### Production smoke requires disabling only admin

Unsafe test design. Use designated account/redundant admin setup.

---

## Reviewer Walkthrough

The reviewer should simulate execution line by line and verify:

1. dependency tickets are explicit prerequisites;
2. identity data is audited before strict deploy;
3. DB and app rollback anchors exist;
4. admin mapping is manually verified;
5. two-admin preference is documented;
6. bootstrap is disposable-environment-only by default;
7. hardened code deploy precedes old-config removal;
8. immediate Admin A/B smoke has a STOP condition;
9. unmapped user test proves zero provisioning;
10. lifecycle test proves non-active persistence and explicit reactivation;
11. last-admin test cannot cause real lockout;
12. audit/session/logging validations are included;
13. credential rotation is not confused with string deletion;
14. monitoring reasons and rollback thresholds are understandable;
15. lockout recovery does not reintroduce forbidden fallback;
16. evidence contains no secrets/raw PII.

A reviewer unfamiliar with implementation should still be able to operate safely from the document.

---

## PR Evidence Required For This Ticket

The implementation PR/runbook completion should include:

- link/path to runbook;
- confirmation FREE_TIER/deployment docs agree;
- go/no-go checklist;
- dependency completion references;
- exact automated validation command results;
- production dry-run/backfill safe counts;
- Admin A/B smoke results;
- lifecycle/audit/session smoke results;
- live config cleanup result;
- credential rotation disposition;
- monitoring result;
- rollback used/not used;
- final sign-off names/roles according to team policy;
- unresolved follow-up tickets.

No secrets/raw PII.

---

## Acceptance Criteria

### Documentation

- [ ] `docs/AUTH_HARDENING_RUNBOOK.md` exists.
- [ ] All required sections exist.
- [ ] Deployment docs are consistent with runbook.
- [ ] No secrets/raw PII are committed.

### Pre-Deployment

- [ ] All dependency tickets are complete/reviewed.
- [ ] AUTH-015/016/017 pass.
- [ ] Typecheck/lint/build pass.
- [ ] Production AUTH-005 audit/backfill is complete.
- [ ] No unresolved active-user identity ambiguity remains.
- [ ] At least one mapped active ADMIN is verified; two preferred.
- [ ] DB recovery point exists.
- [ ] Application rollback anchor exists.

### Production Rollout

- [ ] Hardened app deploy is healthy.
- [ ] Admin A succeeds.
- [ ] Admin B succeeds or single-admin risk explicitly approved.
- [ ] Unmapped identity is denied without provisioning.
- [ ] Non-active user stays denied.
- [ ] Explicit reactivation restores access.
- [ ] Last-admin safeguard is validated safely.
- [ ] Semantic audit is validated.
- [ ] Session revocation is validated or provider failure is handled fail-closed.
- [ ] Safe auth logs are validated.
- [ ] Obsolete live `MASTER_ADMIN_*` values are removed after smoke tests.
- [ ] Admin smoke passes again after config cleanup.
- [ ] Credential rotation disposition is complete/approved.
- [ ] Monitoring shows no unexplained auth regression.

### Closure

- [ ] Completion evidence recorded safely.
- [ ] No unresolved P0/STOP issue remains.
- [ ] Follow-up risks have explicit tickets/owners.

---

## Definition of Done

This ticket is complete only when the production rollout is executed and signed off.

A draft runbook alone is **not** Done.

---

## Forbidden Shortcuts

Do not:

- deploy strict mapping before production identity audit/backfill;
- add temporary email fallback to make migration easier;
- remove old live config before verifying hardened admin login;
- test by disabling the only production admin;
- run first-admin bootstrap casually in initialized production;
- use `prisma migrate dev` in production;
- store raw identity audit output in Git;
- paste credentials/tokens into ticket evidence;
- reactivate a user because Clerk cleanup failed;
- mark rollout successful while legitimate mappings are unexplained;
- skip rollback preparation because changes are “only auth.”

---

## STOP - NEEDS ARCHITECT / SECURITY DECISION

Do not begin or continue production rollout if:

- AUTH-017 has an unresolved P0 failure;
- production mapping audit has ambiguity/conflict for active users;
- no legitimate mapped active admin is known;
- last-admin concurrency safety is unresolved but required for production guarantee;
- no DB recovery point is available for mapping changes;
- no application rollback path is known;
- bootstrap/recovery semantics for an initialized zero-admin environment are unclear and rollout depends on them;
- audit reliability policy is unresolved;
- provider cleanup API contract is unresolved in a way that affects access-control semantics.

---

## Workstream Closure Statement

When AUTH-018 is truly complete, the intended production security model is:

```text
Clerk proves external identity.
clerkUserId maps that identity to an explicitly provisioned PropertyOS user.
PropertyOS DB decides role/status/organization/geography.
Authentication is read-only for user security state.
Inactive/suspended users fail closed.
Privilege/lifecycle changes are explicit, audited, and protected against final-admin lockout.
Provider session cleanup is defense-in-depth and cannot reopen local access.
Normal seed/runtime contain no master-admin fallback.
Production rollout and rollback are documented and verified.
```

---

## Completion Record

**Runbook Authored By:**  
**Runbook Reviewed By:**  
**Deployment Operator:**  
**Database Operator:**  
**Clerk Operator:**  
**Rollback Approver:**  
**PR:**  
**Target Production Commit:**  
**Previous Known-Good Commit:**  
**Deployment Date:**  
**AUTH-005 Post-Backfill Audit:** Pass / Fail  
**Admin A Smoke:** Pass / Fail  
**Admin B Smoke:** Pass / Fail / N/A  
**Unmapped Identity Test:** Pass / Fail  
**Lifecycle Test:** Pass / Fail  
**Last-Admin Safety:** Pass / Fail  
**Semantic Audit Verification:** Pass / Fail  
**Session Cleanup Verification:** Pass / Fail / Degraded But Local Fail-Closed  
**Live Config Cleanup:** Complete / Failed / Rolled Back  
**Credential Rotation:** Completed / Not Required / Pending Approved Follow-Up  
**Monitoring Window:** Healthy / Issues Found  
**Rollback Used:** Yes / No  
**Remaining Follow-Ups:**  
**Final Sign-Off:** Approved / Not Approved