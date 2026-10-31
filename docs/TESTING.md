# TESTING.md

Manual checklists per role, the demo flow as one end-to-end test case, the edge cases that must fail
correctly, the API smoke script, and the automated unit tests.

Run everything against a freshly seeded database:

```bash
npm run seed
npm run dev
```

All seeded passwords are `Demo@1234` (`DATABASE.md` section 8).

---

## 1. Foundation (run this first — everything else depends on it)

- [ ] `GET http://localhost:5000/api/v1/health` → `200 { status: "ok", db: "up" }`
- [ ] Server refuses to boot with `JWT_SECRET` missing or shorter than 32 characters
- [ ] Client loads at `http://localhost:5173` with no console errors
- [ ] Fonts render as Manrope (UI) and Fraunces (public hero), not a fallback
- [ ] `/dev/ui` renders the whole UI kit — `SUPER_ADMIN` only; any other role gets 403
- [ ] Login sets an **httpOnly** `sp_token` cookie (visible in DevTools → Application, **not** readable
      from `document.cookie`)
- [ ] A hard refresh on any deep link keeps the session (`GET /auth/me` on load, no bounce to `/login`)
- [ ] Logout clears the cookie and redirects to `/login`
- [ ] A 401 from any endpoint redirects to `/login` exactly once (no redirect loop)
- [ ] An unknown URL renders the styled 404; a forbidden route renders the styled 403
- [ ] `PUT /settings` as `SUPER_ADMIN` succeeds; as `DIRECTOR` returns 403
- [ ] The notification bell polls `/notifications/unread-count` every 30s and shows the dot
- [ ] Sidebar collapse persists across a reload
- [ ] `prefers-reduced-motion: reduce` disables route and list animations

---

## 2. Per-role checklists

### SUPER_ADMIN — `admin@sunpower.in`
- [ ] Lands on `/admin`
- [ ] Sidebar shows: Dashboard, Users, Kit Templates, Settings, Audit Log
- [ ] Create a user in each of the 8 roles; the list shows them
- [ ] Edit a user's role → an `AuditLog` row appears with before/after
- [ ] Deactivate a user → they can no longer sign in (`403 ACCOUNT_DISABLED`)
- [ ] Cannot deactivate own account (`409 CANNOT_DISABLE_SELF`)
- [ ] Reset another user's password → they can sign in with the new one
- [ ] Edit a kit template's items → `GET /kit-templates/:id` reflects the new BOM
- [ ] Change `advancePercent` to 50 → the order-confirmation gate uses 50 immediately (no restart)
- [ ] An unknown settings key is rejected (`422`), not silently ignored
- [ ] Audit log filters by user, action and date

### DIRECTOR — `director@sunpower.in`
- [ ] Lands on `/director`
- [ ] Overview shows today / this week / this month with previous-period deltas
- [ ] Profitability list shows every project; **the loss-making one is marked**
- [ ] Drill into the loss-making project → revenue, material, labour, expenses, warranty cost and
      the reason (discount + civil work) are all visible, and they reconcile to BR-13
- [ ] Pipeline shows lead, quote and project counts by status
- [ ] Unfinished report lists each stuck stage with days-in-stage
- [ ] Service report shows free vs. chargeable tickets and average resolution time
- [ ] Invoices: list, open, download PDF; the PDF carries the Hyderabad company header and GSTIN
- [ ] Subsidies: move one `APPLIED → INSPECTION_DONE → APPROVED`; an illegal jump returns 409
- [ ] Generate payouts for the month → `DRAFT` rows with non-zero minutes; approve one; mark it paid
- [ ] Re-running generate leaves the `APPROVED` row untouched
- [ ] Export a report as CSV and as PDF
- [ ] Share a report → open the returned URL **in a private window with no session** → it renders
- [ ] An expired or edited token → 404

