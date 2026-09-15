# PropertyOS Detailed Ticket Standard v2

This file defines the minimum detail level for every engineering execution ticket under `docs/tickets/Pending/` and `docs/tickets/Completed/`.

A ticket is not a Jira summary. A ticket is an **implementation handoff package**. It must contain enough product context, architecture intent, repository navigation, execution order, testing detail, failure diagnosis, review evidence, and completion criteria that a junior engineer or intern can execute it without inventing architecture or relying on verbal explanations.

The assumed engineer can read TypeScript/NestJS/Prisma/React code and make small code changes, but is **not expected to design architecture, infer hidden requirements, choose security behavior, decide migration policy, or understand undocumented business rules**.

The standard is intentionally strict. If a ticket does not contain enough information for a weak engineer to execute it safely, the ticket is incomplete.

---

## 1. Required Mental Model

Every ticket must separate these four things clearly:

1. **Fact:** What the repository does today.
2. **Decision:** What behavior has already been chosen for the target state.
3. **Instruction:** What the implementer must change.
4. **Unknown:** What is not decided and therefore requires escalation.

Do not mix assumptions with facts. Do not make the intern infer a product or architecture decision from implementation steps.

Use `STOP - NEEDS ARCHITECT DECISION` whenever the engineer would otherwise need to invent behavior.

---

## 2. Required Ticket Sections

Every ticket must contain, when applicable, all of the following sections inside the ticket itself.

### Metadata

At minimum:

- Status
- Priority
- Area
- Complexity
- Depends On
- Blocks
- Primary files/modules
- Risk classification
- Database impact
- API impact
- External-service impact
- Migration/backfill impact

### One-Sentence Outcome

State the exact observable end state in one sentence.

The engineer should be able to answer: **How will I know this ticket worked?**

### Objective

Explain what is being changed in plain English.

### Problem in Plain English

Explain the existing defect or architectural problem as if the reader has never seen the codebase.

### Why It Matters

Explain the security, reliability, product, maintainability, operational, or data-integrity consequence of leaving the behavior unchanged.

### Important Design Discussion and Decisions Already Made

Capture the reasoning that led to the ticket. This section should explain alternatives that were considered and why they are not being used.

Examples:

- why authentication must not provision users;
- why local account state remains authoritative even if Clerk is unavailable;
- why an explicit bootstrap command is preferred to a startup fallback;
- why a dry-run identity migration is required before strict Clerk-ID lookup;
- why security-critical audit events are explicit service-level events instead of relying only on generic HTTP auditing.

The intern must not have to rediscover these decisions.

### Terminology

Define any terms the engineer must understand before implementation.

### Current Architecture

Describe the existing request/data/control flow.

Include a text or Mermaid diagram where useful.

### Current Failure or Risk Scenarios

Provide concrete examples of how the current behavior can fail.

### Target Architecture

Describe the desired flow before implementation details.

### Architecture Invariants

State rules that must remain true regardless of implementation details.

Examples:

- authentication performs zero user-lifecycle writes;
- inactive users remain inactive after login attempts;
- one external identity maps to at most one PropertyOS user;
- disabling local access succeeds even if session revocation fails;
- a deployment must never leave the system with zero active administrators.

### Scope

State exactly what this ticket owns.

### Out of Scope

State what related behavior must not be redesigned in this ticket.

### Ownership Boundaries

Explain which module/service/guard/controller/database table owns each relevant responsibility.

### Required Reading

List files and explain **what the engineer is expected to learn from each one**. Do not merely list paths.

### Pre-Flight Checklist

Before editing, the engineer must verify repository state, dependencies, baseline tests, environment assumptions, and any prerequisite tickets.

### Baseline Commands

Specify commands and explain why each one is run before code changes.

### Data and Migration Impact

State whether schema changes, data audits, backfills, dry runs, or production-data checks are required.

### API and Error Contract

State expected HTTP status/error behavior where applicable. Specify what may and may not be exposed to clients.

### Logging and Observability Contract

State what should be logged, what must never be logged, useful reason codes, and what operational signal proves the change is working.

### Security Contract

State explicit security rules and forbidden bypasses.

### Step-by-Step Execution Plan

This is the core of the ticket.

Every meaningful step must answer:

1. **Where?** Exact file/function/module to inspect or change.
2. **Do what?** Concrete action.
3. **Why?** Architecture/business reason.
4. **Verify how?** Immediate proof before continuing.
5. **What can go wrong?** Common mistake at this step.
6. **Stop condition?** When the engineer must not continue.

Prefer small numbered steps. A weak engineer should be able to execute one step, verify it, and then continue.

### Checkpoints

Break long tickets into phases. Each checkpoint must have explicit pass/fail conditions.

Example:

```text
CHECKPOINT 2 - AUTH GUARD IS READ-ONLY

[ ] no user.create
[ ] no user.update changing role/status
[ ] missing user rejects
[ ] inactive user rejects
[ ] active user succeeds
[ ] focused tests pass
```

The engineer must not continue when a checkpoint fails.

### Expected Diff Shape

Describe which files should normally be modified and what classes of change should appear. This helps detect scope creep.

### Detailed Test Specification

Every business/security-critical test must use the format below.

### Manual Verification

Give exact manual steps, starting state, action, expected result, and what database/log state to inspect.

### Regression Matrix

List nearby behavior that must remain unchanged.

### Failure Diagnosis / Troubleshooting

Explain likely causes for common failures and what to inspect before changing tests or architecture.

### PR Evidence Required

State exactly what proof belongs in the PR description.

### Acceptance Criteria

