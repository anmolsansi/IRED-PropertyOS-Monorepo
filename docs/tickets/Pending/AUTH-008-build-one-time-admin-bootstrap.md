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
- creates an audit record if the audit schema supports it safely;
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

## Step-by-Step Implementation

### Step 1 - Inspect existing script conventions

Search `Backend/` for existing operational scripts.

If a `scripts/` directory already exists, use it. Otherwise create `Backend/scripts/`.

Do not place bootstrap logic inside `src/main.ts`, module initialization, Prisma seed, or migrations.

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

Read the required values.

If either bootstrap identity value is missing/blank:

- print a safe error explaining which variable is missing;
- perform zero writes;
- exit non-zero.

Normalize the email for comparison only. Do not modify the Clerk ID.

### Step 4 - Initialize Prisma and Clerk

Use the repository's existing Prisma client conventions and `@clerk/backend` dependency.

Do not print secret values.

### Step 5 - Check whether bootstrap is still allowed

Query for active users whose role is `ADMIN`.

If count >= 1:

- print `Bootstrap refused: an active administrator already exists.`;
- perform zero writes;
- exit non-zero.

This makes normal repeated execution safe.

### Step 6 - Verify the exact Clerk identity

Fetch Clerk user using `BOOTSTRAP_ADMIN_CLERK_ID`.

Determine the appropriate verified/primary email from the provider record using the same normalized comparison rules established by the auth integration.

If the Clerk user cannot be found, refuse.

If the Clerk email does not match `BOOTSTRAP_ADMIN_EMAIL`, refuse.

Do not search by display name.

### Step 7 - Check local conflicts by Clerk ID

Query local `User` by `clerkUserId`.

If a user already exists with that ID:

- do not change role/status automatically;
- report the local user ID and safe conflict reason;
- stop for manual review.

### Step 8 - Check local conflicts by email

Query local `User` by normalized email.

If a user exists with that email but different/missing Clerk identity:

- do not promote;
- do not reactivate;
- do not relink automatically;
- stop and instruct operator to resolve identity through AUTH-005-style verification.

### Step 9 - Create the initial administrator

Only after all checks pass, create exactly one local user with:

- supplied normalized email;
- supplied verified Clerk user ID;
- appropriate full name from Clerk or explicit safe value;
- `role = ADMIN`;
- `status = active`;
- fields required by the current schema.

Do not create a reusable/default password for Clerk-based production auth.

If `passwordHash` is schema-required, use the repository's approved Clerk-managed sentinel pattern only if it is still architecturally required; do not invent a login-capable fallback password.

### Step 10 - Use a transaction for local writes

If creating both the user and an audit event, use a Prisma transaction so partial bootstrap state is not left behind.

If audit-event creation is not possible without unsupported required fields, complete user creation only after reviewer decision and record the limitation for AUTH-012.

### Step 11 - Print a safe result

On success print only what the authorized operator needs, for example:

- local user ID;
- normalized email if operator output policy permits;
- role;
- status;
- confirmation that bootstrap is now disabled by the active-admin precondition.

Never print secrets/tokens.

### Step 12 - Ensure cleanup

Always disconnect Prisma in a `finally` path or equivalent.

Return non-zero exit code on failure.

### Step 13 - Add tests

Extract testable business logic or mock Prisma/Clerk appropriately.

Required cases are below.

### Step 14 - Validate locally

Use a disposable database and mocked/test Clerk identity.

Run bootstrap once: expect one admin.

Run it again: expect refusal and no changes.

## Checkpoint

- [ ] Bootstrap is manual only.
- [ ] No fallback email exists.
- [ ] No fallback password exists.
- [ ] Exact Clerk ID is verified.
- [ ] Email/ID conflict fails closed.
- [ ] Existing active admin causes refusal.
- [ ] Second run is safe.

## Tests Required

### Test 1 - missing inputs

Expected: failure, zero writes.

### Test 2 - existing active admin

Expected: failure, zero writes.

### Test 3 - Clerk ID not found

Expected: failure, zero writes.

### Test 4 - Clerk email mismatch

Expected: failure, zero writes.

### Test 5 - local Clerk-ID conflict

Expected: failure, no role/status changes.

### Test 6 - local email conflict

Expected: failure, no promotion/reactivation.

### Test 7 - clean new environment

Expected: exactly one active ADMIN linked to exact Clerk ID.

### Test 8 - run command second time

Expected: refusal because active admin exists; total admin count remains one.

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
9. confirm no second admin created.

## Recovery Boundary

This ticket does **not** create a permanent break-glass account.

If all production admins are later disabled, recovery must use an authorized operational runbook with explicit human review. Do not make the bootstrap automatically re-enable itself merely because active-admin count reaches zero after the system has already been initialized.

If a persistent marker is required to distinguish "never bootstrapped" from "all admins later disabled," that is a separate architect decision. Do not guess.

## Acceptance Criteria

- [ ] Fresh environment can intentionally create its first admin.
- [ ] Bootstrap requires explicit verified identity input.
- [ ] No default credential exists.
- [ ] Existing active admin prevents another bootstrap.
- [ ] Existing conflicting user is not silently promoted/reactivated.
- [ ] Script never runs automatically.
- [ ] Tests cover all refusal paths.

## Definition of Done

- [ ] Script/command implemented.
- [ ] Tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Disposable-environment manual test passes.
- [ ] AUTH-018 documentation references the command.
- [ ] Security reviewer approves bootstrap conditions.

## Rollback

Removing the bootstrap script does not require DB rollback. If a test bootstrap created an unwanted disposable user, remove it only through normal test cleanup. Never delete a legitimate production admin without explicit authorization.

## Forbidden Shortcuts

Do not:

- run bootstrap at server startup;
- use `MASTER_ADMIN_*`;
- include a default email/password;
- auto-promote existing users;
- auto-reactivate inactive users;
- accept frontend-provided bootstrap requests;
- expose a public `/bootstrap-admin` HTTP endpoint;
- allow repeated bootstrap after an active admin exists.

## STOP - NEEDS ARCHITECT DECISION

Stop if the current Prisma schema requires a password representation that cannot safely support a Clerk-only bootstrap without creating a fake reusable credential. Also stop if the business requires a formal break-glass recovery account; that is a broader security design and must not be improvised here.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Disposable Bootstrap Test:** Pass / Fail  
**Notes:**