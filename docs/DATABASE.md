# DATABASE.md

PostgreSQL via Prisma. `server/prisma/schema.prisma` is a **shared file** — additive changes only
(`AGENTS.md` section 5). A breaking change (dropped column, renamed field, changed enum value) is a
**stop-and-ask**.

---

## 1. ER overview

```
                         ┌──────────┐
                         │   User   │ role: 8 locked roles, isActive, hourlyRate
                         └────┬─────┘
            ┌─────────────────┼────────────────┬──────────────┬─────────────┐
            │ userId?         │ assignedToId   │ technicianId │ userId      │
      ┌─────▼──────┐    ┌─────▼────┐     ┌─────▼────┐   ┌─────▼────────┐
      │  Customer  │◄───┤   Lead   ├────►│  Survey  │   │ Notification │
      └─────┬──────┘    └────┬─────┘     └────┬─────┘   │ AuditLog     │
            │                │ duplicateOfId  │          │ TimeLog      │
            │                │ (self)         │          │ Payout       │
            │           ┌────▼──────────┐     │          └──────────────┘
            │           │ LeadActivity  │     │
            │           └───────────────┘     │
            │                                 │
            │           ┌──────────┐    ┌─────▼──────┐
            ├──────────►│  Quote   │◄───┤ KitTemplate│──► KitTemplateItem ──► Product
            │           └────┬─────┘    └────────────┘                          ▲
            │                │ QuoteItem ──────────────────────────────────────►│
            │                │ (1:1)                                            │
            │           ┌────▼──────┐                                           │
            ├──────────►│  Project  │ code, status, systemType, capacityKw       │
            │           └────┬──────┘                                           │
            │                │                                                  │
            │   ┌────────────┼──────────────┬──────────────┬───────────────┐     │
            │   │ 1:1        │ 1:1          │              │               │     │
            │ ┌─▼────────┐ ┌─▼───────────┐ ┌▼───────────┐ ┌▼─────────┐     │     │
            │ │ Dispatch │ │Installation │ │  Payment   │ │ Expense  │     │     │
            │ │          │ │    Job      │ └────────────┘ └──────────┘     │     │
            │ └─┬────────┘ └─┬───────────┘                                │     │
            │   │ DispatchLine │ InstallationCrew ──► User                 │     │
            │   │   └──────────┼──────────────────────────────────────────►│     │
            │   │              │                                                │
            │ ┌─▼──────────────▼──┐                                             │
            │ │    SerialUnit     │ serialNumber (unique), status, projectId     │
            │ │                   ├────────────────────────────────────────────► │
            │ └─┬─────────────┬───┘   productId                                 │
            │   │ 1:1         │ replacedById (self)                             │
            │ ┌─▼────────┐    │                            ┌──────────┐         │
            ├►│ Warranty │    │                            │ Purchase │         │
            │ └──────────┘    │                            └────┬─────┘         │
            │                 │  purchaseItemId                 │ supplierId    │
            │                 └─────────────────────► PurchaseItem ──────────────┘
            │                                              │
            │                                         ┌────▼─────┐
            │                                         │ Supplier │
            │                                         └──────────┘
            │           ┌──────────┐
            ├──────────►│  Ticket  │ serialUnitId?, projectId?, isUnderWarranty
            │           └────┬─────┘
            │                ├──► TicketActivity
            │                └──► TicketPart ──► Product, SerialUnit (old/new)
            │
            │           ┌──────────┐
            └──────────►│ Invoice  │──► InvoiceLine
                        └──────────┘    projectId? ticketId?

      Project 1:1 ──► SubsidyApplication
      Attachment (polymorphic: entityType + entityId) ──► SURVEY | INSTALLATION | TICKET |
                                                          SUBSIDY | PURCHASE | PROJECT
      Standalone: Setting (key/value Json) · Counter (code sequences) · ShareLink
```

**The spine:** `Lead → Survey → Quote → Project`, and from `Project` everything operational hangs —
`Dispatch` (and through it `SerialUnit` → `Warranty`), `InstallationJob`, `Payment`, `Invoice`,
`Expense`, `SubsidyApplication`, and later `Ticket`.

**The money trail (BR-13):** revenue from `Invoice`; material cost from `SerialUnit.unitCost` and
`PurchaseItem.unitCost`; labour from `TimeLog` × `User.hourlyRate`; other cost from `Expense`;
warranty service cost from `TicketPart.unitCost` on free tickets.

---

## 2. Models

### Identity and people