Observable behavior only. Avoid vague statements like `security improved`.

### Definition of Done

Include code, tests, lint, typecheck, build, migration/data work, documentation, security checks, manual verification, and review.

### Rollback Plan

Explain what can safely be rolled back and what data changes must not be blindly reversed.

### Forbidden Shortcuts

List tempting but incorrect implementations.

### STOP - NEEDS ARCHITECT DECISION

List ambiguity cases where the engineer must stop rather than guess.

### Reviewer Checklist

Give the reviewer ticket-specific questions to answer before approval.

### Completion Record

Require implementer, reviewer, PR, commit, completion date, and notes.

---

## 3. Required Test Case Format

Every important test case must include all fields below. Do not collapse several materially different scenarios into one vague bullet.

### TEST-<TICKET>-NN: Descriptive name

**Purpose:** The exact regression or business/security rule protected.

**Level:** Unit / Service / Integration / E2E / Manual / Static analysis.

**Preconditions:** State that must already exist before setup begins.

**Setup:** Exact environment variables, mocks, database rows, roles, statuses, organizations, geographic scope, provider responses, or test fixtures.

**Test Data:** Use clearly fake values. Never use production credentials or unnecessary real PII.

**Action:** Exact method call, HTTP request, command, or user action.

**Expected Result:** Return value, HTTP status, exception, UI state, or command result.

**Database Assertions:** Records/fields that must change and records/fields that must not change.

**External-Service Assertions:** Calls that must or must not be made to Clerk, email, queues, storage, etc.

**Logging/Audit Assertions:** Expected reason code/event and sensitive values that must be absent.

**Negative Assertions:** Explicit forbidden side effects such as `prisma.user.create` not called.

**Why This Test Exists:** Explain the historical/current defect this catches.

**If This Test Fails:** Tell the engineer which implementation areas to inspect first. Do not suggest weakening a correct assertion.

**Evidence To Record:** What test name/output/result belongs in the PR.

---

## 4. Test Quality Rules

A test is not complete merely because the HTTP status is correct.

Where relevant, verify:

- database state before and after;
- row counts before and after;
- forbidden writes did not happen;
- role/status/organization/geography did not change unexpectedly;
- external services were called the correct number of times;
- external failures do not violate local security invariants;
- audit records contain correct actor/target/before/after state;
- secrets and PII are absent from logs;
- repeated execution is idempotent;
- concurrent execution does not violate invariants when concurrency matters;
- denied requests do not partially mutate state;
- successful requests do not silently skip required audit/cleanup behavior.

Do not delete tests, loosen assertions, add unconditional mocks, disable lint/typecheck, or catch-and-ignore security errors merely to make CI green.

---

## 5. Intern Execution Rules

Every ticket should explicitly teach the engineer this workflow:

```text
READ
  -> UNDERSTAND CURRENT FLOW
  -> RUN BASELINE
  -> VERIFY PREREQUISITES
  -> MAKE ONE SMALL CHANGE
  -> RUN FOCUSED TEST
  -> CHECK DATABASE / SIDE EFFECTS
  -> CHECKPOINT
  -> NEXT CHANGE
  -> FULL TEST SUITE
  -> MANUAL VERIFICATION
  -> DIFF REVIEW
  -> PR EVIDENCE
  -> REVIEW
```

Do not tell an intern to make ten changes before the first verification point.

When a change touches security, permissions, migrations, identity, tenant isolation, or destructive data behavior, checkpoints must be more frequent.

---

## 6. Important Discussion Capture

A ticket must preserve important decisions from architecture/product discussion when those decisions constrain implementation.

Use a subsection such as:

`### Decision: Authentication Is Not Provisioning`

Then explain:

- the question that was discussed;
- the chosen decision;
- why it was chosen;
- what alternative was rejected;
- how the decision affects implementation;
- what would require reopening the decision.

This prevents future engineers from repeating the same debate or accidentally reversing the architecture.

---

## 7. Required PR Evidence

Every ticket must define a small evidence package. Depending on the work, require some combination of:

- before/after control-flow description;
- exact files changed;
- commands run and results;
- focused test names/results;
- full test/lint/typecheck/build results;
- migration dry-run counts;
- before/after database counts;
- screenshots for UI changes;
- safe log samples with PII removed;
- audit-event examples with fake IDs;
- search results proving old code/config was removed;
- manual smoke-test result;
- rollback verification;
- unresolved `STOP` items.

Never include passwords, API keys, tokens, private keys, production connection strings, raw PII exports, session cookies, OTPs, or authorization headers.

---

## 8. Reviewer Standard

Reviewers must not approve a ticket solely because the code looks reasonable.

The reviewer should verify:

1. the architecture invariant is actually enforced;
2. tests cover both success and failure paths;
3. negative side effects are asserted;
4. the engineer did not move the unsafe behavior somewhere else;
5. migration/data actions are reversible or explicitly one-way;
6. logging does not expose sensitive data;
7. failure of an external dependency preserves local safety;
8. implementation stayed within scope;
9. completion evidence exists;
10. the ticket itself is updated before moving to `Completed/`.

---

## 9. Completion Principle

A ticket is complete only when another engineer can independently answer all of the following from the repository, tests, ticket, and PR evidence:

- What problem existed?
- What architecture decision was made?
- What changed?
- Why was it changed this way?
- What behavior is now guaranteed?
- What behavior intentionally did not change?
- Which tests prove the guarantee?
- What happens when dependencies fail?
- How was the change manually verified?
- How would the change be rolled back?

If any of those answers still depend on the implementer's memory or a private conversation, the ticket is not detailed enough.
