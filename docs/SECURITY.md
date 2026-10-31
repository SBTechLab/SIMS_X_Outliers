# SECURITY.md

The system holds customer addresses, phone numbers, money and twenty-year warranty records. These
rules are not optional, and none of them are expensive to follow.

---

## 1. Passwords

- **bcrypt, 10 rounds.** `bcryptjs`, `hashSync`/`compare`. Never MD5, SHA, or a hand-rolled salt.
- `passwordHash` is **never** selected into an API response. Prisma `select` lists are explicit on
  every user query; there is no `findMany()` that returns the whole `User` row to the client.
- **Password rules** (identical on client and server, from one zod schema):
  minimum **8 characters**, at least **one letter and one number**.
  `z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/)`
- Password changes verify the current password first, then rehash, then write an `AuditLog` row.
- An admin reset (`POST /users/:id/reset-password`) sets a new password and is audited. It does not
  reveal the old one, because we cannot.
- Seed passwords (`Demo@1234`) are for the demo database only and are documented in `DATABASE.md`.
  Never ship them to anything real.

---

## 2. Sessions and JWT

- The token lives in an **httpOnly cookie named `sp_token`** — never in `localStorage`,
  `sessionStorage` or a response body (D-01). JavaScript cannot read it, so an XSS bug cannot steal
  the session.

```js
res.cookie('sp_token', token, {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,   // 8 hours
  path: '/',
});
```

- `sameSite=lax` blocks cross-site POSTs, which is our CSRF defence for a cookie-auth API with a
  single known frontend origin. **Do not relax it to `none`** without adding CSRF tokens.
- `secure` is on in production, so the cookie never travels over plain HTTP.
- **8-hour expiry.** The JWT payload carries only `{ sub, role }` — no name, no email, no permissions
  list. It is signed, not encrypted; nothing secret goes in it.
- `JWT_SECRET` must be at least 32 characters; `config/env.js` refuses to boot otherwise.
- **`requireAuth` re-reads the user from the database on every request** and rejects
  `isActive === false`. Deactivating a user or changing a role takes effect on the next request, not
  in eight hours. The role on the token is never trusted on its own.
- Logout clears the cookie with the same options it was set with.

---

## 3. HTTP hardening

- **`helmet()`** on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, HSTS in production. `crossOriginResourcePolicy` is relaxed only for
  `/uploads` so the client can display images.
- **CORS is an allow-list**, built from `CLIENT_URL` (comma-separated), with `credentials: true`.

```js
const allowed = env.CLIENT_URL.split(',').map((s) => s.trim());
cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin))
    ? cb(null, true)
    : cb(new AppError(403, 'CORS_BLOCKED', 'Origin not allowed.')),
  credentials: true,
});
```

  **There is no `origin: true` and no `*` anywhere.** With `credentials: true` a wildcard would be
  both invalid and dangerous.
- JSON body limit **2 MB**; file uploads are bounded separately by multer.
- `x-powered-by` disabled.
- `trust proxy` set in production so rate limits and audit IPs see the real client address.

---

## 4. Rate limiting

`express-rate-limit`, applied where an attacker gets the most value:

| Route | Limit | Why |
|---|---|---|
| `POST /auth/login` | 10 per 15 min per IP | Credential stuffing and brute force |
| `POST /auth/register` | 5 per hour per IP | Fake account creation |
| `POST /public/enquiries` | 5 per hour per IP | The one unauthenticated write — spam and lead-table flooding |
| `GET /public/reports/:token` | 30 per hour per IP | Token guessing |

Exceeded → `429 RATE_LIMITED` in the standard error envelope. Limits are keyed by IP; add the
`identifier` to the login key if abuse appears.

---

## 5. Input validation

- **Every** request body, path parameter and query string is validated with **zod** before it reaches
  a controller. A route that takes user input without `validate()` is a bug (`RULES.md` section 4).
- Enums are validated against the exact Prisma enum values — never a free `z.string()` where a status
  belongs.
- Every free-text field is `.trim()`ed and has a `.max()`, so nothing unbounded reaches the database.
- Numeric query parameters are coerced with explicit `.min()`, `.max()` and `.default()`;
  `pageSize` is capped at 100 so a list cannot be used to dump the database.
