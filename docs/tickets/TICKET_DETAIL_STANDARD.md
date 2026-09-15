# PropertyOS Detailed Ticket Standard

This file defines the minimum detail level for every execution ticket under `docs/tickets/Pending/` and `docs/tickets/Completed/`.

A ticket is written for an engineer who can follow TypeScript/NestJS/Prisma/React code but is **not expected to design architecture, infer hidden requirements, decide security behavior, invent test strategy, or guess what the reviewer meant**.

The ticket must be executable as a runbook. A junior engineer should be able to start at the top, follow the steps in order, stop at explicit escalation points, and finish with enough evidence that another engineer can independently verify the work.

## Core Principle

A good ticket answers all of these questions without requiring a meeting:

1. What is wrong now?
2. Why does it matter?
3. What should the system do instead?
4. Why was this target architecture chosen?
5. What alternatives were considered and rejected?
6. Which files own the behavior?
7. Which files must not be changed?
8. What must the engineer inspect before editing?
9. What exact implementation steps should be followed?
10. Why does each important step exist?
11. How does the engineer verify each step before continuing?
12. What tests must be written?
13. Why does each test exist?
14. What exact fixtures, mocks, DB state, and environment state are required?
15. What must *not* happen during the test?
16. How should a failed test be diagnosed?
17. What manual verification is still required after automated tests pass?
18. What logs/audit/observability evidence should exist?
19. What evidence belongs in the PR?
20. When must the engineer stop and ask an architect/reviewer instead of guessing?
21. What exactly makes the ticket Completed rather than merely coded?

## Required Sections In Every Ticket

Every execution ticket must contain, where applicable:

### 1. Objective

One clear engineering outcome. Avoid combining unrelated outcomes.

### 2. Junior Engineer Orientation

Explain the task in plain English. Define unfamiliar terms. State the mental model the engineer should use before reading implementation details.

### 3. Why This Exists

Explain the product/security/reliability problem and the concrete failure mode the ticket prevents.

### 4. Current Behavior

Describe the current control flow, current ownership, current mutations, current API/DB behavior, and any known unsafe edge case.

### 5. Target Behavior

Describe the intended end state independently of the implementation. Include a simple control-flow diagram when useful.

### 6. Architecture Decision Record

Capture the important discussion that led to the chosen approach. This section should explicitly answer:

- What design are we choosing?
- Why are we choosing it?
- What tempting alternatives are we *not* choosing?
- What future ticket owns intentionally deferred work?
- What invariant must remain true after future refactors?

Do not merely say "best practice." Explain the concrete reason for PropertyOS.

### 7. Facts, Assumptions, And Unknowns

Separate what is known from what must be verified.

Use:

- **Fact:** supported directly by current repository behavior/schema/config.
- **Assumption:** expected to be true but must be verified before destructive/security-sensitive changes.
- **Unknown:** requires production/account/operator information and must not be guessed.

### 8. Scope And Non-Goals

List files expected to change, files to inspect, and explicitly out-of-scope work.

### 9. Required Reading

List exact files/functions/modules and explain what the engineer should learn from each one.

### 10. Pre-Flight Reconnaissance

Before editing, require the engineer to:

- run baseline commands;
- search all references to the target primitive/function/env var/model field;
- record relevant baseline DB/test behavior;
- identify existing tests that already cover the code path;
- identify dependencies/blockers;
- verify the ticket still matches the repository.

The engineer must stop if repository behavior has materially diverged from the ticket.

### 11. Architecture Contract / Invariants

State rules that must always remain true. Prefer explicit statements such as:

```text
authentication must not create users
```

or:

```text
inactive local status must deny access even if the identity provider is available
```

### 12. Step-By-Step Implementation Plan

Important steps must answer four questions:

1. **Where?** File/function/module.
2. **Do what?** Concrete change.
3. **Why?** Architecture/business reason.
4. **Verify how?** Immediate checkpoint before continuing.

Break work into phases when the task spans data, service, controller, provider, tests, and deployment.

### 13. Checkpoints

Add intermediate stop points. A junior engineer should not make 20 edits and discover at the end that step 3 broke the system.

### 14. Test Data / Fixture Design

For security or lifecycle tickets, define test actors and starting state. Example:

- Admin A: active ADMIN
- Admin B: active ADMIN
- Worker C: active WORKER
- Suspended User D
- Unprovisioned Clerk Identity E

Use fake test data only. Never use real personal emails, tokens, IDs, passwords, or production exports in fixtures.

### 15. Detailed Test Specification

Every required security/business-critical test must use the structure below.

### 16. Manual Verification

State exact manual steps that prove the real workflow, including before/after DB state when relevant.

### 17. Failure Diagnosis Guide

Explain common failure patterns and what to inspect first. Do not tell the engineer merely to "debug it."

### 18. Observability / Audit Expectations

If the change affects access, state, external providers, or security decisions, define which events/logs/metrics should exist and which sensitive values must not be logged.

### 19. PR Evidence Required

Tell the engineer exactly what proof to put in the PR description.

### 20. Reviewer Walkthrough

Give the reviewer a short ordered verification path: which files to inspect first, which invariant to check, which tests are most important, and which shortcuts to look for.

### 21. Acceptance Criteria

Behavior-focused checklist.

