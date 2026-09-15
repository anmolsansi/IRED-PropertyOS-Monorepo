# PropertyOS Engineering Ticket System

This directory contains self-contained engineering execution tickets for IRED PropertyOS.

The purpose of a ticket is to let a junior engineer or intern complete one engineering outcome without inventing architecture, guessing requirements, or deciding security/business behavior on their own.

A ticket is not a short Jira summary. It is an **architecture-approved execution runbook for one engineering outcome**.

## Detail Standard

Every ticket must follow:

`docs/tickets/TICKET_DETAIL_STANDARD.md`

That file defines the minimum explanation and testing depth.

A ticket is not considered ready to hand to a junior engineer merely because it contains implementation bullets. It must explain enough context that the engineer understands what each important step is protecting and how to prove it worked.

## What Every Execution Ticket Must Contain

As applicable to the task, a complete ticket should contain:

- objective in plain English;
- junior-engineer orientation / mental model;
- why the task exists;
- current behavior/problem;
- target behavior/architecture;
- scope and explicit out-of-scope boundaries;
- expected files to inspect/modify;
- required reading;
- prerequisites/dependencies;
- architecture/business/security invariants;
- ordered implementation steps;
- explanation of **why** important steps are needed;
- immediate verification/checkpoints between groups of changes;
- detailed test specification;
- manual verification;
- failure diagnosis/troubleshooting guide;
- PR evidence required;
- acceptance criteria;
- Definition of Done;
- rollback/recovery guidance;
- forbidden shortcuts;
- `STOP - NEEDS ARCHITECT DECISION` conditions;
- completion record.

Not every tiny task requires every heading, but deleting important sections simply to make a ticket shorter is not acceptable.

## Required Test Case Format

For business/security-critical behavior, a ticket must not say only:

```text
Test inactive user -> should fail.
```

Each meaningful test case must explain:

```text
Purpose
Level
Setup
Action
Expected Result
Required Assertions
Why This Test Exists
If This Test Fails
```

### Example of the expected thinking level

Weak test instruction:

```text
Test that an inactive admin cannot login.
```

Required level:

```text
Purpose:
Prove a deliberately deactivated administrator cannot regain access merely by authenticating.

Setup:
Create/mock an existing ADMIN with status=inactive and a known deactivatedAt value.
Use a valid mapped Clerk identity.

Action:
Attempt a protected request.

Expected Result:
Authentication is rejected.

Required Assertions:
- status remains inactive;
- role remains ADMIN, unchanged;
- deactivatedAt remains unchanged;
- no user update sets status=active;
- no privilege mutation occurs.

Why This Test Exists:
A response-only test could pass even if the account was silently reactivated before a later error.

If This Test Fails:
Inspect request-time authentication for role/status update or recovery behavior. Do not weaken the test to permit automatic reactivation.
```

This is the standard expected for future PropertyOS execution tickets.

## Testing Principle: Verify State, Not Only Status Codes

Where relevant, tests must prove both the visible result and the side effects.

For example, a security test that expects HTTP 401/403 should also consider whether it needs to verify:

- database row did not change;
- user/admin count did not change;
- role/status did not change;
- organization/geography did not change;
- no forbidden Prisma write occurred;
- external provider was/was not called;
- audit row is correct;
- secrets/PII are absent from logs;
- repeated execution is idempotent.

A request returning the correct status code does not prove the system state is safe.

## Implementation-Step Standard

Important implementation steps should answer four questions:

1. **Where?** Which file/function/module is involved?
2. **Do what?** What exact change or inspection is required?
3. **Why?** What architecture/business/security rule does it protect?
4. **Verify how?** What immediate result proves the step was completed correctly?

Junior engineers should not have to infer the intended architecture from a one-line instruction.

## Folder Rules