### SALES_EXECUTIVE — `sales1@sunpower.in`
- [ ] Lands on `/sales/leads`
- [ ] Lead board filters by status, source, assignee and `q`
- [ ] The seeded **overdue** lead shows the Overdue badge (BR-02)
- [ ] The seeded **duplicate** lead shows the Duplicate flag and links to the original (BR-01)
- [ ] No delete action exists anywhere on a lead
- [ ] Log a call → `firstContactedAt` set, status `NEW → CONTACTED`, overdue badge clears
- [ ] Qualify a lead → `QUALIFIED`; qualifying a `QUOTED` lead returns `409 INVALID_TRANSITION`
- [ ] Schedule a survey; only `SURVEY_TECHNICIAN` users appear in the dropdown
- [ ] Review a submitted survey → approve; the lead becomes `SURVEY_APPROVED`
- [ ] Reject a survey without a reason → blocked; with a reason → `SURVEY_REJECTED`
- [ ] Create a quote from "3 kW On-Grid" → **every BOM line appears automatically** (BR-04)
- [ ] Change a quantity and add an item while `DRAFT`
- [ ] Apply a discount → an `AuditLog` row is written
- [ ] Send the quote → it locks; editing returns `409 QUOTE_LOCKED`
- [ ] Download the quote PDF
- [ ] Record a payment; confirm the order → pick list, install job, proforma invoice and subsidy file
      all appear without any further action (BR-06)

### SURVEY_TECHNICIAN — `survey1@sunpower.in`
- [ ] Lands on `/field/surveys` in the **FieldLayout** with a bottom tab bar
- [ ] Sees only their own surveys; today's job is at the top
- [ ] **At 360px width**: no horizontal scroll, every control ≥44px, the submit button is sticky
- [ ] Start a survey → `IN_PROGRESS`
- [ ] Submit with a missing measurement → blocked with a field error
- [ ] Submit with no photo → `422 PHOTOS_REQUIRED`
- [ ] Submit complete → `SUBMITTED`, the lead becomes `SURVEY_DONE`, sales is notified
- [ ] Opening another technician's survey by id → **403**

### CUSTOMER — phone `9848012345`
- [ ] Signs in **by phone**; lands on `/portal`
- [ ] Overview shows active projects, paid, outstanding, systems and the next step
- [ ] Project timeline shows the whole journey, enquiry to installation
- [ ] **No cost, margin or `unitCost` figure appears anywhere**
- [ ] Accept a quote → the project appears as *Awaiting advance*
- [ ] Accepting an expired quote → `409 QUOTE_EXPIRED`
- [ ] My systems lists the inverter serial with **warranty ACTIVE** and the end date
- [ ] Raise a service request; track it; confirm the resolution → the ticket closes
- [ ] **At 360px**: every portal screen is usable one-handed
- [ ] Opening another customer's project / quote / invoice / ticket by id → **403**
- [ ] Any staff route (`/sales/leads`, `/warehouse`, `/director`) → the styled **403** page
- [ ] `GET /search` → 403

### WAREHOUSE_MANAGER — `warehouse@sunpower.in`
- [ ] Lands on `/warehouse`
- [ ] Products list; create a product; a duplicate SKU → `409 SKU_IN_USE`
- [ ] Changing `isSerialized` on a product with serials → `409 CANNOT_CHANGE_SERIALIZATION`
- [ ] Inventory summary shows in-stock / reserved / dispatched / delivered per product
- [ ] Low stock lists only products at or below `reorderLevel`
- [ ] Adjust non-serialized stock with a reason → audited; adjusting a serialized product → `422`
- [ ] Record a purchase with serial numbers → `SerialUnit` rows appear `IN_STOCK` with `unitCost`
- [ ] Serial count ≠ quantity → `422 SERIAL_COUNT_MISMATCH`
- [ ] Re-using an existing serial → `409 SERIAL_IN_USE`
- [ ] Dispatch list shows the pick list created by order confirmation
- [ ] Start packing → `PACKING`; the scan screen works **at 768px (tablet)** with the keyboard open
- [ ] Scanning works end to end (see the edge cases in section 4)
- [ ] Dispatch with vehicle + driver → serials `DISPATCHED`, customer notified
- [ ] Packing slip PDF lists **every serial number**
- [ ] Record delivery → **warranties appear immediately**, 240 months on panels, 24 on the inverter (BR-09)
- [ ] Schedule an installation with a 2-person crew; crew with no lead, or two leads → `422 INVALID_CREW`

### INSTALLATION_TECHNICIAN — `install1@sunpower.in`
- [ ] Lands on `/field/jobs` in the FieldLayout
- [ ] Sees only jobs where they are on the crew
- [ ] Start a job → `IN_PROGRESS`, project `INSTALLING`
- [ ] Upload photos; the counter shows progress toward the 3 BR-10 requires
- [ ] Complete with 2 photos → `422 PHOTOS_REQUIRED`
- [ ] Complete with no signature → `422 SIGNATURE_REQUIRED`
- [ ] Complete with `finishedAt` before `startedAt` → `422 INVALID_TIME_RANGE`
- [ ] Complete properly → job `COMPLETED`, project `INSTALLED`, **tax invoice created**, `TimeLog` written
- [ ] The signature pad works with a finger at 360px, and the typed-name fallback is present
- [ ] Opening another crew's job by id → **403**