### 22. Definition Of Done

Engineering-quality gate: code, tests, lint, typecheck, build, migrations, docs, manual validation, review, and unresolved STOP items.

### 23. Rollback / Recovery

Explain how to back out safely. Security tickets must not recommend restoring the unsafe behavior as the normal recovery strategy.

### 24. Forbidden Shortcuts

List attractive but incorrect ways to make the ticket appear complete.

### 25. STOP - NEEDS ARCHITECT DECISION

Explicit conditions where the engineer must stop.

### 26. Handoff Notes

State what the next dependent ticket may assume after this ticket is complete and what remains intentionally unresolved.

### 27. Completion Record

Record implementer, reviewer, PR, final commit, completion date, tests, manual verification, and notes.

## Required Test Case Format

Every security/business-critical test must state all of the following:

### TEST-XXX: Name

**Purpose:** What regression or business rule this test protects.

**Level:** Unit / Service / Integration / E2E / Manual / Static verification.

**Setup:** Exact starting state, mocks, users, roles, statuses, database records, environment variables, provider responses, clocks, or failure injection required.

**Action:** Exact method call or HTTP/user action.

**Expected Result:** Return value, HTTP status, thrown exception, emitted audit record, or visible UI state.

**Required Assertions:** Specific values/calls/writes that must or must not occur. Include negative assertions where security depends on absence of behavior.

**Database Assertions:** State before/after expectations when the path can mutate state.

**External-Service Assertions:** State whether Clerk/Redis/S3/etc. must be called, must not be called, or may fail without weakening local security.

**Why This Test Exists:** Explain the exact regression it catches.

**False Positive To Avoid:** Explain how a badly written test could pass without actually proving the requirement.

**If This Test Fails:** Explain likely implementation mistakes to inspect before changing the assertion.

## Test Categories To Consider

Not every ticket needs every category, but the author must consciously consider:

- happy path;
- unauthorized caller;
- unauthenticated caller;
- missing local record;
- inactive record;
- suspended record;
- role boundary;
- tenant/geography boundary;
- duplicate/repeated request;
- stale data;
- invalid input;
- missing required configuration;
- provider timeout/failure;
- database failure/transaction rollback;
- race/concurrency condition;
- restart/persistence behavior;
- regression of current legitimate behavior;
- forbidden write did not occur;
- audit event correctness;
- log redaction/no secret leakage;
- idempotency;
- rollback/recovery path.

## Test Quality Rules

A test is not complete merely because it returns the expected HTTP status.

Where relevant, tests must also verify:

- database state before and after;
- forbidden writes did not happen;
- role/status/tenant/geography did not change unexpectedly;
- external services were or were not called as intended;
- audit records contain correct actor/target/before/after state;
- secrets/PII are absent from logs;
- repeated execution is idempotent;
- failure of an external dependency does not violate local security invariants;
- application restart does not resurrect forbidden state;
- test setup actually reaches the intended branch.

Do not change a correct security assertion simply to make a failing implementation pass.

## Step Quality Rules

Do not write:

> Update the service.

Write:

> Open `XService.method()`. Identify the current mutation. Add the invariant check before the mutation. Explain why it must occur before the write. Add a test that spies on the write and proves the write is never reached when the invariant fails. Run the focused test before continuing.

Every step should reduce ambiguity rather than simply describe the desired final code.

## Discussion / Decision Quality Rules

The ticket should preserve important reasoning so future engineers do not reopen already-decided questions without context.

For each important architectural choice, record:

- **Decision**
- **Reason**
- **Rejected alternative**
- **Why rejected**
- **Future reconsideration trigger**, if any

Example:

```text
Decision: PropertyOS local status remains authoritative for access denial.
Reason: Deactivation must take effect even if Clerk is unavailable.
Rejected: Disable only in Clerk and leave local user active.
Why rejected: A provider failure or stale session could violate the local access decision.
```

## Required PR Evidence

Each ticket should tell the engineer what proof to put in the PR description. Depending on the task this may include:

- files changed;
- before/after control flow;
- commands run and results;
- test names/results;
- screenshots for UI work;
- migration dry-run counts;
- before/after safe record counts;
- mock/provider failure result;
- repository search proving removed primitives are gone;
- manual verification result;
- audit/log evidence without sensitive data;
- known limitations;
- resolved architect decisions;
- dependent tickets now unblocked.

Never include passwords, tokens, production connection strings, raw PII exports, Clerk secrets, authorization headers, session cookies, or other credentials.

## Reviewer Standard

A reviewer should be able to answer all of the following from the ticket + PR:

1. What security/business invariant was changed?
2. Where is that invariant enforced?
3. Which test proves the positive path?
4. Which test proves the negative path?
5. Which test proves no forbidden write occurred?
6. Which test protects against the most likely regression?
7. What happens if an external dependency fails?
8. What happens after an application restart?
9. What was intentionally left for another ticket?
10. How can the change be recovered/rolled back safely?

If the reviewer cannot answer those questions, the ticket/implementation is not yet self-contained enough.

## Completion Principle

The ticket is complete when another engineer can independently verify the intended behavior from code, tests, repository state, and PR evidence without relying on the implementer's memory, a Slack message, or verbal explanation.

"Code written" is not the same thing as "ticket completed."
