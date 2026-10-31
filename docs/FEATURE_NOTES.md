# FEATURE_NOTES.md

**How each backend feature works, written for a beginner.** If you have never touched this codebase,
start here and read one entry end to end — you should be able to add a feature of your own afterwards.

Member A fills in the foundation and finance entries, B the sales and customer entries, C the
warehouse and service entries. Use the template below exactly, so twenty entries read the same way.

### Template

```markdown
## <Feature name>

**What it does** — one paragraph in plain words.
**Who uses it** — which roles, and when.
**Files** — every file involved, with its job.
**Flow** — numbered steps from request to response.
**Example request / response** — real JSON.
**Business rules applied** — BR-xx, and how.
**Common errors** — code, status, meaning, what to do.
```

---

## Authentication (login, logout, me, register, change password)

**What it does.** Signs a user in with an email **or** a 10-digit phone plus a password, and keeps
them signed in for 8 hours. The proof of identity is a JWT, but the browser never sees it as a value
it can read — it is placed in an httpOnly cookie called `sp_token`, which the browser attaches to
every later request on its own. Customers can also create their own account, and anyone can change
their own password.

**Who uses it.** Everyone. Staff sign in with their work email; customers sign in with the phone
number the company already has for them. `GET /auth/me` is called by the React app on every page load
to find out who is signed in.

**Files.**

| File | Job |
|---|---|
| `server/src/modules/auth/auth.routes.js` | The five routes and their middleware (the login route also gets the rate limiter) |
| `server/src/modules/auth/auth.controller.js` | Reads the request, calls one service function, sets or clears the cookie |
| `server/src/modules/auth/auth.service.js` | Checks the password, builds the token, creates customer accounts, writes audit rows |
| `server/src/modules/auth/auth.validation.js` | zod schemas (the password rule lives here) |
| `server/src/middlewares/requireAuth.js` | Reads the cookie on every other request and loads the user |
| `server/src/config/env.js` | Supplies `JWT_SECRET`; refuses to boot without a real one |
| `client/src/app/providers.jsx` | `AuthProvider` — calls `/auth/me` once on load and holds the session |
| `client/src/features/auth/pages/LoginPage.jsx` | The form, with the demo-accounts panel |

**Flow — `POST /auth/login`.**

1. The rate limiter checks this IP has made fewer than 10 attempts in 15 minutes.
2. zod validates `{ identifier, password }`.
3. The service decides whether `identifier` looks like an email or a 10-digit phone, and loads that user.
4. **If no user is found, or the password does not match, it throws the same error either way** —
   `401 INVALID_CREDENTIALS` — so the API never reveals which accounts exist.
5. `bcrypt.compare` checks the password against `passwordHash`.
6. If `isActive` is false → `403 ACCOUNT_DISABLED`.
7. A JWT is signed with `{ sub: user.id, role: user.role }` and an 8-hour expiry. **Nothing secret
   goes in the token** — it is signed, not encrypted, and anyone can decode it.
8. The controller sets the cookie: `httpOnly`, `sameSite=lax`, `secure` in production, `maxAge` 8h.
9. `lastLoginAt` is updated, and the user (never the hash) is returned.

**Flow — every later request.** `requireAuth` reads `req.cookies.sp_token`, verifies the signature,
then **loads the user from the database again** and rejects an inactive one. We do not trust the role
on the token, because then deactivating someone would take up to eight hours to bite.

**Flow — `POST /auth/register`.** A customer signs themselves up with `{ name, phone, email?,
password }`. The service looks for an existing `Customer` row **with that phone**; if it finds one it
links the new login to it, so a customer who enquired three weeks ago keeps their quotes and
projects. If not, it creates the `Customer` too. Both happen in one transaction.

**Example request / response.**

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "identifier": "sales1@sunpower.in", "password": "Demo@1234" }
```

```json
{ "success": true,
  "data": { "user": { "id": "usr_k3f9", "name": "Priya Desai",
                      "email": "sales1@sunpower.in", "phone": null,
                      "role": "SALES_EXECUTIVE" } } }
