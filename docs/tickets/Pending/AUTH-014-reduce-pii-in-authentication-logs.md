# AUTH-014: Reduce PII in Authentication and Authorization Logs

**Status:** Pending  
**Priority:** P1  
**Area:** Security / Logging / Privacy / Observability  
**Complexity:** Small-Medium  
**Depends On:** AUTH-002, AUTH-003, AUTH-006  
**Blocks:** AUTH-015, AUTH-018  
**Primary Files:** `Backend/src/shared/guards/jwt-auth.guard.ts`, `Backend/src/shared/guards/roles.guard.ts`

## Objective

Make authentication and authorization logs useful for debugging and incident response without routinely writing unnecessary personally identifiable information, provider identifiers, tokens, credentials, or large user/request objects into logs.

After this ticket, auth logs must be based on a small allowlist of safe fields and stable reason codes.

A reviewer should be able to diagnose **what kind of auth failure happened** without seeing a user's email address, Clerk subject, bearer token, session token, password, OTP, or full user object.

---

## Junior Engineer Mental Model

Logs are a second data store.

They are often:

- retained longer than request data;
- copied to monitoring vendors;
- accessible to more engineers than the production database;
- attached to tickets and incident reports;
- searched/exported in bulk.

So use this rule:

```text
Log the reason for the auth decision.
Do not log identity/credentials that are unnecessary to understand the decision.
```

A good denial log might tell you:

```text
reason = AUTH_ROLE_DENIED
requestId = req-123
path = /api/v1/users
localUserId = <safe-local-id>
role = WORKER
requiredRoles = ADMIN
```

It does not need:

```text
email
clerkUserId
Bearer token
cookies
full request.user
raw Clerk response
```

---

## Architecture Discussion and Decisions

### Decision 1: Use allowlisted log fields

**Chosen:** Construct log context explicitly from approved fields.

**Rejected:** Pass `request.user`, request headers, provider error objects, or entire request objects to the logger.

**Why:** Structured logging can leak sensitive nested fields even when the visible message string looks harmless.

### Decision 2: Use stable reason codes

Recommended reasons:

```text
AUTH_TOKEN_MISSING
AUTH_TOKEN_INVALID
AUTH_PROVIDER_NOT_CONFIGURED
AUTH_USER_NOT_PROVISIONED
AUTH_USER_INACTIVE
AUTH_USER_SUSPENDED
AUTH_SUCCESS
AUTH_ROLE_DENIED
AUTH_ORG_DENIED
AUTH_GEOGRAPHY_DENIED
```

Stable codes are easier to search/monitor and do not require exposing identity details.

### Decision 3: Local user ID may be logged only after local user resolution

A local PropertyOS user ID is generally safer and more useful for internal troubleshooting than email/provider ID.

If no local user exists, do not log the external provider subject to compensate.

### Decision 4: Provider errors are categorized, not dumped

**Chosen:** Log a safe category/class/name after inspection.

**Rejected:** Serialize arbitrary provider error objects or blindly interpolate `error.message` if it may contain request/provider details.

### Decision 5: Client-facing errors remain generic

Internal safe reason codes may be more detailed than public responses, but API responses must not reveal whether a specific external identity/email exists or expose provider internals.

### Decision 6: Request ID replaces excessive identity logging for correlation

Use the request/correlation ID already established by the application. Do not generate a new independent ID inside each guard.

---

## Facts, Assumptions, and Unknowns

### Facts / Expected Current State

- `JwtAuthGuard` and `RolesGuard` currently contain logging around auth success/failure.
- historical logging has included email and/or provider/local identity context.
- request ID middleware/interceptor exists in the backend.
- AUTH-006 removes email-based request-time identity mapping.

### Assumptions To Verify

- Nest `Logger` or current logger supports structured context consistently;
- request ID is accessible from the request object used by guards;
- `RolesGuard` does not require email to make its decision;
- safe local user ID and role are enough for normal authorization debugging.

### Unknowns That Must Not Be Guessed

- whether provider SDK error messages are guaranteed secret-safe;
- whether organization/geography guards contain additional PII-rich logs outside the primary files;
- whether production monitoring depends on exact old message text.

If existing alerts parse old free-text messages, preserve/migrate the signal through stable reason codes rather than silently breaking observability.

---

## Logging Data Policy

### Allowed When Operationally Useful

- stable reason code;
- request ID/correlation ID;
- route/path;
- HTTP method if useful;
- local PropertyOS user ID after resolution;
- current role;
- required role names;
- organization/geography decision category, not raw sensitive dataset;
- provider operation category;
- safe error class/category;
- latency/duration if already supported.

### Prohibited In Routine Auth Logs

