# AUTH-014: Reduce PII in Authentication and Authorization Logs

**Status:** Pending  
**Priority:** P1  
**Area:** Security / Logging / Privacy  
**Complexity:** Small  
**Depends On:** AUTH-002, AUTH-003, AUTH-006  
**Blocks:** AUTH-018  
**Primary Files:** `Backend/src/shared/guards/jwt-auth.guard.ts`, `Backend/src/shared/guards/roles.guard.ts`

## Objective

Make authentication/authorization logs operationally useful without routinely writing user email addresses, Clerk provider IDs, tokens, request authorization headers, or other unnecessary identity data into application logs.

After this ticket, auth logs should use safe reason codes plus limited operational context such as request path/request ID, local user ID where appropriate, and role information when needed for authorization debugging.

## Junior Engineer Orientation

Logging is not harmless just because it is not returned to the browser.

Logs are often:

- stored longer than normal requests;
- copied into monitoring systems;
- visible to more engineers/operators than production database rows;
- attached to incident tickets;
- searched/exported during debugging.

So the rule is:

```text
Log enough to understand what kind of auth failure happened.
Do not log identity/secrets that are unnecessary for that diagnosis.
```

A useful auth log should answer:

```text
What request failed?
Why did auth reject it?
Which local user was involved, if already safely known?
What role check failed?
Which request/correlation ID lets us trace related events?
```

It usually does **not** need:

```text
email
Clerk provider user ID
Bearer token
session token
password
OTP
full request.user
```

## Why This Exists

The current auth guard includes log messages containing values such as email address, Clerk user ID, local user ID, role, request path, and raw provider error text. `RolesGuard` also logs an object containing email information.

Email addresses and external identity IDs are unnecessary in routine auth logs and increase the impact of log exposure.

This ticket reduces that exposure without destroying useful diagnostics.

## Scope

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- `Backend/src/shared/guards/roles.guard.ts`
- focused auth/logging tests

### Inspect For Related Auth Logging

- `Backend/src/shared/guards/org.guard.ts`
- `Backend/src/shared/guards/geography.guard.ts`
- auth controllers/services touched by this auth-hardening work

Do not turn this into a repository-wide privacy cleanup. Record unrelated findings for separate tickets.

## Logging Policy

### Allowed when useful

- stable reason code;
- request ID/correlation ID;
- route/path;
- local PropertyOS user ID after a local user is known;
- current/required role names;
- provider operation category, not secret payload;
- safe error class/category;
- duration/latency where already supported.

### Avoid in routine auth logs

- email;
- phone number;
- Clerk user ID/provider subject;
- bearer token/JWT;
- authorization header;
- refresh/session token;
- cookie values;
- password/password hash/temp password;
- OTP;
- Clerk secret/API key;
- entire `request.user` object;
- raw provider response/error body.

## Recommended Reason Codes

Use stable internal strings equivalent to:

- `AUTH_TOKEN_MISSING`
- `AUTH_TOKEN_INVALID`
- `AUTH_PROVIDER_NOT_CONFIGURED`
- `AUTH_USER_NOT_PROVISIONED`
- `AUTH_USER_INACTIVE`
- `AUTH_USER_SUSPENDED`
- `AUTH_SUCCESS`
- `AUTH_ROLE_DENIED`

Do not build a large new logging framework just for this ticket. A small constants/helper pattern is sufficient if it improves consistency.

## Required Reading

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. `Backend/src/shared/guards/roles.guard.ts`
3. request-ID middleware/interceptor registration
4. shared logging conventions
5. completed AUTH-006 final auth lookup flow
6. `Backend/src/shared/guards/org.guard.ts`
7. `Backend/src/shared/guards/geography.guard.ts`
8. `docs/tickets/TICKET_DETAIL_STANDARD.md`

Before editing, identify every log statement in the primary files and write down which data values it currently interpolates/serializes.

## Architecture Contract

Auth logging should be **allowlist-based**, not object-dump-based.

Prefer:

```text
reason=AUTH_ROLE_DENIED requestId=req-123 path=/api/v1/users userId=<local-id> role=WORKER requiredRoles=ADMIN
```

Avoid:

```text
user={ id, email, clerkUserId, role, ... }
headers={ authorization: Bearer ... }
error=<raw provider response>
```

### Client errors vs internal logs

Client-facing errors stay generic and do not disclose provider/account-existence details.

Internal logs may be slightly more descriptive through safe reason codes, but must still avoid credentials/PII that are not necessary.

## Step-by-Step Implementation