```

```http
Set-Cookie: sp_token=eyJhbGci…; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800
```

**Business rules applied.** BR-15 (deactivate, never delete — a disabled account is refused but its
history stays). D-01 (cookie, not `localStorage`). `SECURITY.md` section 1 (bcrypt 10 rounds, password
min 8 with a letter and a number) and section 11 (one generic login error).

**Common errors.**

| Code | Status | Meaning | What to do |
|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email/phone **or** wrong password | Show "Email or password is incorrect." Do not hint at which |
| `ACCOUNT_DISABLED` | 403 | `isActive` is false | Ask an admin to reactivate the account |
| `UNAUTHENTICATED` | 401 | No cookie, or it expired | The axios interceptor redirects to `/login` |
| `PHONE_IN_USE` / `EMAIL_IN_USE` | 409 | Register collided with an existing login | Offer to sign in instead |
| `RATE_LIMITED` | 429 | More than 10 login attempts in 15 min | Wait, then retry |

---

## Role-based access control (RBAC) and ownership

**What it does.** Decides, on every single request, whether this user is allowed to do this thing.
It works in **two layers, and both are required**: a role check on the route says *what kind of user*
may call it, and an ownership check inside the service says *whose rows* they may see. Skipping the
second layer is the classic bug where any signed-in customer can read every other customer's
invoices by changing an id in the URL.

**Who uses it.** Every endpoint. The role lists in `API_CONTRACTS.md` are the source of truth, and
the code must match them exactly.

**Files.**

| File | Job |
|---|---|
| `server/src/middlewares/requireAuth.js` | Puts the real, current user on `req.user` |
| `server/src/middlewares/requireRole.js` | Layer 1 — rejects a role that is not on the list |
| each module's `*.service.js` | Layer 2 — forces the ownership filter |
| `client/src/routes/RoleRoute.jsx` | Hides the screen from the wrong role (cosmetic only) |
| `client/src/routes/roleHome.js` | Where each role lands after signing in |

**Flow.**

1. `requireAuth` loads the user. No session → `401 UNAUTHENTICATED`.
2. `requireRole('WAREHOUSE_MANAGER')` compares `req.user.role` against the list.
   Not on it → `403 FORBIDDEN`. The role is read from `req.user` — **never** from the body, a header
   or a query parameter, which a caller controls.
3. The service applies the ownership rule (BR-16):

```js
// A customer's scope is FORCED, not filtered. They cannot widen it with a query parameter.
const where = user.role === 'CUSTOMER'
  ? { ...filters, customerId: user.customerId }
  : filters;
```

4. For a single row, the service loads it and compares before returning:

```js
if (user.role === 'CUSTOMER' && project.customerId !== user.customerId) {
  throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project.');
}
```

**The ownership rules in full.**

| Role | Sees |
|---|---|
| `CUSTOMER` | Only rows where `customerId` is their own |
| `SURVEY_TECHNICIAN` | Only surveys where `technicianId` is their own user id |
| `INSTALLATION_TECHNICIAN` | Only jobs where they are on the `InstallationCrew`, and tickets assigned to them |
| Staff roles | Company-wide, but only within the endpoints their role is listed on |

**Field-level.** `costPrice`, `unitCost`, margin and profit are never returned to a `CUSTOMER` or a
`SALES_EXECUTIVE`. The service uses a different Prisma `select` per role rather than deleting keys
afterwards.

**Example.** A customer calling someone else's project:

```http
GET /api/v1/projects/prj_other   Cookie: sp_token=<customer session>
```

```json
{ "success": false,
  "error": { "code": "FORBIDDEN", "message": "You do not have access to this project." } }