- email;
- phone number;
- Clerk user ID / provider subject;
- bearer token/JWT;
- authorization header;
- refresh/session token;
- cookies containing auth material;
- password/password hash/temp password;
- OTP;
- Clerk/API secret;
- raw decoded token payload;
- entire `request.user`;
- entire request object;
- raw provider error/response/request config;
- raw lifecycle/audit reason text unless policy explicitly allows it.

---

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- `Backend/src/shared/guards/roles.guard.ts`
- focused auth/logging tests

### Inspect For Related One-Line Fixes

- `Backend/src/shared/guards/org.guard.ts`
- `Backend/src/shared/guards/geography.guard.ts`
- auth controller/service files modified during hardening

### Out Of Scope

Do not:

- perform a repository-wide privacy rewrite;
- introduce a new logging vendor/framework;
- redact every business-domain log in the application;
- remove all auth observability;
- change product privacy policy;
- log hashed email/provider IDs as a new tracking identity unless explicitly approved.

Record unrelated findings as follow-up tickets.

---

## Required Reading

Before editing:

1. final `jwt-auth.guard.ts`
2. `roles.guard.ts`
3. `org.guard.ts`
4. `geography.guard.ts`
5. request ID middleware/interceptor
6. shared logger conventions
7. completed AUTH-006 strict mapping behavior
8. `docs/tickets/TICKET_DETAIL_STANDARD.md`

The intern must be able to answer:

- Why is a provider ID still sensitive/unnecessary even if it is not an email?
- Why is full-object structured logging dangerous?
- When is a local user ID available safely?
- How should provider verification errors be categorized?

---

## Pre-Flight Log Inventory

Search auth-related files for:

```text
logger.debug
logger.log
logger.warn
logger.error
console.
```

Build a PR table:

```text
file | branch/condition | current logged fields | sensitive? | replacement reason/context
```

Also search log statements for:

```text
email
clerkUserId
verifiedToken.sub
authorization
token
request.user
headers
```

Do not edit until the inventory is complete.

---

## Step-by-Step Execution Plan for an Intern

### Phase 0 - Baseline

Run:

```bash
npm run typecheck:backend
npm run test:backend
```

Record pre-existing failures.

### Phase 1 - Inspect Bearer Extraction Logging

Find the code that reads `Authorization` and extracts bearer token.

Confirm no logger receives:

- header value;
- token variable;
- decoded token body.

If it does, remove those values first.

**Verify:** missing-token path can be understood using only reason + path/request ID.

### Phase 2 - Standardize Missing-Token Logging

Use a stable reason such as:

```text
AUTH_TOKEN_MISSING
```

Safe fields:

```text
requestId
path
method? 
```

Do not log headers.

### Phase 3 - Standardize Invalid-Token Logging

Use:

```text
AUTH_TOKEN_INVALID
```

Map provider exceptions to a safe error category.

Do not serialize provider error object.

**Verify:** insert fake token/secret strings in the mocked error and prove they are absent from logger arguments.

### Phase 4 - Clean Missing-Local-User Logging

Under AUTH-006 strict mapping, no local user means:

```text
AUTH_USER_NOT_PROVISIONED
```

Log request correlation only.

Do not log provider subject or email to identify the caller.

### Phase 5 - Clean Inactive/Suspended Logging

Once local user exists:

```text
AUTH_USER_INACTIVE
AUTH_USER_SUSPENDED
```

Safe context may include local user ID and role.

Do not include profile/provider identity.

### Phase 6 - Clean Success Logging

If success logs are retained:

```text
AUTH_SUCCESS
localUserId
role
requestId/path
```

Avoid email/provider ID.

If current conventions allow dropping high-volume success logs, reviewer may approve that, but do not silently remove all useful signal.

### Phase 7 - Clean `RolesGuard`

For denial, log:

```text
AUTH_ROLE_DENIED
localUserId
currentRole
requiredRoles
requestId/path
```

Never serialize full `request.user`.

### Phase 8 - Inspect Org/Geography Guards

Review for:

- full user object dumps;
- email/provider ID;
- raw assignment objects that expose more than needed.

Make narrowly scoped auth-logging fixes if obvious. Do not expand into unrelated logging work.

### Phase 9 - Preserve Existing Request ID

Trace exactly where request ID is placed on request/context.

Use that value consistently.

Do not create a separate ID per guard.

### Phase 10 - Clean Client-Facing Error Leakage

While touching catch/rejection blocks, verify returned errors do not echo:

- provider messages;
- emails;
- provider IDs;
- config/secrets;
- stack traces.

### Phase 11 - Add Log-Capture Test Helper

Capture all logger arguments and serialize them for sensitive-marker tests.

Important: check **all logger arguments**, not only the first message string.

### Phase 12 - Add Fake Sensitive Markers

Use fake test-only values:

```text
sensitive@example.test
user_sensitive_provider_id
Bearer super-secret-test-token
fake-clerk-secret-value
fake-session-token
```