### Step 1 - Inventory every auth/authorization log call

Search primary and inspected files for:

- `logger.debug`
- `logger.log`
- `logger.warn`
- `logger.error`
- `console.`

Create a PR table with:

```text
file | condition | current fields | sensitive fields | replacement reason/context
```

**Why:** It prevents missing one branch and gives reviewer a clear before/after picture.

### Step 2 - Identify token/header handling near logs

Review bearer extraction and token verification blocks.

Confirm no log statement serializes:

- the `authorization` header;
- the `token` variable;
- decoded raw token data;
- secrets.

If any does, replace with a reason code immediately.

### Step 3 - Replace missing-token log

Use a stable reason such as `AUTH_TOKEN_MISSING` with safe request context.

Do not echo the authorization header or email.

### Step 4 - Replace invalid-token/provider-verification log

Log a stable `AUTH_TOKEN_INVALID` category.

If you retain provider error information, use a safe class/name/category only after verifying it cannot contain token/request data.

Do not blindly interpolate arbitrary `error.message` if the SDK can include sensitive provider details.

### Step 5 - Clean missing-local-user log

Under strict AUTH-006 mapping, missing local user can be logged as `AUTH_USER_NOT_PROVISIONED`.

Do not log email or `verifiedToken.sub`.

If no local user exists, there is no local user ID to log. Request ID/path are enough.

### Step 6 - Clean inactive/suspended logs

Once a local user is known, local user ID may be useful.

Use separate safe reasons where possible:

- `AUTH_USER_INACTIVE`
- `AUTH_USER_SUSPENDED`

Do not include email/provider ID.

### Step 7 - Clean successful-auth debug log

If success logging is kept, it may include:

- local user ID;
- role;
- request ID/path.

Do not include email or Clerk ID.

If success logs are too noisy and existing conventions allow removing them, that can be considered, but do not remove all auth visibility without review.

### Step 8 - Clean `RolesGuard`

Remove serialized user objects and email.

For a denial, safe context is typically:

- local user ID;
- current role;
- required roles;
- request ID/path.

Do not log the entire request object.

### Step 9 - Inspect Org/Geography guards

Check for full-user serialization or email/provider fields.

Include direct one-line safe fixes only if clearly part of auth authorization logging. Record broader issues separately.

### Step 10 - Preserve request ID consistently

Use the existing request ID set by middleware/header conventions.

Do not generate a new unrelated ID inside each guard.

### Step 11 - Sanitize provider errors

Prefer explicit error categories over arbitrary object/string serialization.

Never log entire provider error response, headers, request config, or raw body.

### Step 12 - Keep client responses generic

While touching failure branches, ensure response text does not expose:

- whether a specific email exists in Clerk;
- provider user ID;
- secret/config values;
- internal stack/provider messages.

### Step 13 - Add logger-capture regression tests

Capture Nest logger calls or a small extracted logging helper.

Use fake sensitive markers such as:

- `sensitive@example.test`
- `user_sensitive_provider_id`
- `Bearer super-secret-test-token`
- `fake-clerk-secret`

Assert those markers never appear in serialized log arguments.

### Step 14 - Avoid brittle full-string assertions

Tests should verify:

- required reason code is present;
- expected safe fields may be present;
- sensitive marker strings are absent.

Do not make tests fail because punctuation/order changes.

### Step 15 - Run changed-file static sanity search

Search for suspicious log interpolation around:

- `.email`
- `clerkUserId`
- `verifiedToken.sub`
- `authorization`
- `token`
- `request.user`

Review every match manually.

### Step 16 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Detailed Test Specification

### TEST-AUTH014-01: Missing-token log contains reason code but no credentials/PII

**Purpose:** Ensure the most common auth failure is safe and diagnosable.

**Level:** Unit/log-capture test.

**Setup:** Protected request with no Authorization header; capture logger output.

**Action:** Execute auth guard.

**Expected Result:** Rejected; warning contains `AUTH_TOKEN_MISSING` or equivalent.

**Required Assertions:** Log does not contain email, token placeholder, authorization header serialization, provider ID, or secrets.

**Why This Test Exists:** Missing-token handling should never need identity information.

**If This Test Fails:** Replace broad request/header logging with reason + path/request ID.

### TEST-AUTH014-02: Invalid-token log does not contain raw token

**Purpose:** Prevent credential exposure while debugging verification failures.

**Level:** Unit.

**Setup:** Authorization header contains fake sensitive token; `verifyToken()` throws.

**Action:** Authenticate.

**Expected Result:** `AUTH_TOKEN_INVALID` logged safely.

