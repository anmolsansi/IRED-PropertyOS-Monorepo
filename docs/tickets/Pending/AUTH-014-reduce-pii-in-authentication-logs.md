# AUTH-014: Reduce PII in Authentication and Authorization Logs

**Status:** Pending  
**Priority:** P1  
**Area:** Security / Logging / Privacy  
**Complexity:** Small  
**Depends On:** AUTH-002, AUTH-003, AUTH-006  
**Blocks:** AUTH-018  
**Primary Files:** `Backend/src/shared/guards/jwt-auth.guard.ts`, `Backend/src/shared/guards/roles.guard.ts`

## Objective

Make authentication/authorization logs operationally useful without routinely writing user email addresses, Clerk provider IDs, tokens, or other unnecessary identity data into application logs.

After this ticket, auth logs should be based on safe reason codes, request path/request ID, local user ID where appropriate, and role when needed for authorization debugging.

## Why This Exists

The current auth guard includes log messages containing values such as:

- email address;
- Clerk user ID;
- local user ID;
- role;
- request path;
- provider error text.

The roles guard also logs a user object containing email information.

Email addresses and external identity IDs are not required in routine auth logs and increase the privacy/security impact of log exposure.

## Scope

This ticket is deliberately focused on authentication/authorization logging.

### Expected Files To Modify

- `Backend/src/shared/guards/jwt-auth.guard.ts`
- `Backend/src/shared/guards/roles.guard.ts`
- auth/logging tests if present

### Inspect For Related Auth Logging

- `Backend/src/shared/guards/org.guard.ts`
- `Backend/src/shared/guards/geography.guard.ts`
- auth controllers/services

Do not turn this ticket into a full repository-wide PII-removal project. Create separate tickets for unrelated modules if significant issues are found.

## Logging Policy For This Ticket

### Allowed when useful

- request ID;
- route/path;
- local PropertyOS user ID;
- role;
- HTTP/auth reason code;
- provider operation name;
- high-level error category;
- duration/latency.

### Avoid in routine auth logs

- email;
- phone number;
- Clerk user ID unless absolutely necessary for a controlled diagnostic;
- bearer token;
- JWT;
- authorization header;
- refresh token;
- session token/session cookie;
- password/password hash;
- OTP;
- Clerk secret key.

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

The exact enum/helper structure may follow existing logging patterns. Do not introduce a large logging framework for this ticket.

## Required Reading

1. `Backend/src/shared/guards/jwt-auth.guard.ts`
2. `Backend/src/shared/guards/roles.guard.ts`
3. request-ID middleware/interceptor registration
4. existing logging conventions in shared code
5. AUTH-006 final auth lookup flow

## Step-by-Step Implementation

### Step 1 - Inventory auth log calls

Search authentication/authorization files for:

- `logger.debug`
- `logger.log`
- `logger.warn`
- `logger.error`
- `console.`

Create a table in the PR description containing:

- file;
- log purpose;
- current sensitive values;
- replacement fields.

### Step 2 - Never log token material

Review every log around bearer-token extraction and token verification.

Confirm none prints:

- `authorization` header;
- token variable;
- decoded raw JWT;
- Clerk secret.

If any does, remove it immediately.

### Step 3 - Remove email from routine guard logs

Replace messages like:

```text
... email=<address> ...
```

with safe context such as:

```text
reason=AUTH_USER_NOT_PROVISIONED path=<path> requestId=<id>
```

If a local user exists, local `userId` may be included where useful.

### Step 4 - Remove Clerk provider ID from routine logs

Do not emit `verifiedToken.sub` in normal warn/debug output.

If provider correlation is ever required for an incident, use a controlled diagnostic method rather than permanently logging it on every auth request.

### Step 5 - Sanitize provider errors

Current provider calls may log `error.message`.

Review the SDK's possible messages and avoid dumping arbitrary provider response bodies.

Log a stable reason/category and optionally a short safe error class/name.

