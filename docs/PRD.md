# SunPower SIMS — Product Requirements Document

> Single source of truth for scope, flows, state machines and business rules.
> Read with [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md) and [API_CONTRACTS.md](API_CONTRACTS.md).

---

## 1. Product vision

SunPower SIMS is the operational backbone of a rooftop solar company: one system that carries a customer
from the first web enquiry to the last warranty claim twenty years later.
It replaces WhatsApp threads, hand-typed quotes and paper serial registers with one trail of record —
enquiry, survey, quote, payment, serial number, roof photo, invoice, ticket — all linked to the same project.
Every number the director sees at month-end is a by-product of work the team already did in the system,
not a spreadsheet someone assembled afterwards.

---

## 2. The five pain points

| # | Pain today | How SIMS solves it |
|---|---|---|
| P-1 | **Enquiries get lost.** They arrive on WhatsApp, phone and a web form, and nobody owns them. | Every enquiry becomes a `Lead` with a code (`ENQ-2026-0001`) the moment it lands. Leads are never deleted (BR-01). Duplicate phone numbers are flagged and linked, not rejected. A lead with no contact logged in 24h is flagged overdue on the sales board (BR-02). |
| P-2 | **Quotes are typed by hand and miss parts.** | Quotes are generated from a `KitTemplate` ("3 kW On-Grid"), which expands into a full bill of materials — panels, inverter, stands, DC/AC boxes, cable, earthing, connectors (BR-04). Sales may adjust quantities and add items, but nothing is forgotten by default. A quote cannot be created until the survey is `APPROVED` (BR-03). |
| P-3 | **Serial numbers live on paper and vanish before the warranty claim.** | Every serialized unit is a `SerialUnit` row created at purchase. Dispatch requires each one to be scanned (BR-07); a serial can belong to one project only (BR-08). On delivery the system writes a `Warranty` row per serial with `start = deliveredAt`, `end = start + product.warrantyMonths` (BR-09). Support finds any unit by serial, phone, name or project code in one lookup. |
| P-4 | **Site work lives in registers and photos on phones.** | The installation crew completes a mobile form: start time, finish time, confirmed system size, generation test, checklist, at least three photos and the customer's on-screen signature (BR-10). Nothing can be marked complete without them. The project timeline shows the whole journey in one place. |
| P-5 | **No picture of revenue or margin.** | Costs are captured where they happen: `SerialUnit.unitCost` and `PurchaseItem.unitCost` for material, `TimeLog` × `User.hourlyRate` for labour, `Expense` for transport and civil work, `TicketPart` for warranty service. Project profit = invoiced revenue − (material + labour + expenses + warranty service cost) (BR-13). The director sees today / this week / this month, per-project profit, unfinished steps and open repairs, and can share a read-only report link. |

---

## 3. Personas

All eight roles are **locked**. No role may be added, removed, renamed or merged.

### 3.1 SUPER_ADMIN — "Keeps the software honest"
- **Goal:** the system is configured correctly and every sensitive change is traceable.
- **Daily tasks:** create and deactivate staff accounts, reset passwords, edit company settings and tax rates, maintain kit templates, read the audit log.
- **Screens:** Admin dashboard, Users, Settings, Kit Templates (+ items editor), Audit Log.
- **Device:** desktop.

### 3.2 DIRECTOR — "Owner asking which jobs made money"
- **Goal:** know profit, revenue and what is unfinished, without chasing anyone.
- **Daily tasks:** read the overview (today/week/month), open per-project profitability, approve technician payouts, issue and chase invoices, track subsidy paperwork, share numbers with a partner or bank.
- **Screens:** Director overview, Profitability (list + project drill-down), Pipeline, Unfinished work, Service report, Invoices, Subsidies, Expenses, Payouts, Report export/share.
- **Device:** desktop, occasionally tablet.

### 3.3 SALES_EXECUTIVE — "Owns the customer until the order is confirmed"
- **Goal:** no enquiry goes cold; every quote is accurate and goes out fast.
- **Daily tasks:** work the lead board, make qualification calls (roof area, monthly bill, grid connection), schedule surveys, approve or reject survey reports, build quotes from kit templates, send quotes, record advance payments, confirm orders.
- **Screens:** Lead board + lead detail (activity timeline, qualification form), Survey scheduling, Survey review, Quote builder, Quote list, Payments, Project confirmation, Customers.
- **Device:** desktop + phone (calls logged from the phone).

### 3.4 SURVEY_TECHNICIAN — "Measures the roof"
- **Goal:** submit a complete, correct survey from the rooftop in one visit.
- **Daily tasks:** see today's assigned surveys, navigate to site, start the survey, fill the measurement form, shoot photos, submit.
- **Screens:** Field layout — My surveys (today / upcoming), Survey detail, Survey report form (roof type, shadow-free area, direction, tilt, cable distance, structure height, earthing, recommended capacity + system type, photos).
- **Device:** **phone first** (360px), outdoors, one hand, bright sun. 48px tap targets, sticky submit button.

### 3.5 CUSTOMER — "Wants to know what is happening on their roof"
- **Goal:** see the quote, pay, watch the install progress, hold the warranty, raise a complaint.
- **Daily tasks (rare but high-stakes):** read and accept a quote, see payments and invoices, follow the project timeline, look up their systems and warranty end dates, raise a service request, confirm a repair is done.
- **Screens:** Portal overview, My projects + project timeline, My quotes (accept/reject), My payments, My invoices (PDF), My systems & warranties, My tickets (create, track, confirm).
- **Device:** **phone first** (360px).

