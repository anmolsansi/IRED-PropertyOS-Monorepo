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

## Why This Exists

The current seed contains a "Master Admin User" section that reads `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD`, falls back to hardcoded values, hashes the password, and upserts an administrator.

A routine reference-data seed should not contain production privilege bootstrap behavior. It is too easy for a deployment, local setup, or repeated seed to unexpectedly create or modify a privileged identity.

AUTH-008 will define the explicit one-time admin bootstrap path.

## Current Behavior

Current seed behavior includes logic equivalent to:

```text
masterAdminEmail = env value OR hardcoded email
masterAdminPassword = env value OR hardcoded password
hash password
upsert user by email
assign/update ADMIN properties
```

Because the fallback credential is present in repository history, treat it as publicly known. Removing it from the current file does not make any deployed account that used it safe; credentials must be rotated operationally.

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

## Expected Files To Modify

- `Backend/prisma/seed.ts`
- `Backend/package.json` only if seed scripts/documentation require cleanup
- tests or validation scripts if seed behavior has automated coverage

Do not implement the replacement bootstrap here; AUTH-008 owns it.

## Required Reading

1. Read `Backend/prisma/seed.ts` completely.
2. Find every use of `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD` in that file.
3. Find every `prisma.user.create`, `upsert`, or `update` inside the seed.
4. Determine whether any seeded demo records depend on the seeded master-admin user's ID.

That fourth step is critical. Do not delete the user block until you know whether later seed records reference `masterAdminUser.id`.

## Baseline Commands

Use a disposable/local database only.

```bash
npm run db:generate
npm run typecheck:backend
```

Before changing the seed, run it against a disposable database if practical and record what user rows it creates/modifies.

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

### Step 2 - Find downstream references

Search the remainder of `seed.ts` for:

- `masterAdminUser`
- `masterAdminEmail`
- `masterAdminPassword`
- `masterAdminPasswordHash`

If `masterAdminUser.id` is used as creator/owner/assignee for other seeded records, do not simply delete those references. Determine whether the records can use a non-privileged fixture user or omit the relationship.

If changing ownership semantics would affect product/demo behavior, STOP and escalate.

### Step 3 - Remove fallback credentials

Remove all hardcoded admin email/password fallback values from `seed.ts`.

Do not replace them with different defaults.

### Step 4 - Remove admin upsert from normal seed

Delete the normal-seed behavior that creates or updates the master administrator.

The seed must not touch production user privilege state.

### Step 5 - Remove now-unused password hashing code

If `argon2` is used only for the removed master-admin seed, remove its import from this file.

If it is used elsewhere in the seed, keep it.

Do not remove the dependency from `package.json` because the application user service still uses Argon2 for password handling.

### Step 6 - Resolve any safe demo-data dependency

If demo records require a user foreign key, use one of these only if already consistent with repository patterns:

- a clearly named non-production fixture user created only in a dedicated development/test seed; or
- nullable ownership fields where the schema allows it.

Do not create an `ADMIN` merely to satisfy fixture ownership.

### Step 7 - Search the seed again

Expected zero matches in `Backend/prisma/seed.ts` for:

- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- known hardcoded master-admin credentials
- `Master Admin` privileged creation block

### Step 8 - Test idempotency

Against a disposable database:

1. record current users and their role/status/password hash metadata;
2. run `npm run db:seed`;
3. run it a second time;
4. compare users before/after.

Expected:

- no new privileged account;
- no existing role changed;
- no status changed;
- no password reset because of seed.

### Step 9 - Run repository validation

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Checkpoint

- [ ] Normal seed contains no admin bootstrap.
- [ ] Normal seed contains no privileged default password.
- [ ] Normal seed contains no privileged default email.
- [ ] Running seed twice does not alter user privilege state.
- [ ] Reference data still seeds successfully.

## Tests Required

At minimum establish automated or scripted proof that:

1. seed can run without `MASTER_ADMIN_EMAIL`;
2. seed can run without `MASTER_ADMIN_PASSWORD`;
3. user count/role/status are not changed by the seed, except any explicitly documented non-production fixture path;
4. seed remains idempotent for reference data.

## Manual Verification

On a disposable DB:

1. create an active admin manually;
2. create an inactive worker manually;
3. capture IDs, roles, statuses, and password-hash values;
4. run seed twice;
5. compare values;
6. confirm admin/worker auth state is unchanged.

## Operational Follow-Up

Because a fallback password was committed to repository history, the authorized operator must determine whether any real account ever used that password.

If yes:

- rotate/reset that account credential;
- revoke sessions where appropriate;
- do not put the new credential in Git.

This operational rotation can be recorded in AUTH-018 deployment notes.

## Acceptance Criteria

- [ ] `db:seed` does not create/admin-upsert privileged users.
- [ ] No hardcoded privileged credentials remain in the seed.
- [ ] Seed does not mutate user role/status/password.
- [ ] Reference data still seeds.
- [ ] Repeated seed runs are safe.
- [ ] Any credential exposed by the old fallback is flagged for rotation.

## Definition of Done

- [ ] Code complete.
- [ ] Disposable DB seed test passes twice.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Backend tests pass.
- [ ] Reviewer confirms user privilege state is outside normal seed responsibilities.

## Rollback

If reference/demo data fails because it depended on the master-admin fixture, fix the fixture dependency explicitly. Do not restore privileged defaults to the seed.

## Forbidden Shortcuts

Do not:

- change the fallback password to a stronger password;
- require operators to set master-admin env vars just to run normal seed;
- keep admin upsert but remove only the defaults;
- make the seed reactivate an existing admin;
- move the same privileged seed logic into another ordinary seed file.

## STOP - NEEDS ARCHITECT DECISION

Stop if business-critical seed data requires a privileged user foreign key and there is no safe non-privileged/null alternative. Escalate the data-ownership decision rather than recreating an implicit admin fixture.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Credential Rotation Required:** Yes / No / Unknown  
**Notes:**