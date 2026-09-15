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

## Junior Engineer Orientation

This ticket is a **data migration safety ticket**, not just a script-writing ticket.

AUTH-006 will make this assumption:

```text
Clerk token sub == PropertyOS User.clerkUserId
```

If existing production users are missing or have the wrong mapping, those users will be locked out after AUTH-006. Therefore this ticket creates tooling to answer, with evidence:

```text
Which local users are correctly mapped?
Which are safely fixable?
Which are ambiguous and require a human decision?
```

The most important rule is:

```text
When identity is ambiguous, DO NOT GUESS.
```

A wrong identity mapping is worse than a temporary login failure because it can associate one real person's external identity with another person's PropertyOS permissions.

### Terms

- **Local user:** `User` row in PropertyOS database.
- **Clerk user:** External identity record in Clerk.
- **Mapping:** `PropertyOS.User.clerkUserId = ClerkUser.id`.
- **Dry run/audit:** Read and classify only; zero DB writes.
- **Backfill/apply:** Write only mappings proven safe by deterministic rules.
- **Ambiguous:** More than one possible identity or otherwise insufficient evidence.

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

AUTH-006 must not proceed until unresolved identity ambiguity is zero for active users who need access, or an architect has explicitly approved a documented exception.

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
6. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Confirm the exact type/nullability/uniqueness of `User.clerkUserId` before writing tooling.

At the current repository state, `clerkUserId` is expected to be optional and unique. Verify this rather than trusting the ticket text blindly.

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

### Field ownership rule

This migration may change only the identity mapping field that was proven correct:

```text
User.clerkUserId
```

It must not change:

- role;
- status;
- organization;
- geography;
- password/password hash;
- email;
- name;
- lifecycle timestamps except an ordinary `updatedAt` automatically maintained by Prisma/DB.

## Required Audit Categories

The audit code must classify every relevant local user into exactly one understandable category. Use names equivalent to:

- `OK_MAPPED`
- `MISSING_LOCAL_CLERK_ID_EXACT_EMAIL_MATCH`
- `MISSING_LOCAL_CLERK_ID_NO_MATCH`
- `MISSING_LOCAL_CLERK_ID_AMBIGUOUS_MATCH`
- `LOCAL_CLERK_ID_NOT_FOUND_IN_CLERK`
- `CLERK_EMAIL_MISMATCH`
- `DUPLICATE_LOCAL_CLERK_ID`
- `EXCLUDED_NOT_USING_CLERK` only if such a category is explicitly supported by current product architecture

Do not hide ambiguous cases inside a generic warning bucket.

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

**Why:** The migration logic and conflict handling depend on actual constraints.

### Step 2 - Inspect current auth linking

In `jwt-auth.guard.ts`, locate the current branch that fills `clerkUserId` when it is missing.

Do not remove it in this ticket unless AUTH-006 is being implemented in the same PR. Its existence explains why some users may already be mapped and others may not.

### Step 3 - Inspect Clerk lookup capabilities in the installed SDK

Use the installed `@clerk/backend` version and existing code patterns. Confirm how to:

- fetch a Clerk user by exact ID;
- query users by email;
- read primary/verified email safely;
- handle pagination/results.

Do not invent raw HTTP calls if the SDK already supports the operation.

### Step 4 - Define pure classification logic before write logic

Where practical, separate the decision logic from network/DB calls. A classification function should receive enough normalized data to decide a category without performing writes.

**Why:** Pure classification logic is easier to unit-test exhaustively and makes the apply phase safer.

### Step 5 - Build a read-only audit mode

The audit command must:

1. connect to the configured PropertyOS database;
2. load the relevant local users;
3. initialize Clerk using `CLERK_SECRET_KEY`;
4. verify existing `clerkUserId` mappings by provider ID;
5. for missing IDs only, search Clerk by normalized local email;
6. classify the result;
7. print a summary;
8. perform no mutation.

### Step 6 - Make read-only behavior explicit in code

Do not merely rely on discipline. Structure the default path so it never reaches `prisma.user.update`.