**Required Assertions:** Fake token string and full Authorization header are absent from every captured log call.

**Why This Test Exists:** Invalid token is exactly when developers are tempted to print the token for debugging.

**If This Test Fails:** Remove token/header interpolation and sanitize provider error handling.

### TEST-AUTH014-03: Provider verification error cannot leak fake secret/error payload

**Purpose:** Ensure arbitrary provider errors are not dumped.

**Level:** Unit.

**Setup:** Mock provider error whose message/object contains `fake-clerk-secret` and fake email/provider ID.

**Action:** Trigger verification/provider failure.

**Expected Result:** Safe error category/name logged.

**Required Assertions:** Sensitive marker strings absent.

**Why This Test Exists:** SDK error objects may contain more information than expected.

**If This Test Fails:** Stop interpolating raw message/object; map to safe category.

### TEST-AUTH014-04: Missing local user log contains no email/provider ID

**Purpose:** Protect unprovisioned identity privacy.

**Level:** Unit.

**Setup:** Valid token with fake provider ID/email data if test seam still exposes it; local lookup returns null.

**Action:** Authenticate.

**Expected Result:** `AUTH_USER_NOT_PROVISIONED` logged.

**Required Assertions:** No fake email or provider ID in log; path/request ID may appear.

**Why This Test Exists:** There is no need to expose external identity values when local mapping is missing.

**If This Test Fails:** Use strict ID lookup and safe reason code only.

### TEST-AUTH014-05: Inactive user log uses local ID and safe reason only

**Purpose:** Keep useful internal correlation without email exposure.

**Level:** Unit.

**Setup:** Mapped local inactive user with fake email/provider ID.

**Action:** Authenticate.

**Expected Result:** `AUTH_USER_INACTIVE` logged.

**Required Assertions:** Local user ID may be present; fake email/provider ID absent.

**Why This Test Exists:** Once local identity is known, local ID is sufficient for database investigation.

**If This Test Fails:** Remove profile/provider fields from log template.

### TEST-AUTH014-06: Suspended user gets distinct safe reason

**Purpose:** Keep lifecycle diagnosis useful without PII.

**Level:** Unit.

**Setup:** Mapped suspended user.

**Action:** Authenticate.

**Expected Result:** `AUTH_USER_SUSPENDED` or equivalent safe reason.

**Required Assertions:** No email/provider/token data.

**Why This Test Exists:** Operators should distinguish temporary suspension from generic auth failure.

**If This Test Fails:** Preserve safe status-specific reason after status check.

### TEST-AUTH014-07: Successful auth debug log excludes email/provider ID

**Purpose:** Prevent routine successful traffic from creating a large PII log dataset.

**Level:** Unit.

**Setup:** Active mapped user with fake email/provider ID.

**Action:** Authenticate successfully.

**Expected Result:** Optional success log contains only safe local context.

**Required Assertions:** Fake email/provider ID/token absent; local ID/role may be present.

**Why This Test Exists:** Success logs are high volume and therefore especially important to minimize.

**If This Test Fails:** Use explicit safe fields or remove unnecessary success log under existing conventions.

### TEST-AUTH014-08: Role denial log contains role context without full user object

**Purpose:** Keep authorization debugging useful and privacy-minimal.

**Level:** Unit test of `RolesGuard`.

**Setup:** WORKER requests ADMIN-only route; fake email/provider ID on `request.user`.

**Action:** Execute role guard.

**Expected Result:** Denied; reason `AUTH_ROLE_DENIED`/equivalent.

**Required Assertions:** Current role + required role may be logged; fake email/provider ID/full user serialization absent.

**Why This Test Exists:** Existing role logging is one known PII source.

**If This Test Fails:** Replace object logging with an explicit allowlist of fields.

### TEST-AUTH014-09: Request ID survives safe log refactor

**Purpose:** Ensure removing PII does not destroy correlation ability.

**Level:** Unit/integration.

**Setup:** Request carries known test request ID according to existing middleware convention.

**Action:** Trigger an auth failure.

**Expected Result:** Captured log includes that request ID.

**Required Assertions:** No new unrelated correlation ID is generated.

**Why This Test Exists:** Request IDs are the preferred replacement for broad identity logging during incident tracing.

**If This Test Fails:** Use the backend's existing request ID source.

### TEST-AUTH014-10: Nested/JSON log arguments do not hide PII

**Purpose:** Prevent a superficial fix that removes email from message text but leaves it in a logged metadata object.

**Level:** Unit/log-capture.