Do not log stack traces at normal info/warn level if they include request/provider details.

### Step 6 - Preserve useful path/request context

Keep the route/path and add request ID where available.

Use the same request-ID source as the rest of the backend rather than generating a new ID inside the guard.

### Step 7 - Clean `RolesGuard`

Remove email from role-check debug logging.

A role denial can be diagnosed with:

- local user ID;
- current role;
- required roles;
- path/request ID if available.

Do not serialize the entire `request.user` object.

### Step 8 - Check other auth-related guards

Inspect Org/Geography guard logs for accidental full-user/object dumping.

If a one-line safe correction is directly related, include it. If substantial unrelated logging cleanup is needed, document it as a separate finding rather than expanding this ticket indefinitely.

### Step 9 - Keep client errors generic

This ticket is about logs, but while editing auth failures ensure client-facing errors do not disclose secrets or internal provider details.

Do not reveal whether a specific email exists in Clerk.

### Step 10 - Add tests/spy assertions where practical

For representative failure cases, spy on Nest Logger or extracted safe logging helper and verify messages do not contain known test email/token strings.

Do not write brittle tests that assert the entire punctuation of every log message. Test the security-relevant fields/reason code.

### Step 11 - Run a repository secret/PII sanity search

Search changed auth files for:

- `email=${`
- `.email}`
- `clerkUserId=${`
- `authorization`
- `token=${`

Review each match manually; some code references are legitimate, but log formatting must be safe.

### Step 12 - Validate

```bash
npm run typecheck:backend
npm run lint:backend
npm run test:backend
```

## Checkpoint

- [ ] No auth log prints bearer/session token material.
- [ ] Routine auth logs do not print email.
- [ ] Routine auth logs do not print Clerk user ID.
- [ ] Role guard does not dump full user objects.
- [ ] Logs still have actionable reason codes/context.

## Tests Required

At minimum cover:

1. missing token -> reason code present, no token/email;
2. invalid token -> safe reason, no raw token;
3. missing local user -> safe reason, no email/provider ID;
4. inactive/suspended user -> local ID may be present, email absent;
5. role denial -> current/required role context present, email absent;
6. successful auth debug log does not expose email/provider ID.

Use fake values such as `sensitive@example.test` and assert they are absent from captured log output.

## Manual Verification

Run backend locally with debug logging enabled.

Exercise:

- successful admin request;
- missing-token request;
- invalid-token request;
- inactive-user request;
- role-denied request.

Review terminal output and confirm you can diagnose the category without seeing email addresses or credentials.

## Acceptance Criteria

- [ ] Authentication logs use safe reason codes.
- [ ] Routine logs contain no email addresses.
- [ ] Routine logs contain no Clerk IDs unless explicitly approved.
- [ ] No secrets/tokens are logged.
- [ ] RolesGuard no longer logs full identity objects/PII.
- [ ] Operational debugging context remains sufficient.

## Definition of Done

- [ ] Auth log inventory completed.
- [ ] Unsafe fields removed.
- [ ] Tests/spy checks pass where implemented.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Manual log review passes.
- [ ] Reviewer confirms useful-but-minimal logging.

## Rollback

If operators lose needed diagnostics, add a safe internal correlation field such as request ID/local user ID. Do not restore routine email/token logging as the first solution.

## Forbidden Shortcuts

Do not:

- hash tokens and log the hash without a real operational need;
- log full request headers;
- serialize `request.user`;
- move sensitive data from `debug` to `error` and call it fixed;
- hide email inside JSON metadata;
- suppress all auth logs entirely.

## STOP - NEEDS ARCHITECT DECISION

Stop if compliance/incident-response policy explicitly requires a particular identity field in security logs. Document the requirement and agree on retention/access controls instead of independently deleting mandated audit data.

## Completion Record

**Implemented By:**  
**Reviewed By:**  
**PR:**  
**Final Commit:**  
**Completed Date:**  
**Manual Log Review:** Pass / Fail  
**Notes:**