| Model | Purpose |
|---|---|
| **User** | Every login, staff or customer. `role` is one of the 8 locked roles. `isActive` is the soft delete (BR-15) — users are never deleted, so history stays readable. `hourlyRate` is set for technicians and drives labour cost and payouts. `phone` is nullable because staff accounts are created by email. `passwordHash` is bcrypt, 10 rounds. |
| **Customer** | The commercial party, separate from the login. `userId` is optional and unique: a customer exists from the first enquiry, and only gets a login when a quote is sent (`quote.sent`). Holds the site address used on quotes, invoices and dispatches. `customerType` splits residential rooftops from small factories. |

### Sales funnel

| Model | Purpose |
|---|---|
| **Lead** | An enquiry, from the moment it arrives. `code` = `ENQ-2026-0001`. Never deleted (BR-01). `duplicateOfId` self-links a repeat phone number instead of rejecting it. `firstContactedAt` drives the 24h overdue flag (BR-02). The qualification answers (`roofAreaSqft`, `monthlyBillInr`, `gridConnectionOk`, `sanctionedLoadKw`) live here, captured on the phone before anyone drives to site. `customerId` is filled once the lead becomes a real customer. |
| **LeadActivity** | The call/note/WhatsApp/visit log on a lead, append-only. This is what sales reads before dialling, and what proves the lead was worked. |
| **Survey** | One rooftop visit. Carries the scheduling fields, the measurements the technician takes (roof type, shadow-free area, direction, tilt, cable distance, structure height, earthing), the recommendation, and the review fields (`reviewedById`, `reviewedAt`, `rejectionReason`). `APPROVED` here is the gate for quoting (BR-03). |

### Catalogue and kits

| Model | Purpose |
|---|---|
| **Product** | Everything that can be sold, bought or consumed, including `SERVICE` lines like installation labour. `sku` unique. `isSerialized` decides whether units are tracked individually (`SerialUnit`) or by `stockQty`. `warrantyMonths` is the single source of warranty duration (BR-09) — 240 for panels, 24–60 for inverters and batteries. `specs` is `Json` so a 540W bifacial panel and a 5kVA hybrid inverter can each carry their own fields without schema churn. `costPrice` feeds margin, `sellPrice` feeds quotes, `taxPercent` feeds tax (BR-14). |
| **KitTemplate** | A sellable package — "3 kW On-Grid". `basePrice` is the headline number on the public site. |
| **KitTemplateItem** | The bill of materials for a kit. This is what makes BR-04 work: expanding a template fills a quote with every panel, stand, box, cable and connector so nothing is forgotten. |

### Quotes, projects, money in

| Model | Purpose |
|---|---|
| **Quote** | `number` = `QT-2026-0001`. Snapshot of what was offered: `subtotal`, `discount`, `taxTotal`, `total` are stored, not recomputed, so a later price change never rewrites history. `validUntil` from `settings.quoteValidityDays`. Editable only while `DRAFT` (BR-04). |
| **QuoteItem** | One priced line. `unitPrice` and `taxPercent` are copied from the product at creation time — the quote must not change when the catalogue does. |
| **Project** | The job. `code` = `PRJ-2026-0001`, `quoteId` **unique** (one project per accepted quote). The status field is the operational spine (see 6.4 in `PRD.md`). The milestone timestamps (`confirmedAt`, `deliveredAt`, `installedAt`, `closedAt`) are what the director's unfinished report measures days-in-stage against. |
| **Payment** | Money **recorded**, not processed (D-05). `projectId` for project payments, `invoiceId` for invoice settlement, `type` separates advance/partial/final/service. `mode` + `reference` are what sales types in from the UPI or bank message. `recordedById` makes it auditable (BR-18). |

### Procurement and stock

| Model | Purpose |
|---|---|
| **Supplier** | Who we buy from. `gstin` for the purchase record. |
| **Purchase** | A goods-in event with the supplier's `invoiceRef` and `total`. |
| **PurchaseItem** | Line of a purchase, carrying `unitCost` — the true landed cost that feeds material cost in BR-13 for non-serialized items. |
| **SerialUnit** | **The model the whole warranty story rests on.** One physical panel, inverter, battery or charge controller. `serialNumber` unique across the company. `unitCost` is this unit's own cost, so profit is exact rather than averaged. `status` tracks it from `IN_STOCK` to `DELIVERED` and beyond. `projectId` is set at scan time and is the enforcement point for BR-08 (one project only). `dispatchId` records which load it left on. `replacedById` self-links a warranty replacement, which is how D-07 (inherited remaining warranty) is traceable. |