These must never appear in captured auth logs.

### Phase 13 - Add Detailed Tests

Implement cases below.

### Phase 14 - Static Post-Change Search

Search changed auth files for suspicious logging expressions around:

```text
.email
clerkUserId
verifiedToken.sub
authorization
token
request.user
```

Review every match manually.

### Phase 15 - Validate

Run:

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

---

## Detailed Test Specification

### TEST-AUTH014-01: Missing-token log has safe reason only

**Purpose:** Diagnose common auth failure without identity/credential data.

**Setup:** protected request, no authorization header.

**Action:** execute guard.

**Expected Result:** rejection and `AUTH_TOKEN_MISSING` log.

**Required Assertions:** no header/token/email/provider ID/secret in any logger argument.

### TEST-AUTH014-02: Invalid-token log never prints raw token

**Purpose:** Prevent the most tempting debugging leak.

**Setup:** fake sensitive bearer token; `verifyToken` throws.

**Action:** authenticate.

**Expected Result:** `AUTH_TOKEN_INVALID`.

**Required Assertions:** fake token and full authorization header absent.

**If Fails:** remove token/header interpolation, not the assertion.

### TEST-AUTH014-03: Provider error cannot leak fake secret payload

**Purpose:** Prove arbitrary SDK errors are sanitized.

**Setup:** mocked error contains fake secret, fake email, provider ID, token.

**Action:** trigger provider failure.

**Expected Result:** safe category only.

**Required Assertions:** sensitive markers absent.

### TEST-AUTH014-04: Missing local mapping log contains no provider identity

**Purpose:** Protect privacy of unprovisioned external identities.

**Setup:** valid token, local lookup null.

**Action:** authenticate.

**Expected Result:** `AUTH_USER_NOT_PROVISIONED`.

**Required Assertions:** provider subject/email absent; request ID/path may appear.

### TEST-AUTH014-05: Inactive-user log uses local ID, not email/provider ID

**Purpose:** Retain useful DB correlation safely.

**Setup:** mapped inactive user with fake sensitive profile/provider values.

**Action:** authenticate.

**Expected Result:** `AUTH_USER_INACTIVE`.

**Required Assertions:** local ID may be present; sensitive markers absent.

### TEST-AUTH014-06: Suspended-user log has distinct reason

**Purpose:** Preserve lifecycle diagnostic value.

**Setup:** mapped suspended user.

**Action:** authenticate.

**Expected Result:** `AUTH_USER_SUSPENDED`.

**Required Assertions:** no email/provider/token.

### TEST-AUTH014-07: Success log is privacy-minimal

**Purpose:** Prevent high-volume PII collection on normal traffic.

**Setup:** active mapped user with fake email/provider ID.

**Action:** authenticate successfully.

**Expected Result:** optional `AUTH_SUCCESS` with safe local context only.

**Required Assertions:** fake email/provider/token absent.

### TEST-AUTH014-08: Role denial logs role context without full user object

**Purpose:** Keep authorization troubleshooting useful.

**Setup:** WORKER calls ADMIN-only route; request user has fake sensitive fields.

**Action:** RolesGuard runs.

**Expected Result:** denied + `AUTH_ROLE_DENIED`.

**Required Assertions:** role/required roles may appear; full user/email/provider fields absent.

### TEST-AUTH014-09: Request ID is preserved

**Purpose:** Ensure privacy cleanup does not destroy correlation.

**Setup:** request with known request ID.

**Action:** trigger failure.

**Expected Result:** safe log contains existing request ID.

**Required Assertions:** guard does not invent unrelated ID.

### TEST-AUTH014-10: Structured metadata cannot hide PII

**Purpose:** Catch nested object leaks.

**Setup:** request/user contains fake sensitive markers.

**Action:** exercise success and denial logs.

**Expected Result:** serialized union of all logger arguments contains none of the markers.

### TEST-AUTH014-11: Client error remains generic

**Purpose:** Prevent equivalent leakage through API responses.

**Setup:** provider throws detailed fake error.

**Action:** protected request.

**Expected Result:** generic auth error according to contract.

**Required Assertions:** response excludes provider/error/identity/secret detail.

### TEST-AUTH014-12: No authorization header appears in logs from any tested branch

**Purpose:** Make credential leakage a cross-branch invariant.

**Setup:** run missing/invalid/active/non-active/role-denied cases with fake header values where applicable.

**Action:** collect logs.

**Expected Result:** no full Authorization value in any case.

### TEST-AUTH014-13: No full `request.user` serialization

**Purpose:** Prevent future helper refactor from reintroducing sensitive nested values.

**Setup:** request user with many fake fields.

**Action:** role/auth success/denial.

**Expected Result:** logger receives explicit primitive/safe metadata, not user object.

### TEST-AUTH014-14: Static search catches untested logging branches