### 3.6 WAREHOUSE_MANAGER — "Nothing leaves unscanned"
- **Goal:** the right kit, fully scanned, on the right truck, and the crew scheduled.
- **Daily tasks:** maintain products and stock, record purchases with serial numbers, start packing a dispatch, scan every serialized unit, pack non-serialized lines, dispatch with vehicle and driver details, record delivery, schedule the installation job and crew.
- **Screens:** Warehouse dashboard, Products, Inventory summary + low stock + adjustments, Purchases + Suppliers, Dispatch list + packing/scanning screen, Packing slip PDF, Delivery, Installation scheduling calendar.
- **Device:** desktop + tablet (the scanning screen must work on a tablet at the packing bench).

### 3.7 INSTALLATION_TECHNICIAN — "On the roof"
- **Goal:** finish the job and leave with proof: photos and a signature.
- **Daily tasks:** see assigned installation jobs and service visits, start the job, upload roof photos, complete the form, capture the customer signature; on a service visit, record diagnosis, parts used and labour hours.
- **Screens:** Field layout — My jobs, Job detail + checklist, Photo upload, Completion form with signature pad; My tickets, Visit form.
- **Device:** **phone/tablet first** (360px), often on a weak connection — forms must tolerate slow uploads.

### 3.8 SUPPORT_EXECUTIVE — "Finds the inverter in seconds"
- **Goal:** identify the customer and the exact unit, know the warranty answer, and track the complaint to a confirmed close.
- **Daily tasks:** look up by phone / name / serial / project code, check warranty, raise tickets, assign a technician, record activity, decide chargeable vs. free, bill service work.
- **Screens:** Support lookup, Customer 360 (systems + warranty status), Ticket list + ticket detail, Warranty check, Service billing.
- **Device:** desktop (headset).

---

## 4. End-to-end flow

```
WEB FORM / WHATSAPP / CALL / WALK-IN
        │
        ▼
 [1] Lead created  ENQ-2026-0001        status NEW            event lead.created -> notify sales
        │  duplicate phone? -> flagged + linked (BR-01)
        ▼
 [2] Qualification call                 CONTACTED -> QUALIFIED
        │  roof area, monthly bill, grid connection OK, sanctioned load
        ▼
 [3] Survey scheduled                   SURVEY_SCHEDULED      notify survey technician
        │
        ▼
 [4] Survey done on the roof            SURVEY_DONE           event survey.submitted
        │  roof type, shadow-free area, direction, tilt, cable distance, photos
        ▼
 [5] Survey approved by sales           SURVEY_APPROVED       event survey.approved
        │  (rejected -> SURVEY_REJECTED, reschedule)
        ▼
 [6] Quote from kit template            QT-2026-0001  DRAFT
        │  auto BOM from KitTemplateItem (BR-04); gate: survey APPROVED (BR-03)
        ▼
 [7] Quote sent                         SENT                  event quote.sent
        │  customer login created if missing + notified
        ▼
 [8] Quote accepted                     ACCEPTED              event quote.accepted
        │
        ▼
 [9] Project created  PRJ-2026-0001     AWAITING_ADVANCE
        │
        ▼
[10] Advance / full payment recorded    event payment.recorded -> invoice amountPaid/status
        │
        ▼
[11] Order confirmed                    CONFIRMED             event project.confirmed
        │  gate: paid >= advancePercent of quote total (BR-05)
        ├──> Dispatch DSP-2026-0001 PENDING + DispatchLines, stock reserved   (BR-06)
        ├──> InstallationJob UNSCHEDULED                                      (BR-06)
        ├──> PROFORMA Invoice INV-2026-0001
        ├──> SubsidyApplication NOT_STARTED (if subsidyEligible)
        └──> notify warehouse
        ▼
[12] Packing                            project PACKING / dispatch PACKING
        │
        ▼
[13] Serial scanning                    every serialized unit scanned (BR-07, BR-08)
        │  dispatch cannot complete with unscanned or mismatched units
        ▼
[14] Dispatched                         DISPATCHED            event dispatch.dispatched
        │  vehicle no, driver name + phone; notify customer
        ▼
[15] Delivered                          DELIVERED             event dispatch.delivered
        │  -> Warranty row per delivered serial, start = deliveredAt (BR-09)
        │  -> notify installation crew
        ▼
[16] Installation scheduled             INSTALLATION_SCHEDULED  event installation.scheduled
        │  warehouse picks date + crew (lead technician flagged); notify crew + customer
        ▼
[17] Installation in progress           INSTALLING
        │
        ▼
[18] Installation completed             INSTALLED             event installation.completed
        │  start + finish time, confirmed kW, generation test, checklist,
        │  >=3 photos, customer signature (BR-10)
        ├──> TAX Invoice for the balance
        └──> notify customer + director
        ▼
[19] Final invoice paid                 Invoice PAID
        │
        ▼
[20] Subsidy paperwork                  NOT_STARTED -> ... -> DISBURSED
        │
        ▼
[21] Project CLOSED
        │
        ▼
[22] Service tickets for 20 years       TKT-2026-0001
        warranty active  -> free, cost booked as warranty expense  (BR-11)
        warranty expired -> parts + labour billed automatically    (BR-11)
        closed only after the customer confirms                    (BR-12)
```

---

## 5. User stories with acceptance criteria

### Scene A — "The rooftop inquiry"