### Dispatch and warranty

| Model | Purpose |
|---|---|
| **Dispatch** | One delivery to one project. `number` = `DSP-2026-0001`, `projectId` **unique**. Created automatically on `project.confirmed` (BR-06). Carries the vehicle and driver details and the delivery acknowledgement (`deliveredAt`, `receivedByName`). |
| **DispatchLine** | The pick list, one row per quote item. `requiredQty` is what must go. `scannedQty` counts serialized units actually scanned; `packedQty` counts non-serialized units confirmed. BR-07 is the comparison of these three numbers. |
| **Warranty** | One row per delivered serial, `serialUnitId` **unique**. Written inside the delivery transaction (BR-09): `startDate = deliveredAt`, `endDate = startDate + product.warrantyMonths`. `status` is **derived in the service**, not stored — `ACTIVE` while `now <= endDate` and `voidReason` is null, `EXPIRED` after, `VOID` when voided. This is the row support reads to answer "is it covered?" in one query. |

### Installation and labour

| Model | Purpose |
|---|---|
| **InstallationJob** | One rooftop install, `projectId` **unique**. Created `UNSCHEDULED` on `project.confirmed` (BR-06); scheduled by the warehouse (D-09). The completion proof lives here: `startedAt`, `finishedAt`, `confirmedCapacityKw`, `generationTestKw`, `checklist` (`Json`), `customerSignatureUrl`, `signedByName`, `signedAt` — all required by BR-10. |
| **InstallationCrew** | Which technicians were on the job, with exactly one `isLead`. |
| **TimeLog** | Minutes worked by a technician against a survey, installation or ticket. `minutes` is stored as an integer rather than re-derived, so a corrected timestamp cannot silently change a past payout. `approved` gates it into payouts and into labour cost (BR-13). |

### Service

| Model | Purpose |
|---|---|
| **Ticket** | A complaint. `number` = `TKT-2026-0001`. `serialUnitId` is the link that makes "which inverter?" answerable. `isUnderWarranty` and `isChargeable` are resolved at creation from the warranty and then frozen, so a ticket opened one day before expiry stays free (BR-11). `customerConfirmedAt` + `confirmationNote` are what BR-12 requires before closing. |
| **TicketActivity** | The ticket log — calls, notes, status changes. |
| **TicketPart** | Parts and labour used on a visit. Stores **both** `unitPrice` (what the customer is billed) and `unitCost` (what it cost us), because the same row serves a service invoice when chargeable and a warranty expense when free (BR-11, BR-13). `oldSerialId` / `newSerialId` record a unit swap. |

### Finance and governance

| Model | Purpose |
|---|---|
| **Invoice** | `number` = `INV-2026-0001`. `type` separates `PROFORMA` (on order confirmation), `TAX` (after installation) and `SERVICE` (out-of-warranty work). `amountPaid` is maintained by the `payment.recorded` listener and drives the status. |
| **InvoiceLine** | Printed line items — stored text, not a join, so a reprint years later is identical. |
| **SubsidyApplication** | The government paperwork, `projectId` **unique**. Dates per stage plus `amountExpected` / `amountReceived`. Tracked by hand; no portal integration (out of scope). |
| **Expense** | Transport, extra labour, civil work and misc, against a project or a ticket. The fourth term in BR-13. |
| **Payout** | A technician's pay for a period: `totalMinutes` × `hourlyRate` + `incentive`. Generated as `DRAFT`, approved, then paid. Stores the rate used so a later rate change does not rewrite a past payout. |
| **Setting** | `key` unique, `value` `Json`. The reason no rate is ever hard-coded (BR-14). Keys in section 5. |
| **Notification** | In-app bell rows. The stand-in for SMS/WhatsApp (out of scope). |
| **AuditLog** | Who did what, with `before`/`after` `Json` and `ip`. Written for every sensitive action (BR-18). |
| **ShareLink** | A random token giving read-only access to a director report with no login, with an expiry (US-F5). |
| **Counter** | `key` unique, `value` integer. The source of `ENQ`/`QT`/`PRJ`/`DSP`/`TKT`/`INV` numbers, incremented inside the same transaction as the row it names (BR-17), so numbers never collide and never skip. |
| **Attachment** | Polymorphic file record: `entityType` + `entityId` point at a survey, installation, ticket, subsidy, purchase or project. `kind` separates a `PHOTO` from a `DOCUMENT` and a `SIGNATURE`. One table rather than six keeps the upload pipeline single (`core/upload.js`). |

---

## 3. Enums

