# AUTH-007: Remove Privileged Defaults From Database Seed

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Database Seeding / Security  
**Complexity:** Small  
**Depends On:** None  
**Blocks:** AUTH-008, AUTH-013, AUTH-018  
**Primary File:** `Backend/prisma/seed.ts`

## Objective

Remove privileged administrator creation and fallback credentials from the normal database seed process.

After this ticket, running `npm run db:seed` must not create, reactivate, promote, reset, or otherwise modify administrator/user authentication state.

## Junior Engineer Orientation

A database seed should make the application usable by creating predictable reference/configuration/demo data. It should **not** secretly be an administrator-recovery mechanism.

Think of the separation as:

```text
Normal seed
  -> states, cities, reference values, safe demo/reference records

First-admin bootstrap
  -> separate explicit security operation (AUTH-008)
```

The current seed mixes those responsibilities by creating/updating a privileged account with fallback credentials. Your job is to remove that behavior without accidentally breaking unrelated reference-data seeding.

The most important thing to investigate before deleting code is whether later seed records refer to `masterAdminUser.id`. If they do, deleting the admin block without resolving those references can break the seed or tempt you to re-add the admin for convenience.

## Why This Exists

The current seed contains a "Master Admin User" section that reads `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD`, falls back to hardcoded values, hashes the password, and upserts an administrator.

A routine reference-data seed should not contain production privilege bootstrap behavior. It is too easy for a deployment, local setup, or repeated seed to unexpectedly create or modify a privileged identity.

AUTH-008 defines the explicit one-time admin bootstrap path.

## Current Behavior

Current seed behavior includes logic equivalent to:

```text
masterAdminEmail = env value OR hardcoded email
masterAdminPassword = env value OR hardcoded password
hash password
upsert user by email
assign/update ADMIN properties
```

Because a fallback credential exists in repository history, treat that credential as publicly known. Removing it from the current file does not make any deployed account that used it safe; credential rotation is an operational follow-up.

## Target Behavior

`db:seed` is safe to run repeatedly and handles reference/demo data only.

It must not:

- create an administrator;
- update an administrator;
- reactivate a user;
- promote a user;
- reset a password;
- require `MASTER_ADMIN_EMAIL`;
- require `MASTER_ADMIN_PASSWORD`.

### Seed security invariant

For pre-existing users:

```text
role_after_seed == role_before_seed
status_after_seed == status_before_seed
passwordHash_after_seed == passwordHash_before_seed
clerkUserId_after_seed == clerkUserId_before_seed
```

unless a future explicitly approved seed contract says otherwise.

## Expected Files To Modify

- `Backend/prisma/seed.ts`
- `Backend/package.json` only if seed scripts/documentation require cleanup
- tests or validation tooling if seed behavior has automated coverage

Do not implement the replacement bootstrap here; AUTH-008 owns it.

## Required Reading

1. Read `Backend/prisma/seed.ts` completely.
2. Find every use of `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` in that file.
3. Find every `prisma.user.create`, `upsert`, or `update` inside the seed.
4. Determine whether any seeded records depend on the seeded master-admin user's ID.
5. Read `docs/tickets/TICKET_DETAIL_STANDARD.md`.

That fourth step is critical. Do not delete the user block until you know whether later seed records reference `masterAdminUser.id`.

## Baseline Commands

Use a disposable/local database only.

```bash
npm run db:generate
npm run typecheck:backend
```

Before changing the seed, run it against a disposable database if practical and record what user rows it creates/modifies.

Never test seed behavior against production while developing this ticket.

## Architecture Contract

Normal database seed:

```text
reference/configuration/demo data
```

Privileged bootstrap:

```text
separate explicit operator action
```

These are separate concerns and must remain separate.

## Step-by-Step Implementation

### Step 1 - Locate the entire master-admin seed block

Find the comment/header similar to:

`Master Admin User`

Identify the full block from environment-variable resolution through the end of the admin upsert and any logging associated with it.

**Verify:** You know exactly where the privileged block starts/ends before deleting it.

### Step 2 - Find downstream references

Search the remainder of `seed.ts` for:

- `masterAdminUser`
- `masterAdminEmail`
- `masterAdminPassword`
- `masterAdminPasswordHash`

If `masterAdminUser.id` is used as creator/owner/assignee for other seeded records, do not simply delete those references.

Determine whether the records can:

- use a clearly non-privileged fixture user in a dev/test-only context; or
- omit a nullable relationship; or
- be seeded without user ownership.

If changing ownership semantics affects meaningful product/demo behavior, stop and escalate.