**US-A1 — As a homeowner, I submit the enquiry form so that sales calls me back.**
- Public form takes name, phone, email, address, city, pincode, requested system type, requested capacity, "I want the subsidy".
- On submit the response contains the enquiry code (`ENQ-2026-0001`); the code is shown on screen.
- The endpoint is rate limited (SECURITY.md) and needs no login.
- A `Lead` is created with `source = WEB_FORM`, `status = NEW`; `lead.created` is emitted and every SALES_EXECUTIVE gets a notification.
- **If the phone number already exists**, the lead is still created, `duplicateOfId` points at the earliest matching lead, and the sales board shows a "Duplicate" flag. The submission is never rejected (BR-01).

**US-A2 — As a sales executive, I see new enquiries the moment they land.**
- Lead board filterable by `status`, `source`, `assignedTo`, `overdue`, and free-text `q` (name, phone, code).
- A lead with `firstContactedAt = null` and `createdAt` older than 24h shows an **Overdue** badge (BR-02).
- Leads can never be deleted — only moved to `LOST` with a `lostReason` (BR-01).

**US-A3 — As a sales executive, I log a qualification call.**
- `POST /leads/:id/activities` records `type = CALL` with a message and sets `firstContactedAt` on the first contact.
- `POST /leads/:id/qualify` takes `roofAreaSqft`, `monthlyBillInr`, `gridConnectionOk`, `sanctionedLoadKw`, `qualificationNotes` and moves the lead to `QUALIFIED` or `NOT_QUALIFIED`.
- The server rejects qualification from any status other than `NEW` or `CONTACTED` with `409 INVALID_TRANSITION`.

**US-A4 — As a sales executive, I schedule a roof survey.**
- `POST /surveys` with `leadId`, `technicianId`, `scheduledAt`; only a `SURVEY_TECHNICIAN` may be assigned, else `422 INVALID_TECHNICIAN`.
- The lead moves to `SURVEY_SCHEDULED`; the technician is notified.
- Only a `QUALIFIED` lead can be scheduled, else `409 INVALID_TRANSITION`.

**US-A5 — As a survey technician, I submit the roof survey from my phone.**
- `GET /surveys` returns **only my** assigned surveys, grouped today / upcoming.
- `POST /surveys/:id/start` sets `IN_PROGRESS`; `PUT /surveys/:id/report` (multipart) saves measurements + photos and sets `SUBMITTED`, `submittedAt`.
- Required: `roofType`, `shadowFreeAreaSqft`, `roofDirection`, `tiltDegrees`, `cableDistanceMeters`, `recommendedCapacityKw`, `recommendedSystemType`, at least one photo.
- Works at 360px; every control at least 48px; the submit button is sticky at the bottom.
- Another technician's survey returns `403 FORBIDDEN`.

**US-A6 — As a sales executive, I approve the survey before any quote goes out.**
- `POST /surveys/:id/approve` → survey `APPROVED`, lead `SURVEY_APPROVED`, emits `survey.approved`.
- `POST /surveys/:id/reject` requires `rejectionReason` → survey `REJECTED`, lead `SURVEY_REJECTED`.
- DIRECTOR may also approve (D-09).
- **Acceptance:** creating a quote for a lead whose survey is not `APPROVED` returns `409 SURVEY_NOT_APPROVED` (BR-03). This is enforced in the service, not only in the UI.

### Scene B — "Getting the kit right"

**US-B1 — As a sales executive, I create a quote from a kit template and the parts list fills itself.**
- `POST /quotes { leadId, kitTemplateId }` copies every `KitTemplateItem` into `QuoteItem` rows with the product's current `sellPrice` and `taxPercent` (BR-04).
- Quote number `QT-2026-0001`, status `DRAFT`, `validUntil = today + settings.quoteValidityDays` (default 15).
- `subtotal`, `taxTotal`, `total` are computed with `Prisma.Decimal` — never JS floats (BR-14).
- A `Customer` is created from the lead if one does not exist yet.

**US-B2 — As a sales executive, I adjust the quote.**
- `PUT /quotes/:id/items` replaces the line set; `PATCH /quotes/:id` edits header fields; both only while `DRAFT`, else `409 QUOTE_LOCKED`.
- Adding a product not in the template is allowed. Quantities may change. Discount is an explicit header field and is audited (SECURITY.md).

**US-B3 — As a sales executive, I send the quote; the customer reads it in the portal.**
- `POST /quotes/:id/send` → `SENT`, `sentAt`, emits `quote.sent`.
- The listener creates a `CUSTOMER` user for the customer if none exists, and notifies them.
- `GET /quotes/:id/pdf` renders a branded PDF (company block from settings, line items, tax, total, validity).

**US-B4 — As a customer, I accept the quote in the portal.**
- `POST /quotes/:id/accept` is allowed for the owning CUSTOMER or a SALES_EXECUTIVE; a customer accepting another customer's quote gets `403 FORBIDDEN`.
- An `EXPIRED` quote (past `validUntil`) cannot be accepted: `409 QUOTE_EXPIRED`.
- Emits `quote.accepted`; the listener creates `Project PRJ-2026-0001` with `status = AWAITING_ADVANCE` and a unique `quoteId`.

**US-B5 — As a sales executive, I record the advance and confirm the order.**
- `POST /payments { projectId, customerId, amount, type, mode, reference, receivedAt }` records money — it does not process it (D-05).
- `POST /projects/:id/confirm` compares `sum(payments.amount)` against `quote.total × settings.advancePercent / 100`.
- Under-paid → `409 ADVANCE_NOT_RECEIVED` with `details.required` and `details.paid` (BR-05).
- On success: project `CONFIRMED`, emits `project.confirmed`.