### Role — **LOCKED. Never add, remove, rename or merge.**

| Value | Meaning |
|---|---|
| `SUPER_ADMIN` | Manages the software: users, roles, settings, kit templates, audit log. |
| `DIRECTOR` | Owner: profit, revenue, company-wide data, invoices, subsidy, payouts, reports. |
| `SALES_EXECUTIVE` | Enquiries, qualification calls, survey scheduling and approval, quotes, advances, order confirmation. |
| `SURVEY_TECHNICIAN` | Assigned roof surveys, mobile survey form. |
| `CUSTOMER` | Own projects, quotes, payments, invoices, systems and warranties, service requests. |
| `WAREHOUSE_MANAGER` | Products, stock, purchases with serials, packing, dispatch scanning, delivery, installation scheduling. |
| `INSTALLATION_TECHNICIAN` | Assigned installation jobs and service visits, mobile completion form. |
| `SUPPORT_EXECUTIVE` | Customer/serial lookup, tickets, warranty check, service billing. |

### Funnel

**LeadStatus** — `NEW` just arrived · `CONTACTED` someone has spoken to them · `QUALIFIED` roof and
grid check out · `NOT_QUALIFIED` does not fit (shaded roof, no sanctioned load) · `SURVEY_SCHEDULED`
technician booked · `SURVEY_DONE` report submitted · `SURVEY_APPROVED` sales accepted the report,
quoting unlocked (BR-03) · `SURVEY_REJECTED` report sent back · `QUOTED` quote issued · `WON` quote
accepted · `LOST` dead, with a `lostReason`.

**SurveyStatus** — `SCHEDULED` · `IN_PROGRESS` technician on site · `SUBMITTED` awaiting review ·
`APPROVED` · `REJECTED` · `CANCELLED`.

**QuoteStatus** — `DRAFT` editable · `SENT` locked, with the customer · `ACCEPTED` · `REJECTED` ·
`EXPIRED` past `validUntil` (set nightly by cron).

**ProjectStatus** — `AWAITING_ADVANCE` · `CONFIRMED` advance in, pick list and install job created ·
`PACKING` · `DISPATCHED` on the truck · `DELIVERED` warranties started · `INSTALLATION_SCHEDULED` ·
`INSTALLING` · `INSTALLED` signed off · `CLOSED` invoiced, paid, subsidy settled · `CANCELLED`.

### Operations

**SerialStatus** — `IN_STOCK` available, the only scannable state (BR-08) · `RESERVED` scanned onto a
dispatch · `DISPATCHED` left the warehouse · `DELIVERED` at site, warranty running · `UNDER_REPAIR`
pulled for service · `REPLACED` swapped out, `replacedById` points at the new unit · `RETURNED` came
back to stock · `SCRAPPED` written off.

**DispatchStatus** — `PENDING` pick list created · `PACKING` · `READY` every line complete ·
`DISPATCHED` · `DELIVERED`.

**InstallationStatus** — `UNSCHEDULED` created with the order · `SCHEDULED` date and crew set ·
`IN_PROGRESS` · `COMPLETED`.

**TicketStatus** — `OPEN` · `ASSIGNED` · `IN_PROGRESS` · `AWAITING_PARTS` · `RESOLVED` fixed, awaiting
customer confirmation · `CLOSED` customer confirmed (BR-12) · `REOPENED`.

**InvoiceStatus** — `DRAFT` · `ISSUED` · `PARTIALLY_PAID` · `PAID` · `CANCELLED`.

**SubsidyStatus** — `NOT_STARTED` · `DOCUMENTS_PENDING` · `APPLIED` · `INSPECTION_DONE` · `APPROVED` ·
`DISBURSED` · `REJECTED`.

### Supporting