### SUPPORT_EXECUTIVE — `support@sunpower.in`
- [ ] Lands on `/support`
- [ ] Lookup by **phone** `9848012345` → customer, project, systems, warranty status
- [ ] Lookup by **serial number** → the exact unit
- [ ] Lookup by **name** and by **project code** → the same customer
- [ ] Serial history shows purchased → dispatched → delivered → tickets
- [ ] Raise a ticket on the **18-month-old** project's inverter → `isUnderWarranty: true`,
      `isChargeable: false` (BR-11)
- [ ] Raise a ticket on the **27-month-old** project's inverter → `isChargeable: true`
- [ ] Assign a technician; a non-`INSTALLATION_TECHNICIAN` → `422 INVALID_TECHNICIAN`
- [ ] Record a visit with a part swap → the new serial **inherits the remaining warranty** (D-07),
      the old serial becomes `REPLACED` and its warranty `VOID`
- [ ] Resolve a chargeable ticket → a `SERVICE` invoice is created automatically with parts + labour
      + visit charge
- [ ] Resolve a warranty ticket → **no invoice**; on close, the cost is booked as a project expense
- [ ] Confirm on the customer's behalf **without a note** → `422 CONFIRMATION_NOTE_REQUIRED` (BR-12)
- [ ] Confirm with a note → `CLOSED`
- [ ] Reopen a closed ticket → `REOPENED`

---

## 3. End-to-end demo flow (one test case)

This is the 8-minute demo in `PRD.md` section 9, run as a single pass. **If this breaks, nothing else
matters.** Start from a fresh `npm run seed`.

| # | Actor | Step | Expected |
|---|---|---|---|
| 1 | Visitor | Submit the public enquiry: Ramesh Yadav, `9701234567`, Kukatpally Hyderabad 500072, 3 kW On-Grid, wants subsidy | `201 { code: "ENQ-…" }`; the code is shown on screen |
| 2 | — | — | Every `SALES_EXECUTIVE` has a new notification |
| 3 | sales1 | Open the lead board | The new enquiry is at the top, status `NEW` |
| 4 | sales1 | Log a call: roof 450 sqft, bill ₹4,200, grid OK | `firstContactedAt` set, status `CONTACTED` |
| 5 | sales1 | Qualify | `QUALIFIED` |
| 6 | sales1 | Schedule a survey for Mahesh Solanki, today | `SURVEY_SCHEDULED`; Mahesh is notified |
| 7 | survey1 | My surveys → start → fill RCC, 420 sqft, S, 15°, 18 m, earthing yes, recommend 3 kW On-Grid, 2 photos → submit | `SUBMITTED`; lead `SURVEY_DONE` |
| 8 | sales1 | **Try to create a quote now** | `409 SURVEY_NOT_APPROVED` (BR-03) |
| 9 | sales1 | Approve the survey | `APPROVED`; lead `SURVEY_APPROVED` |
| 10 | sales1 | Create a quote from "3 kW On-Grid" | Every BOM line present; `DRAFT`; `validUntil` = +15 days |
| 11 | sales1 | Raise the mounting quantity, send | `SENT`; a `CUSTOMER` login is created; the customer is notified |
| 12 | customer | Sign in by phone → portal → accept the quote | `ACCEPTED`; project created `AWAITING_ADVANCE` |
| 13 | sales1 | **Confirm with ₹5,000 recorded** | `409 ADVANCE_NOT_RECEIVED`, `details { required, paid }` (BR-05) |
| 14 | sales1 | Record the full 30% advance, confirm | `CONFIRMED`; **pick list + install job + proforma invoice + subsidy file all created** (BR-06); warehouse notified |
| 15 | warehouse | Dispatch → start packing | `PACKING` |
| 16 | warehouse | Scan a panel serial | Line increments, green |
| 17 | warehouse | **Scan the same serial again** | `409 SERIAL_ALREADY_SCANNED` |
| 18 | warehouse | **Scan a serial already on another project** | `409 SERIAL_ON_OTHER_PROJECT` with the project code |
| 19 | warehouse | **Dispatch one panel short** | `409 DISPATCH_INCOMPLETE` naming the short line (BR-07) |
| 20 | warehouse | Scan the rest, pack the cable lines, dispatch with vehicle + driver | `DISPATCHED`; serials `DISPATCHED`; customer notified |
| 21 | warehouse | Open the packing slip PDF | Every serial number is listed |
| 22 | warehouse | Record delivery | `DELIVERED`; **a `Warranty` row per serial**, panels +240 months, inverter +24 (BR-09) |
| 23 | warehouse | Schedule the install: Sanjay (lead) + Vikram, tomorrow | `SCHEDULED`; crew + customer notified |
| 24 | install1 | My jobs → start | `IN_PROGRESS`; project `INSTALLING` |
| 25 | install1 | **Complete with 2 photos** | `422 PHOTOS_REQUIRED` |
| 26 | install1 | Upload a third photo, **complete with no signature** | `422 SIGNATURE_REQUIRED` (BR-10) |
| 27 | install1 | Sign, confirm 3 kW, generation 2.7 kW, checklist, complete | `COMPLETED`; project `INSTALLED`; **tax invoice created**; `TimeLog` written |
| 28 | customer | Portal → project timeline | The full journey, photos and signature visible; no costs |
| 29 | support | Lookup `9848012345` (the 18-month-old project) | Customer, inverter serial, **warranty ACTIVE** |
| 30 | support | Raise `INVERTER_FAULT`, fault code E-04 | `isChargeable: false` — free (BR-11) |
| 31 | support | Assign install3; record a visit with a replacement unit | New serial **inherits the remaining warranty**; old serial `REPLACED` (D-07) |
| 32 | support | Resolve | `RESOLVED`; **no invoice**; the customer is asked to confirm |
| 33 | customer | Portal → ticket → Confirm resolved | `CLOSED`; the warranty cost is booked as a project expense |
| 34 | support | Raise a ticket on the **27-month-old** project's inverter, add parts + 2h labour, resolve | `isChargeable: true`; a **`SERVICE` invoice** is created automatically |
| 35 | director | Overview | Today/week/month with deltas; the numbers reflect everything above |
| 36 | director | Profitability → the loss-making project | Negative profit, with the discount and civil-work expense visible |
| 37 | director | Unfinished report | Each stuck stage with days-in-stage |
| 38 | director | Generate payouts for the month | Non-zero minutes for Sanjay, Vikram, Mahesh |
| 39 | director | Share a report, open the URL in a private window | Renders with **no login** |
| 40 | admin | Audit log | The discount change, the payment and the role change are all there |