- `Pending/` contains every ticket that still has any unfinished work.
- `Completed/` contains only tickets whose Definition of Done is fully satisfied and reviewed.
- Do not create extra lifecycle folders such as `In Progress`, `Blocked`, or `Review` unless the project owner explicitly changes this workflow.
- A ticket can say `Status: In Progress` or `Status: Blocked` in its metadata while remaining physically inside `Pending/`.
- Coding finished does **not** mean ticket completed.

## Required Ticket Workflow

Every engineer must execute tickets in this order:

1. Read the entire ticket before changing code.
2. Read `TICKET_DETAIL_STANDARD.md` if unfamiliar with the system.
3. Read every repository file listed under **Required Reading**.
4. Run the baseline commands listed in the ticket.
5. Confirm the ticket's described current behavior still matches the repository.
6. If the repository no longer matches materially, stop and escalate instead of guessing.
7. Follow implementation steps in numbered order.
8. Perform each checkpoint/verification before continuing.
9. Implement every applicable detailed test case.
10. When a test fails, use **If This Test Fails** guidance before changing assertions.
11. Fix product behavior rather than weakening a correct security/business assertion.
12. Run all validation commands listed in the ticket.
13. Perform manual verification.
14. Collect the **PR Evidence Required**.
15. Check every Acceptance Criteria item.
16. Check every Definition of Done item.
17. Fill in the Completion Record with real results.
18. Get the required review.
19. Move the file from `Pending/` to `Completed/` in the same PR that completes the work.

## STOP Means STOP

When a ticket contains `STOP - NEEDS ARCHITECT DECISION`, the engineer must not invent a solution. Record what was discovered and escalate to the reviewer/project owner.

Examples of things a junior engineer must not decide alone:

- changing authentication authority;
- weakening authorization to make tests pass;
- creating a new privileged fallback;
- changing tenant boundaries;
- destructive production-data migrations;
- changing externally visible API contracts not specified by the ticket;
- silently changing role/lifecycle semantics;
- changing audit reliability guarantees;
- inventing a new provider fallback;
- deleting/relaxing failing security tests instead of fixing behavior.

## Standard Ticket Status Values

Use only:

- `Pending`
- `In Progress`
- `Blocked`
- `Completed`

The first three remain in `Pending/`. Only `Completed` belongs in `Completed/`.

## Completion Rule

A ticket may move to `Completed/` only when all applicable items are true:

- implementation is complete;
- required detailed tests are implemented;
- unit tests pass;
- integration tests pass when required;
- E2E tests pass when required;
- lint passes;
- typecheck passes;
- build passes;
- database migration/backfill requirements are complete;
- security/business invariants are verified;
- manual validation is complete;
- documentation/configuration is updated;
- required PR evidence is present;
- no unresolved `STOP` item remains;
- reviewer has approved the work;
- completion metadata contains real values/results.

## PR Evidence Principle

The next reviewer should not need a private conversation with the implementer to know whether the ticket was completed correctly.

Depending on the task, PR evidence may include:

- files changed;
- before/after behavior;
- commands executed and results;
- test names/results;
- migration dry-run/apply counts;
- safe before/after DB assertions;
- screenshots for UI behavior;
- manual verification results;
- known limitations;
- architect-decision references.

Never put production passwords, tokens, secret keys, connection strings, raw PII exports, or live session values in PR evidence.

## Ticket Naming

Use:

`<AREA>-<NUMBER>-<short-kebab-description>.md`

Examples:

- `AUTH-001-remove-privileged-auth-fallback.md`
- `MEDIA-001-real-media-upload-pipeline.md`
- `TENANT-001-default-deny-org-isolation.md`

Ticket IDs never change after creation.

## Engineer Behavior Rules