| Enum | Values | Note |
|---|---|---|
| `ProductCategory` | `PANEL`, `INVERTER`, `BATTERY`, `CHARGE_CONTROLLER`, `MOUNTING_STRUCTURE`, `DC_BOX`, `AC_BOX`, `CABLE`, `EARTHING`, `CONNECTOR`, `ACCESSORY`, `SERVICE` | The first four are the serialized ones (BR-07). |
| `ProductUnit` | `PCS`, `METER`, `SET`, `HOUR` | Drives quantity formatting. |
| `SystemType` | `ON_GRID`, `OFF_GRID` | On projects, quotes, kits. |
| `RequestedSystemType` | `ON_GRID`, `OFF_GRID`, `NOT_SURE` | On leads only — a homeowner may not know yet. |
| `CustomerType` | `RESIDENTIAL`, `COMMERCIAL` | |
| `LeadSource` | `WEB_FORM`, `WHATSAPP`, `PHONE_CALL`, `WALK_IN`, `REFERRAL` | |
| `LeadActivityType` | `CALL`, `NOTE`, `STATUS_CHANGE`, `WHATSAPP`, `VISIT` | |
| `RoofType` | `RCC`, `METAL_SHEET`, `TILED`, `OTHER` | |
| `RoofDirection` | `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW` | South is best in India. |
| `AttachmentEntity` | `SURVEY`, `INSTALLATION`, `TICKET`, `SUBSIDY`, `PURCHASE`, `PROJECT` | Polymorphic target. |
| `AttachmentKind` | `PHOTO`, `DOCUMENT`, `SIGNATURE` | BR-10 counts `PHOTO` only. |
| `PaymentType` | `ADVANCE`, `PARTIAL`, `FINAL`, `SERVICE` | |
| `PaymentMode` | `UPI`, `BANK_TRANSFER`, `CASH`, `CHEQUE`, `CARD` | |
| `InvoiceType` | `PROFORMA`, `TAX`, `SERVICE` | |
| `WarrantyStatus` | `ACTIVE`, `EXPIRED`, `VOID` | **Derived in the service, not a stored column.** |
| `TimeLogEntity` | `SURVEY`, `INSTALLATION`, `TICKET` | |
| `TicketSource` | `PHONE`, `PORTAL`, `WHATSAPP`, `EMAIL` | |
| `TicketCategory` | `NO_POWER`, `LOW_GENERATION`, `INVERTER_FAULT`, `BATTERY_ISSUE`, `PHYSICAL_DAMAGE`, `OTHER` | |
| `TicketPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | |
| `TicketActivityType` | `CALL`, `NOTE`, `STATUS_CHANGE`, `VISIT` | |
| `ExpenseCategory` | `TRANSPORT`, `LABOUR_EXTRA`, `CIVIL_WORK`, `MISC` | |
| `PayoutStatus` | `DRAFT`, `APPROVED`, `PAID` | |
| `ShareLinkType` | `DIRECTOR_REPORT` | |

Every enum above is mirrored in `client/src/lib/constants.js` with a human label and a badge colour.
**Never invent a value that is not in this table.**

---

## 4. Relations and indexes

### Unique constraints — each one enforces a business rule

| Constraint | Why |
|---|---|
| `User.email` | One login per address. |
| `User.phone` | One login per number (nullable for staff). |
| `Customer.userId` | A login belongs to one customer. |
| `Lead.code`, `Quote.number`, `Project.code`, `Dispatch.number`, `Ticket.number`, `Invoice.number`, `Purchase.number`, `Payout`… | Human-readable codes from `Counter` (BR-17). |
| `Product.sku` | No duplicate catalogue entries. |
| `SerialUnit.serialNumber` | **The core of BR-08** — a serial exists once company-wide. |
| `Project.quoteId` | One project per accepted quote. |
| `Dispatch.projectId` | One delivery record per project. |
| `InstallationJob.projectId` | One install job per project. |
| `Warranty.serialUnitId` | One warranty per unit (BR-09). |
| `SubsidyApplication.projectId` | One application per project. |
| `Setting.key`, `Counter.key`, `ShareLink.token` | Key-value integrity. |
| `@@unique([jobId, technicianId])` on `InstallationCrew` | A technician is on a crew once. |
| `@@unique([dispatchId, productId])` on `DispatchLine` | One pick line per product. |

### Indexes and why

| Index | Reason |
|---|---|
| `Lead(phone)` | **Duplicate detection on every enquiry** (BR-01) and support lookup by phone. |
| `Lead(status)`, `Lead(assignedToId)`, `Lead(createdAt)` | The sales board filters and the overdue sweep (BR-02). |
| `Customer(phone)`, `Customer(name)` | `GET /support/lookup` must be instant (US-E1). |
| `Survey(technicianId, scheduledAt)` | "My surveys today" on a phone. |
| `Survey(leadId)`, `Survey(status)` | The quote gate (BR-03) and the review queue. |
| `Product(category)`, `Product(sku)`, `Product(name)` | Catalogue browse and search. |
| `Quote(leadId)`, `Quote(customerId)`, `Quote(status)`, `Quote(validUntil)` | Pipeline lists and the nightly expiry job. |
| `Project(customerId)`, `Project(status)`, `Project(confirmedAt)` | Portal lists, the operations board, the unfinished report. |
| `Payment(projectId)`, `Payment(invoiceId)`, `Payment(customerId)`, `Payment(receivedAt)` | The advance check (BR-05) sums by project; the invoice listener sums by invoice. |
| `SerialUnit(serialNumber)`, `SerialUnit(productId)`, `SerialUnit(status)`, `SerialUnit(projectId)`, `SerialUnit(dispatchId)` | **The scan path** (BR-07, BR-08) and the support lookup, which must answer in milliseconds. |
| `Warranty(customerId)`, `Warranty(projectId)`, `Warranty(endDate)` | "My systems" in the portal and the expiring-soon alert job. |
| `Dispatch(status)`, `Dispatch(projectId)` | The packing queue. |
| `InstallationJob(status)`, `InstallationJob(scheduledDate)` | The scheduling calendar. |
| `InstallationCrew(technicianId)` | "My jobs" ownership check (BR-16). |
| `TimeLog(technicianId, startedAt)`, `TimeLog(entityType, entityId)`, `TimeLog(approved)` | Payout generation and labour cost (BR-13). |
| `Ticket(customerId)`, `Ticket(serialUnitId)`, `Ticket(status)`, `Ticket(assignedToId)`, `Ticket(createdAt)` | The support queue, "my tickets", and the serial history timeline. |
| `Invoice(customerId)`, `Invoice(projectId)`, `Invoice(status)`, `Invoice(issueDate)` | Revenue reporting and chasing. |
| `Expense(projectId)`, `Expense(ticketId)`, `Expense(spentAt)` | Profit calculation (BR-13). |
| `Attachment(entityType, entityId)` | Fetching a survey's or installation's files in one query; BR-10 counts photos here. |
| `Notification(userId, isRead)` | The unread badge on every page load. |
| `AuditLog(userId)`, `AuditLog(entityType, entityId)`, `AuditLog(createdAt)` | The audit screen and per-record history. |

Every foreign key is indexed. `createdAt` is indexed wherever a list is sorted by it by default.

### Delete behaviour

The schema uses **`onDelete: Restrict` by default** — business records are not deleted, they are
cancelled or deactivated. The exceptions, where a child has no meaning without its parent:

| Child | Parent | Behaviour |
|---|---|---|
| `QuoteItem` | `Quote` | `Cascade` — lines are replaced wholesale while `DRAFT`. |
| `InvoiceLine` | `Invoice` | `Cascade`. |
| `KitTemplateItem` | `KitTemplate` | `Cascade` — `PUT /kit-templates/:id/items` replaces the set. |
| `DispatchLine` | `Dispatch` | `Cascade`. |
| `InstallationCrew` | `InstallationJob` | `Cascade` — rescheduling replaces the crew. |
| `LeadActivity` / `TicketActivity` | `Lead` / `Ticket` | `Cascade` (the parent itself is never deleted). |
| `TicketPart` | `Ticket` | `Cascade`. |
| `PurchaseItem` | `Purchase` | `Cascade`. |

---

## 5. Conventions

**Ids.** `@id @default(cuid())` on every model. Sortable-enough, URL-safe, no sequence leakage.
Human-facing codes are separate (`Lead.code`, `Quote.number`, …) and come from `Counter`.

**Timestamps.** Every model has `createdAt DateTime @default(now())` and
`updatedAt DateTime @updatedAt`. **Stored UTC, displayed IST** (`DESIGN.md` section 11). Milestone
fields are nullable and only set when the thing actually happened — a null `deliveredAt` is how the
unfinished report finds a stuck project.

**Money.** `@db.Decimal(12, 2)`, INR only (BR-14). Up to ₹99,99,99,999.99 — ample for a ₹1.5L job.
Arithmetic via `Prisma.Decimal` / `core/money.js`, never JS floats. Serialised to JSON as a string.

**Percentages.** `@db.Decimal(5, 2)` — `18.00`, `30.00`.

**Capacity.** `@db.Decimal(6, 2)` kW — `3.00`, `5.50`.

**Soft delete.** `isActive Boolean @default(true)` on `User`, `Product` and `KitTemplate`. Nothing a
customer or an auditor might ask about is ever hard-deleted (BR-01, BR-15). Lists default to
`isActive: true` and take an explicit `includeInactive` flag.

**Json columns.** Used in four places only, each where the shape is genuinely open:
`Product.specs`, `InstallationJob.checklist`, `Setting.value`, `AuditLog.before`/`after`,
`ShareLink.params`. Never for anything we need to query or index.

**Derived, never stored.** `Warranty.status` (computed from `endDate` and `voidReason`), lead
overdue-ness (computed from `firstContactedAt` and `createdAt`), project profit (computed per BR-13),
and dispatch completeness (computed from the line quantities). Storing any of them would let it drift.

**Polymorphism.** Only `Attachment` (`entityType` + `entityId`) and `TimeLog`
(`entityType` + `entityId`). No database-level FK, so the service must validate the target exists.

---

## 6. Settings keys

Rows in `Setting`, seeded by `prisma/seed.js`. **No rate is ever hard-coded** (BR-14).

| Key | Type | Seeded value | Used by |
|---|---|---|---|
| `company` | object | `{ name: "SunPower Solutions", gstin: "36AABCS1429P1ZV", address: "Plot 14, Phase II, IDA Cherlapally, Hyderabad 500051, Telangana", phone: "+91 40 2712 4188", email: "care@sunpower.in" }` | Quote / invoice / packing-slip PDF headers, public footer |
| `advancePercent` | number | `30` | BR-05 order confirmation gate |
| `defaultTaxPercent` | number | `18` | Quote and invoice tax when a product has none |
| `labourRatePerHour` | number | `450` | BR-11 service billing, labour cost |
| `serviceVisitCharge` | number | `500` | BR-11 chargeable visit fee |
| `quoteValidityDays` | number | `15` | `Quote.validUntil`, the nightly expiry job |
| `surveySlaHours` | number | `48` | Survey SLA flag (BR-02's sibling) |
| `warrantyExpiryAlertDays` | number | `30` | The warranty alert cron job |

---

## 7. Running the database

```bash
# 1. Create the database (once)
createdb sunpower_sims
#    or: psql -U postgres -c "CREATE DATABASE sunpower_sims;"