---

## 4. Edge cases

Every one of these must fail **on the server**, with the exact code, even if the UI is bypassed
(test with curl or the smoke script, not just the browser).

| # | Case | Expected |
|---|---|---|
| E-01 | Public enquiry with a **phone that already exists** | `201` — created, `duplicateOfId` set, flagged on the board. **Never rejected** (BR-01) |
| E-02 | Delete a lead | No endpoint exists; `LOST` with a `lostReason` is the only exit |
| E-03 | **Create a quote before the survey is approved** | `409 SURVEY_NOT_APPROVED` (BR-03) |
| E-04 | Edit or re-price a `SENT` quote | `409 QUOTE_LOCKED` |
| E-05 | Accept a quote past `validUntil` | `409 QUOTE_EXPIRED` |
| E-06 | **Confirm an order without the advance** | `409 ADVANCE_NOT_RECEIVED` with `{ required, paid, shortfall }` (BR-05) |
| E-07 | Confirm an already-confirmed project | `409 INVALID_TRANSITION` |
| E-08 | **Scan an unknown serial** | `404 SERIAL_NOT_FOUND` |
| E-09 | **Scan the same serial twice** on one dispatch | `409 SERIAL_ALREADY_SCANNED` |
| E-10 | **Scan a serial already on another project** | `409 SERIAL_ON_OTHER_PROJECT`, `details.projectCode` (BR-08) |
| E-11 | **Scan an already-dispatched serial** | `409 SERIAL_NOT_AVAILABLE` |
| E-12 | Scan a serial whose product is not on the pick list | `422 PRODUCT_NOT_ON_DISPATCH` |
| E-13 | Scan into a line that is already full | `409 LINE_ALREADY_COMPLETE` |
| E-14 | **Dispatch with any line short** | `409 DISPATCH_INCOMPLETE` listing the short lines (BR-07) |
| E-15 | Unscan after dispatch | `409 INVALID_TRANSITION` |
| E-16 | Purchase where `serialNumbers.length ≠ quantity` | `422 SERIAL_COUNT_MISMATCH` |
| E-17 | Purchase re-using an existing serial | `409 SERIAL_IN_USE` |
| E-18 | **Complete an installation with 2 photos** | `422 PHOTOS_REQUIRED` (BR-10) |
| E-19 | **Complete an installation without a signature** | `422 SIGNATURE_REQUIRED` (BR-10) |
| E-20 | Complete with `finishedAt ≤ startedAt` | `422 INVALID_TIME_RANGE` |
| E-21 | Complete a job that was never started | `409 NOT_STARTED` |
| E-22 | Schedule a crew with no lead, or two leads | `422 INVALID_CREW` |
| E-23 | Schedule a `SURVEY_TECHNICIAN` onto an installation crew | `422 INVALID_TECHNICIAN` |
| E-24 | **Ticket on an expired warranty** | `isChargeable: true`; resolving creates a `SERVICE` invoice (BR-11) |
| E-25 | Ticket on an active warranty | `isChargeable: false`; no invoice; cost booked as an expense on close |
| E-26 | Ticket opened one day **before** expiry, resolved after | Stays free — the flag is frozen at creation |
| E-27 | **Close a ticket without customer confirmation** | `409 INVALID_TRANSITION` — `resolve` alone never closes (BR-12) |
| E-28 | Support confirms on the customer's behalf **without a note** | `422 CONFIRMATION_NOTE_REQUIRED` |
| E-29 | **Customer requests another customer's project** | `403 FORBIDDEN` |
| E-30 | Customer requests another customer's quote / invoice / ticket / serial | `403 FORBIDDEN` |
| E-31 | Customer calls `GET /search` or any staff route | `403 FORBIDDEN` |
| E-32 | **Survey technician opens another technician's survey** | `403 FORBIDDEN` |
| E-33 | **Installation technician opens a job they are not crewed on** | `403 FORBIDDEN` |
| E-34 | Any request with no cookie | `401 UNAUTHENTICATED` |
| E-35 | Request with a tampered or expired JWT | `401 UNAUTHENTICATED` |
| E-36 | **Deactivated user with a still-valid token** | `401`/`403` on the very next request (the role and status are re-read per request) |
| E-37 | 11 login attempts in 15 minutes | `429 RATE_LIMITED` |
| E-38 | 6 public enquiries in an hour from one IP | `429 RATE_LIMITED` |
| E-39 | Upload a `.exe` renamed to `.jpg` | `422 INVALID_FILE_TYPE` (MIME **and** extension are checked) |
| E-40 | Upload a 9 MB photo | `422 FILE_TOO_LARGE` |
| E-41 | Upload a filename containing `../` | Stored under a random name; no path traversal |
| E-42 | `PUT /settings` with an unknown key | `422 VALIDATION_ERROR` — strict schema |
| E-43 | `pageSize=100000` | Capped at 100 |
| E-44 | Negative or zero quantity on a quote line / payment amount | `422 VALIDATION_ERROR` |
| E-45 | Adjust stock on a serialized product | `422 SERIALIZED_PRODUCT` |
| E-46 | Adjust stock below zero | `409 NEGATIVE_STOCK` |
| E-47 | Deactivate your own `SUPER_ADMIN` account | `409 CANNOT_DISABLE_SELF` |
| E-48 | Open a shared report with an expired or edited token | `404 NOT_FOUND` (never "expired", so tokens cannot be probed) |
| E-49 | Cancel a project that is already `DELIVERED` | `409 CANNOT_CANCEL` |
| E-50 | Two dispatches scanning the same serial concurrently | One succeeds; the other gets `409 SERIAL_NOT_AVAILABLE` (the unique constraint plus the transaction hold) |

