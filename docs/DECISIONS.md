# DECISIONS.md

ADR-lite. One row per decision that someone could reasonably have made differently. If you make a
decision and do not record it here, the next session will undo it.

**Format:** ID · Date · Decision · Why · Alternatives considered.

---

## D-01 — JWT in an httpOnly cookie, not localStorage

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** The session JWT is issued in an httpOnly cookie named `sp_token`
(`sameSite=lax`, `secure` in production, 8h). It is never placed in a response body, and the client
never reads it. `axios` is configured with `withCredentials: true`.

**Why.** A token in `localStorage` is readable by any JavaScript on the page, so a single XSS bug
becomes full account takeover. An httpOnly cookie is unreadable from JS. `sameSite=lax` gives us CSRF
protection for free with a single known frontend origin, so we do not need CSRF tokens.

**Alternatives.** (a) Bearer token in `localStorage` — simplest to debug, worst XSS blast radius.
(b) Token in memory with a refresh cookie — safer than (a) but adds a refresh endpoint and rotation
logic we do not have time to get right. (c) Server sessions in Postgres — a round trip per request
for no benefit at this scale.

---

## D-02 — In-process event bus for cross-module side effects

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** Cross-module side effects go through `server/src/core/events.js`, a thin wrapper over
Node's `EventEmitter`. Services emit **after** their transaction commits; listeners live in the
owning module's `<name>.listeners.js` and are registered once at boot. Payloads carry ids only.

**Why.** Three developers are writing nine modules each in parallel. Confirming an order has to
create a dispatch (Member C), an invoice (Member A) and a subsidy file (Member A) — if
`projects.service.js` imported all three, Member B could not change a line without breaking two other
people, and every merge would conflict. The bus means a module publishes a fact and never learns who
cares. A failing listener logs and never fails the HTTP request.

**Alternatives.** (a) Direct service imports — tight coupling, constant merge conflicts, circular
imports. (b) A real queue (BullMQ + Redis) — correct for production, but adds infrastructure and
failure modes we cannot justify in a hackathon. (c) Postgres LISTEN/NOTIFY — more moving parts for no
gain at one process.

**Consequence accepted.** Events are fire-and-forget and in-process: no retries, no durability. If
the process dies between the commit and the listener, the side effect is lost. Acceptable here; the
first thing to replace at production scale.

---

## D-03 — `prisma db push` during the hackathon, one baseline migration at freeze

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** Schema changes are applied with `npx prisma db push`. No migration files are committed
during the build. At feature freeze, one person runs `npx prisma migrate dev --name baseline` once
and commits that single migration folder.

**Why.** Three people on one branch each generating timestamped migrations would conflict on nearly
every pull, and a half-applied migration chain is much harder to recover from than a `db push` on a
seeded database. The seed is idempotent, so a reset costs seconds.

**Alternatives.** (a) `prisma migrate dev` from day one — correct discipline, wrong cost here.
(b) One person owns all schema changes — a bottleneck on the single most-edited shared file.

**Consequence accepted.** No migration history and no rollback path until freeze. Anyone whose local
database drifts runs `prisma db push --force-reset && npm run seed`.

---

## D-04 — Local disk uploads with random file names

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** `multer` disk storage into `server/uploads/` (gitignored), file names generated as
`crypto.randomBytes(16).toString('hex')` plus the validated extension. Served read-only by
`express.static` at `/uploads`. Whitelist: jpg/png/webp/pdf, 5 MB.

**Why.** Survey photos, roof photos, signatures and subsidy documents all need storing, and the demo
must run on a laptop with no network. Random names close the path-traversal and overwrite classes of
bug by construction, since the user-supplied name never touches the filesystem.

**Alternatives.** (a) S3 / Cloudinary — correct for production; adds credentials, cost and a
dependency on connectivity during a live demo. (b) Base64 in Postgres — bloats rows and backups,
and makes the signature column unusable.

**Consequence accepted.** Files are served without an authorization check; anyone with the URL can
fetch them. 128 bits of randomness makes guessing infeasible, which is adequate for the demo. This
limitation is documented in `SECURITY.md` section 8.

---

## D-05 — Payments are recorded, not processed

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** No payment gateway. `POST /payments` records an amount, a mode (`UPI`,
`BANK_TRANSFER`, `CASH`, `CHEQUE`, `CARD`), a reference and a received date, entered by sales from the
bank or UPI message. Every payment is audited.

**Why.** This is how the company actually works today — customers pay by UPI or bank transfer and
someone reconciles it. The business rules that matter (BR-05's advance gate, invoice settlement,
profit) all depend on *recording* money accurately, not on moving it. A real gateway would add
merchant onboarding and webhook handling without changing a single business rule.