**US-B6 — As a warehouse manager, the pick list and the install job appear without a phone call.**
- `project.confirmed` listeners create, each in one transaction: a `Dispatch` (`PENDING`) with one `DispatchLine` per quote item and reserved stock, and an `InstallationJob` (`UNSCHEDULED`) (BR-06).
- A `PROFORMA` invoice is created; a `SubsidyApplication` is created when `project.subsidyEligible`.
- Every WAREHOUSE_MANAGER is notified.

### Scene C — "Dispatch day and serial numbers"

**US-C1 — As a warehouse manager, I pack a dispatch against a pick list.**
- `POST /dispatches/:id/start-packing` → `PACKING`, project `PACKING`.
- Non-serialized lines: `POST /dispatches/:id/pack-line { lineId, qty }`, with `qty <= requiredQty`.

**US-C2 — As a warehouse manager, I scan every serialized unit.**
- `POST /dispatches/:id/scan { serialNumber }` validates, in order:
  - the serial exists → else `404 SERIAL_NOT_FOUND`;
  - `status = IN_STOCK`, or already reserved to this project → else `409 SERIAL_NOT_AVAILABLE` (BR-08);
  - `projectId` is null or this project → else `409 SERIAL_ON_OTHER_PROJECT` (BR-08);
  - the serial's product is on a dispatch line → else `422 PRODUCT_NOT_ON_DISPATCH`;
  - `scannedQty < requiredQty` for that line → else `409 LINE_ALREADY_COMPLETE`;
  - not already scanned on this dispatch → else `409 SERIAL_ALREADY_SCANNED`.
- On success the serial becomes `RESERVED` with `projectId` and `dispatchId` set, and `scannedQty` increments.
- `DELETE /dispatches/:id/scan/:serialNumber` reverses it while the dispatch is still `PACKING`.
- Scan feedback is immediate and loud: a green line when complete, a red reason on failure.

**US-C3 — As a warehouse manager, I cannot dispatch an incomplete load.**
- `POST /dispatches/:id/dispatch` requires every line to satisfy `scannedQty = requiredQty` (serialized) and `packedQty = requiredQty` (non-serialized), else `409 DISPATCH_INCOMPLETE` listing the short lines (BR-07).
- Requires `vehicleNo`, `driverName`, `driverPhone`. Serials → `DISPATCHED`; project → `DISPATCHED`; emits `dispatch.dispatched`; the customer is notified.
- `GET /dispatches/:id/packing-slip` gives a printable PDF with every serial number.

**US-C4 — As the company, the warranty clock starts by itself on delivery.**
- `POST /dispatches/:id/deliver { deliveredAt, receivedByName }` → dispatch and project `DELIVERED`, serials `DELIVERED`.
- **In the same transaction**, one `Warranty` row per delivered serial: `startDate = deliveredAt`, `endDate = startDate + product.warrantyMonths` (BR-09). Panels 240 months, inverter/battery 24–60 months — the duration always comes from the product, never from code.
- `warranty.status` is derived in the service: `ACTIVE` while `now <= endDate` and not voided, `EXPIRED` after, `VOID` when voided with a reason.
- Emits `dispatch.delivered`; the installation crew is notified.

### Scene D — "On the roof"

**US-D1 — As a warehouse manager, I schedule the installation and the crew.**
- `PATCH /installations/:id/schedule { scheduledDate, crew: [{ technicianId, isLead }] }` → `SCHEDULED`, project `INSTALLATION_SCHEDULED`.
- At least one crew member and exactly one `isLead = true`, else `422 INVALID_CREW`.
- Only `INSTALLATION_TECHNICIAN` users may be crew. Emits `installation.scheduled`; crew + customer notified.

**US-D2 — As an installation technician, I see only my jobs.**
- `GET /installations/my` returns jobs where I am on the crew. Another job by id → `403 FORBIDDEN`.

**US-D3 — As an installation technician, I complete the job with proof.**
- `POST /installations/:id/start` sets `startedAt`, status `IN_PROGRESS`, project `INSTALLING`.
- `POST /installations/:id/photos` (multipart) stores photos as `Attachment` rows (`entityType = INSTALLATION`, `kind = PHOTO`).
- `POST /installations/:id/complete { finishedAt, confirmedCapacityKw, generationTestKw, checklist, signatureDataUrl, signedByName }` requires:
  - `startedAt` present, else `409 NOT_STARTED`;
  - `finishedAt > startedAt`, else `422 INVALID_TIME_RANGE`;
  - `confirmedCapacityKw > 0`;
  - **at least 3 photos** already uploaded, else `422 PHOTOS_REQUIRED`;
  - a signature, else `422 SIGNATURE_REQUIRED` (BR-10).
- The signature is stored as an image file; `signedByName` and `signedAt` are recorded.
- A `TimeLog` is written for the crew from `startedAt`–`finishedAt`, feeding labour cost and payouts.
- Emits `installation.completed`; project `INSTALLED`; a `TAX` invoice for the balance is created; customer + director notified.
- **Acceptance:** completing without a signature, or with 2 photos, fails on the server even if the UI is bypassed.

### Scene E — "The rainy season breakdown"