If you use one script with `--apply`, set:

```text
applyMode = false
```

unless the explicit flag is present and valid.

A misspelled/unknown flag must not accidentally enable writes.

### Step 7 - Avoid leaking sensitive data

Do not commit generated production reports.

Console/report output should use local user ID and enough identifying information for the authorized operator to resolve a record, but must never print:

- passwords;
- Clerk secret keys;
- session tokens;
- bearer tokens;
- refresh tokens.

If email is printed, document that the command is operator-only output and do not send it to normal application logs or CI artifacts by default.

### Step 8 - Build explicit apply/backfill mode

For the safe category `MISSING_LOCAL_CLERK_ID_EXACT_EMAIL_MATCH`, apply mode may set:

`User.clerkUserId = exact Clerk user.id`

Apply mode must refuse ambiguous/no-match/broken-existing-mapping records.

### Step 9 - Protect against conflicting existing mappings

If local `clerkUserId` is already populated but differs from the Clerk identity discovered by email:

- do not overwrite;
- classify/report conflict;
- require manual identity review.

An existing ID is security-sensitive evidence, not an empty field to replace automatically.

### Step 10 - Make apply idempotent

Running apply twice must not create new changes after the first successful run.

If a local row already has the same `clerkUserId`, report it as already mapped.

### Step 11 - Add a confirmation summary

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

### Step 12 - Prefer bounded writes

Do not perform one opaque mass `updateMany` for all mappings. Apply deterministic per-user updates or a controlled transaction/batch that can report exactly which local user was mapped to which provider ID.

Do not print secrets; safe local/provider identifiers may be recorded in authorized operator output as needed.

### Step 13 - Add package commands

Use clear names such as:

```text
auth:audit-clerk-mappings
auth:backfill-clerk-mappings
```

Exact naming may follow existing package conventions.

The audit command must be obviously safe/read-only.

### Step 14 - Add tests before production use

Unit-test classification separately from Clerk/network calls. Integration-test apply behavior with disposable DB/mocked Clerk.

Detailed cases are below.

### Step 15 - Run locally against test fixtures

Do not begin with production.

Use local/test data containing at least:

- one correct mapping;
- one missing safe mapping;
- one no-match user;
- one ambiguous simulated case;
- one conflicting existing mapping.

Verify output categories and zero writes in audit mode.

### Step 16 - Production dry run

An authorized operator runs audit mode in the production environment.

Save only safe counts and remediation decisions in the ticket/PR. Do not commit a raw PII report.

### Step 17 - Resolve ambiguous records manually

Every ambiguous, broken, or no-match identity must be reviewed.

Do not proceed to strict Clerk-ID auth while unresolved active users still need access.

### Step 18 - Production apply

Only after review:

1. capture database backup/restore point according to hosting procedure;
2. run apply for safe mappings;
3. rerun audit;
4. confirm safe-backfill count becomes zero;
5. confirm no role/status values changed;
6. verify several representative users against Clerk manually.

## Checkpoint Before AUTH-006

- [ ] Audit tooling defaults to no writes.
- [ ] Apply mode is explicit.
- [ ] Exact mapping logic is deterministic.
- [ ] Ambiguous mappings are never auto-written.
- [ ] Conflicting existing mappings are never overwritten automatically.
- [ ] Production dry run completed by authorized operator.
- [ ] Production backfill completed for approved records.
- [ ] Remaining unresolved identities are documented.
- [ ] No role/status/tenant data changed.

## Detailed Test Specification

### TEST-AUTH005-01: Already-correct mapping is classified as `OK_MAPPED`

**Purpose:** Prove the tool recognizes healthy records and does not rewrite them.

**Level:** Unit classification + integration apply behavior.

**Setup:** Local user has `clerkUserId=user_123`; mocked Clerk returns `user_123` and expected normalized email.

**Action:** Run classification/audit, then apply mode if the test architecture allows.

**Expected Result:** Category `OK_MAPPED`; no update required.

**Required Assertions:** `prisma.user.update` is not called for this row; role/status unchanged.