```

**Business rules applied.** BR-16 (ownership on every read and write). `SECURITY.md` section 7.

**Common errors.**

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Signed in, but the wrong role **or** not their row |
| `NOT_FOUND` | 404 | Used instead of 403 where admitting the row exists would itself leak (another user's notification, an unknown share token) |

**The mistake to avoid.** `requireRole('CUSTOMER')` on its own is **not** access control — it lets
*every* customer through. The service must still scope to `user.customerId`. The route check and the
service check do different jobs, and you need both.

---

## File uploads

**What it does.** Accepts photos, signatures and PDF documents, stores them on local disk under a
random name, and records an `Attachment` row pointing at the file. Used for survey photos, roof
photos, the customer's signature, subsidy paperwork and purchase invoices.

**Who uses it.** `SURVEY_TECHNICIAN` (survey photos), `INSTALLATION_TECHNICIAN` (roof photos and the
signature), `SALES_EXECUTIVE` / `DIRECTOR` (subsidy documents), `WAREHOUSE_MANAGER` (purchase invoices).

**Files.**

| File | Job |
|---|---|
| `server/src/core/upload.js` | The multer configuration, the whitelist, and `saveAttachment()` |
| `server/src/app.js` | Serves `/uploads` read-only with `express.static` |
| `server/uploads/` | Where files land. **Gitignored** |
| `server/src/config/env.js` | `UPLOAD_DIR` |
| `client/src/components/ui/FileDropzone.jsx` | Drag-and-drop, previews, per-file progress and errors |

**Flow.**

1. The route adds the multer middleware: `upload.array('files', 10)`.
2. For each file multer checks the **MIME type and the extension** — both must be on the whitelist
   (`jpg`, `jpeg`, `png`, `webp`, `pdf`). A `.exe` renamed to `.jpg` fails here, because its MIME type
   gives it away.
3. Size is capped at **5 MB** per file, 10 files per request.
4. **The filename is thrown away.** multer writes the file as
   `crypto.randomBytes(16).toString('hex')` plus the validated extension. This is what closes the
   path-traversal hole: a name like `../../server/src/app.js` never reaches the filesystem. The
   original name is kept in `Attachment.fileName` purely so the UI can display it.
5. The service calls `saveAttachment()` **inside the same transaction** as the parent change, so a
   file on disk with no row (or a row with no parent) cannot happen. An orphan file would otherwise
   count toward BR-10's three-photo requirement.
6. `Attachment` is **polymorphic**: `entityType` (`SURVEY` | `INSTALLATION` | `TICKET` | `SUBSIDY` |
   `PURCHASE` | `PROJECT`) plus `entityId`. There is no database foreign key, so the service must
   confirm the target row exists first.
7. The response returns `fileUrl` (`/uploads/<random>.webp`), which the client renders directly.

**Signatures** arrive as a `data:image/png;base64,…` string, not a file. The service validates the
prefix, caps the decoded size, and writes it through the same random-name path with
`kind = SIGNATURE`.

**Example request / response.**

```http
POST /api/v1/installations/job_7/photos
Content-Type: multipart/form-data; boundary=…

files: roof-finished.jpg (2.1 MB)
files: inverter-wall.jpg (1.4 MB)
```

```json
{ "success": true,
  "data": { "attachments": [
      { "id": "att_91", "fileUrl": "/uploads/8f2c1d94ab7e05f3.jpg",
        "fileName": "roof-finished.jpg", "mimeType": "image/jpeg",
        "sizeBytes": 2201344, "kind": "PHOTO" } ],
    "photoCount": 3 } }