**US-E1 — As a support executive, I find the customer and the exact unit in seconds.**
- `GET /support/lookup?q=` matches phone, name, serial number and project code, and returns the customer, their systems (serial, product, project) and each unit's warranty status and end date.
- A full serial number query returns the unit directly; `GET /serials/:serialNumber` gives its history timeline (purchased → dispatched → delivered → tickets → replaced).

**US-E2 — As a support executive, I raise a ticket against a serial.**
- `POST /tickets { customerId, projectId?, serialUnitId?, source, category, faultCode, description, priority }` → `TKT-2026-0001`, `status = OPEN`.
- When `serialUnitId` is given, the service resolves the warranty and sets `isUnderWarranty` and `isChargeable = !isUnderWarranty` (BR-11).
- Emits `ticket.created`; SUPPORT is notified. A CUSTOMER may raise a ticket only for their own serial/project.

**US-E3 — As an installation technician, I record the service visit.**
- `PATCH /tickets/:id/assign { assignedToId }` → `ASSIGNED`.
- `POST /tickets/:id/visit { diagnosis, parts: [{ productId, quantity, oldSerialId?, newSerialId? }], labourHours, replacementSerials }` writes `TicketPart` rows with both `unitPrice` and `unitCost`, and a `TimeLog`.
- A replacement unit **inherits the remaining warranty** of the unit it replaces (D-07): the new serial's warranty `endDate` is copied from the old one; the old serial becomes `REPLACED` with `replacedById` set, and its warranty `VOID` with a reason.
- Waiting on stock → `AWAITING_PARTS`.

**US-E4 — As the company, warranty work is free and out-of-warranty work is billed automatically.**
- `POST /tickets/:id/resolve` → `RESOLVED`, `resolvedAt`, emits `ticket.resolved`; the customer is asked to confirm.
- If `isChargeable`, `ticket.billable { ticketId, lines }` is emitted and a `SERVICE` invoice is created from `TicketPart.unitPrice × quantity` plus `labourHours × settings.labourRatePerHour` plus `settings.serviceVisitCharge` (BR-11).
- If free, `ticket.closed` books the cost (`TicketPart.unitCost` + labour at cost) as a warranty expense against the project (BR-11), so BR-13 profit stays honest.

**US-E5 — As a customer, nothing is closed until I say it works.**
- `POST /tickets/:id/confirm` by the owning CUSTOMER sets `customerConfirmedAt` and closes the ticket.
- SUPPORT may confirm on the customer's behalf **only with a `confirmationNote`** recording how the confirmation was received, else `422 CONFIRMATION_NOTE_REQUIRED` (BR-12).
- `POST /tickets/:id/resolve` alone never reaches `CLOSED`.
- `POST /tickets/:id/reopen` moves a `RESOLVED` or `CLOSED` ticket to `REOPENED`.

### Scene F — "The director's month-end"

**US-F1 — As the director, I see how the company is doing today, this week and this month.**
- `GET /reports/overview?range=today|week|month|custom&from&to` returns enquiries, surveys, quotes sent/accepted, orders confirmed, kW installed, revenue invoiced, payments received, profit, open tickets and overdue leads — each with the previous-period delta.

**US-F2 — As the director, I see which installations made money.**
- `GET /reports/profitability` lists every project with revenue, material cost, labour cost, expenses, warranty service cost, profit and margin %, sortable, with loss-making projects marked.
- `GET /reports/profitability/:projectId` breaks one project down line by line (BR-13).

**US-F3 — As the director, I see what is unfinished.**
- `GET /reports/unfinished` lists projects stuck at each stage with days-in-stage: awaiting advance, confirmed but not packed, dispatched but not delivered, delivered but not scheduled, installed but not invoiced, invoiced but not paid, subsidy pending, tickets open.

**US-F4 — As the director, I handle invoices, subsidy and payouts.**
- Invoices: list, create, change status, download PDF; `amountPaid` and status are maintained by the `payment.recorded` listener.
- Subsidy: track `NOT_STARTED → DOCUMENTS_PENDING → APPLIED → INSPECTION_DONE → APPROVED → DISBURSED` (or `REJECTED`) with refs, dates, expected and received amounts, and uploaded documents. No real government portal (out of scope).
- Payouts: `POST /payouts/generate` sums approved `TimeLog` minutes per technician for a period × `User.hourlyRate`, plus incentive → `DRAFT`, then approve, then mark paid.

**US-F5 — As the director, I share the numbers.**
- `POST /reports/share` returns `{ url, expiresAt }` backed by a `ShareLink` row with a random token and an expiry; `GET /public/reports/:token` serves a read-only report with no login. An expired or unknown token → `404`.
- `GET /reports/export?type=csv|pdf&report=` downloads the same data.

---

## 6. State machines

### 6.1 LeadStatus

```
NEW ──> CONTACTED ──> QUALIFIED ──> SURVEY_SCHEDULED ──> SURVEY_DONE ──> SURVEY_APPROVED ──> QUOTED ──> WON
 │           │             │                                  │
 │           │             └──> NOT_QUALIFIED                 └──> SURVEY_REJECTED
 │           │                       │                                  │
 └───────────┴───────────────────────┴──────────────────────────────────┴──> LOST
```