- Make the smallest change that satisfies the ticket.
- Do not redesign unrelated code.
- Do not add libraries unless the ticket explicitly permits it or reviewer approves it.
- Do not move business rules into controllers simply because it is easier.
- Do not disable TypeScript, lint, validation, auth, or tests to make a task pass.
- Do not commit passwords, tokens, private keys, production connection strings, or real secrets.
- Do not log passwords, access tokens, refresh tokens, session cookies, OTPs, or authorization headers.
- Preserve existing API behavior unless ticket explicitly changes it.
- If a ticket depends on another ticket, complete the dependency first unless a safe parallel path is explicitly documented.
- Do not replace architecture with a shortcut just because a test is difficult to write.
- Do not treat a passing HTTP response/status as sufficient when state/side effects also matter.

## Current Ticket Pack: Authentication Hardening

This pack removes the privileged authentication fallback and replaces it with explicit identity provisioning, lifecycle controls, testing, auditing, operational safeguards, and a production rollout procedure.

| Ticket | Priority | Purpose |
|---|---:|---|
| `AUTH-001` | P0 | Remove hardcoded privileged auth fallback |
| `AUTH-002` | P0 | Remove login-time admin auto-provisioning |
| `AUTH-003` | P0 | Remove login-time auto-reactivation |
| `AUTH-004` | P0 | Make privilege state immutable during authentication |
| `AUTH-005` | P0 | Audit and backfill Clerk identity mappings |
| `AUTH-006` | P0 | Enforce Clerk-ID identity mapping |
| `AUTH-007` | P0 | Remove privileged defaults/admin creation from normal seed |
| `AUTH-008` | P0 | Build one-time first-admin bootstrap |
| `AUTH-009` | P0 | Prevent final active-admin lockout |
| `AUTH-010` | P1 | Make suspension/deactivation/reactivation explicit |
| `AUTH-011` | P1 | Revoke Clerk sessions when local access is removed |
| `AUTH-012` | P1 | Add semantic audit events for privilege/status changes |
| `AUTH-013` | P1 | Remove obsolete master-admin runtime configuration |
| `AUTH-014` | P1 | Remove unnecessary PII from auth logs |
| `AUTH-015` | P0 | Add comprehensive JwtAuthGuard regression tests |
| `AUTH-016` | P0 | Add comprehensive user lifecycle/security service tests |
| `AUTH-017` | P0 | Add Clerk-mode auth-hardening E2E regression suite |
| `AUTH-018` | P1 | Create and execute production deployment runbook |

## Recommended Authentication Execution Order

Safest default sequence:

```text
AUTH-001
  -> AUTH-002
  -> AUTH-003
  -> AUTH-004
  -> AUTH-007
  -> AUTH-008
  -> AUTH-005
  -> AUTH-006
  -> AUTH-009
  -> AUTH-010
  -> AUTH-011
  -> AUTH-012
  -> AUTH-014
  -> AUTH-015
  -> AUTH-016
  -> AUTH-017
  -> AUTH-013
  -> AUTH-018
```

Notes:

- `AUTH-007`/`AUTH-008` may be developed alongside some guard work, but safe bootstrap/recovery must exist before old privileged recovery is considered fully removable in production.
- `AUTH-005` production audit/backfill must complete before `AUTH-006` strict Clerk-ID mapping is deployed.
- `AUTH-013` live environment cleanup occurs after hardened auth is proven safely.
- `AUTH-018` is the final rollout gate and is not complete merely because its runbook file was written.

## Authentication Hardening Completion Gate

The workstream is complete only when:

- all 18 AUTH tickets are in `Completed/` or explicitly approved not-applicable;
- authentication performs no user creation, privilege mutation, identity linking, or reactivation;
- production identity uses verified `clerkUserId` mapping;
- last-admin protection is live;
- lifecycle/session/audit behavior is live;
- detailed unit/service/E2E suites pass;
- production rollout/config cleanup in AUTH-018 is complete;
- required production evidence is recorded safely.

## Completion Record

Every ticket contains its own Completion Record. Before moving a ticket, fill it with real values such as:

- Implemented By
- Reviewed By
- PR
- Final Commit
- Completed Date
- test results/counts where requested
- manual verification result
- operational evidence where requested
- Notes

Never mark checkboxes complete before corresponding work has actually been verified.