# 2. Point the server at it
cp server/.env.example server/.env   # then edit DATABASE_URL and JWT_SECRET

# 3. Generate the client and push the schema (no migration files — D-03)
cd server
npx prisma generate
npx prisma db push

# 4. Seed
npm run seed            # from the repo root: npm run seed

# Everything in one go, from the repo root:
npm run setup
```

**Day to day**

```bash
npx prisma db push          # after editing schema.prisma
npx prisma studio           # browse the data at localhost:5555
npm run seed                # reseed (truncates first — see below)
```

**Full reset**

```bash
cd server
npx prisma db push --force-reset   # drops everything and recreates the schema
npm run seed
```

`seed.js` is **idempotent**: it clears the tables it owns in FK-safe order and rewrites them, so it
can be run repeatedly during the hackathon without a reset.

**Migrations.** `prisma db push` only, for now (D-03) — three people generating migrations on one
branch would collide on every pull. At feature freeze, one person runs
`npx prisma migrate dev --name baseline` once and commits that single migration folder.

---

## 8. Seed accounts

The company is based in **Hyderabad, Telangana**. All seeded passwords are **`Demo@1234`**.
Change them before anything real.

| Role | Email | Name | Hourly rate | Notes |
|---|---|---|---|---|
| `SUPER_ADMIN` | `admin@sunpower.in` | Rakesh Trivedi | — | Full platform access |
| `DIRECTOR` | `director@sunpower.in` | Nilesh Barot | — | Owner; finance and reports |
| `SALES_EXECUTIVE` | `sales1@sunpower.in` | Priya Desai | — | Owns the demo lead |
| `SALES_EXECUTIVE` | `sales2@sunpower.in` | Imran Qureshi | — | Second desk, for assignment |
| `SURVEY_TECHNICIAN` | `survey1@sunpower.in` | Mahesh Solanki | 250 | Has a survey scheduled today |
| `SURVEY_TECHNICIAN` | `survey2@sunpower.in` | Dinesh Chavda | 250 | |
| `WAREHOUSE_MANAGER` | `warehouse@sunpower.in` | Jignesh Patel | — | Stock, purchases, dispatch, install scheduling |
| `INSTALLATION_TECHNICIAN` | `install1@sunpower.in` | Sanjay Rathod | 350 | Crew lead |
| `INSTALLATION_TECHNICIAN` | `install2@sunpower.in` | Vikram Zala | 300 | Crew member |
| `INSTALLATION_TECHNICIAN` | `install3@sunpower.in` | Arvind Makwana | 300 | Service visits |
| `INSTALLATION_TECHNICIAN` | `install4@sunpower.in` | Naveen Kumar | 250 | Crew member |
| `SUPPORT_EXECUTIVE` | `support@sunpower.in` | Hetal Shah | — | Tickets and warranty checks |

### Customer logins

Customers sign in **by phone** (the login form accepts an email *or* a 10-digit phone), password
`Demo@1234`. An email is also seeded so they can be found by either.

| Phone | Name | City | Demo role |
|---|---|---|---|
| `9848012345` | Vipul Mehta | Hyderabad (Kukatpally) | 3 kW On-Grid, **delivered 18 months ago — inverter warranty ACTIVE**. The "rainy season breakdown" demo (Scene E). |
| `9700045678` | Fatima Shaikh | Hyderabad (Tolichowki) | 5 kW Off-Grid, mid-flow — dispatched, not yet delivered |
| `9959087766` | Harpreet Kaur | Secunderabad | 2 kW On-Grid, awaiting advance |
| `9391023344` | Srinivas Reddy | Hyderabad (Gachibowli) | 4 kW On-Grid, **delivered 27 months ago — inverter warranty EXPIRED**. The chargeable-ticket demo (BR-11). |
| `9866155890` | Anitha Rao | Hyderabad (Miyapur) | 3 kW On-Grid, **the loss-making project** (large discount + extra civil work) for the Scene F demo |

### What else the seed creates

- **Settings** — all eight keys from section 6, with the Hyderabad company block.
- **Products** — ~30 across every category, with generic but realistic names: `Mono PERC 540 Wp
  Panel`, `Mono PERC 440 Wp Panel`, `3 kW On-Grid String Inverter`, `5 kW Hybrid Inverter`,
  `150 Ah Tubular Battery 12V`, `MPPT Charge Controller 48V 50A`, `GI Mounting Structure per kW`,
  `DC Distribution Box`, `AC Distribution Box`, `4 sq mm DC Cable (m)`, `Earthing Kit`,
  `MC4 Connector Pair`, `Lightning Arrester`, plus `SERVICE` lines (installation, service visit,
  labour hour).
  **Serialized (`isSerialized = true`): panels, inverters, batteries, charge controllers.**
  `warrantyMonths`: **panel 240**, inverter 24, battery 24, charge controller 24, everything else 12.
  Realistic cost and sell prices (a 540 Wp panel costs ~₹9,800 and sells at ~₹13,500).
- **Kit templates** — **10**: 1/2/3/4/5 kW × On-Grid and Off-Grid, each with a full bill of
  materials. Off-Grid = the On-Grid kit **plus batteries and a charge controller**.
  The "3 kW On-Grid" kit is the one the demo quotes from.
- **Purchases** — three suppliers and several purchases bringing in **about 150 `SerialUnit` rows
  `IN_STOCK`** with real-looking serials (`PNL540-2426-00118`, `INV-OG3K-2425-00318`), each carrying
  its own `unitCost` so profit is exact.
- **Leads** — about **25, covering every `LeadStatus`**, including an **overdue** one (BR-02) and a
  **duplicate phone** pair linked by `duplicateOfId` (BR-01).
- **Surveys** — at least one in **every `SurveyStatus`**, including one scheduled for *today* against
  `survey1@sunpower.in` so the field demo has a job waiting.
- **Quotes** — at least one in **every `QuoteStatus`**, including an expired one.
- **Projects** — **10 across the stages**, with at least **4 fully completed** end to end: scanned
  dispatch → delivery with **warranties written** → scheduled and completed installation (photos
  reference placeholder files, plus a signature) → tax invoice → payments.
  Coverage includes one awaiting advance, one confirmed and unpacked, one dispatched, one delivered
  and unscheduled, and one installed but unpaid.
  - **One project is loss-making** — a large discount plus extra civil-work and transport expenses —
    so the director's profitability dashboard has something to find (Scene F).
  - **One was delivered 18 months ago** (inverter warranty `ACTIVE`) and **one 27 months ago**
    (inverter warranty `EXPIRED`). These two power the "rainy season breakdown" demo and the free
    vs. chargeable branch of BR-11.
- **Tickets** — across several statuses: one `OPEN`, one `AWAITING_PARTS`, one `CLOSED` under
  warranty (cost booked as a warranty expense), and one **out of warranty with a `SERVICE` invoice**.
- **Subsidy applications** — in several stages from `DOCUMENTS_PENDING` to `DISBURSED`.
- **TimeLogs** for every completed survey, installation and service visit, so payouts and labour cost
  are non-zero, plus one `DRAFT` payout.
- **Notifications** for a few users, and **audit log** rows for a discount change and a serial
  override.

The seed is **idempotent**: it deletes in FK-safe order and recreates, so `npm run seed` can be run
repeatedly without a database reset.
