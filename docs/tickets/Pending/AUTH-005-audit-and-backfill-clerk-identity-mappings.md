# AUTH-005: Audit and Backfill Clerk Identity Mappings

**Status:** Pending  
**Priority:** P0  
**Area:** Authentication / Data Migration  
**Complexity:** Medium  
**Depends On:** AUTH-002, AUTH-003  
**Blocks:** AUTH-006  
**Production Access Required:** Yes, for final execution only

## Objective

Create a safe, repeatable audit/backfill process that verifies every PropertyOS user who is expected to authenticate through Clerk has the correct `clerkUserId` mapping before AUTH-006 switches authentication from email lookup to provider-ID lookup.

The tooling must default to read-only/dry-run behavior and must never guess when a match is ambiguous.

## Why This Exists

The current Clerk auth flow finds the local PropertyOS user by email and, when `clerkUserId` is empty, can write the verified Clerk subject into the user row during authentication.

AUTH-006 will remove that request-time linking and use `clerkUserId` as the primary identity key. Existing users therefore need to be audited and safely backfilled first.

## Target Outcome

For every user expected to log in with Clerk:

```text
PropertyOS user
  -> exactly one verified Clerk user
  -> PropertyOS.clerkUserId equals Clerk user.id
```

The final audit must report:

- total local users checked;
- mapped users;
- missing mappings;
- mappings whose Clerk user no longer exists;
- email mismatches;
- ambiguous/multiple Clerk matches;
- duplicate local `clerkUserId` values, if schema/data allow them;
- users intentionally excluded from Clerk auth, if any.

AUTH-006 must not proceed until unresolved identity ambiguity is zero or explicitly approved by an architect.

## Expected Files

The engineer may add repository tooling similar to:

- `Backend/scripts/audit-clerk-user-mappings.ts`
- `Backend/scripts/backfill-clerk-user-mappings.ts`
- `Backend/package.json` scripts for running them
- focused tests for matching/apply logic

Use existing repository script conventions if another `scripts/` pattern already exists. Do not invent a different project structure without checking first.

## Required Reading

Read completely:

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. `Backend/src/modules/users/users.service.ts`
3. the Prisma `User` model in `Backend/prisma/schema.prisma`
4. `Backend/package.json`
5. `.env.example` and Clerk-related environment documentation

Confirm the exact type/nullability/uniqueness of `User.clerkUserId` before writing tooling.

## Architecture Contract

### Matching priority

A mapping is safe when one of these is true:

1. local user already has `clerkUserId` and Clerk confirms that exact provider user exists; or
2. local user has no `clerkUserId`, and exactly one Clerk user has the same normalized verified email.

### Ambiguity rule

If zero or multiple Clerk users match an unmapped local user:

```text
DO NOT WRITE
REPORT THE RECORD
STOP/ESCALATE FOR THAT USER
```

### Safety rule

The default command must perform **zero database writes**.

Applying changes must require an explicit action such as `--apply` or a separate apply command.

## Step-by-Step Implementation

### Step 1 - Inspect the User schema

Find the `User` model and record:

- `id`;
- `email`;
- `clerkUserId`;
- `status`;
- `role`;
- `organizationId`;
- uniqueness constraints.

Do not assume `clerkUserId` is unique until verified in the schema.

### Step 2 - Inspect current auth linking

In `jwt-auth.guard.ts`, locate the current branch that fills `clerkUserId` when it is missing.

Do not remove it in this ticket unless AUTH-006 is being implemented in the same PR. Its existence explains why some users may already be mapped and others may not.

### Step 3 - Define the audit result categories

The audit code must classify each local user into one deterministic category. Use names equivalent to:

- `OK_MAPPED`
- `MISSING_LOCAL_CLERK_ID_EXACT_EMAIL_MATCH`
- `MISSING_LOCAL_CLERK_ID_NO_MATCH`
- `MISSING_LOCAL_CLERK_ID_AMBIGUOUS_MATCH`
- `LOCAL_CLERK_ID_NOT_FOUND_IN_CLERK`
- `CLERK_EMAIL_MISMATCH`
- `DUPLICATE_LOCAL_CLERK_ID`

Do not merge ambiguous cases into a generic warning.

### Step 4 - Build a read-only audit mode

The audit command must:

1. connect to the configured PropertyOS database;
2. load the relevant local users;
3. initialize Clerk using `CLERK_SECRET_KEY`;
4. verify existing `clerkUserId` mappings by provider ID;
5. for missing IDs only, search Clerk by normalized local email;
6. classify the result;
7. print a summary;
8. perform no mutation.

### Step 5 - Avoid leaking sensitive data

Do not commit generated production reports.

Console/report output should use local user ID and enough identifying information for the authorized operator to resolve a record, but must never print:

- passwords;
- Clerk secret keys;
- session tokens;
- bearer tokens;
- refresh tokens.

If email is printed, make sure the command is documented as operator-only output and is not sent to normal application logs.