**Why This Test Exists:** Idempotent migration tooling must leave already-correct data alone.

**If This Test Fails:** Check whether apply mode blindly rewrites all rows or classification ignores existing IDs.

### TEST-AUTH005-02: Missing ID plus exactly one exact email match becomes safe backfill

**Purpose:** Validate the only normal automatic backfill case.

**Level:** Unit + integration.

**Setup:** Local user has `clerkUserId=null`; exactly one mocked Clerk user has the same normalized verified email.

**Action:** Run audit first, then explicit apply.

**Expected Result:** Audit classifies as safe; audit writes zero rows; apply writes exactly this `clerkUserId`.

**Required Assertions:**

- dry run: zero update calls;
- apply: one update setting only `clerkUserId` (plus automatic DB metadata if unavoidable);
- role/status/org/email are not changed.

**Why This Test Exists:** It proves read/apply separation and field-level safety.

**If This Test Fails:** If audit writes, fix mode separation. If extra fields change, narrow the update data.

### TEST-AUTH005-03: Missing ID plus no Clerk match does not write

**Purpose:** Prevent the tool from inventing identities.

**Level:** Unit/integration.

**Setup:** Local unmapped user; Clerk email query returns zero users.

**Action:** Audit and attempt apply.

**Expected Result:** `MISSING_LOCAL_CLERK_ID_NO_MATCH`; apply refuses/skips.

**Required Assertions:** No local identity write; user stays unmapped; report count increments.

**Why This Test Exists:** No-match records require operator/user provisioning, not guesswork.

**If This Test Fails:** Remove any behavior that creates Clerk users or fabricates IDs automatically.

### TEST-AUTH005-04: Multiple Clerk email matches are ambiguous and never auto-linked

**Purpose:** Protect against choosing the first provider result.

**Level:** Unit/integration.

**Setup:** Local unmapped user; Clerk returns two records matching the normalized email query.

**Action:** Audit/apply.

**Expected Result:** Ambiguous category; zero writes.

**Required Assertions:** No update; no arbitrary result selection; ambiguous count increments.

**Why This Test Exists:** Identity misbinding can grant one person's PropertyOS access to another person's Clerk account.

**If This Test Fails:** Remove `results[0]`/first-match behavior and require human review.

### TEST-AUTH005-05: Existing local Clerk ID not found in provider is reported, not replaced

**Purpose:** Preserve evidence of a broken/conflicting mapping for manual investigation.

**Level:** Unit/integration.

**Setup:** Local user has `clerkUserId=user_old`; Clerk fetch by ID returns not found. Email search may return another user.

**Action:** Audit/apply.

**Expected Result:** Broken-existing-mapping category; no automatic overwrite.

**Required Assertions:** `user_old` remains in DB until reviewed; no new ID written.

**Why This Test Exists:** Automatically replacing a pre-existing provider ID based only on email could hide account takeover/data corruption.

**If This Test Fails:** Existing non-null mappings are being treated like empty ones. Fix classification precedence.

### TEST-AUTH005-06: Existing mapping with email mismatch is reported

**Purpose:** Surface suspicious identity inconsistencies without changing data.

**Level:** Unit.

**Setup:** Local `clerkUserId` resolves to Clerk user, but expected/local normalized email does not match provider email according to policy.

**Action:** Audit.

**Expected Result:** `CLERK_EMAIL_MISMATCH` or equivalent warning category.

**Required Assertions:** No automatic email or ID change.

**Why This Test Exists:** It creates evidence for a human decision while preserving the known provider-ID association.

**If This Test Fails:** Ensure existing ID verification checks provider existence and relevant email consistency.

### TEST-AUTH005-07: Apply mode is idempotent

**Purpose:** Ensure rerunning the migration is safe.

**Level:** Integration/service.

**Setup:** Start with one safe missing mapping.

**Action:** Run apply once, then run apply a second time.

**Expected Result:** First run writes the mapping; second run reports `OK_MAPPED` and performs no new change.

**Required Assertions:** Exactly one effective mapping write across both runs.

**Why This Test Exists:** Operators often rerun migration tooling after uncertainty/network interruption.

