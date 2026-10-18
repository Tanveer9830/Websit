# Security notes

Top Cloud handles accounts, applications and reviewer notes. This document describes the model, the
implementation, what was verified, and the limits you must own as the operator.

---

## Default credentials — read this first

The specification requires the first owner login to be `admin` / `admin`. That is intentional and
only applies to the **first initialization of an empty database**.

Mitigations built into the application:

- The seed runs only when **no owner exists**. Redeploying, migrating, re-seeding or restarting never
  resets the owner password or recreates the account.
- The temporary password is stored only as an Argon2id hash.
- `must_change_password` is `true`; every admin page redirects to `/admin/change-password` and every
  admin API returns `403 PASSWORD_CHANGE_REQUIRED` until the password is replaced.
- The owner password policy is stronger than members' (minimum 10 characters).
- Changing the password revokes all other sessions.
- There is no second backdoor account. Registration always creates `MEMBER`.

**You must still change the password before exposing the panel to the internet.** Do not put a panel
with `admin`/`admin` on a public IP "for a minute".

---

## Threat model

Defended against:

- Credential stuffing and password guessing (Argon2id, throttling, generic errors)
- Session theft via script injection (HttpOnly cookies, React escaping)
- CSRF from other origins (double-submit token + Origin checks)
- IDOR on member applications (server-side ownership checks)
- Privilege escalation by members or limited admins (role and permission checks on every route)
- Malicious form input (Zod validation, length limits, strict option matching)
- SQL injection (parameterized Drizzle queries only)
- Form edits corrupting history (immutable snapshots per submission)
- Reviewer notes leaking to applicants (separate storage and filtering)
- Default-owner takeover after deployment (one-time seed, forced rotation, no reset path)

Not defended against (operator responsibility):

- A compromised host, root shell or database file. Whoever owns the server owns the data; the
  `owner:recover` command exists precisely because shell access is equivalent to account recovery.
- Phishing, malware in the browser, or a compromised email inbox.
- Denial of service at the network layer (use a proxy/CDN with rate limiting).
- An administrator deliberately exfiltrating data they are authorized to read. Audit logs deter and
  record; they do not prevent.
- Backups being stolen. Encrypt and restrict them.
- Vulnerabilities in third-party dependencies. Run `npm audit` and keep Node/Next patched.

---

## Controls

### Passwords

- Argon2id via `@node-rs/argon2` (19 MiB memory, 2 iterations, parallelism 1).
- Members: 8+ characters. Owner/admin: 8+ (owner 10+), with a blocklist of common passwords.
- Never logged, never returned by an API, never included in audit metadata.
- Changing a password invalidates every other session and outstanding reset tokens.
- Login compares against a dummy hash for unknown accounts to reduce timing differences.

### Sessions