### Step 3 - Record pre-change user mutation behavior

Before editing, document which fields the admin upsert can create/update. These become test assertions.

At minimum inspect:

- role;
- status;
- password hash;
- email/name;
- verification/lifecycle fields.

### Step 4 - Remove fallback credentials

Remove all hardcoded admin email/password fallback values from `seed.ts`.

Do not replace them with different defaults or generated credentials.

### Step 5 - Remove admin upsert from normal seed

Delete the normal-seed behavior that creates or updates the master administrator.

The normal seed must not touch production user privilege state.

### Step 6 - Remove now-unused password hashing code

If `argon2` is used only for the removed master-admin seed, remove its import from this file.

If it is used elsewhere in the seed, keep it.

Do not remove the dependency from `package.json` merely because this seed no longer needs it; application services may still use Argon2.

### Step 7 - Resolve safe demo-data dependencies

If demo records require a user foreign key, use an existing repository-supported non-privileged fixture approach or escalate.

Do not create an `ADMIN` merely to satisfy fixture ownership.

### Step 8 - Search the seed again

Expected zero active matches in `Backend/prisma/seed.ts` for:

- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- known hardcoded master-admin credentials
- privileged `Master Admin` creation/upsert behavior

Historical documentation/tickets may still describe the old mechanism; executable seed code may not.

### Step 9 - Test seed idempotency and user-state immutability

Against a disposable database:

1. create representative users with known state;
2. snapshot relevant fields;
3. run `npm run db:seed`;
4. run it a second time;
5. compare user rows before/after;
6. verify reference data still exists and duplicates are not introduced unexpectedly.

### Step 10 - Run repository validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

### Step 11 - Review deployment/docs dependencies

Do not fix AUTH-013 fully here, but note remaining `MASTER_ADMIN_*` references for that ticket. The seed code itself must no longer need them.

## Checkpoint

- [ ] Normal seed contains no admin bootstrap.
- [ ] Normal seed contains no privileged default password.
- [ ] Normal seed contains no privileged default email.
- [ ] Running seed twice does not alter user privilege/auth state.
- [ ] Reference data still seeds successfully.
- [ ] Any former `masterAdminUser.id` dependency was resolved safely or escalated.

## Detailed Test Specification

### TEST-AUTH007-01: Seed runs with no `MASTER_ADMIN_*` environment variables

**Purpose:** Prove privileged env vars are no longer required for routine seeding.

**Level:** Integration/script verification using disposable DB.

**Setup:** Ensure `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` are unset. Use a fresh disposable database configured for seeding.

**Action:** Run `npm run db:seed`.

**Expected Result:** Seed completes successfully for supported reference/demo data.

**Required Assertions:** No missing-master-admin-env error; no admin created as a side effect.

**Why This Test Exists:** Removing fallback strings is incomplete if the seed still requires privileged config.

**If This Test Fails:** Search the seed and imported helpers for remaining `MASTER_ADMIN_*` reads. Do not add the variables back.

### TEST-AUTH007-02: Seed does not create an administrator in an empty user table

**Purpose:** Prove normal seed no longer bootstraps privilege.

**Level:** Integration.

**Setup:** Disposable DB with zero users.

**Action:** Run seed.

**Expected Result:** Reference data seeds; no privileged user appears unless a clearly separate non-production fixture contract is explicitly approved.

**Required Assertions:** Count of `role=ADMIN` created by this routine seed is zero.

**Why This Test Exists:** It directly catches reintroduction of admin seeding.

**If This Test Fails:** Find user create/upsert path inside the normal seed and remove/relocate it to AUTH-008-style bootstrap.

### TEST-AUTH007-03: Existing active admin is not modified

**Purpose:** Protect legitimate administrator state from routine seed runs.

**Level:** Integration.

**Setup:** Create an active ADMIN with known ID, role, status, password hash, `clerkUserId`, and other auth-relevant fields.

**Action:** Run seed once and again.

**Expected Result:** User security/auth fields remain unchanged.

**Required Assertions:** Same role/status/password hash/provider ID before and after; no reactivation/reset behavior.

**Why This Test Exists:** An upsert may still modify existing admins even if it no longer creates new ones.

**If This Test Fails:** Search for update/upsert logic targeting users in the seed.

### TEST-AUTH007-04: Inactive/suspended user remains non-active

**Purpose:** Prove seed cannot silently reactivate accounts.

**Level:** Integration.

**Setup:** Create inactive worker and suspended admin with known `deactivatedAt` values.

**Action:** Run seed twice.

**Expected Result:** Both states/timestamps remain unchanged.