**If This Test Fails:** Classification after apply is not using current DB state or apply blindly rewrites.

### TEST-AUTH005-08: Dry run cannot write even when safe backfills exist

**Purpose:** Protect the default safety mode.

**Level:** Integration/unit with spies.

**Setup:** Several users including at least one safe backfill.

**Action:** Run command with no apply flag.

**Expected Result:** Summary shows safe-backfill count but DB remains unchanged.

**Required Assertions:** No `user.update`, `updateMany`, or transaction write for mapping.

**Why This Test Exists:** Production operators must be able to inspect impact before mutation.

**If This Test Fails:** Make dry-run control structural rather than relying on comments/operator discipline.

### TEST-AUTH005-09: Apply changes only `clerkUserId`

**Purpose:** Prevent migration from mutating authorization/lifecycle state.

**Level:** Integration/service.

**Setup:** Safe unmapped active WORKER with known role/status/org/email values.

**Action:** Apply backfill.

**Expected Result:** Only identity mapping changes.

**Required Assertions:** Role/status/org/email/password hash unchanged; `clerkUserId` equals expected provider ID.

**Why This Test Exists:** Migration scripts can accidentally reuse broad user update objects.

**If This Test Fails:** Narrow the update data immediately.

### TEST-AUTH005-10: Unknown CLI flag cannot enable apply mode

**Purpose:** Make accidental writes harder.

**Level:** Script/argument-parsing unit test where practical.

**Setup:** Invoke parser/command with malformed flag such as `--aply`.

**Action:** Run command logic.

**Expected Result:** Error/help/read-only behavior; never apply mode.

**Required Assertions:** Zero writes.

**Why This Test Exists:** Dangerous modes should require exact explicit intent.

**If This Test Fails:** Replace truthy/string-presence logic with explicit validated option parsing.

### TEST-AUTH005-11: Duplicate/conflicting provider ID detection blocks unsafe apply

**Purpose:** Prevent two local users from resolving to the same external identity.

**Level:** Unit/integration.

**Setup:** Simulate duplicate mapping state if test data/schema allows or model the conflict before update.

**Action:** Audit/apply.

**Expected Result:** Conflict reported; affected writes refused.

**Required Assertions:** No additional user is mapped to the conflicting provider ID.

**Why This Test Exists:** One external identity must not inherit two local permission sets.

**If This Test Fails:** Add conflict detection before applying.

## Manual Verification

After test-environment apply, select representative users:

- ADMIN;
- WORKER;
- RIDER;
- one recently invited user.

For each, confirm:

1. local `clerkUserId` exists where expected;
2. corresponding Clerk user exists;
3. expected email relationship is correct according to matching policy;
4. local role unchanged;
5. local status unchanged;
6. organization unchanged.

For production, record safe counts only in repository artifacts. Keep raw identity details in authorized operational channels.

## Failure Diagnosis Guide

### Dry run changes the database

Stop. Do not use the tool in production. Separate audit and apply paths so default execution cannot call updates.

### Many active users have no Clerk match

Do not weaken matching rules. This indicates provisioning/migration reality differs from the assumed architecture. Escalate before AUTH-006.

### Email query returns multiple results

Do not choose one. Classify ambiguous and resolve manually.

### Existing provider ID conflicts with email-discovered user

Do not overwrite. Existing mapping may represent the true identity or compromised/stale data; it requires review.

### Apply changes role/status

Stop and restore affected test data. The write payload is too broad.

### Clerk API rate limits/timeouts occur

Add safe retry/backoff only if consistent with SDK/project patterns, keep audit resumable/idempotent, and never convert network uncertainty into guessed mappings.

## PR Evidence Required

Include:

- script/files added;
- exact classification categories;
- proof default mode performs zero writes;
- unit/integration test results;
- local fixture audit summary;
- production dry-run **counts only** when executed;
- production apply counts and post-audit counts when executed;
- explicit statement that role/status/org were unchanged;
- unresolved identity count and architect decision reference if non-zero.

Never attach raw production identity reports or secrets.

