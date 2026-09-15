# PropertyOS Detailed Ticket Standard

This file defines the minimum detail level for every execution ticket under `docs/tickets/Pending/` and `docs/tickets/Completed/`.

A ticket is written for an engineer who can follow TypeScript/NestJS/Prisma code but is **not expected to design architecture, infer hidden requirements, or decide security behavior**.

## Required Explanation Level

Every ticket must explain:

1. **What is wrong now** in plain English.
2. **Why it matters** to the product/security/reliability of PropertyOS.
3. **What the correct end state looks like** before implementation details.
4. **Which files own the behavior** and why those files are involved.
5. **What must not change** so the engineer does not accidentally broaden the task.
6. **Every implementation step in order**, including what to inspect before editing and what outcome proves the step worked.
7. **Every required test case** using the structure below.
8. **How to interpret a failed test** instead of simply saying “fix the test.”
9. **What evidence belongs in the PR** so a reviewer can verify the work quickly.
10. **When to stop and escalate** rather than inventing a solution.

## Required Test Case Format

Every security/business-critical test must state all of the following:

### TEST-XXX: Name

**Purpose:** What regression or business rule this test protects.

**Level:** Unit / Service / Integration / E2E / Manual.

**Setup:** Exact starting state, mocks, users, roles, statuses, database records, environment variables, or provider responses required.

**Action:** The exact method call or HTTP action performed.

**Expected Result:** The return value/status/error the engineer should observe.

**Required Assertions:** Specific values/calls/writes that must or must not occur. When relevant, include negative assertions such as `prisma.user.create` was not called.

**Why This Test Exists:** Explain the bug/regression the test would catch.

**If This Test Fails:** Explain the most likely categories of implementation mistake to inspect before changing the assertion.

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
- failure of an external dependency does not violate local security invariants.

Do not change a correct security assertion simply to make a failing implementation pass.

## Step Format

Important implementation steps should answer four questions:

1. **Where?** File/function/module to inspect or modify.
2. **Do what?** The concrete change.
3. **Why?** The architecture/business reason.
4. **Verify how?** The immediate check before moving on.

## Required PR Evidence

Each ticket should tell the engineer what proof to put in the PR description. Depending on the task this may include:

- files changed;
- relevant before/after behavior;
- commands run and results;
- test names/results;
- migration dry-run counts;
- screenshots for UI work;
- safe audit counts;
- manual verification result;
- known limitations or `STOP` decisions.

Never include passwords, tokens, production connection strings, raw PII exports, Clerk secrets, or other credentials.

## Completion Principle

The ticket is complete when another engineer can independently verify the intended behavior from code, tests, and evidence without relying on the implementer's memory or verbal explanation.