**Alternatives.** (a) Razorpay test mode — demo-able, but a day of integration plus webhook
plumbing for a flow the judges already understand. (b) Marking invoices "paid" with no payment row —
loses the mode, reference and audit trail that reconciliation needs.

---

## D-06 — Warranty starts at delivery, per serial, duration from `product.warrantyMonths`

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** On `POST /dispatches/:id/deliver`, one `Warranty` row is created per delivered serial
**inside the delivery transaction**: `startDate = deliveredAt`,
`endDate = startDate + product.warrantyMonths`. The duration always comes from the product (panels
240 months, inverter/battery/charge controller 24). `Warranty.status` is **derived in the service**,
never stored.

**Why.** The brief is explicit: "the moment a delivery is done, the warranty clock should start by
itself". Per-serial rather than per-project, because a customer replaces one inverter, not a system —
support must answer "is *this unit* covered?". Duration on the product means adding a 25-year panel
is a catalogue edit, not a code change (BR-14's principle applied to time). Derived status cannot
drift the way a stored `ACTIVE`/`EXPIRED` column silently would.

**Alternatives.** (a) Start at installation — fairer to the customer, but the install can be weeks
later and the brief says delivery. (b) Warranty per project — one row instead of eight, but then a
single replaced inverter has nowhere to live. (c) A stored status column with a nightly job — one
more thing to be stale at the worst moment.

---

## D-07 — A replacement unit inherits the remaining warranty of the unit it replaces

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** When a service visit swaps a unit, the new serial's warranty `endDate` is **copied from
the old unit's**, not recalculated from the swap date. The old serial becomes `REPLACED` with
`replacedById` pointing at the new unit, and its warranty becomes `VOID` with a reason.

**Why.** Otherwise a customer whose inverter fails at month 23 would get a fresh 24-month warranty on
the replacement — effectively a free extension every time something breaks, which is neither what we
sold nor what the manufacturer gives us. Inheriting the remaining window matches industry practice
and keeps the warranty liability bounded. `replacedById` keeps the chain auditable years later.

**Alternatives.** (a) Full fresh warranty on the replacement — generous, unbounded liability, and
creates an incentive to claim. (b) No warranty on replacements — punishes the customer for our
failure. (c) Pro-rata — fairer in theory, but impossible to explain on the phone.

---

## D-08 — Money as `Decimal(12,2)`

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** Every money column is `@db.Decimal(12, 2)` in INR. All arithmetic uses
`Prisma.Decimal` or the helpers in `core/money.js`. Money is serialised to JSON as a **string**.
No JS `number` ever holds a money value. (BR-14)

**Why.** `0.1 + 0.2 !== 0.3`. On an 18% tax line over a ₹1,42,500 quote, float drift produces
invoices that are off by paise and a profit report that does not reconcile — exactly the credibility
problem the director came to us with. `Decimal(12,2)` holds up to ₹99,99,99,999.99, ample for a
₹1.5L job. Serialising as a string stops the precision being thrown away at the API boundary.

**Alternatives.** (a) Integer paise — also correct, but every read and write needs a conversion and
one missed divide is a 100× error. (b) `Float` — never. (c) `Decimal` in the DB but floats in JS —
the worst of both: correct storage, wrong totals.

---

## D-09 — Role assignment for ambiguous workflow steps

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** Where the brief does not say which role owns a step, the team picked these defaults.
**No role was added, removed, renamed or merged** — the eight roles are locked.

| Step | Owner | Reasoning |
|---|---|---|
| **Installation scheduling** | `WAREHOUSE_MANAGER` | They know what has actually been delivered and which crew is free; scheduling an install before the kit is on site is the failure mode we are trying to remove. |
| **Survey approval** | `SALES_EXECUTIVE` (a `DIRECTOR` may also approve) | Sales owns the customer until the order is confirmed and is accountable for quote accuracy. The director's override exists so an absent sales executive cannot block a deal. |
| **Finance screens** (invoices, subsidy, payouts, expenses, profitability) | `DIRECTOR` panel | The brief's month-end scene is explicitly the director's. `SUPER_ADMIN` keeps read access for support, not ownership. |
| **Service visits** | `INSTALLATION_TECHNICIAN` | The same crew that mounts a system is the crew that can fix it; a separate service technician role would be a ninth role, which is forbidden. |
| **Customer account creation** | Automatic, on `quote.sent` | A customer should not need to register before they can read their own quote. Self-signup via `POST /auth/register` links to the existing `Customer` by phone. |
| **Project closure** | `DIRECTOR` | Closing means the final invoice is paid and the subsidy is settled — both director-owned facts. |

**Why.** Three people building nine modules in parallel will each invent a different answer to
"who does this?" unless it is written down once. Each choice follows from who holds the information
the step needs.

**Alternatives.** Letting sales schedule installations (rejected: they cannot see stock or crew
availability); a dedicated service role (rejected: roles are locked).

---

## D-10 — JavaScript, not TypeScript

**Date:** 2026-10-31 · **Status:** accepted (fixed by the brief)

**Decision.** Plain JavaScript on both sides. ES modules on the server (`"type": "module"`),
JSX on the client.

**Why.** Fixed by the stack specification. The safety TypeScript would give is recovered where it
matters most: zod validates every API boundary, Prisma generates typed query results, and
`API_CONTRACTS.md` is the human-readable interface between the three members.

**Consequence accepted.** Refactors across module boundaries are riskier. Mitigated by the shared-file
protocol and by never importing one feature from another.

---

## D-11 — Derived values are computed, never stored

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** `Warranty.status`, a lead's overdue flag, project profit, and dispatch completeness are
all computed at read time. None of them is a database column.

**Why.** Each one depends on `now()` or on rows elsewhere. A stored `ACTIVE` warranty that nobody
re-ran the job for is a wrong answer given to a customer on the phone; a stored profit figure that
predates an expense is a wrong answer given to the director. Computing is cheap at this scale; being
wrong is not.

**Alternatives.** Materialised columns refreshed by cron — faster reads, a new class of staleness
bug, and a job that must never fail. Revisit only if a report gets measurably slow.

---

## D-12 — Human-readable codes from a `Counter` table, inside the transaction

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** `ENQ-2026-0001`, `QT-`, `PRJ-`, `DSP-`, `TKT-`, `INV-` are generated by
`nextCode(prefix, tx)`, which increments a row in `Counter` **inside the same transaction** as the
record being created (BR-17).

**Why.** People read these codes aloud on the phone and write them on cartons, so they must be short,
sequential and free of gaps. Generating them inside the transaction makes the number and the row
atomic: a rolled-back quote does not burn a number, and two simultaneous requests cannot collide
because the counter row is locked for the duration.

**Alternatives.** (a) `COUNT(*) + 1` — races under concurrency and reuses numbers after a delete.
(b) A Postgres sequence — no gaps guarantee under rollback, and awkward to reset per year.
(c) cuid alone — unreadable over a phone line.

---

## D-13 — Light mode only

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** No dark theme. The app is light-mode only, on the warm `paper` background.

**Why.** A dark theme doubles the surface area of every token, badge and photo overlay, and a
half-finished one looks worse than none. The product is used in offices and on rooftops in bright
sun, where the light theme is the right choice anyway.

**Alternatives.** Dark mode via a `data-theme` attribute — easy to add later since every colour is
already a CSS variable. Not now.

---

## D-14 — Round-robin assignment on web enquiry, not re-assignable from form

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** When a public enquiry is submitted, `createPublicEnquiry` finds the active `SALES_EXECUTIVE` with the fewest non-LOST leads (open count) and sets `assignedToId` inside the same transaction. The assignee is not exposed on the confirmation screen.

**Why.** Equal workload distribution from the first touch. Doing it inside the transaction means the count is accurate even under concurrent form submissions. If no executives exist (e.g., fresh environment) `assignedToId` is null — the service never crashes.

**Alternatives.** (a) True round-robin by index (last assigned + 1) — requires a separate counter row, gives a deterministic sequence but ignores existing backlog. (b) Random assignment — simple but can produce uneven loads by chance. (c) Director assigns manually — the status stays NEW/unassigned and piles up; rejected.

---

## D-15 — Projects created automatically via quote.accepted event

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** When a quote is accepted, the `quote.accepted` event fires and `projects.listeners.js` calls `createProjectFromQuote`. The project row is created inside a transaction with a `PRJ` code from the Counter. The project status starts at `AWAITING_ADVANCE`.

**Why.** Decouples quote acceptance from project creation. Sales executive does not have to manually create the project. The warehouse sees a project the moment the counter is satisfied.

**Alternatives.** (a) Sales executive creates the project manually — requires an extra step and is easy to forget. (b) Inline in `acceptQuote` service — mixes concerns and makes the quote service depend on the project service.

---

## D-16 — Customer account created at quote time, not lead time

**Date:** 2026-10-31 · **Status:** accepted

**Decision.** `createQuote` checks if the lead already has a `customerId`. If not, a `Customer` row is created from the lead's name/phone/email and linked. A `userId` (portal login) is not created here — that is Member A's domain.

**Why.** Creating a Customer at lead time would create accounts for every enquiry, most of which never become orders. Deferring to quote time means every Customer has at least one quote. BR-16 scoping works immediately because `customerId` is set before the quote row is committed.

**Alternatives.** (a) Customer at lead time — clean, but creates many orphan customers. (b) Explicit API call from frontend — leaks business logic to the client.

---