```

`photoCount` is returned so the UI can show "3 of 3 photos" against BR-10.

**Business rules applied.** BR-10 (at least 3 `PHOTO` attachments before an installation can be
completed — counted from this table). D-04 (local disk, random names). `SECURITY.md` section 8.

**Common errors.**

| Code | Status | Meaning |
|---|---|---|
| `INVALID_FILE_TYPE` | 422 | Not jpg/png/webp/pdf, or the MIME type and extension disagree |
| `FILE_TOO_LARGE` | 422 | Over 5 MB |
| `TOO_MANY_FILES` | 422 | More than 10 in one request |
| `NOT_FOUND` | 404 | The parent survey / job / ticket does not exist |
| `FORBIDDEN` | 403 | Not the assigned technician (BR-16) |

**Known limitation.** Files are served without an authorization check — anyone with the URL can fetch
one. The 128-bit random name makes guessing infeasible, which is adequate for the demo; production
would put these behind a signed URL. Recorded in `SECURITY.md` section 8.

---

## Notifications

**What it does.** The in-app bell. Because we have no SMS or WhatsApp integration (out of scope), a
notification is a row in the `Notification` table with a title, a body and a link. The bell in the
topbar polls an unread count every 30 seconds and shows a dot; the dropdown lists the last ten.

**Who uses it.** Everyone receives them. They are created by **listeners**, not by user action — a
new enquiry notifies sales, a confirmed order notifies the warehouse, a scheduled install notifies
the crew and the customer.

**Files.**

| File | Job |
|---|---|
| `server/src/core/notify.js` | `notifyUsers()` and `notifyRole()` — the only way notifications are created |
| `server/src/modules/notifications/*` | The four read/mark endpoints |
| each module's `*.listeners.js` | Calls `notify*` when its event fires |
| `client/src/components/layout/NotificationBell.jsx` | The bell, the polling, the dropdown |

**Flow — creating one.** A listener calls one of two helpers. Neither throws into the request that
triggered it — a notification failure must never fail a business action:

```js
// Everyone in a role — used when nobody owns the item yet
await notifyRole('WAREHOUSE_MANAGER', {
  title: `${project.code} confirmed — pick list ready`,
  body: `${project.capacityKw} kW ${project.systemType} for ${customer.name}, ${customer.city}.`,
  link: `/warehouse/dispatches/${dispatch.id}`,
});

// Specific people — used when the item has an assignee
await notifyUsers([technicianId], { title, body, link });
```

`notifyRole` resolves to **active users only**, so a deactivated account stops receiving work.
Both helpers use `createMany`, so notifying nine people is one query.

**Flow — reading them.**

1. The bell calls `GET /notifications/unread-count` every 30s → `{ count: 3 }`.
2. Opening the dropdown calls `GET /notifications?page=1&pageSize=10`.
3. Clicking one calls `PATCH /notifications/:id/read`, then navigates to `link`.
4. "Mark all as read" calls `PATCH /notifications/read-all` → `{ updated: 7 }`.

Every one of these is **scoped to the caller's own rows** — there is no parameter that could point at
someone else's notifications, and asking for another user's id returns `404`, not `403`, so its
existence is not confirmed.

**Example request / response.**

```http
GET /api/v1/notifications?page=1&pageSize=10
```

```json
{ "success": true,
  "data": [
    { "id": "ntf_31", "title": "PRJ-2026-0007 confirmed — pick list ready",
      "body": "3 kW ON_GRID for Vipul Mehta, Hyderabad.",
      "link": "/warehouse/dispatches/dsp_7", "isRead": false,
      "createdAt": "2026-10-31T06:12:44.000Z" } ],
  "meta": { "page": 1, "pageSize": 10, "total": 24 } }
```

**Business rules applied.** BR-16 (own rows only). BR-15 (inactive users are skipped).
Out-of-scope note in `PRD.md` section 8 — this is the stand-in for SMS and WhatsApp.

**Common errors.**

| Code | Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such notification **for this user** |

**Copy tone.** A notification title names the record and the thing that happened:
"PRJ-2026-0007 confirmed — pick list ready". Not "You have a new notification!" (`DESIGN.md`
section 13).

---

## The event bus

**What it does.** Lets one module cause an effect in another without importing it. When sales
confirms an order, a dispatch, an installation job, an invoice and a subsidy file all have to appear —
owned by three different developers. Instead of `projects.service.js` calling all of them, it
announces a fact (`project.confirmed`) and the modules that care listen for it.

**Who uses it.** Services emit; listeners react. No controller ever emits, and no controller ever
calls a listener.

**Files.**

| File | Job |
|---|---|
| `server/src/core/events.js` | `emitEvent()`, `onEvent()`, `registerListeners()` |
| `server/src/server.js` | Calls `registerListeners()` once at boot, before listening |
| each module's `*.listeners.js` | That module's subscriptions |
| `docs/API_CONTRACTS.md` section 5 | The full event table — payloads, emitters, listeners, owners |

**Flow.**

1. A service does its work inside `prisma.$transaction` and gets the result back.
2. **After the transaction has committed**, it emits:

```js
const project = await prisma.$transaction(async (tx) => { … });

// AFTER the commit — a listener that loads this project must find it there
emitEvent('project.confirmed', { projectId: project.id });
```

3. `emitEvent` logs the event and hands the payload to every registered listener.
4. Each listener runs independently, wrapped in its own try/catch. One that throws is **logged and
   swallowed**; the others still run, and the HTTP request that triggered the event still returns 200.
5. A listener fetches what it needs by id and calls **its own module's** service functions.

**The five rules that make this safe.**

| # | Rule | Why |
|---|---|---|
| 1 | **Emit after the commit, never inside `$transaction`** | A listener reading the row must find it. Emitting inside means the listener may run before the data is visible, or may act on work that then rolls back |
| 2 | **Payloads carry ids only** — `{ projectId }`, not a loaded object | The listener fetches current data. A passed-in object is stale the moment another listener changes it |
| 3 | **Listeners live in the owning module** and only call that module's services | This is the whole point: Member B's code never reaches into Member C's |
| 4 | **Listeners are independent and must not throw** into the request | A notification failure must not undo a confirmed order |
| 5 | **If it must be atomic with the trigger, it is not a listener** | Warranty creation on delivery (BR-09) happens *inside* the delivery transaction. `dispatch.delivered` only sends notifications |

**Example — one event, five listeners.** `project.confirmed { projectId }`:

| Listener | Owner | Does |
|---|---|---|
| `dispatches.listeners` | C | Creates the `Dispatch` (`PENDING`) + one `DispatchLine` per quote item, reserves stock (BR-06) |
| `installations.listeners` | C | Creates the `InstallationJob` (`UNSCHEDULED`) (BR-06) |
| `invoices.listeners` | A | Creates the `PROFORMA` invoice |
| `subsidies.listeners` | A | Creates the `SubsidyApplication` if `subsidyEligible` |
| `dispatches.listeners` | C | Notifies every `WAREHOUSE_MANAGER` |

**Registering.** `registerListeners()` imports every `modules/*/\*.listeners.js` that exists and runs
its default export once, at boot. A module with no listeners file simply has none.

**Business rules applied.** BR-06 (auto-created pick list and install job). BR-09 (the exception —
done in the transaction, not a listener). BR-11 (`ticket.billable` → service invoice;
`ticket.closed` → warranty expense). D-02.

**Common errors.** Events have no HTTP surface, so they return no error codes. Failures appear in the
log as `event listener failed` with the event name, the payload and the stack. If a side effect did
not happen, **look in the server log first** — the request will have returned 200 regardless.

**The mistakes to avoid.**

- Emitting inside the transaction (rule 1) — the most common and the hardest to debug.
- Passing a whole object in the payload (rule 2).
- Putting a listener in the *emitting* module instead of the *owning* one — it compiles, and it
  recreates exactly the coupling the bus exists to prevent.
- Relying on an event for something that must be atomic (rule 5).

---

## Settings

**What it does.** Holds every rate and company detail the business runs on, as key/value rows, so no
percentage is ever hard-coded. Changing `advancePercent` from 30 to 50 changes the order-confirmation
gate on the very next request — no deploy, no restart.

**Who uses it.** Written by `SUPER_ADMIN` only. Read by **every** staff role and by most services:
quotes read `defaultTaxPercent` and `quoteValidityDays`, project confirmation reads `advancePercent`,
ticket billing reads `labourRatePerHour` and `serviceVisitCharge`, the PDF helper reads `company`,
the cron job reads `warrantyExpiryAlertDays`.

**Files.** `server/src/modules/settings/*` (the two endpoints and the strict zod schema),
`server/prisma/seed.js` (seeds all eight keys), `server/src/core/pdf.js` (reads `company`).

**Flow.**

1. `GET /settings` reads every `Setting` row and returns one flat object.
2. A service that needs a rate calls the settings service, **never a literal**:

```js
const { advancePercent } = await getSettings();
const required = mul(quote.total, div(advancePercent, 100));   // BR-05
```

3. `PUT /settings` validates the body with a **`.strict()`** schema — an unknown key is rejected
   rather than silently ignored, so a typo like `advancePercentage` fails loudly instead of leaving
   the gate at its old value.
4. The change is written with an `AuditLog` row carrying before and after (BR-18), because these
   values decide what every customer is charged.

**The eight keys.**

| Key | Seeded | Used by |
|---|---|---|
| `company` | name, GSTIN, Hyderabad address, phone, email | PDF headers, public footer |
| `advancePercent` | `30` | BR-05 |
| `defaultTaxPercent` | `18` | Quote and invoice tax |
| `labourRatePerHour` | `450` | BR-11, labour cost |
| `serviceVisitCharge` | `500` | BR-11 |
| `quoteValidityDays` | `15` | `Quote.validUntil`, the expiry cron |
| `surveySlaHours` | `48` | Survey SLA flag |
| `warrantyExpiryAlertDays` | `30` | Warranty alert cron |

**Example.**

```http
PUT /api/v1/settings
{ "advancePercent": 50 }
```

```json
{ "success": true, "data": { "advancePercent": 50, "defaultTaxPercent": 18, "…": "…" } }
```

**Business rules applied.** BR-14 (tax and rates come from settings, never hard-coded).
BR-05 (`advancePercent` is the gate). BR-18 (audited).

**Common errors.**

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | An unknown key, or a value out of range (a percentage must be 0–100) |
| `FORBIDDEN` | 403 | Not `SUPER_ADMIN` |

---

## Human-readable codes (`nextCode`)

**What it does.** Produces the short codes people say on the phone and write on cartons —
`ENQ-2026-0001`, `QT-2026-0004`, `PRJ-2026-0007`, `DSP-2026-0007`, `TKT-2026-0031`,
`INV-2026-0012` — from a `Counter` table, **inside the same transaction** as the row being created.

**Who uses it.** Every service that creates a numbered record: leads, quotes, projects, dispatches,
tickets, invoices, purchases.

**Files.** `server/src/core/codes.js`, `server/tests/codes.test.js`.

**Flow.**

1. The service opens a transaction.
2. It calls `nextCode('PRJ', tx)` — **always with `tx`**, never the global `prisma`.
3. `nextCode` upserts and increments the `Counter` row for `PRJ-2026`. Because this happens inside
   the transaction, Postgres holds a lock on that row, so two simultaneous requests cannot read the
   same value.
4. The number is formatted as `PREFIX-YEAR-0000`, padded to four digits (and simply growing past
   `9999`).
5. The record is created with that code in the same transaction. If anything later in the transaction
   fails, **the counter rolls back too** — so a failed quote does not burn a number.

```js
const project = await prisma.$transaction(async (tx) => {
  const code = await nextCode('PRJ', tx);          // "PRJ-2026-0007"
  return tx.project.create({ data: { code, quoteId, customerId, status: 'AWAITING_ADVANCE' } });
});
```

**Business rules applied.** BR-17 (codes generated from `Counter` inside the transaction, so numbers
never collide and never skip). D-12.

**Common errors.** None of its own. The mistake to avoid is calling it with the global `prisma`
instead of `tx` — it will appear to work, and then two orders confirmed in the same second will get
the same project code.

---

## Errors and responses

**What it does.** Gives every endpoint in the system one success shape and one error shape, so the
React app can handle any response without special cases, and so the UI can branch on a stable error
**code** rather than matching on message text.

**Files.** `server/src/core/AppError.js`, `server/src/core/asyncHandler.js`,
`server/src/core/response.js`, `server/src/middlewares/errorHandler.js`,
`client/src/lib/api.js` (unwraps both shapes).

**Flow.**

1. A service throws when something is wrong — it never returns `{ error }`:

```js
throw new AppError(409, 'ADVANCE_NOT_RECEIVED', 'Advance payment not received.', {
  required: '54000.00', paid: '5000.00', shortfall: '49000.00',
});
```

2. `asyncHandler` wraps every route handler, so a thrown error in an `async` function reaches Express
   instead of becoming an unhandled rejection. **Every** async handler is wrapped; controllers have
   no `try/catch`.
3. `errorHandler` renders it, and maps the errors that are not ours:
   - `ZodError` → `422 VALIDATION_ERROR` with the failing fields in `details`
   - Prisma `P2002` → `409 DUPLICATE`, `P2025` → `404 NOT_FOUND`
   - anything else → `500 INTERNAL_ERROR`, logged with its stack, with a generic message to the client
4. The stack is included in the response **only** when `NODE_ENV !== 'production'`.
5. Success responses go through `ok()` / `created()` — never a hand-written `res.json`.

**The two shapes.**

```json
{ "success": true, "data": { } }
{ "success": true, "data": [ ], "meta": { "page": 1, "pageSize": 20, "total": 128 } }
{ "success": false, "error": { "code": "…", "message": "…", "details": { } } }
```

**Money is a string** (`"142500.00"`), not a number, so `Decimal` precision survives the API
boundary (BR-14, D-08). The client formats it and never does arithmetic on it.

**Business rules applied.** BR-14 (money as a string). `RULES.md` sections 5 and 6.
`SECURITY.md` section 11 (no stack traces, no raw Prisma messages, deliberate 404s).

**Error message tone.** Name the specific thing and what to do:
`Serial INV-SG5K-2024-00318 is already on project PRJ-2026-0003.`
Never `Something went wrong.` (`DESIGN.md` section 13.)


---

## Users management (SUPER_ADMIN)

**What it does.** Allows the Super Admin to onboard new staff, update contact details, change roles, configure technician hourly rates, reset passwords, and toggle active status. Accounts are deactivated, never deleted (BR-15).

**Who uses it.** `SUPER_ADMIN` to manage users and access control; `SALES_EXECUTIVE`, `WAREHOUSE_MANAGER`, and `SUPPORT_EXECUTIVE` to fetch active technician assignment lists (`GET /users/technicians`).

**Files.**
- `server/src/modules/users/users.routes.js`
- `server/src/modules/users/users.controller.js`
- `server/src/modules/users/users.service.js`
- `server/src/modules/users/users.validation.js`
- `client/src/features/admin/pages/UsersPage.jsx`

**Flow — `PATCH /api/v1/users/:id/status`.**
1. Validates that the target is not the caller deactivating their own account (`409 CANNOT_DISABLE_SELF`).
2. If target is a `SUPER_ADMIN`, verifies that at least one other active `SUPER_ADMIN` remains (`409 LAST_SUPER_ADMIN`).
3. Updates `isActive` within a transaction.
4. Writes an immutable audit row (`AUDIT.USER_STATUS_CHANGED`).

**Example request / response — `POST /api/v1/users`.**
```json
// Request
{
  "name": "Kiran Kumar",
  "email": "kiran.k@sunpower.in",
  "phone": "9848055555",
  "role": "INSTALLATION_TECHNICIAN",
  "hourlyRate": 300
}

// Response (201)
{
  "success": true,
  "data": {
    "user": {
      "id": "cmvw88x0001",
      "name": "Kiran Kumar",
      "email": "kiran.k@sunpower.in",
      "phone": "9848055555",
      "role": "INSTALLATION_TECHNICIAN",
      "isActive": true,
      "hourlyRate": "300.00",
      "lastLoginAt": null,
      "createdAt": "2026-10-31T09:30:00.000Z"
    }
  }
}
```

**Business rules applied.** BR-15 (deactivation, never deletion), BR-18 (audit logging).

---

## Kit templates & Bills of Materials (SUPER_ADMIN)

**What it does.** Defines standardised solar kit packages (e.g., 1–5 kW On-Grid and Off-Grid systems) with predefined component lists (panels, inverters, structures, cables, accessories). When quotes are created, this Bill of Materials (BOM) automatically populates the quote line items (BR-04).

**Who uses it.** `SUPER_ADMIN` to configure standard kits and base prices; `SALES_EXECUTIVE` to select standard packages during quoting; public catalog for package browsing.

**Files.**
- `server/src/modules/kit-templates/kit-templates.routes.js`
- `server/src/modules/kit-templates/kit-templates.controller.js`
- `server/src/modules/kit-templates/kit-templates.service.js`
- `server/src/modules/kit-templates/kit-templates.validation.js`
- `client/src/features/admin/pages/KitTemplatesPage.jsx`

**Flow — `PUT /api/v1/kit-templates/:id/items`.**
1. Validates that product IDs are distinct (no duplicate products permitted in a kit).
2. Verifies each product exists in the `Product` catalog.
3. Replaces all items atomically in a transaction.
4. Calculates material cost, sell price, and gross margin percentage.
5. Writes an audit row (`AUDIT.KIT_TEMPLATE_UPDATED`).

**Example request / response — `PUT /api/v1/kit-templates/:id/items`.**
```json
// Request
{
  "items": [
    { "productId": "prod_panel_540", "quantity": 6, "notes": "East/West split" },
    { "productId": "prod_inv_3kw", "quantity": 1, "notes": "String inverter" }
  ]
}

// Response (200)
{
  "success": true,
  "data": {
    "id": "kt_3kw_ongrid",
    "name": "3 kW On-Grid",
    "systemType": "ON_GRID",
    "capacityKw": 3,
    "basePrice": 165000,
    "totalCost": 95000,
    "bomSellTotal": 140000,
    "marginPercent": 42.42,
    "items": [
      {
        "id": "item_1",
        "productId": "prod_panel_540",
        "quantity": 6,
        "product": { "sku": "PNL-540", "name": "Mono PERC 540 Wp Panel", "sellPrice": 15000 }
      }
    ]
  }
}
```

**Business rules applied.** BR-04 (BOM auto-generation), BR-14 (dynamic pricing).