**Purpose:** Supplement runtime tests.

**Action:** search changed files for logger calls plus sensitive-field references.

**Expected Result:** every remaining match is reviewed/justified and not routine PII logging.

---

## Manual Verification

Run backend locally with fake/test identities and debug logs enabled.

Exercise:

1. successful active user;
2. missing token;
3. invalid token;
4. unmapped identity;
5. inactive user;
6. suspended user;
7. role denial;
8. org/geography denial if relevant.

Read the terminal output manually.

A human should be able to understand the category of failure while seeing no email, provider ID, token, secret, or full user object.

---

## Failure Diagnosis Guide

### Tests pass but terminal still shows email

Your test coverage missed a branch/file. Repeat log inventory and static search.

### Email removed from message but still appears in JSON metadata

Stop passing full objects. Build an explicit allowlist.

### Provider error message contains sensitive data

Do not log arbitrary `.message`. Map exception to safe category/class.

### Logs become too vague to diagnose role failures

Add safe role/required-role/local-ID/request-ID fields. Do not re-add email/provider subject.

### Request IDs disappear

Trace the existing request ID source. Privacy cleanup should preserve correlation.

### Monitoring alert stops firing after reason-code migration

Update alert/query to stable reason code. Do not retain PII-rich legacy message solely for alert compatibility.

---

## Observability Contract After This Ticket

Auth logs should support queries such as:

```text
count AUTH_USER_NOT_PROVISIONED over time
count AUTH_TOKEN_INVALID over time
count AUTH_ROLE_DENIED by route
find all auth events for requestId X
find denials for localUserId Y after local mapping exists
```

They should not support accidental bulk export of user emails/provider IDs because those values should not be routinely present.

---

## Reviewer Walkthrough

Reviewer should verify:

1. complete pre/post log inventory exists;
2. all changed logs use allowlisted fields;
3. token/header values never enter logs;
4. provider errors are sanitized;
5. unmapped identity logs do not substitute provider ID for email;
6. success logs are minimal;
7. role-denial logs still have enough context;
8. request ID is preserved;
9. structured arguments are tested, not just message strings;
10. client-facing errors remain generic;
11. static search reviewed all suspicious matches.

---

## PR Evidence Required

Include:

- before/after log inventory table;
- chosen reason-code list;
- changed files;
- logger-capture test names/results;
- list of fake sensitive markers used;
- static-search results/justifications;
- manual terminal verification summary;
- monitoring/alert update note if relevant;
- typecheck/lint/test results.

Never paste real production log lines containing PII/secrets into the PR.

---

## Acceptance Criteria

- [ ] Auth logs use stable reason codes.
- [ ] Routine auth logs contain no email/provider ID.
- [ ] Tokens/authorization headers/secrets are never logged.
- [ ] Full request/user/provider objects are not logged.
- [ ] Local user ID/role/request ID remain available where useful.
- [ ] Provider errors are safely categorized.
- [ ] Client errors remain generic.
- [ ] Tests scan all logger arguments for sensitive markers.
- [ ] Manual terminal review confirms useful but privacy-minimal logs.

---

## Definition of Done

- [ ] Logging changes implemented.
- [ ] Tests complete.
- [ ] Typecheck/lint/backend tests pass.
- [ ] Static search reviewed.
- [ ] Manual log review completed.
- [ ] PR evidence complete.
- [ ] Reviewer approves privacy/observability balance.

---

## Rollback

If log changes break operational troubleshooting/alerts, restore the needed **safe signal**, not the PII-heavy payload.

Prefer adding reason code, route, request ID, local user ID, or role context over restoring email/provider/token information.

---

## Forbidden Shortcuts

Do not:

- hash email and call the privacy problem solved without review;
- log provider subject because email was removed;
- log raw token “only at debug level”;
- log full request/user/provider objects;
- serialize arbitrary provider errors;
- remove every log and destroy observability;
- weaken tests because a sensitive debug line seems temporarily useful;
- include real production log samples with secrets/PII in PR evidence.

---

## STOP - NEEDS ARCHITECT DECISION

Stop if:

- current production alerting depends on old message content and migration requires coordinated monitoring changes;
- compliance/security policy requires different retention/redaction rules;
- another logger middleware automatically captures headers/body regardless of guard changes;
- provider SDK errors cannot be safely categorized without losing required diagnostic information.

---

## Handoff To AUTH-015 / AUTH-018

AUTH-015 should permanently regression-test these logging invariants inside `JwtAuthGuard`.

AUTH-018 should monitor safe reason codes during production rollout instead of inspecting PII-heavy logs.

---

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Reason Codes Added/Confirmed:**  
**Sensitive Marker Tests:** Pass / Fail  
**Manual Log Review:** Pass / Fail  
**Monitoring Changes Required:** Yes / No  
**Notes:**