---

## 5. API smoke script — `server/scripts/smoke.js`

A single Node script that drives the whole happy path through the real HTTP API and prints a
pass/fail line per step. It is the fastest way to know the backend is alive after a merge.

```bash
node server/scripts/smoke.js                       # against http://localhost:5000
API_URL=http://localhost:5000/api/v1 node server/scripts/smoke.js
```

**What it does**

1. `GET /health` — asserts `status: "ok"` and `db: "up"`.
2. Signs in as each of the 8 roles in turn, keeping the `sp_token` cookie per role in a small cookie
   jar (`fetch` with a manual `Cookie` header). Asserts each returns the expected role from `/auth/me`.
3. **Negative auth checks:** a bad password → 401; a customer hitting `/users` → 403; no cookie → 401.
4. Posts a public enquiry → captures the `ENQ-` code.
5. As sales: logs an activity, qualifies, schedules a survey.
6. As the survey technician: starts and submits the report (a small generated PNG as the photo).
7. **Asserts the negative:** creating a quote before approval → `409 SURVEY_NOT_APPROVED`.
8. As sales: approves, creates the quote from the 3 kW kit, asserts the line count matches the kit's
   BOM, sends it.
9. As the customer: accepts → captures the project id.
10. **Asserts the negative:** confirm with a token payment → `409 ADVANCE_NOT_RECEIVED`.
11. Records the advance, confirms, then asserts the dispatch, installation job, proforma invoice and
    subsidy application all now exist.