- Settings updates use `.strict()` — an unknown key is rejected rather than silently ignored.
- **The client mirrors every rule with the same zod schema; the server is the only enforcement point.**

---

## 6. SQL injection

- **Prisma only.** No `$queryRawUnsafe`, no `$executeRawUnsafe`, no string-built SQL anywhere.
- If a raw query ever becomes genuinely necessary, it must use the tagged-template form
  (`prisma.$queryRaw\`SELECT … WHERE id = ${id}\``), which parameterises — and it is a
  **stop-and-ask** before merging.
- Search uses Prisma `contains` with `mode: 'insensitive'`, not interpolated `LIKE`.

---

## 7. Authorization

Two layers, both required. **Neither one alone is enough.**

### Layer 1 — role (`requireRole`)

Every route declares its roles, matching `API_CONTRACTS.md` exactly:

```js
router.post('/:id/confirm',
  requireRole('SALES_EXECUTIVE', 'DIRECTOR'),
  validate({ params: v.idParam }),
  asyncHandler(controller.confirm));
```

A route with no `requireRole` is only acceptable when it is genuinely for every signed-in user
(`/auth/me`, `/notifications`, `/settings` read).

### Layer 2 — ownership (in the service, BR-16)

A role check says *what kind* of user you are; it does not say *whose data* this is. The service
checks the row:

| Role | Scope |
|---|---|
| `CUSTOMER` | Only rows where `customerId === user.customerId`. Enforced by **forcing** the filter, not by trusting a query parameter. |
| `SURVEY_TECHNICIAN` | Only surveys where `technicianId === user.id`. |
| `INSTALLATION_TECHNICIAN` | Only jobs where they are on the `InstallationCrew`, and tickets where `assignedToId === user.id`. |
| Staff | Company-wide within their role's endpoints. |

```js
// Forced, not filtered: a customer cannot widen their own scope with a query parameter.
const where = user.role === 'CUSTOMER'
  ? { ...filters, customerId: user.customerId }
  : filters;
```

**Test case that must pass:** a signed-in `CUSTOMER` requesting another customer's project,
quote, invoice, ticket or serial gets **`403 FORBIDDEN`** — never the data, and never a 200 with an
empty object. See `TESTING.md`.

### Field-level

- `costPrice`, `unitCost`, margin and profit figures are **never** returned to a `CUSTOMER` or a
  `SALES_EXECUTIVE`. Service select lists differ by role.
- A `CUSTOMER` never receives another user's email, phone or internal notes.
- `GET /search` returns only the groups permitted for the caller's role, and is refused outright for
  a `CUSTOMER`.

---

## 8. File uploads

`core/upload.js`, multer with disk storage (D-04):

| Control | Value |
|---|---|
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| Allowed extensions | `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf` — **both** the MIME type and the extension must match |
| Max size | **5 MB** per file |
| Max files | 10 per request |
| Filename | **Randomly generated** — `crypto.randomBytes(16).toString('hex')` + the validated extension. The original name is stored in `Attachment.fileName` for display only, never used on disk |
| Destination | `UPLOAD_DIR` (default `./uploads`), outside the web root, gitignored |
| Serving | `express.static` at `/uploads`, **read-only**, with `index: false`, `dotfiles: 'deny'` and no directory listing |

- The user-supplied filename is **never** used to build a path — that is the whole path-traversal
  class of bug, closed by construction.
- Uploads are **not executable**: the folder serves static files only; there is no interpreter
  mapped to it.
- Rejections return `422 INVALID_FILE_TYPE` or `422 FILE_TOO_LARGE`, naming the file.
- `saveAttachment()` writes the `Attachment` row in the same transaction as the parent change, so an
  orphan file never counts toward BR-10's three-photo requirement.
- Signature data URLs are decoded, their `image/png` prefix validated, size-capped, and written
  through the same random-name path.

**Known limitation (hackathon scope):** uploaded files are served without an authorization check —
anyone with the random URL can fetch them. The names are unguessable (128 bits), which is adequate
for the demo. Production would move these behind a signed-URL or authenticated-proxy route.

---

## 9. Secrets

- **Nothing secret is committed.** `.env` is in `.gitignore`; only `.env.example` with placeholder
  values is tracked.