| From | Allowed to |
|---|---|
| `NEW` | `CONTACTED`, `QUALIFIED`, `NOT_QUALIFIED`, `LOST` |
| `CONTACTED` | `QUALIFIED`, `NOT_QUALIFIED`, `LOST` |
| `QUALIFIED` | `SURVEY_SCHEDULED`, `LOST` |
| `NOT_QUALIFIED` | `CONTACTED`, `LOST` |
| `SURVEY_SCHEDULED` | `SURVEY_DONE`, `SURVEY_SCHEDULED` (reschedule), `LOST` |
| `SURVEY_DONE` | `SURVEY_APPROVED`, `SURVEY_REJECTED` |
| `SURVEY_APPROVED` | `QUOTED`, `LOST` |
| `SURVEY_REJECTED` | `SURVEY_SCHEDULED`, `LOST` |
| `QUOTED` | `WON`, `LOST` |
| `WON` | — (terminal) |
| `LOST` | `CONTACTED` (revived) |

Leads are never deleted (BR-01). `LOST` always carries a `lostReason`.

### 6.2 SurveyStatus

```
SCHEDULED ──> IN_PROGRESS ──> SUBMITTED ──> APPROVED
    │                             │
    │                             └──> REJECTED ──> (new survey SCHEDULED)
    └──> CANCELLED
```

| From | Allowed to |
|---|---|
| `SCHEDULED` | `IN_PROGRESS`, `SCHEDULED` (reschedule), `CANCELLED` |
| `IN_PROGRESS` | `SUBMITTED`, `CANCELLED` |
| `SUBMITTED` | `APPROVED`, `REJECTED` |
| `APPROVED` | — (terminal) |
| `REJECTED` | — (terminal; a replacement survey is created) |
| `CANCELLED` | — (terminal) |

### 6.3 QuoteStatus

```
DRAFT ──> SENT ──> ACCEPTED
  │         │
  │         ├──> REJECTED
  │         └──> EXPIRED  (validUntil passed; set by cron)
  └──> EXPIRED
```

| From | Allowed to |
|---|---|
| `DRAFT` | `SENT`, `EXPIRED` |
| `SENT` | `ACCEPTED`, `REJECTED`, `EXPIRED` |
| `ACCEPTED` | — (terminal) |
| `REJECTED` | — (terminal) |
| `EXPIRED` | — (terminal; sales clones it into a new `DRAFT`) |

Editing is allowed only in `DRAFT` (BR-04).

### 6.4 ProjectStatus

```
AWAITING_ADVANCE ──> CONFIRMED ──> PACKING ──> DISPATCHED ──> DELIVERED
                                                                  │
                                                                  v
CLOSED <── INSTALLED <── INSTALLING <── INSTALLATION_SCHEDULED <───┘

any non-terminal ──> CANCELLED
```

| From | Allowed to | Driven by |
|---|---|---|
| `AWAITING_ADVANCE` | `CONFIRMED`, `CANCELLED` | `POST /projects/:id/confirm` (BR-05) |
| `CONFIRMED` | `PACKING`, `CANCELLED` | `dispatches/:id/start-packing` |
| `PACKING` | `DISPATCHED`, `CANCELLED` | `dispatches/:id/dispatch` (BR-07) |
| `DISPATCHED` | `DELIVERED` | `dispatches/:id/deliver` (BR-09) |
| `DELIVERED` | `INSTALLATION_SCHEDULED` | `installations/:id/schedule` |
| `INSTALLATION_SCHEDULED` | `INSTALLING` | `installations/:id/start` |
| `INSTALLING` | `INSTALLED` | `installations/:id/complete` (BR-10) |
| `INSTALLED` | `CLOSED` | the director closes it after the final invoice is paid and subsidy is settled |
| `CLOSED` | — (terminal; service tickets continue) | |
| `CANCELLED` | — (terminal) | |

### 6.5 DispatchStatus

```
PENDING ──> PACKING ──> READY ──> DISPATCHED ──> DELIVERED
```

| From | Allowed to |
|---|---|
| `PENDING` | `PACKING` |
| `PACKING` | `READY` (all lines complete), `PACKING` |
| `READY` | `DISPATCHED`, `PACKING` (reopen) |
| `DISPATCHED` | `DELIVERED` |
| `DELIVERED` | — (terminal) |

### 6.6 SerialStatus

```
IN_STOCK ──> RESERVED ──> DISPATCHED ──> DELIVERED ──> UNDER_REPAIR ──> DELIVERED
   ^            │                                          │
   │            └──> IN_STOCK (unscan)                      └──> REPLACED (terminal)
   └──── RETURNED <──────────────────────────────────────── DELIVERED
                                                            SCRAPPED (terminal)
```

| From | Allowed to |
|---|---|
| `IN_STOCK` | `RESERVED`, `RETURNED`, `SCRAPPED` |
| `RESERVED` | `DISPATCHED`, `IN_STOCK` (unscan / cancel) |
| `DISPATCHED` | `DELIVERED`, `RETURNED` |
| `DELIVERED` | `UNDER_REPAIR`, `REPLACED`, `RETURNED` |
| `UNDER_REPAIR` | `DELIVERED`, `REPLACED`, `SCRAPPED` |
| `REPLACED` | — (terminal) |
| `RETURNED` | `IN_STOCK`, `SCRAPPED` |
| `SCRAPPED` | — (terminal) |

A serial belongs to one project only; only `IN_STOCK` serials can be scanned (BR-08).

### 6.7 InstallationStatus

```
UNSCHEDULED ──> SCHEDULED ──> IN_PROGRESS ──> COMPLETED
                    ^              │
                    └──────────────┘ (reschedule before start)
```

| From | Allowed to |
|---|---|
| `UNSCHEDULED` | `SCHEDULED` |
| `SCHEDULED` | `IN_PROGRESS`, `SCHEDULED` (reschedule) |
| `IN_PROGRESS` | `COMPLETED` |
| `COMPLETED` | — (terminal) |