12. As warehouse: starts packing, scans every serial, asserts the duplicate scan → `409`, asserts the
    short dispatch → `409 DISPATCH_INCOMPLETE`, then dispatches and delivers.
13. **Asserts warranty rows exist** with the right `endDate` per product.
14. As the installation technician: starts, uploads 3 photos, asserts completion without a signature
    → `422`, then completes properly and asserts the tax invoice exists.
15. As support: looks up by phone, raises a ticket on an in-warranty serial, asserts
    `isChargeable: false`, resolves, asserts no invoice; then the out-of-warranty path and asserts a
    `SERVICE` invoice appears.
16. As director: fetches overview, profitability and unfinished, asserting each returns a non-empty
    payload and that profit reconciles with BR-13 for the demo project.

Exits `0` on all-pass, `1` on the first failure with the step name, the status code and the response
body. It only reads and writes through the public API — no direct Prisma access — so it tests the
real middleware chain, RBAC included.

---

## 6. Automated unit tests — `node --test`

```bash
npm run test          # from the repo root → node --test server/tests
```

Four critical services get real unit tests, plus the two foundation pieces everything depends on.
These are pure-logic tests against a test database or in-memory fixtures — fast, and run on every
commit.

| File | Covers | Cases |
|---|---|---|
| `tests/codes.test.js` | `nextCode()` (BR-17) | Returns `INV-2026-0001` from an empty counter · increments to `0002` · pads to 4 digits and keeps going past `9999` · uses the current year · different prefixes keep independent counters · two concurrent calls in separate transactions never return the same number |
| `tests/requireRole.test.js` | `requireRole()` RBAC | Allows a listed role · rejects an unlisted role with `403 FORBIDDEN` · rejects a missing `req.user` with `401` · a multi-role list admits each one · the role is read from `req.user`, never from the request body or a header |
| `tests/warranty.test.js` | Warranty dates (BR-09) | 240 months from a delivery date lands on the same day 20 years later · 24 months across a leap year (29 Feb delivery → 28 Feb) · month-end delivery (31 Jan + 1 month) does not roll into March · `status` is `ACTIVE` before `endDate`, `EXPIRED` the day after, `VOID` when `voidReason` is set · `monthsRemaining` never goes negative · a replacement inherits the remaining window (D-07) |
| `tests/profit.test.js` | Profit calculation (BR-13) | Revenue − (material + labour + expenses + warranty service) · uses `Decimal` throughout, with no float drift on `18%` tax of `₹1,42,500` · labour = `minutes / 60 × hourlyRate`, approved logs only · a loss-making project returns a negative profit and a negative margin · a project with no invoice returns zero revenue, not null |
| `tests/dispatch.test.js` | Dispatch validation (BR-07, BR-08) | A complete dispatch passes · one short serialized line → `DISPATCH_INCOMPLETE` with that line in `details` · a short non-serialized line → the same · a duplicate scan → `SERIAL_ALREADY_SCANNED` · a serial on another project → `SERIAL_ON_OTHER_PROJECT` · a non-`IN_STOCK` serial → `SERIAL_NOT_AVAILABLE` · a product not on the pick list → `PRODUCT_NOT_ON_DISPATCH` · scanning into a full line → `LINE_ALREADY_COMPLETE` |
| `tests/advance.test.js` | Advance check (BR-05) | Paid exactly 30% of the total passes · one rupee short fails with `{ required, paid, shortfall }` · a changed `advancePercent` setting is honoured without a restart · an over-payment passes · multiple payments are summed with `Decimal`, not floats |

**Convention.** Tests use `node:test` and `node:assert/strict`, one `describe` per service, and names
that read as the rule: `rejects a dispatch with an unscanned serialized line (BR-07)`. Every test
that enforces a business rule cites its `BR-xx` in the name, so a failure points straight at the rule
it broke.