### Step 6 - Build explicit apply/backfill mode

For the safe category `MISSING_LOCAL_CLERK_ID_EXACT_EMAIL_MATCH`, apply mode may set:

`User.clerkUserId = exact Clerk user.id`

Do not change:

- role;
- status;
- organization;
- password;
- email;
- geography.

Apply mode must refuse ambiguous/no-match records.

### Step 7 - Make apply idempotent

Running apply twice must not create new changes after the first successful run.

If a local row already has the same `clerkUserId`, report it as already mapped.

If a different `clerkUserId` is already present, do not overwrite it automatically.

### Step 8 - Add a confirmation summary

Before any apply writes, print counts such as:

```text
Users scanned: N
Already mapped: N
Safe backfills: N
No Clerk match: N
Ambiguous: N
Broken existing mappings: N
Duplicate provider IDs: N
```

If the implementation uses `--apply`, print an explicit `APPLY MODE` indicator.

### Step 9 - Add tests for matching logic

Tests must cover:

- already-correct mapping;
- missing ID + exactly one email match;
- missing ID + no match;
- missing ID + two matches;
- existing ID points to nonexistent Clerk user;
- existing ID points to Clerk user with unexpected email;
- second run after successful backfill makes no write;
- role/status fields are never changed.

### Step 10 - Add package commands

Use clear names such as:

```text
auth:audit-clerk-mappings
auth:backfill-clerk-mappings
```

Exact naming may follow existing package conventions.

The audit command must be obviously safe/read-only.

### Step 11 - Run locally against test fixtures

Do not begin with production.

Use local/test data containing at least:

- one correct mapping;
- one missing safe mapping;
- one no-match user;
- one ambiguous simulated case.

Verify output classifications.

### Step 12 - Production dry run

An authorized operator runs audit mode in the production environment.

Save only the counts and remediation decisions in the ticket/PR. Do not commit a raw PII report.

### Step 13 - Resolve ambiguous records manually

Every ambiguous, broken, or no-match identity must be reviewed.

Do not proceed to strict Clerk-ID auth while unresolved users still need access.

### Step 14 - Production apply

Only after review:

1. capture database backup/restore point according to hosting procedure;
2. run apply for safe mappings;
3. rerun audit;
4. confirm safe-backfill count becomes zero;
5. confirm no role/status values changed.

## Checkpoint Before AUTH-006

- [ ] Audit tooling defaults to no writes.
- [ ] Apply mode is explicit.
- [ ] Exact mapping logic is deterministic.
- [ ] Ambiguous mappings are never auto-written.
- [ ] Production dry run completed by authorized operator.
- [ ] Production backfill completed for approved records.
- [ ] Remaining unresolved identities are documented.
- [ ] No role/status/tenant data changed.

## Tests Required

Unit test the classification/matching function separately from Clerk/network calls.

Integration-test the apply function with a disposable database and mocked Clerk client.

Assert exactly which Prisma fields are updated.

## Manual Verification

After production apply, select several representative users:

- ADMIN;
- WORKER;
- RIDER;
- one recently invited user.

For each, confirm:

1. local `clerkUserId` exists;
2. corresponding Clerk user exists;
3. expected email matches;
4. local role unchanged;
5. local status unchanged.

## Acceptance Criteria

- [ ] Safe audit command exists.
- [ ] Safe explicit backfill mechanism exists.
- [ ] No ambiguous match is automatically linked.
- [ ] Applying only changes `clerkUserId` for approved safe records.
- [ ] Tooling is idempotent.
- [ ] Production audit/backfill is completed before AUTH-006 rollout.
- [ ] No raw production identity report is committed.

## Definition of Done

- [ ] Tool code complete.
- [ ] Tests pass.
- [ ] Typecheck/lint pass.
- [ ] Dry-run tested locally.
- [ ] Production dry-run completed by authorized operator.
- [ ] Approved backfill completed.
- [ ] Post-backfill audit completed.
- [ ] Reviewer approves identity mapping quality.

## Rollback

If a wrong `clerkUserId` is discovered, stop strict-auth rollout. Correct only the affected mapping after verifying the real Clerk identity. Do not mass-clear all IDs unless an architect explicitly approves a recovery plan.

## Forbidden Shortcuts

Do not:

- match by name;
- match by phone number automatically;
- choose the first Clerk result when multiple exist;
- create Clerk users during the audit;
- activate inactive users;
- promote roles;
- overwrite an existing conflicting `clerkUserId` automatically;
- commit production PII reports.

## STOP - NEEDS ARCHITECT DECISION

Stop for any user where identity cannot be proven deterministically. Also stop if the schema allows duplicate `clerkUserId` values and actual duplicates exist; data must be reconciled before adding/enforcing uniqueness or strict provider-ID authentication.

## Completion Record

**Implemented By:**  
**Production Audit Run By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Notes / Unresolved Identities:**