### 6.8 TicketStatus

```
OPEN ──> ASSIGNED ──> IN_PROGRESS ──> RESOLVED ──> CLOSED
                           │              │           │
                           v              └──> REOPENED <┘
                    AWAITING_PARTS ──> IN_PROGRESS
```

| From | Allowed to |
|---|---|
| `OPEN` | `ASSIGNED`, `CLOSED` (no fault found, with confirmation) |
| `ASSIGNED` | `IN_PROGRESS`, `OPEN` (unassign) |
| `IN_PROGRESS` | `AWAITING_PARTS`, `RESOLVED` |
| `AWAITING_PARTS` | `IN_PROGRESS` |
| `RESOLVED` | `CLOSED` (customer confirmed, BR-12), `REOPENED` |
| `CLOSED` | `REOPENED` |
| `REOPENED` | `ASSIGNED`, `IN_PROGRESS` |

### 6.9 InvoiceStatus

```
DRAFT ──> ISSUED ──> PARTIALLY_PAID ──> PAID
  │          │              │
  └──────────┴──────────────┴──> CANCELLED
```

| From | Allowed to |
|---|---|
| `DRAFT` | `ISSUED`, `CANCELLED` |
| `ISSUED` | `PARTIALLY_PAID`, `PAID`, `CANCELLED` |
| `PARTIALLY_PAID` | `PAID`, `CANCELLED` |
| `PAID` | — (terminal) |
| `CANCELLED` | — (terminal) |

`PARTIALLY_PAID` and `PAID` are set by the `payment.recorded` listener: `amountPaid >= total` → `PAID`, `0 < amountPaid < total` → `PARTIALLY_PAID`.

### 6.10 SubsidyStatus

```
NOT_STARTED ──> DOCUMENTS_PENDING ──> APPLIED ──> INSPECTION_DONE ──> APPROVED ──> DISBURSED
                                         │              │                │
                                         └──────────────┴────────────────┴──> REJECTED
```

| From | Allowed to |
|---|---|
| `NOT_STARTED` | `DOCUMENTS_PENDING` |
| `DOCUMENTS_PENDING` | `APPLIED` |
| `APPLIED` | `INSPECTION_DONE`, `REJECTED` |
| `INSPECTION_DONE` | `APPROVED`, `REJECTED` |
| `APPROVED` | `DISBURSED`, `REJECTED` |
| `DISBURSED` | — (terminal) |
| `REJECTED` | `DOCUMENTS_PENDING` (re-apply) |

### 6.11 PayoutStatus

`DRAFT → APPROVED → PAID`. `DRAFT` may be regenerated; `APPROVED` may return to `DRAFT`; `PAID` is terminal.

---

## 7. Business rules

Every rule below is enforced **on the server**. The UI mirrors them for a better experience, never as the only check.

| ID | Rule |
|---|---|
| **BR-01** | Enquiries are never deleted. Duplicate phone numbers are flagged (`duplicateOfId`) and linked, not rejected. A lead that goes nowhere is set to `LOST` with a `lostReason`. |
| **BR-02** | A lead with no logged contact (`firstContactedAt = null`) for 24 hours is flagged **overdue** on the sales board and surfaced in the director's unfinished report. `settings.surveySlaHours` governs the equivalent survey SLA. |
| **BR-03** | A quote can only be created when the lead's survey status is `APPROVED`. Enforced in `quotes.service.js`; violation → `409 SURVEY_NOT_APPROVED`. |
| **BR-04** | Quote lines are generated from a `KitTemplate`'s items. Sales may change quantities and add items while the quote is `DRAFT`; a `SENT` or later quote is locked. |
| **BR-05** | An order is confirmed only when `sum(payments for the project) >= quote.total × settings.advancePercent / 100` (default 30%). Violation → `409 ADVANCE_NOT_RECEIVED` with `{ required, paid }`. |
| **BR-06** | On `project.confirmed` the system auto-creates a dispatch pick list (`Dispatch` + one `DispatchLine` per quote item, stock reserved) and an `UNSCHEDULED` `InstallationJob`. No human hand-off. |
| **BR-07** | Every serialized product (panel, inverter, battery, charge controller) must be scanned before dispatch. A dispatch cannot move to `DISPATCHED` with unscanned or mismatched units → `409 DISPATCH_INCOMPLETE`. |
| **BR-08** | A serial can belong to only one project. Only `IN_STOCK` serials can be scanned. Re-scanning, cross-project scanning and already-dispatched serials are all rejected with distinct error codes. |
| **BR-09** | On delivery, a `Warranty` row is created for **every** delivered serial in the same transaction: `startDate = deliveredAt`, `endDate = startDate + product.warrantyMonths`. Duration always comes from the product (panels 240 months, inverter/battery 24–60). |
| **BR-10** | Installation completion requires a start time, a finish time after it, a confirmed system size, **at least 3 photos** and a **customer signature**. Missing any of them → `422`. |
| **BR-11** | A ticket on a serial with an `ACTIVE` warranty is free to the customer; its cost is booked as a warranty expense against the project. Otherwise parts (`unitPrice`) + labour (`labourHours × settings.labourRatePerHour`) + `settings.serviceVisitCharge` are billed automatically as a `SERVICE` invoice. |
| **BR-12** | A ticket is closed only after the customer confirms resolution — the portal confirm button, or support recording the confirmation with a mandatory note. |
| **BR-13** | `Project profit = invoiced revenue − (material cost + labour cost + project expenses + warranty service cost)`. Material = sum of delivered `SerialUnit.unitCost` + non-serialized `PurchaseItem.unitCost × qty`. Labour = approved `TimeLog.minutes / 60 × User.hourlyRate`. Expenses = `Expense` rows on the project. Warranty service cost = free-ticket parts at `unitCost` + labour at cost. |
| **BR-14** | Money is stored as `Decimal(12,2)` in INR. Tax percentages come from `Setting` (`defaultTaxPercent`) or the product; rates are never hard-coded. All arithmetic uses `Prisma.Decimal`. |
| **BR-15** | Users are deactivated (`isActive = false`), never deleted — their history must stay readable. |
| **BR-16** | Ownership is enforced on every read and write: a CUSTOMER sees only their own records, a SURVEY_TECHNICIAN only their assigned surveys, an INSTALLATION_TECHNICIAN only their assigned jobs and tickets. Violation → `403 FORBIDDEN`. |
| **BR-17** | Human-readable codes (`ENQ`/`QT`/`PRJ`/`DSP`/`TKT`/`INV`) are generated from the `Counter` table **inside the same transaction** as the row they identify, so numbers never collide and never skip. |
| **BR-18** | Sensitive actions are written to `AuditLog` with before/after: role change, price or discount change, serial override, payment recorded, ticket billing decision, settings change, inventory adjustment. |