- `JWT_SECRET` has no default. The server **refuses to boot** without a valid one — there is no
  "dev fallback secret" that could reach production.
- Secrets are never logged, never returned in an error, and never sent to the client.
- `DATABASE_URL` appears only in `config/env.js`; a connection error is logged without the URL.
- Before any public demo, rotate `JWT_SECRET` and change every seeded password.

---

## 10. Audit log

`core/audit.js` → `logAudit({ userId, action, entityType, entityId, before, after, ip })`.
Written inside the same transaction as the change, so an audited action and its record succeed or
fail together.

**Audited actions (BR-18):**

| Action | Why it matters |
|---|---|
| `USER_ROLE_CHANGED` | Privilege escalation is the single most sensitive change in the system |
| `USER_STATUS_CHANGED` | Account activation / deactivation |
| `USER_PASSWORD_RESET`, `PASSWORD_CHANGED` | Account takeover trail |
| `SETTINGS_UPDATED` | `advancePercent`, tax and labour rates change what everyone is charged |
| `PRODUCT_PRICE_CHANGED` | `costPrice` / `sellPrice` move margin |
| `QUOTE_DISCOUNT_CHANGED`, `QUOTE_PRICE_OVERRIDDEN` | The usual place money leaks |
| `PAYMENT_RECORDED` | Money in, recorded by hand (D-05) |
| `INVENTORY_ADJUSTED` | Stock written up or down without a purchase |
| `SERIAL_OVERRIDDEN` | Any manual change to a serial's status or project |
| `TICKET_BILLING_DECIDED` | Free vs. chargeable is a money decision (BR-11) |
| `PROJECT_CANCELLED` | Releases stock and deletes the install job |
| `REPORT_SHARED` | Company financials given a public URL |

`before` and `after` hold the changed fields only, as JSON — never a whole row, and never a
`passwordHash`. The log is **append-only**: there is no update or delete endpoint for it, and only
`SUPER_ADMIN` and `DIRECTOR` can read it.

---

## 11. Error handling and information disclosure

- **One generic login error.** A wrong email and a wrong password both return
  `401 INVALID_CREDENTIALS` with "Email or password is incorrect." — the API never reveals which
  accounts exist.
- **No stack traces in production.** `errorHandler` includes `stack` only when
  `NODE_ENV !== 'production'`; the stack is always logged server-side with the request id.
- Unexpected errors return a generic `500 INTERNAL_ERROR` message. Prisma errors are mapped
  (`P2002` → `409 DUPLICATE`, `P2025` → `404 NOT_FOUND`) and never passed through raw — a raw Prisma
  message leaks column and constraint names.
- `404` is used deliberately instead of `403` where confirming existence would itself leak: another
  user's notification, an unknown or expired share token.
- Error `details` carry business context (which lines are short, which fields failed) — never SQL,
  file paths or internal ids the caller should not have.

---

## 12. Data retention and deletion

- **Nothing meaningful is hard-deleted.** Users and products are deactivated (`isActive = false`,
  BR-15); leads are marked `LOST` with a reason and never removed (BR-01); projects are `CANCELLED`.
  A twenty-year warranty needs a twenty-year record.
- Hard deletes exist only for genuinely dependent child rows that are replaced wholesale — quote
  items, kit template items, dispatch lines, installation crew (see `DATABASE.md` section 4).
- The audit log and `TimeLog` rows are never edited after the fact; a correction is a new row.

---

## 13. Pre-demo security checklist

- [ ] `.env` is not committed; `git log --all -- '**/.env'` is empty
- [ ] `JWT_SECRET` is a fresh 32+ character random string
- [ ] Every seeded password changed if the demo is public-facing
- [ ] `NODE_ENV=production` on any deployed instance (so `secure` cookies and no stack traces)
- [ ] `CLIENT_URL` lists exactly the real frontend origin — no wildcard
- [ ] Every route has `requireRole` or a deliberate, documented reason not to
- [ ] Every service with a `customerId` or `technicianId` scope forces the filter (BR-16)
- [ ] No `console.log` of a request body, a token or a password
- [ ] A `CUSTOMER` session cannot reach a staff route (403) — verified, not assumed
- [ ] Uploads reject a `.exe` renamed to `.jpg` (MIME **and** extension are both checked)
- [ ] `npm audit` reviewed on both workspaces