- 32-byte random token. Only its SHA-256 hash is stored in `sessions.token_hash`.
- Cookie `tc_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `COOKIE_SECURE=true`,
  with an explicit expiry and a matching server-side expiry (1–30 days).
- Sessions are deleted on logout, password change, "sign out other sessions", admin promotion,
  member disabling and owner recovery.
- Disabled users cannot log in, and existing sessions are rejected on the next request.

### CSRF and origins

- Every state-changing route calls `assertMutation`:
  - requires `Origin` (or `Referer`) to match `APP_URL`, and
  - requires the `x-csrf-token` header to equal the `tc_csrf` cookie using a constant-time compare.
- `tc_csrf` is intentionally readable by JavaScript (double-submit pattern); it contains no secret
  and is useless without the session cookie.
- The middleware seeds `tc_csrf` so a first page load can issue mutations immediately.
- Failed CSRF checks return `403` and do **not** destroy the session (verified by test 17).

### Authorization

- Roles: `OWNER`, `ADMIN`, `MEMBER`.
- Raw permissions live in a JSON column and are parsed defensively:
  `REVIEW_APPLICATIONS`, `MANAGE_QUESTIONS`, `MANAGE_MEMBERS`, `MANAGE_SETTINGS`, `VIEW_AUDIT`.
- `OWNER` implicitly has every permission; `ADMIN` has exactly what the owner granted.
- Member endpoints scope queries by `user_id` from the session, never by an ID in the URL alone.
- Admin pages and APIs reject unauthenticated, non-staff and password-change-pending users.
- The owner cannot be demoted, deleted or disabled through the API, and cannot demote themselves.

### Input & output

- Zod schemas for every request body and query string, plus a 100 kB JSON cap.
- Answers are validated against the **published** form: type, required, length and option membership.
- All SQL is parameterized through Drizzle.
- React escapes all rendered strings. There is no `dangerouslySetInnerHTML`.
- Branding logo URLs must be `http(s)` (validated in settings); they are rendered in an `<img>`, not
  interpolated into HTML.

### Email tokens

- Verification: 24 hours. Password reset: 1 hour.
- Random 32-byte tokens, stored as SHA-256 hashes, single-use (`used_at`).
- Issuing a new token invalidates previous unused tokens of the same type.
- Unknown, expired, used or mismatched tokens produce the same generic error.
- Reset tokens are invalidated by a password change.

### Rate limiting

- Stored in the database (survives restarts, works with multiple processes in principle).
- Login: 8 failures per identifier and 30 per IP per 15 minutes; successful login clears the
  identifier counter. Blocked attempts are audited as `LOGIN_BLOCKED`.
- Application submission: 5 per hour per member.
- Registration, resend-verification and password-reset endpoints are throttled per IP.
- IP addresses are only ever stored as salted SHA-256 pseudonyms in audit/rate-limit rows.

### Audit log

Recorded: bootstrap, login success/failure/block, logout, registration, email verification,
password reset/change, profile changes, application submission, status changes, internal notes,
published feedback, question create/update/delete/reorder/publish, member role changes, member
disabled/enabled, settings changes, owner recovery, session revocation.

Each entry stores actor (nullable for anonymous), action, target type/id, small metadata object,
hashed IP and timestamp. Notes and feedback bodies are not duplicated into metadata. Passwords,
hashes, tokens and cookies are never stored.

Limits, stated honestly: audit rows live in the same SQLite database, so a database administrator can
alter or delete them. There is no append-only/WORM storage. Treat them as strong operational
accountability, not court-grade evidence.

### Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'` in production
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation, payment
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Strict-Transport-Security` (production only)

The app does not ship a full CSP because Next.js's inline hydration bootstrap would require nonces;
adding a nonce-based CSP at the reverse proxy is a reasonable hardening step for high-risk
deployments.

### Error handling

- API errors are `{ error: { code, message, details } }` with stable codes.
- Unexpected exceptions become a generic `500`; details go to the server console only.
- Login never reveals whether a username exists, whether an account is disabled, or whether an email
  is registered.
- Password reset and resend-verification always return the same message.

---

## Verified in this repository (2026-10-18)

- `npm test` → **17/17 passing**, including forced password change, cross-member access denial,
  member status/question escalation attempts, internal-note leakage, owner protection, historical
  snapshot integrity, rate limiting, CSRF and origin rejection.
- `npx tsc --noEmit` → exit `0`.
- `npm run build` → exit `0`.
- Manual smoke test: registration, login, forced password rotation, application submission, member
  pages, every admin page, and `/api/health`.

Not verified here (please verify on your host): real SMTP delivery, HTTPS/TLS, reverse-proxy header
behaviour, backup restore against production data, and behavior under load.

---

## Operator checklist

- [ ] Owner password changed; owner email updated
- [ ] `APP_URL` and `COOKIE_SECURE` correct for HTTPS
- [ ] Port 3000 not reachable from the internet
- [ ] `.env` and `data/` owned by the service user, `600`/`700`
- [ ] Backups scheduled, off-site, tested with a restore drill
- [ ] SMTP configured, or CLI recovery explicitly accepted
- [ ] `/api/health` monitored
- [ ] `npm audit` reviewed after install and on upgrades
- [ ] Audit log reviewed periodically in `/admin/settings` (audit tab)
- [ ] Branding/logo URL points to a trusted host
- [ ] Departed staff have their admin role removed or account disabled promptly

---

## Reporting a vulnerability

If you deploy this project, add your own security contact to this file. For a public repository,
prefer GitHub's private "Report a vulnerability" advisory flow over a public issue.