---

## 8. Out of scope (simulated for the demo)

| Area | What we do instead |
|---|---|
| Payment gateway | Payments are **recorded**, not processed (D-05). Mode and reference are typed in by sales. |
| SMS / WhatsApp API | `Notification` rows + in-app bell. WhatsApp is only a lead `source` value. |
| Government subsidy portal | `SubsidyApplication` tracks the paperwork and its status by hand; no integration. |
| Email delivery | Quote and invoice PDFs are downloadable; no SMTP. |
| Barcode hardware | The scan screen accepts keyboard/wedge input and typed serials — the same endpoint a real scanner would hit. |
| Offline-first field app | Forms are mobile-first and tolerant of slow uploads, but assume connectivity. |
| Real tax filing / GST returns | GSTIN and tax lines are stored and printed; nothing is filed. |

---

## 9. Demo script (8 minutes)

| Time | Role | What is shown |
|---|---|---|
| 0:00–0:45 | **Visitor** (public site) | Landing page, packages by capacity, submit a 3 kW subsidy enquiry → enquiry code on screen. |
| 0:45–1:45 | **SALES_EXECUTIVE** | Lead board: the new enquiry at the top, an overdue lead flagged, a duplicate linked. Open the lead, log the qualification call (roof 450 sqft, bill ₹4,200, grid OK), qualify, schedule the survey for a named technician. |
| 1:45–2:30 | **SURVEY_TECHNICIAN** (phone frame) | My surveys → today's job. Start, fill roof type RCC, 420 sqft shadow-free, south, 15°, 18 m cable, earthing available, recommend 3 kW On-Grid, attach two photos, submit. |
| 2:30–3:15 | **SALES_EXECUTIVE** | Survey review → approve. Create a quote from the "3 kW On-Grid" template — **the full parts list appears on its own**. Bump the mounting quantity, send. Show the PDF. |
| 3:15–3:45 | **CUSTOMER** (phone frame) | Portal → quote → accept. The project appears as *Awaiting advance*. |
| 3:45–4:15 | **SALES_EXECUTIVE** | Record a ₹54,000 advance (UPI). Confirm the order — **pick list, install job, proforma invoice and subsidy file appear by themselves**. Show the failure case first: confirm with ₹5,000 → *Advance not received, ₹54,000 required*. |
| 4:15–5:15 | **WAREHOUSE_MANAGER** (tablet frame) | Dispatch → start packing. Scan the inverter serial → green. Scan it again → *Already scanned*. Scan a serial from another project → *Serial is on project PRJ-2026-0003*. Try to dispatch one panel short → *Dispatch incomplete: 1 × 540W panel*. Scan the last unit, dispatch with vehicle + driver, show the packing slip PDF, record delivery. **Warranty rows appear instantly — 20 years on panels, 2 on the inverter.** Schedule the install with a two-person crew. |
| 5:15–6:00 | **INSTALLATION_TECHNICIAN** (phone frame) | My jobs → start, upload three roof photos, confirm 3 kW, generation test 2.7 kW, tick the checklist, customer signs on screen, complete. Project → *Installed*; the tax invoice is created. |
| 6:00–6:45 | **SUPPORT_EXECUTIVE** | The rainy-season call: look up the phone number → customer, 3 kW system, inverter serial, **warranty active until 2028**. Raise a ticket (`INVERTER_FAULT`, fault code E-04) → *free of charge*. Assign a technician, record the visit with a replacement unit (the new serial inherits the remaining warranty), resolve. Then show an out-of-warranty ticket → service invoice generated automatically. |
| 6:45–7:00 | **CUSTOMER** | Portal → ticket → *Confirm resolved*. The ticket closes. |
| 7:00–7:45 | **DIRECTOR** | Overview: today / this week / this month with deltas. Profitability list — one loss-making project highlighted, drill in to see why (extra civil work expense). Unfinished report. Generate the payout for the month's technician hours. Share a report link, open it in a fresh tab with no login. |
| 7:45–8:00 | **SUPER_ADMIN** | Users and roles, the kit template editor, and the audit log showing the discount change and the serial override from the demo. |