**Required Assertions:** No status update to active; no clearing of lifecycle metadata.

**Why This Test Exists:** Routine setup/deploy operations must not defeat deliberate access removal.

**If This Test Fails:** Remove user status writes from seed.

### TEST-AUTH007-05: Existing password hash is not reset

**Purpose:** Prevent seed from silently changing credentials.

**Level:** Integration.

**Setup:** Existing user with known test password hash value.

**Action:** Run seed.

**Expected Result:** Hash remains byte/string-identical.

**Required Assertions:** No user password update.

**Why This Test Exists:** The old seed hashed a fallback password. Removing only role logic could leave password-reset side effects.

**If This Test Fails:** Remove remaining password-hash mutation from routine seed.

### TEST-AUTH007-06: Reference-data seed remains idempotent

**Purpose:** Ensure security cleanup does not break the seed's actual job.

**Level:** Integration.

**Setup:** Disposable DB.

**Action:** Run seed twice.

**Expected Result:** Both runs succeed; reference data remains correct without unintended duplicates.

**Required Assertions:** Compare representative state/city/reference counts/unique keys according to existing seed design.

**Why This Test Exists:** A junior engineer may accidentally delete shared setup code while removing admin logic.

**If This Test Fails:** Restore/reference-data logic only; do not restore privileged user seeding.

### TEST-AUTH007-07: Seed contains no hidden privileged fallback strings/logic

**Purpose:** Catch renamed/moved defaults.

**Level:** Static/manual verification.

**Setup:** Updated branch.

**Action:** Search `Backend/prisma/seed.ts` for `MASTER_ADMIN`, hardcoded credential patterns, user upsert/create tied to ADMIN.

**Expected Result:** No active privileged bootstrap behavior in normal seed.

**Required Assertions:** Record safe search results in PR.

**Why This Test Exists:** Runtime tests may not exercise dormant branches.

**If This Test Fails:** Inspect and remove/relocate the active privileged path.

### TEST-AUTH007-08: Former owner/creator fixture dependency is safe

**Purpose:** Verify removing `masterAdminUser` did not leave broken foreign-key/demo semantics.

**Level:** Integration/manual depending on seed data.

**Setup:** Seed from empty disposable DB after resolving any downstream `masterAdminUser.id` references.

**Action:** Run seed and inspect affected demo/reference records.

**Expected Result:** Seed succeeds and relationships follow the explicitly chosen safe replacement/null behavior.

**Required Assertions:** No ADMIN was reintroduced merely to satisfy a foreign key.

**Why This Test Exists:** Hidden fixture dependencies are the most likely reason someone would re-add the privileged seed.

**If This Test Fails:** Escalate ownership semantics rather than recreating a master admin.

## Manual Verification

On a disposable DB:

1. create an active admin manually;
2. create an inactive worker manually;
3. optionally create a suspended user;
4. capture IDs, roles, statuses, `clerkUserId`, `deactivatedAt`, and password-hash values;
5. run seed twice;
6. compare values;
7. confirm user auth state is unchanged;
8. confirm expected reference data still exists.

## Operational Follow-Up

Because a fallback password was committed to repository history, the authorized operator must determine whether any real account ever used that password.

If yes:

- rotate/reset that account credential through the supported auth provider flow;
- revoke sessions where appropriate;
- do not put the new credential in Git;
- record only that rotation was completed, not the credential.

This operational rotation can be recorded in AUTH-018 deployment notes.

## Failure Diagnosis Guide

### Seed fails because `masterAdminUser` is undefined

A downstream fixture references the removed admin. Do not recreate the privileged user automatically. Determine the correct non-privileged/null fixture ownership or escalate.

### Seed passes but existing admin password changes

There is still a user mutation in seed or a helper. Search all user writes.

### Empty DB now has an ADMIN after seed

Ticket failed. Find the user creation/upsert path. Normal seed must not bootstrap admin.

### Reference data disappears

You removed too much. Restore reference-data sections while keeping user privilege bootstrap separate.

## PR Evidence Required

Include:

- privileged seed block removed;
- downstream `masterAdminUser` reference search result;
- seed test on disposable DB run twice;
- before/after user security fields for fake test users;
- reference-data idempotency result;
- repository search showing no active `MASTER_ADMIN_*` use in `seed.ts`;
- credential-rotation follow-up status as `Required / Not Required / Unknown`, without secrets.

## Acceptance Criteria

