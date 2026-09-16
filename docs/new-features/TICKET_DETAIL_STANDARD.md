# Ticket detail standard

Use the existing AUTH-001 execution-runbook style. A ticket must let an engineer execute an agreed slice without inventing business authority or data semantics.

## Required structure

1. Objective and durable outcome.
2. Source-grounded current behavior and exact inspected revision.
3. Engineer mental model.
4. Facts, assumptions, unknowns and STOP decisions.
5. Chosen architecture and rejected alternatives.
6. Exact allowed files, read-only evidence and out-of-scope work.
7. Depends On and Blocks links; dependency acceptance evidence.
8. Explicit data/API contracts, limits, status codes and serialization.
9. READ → VERIFY → CHANGE → TEST → CHECKPOINT sequence with why/where/proof.
10. Per-test Purpose, Level, Setup, Action, Expected result, Required assertions, Why this matters, Likely failure diagnosis.
11. Manual verification, including denial, stale state, retry and UI mount where applicable.
12. Safe observability and debugging order.
13. PR evidence requirements.
14. Observable acceptance criteria.
15. Definition of done covering review/checks/documentation.
16. Rollback and recovery boundary.
17. Forbidden shortcuts and architect escalation conditions.
18. Completion record with actual evidence rather than prechecked boxes.

## Scope rules

Separate source facts from proposed schemas. A dependency-created path is not an existing implementation. Schema/API/UI slices may be separate; a shared contract is included for compatibility, not permission to implement every model. Required small wiring additions must be named. If a slice grows, split it before implementation and update dependencies; never quietly expand into another module.

## Evidence rules

Mocks cannot prove database constraints, transaction rollback or concurrent claims. Browser screenshots cannot prove authorization. Unit tests, DB integration, browser checks, hosted CI and deployed verification are separate evidence levels. Record unavailable checks honestly. Avoid live private data and real provider spend in ordinary fixtures.

## Lifecycle

Pending contains unimplemented work and blocked proposals. Decision tickets remain Pending until a named owner accepts the decision. Completion of a design document does not mark its feature shipped. Completed requires the ticket’s own accepted deliverable, commit/review/check evidence and updated incoming links. Status must agree in the file, index, coverage and manifest.

## Architect decisions

Do not guess provider budgets, tenant migration corrections, owner approval powers, retention, financial policy or partner API contracts. Decision tickets specify the evidence required to settle these. Once accepted, update affected implementation contracts to the signed version before handoff.