## Acceptance Criteria

- [ ] Safe audit command exists.
- [ ] Safe explicit backfill mechanism exists.
- [ ] No ambiguous match is automatically linked.
- [ ] Existing conflicting mapping is never automatically overwritten.
- [ ] Applying changes only `clerkUserId` for approved safe records.
- [ ] Tooling is idempotent.
- [ ] Dry run is structurally read-only.
- [ ] Production audit/backfill is completed before AUTH-006 rollout.
- [ ] No raw production identity report is committed.

## Definition of Done

- [ ] Tool code complete.
- [ ] Detailed matching/apply tests pass.
- [ ] Typecheck/lint pass.
- [ ] Dry-run tested locally.
- [ ] Apply tested against disposable data.
- [ ] Production dry-run completed by authorized operator.
- [ ] Approved production backfill completed.
- [ ] Post-backfill audit completed.
- [ ] Required PR evidence recorded safely.
- [ ] Reviewer approves identity mapping quality.

## Rollback

If a wrong `clerkUserId` is discovered, stop strict-auth rollout. Correct only the affected mapping after verifying the real Clerk identity. Do not mass-clear all IDs unless an architect explicitly approves a recovery plan.

If an apply run partially succeeds, rerun the **audit first**, inspect categories, then continue only deterministic remaining mappings. Do not blindly rerun writes without re-auditing current state.

## Forbidden Shortcuts

Do not:

- match by name;
- match by phone number automatically;
- choose the first Clerk result when multiple exist;
- create Clerk users during the audit;
- activate inactive users;
- promote roles;
- overwrite an existing conflicting `clerkUserId` automatically;
- commit production PII reports;
- make apply mode the default;
- use a broad `updateMany` that cannot prove per-user mapping correctness.

## STOP - NEEDS ARCHITECT DECISION

Stop for any user where identity cannot be proven deterministically.

Also stop if:

- the schema/data allows actual duplicate `clerkUserId` values;
- normal users are intentionally shared across multiple Clerk identities;
- one Clerk identity is intentionally expected to map to multiple PropertyOS users;
- active production users are intentionally not represented in Clerk.

Those conditions change the identity architecture and must be resolved before AUTH-006.

## Completion Record

**Implemented By:**  
**Production Audit Run By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Dry-Run Users Scanned:**  
**Safe Backfills Applied:**  
**Unresolved Active Identities:**  
**Post-Apply Audit:** Pass / Fail  
**Notes / Unresolved Identities:**

---

## Expanded Architecture Discussion And Decision Record

### Decision 1: `clerkUserId` is the durable identity binding, email is only a controlled migration aid

**Decision:** Runtime identity will be based on Clerk's provider-issued subject. During this migration only, normalized verified email may be used to propose a mapping for an otherwise unmapped local user, and only when the match is exactly one-to-one.

**Reason:** The migration needs a bridge from the old email-based world to the stable provider-ID world. Email is useful evidence for this one-time controlled operation, but it is too mutable/ambiguous to remain a runtime identity join.

**Rejected alternative:** Continue matching by email indefinitely and merely store `clerkUserId` as optional metadata.

**Why rejected:** That leaves identity ambiguity in every login request and makes the stored provider ID non-authoritative.

### Decision 2: Migration is classify-first, write-second

**Decision:** Every record is classified in a read-only pass before apply mode is allowed to write safe mappings.

**Reason:** Identity migration is high-impact. Operators must see counts/conflicts before mutation, and reviewers need evidence that ambiguous records were isolated rather than silently handled.

**Rejected alternative:** Iterate through users and write immediately when a likely match is found.

**Why rejected:** Mid-run surprises can leave a partially guessed identity dataset with no clear review boundary.

### Decision 3: Ambiguity is a hard stop for that record

**Decision:** Zero matches, multiple matches, broken existing mappings, and conflicting evidence produce a report item, not an automatic repair.

**Reason:** Mapping the wrong external identity to a privileged local account is worse than temporarily blocking that user's login.