- [ ] `db:seed` does not create/admin-upsert privileged users.
- [ ] No hardcoded privileged credentials remain in the seed.
- [ ] Seed does not mutate user role/status/password/provider mapping.
- [ ] Reference data still seeds.
- [ ] Repeated seed runs are safe/idempotent.
- [ ] Any former fixture dependency is resolved without recreating an implicit admin.
- [ ] Any credential exposed by the old fallback is flagged for rotation.

## Definition of Done

- [ ] Code complete.
- [ ] Disposable DB seed test passes twice.
- [ ] Detailed user-state immutability tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Backend tests pass.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms user privilege state is outside normal seed responsibilities.

## Rollback

If reference/demo data fails because it depended on the master-admin fixture, fix the fixture dependency explicitly. Do not restore privileged defaults to the seed.

## Forbidden Shortcuts

Do not:

- change the fallback password to a stronger password;
- require operators to set master-admin env vars just to run normal seed;
- keep admin upsert but remove only the defaults;
- make the seed reactivate an existing admin;
- move the same privileged seed logic into another ordinary seed file;
- create a fake ADMIN only to satisfy a demo-record foreign key;
- weaken user-state tests because seed writes seem convenient.

## STOP - NEEDS ARCHITECT DECISION

Stop if business-critical seed data requires a privileged user foreign key and there is no safe non-privileged/null alternative. Escalate the data-ownership decision rather than recreating an implicit admin fixture.

Also stop if the project intentionally uses different seed modes (production/reference vs development/demo) but they are currently mixed in one file. Separating seed modes is an architecture/operations decision beyond a silent change.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Seed Run 1:** Pass / Fail  
**Seed Run 2:** Pass / Fail  
**User-State Comparison:** Pass / Fail  
**Credential Rotation Required:** Yes / No / Unknown  
**Notes:**

---

## Expanded Architecture Discussion And Decision Record

### Decision 1: Routine seeding and privileged bootstrap are separate operational concepts

**Decision:** `db:seed` owns safe deterministic reference/demo setup only. First-admin creation is a separate explicit operation owned by AUTH-008.

**Reason:** Seeds are commonly rerun during development, testing, deployment troubleshooting, and environment rebuilds. Anything they do must be safe to repeat. Privileged account creation/reset is not safe as an implicit repeatable side effect.

**Rejected alternative:** Keep admin upsert in seed but require strong environment variables.

**Why rejected:** That removes weak defaults but still lets a routine seed create/reactivate/promote privileged access. The responsibility boundary remains wrong.

### Decision 2: Published fallback credentials are considered compromised if ever used

**Decision:** Treat the old fallback password as known once committed to repository history. Removing it from the current branch does not count as credential rotation.

**Reason:** Git history, forks, caches, logs, and prior clones can retain the value.

**Rejected alternative:** Delete the string and assume the risk is gone.

**Why rejected:** Deleting current source cannot invalidate a credential already used by a deployed account.

### Decision 3: Seed must not depend on a privileged user merely for fixture ownership

**Decision:** Any demo/reference records that used the seeded admin must be given a deliberate safe ownership strategy rather than recreating a privileged fixture.

**Reason:** Foreign-key convenience must not dictate production security architecture.

## Facts, Assumptions, And Unknowns

### Facts

- Current seed resolves master-admin env variables with hardcoded fallbacks and upserts a privileged user.
- Routine `db:seed` is available as a normal package command.
- AUTH-008 is intended to replace privileged bootstrap responsibility.

### Assumptions to verify

- Reference data can be seeded without mutating privileged user state.
- Any fixture requiring a user owner can either use a non-privileged dev fixture or a nullable/appropriate relationship.

### Unknowns requiring escalation

- Whether any real deployed account currently uses the historical fallback credential.
- Whether deployment automation currently invokes seed expecting it to create an administrator.
- Whether there are separate production/reference vs dev/demo seed expectations not yet encoded in repository structure.

## Intern Execution Sequence - No Improvisation

### Phase A - Inventory seed responsibilities

1. Run seed against a disposable DB before changes.
2. Record reference tables/records created.
3. Record every user create/update/upsert performed.
4. Search for `masterAdminUser` downstream references.
5. Separate reference-data logic from privileged-user logic in your notes.
6. Stop if deleting the admin would break a business-critical ownership relation whose replacement is not obvious.

### Phase B - Protect user state with fixtures

Create fake disposable users before running the new seed:

```text
Admin A: active ADMIN, known passwordHash, known clerkUserId
Admin B: inactive ADMIN, known deactivatedAt
Worker C: suspended WORKER, known deactivatedAt
```

Snapshot every auth/security field before seeding. These snapshots become before/after assertions.

### Phase C - Remove privileged behavior