**Setup:** `request.user` contains fake sensitive fields.

**Action:** Exercise success/denial logs.

**Expected Result:** Serialized combination of all logger arguments contains no fake sensitive markers.

**Required Assertions:** Do not check only first string argument.

**Why This Test Exists:** Structured logging can leak fields even when the message itself is clean.

**If This Test Fails:** Stop passing full objects and construct explicit safe metadata.

### TEST-AUTH014-11: Client error does not echo provider/internal details

**Purpose:** Keep external error surface generic while internal logs remain useful.

**Level:** Unit/E2E.

**Setup:** Provider verification throws detailed fake internal error.

**Action:** Request protected endpoint.

**Expected Result:** Generic Unauthorized/Forbidden response according to auth contract.

**Required Assertions:** Response body excludes fake provider error, email, provider ID, secrets.

**Why This Test Exists:** Log sanitization should not leave equivalent leakage in API responses.

**If This Test Fails:** Map internal/provider errors to approved generic client errors.

### TEST-AUTH014-12: Static search finds no obvious PII logging in changed auth files

**Purpose:** Catch untested branches.

**Level:** Manual/static verification.

**Setup:** Final changed files.

**Action:** Search suspicious interpolation/object-dump patterns.

**Expected Result:** Every remaining email/provider/token reference is necessary program logic, not routine logging.

**Required Assertions:** Record reviewed matches in PR evidence.

**Why This Test Exists:** Tests cannot guarantee every dormant log branch was executed.

**If This Test Fails:** Clean or explicitly justify the remaining log usage.

## Manual Verification

Run backend locally with debug logging enabled and fake test users only.

Exercise:

1. successful active-user request;
2. missing-token request;
3. invalid-token request;
4. missing-local-user request;
5. inactive-user request;
6. suspended-user request;
7. role-denied request.

Review terminal output and confirm:

- each event category is understandable;
- request correlation remains possible;
- no email/provider ID/token/secret appears.

## Failure Diagnosis Guide

### Tests pass but terminal still shows email

The tests do not cover all logger arguments/branches. Capture all debug/log/warn/error methods and run static search/manual scenarios.

### Removing provider error message makes debugging too vague

Add a safe error class/category or request ID. Do not restore arbitrary raw error payloads.

### Role denial has no way to identify affected user

Use local PropertyOS user ID, not email/provider ID/full object.

### Someone proposes hashing email/token before logging

Do not add pseudonymous identifiers without a concrete operational need and review. Request/local user ID should usually be enough.

## PR Evidence Required

Include:

- before/after auth log inventory;
- safe reason codes used;
- fields deliberately allowed vs removed;
- logger-capture test results with fake sensitive markers;
- static-search review result;
- manual debug-log review result;
- validation command results;
- any unrelated logging findings filed separately.

## Acceptance Criteria

- [ ] Authentication logs use safe reason codes.
- [ ] Routine auth logs contain no email addresses.
- [ ] Routine auth logs contain no Clerk/provider IDs unless explicitly approved.
- [ ] No secrets/tokens/authorization headers are logged.
- [ ] `RolesGuard` no longer logs full identity objects/PII.
- [ ] Provider errors are safely categorized instead of dumped.
- [ ] Request ID/local ID keeps logs operationally useful.
- [ ] Automated tests inspect all logger arguments for sensitive markers.

## Definition of Done

- [ ] Auth log inventory completed.
- [ ] Unsafe fields removed.
- [ ] Detailed logger/security tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual log review passes.
- [ ] Required PR evidence recorded.
- [ ] Reviewer confirms useful-but-minimal logging.

## Rollback

If operators lose needed diagnostics, add a safe correlation field such as request ID/local user ID or safe error category. Do not restore routine email/token logging as the first solution.

## Forbidden Shortcuts

Do not:

- hash tokens/emails and log the hash without approved need;
- log full request headers;
- serialize `request.user`;
- move sensitive data from `debug` to `error` and call it fixed;
- hide email inside JSON metadata;
- suppress all auth logs entirely;
- sanitize only the message string while leaving sensitive structured arguments.

## STOP - NEEDS ARCHITECT DECISION

Stop if compliance/incident-response policy explicitly requires a particular identity field in security logs.

Also stop if a centralized logging/observability standard already mandates structured field names/retention controls that this ticket would conflict with. Document the requirement rather than independently changing mandated security logging.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Automated Sensitive-Marker Tests:** Pass / Fail  
**Manual Log Review:** Pass / Fail  
**Static Search Review:** Pass / Fail  
**Notes:**