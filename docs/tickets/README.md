# PropertyOS Engineering Ticket System

This directory contains self-contained engineering execution tickets for IRED PropertyOS.

The purpose of a ticket is to let a junior engineer or intern complete one engineering outcome without inventing architecture, guessing requirements, or deciding security behavior on their own.

## Folder Rules

- `Pending/` contains every ticket that still has any unfinished work.
- `Completed/` contains only tickets whose Definition of Done is fully satisfied and reviewed.
- Do not create extra lifecycle folders such as `In Progress`, `Blocked`, or `Review` unless the project owner explicitly changes this workflow.
- A ticket can say `Status: In Progress` or `Status: Blocked` in its metadata while remaining physically inside `Pending/`.
- Coding finished does **not** mean ticket completed.

## Required Ticket Workflow

Every engineer must execute tickets in this order:

1. Read the entire ticket before changing code.
2. Read every repository file listed under **Required Reading**.
3. Run the baseline commands listed in the ticket.
4. Confirm the ticket's **Current Behavior** still matches the repository.
5. If the repository no longer matches the ticket, stop and escalate instead of guessing.
6. Follow implementation steps in numbered order.
7. Complete each checkpoint before moving to the next section.
8. Add or update all tests required by the ticket.
9. Run all validation commands listed in the ticket.
10. Perform the manual verification steps.
11. Check every Acceptance Criteria item.
12. Check every Definition of Done item.
13. Fill in the Completion Record.
14. Get the required review.
15. Move the file from `Pending/` to `Completed/` in the same PR that completes the work.

## STOP Means STOP

When a ticket contains a section marked `STOP - NEEDS ARCHITECT DECISION`, the engineer must not invent a solution. Record what was discovered and escalate to the reviewer/project owner.

Examples of things an intern must not decide alone:

- changing the authentication authority;
- weakening authorization to make tests pass;
- creating a new privileged fallback;
- changing tenant boundaries;
- destructive production-data migrations;
- changing externally visible API contracts not specified by the ticket;
- silently changing role semantics;
- deleting failing tests instead of fixing behavior.

## Standard Ticket Status Values

Use only:

- `Pending`
- `In Progress`
- `Blocked`
- `Completed`

The first three remain in `Pending/`. Only `Completed` belongs in `Completed/`.

## Completion Rule

A ticket may move to `Completed/` only when all applicable items below are true:

- implementation is complete;
- unit tests pass;
- integration tests pass when required;
- end-to-end tests pass when required;
- lint passes;
- typecheck passes;
- build passes;
- database migration/backfill requirements are complete;
- security requirements are verified;
- manual validation is complete;
- documentation/configuration is updated;
- no unresolved `STOP` item remains;
- reviewer has approved the work;
- completion metadata is filled in.

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
- Do not add libraries unless the ticket explicitly permits it or the reviewer approves it.
- Do not move business rules into controllers just because it is easier.
- Do not disable TypeScript, lint, validation, auth, or tests to make the task pass.
- Do not commit passwords, tokens, private keys, production connection strings, or real secrets.
- Do not log passwords, access tokens, refresh tokens, session cookies, OTPs, or authorization headers.
- Preserve existing API behavior unless the ticket explicitly changes it.
- If a ticket depends on another ticket, complete the dependency first unless the ticket explicitly describes a safe parallel path.

## Current Ticket Pack: Authentication Hardening

This pack removes the privileged authentication fallback and replaces it with explicit identity provisioning, lifecycle controls, testing, and deployment safeguards.

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
| `AUTH-015` | P0 | Add JwtAuthGuard regression tests |
| `AUTH-016` | P0 | Add user lifecycle/security service tests |
| `AUTH-017` | P0 | Add Clerk-mode auth hardening E2E regression suite |
| `AUTH-018` | P1 | Create and execute production deployment runbook |

### Recommended Execution Order

The safest default sequence is:

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

- `AUTH-007`/`AUTH-008` can be developed in parallel with some guard work, but the safe admin bootstrap must exist before the old privileged recovery mechanism is considered fully removed in production.
- `AUTH-005` must complete its production audit/backfill before `AUTH-006` strict Clerk-ID mapping is deployed.
- `AUTH-013` live environment-variable removal should happen after hardened auth is proven in production.
- `AUTH-018` is the final rollout gate and is not complete merely because the runbook file was written.

## Authentication Hardening Completion Gate

The auth-hardening workstream as a whole is complete only when:

- all 18 AUTH tickets are in `Completed/` or explicitly marked not applicable by the project owner;
- authentication performs no user creation, privilege mutation, identity linking, or reactivation;
- production users use verified `clerkUserId` mapping;
- last-admin protection is live;
- lifecycle/session/audit behavior is live;
- unit/service/E2E suites pass;
- production rollout and config cleanup in AUTH-018 are complete.

## Completion Record

Every ticket contains a Completion Record at the bottom. Before moving the ticket, fill it in with real values:

- Implemented By
- Reviewed By
- PR
- Final Commit
- Completed Date
- Notes

Never mark checkboxes complete before the corresponding work has actually been verified.