**Rejected alternative:** Use secondary fuzzy signals such as display name, phone, or first result ordering to break ties.

**Why rejected:** Those signals are not strong enough to prove identity ownership automatically.

### Decision 4: Existing non-null mappings are evidence, not disposable hints

**Decision:** A populated `clerkUserId` is verified against Clerk. If it conflicts with email-derived evidence, do not overwrite automatically.

**Reason:** A conflict may indicate stale data, account replacement, provider-environment mismatch, or a security issue. Automatic overwrite would destroy evidence.

## Facts, Assumptions, And Unknowns

### Facts

- `User.clerkUserId` is currently modeled as optional and unique in Prisma; verify this again before implementation.
- The existing auth path can link missing Clerk IDs during login.
- AUTH-006 requires trustworthy mappings before switching to strict ID lookup.

### Assumptions to verify

- Each active Clerk-authenticated PropertyOS user should map to exactly one Clerk user.
- Verified email is sufficiently trustworthy as a migration aid only when exactly one Clerk result exists.
- The operator running production audit/apply has access to the correct Clerk instance and database environment.

### Unknowns that must be measured, not guessed

- Count of active users missing `clerkUserId`.
- Count of broken provider IDs.
- Count of ambiguous/no-match cases.
- Whether any production user intentionally shares identities or uses a non-Clerk auth path.

The audit exists to convert these unknowns into measured categories before AUTH-006.

## Intern Execution Sequence - No Improvisation

### Phase A - Repository reconnaissance

1. Read `User` schema and record the exact `clerkUserId` constraint.
2. Read the current guard linking branch.
3. Read `UsersService.invite()` to understand how new users get provider IDs.
4. Read existing scripts and package command conventions.
5. Confirm Clerk SDK version and existing client usage.
6. Run baseline typecheck/tests.
7. Stop if the current repository already uses a different identity provider model than this ticket describes.

### Phase B - Build pure classification before database writes

1. Define input shapes for local user and minimal Clerk identity evidence.
2. Implement categories without any Prisma update call.
3. Unit-test every category.
4. Add explicit conflict precedence: an existing non-null provider ID must be verified first.
5. Ensure multiple email matches cannot reach a safe-write category.
6. Ensure unknown/provider API errors are distinguishable from confirmed no-match results when practical.

### Phase C - Build dry-run orchestration

1. Load relevant local users.
2. Resolve/verify Clerk data.
3. Feed each record to classification.
4. Aggregate counts.
5. Print a clear read-only summary.
6. Spy/assert that no write method is reachable in default mode.
7. Run this only on disposable/test data first.

### Phase D - Add explicit apply mode

1. Require an exact explicit flag or separate command.
2. Re-run/reuse classification immediately before each write so stale assumptions are not blindly applied.
3. Update only `clerkUserId`.
4. Prefer bounded per-user writes or controlled small batches.
5. Record safe identifiers/counts for operator verification.
6. Never apply ambiguous/conflicting categories.

### Phase E - Failure and resume behavior

1. Simulate a provider timeout halfway through a multi-user run.
2. Confirm completed safe writes remain understandable and the tool exits non-successfully or reports partial completion clearly.
3. Rerun **audit**, not blind apply.
4. Confirm already-applied records become `OK_MAPPED` and remaining safe records are still classified deterministically.
5. Confirm rerun does not rewrite correct mappings.

### Phase F - Production procedure

1. Verify environment names/IDs so production DB is paired with production Clerk instance.
2. Capture a DB backup/restore point.
3. Run dry-run only.
4. Record safe category counts.
5. Resolve every active-user ambiguity manually.
6. Run explicit apply for approved safe records.
7. Rerun audit.
8. Confirm unresolved active identities meet the go/no-go requirement for AUTH-006.
9. Sample-check representative ADMIN/WORKER/RIDER mappings.
10. Store raw identity details only in an authorized operational channel, never the repository.

## Additional Test Cases And Explanations

### TEST-AUTH005-12: Provider timeout is not classified as confirmed no-match

**Purpose:** Prevent network uncertainty from being mistaken for proof that a Clerk account does not exist.