1. Remove fallback email/password values.
2. Remove master-admin hash generation used only by seed.
3. Remove privileged user upsert/create/update.
4. Resolve downstream fixture references safely.
5. Do not add a new admin helper call.
6. Run seed once.
7. Compare user snapshots.
8. Run seed again.
9. Compare again.

### Phase D - Validate seed's real job

1. Verify representative reference records exist after the first run.
2. Verify the second run is idempotent according to existing unique/upsert rules.
3. Verify no unexpected duplicate cities/states/reference data appear.
4. Verify no user auth state changed.
5. Run backend tests/typecheck/lint.

### Phase E - Operational security follow-up

1. Search repository/runtime documentation for the historical privileged defaults.
2. Record credential-rotation status as required/not-required/unknown.
3. Do not put any replacement secret in the PR.
4. Hand persistent config cleanup to AUTH-013 and rollout/rotation confirmation to AUTH-018.

## Additional Test Cases And Explanations

### TEST-AUTH007-09: Seed cannot restore an admin that was demoted before the run

**Purpose:** Prove routine seed does not "repair" historical master-admin role state.

**Level:** Integration.

**Setup:** Create a user that previously could have matched the old seeded identity concept but currently has a non-admin role in the disposable DB. Use fake test data only.

**Action:** Run seed twice.

**Expected Result:** Role remains the non-admin value.

**Required Assertions:** No role promotion; no status change; no password reset.

**Why This Test Exists:** Removing creation is not enough if an old upsert update branch can still restore privileges.

**False Positive To Avoid:** Testing only an unrelated worker row that the old where-clause could never match.

**If This Test Fails:** Remove user-targeted upsert/update behavior from normal seed.

### TEST-AUTH007-10: Seed failure after reference-data work does not trigger admin recovery logic

**Purpose:** Ensure errors elsewhere in seed do not cause a catch/finally path to recreate a privileged account.

**Level:** Integration/unit if error injection is possible.

**Setup:** Inject or simulate a failure in a later safe seed section after some reference operations.

**Action:** Run seed.

**Expected Result:** Seed fails according to normal error semantics, and no admin/user auth mutation occurs.

**Database Assertions:** Existing user security fields remain unchanged.

**Why This Test Exists:** Recovery code can hide in catch/finally paths, not only the obvious master-admin block.

**False Positive To Avoid:** Failing before the seed initializes, which does not exercise error handling after work begins.

**If This Test Fails:** Remove privileged recovery from seed error handling.

### TEST-AUTH007-11: Production-like environment does not change seed behavior

**Purpose:** Prove privileged creation is not conditionally retained only for production/deployment mode.

**Level:** Script/integration.

**Setup:** Disposable DB with production-like `NODE_ENV` and no real secrets.

**Action:** Run seed.

**Expected Result:** Same no-user-mutation contract as development/test.

**Required Assertions:** No admin create/update and reference data still follows the approved seed contract.

**Why This Test Exists:** A branch such as `if (NODE_ENV === 'production') bootstrapAdmin()` would bypass ordinary local tests.

**False Positive To Avoid:** Only testing default development environment.

**If This Test Fails:** Remove environment-specific privileged seed behavior.

## Observability And Audit Expectations

Normal seed output may report reference-data progress but must not print passwords, password hashes, provider secrets, or privileged bootstrap credentials. After this ticket, there should be no log claiming a master administrator was created or reset by routine seeding.

If credential rotation is required because the historical fallback was used, record only the completion state in operational notes, never the replacement credential.

## Reviewer Walkthrough

1. Search `seed.ts` for all user writes before reviewing anything else.
2. Search for `MASTER_ADMIN` and historical fallback concepts.
3. Review downstream fixture-owner changes caused by removing `masterAdminUser`.
4. Review the twice-run seed test and user-state snapshots.
5. Confirm empty user table remains without an implicitly seeded admin.
6. Confirm reference data still seeds correctly.
7. Confirm no production-only branch reintroduces privileged behavior.
8. Confirm credential rotation is treated as a separate operational action.

## Handoff Notes

After AUTH-007 completes:

- AUTH-008 can implement the only approved first-admin bootstrap path without competing seed behavior.
- AUTH-013 can remove obsolete `MASTER_ADMIN_*` runtime configuration from examples/deployment manifests.
- AUTH-018 can require credential rotation/go-live checks without worrying that `db:seed` will recreate/reset the privileged account.

The routine seed must stay privilege-neutral in future work. If development needs fixture users, that should be explicitly designed as development/test fixture behavior rather than hidden production bootstrap semantics.
