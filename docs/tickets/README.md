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

## Completion Record

Every ticket contains a Completion Record at the bottom. Before moving the ticket, fill it in with real values:

- Implemented By
- Reviewed By
- PR
- Final Commit
- Completed Date
- Notes

Never mark checkboxes complete before the corresponding work has actually been verified.