**Level:** Unit/integration.

**Setup:** Local unmapped user. Clerk lookup throws a timeout/transient error.

**Action:** Run audit.

**Expected Result:** The record is reported as an operational/provider error or unresolved state, not `NO_MATCH`, and no write occurs.

**Required Assertions:** Zero mapping writes; command exposes a non-success/partial status appropriate to implementation.

**External-Service Assertions:** The timeout is handled without leaking secrets/raw headers.

**Why This Test Exists:** A failed API call is not evidence of absence.

**False Positive To Avoid:** Mocking Clerk to return an empty list instead of throwing, which tests a different condition.

**If This Test Fails:** Separate provider error handling from valid empty-result classification.

### TEST-AUTH005-13: Partial apply followed by audit produces a safe resumable state

**Purpose:** Prove operators can recover from interruption without blindly repeating writes.

**Level:** Integration.

**Setup:** Three safe mappings. Configure the second/third operation to fail after at least one successful update.

**Action:** Run apply, observe partial failure, then run audit again.

**Expected Result:** Applied rows are `OK_MAPPED`; unapplied rows remain safe-backfill candidates; no role/status drift occurs.

**Required Assertions:** No duplicate mapping; no overwrite of completed records; summary accurately reflects current DB state.

**Why This Test Exists:** Production scripts can be interrupted. Recovery must be based on current state, not assumed all-or-nothing execution.

**False Positive To Avoid:** Resetting the DB between apply and audit, which does not test resume behavior.

**If This Test Fails:** Make apply idempotent and classification derive from current persisted state.

### TEST-AUTH005-14: Wrong Clerk environment is detectable before apply

**Purpose:** Reduce the risk of pairing production local users with test/staging Clerk identities.

**Level:** Manual/integration guardrail.

**Setup:** Use a deliberately mismatched test environment if safely reproducible.

**Action:** Run dry-run.

**Expected Result:** Abnormally high missing/broken counts or an explicit environment identifier check prevents apply. Do not continue to write based on a suspicious result set.

**Required Assertions:** Apply is not automatically triggered after a failed/suspicious audit.

**Why This Test Exists:** Correct credentials to the wrong provider instance can produce deterministic but completely wrong mapping conclusions.

**False Positive To Avoid:** Assuming a non-error API response proves the environment is correct.

**If This Test Fails:** Add an operator-visible environment check or mandatory pre-apply confirmation based on known safe identifiers/counts.

## Observability And Audit Expectations

The migration tool should produce an operator summary that is useful without becoming a permanent PII dump. At minimum record counts by classification, apply mode vs dry-run, number of successful writes, number of skipped/conflicting records, and whether the run completed cleanly.

Do not emit Clerk secret keys, auth headers, session tokens, passwords, refresh tokens, or raw full provider objects. If email is shown for manual resolution, make it clear this output is restricted operational data and must not be committed to Git or uploaded to CI artifacts.

## Reviewer Walkthrough

1. Verify the classification logic before reviewing orchestration.
2. Confirm dry-run code has no path to `prisma.user.update`.
3. Confirm apply only accepts safe one-to-one categories.
4. Confirm existing non-null mappings are never silently overwritten.
5. Review timeout/ambiguity/partial-failure tests.
6. Review the exact update payload and confirm only `clerkUserId` changes.
7. Confirm reruns are idempotent.
8. Confirm production evidence contains counts, not raw identity dumps.
9. Confirm unresolved active-user ambiguity is zero or has a documented architect decision before AUTH-006.

## Handoff Notes

After AUTH-005 completes, AUTH-006 may assume:

- active users expected to use Clerk have reviewed provider-ID mappings;
- ambiguous/no-match records are explicitly known rather than hidden by login-time linking;
- `clerkUserId` uniqueness/conflicts have been checked;
- operators have a repeatable audit command they can rerun before/after rollout;
- request-time email fallback is no longer needed as a migration crutch.

AUTH-005 does not itself switch runtime authentication. That is deliberately deferred to AUTH-006 so the data migration can be validated independently from the code-path change.
