# API_CONTRACTS.md

**This file is the contract between three developers working in parallel.** Teammates code against it.
It is a **shared file**: additive changes only, never rename or delete another member's lines, and
announce every change to the team (`AGENTS.md` section 5). Changing a path, a role list, a field name
or an error code that is already published here is **breaking — stop and ask**.

---

## 1. Conventions

**Base URL** `/api/v1` — dev: `http://localhost:5000/api/v1`

**Auth** JWT in an httpOnly cookie named `sp_token`, 8h, `sameSite=lax`, `secure` in production (D-01).
The client sends it automatically (`axios` `withCredentials: true`). No `Authorization` header anywhere.
Every endpoint requires a session unless it is under `/public` or is `POST /auth/login`,
`POST /auth/register` or `GET /api/v1/health`.

**Success**

```json
{ "success": true, "data": { } }
{ "success": true, "data": [ ], "meta": { "page": 1, "pageSize": 20, "total": 128 } }
```

**Error**

```json
{ "success": false,
  "error": { "code": "ADVANCE_NOT_RECEIVED",
             "message": "Advance payment not received.",
             "details": { "required": "54000.00", "paid": "5000.00" } } }
```

**Status codes** `200` ok · `201` created · `204` no body · `400` malformed · `401 UNAUTHENTICATED` ·
`403 FORBIDDEN` · `404 NOT_FOUND` · `409` state/business conflict · `422 VALIDATION_ERROR` ·
`429 RATE_LIMITED` · `500 INTERNAL_ERROR`.

**Pagination** `?page=1&pageSize=20` (`pageSize` max 100). Every list endpoint returns `meta`.

**Search** `?q=` — free text, debounced client-side, matched against the fields named per endpoint.

**Sorting** `?sort=field&order=asc|desc` where an endpoint says so.

**Money** sent and returned as a **string** with two decimals (`"142500.00"`), never a float.

**Dates** ISO 8601 UTC with `Z` (`"2026-10-31T09:15:00.000Z"`). Date-only fields are `"2026-10-31"`.

**"own"** in a role list means **ownership-scoped** and enforced in the service (BR-16): a `CUSTOMER`
sees only their own records; a `SURVEY_TECHNICIAN` only their assigned surveys; an
`INSTALLATION_TECHNICIAN` only their assigned jobs and tickets. Violation → `403 FORBIDDEN`.

**Multipart** file uploads use `multipart/form-data`, field name `files` (repeatable), max 5 MB per
file, `jpg`/`png`/`webp`/`pdf` only (`SECURITY.md`).

**Rate limits** `POST /auth/login` 10 per 15 min per IP; `POST /public/enquiries` 5 per hour per IP.

---

## 2. Member A — platform, finance, reports

### 2.1 auth — `server/src/modules/auth`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `POST` | `/auth/login` | public (rate limited) | A |
| `POST` | `/auth/logout` | any session | A |
| `GET` | `/auth/me` | any session | A |
| `POST` | `/auth/register` | public (creates `CUSTOMER`) | A |
| `POST` | `/auth/change-password` | any session | A |

**`POST /auth/login`** — body `{ identifier, password }` where `identifier` is an email **or** a
10-digit phone. → `200 { user: { id, name, email, phone, role } }`; sets the `sp_token` cookie.
Errors: `401 INVALID_CREDENTIALS` (one generic message for a wrong email *and* a wrong password),
`403 ACCOUNT_DISABLED`, `429 RATE_LIMITED`.

**`POST /auth/logout`** — no body. → `204`, clears the cookie.

**`GET /auth/me`** — → `200 { id, name, email, phone, role, isActive, customerId? }`.
`customerId` is present for a `CUSTOMER`. Errors: `401 UNAUTHENTICATED`.

**`POST /auth/register`** — body `{ name, phone, email?, password }`. Self-signup for a customer:
creates a `CUSTOMER` `User` and **links it to an existing `Customer` row matching the phone** if one
exists (so a customer who enquired earlier keeps their history), otherwise creates the `Customer`.
→ `201 { user }` and signs them in. Errors: `409 PHONE_IN_USE`, `409 EMAIL_IN_USE`,
`422 VALIDATION_ERROR` (password: min 8, at least one letter and one number).

**`POST /auth/change-password`** — body `{ currentPassword, newPassword }`. → `204`.
Writes an `AuditLog` row. Errors: `401 INVALID_CREDENTIALS`, `422 VALIDATION_ERROR`.

### 2.2 users — `server/src/modules/users`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/users` | `SUPER_ADMIN` | A |
| `POST` | `/users` | `SUPER_ADMIN` | A |
| `PATCH` | `/users/:id` | `SUPER_ADMIN` | A |
| `PATCH` | `/users/:id/status` | `SUPER_ADMIN` | A |
| `POST` | `/users/:id/reset-password` | `SUPER_ADMIN` | A |
| `GET` | `/users/technicians` | `SUPER_ADMIN`, `SALES_EXECUTIVE`, `WAREHOUSE_MANAGER`, `SUPPORT_EXECUTIVE` | A |

**`GET /users`** — `?role&isActive&q&page&pageSize`; `q` matches name, email, phone.
→ list of `{ id, name, email, phone, role, isActive, hourlyRate, lastLoginAt, createdAt }` + `meta`.
Never returns `passwordHash`.

**`POST /users`** — body `{ name, email, phone?, role, password, hourlyRate? }`. `role` must be one of
the 8 locked roles. → `201 { user }`. Audited. Errors: `409 EMAIL_IN_USE`, `409 PHONE_IN_USE`,
`422 VALIDATION_ERROR`.

**`PATCH /users/:id`** — body `{ name?, email?, phone?, role?, hourlyRate? }`. A **role change is
audited with before/after** (BR-18). → `200 { user }`. Errors: `404 NOT_FOUND`, `409 EMAIL_IN_USE`.

**`PATCH /users/:id/status`** — body `{ isActive }`. Deactivation, never deletion (BR-15). → `200 { user }`.
A `SUPER_ADMIN` cannot deactivate their own account: `409 CANNOT_DISABLE_SELF`.

**`POST /users/:id/reset-password`** — body `{ newPassword }`. → `204`. Audited.

**`GET /users/technicians`** — `?type=survey|installation`. → `[{ id, name, phone, hourlyRate }]`.
`survey` returns `SURVEY_TECHNICIAN`, `installation` returns `INSTALLATION_TECHNICIAN`; omitted
returns both. Active users only. This is how sales and the warehouse populate assignment dropdowns.

### 2.3 settings — `server/src/modules/settings`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/settings` | any staff session | A |
| `PUT` | `/settings` | `SUPER_ADMIN` | A |

**`GET /settings`** → `200 { company: {...}, advancePercent: 30, defaultTaxPercent: 18, labourRatePerHour: 450, serviceVisitCharge: 500, quoteValidityDays: 15, surveySlaHours: 48, warrantyExpiryAlertDays: 30 }`.
Every module reads rates from here — never hard-coded (BR-14).

**`PUT /settings`** — body: any subset of the keys above, **validated strictly** (an unknown key is
rejected, so a typo fails loudly). → `200 { settings }`. Audited with before/after (BR-18).
Errors: `422 VALIDATION_ERROR`.

### 2.4 kit-templates — `server/src/modules/kit-templates`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/kit-templates` | any staff session | A |
| `GET` | `/kit-templates/:id` | any staff session | A |
| `POST` | `/kit-templates` | `SUPER_ADMIN` | A |
| `PATCH` | `/kit-templates/:id` | `SUPER_ADMIN` | A |
| `PUT` | `/kit-templates/:id/items` | `SUPER_ADMIN` | A |

The public active list is served separately by `GET /public/packages` (Member B).

**`GET /kit-templates`** — `?systemType&isActive&q`. → `[{ id, name, systemType, capacityKw, description, basePrice, isActive, itemCount }]`.

**`GET /kit-templates/:id`** → `{ ...template, items: [{ id, productId, product: { sku, name, category, unit, sellPrice, taxPercent, isSerialized }, quantity, notes }] }`.
**This is the shape `POST /quotes` expands into quote lines** (BR-04).

**`POST /kit-templates`** — body `{ name, systemType, capacityKw, description?, basePrice, isActive? }`. → `201`.

**`PATCH /kit-templates/:id`** — any of the above. → `200`.

**`PUT /kit-templates/:id/items`** — body `{ items: [{ productId, quantity, notes? }] }`.
**Replaces the whole item set.** → `200 { template with items }`.
Errors: `404 PRODUCT_NOT_FOUND` (with the offending `productId` in `details`), `422 VALIDATION_ERROR`.

### 2.5 audit — `server/src/modules/audit`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/audit-logs` | `SUPER_ADMIN`, `DIRECTOR` | A |

`?userId&action&entityType&entityId&from&to&page&pageSize`, newest first.
→ `[{ id, user: { id, name, role }, action, entityType, entityId, before, after, ip, createdAt }]` + `meta`.

### 2.6 notifications — `server/src/modules/notifications`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/notifications` | any session (own) | A |
| `GET` | `/notifications/unread-count` | any session (own) | A |
| `PATCH` | `/notifications/:id/read` | any session (own) | A |
| `PATCH` | `/notifications/read-all` | any session (own) | A |

**`GET /notifications`** — `?isRead&page&pageSize`. → `[{ id, title, body, link, isRead, createdAt }]` + `meta`.
Own rows only — there is no way to read another user's notifications.

**`GET /notifications/unread-count`** → `{ count: 3 }`. Polled by the bell every 30s.

**`PATCH /notifications/:id/read`** → `200 { notification }`. Errors: `404 NOT_FOUND` (also when the
row belongs to someone else — we do not confirm its existence).

**`PATCH /notifications/read-all`** → `{ updated: 7 }`.

### 2.7 invoices — `server/src/modules/invoices`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/invoices` | `DIRECTOR`, `SUPER_ADMIN`, `SALES_EXECUTIVE` (read), `CUSTOMER` (own) | A |
| `GET` | `/invoices/:id` | same | A |
| `POST` | `/invoices` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `PATCH` | `/invoices/:id/status` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/invoices/:id/pdf` | same as read | A |

**`GET /invoices`** — `?status&type&customerId&projectId&from&to&q&page&pageSize`; `q` matches the
invoice number and the customer name. A `CUSTOMER` is silently scoped to their own rows.
→ `[{ id, number, type, status, customer: { id, name }, projectCode?, issueDate, dueDate, subtotal, taxTotal, total, amountPaid, balance }]` + `meta`.

**`GET /invoices/:id`** → the invoice with `lines: [{ description, quantity, unitPrice, taxPercent, lineTotal }]`,
`payments: [...]` and the linked project or ticket. Errors: `403 FORBIDDEN`, `404 NOT_FOUND`.

**`POST /invoices`** — body `{ customerId, projectId?, ticketId?, type, issueDate, dueDate, lines: [{ description, quantity, unitPrice, taxPercent }] }`.
Totals are computed on the server from the lines (BR-14) — a client-sent total is ignored.
Number from `Counter` (BR-17). → `201 { invoice }`.
Most invoices are created by listeners (`project.confirmed` → `PROFORMA`,
`installation.completed` → `TAX`, `ticket.billable` → `SERVICE`); this endpoint is for manual ones.

**`PATCH /invoices/:id/status`** — body `{ status }`. Follows the state machine in `PRD.md` 6.9.
`PARTIALLY_PAID` and `PAID` are normally set by the `payment.recorded` listener, not by hand.
Errors: `409 INVALID_TRANSITION`.

**`GET /invoices/:id/pdf`** → `application/pdf` (pdfkit), company header from settings.

### 2.8 subsidies — `server/src/modules/subsidies`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/subsidies` | `DIRECTOR`, `SALES_EXECUTIVE` | A |
| `GET` | `/subsidies/:id` | `DIRECTOR`, `SALES_EXECUTIVE` | A |
| `PATCH` | `/subsidies/:id` | `DIRECTOR`, `SALES_EXECUTIVE` | A |
| `POST` | `/subsidies/:id/documents` | `DIRECTOR`, `SALES_EXECUTIVE` | A |

**`GET /subsidies`** — `?status&q&page&pageSize`. → `[{ id, project: { id, code, capacityKw }, customer: { id, name }, scheme, status, applicationRef, appliedAt, approvedAt, disbursedAt, amountExpected, amountReceived }]` + `meta`.

**`PATCH /subsidies/:id`** — body `{ scheme?, status?, applicationRef?, appliedAt?, inspectionAt?, approvedAt?, disbursedAt?, amountExpected?, amountReceived?, remarks? }`.
Status follows `PRD.md` 6.10. Errors: `409 INVALID_TRANSITION`.

**`POST /subsidies/:id/documents`** — `multipart/form-data`, field `files`. Stores `Attachment` rows
(`entityType = SUBSIDY`, `kind = DOCUMENT`). → `201 { attachments: [...] }`.

### 2.9 expenses — `server/src/modules/expenses`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/expenses` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `POST` | `/expenses` | `DIRECTOR`, `WAREHOUSE_MANAGER`, `SUPPORT_EXECUTIVE` | A |

**`GET /expenses`** — `?projectId&ticketId&category&from&to&page&pageSize`.
→ `[{ id, projectCode?, ticketNumber?, category, amount, description, spentAt, createdBy: { id, name } }]` + `meta`.

**`POST /expenses`** — body `{ projectId?, ticketId?, category, amount, description, spentAt }`.
At least one of `projectId` / `ticketId` is required → else `422 TARGET_REQUIRED`.
Feeds the third term of BR-13. → `201 { expense }`.

### 2.10 payouts — `server/src/modules/payouts`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/payouts` | `DIRECTOR` | A |
| `POST` | `/payouts/generate` | `DIRECTOR` | A |
| `PATCH` | `/payouts/:id/approve` | `DIRECTOR` | A |
| `PATCH` | `/payouts/:id/mark-paid` | `DIRECTOR` | A |

**`GET /payouts`** — `?month=2026-10&technicianId&status&page&pageSize`.
→ `[{ id, technician: { id, name, role }, periodStart, periodEnd, totalMinutes, hourlyRate, incentive, amount, status, paidAt }]` + `meta`.

**`POST /payouts/generate`** — body `{ month: "2026-10", incentives?: [{ technicianId, amount }] }`.
Sums **approved** `TimeLog.minutes` per technician for the period, multiplies by the technician's
current `hourlyRate` (stored on the payout so a later rate change cannot rewrite history), adds any
incentive, and creates `DRAFT` rows. Re-running replaces existing `DRAFT` rows for the period and
**leaves `APPROVED`/`PAID` rows untouched** → `409 PERIOD_LOCKED` if every row is already approved.
→ `201 { created: 6, skipped: 1 }`.

**`PATCH /payouts/:id/approve`** → `200`. `DRAFT` → `APPROVED`, else `409 INVALID_TRANSITION`.

**`PATCH /payouts/:id/mark-paid`** — body `{ paidAt?, reference? }`. `APPROVED` → `PAID`. → `200`. Audited.

### 2.11 reports — `server/src/modules/reports`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/reports/overview` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/reports/profitability` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/reports/profitability/:projectId` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/reports/pipeline` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/reports/unfinished` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/reports/service` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `GET` | `/reports/export` | `DIRECTOR`, `SUPER_ADMIN` | A |
| `POST` | `/reports/share` | `DIRECTOR` | A |
| `GET` | `/public/reports/:token` | public (token) | A |

**`GET /reports/overview`** — `?range=today|week|month|custom&from&to`.
→ `{ range: { from, to }, metrics: { enquiries, surveysDone, quotesSent, quotesAccepted, ordersConfirmed, kwInstalled, revenueInvoiced, paymentsReceived, profit, openTickets, overdueLeads }, previous: { …same… }, series: [{ date, revenue, profit }] }`.
Every metric carries the previous comparable period so the UI can show a delta.

**`GET /reports/profitability`** — `?from&to&status&sort=profit|margin|revenue&order&page&pageSize`.
→ `[{ projectId, code, customerName, capacityKw, systemType, revenue, materialCost, labourCost, expenses, warrantyServiceCost, profit, marginPercent, isLoss, isWorkInProgress }]` + `meta`. BR-13.

> **Work in progress.** A project that has been dispatched but not yet invoiced has material
> cost and no revenue, so its raw profit is a large negative number that means nothing. Such a
> project is flagged `isWorkInProgress: true` (reached `DISPATCHED` but not `INSTALLED`), and
> the default list **excludes** it from the totals and from the loss-making count. Pass
> `?includeWip=true` to see committed cost per in-flight project. Only `INSTALLED` and `CLOSED`
> projects count toward realised profit.

**`GET /reports/profitability/:projectId`** → the same figures plus the breakdown:
`{ revenue: { invoices: [...] }, material: { serials: [{ serialNumber, productName, unitCost }], nonSerialized: [...] }, labour: { timeLogs: [{ technicianName, minutes, hourlyRate, cost }] }, expenses: [...], warrantyService: { tickets: [...] } }`.

**`GET /reports/pipeline`** → `{ leads: { NEW: 4, CONTACTED: 6, … }, quotes: { DRAFT: 2, SENT: 5, … }, projects: { AWAITING_ADVANCE: 1, … }, conversion: { enquiryToSurvey, surveyToQuote, quoteToWon }, valueByStage: [...] }`.

**`GET /reports/unfinished`** → `{ awaitingAdvance: [...], confirmedNotPacked: [...], dispatchedNotDelivered: [...], deliveredNotScheduled: [...], installedNotInvoiced: [...], invoicedNotPaid: [...], subsidyPending: [...], ticketsOpen: [...] }`.
Each item: `{ projectId, code, customerName, status, daysInStage, amount? }`. US-F3.

**`GET /reports/service`** — `?from&to`.
→ `{ ticketsByCategory, ticketsByStatus, avgResolutionHours, warrantyVsChargeable: { free, freeCost, chargeable, chargeableRevenue }, topFaultCodes, repeatOffenders: [{ serialNumber, productName, ticketCount }] }`.

**`GET /reports/export`** — `?type=csv|pdf&report=overview|profitability|pipeline|unfinished|service` plus
the report's own filters. → `text/csv` or `application/pdf` with a `Content-Disposition` filename.

**`POST /reports/share`** — body `{ report, params?, expiresInDays? }` (default 7).
→ `201 { url: "http://localhost:5173/shared/9f3c…", expiresAt }`. Creates a `ShareLink` with a random
32-byte token. Audited.

**`GET /public/reports/:token`** — **no login**. → the report payload, read-only.
Errors: `404 NOT_FOUND` for an unknown **or expired** token (we do not distinguish, so the token
cannot be probed).

### 2.12 search — `server/src/modules/search`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/search` | any staff session | A |

`?q=` (min 2 characters), `?limit=` (default 5 per group).
→ `{ customers: [{ id, name, phone, city }], projects: [{ id, code, customerName, status }], serials: [{ id, serialNumber, productName, status }], tickets: [{ id, number, subject, status }], leads: [{ id, code, name, phone, status }] }`.

**Groups are filtered by role**, so the global search never leaks across a boundary:

| Role | Groups returned |
|---|---|
| `SUPER_ADMIN`, `DIRECTOR` | all five |
| `SALES_EXECUTIVE` | leads, customers, projects, quotes |
| `WAREHOUSE_MANAGER` | serials, projects, products |
| `SUPPORT_EXECUTIVE` | customers, serials, tickets, projects |
| `SURVEY_TECHNICIAN`, `INSTALLATION_TECHNICIAN` | their assigned work only |
| `CUSTOMER` | **not permitted** — `403 FORBIDDEN` (the portal has its own scoped views) |

---

## 3. Member B — sales, survey, customer, public site

### 3.1 public — `server/src/modules/public`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/public/packages` | public | B |
| `POST` | `/public/enquiries` | public (rate limited) | B |
| `GET` | `/public/stats` | public | B |

**`GET /public/packages`** → `[{ id, name, systemType, capacityKw, description, basePrice }]` —
active `KitTemplate` rows only, no cost prices, no BOM.

**`POST /public/enquiries`** — body `{ name, phone, email?, address?, city?, pincode?, requestedSystemType, requestedCapacityKw?, wantsSubsidy }`.
→ `201 { code: "ENQ-2026-0042" }` — **the code is the whole response**, shown on the thank-you screen.
Creates a `Lead` (`source = WEB_FORM`, `status = NEW`), flags and links a duplicate phone via
`duplicateOfId` **without rejecting it** (BR-01), emits `lead.created`.
Errors: `422 VALIDATION_ERROR`, `429 RATE_LIMITED` (5/hour/IP).

**`GET /public/stats`** → `{ projectsCompleted: 128, kwInstalled: "412.50", customersServed: 121, yearsActive: 6 }`
— counted from real data, for the landing page.

### 3.2 leads — `server/src/modules/leads`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/leads` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/leads` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `GET` | `/leads/:id` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `PATCH` | `/leads/:id` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/leads/:id/activities` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/leads/:id/qualify` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/leads/:id/assign` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/leads/:id/mark-lost` | `SALES_EXECUTIVE`, `DIRECTOR` | B |

**`GET /leads`** — `?status&source&assignedTo&overdue=true&q&page&pageSize`; `q` matches code, name,
phone. `overdue=true` applies BR-02 (`firstContactedAt` null and older than 24h).
→ `[{ id, code, name, phone, city, source, requestedSystemType, requestedCapacityKw, wantsSubsidy, status, assignedTo: { id, name }, isOverdue, isDuplicate, duplicateOfCode?, createdAt }]` + `meta`.

**`POST /leads`** — body `{ name, phone, email?, address?, city?, pincode?, source, requestedSystemType, requestedCapacityKw?, wantsSubsidy?, assignedToId? }`.
For calls, WhatsApp and walk-ins. Same duplicate handling as the public form (BR-01). → `201 { lead }`.

**`GET /leads/:id`** → the lead with `activities: [{ id, type, message, user: { id, name }, createdAt }]`,
`surveys: [...]`, `quotes: [...]`, `duplicateOf: { id, code, status }?` and `linkedDuplicates: [...]`.

**`PATCH /leads/:id`** — body: contact and requirement fields. **Never deletes** (BR-01), and
`status` is not settable here — use the action endpoints. → `200 { lead }`.

**`POST /leads/:id/activities`** — body `{ type, message }`.
Sets `firstContactedAt` on the first `CALL`/`WHATSAPP`/`VISIT`, and moves `NEW` → `CONTACTED`.
→ `201 { activity }`.

**`POST /leads/:id/qualify`** — body `{ qualified: true|false, roofAreaSqft?, monthlyBillInr?, gridConnectionOk?, sanctionedLoadKw?, qualificationNotes? }`.
→ `200 { lead }` with `QUALIFIED` or `NOT_QUALIFIED`.
Errors: `409 INVALID_TRANSITION` (only from `NEW` or `CONTACTED`).

**`POST /leads/:id/assign`** — body `{ assignedToId }`. Must be a `SALES_EXECUTIVE` → else
`422 INVALID_ASSIGNEE`. Notifies the assignee. → `200 { lead }`.

**`POST /leads/:id/mark-lost`** — body `{ lostReason }` (required, min 3 chars). → `200 { lead }`.
Errors: `422 VALIDATION_ERROR`, `409 INVALID_TRANSITION` (a `WON` lead cannot be lost).

### 3.3 surveys — `server/src/modules/surveys`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `POST` | `/surveys` | `SALES_EXECUTIVE` | B |
| `GET` | `/surveys` | `SALES_EXECUTIVE`, `DIRECTOR` (all); `SURVEY_TECHNICIAN` (own) | B |
| `GET` | `/surveys/:id` | same, ownership-scoped | B |
| `POST` | `/surveys/:id/start` | `SURVEY_TECHNICIAN` (own) | B |
| `PUT` | `/surveys/:id/report` | `SURVEY_TECHNICIAN` (own), multipart | B |
| `POST` | `/surveys/:id/approve` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/surveys/:id/reject` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `PATCH` | `/surveys/:id/reschedule` | `SALES_EXECUTIVE` | B |

**`POST /surveys`** — body `{ leadId, technicianId, scheduledAt }`. Lead must be `QUALIFIED`
→ `409 INVALID_TRANSITION`; `technicianId` must be a `SURVEY_TECHNICIAN` → `422 INVALID_TECHNICIAN`.
Lead → `SURVEY_SCHEDULED`; the technician is notified. → `201 { survey }`.

**`GET /surveys`** — `?status&technicianId&from&to&page&pageSize`.
A `SURVEY_TECHNICIAN` is **forced** to their own rows regardless of the filter (BR-16).
→ `[{ id, lead: { id, code, name, phone, address, city }, technician: { id, name }, scheduledAt, status, recommendedCapacityKw, submittedAt }]` + `meta`.

**`GET /surveys/:id`** → the survey with the lead, the technician, `attachments: [...]` and the review
fields. A technician reading someone else's survey → `403 FORBIDDEN`.

**`POST /surveys/:id/start`** → `200`. `SCHEDULED` → `IN_PROGRESS`. Writes a `TimeLog` start.

**`PUT /surveys/:id/report`** — `multipart/form-data`: fields `roofType`, `shadowFreeAreaSqft`,
`roofDirection`, `tiltDegrees`, `cableDistanceMeters`, `structureHeightFt`, `earthingPointAvailable`,
`recommendedCapacityKw`, `recommendedSystemType`, `notes?`, plus repeatable `files` (photos).
All measurement fields are required; at least one photo is required → `422 PHOTOS_REQUIRED`.
Survey → `SUBMITTED` with `submittedAt`; lead → `SURVEY_DONE`; emits `survey.submitted`.
→ `200 { survey }`.

**`POST /surveys/:id/approve`** — body `{ notes? }`. `SUBMITTED` → `APPROVED`, `reviewedById`,
`reviewedAt`; lead → `SURVEY_APPROVED`; emits `survey.approved`. **This unlocks quoting** (BR-03).
→ `200 { survey }`. Errors: `409 INVALID_TRANSITION`.

**`POST /surveys/:id/reject`** — body `{ rejectionReason }` (required). → `REJECTED`; lead →
`SURVEY_REJECTED`. → `200 { survey }`.

**`PATCH /surveys/:id/reschedule`** — body `{ scheduledAt, technicianId? }`. Only while `SCHEDULED`.
Notifies the old and the new technician. → `200 { survey }`.

### 3.4 quotes — `server/src/modules/quotes`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `POST` | `/quotes` | `SALES_EXECUTIVE` | B |
| `GET` | `/quotes` | `SALES_EXECUTIVE`, `DIRECTOR`; `CUSTOMER` (own) | B |
| `GET` | `/quotes/:id` | same, ownership-scoped | B |
| `PATCH` | `/quotes/:id` | `SALES_EXECUTIVE` (`DRAFT` only) | B |
| `PUT` | `/quotes/:id/items` | `SALES_EXECUTIVE` (`DRAFT` only) | B |
| `POST` | `/quotes/:id/send` | `SALES_EXECUTIVE` | B |
| `POST` | `/quotes/:id/accept` | `SALES_EXECUTIVE`, `CUSTOMER` (own) | B |
| `POST` | `/quotes/:id/reject` | `SALES_EXECUTIVE`, `CUSTOMER` (own) | B |
| `GET` | `/quotes/:id/pdf` | same as read | B |

**`POST /quotes`** — body `{ leadId, kitTemplateId, notes? }`.
**Gate: the lead's survey must be `APPROVED`** → `409 SURVEY_NOT_APPROVED` (BR-03).
Expands every `KitTemplateItem` into a `QuoteItem` at the product's current `sellPrice` and
`taxPercent` (BR-04), creates the `Customer` from the lead if needed, computes
`subtotal`/`taxTotal`/`total` with `Decimal`, sets `validUntil = today + settings.quoteValidityDays`,
takes `number` from `Counter`. Lead → `QUOTED`. → `201 { quote with items }`.

**`GET /quotes`** — `?status&leadId&customerId&q&page&pageSize`. A `CUSTOMER` sees only their own.
→ `[{ id, number, customer: { id, name }, leadCode, status, systemType, capacityKw, total, validUntil, sentAt, createdAt }]` + `meta`.

**`GET /quotes/:id`** → the quote with `items: [{ id, productId, description, quantity, unitPrice, taxPercent, lineTotal, product: { sku, category, unit } }]`,
the customer, the lead and the kit template.

**`PATCH /quotes/:id`** — body `{ discount?, notes?, validUntil?, capacityKw?, systemType? }`.
**`DRAFT` only** → `409 QUOTE_LOCKED`. A `discount` change is audited (BR-18). Totals recomputed.

**`PUT /quotes/:id/items`** — body `{ items: [{ productId, description?, quantity, unitPrice?, taxPercent? }] }`.
Replaces the line set; omitted prices fall back to the product's. **`DRAFT` only** → `409 QUOTE_LOCKED`.
A changed `unitPrice` is audited. → `200 { quote with items }`.

**`POST /quotes/:id/send`** → `SENT`, `sentAt`; emits `quote.sent` (which creates the customer login
if missing and notifies them). → `200 { quote }`. Errors: `409 INVALID_TRANSITION`,
`422 QUOTE_EMPTY` (no items).

**`POST /quotes/:id/accept`** — body `{ acceptedByName? }`. `SENT` → `ACCEPTED`, `acceptedAt`,
`acceptedById`; lead → `WON`; emits `quote.accepted` (which creates the project). → `200 { quote, projectId }`.
Errors: `409 QUOTE_EXPIRED` (past `validUntil`), `409 INVALID_TRANSITION`, `403 FORBIDDEN` (another
customer's quote).

**`POST /quotes/:id/reject`** — body `{ reason? }`. → `REJECTED`. → `200 { quote }`.

**`GET /quotes/:id/pdf`** → `application/pdf`: company header from settings, customer block, line
items with tax, totals in INR, validity, terms.

### 3.5 projects — `server/src/modules/projects`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `POST` | `/projects` | `SALES_EXECUTIVE` | B |
| `GET` | `/projects` | all staff roles; `CUSTOMER` (own) | B |
| `GET` | `/projects/:id` | all staff roles; `CUSTOMER` (own) | B |
| `POST` | `/projects/:id/confirm` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `POST` | `/projects/:id/cancel` | `DIRECTOR` | B |

**`POST /projects`** — body `{ quoteId }`. Normally created by the `quote.accepted` listener; this is
the manual path. `quoteId` must be `ACCEPTED` and unused → `409 PROJECT_EXISTS`. → `201 { project }`.

**`GET /projects`** — `?status&customerId&q&from&to&page&pageSize`.
→ `[{ id, code, customer: { id, name, phone }, status, systemType, capacityKw, siteAddress, quoteTotal, amountPaid, confirmedAt, createdAt }]` + `meta`.

**`GET /projects/:id`** — **the cross-module timeline, the one screen that shows the whole journey**:

```json
{ "id": "prj_7xk", "code": "PRJ-2026-0007", "status": "INSTALLED",
  "customer": { }, "quote": { "number": "QT-2026-0011", "total": "180000.00", "items": [ ] },
  "lead": { "code": "ENQ-2026-0019" }, "survey": { "status": "APPROVED" },
  "payments": [ ], "invoices": [ ],
  "dispatch": { "number": "DSP-2026-0007", "status": "DELIVERED",
                "lines": [ ], "serials": [ ] },
  "installation": { "status": "COMPLETED", "crew": [ ], "photos": [ ], "signatureUrl": "" },
  "warranties": [ ], "subsidy": { "status": "APPLIED" }, "tickets": [ ], "expenses": [ ],
  "timeline": [ { "at": "2026-09-02T…", "event": "Enquiry received", "actor": "Web form" },
                { "at": "2026-09-04T…", "event": "Survey approved", "actor": "Priya Desai" } ] }
```

A `CUSTOMER` gets the same shape minus costs, `unitCost` and internal notes.

**`POST /projects/:id/confirm`** → `CONFIRMED`, `confirmedAt`; emits `project.confirmed`
(dispatch + install job + proforma invoice + subsidy file + warehouse notification).
**BR-05:** paid must be ≥ `quote.total × settings.advancePercent / 100`, else
`409 ADVANCE_NOT_RECEIVED` with `details { required, paid, shortfall }`.
Errors also: `409 INVALID_TRANSITION`.

**`POST /projects/:id/cancel`** — body `{ reason }`. → `CANCELLED`; reserved serials return to
`IN_STOCK`; the installation job is removed. Not allowed once `DELIVERED` → `409 CANNOT_CANCEL`.
Audited. → `200 { project }`.

### 3.6 payments — `server/src/modules/payments`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `POST` | `/payments` | `SALES_EXECUTIVE`, `DIRECTOR` | B |
| `GET` | `/payments` | `SALES_EXECUTIVE`, `DIRECTOR`; `CUSTOMER` (own, via `/me/payments`) | B |

**`POST /payments`** — body `{ customerId, projectId?, invoiceId?, amount, type, mode, reference?, receivedAt }`.
Money is **recorded, not processed** (D-05). At least one of `projectId` / `invoiceId` → else
`422 TARGET_REQUIRED`. Emits `payment.recorded` (the invoice listener updates `amountPaid` and status).
Audited (BR-18). → `201 { payment }`.

**`GET /payments`** — `?projectId&customerId&type&mode&from&to&page&pageSize`.
→ `[{ id, customer: { id, name }, projectCode?, invoiceNumber?, amount, type, mode, reference, receivedAt, recordedBy: { id, name } }]` + `meta`.

### 3.7 customers — `server/src/modules/customers`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/customers` | any staff session | B |
| `GET` | `/customers/:id` | any staff session | B |
| `PATCH` | `/customers/:id` | `SALES_EXECUTIVE`, `SUPPORT_EXECUTIVE`, `DIRECTOR` | B |

**`GET /customers`** — `?q&city&customerType&page&pageSize`; `q` matches name, phone, email.
→ `[{ id, name, phone, email, city, customerType, projectCount, totalInvoiced, createdAt }]` + `meta`.

**`GET /customers/:id`** — the customer 360: `{ ...customer, user: { id, email, isActive }?, projects: [...], quotes: [...], invoices: [...], payments: [...], systems: [{ serialNumber, productName, warrantyStatus, warrantyEndDate }], tickets: [...] }`.

**`PATCH /customers/:id`** — body `{ name?, phone?, altPhone?, email?, addressLine?, city?, state?, pincode?, customerType?, notes? }`. → `200 { customer }`.

### 3.8 me — `server/src/modules/me` (customer portal)

Every endpoint is `CUSTOMER` only and **hard-scoped to the caller's own `customerId`**. There is no
id parameter that could point at someone else.

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/me/overview` | `CUSTOMER` | B |
| `GET` | `/me/projects` | `CUSTOMER` | B |
| `GET` | `/me/projects/:id` | `CUSTOMER` (own) | B |
| `GET` | `/me/quotes` | `CUSTOMER` | B |
| `GET` | `/me/payments` | `CUSTOMER` | B |
| `GET` | `/me/invoices` | `CUSTOMER` | B (uses the invoices service, A) |
| `GET` | `/me/systems` | `CUSTOMER` | B (uses the warranties service, C) |

**`GET /me/overview`** → `{ customer: { name, phone, city }, activeProjects: 1, totalPaid: "54000.00", outstanding: "126000.00", systems: 1, openTickets: 0, nextStep: { label: "Installation scheduled for 3 Nov 2026", link: "/portal/projects/prj_7xk" } }`.

**`GET /me/projects/:id`** → the same timeline as `GET /projects/:id`, **minus every cost figure**.
Another customer's project → `403 FORBIDDEN` (not 404 — the customer knows their own ids).

**`GET /me/systems`** → `[{ serialNumber, productName, category, projectCode, installedAt, warrantyStatus, warrantyStartDate, warrantyEndDate, monthsRemaining }]`
— the screen a customer opens when something stops working.

---

## 4. Member C — warehouse, installation, support

### 4.1 products — `server/src/modules/products`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/products` | any staff session | C |
| `POST` | `/products` | `WAREHOUSE_MANAGER` | C |
| `PATCH` | `/products/:id` | `WAREHOUSE_MANAGER` | C |
| `PATCH` | `/products/:id/status` | `WAREHOUSE_MANAGER` | C |

**`GET /products`** — `?category&q&isSerialized&isActive&page&pageSize`; `q` matches sku, name, brand.
→ `[{ id, sku, name, category, brand, unit, isSerialized, warrantyMonths, costPrice, sellPrice, taxPercent, reorderLevel, stockQty, inStockSerials, isActive }]` + `meta`.
`inStockSerials` is the live `IN_STOCK` count for serialized products; `stockQty` is the column for
the rest. **A `SALES_EXECUTIVE` and a `CUSTOMER` never see `costPrice`.**

**`POST /products`** — body `{ sku, name, category, brand?, specs?, unit, isSerialized, warrantyMonths, costPrice, sellPrice, taxPercent, reorderLevel?, stockQty? }`.
→ `201`. Errors: `409 SKU_IN_USE`.

**`PATCH /products/:id`** — any of the above except `sku` and `isSerialized` (changing either would
orphan existing serials → `409 CANNOT_CHANGE_SERIALIZATION`). A `sellPrice` or `costPrice` change is
audited (BR-18). → `200`.

**`PATCH /products/:id/status`** — body `{ isActive }`. Soft delete only. → `200`.

### 4.2 inventory — `server/src/modules/inventory`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/inventory/summary` | any staff session | C |
| `GET` | `/inventory/low-stock` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `POST` | `/inventory/adjust` | `WAREHOUSE_MANAGER` | C |

**`GET /inventory/summary`** → `[{ productId, sku, name, category, unit, isSerialized, inStock, reserved, dispatched, delivered, stockQty, reorderLevel, isLow, stockValue }]`.
Serialized counts come from `SerialUnit` grouped by status; non-serialized from `stockQty`.

**`GET /inventory/low-stock`** → the same rows filtered to `isLow` (`inStock <= reorderLevel`),
most urgent first.

**`POST /inventory/adjust`** — body `{ productId, delta, reason }` (non-serialized only; a serialized
product's stock changes only through purchase, scan or return → `422 SERIALIZED_PRODUCT`).
`reason` is required. **Audited with before/after** (BR-18). → `200 { product }`.
Errors: `409 NEGATIVE_STOCK`.

### 4.3 purchases and suppliers — `server/src/modules/purchases`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/purchases` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `POST` | `/purchases` | `WAREHOUSE_MANAGER` | C |
| `GET` | `/purchases/:id` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `GET` | `/suppliers` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `POST` | `/suppliers` | `WAREHOUSE_MANAGER` | C |

**`GET /purchases`** — `?supplierId&from&to&q&page&pageSize`.
→ `[{ id, number, supplier: { id, name }, invoiceRef, purchasedAt, total, itemCount, serialCount }]` + `meta`.

**`POST /purchases`** — body:

```json
{ "supplierId": "sup_1", "invoiceRef": "TSP/26-27/1184", "purchasedAt": "2026-10-28",
  "items": [ { "productId": "prd_panel540", "quantity": 6, "unitCost": "9800.00",
               "serialNumbers": ["WR540-2426-00118", "…x6"] },
             { "productId": "prd_dccable", "quantity": 90, "unitCost": "48.00" } ] }
```

For a **serialized** product, `serialNumbers.length` must equal `quantity` → else
`422 SERIAL_COUNT_MISMATCH` (with the product in `details`). Each serial creates a `SerialUnit`
(`status = IN_STOCK`, `unitCost` from the line) — **this is where the warranty trail begins**.
For a non-serialized product, `stockQty` increases. One transaction; `total` computed server-side.
→ `201 { purchase }`. Errors: `409 SERIAL_IN_USE` (listing the offending serials),
`404 PRODUCT_NOT_FOUND`.

**`GET /purchases/:id`** → the purchase with items, products and the serials created per line.

**`GET /suppliers`** — `?q&page&pageSize` → `[{ id, name, phone, gstin, purchaseCount }]` + `meta`.

**`POST /suppliers`** — body `{ name, phone?, gstin? }` → `201`.

### 4.4 serials — `server/src/modules/serials`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/serials` | any staff session | C |
| `GET` | `/serials/:serialNumber` | any staff session | C |

**`GET /serials`** — `?q&status&productId&projectId&page&pageSize`; `q` is a partial serial match.
→ `[{ id, serialNumber, product: { id, sku, name, category }, status, projectCode?, dispatchNumber?, warrantyStatus?, warrantyEndDate?, createdAt }]` + `meta`.

**`GET /serials/:serialNumber`** — **the full history of one physical unit** (US-E1):

```json
{ "id": "ser_9", "serialNumber": "INV-SG5K-2024-00318",
  "product": { "sku": "INV-OG-3K", "name": "3 kW On-Grid String Inverter", "warrantyMonths": 24 },
  "status": "DELIVERED", "unitCost": "28500.00",
  "customer": { "id": "cus_3", "name": "Vipul Mehta", "phone": "9825041122" },
  "project": { "id": "prj_7xk", "code": "PRJ-2026-0007" },
  "warranty": { "status": "ACTIVE", "startDate": "2025-04-18", "endDate": "2027-04-18",
                "monthsRemaining": 6 },
  "replacedBy": null, "replaces": null,
  "timeline": [ { "at": "2025-03-02", "event": "Purchased", "detail": "TSP/25-26/0912" },
                { "at": "2025-04-12", "event": "Scanned for dispatch", "detail": "DSP-2026-0007" },
                { "at": "2025-04-18", "event": "Delivered — warranty started", "detail": "ends 18 Apr 2027" },
                { "at": "2026-10-29", "event": "Ticket TKT-2026-0031", "detail": "Inverter fault E-04 — under warranty" } ] }
```

Errors: `404 SERIAL_NOT_FOUND`.

### 4.5 dispatches — `server/src/modules/dispatches`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/dispatches` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `GET` | `/dispatches/:id` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `POST` | `/dispatches/:id/start-packing` | `WAREHOUSE_MANAGER` | C |
| `POST` | `/dispatches/:id/scan` | `WAREHOUSE_MANAGER` | C |
| `DELETE` | `/dispatches/:id/scan/:serialNumber` | `WAREHOUSE_MANAGER` | C |
| `POST` | `/dispatches/:id/pack-line` | `WAREHOUSE_MANAGER` | C |
| `POST` | `/dispatches/:id/dispatch` | `WAREHOUSE_MANAGER` | C |
| `POST` | `/dispatches/:id/deliver` | `WAREHOUSE_MANAGER` | C |
| `GET` | `/dispatches/:id/packing-slip` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |

**`GET /dispatches`** — `?status&q&page&pageSize`.
→ `[{ id, number, project: { id, code, capacityKw }, customer: { id, name, city }, status, linesComplete: 7, linesTotal: 9, dispatchedAt, deliveredAt }]` + `meta`.

**`GET /dispatches/:id`** — the packing screen's payload:

```json
{ "id": "dsp_7", "number": "DSP-2026-0007", "status": "PACKING",
  "project": { "id": "prj_7xk", "code": "PRJ-2026-0007", "siteAddress": "…" },
  "customer": { "name": "Vipul Mehta", "phone": "9825041122" },
  "lines": [ { "id": "dl_1", "product": { "id": "prd_p540", "sku": "PNL-540", "name": "Mono PERC 540 Wp Panel",
                                           "isSerialized": true, "unit": "PCS" },
               "requiredQty": 6, "scannedQty": 6, "packedQty": 0, "isComplete": true,
               "serials": ["WR540-2426-00118", "…"] },
             { "id": "dl_4", "product": { "name": "4 sq mm DC Cable", "isSerialized": false, "unit": "METER" },
               "requiredQty": 90, "scannedQty": 0, "packedQty": 90, "isComplete": true } ],
  "isComplete": false, "shortLines": [ { "productName": "Earthing Kit", "short": 1 } ],
  "vehicleNo": null, "driverName": null }
```

**`POST /dispatches/:id/start-packing`** → dispatch `PACKING`, project `PACKING`. → `200`.
Errors: `409 INVALID_TRANSITION`.

**`POST /dispatches/:id/scan`** — body `{ serialNumber }`.
→ `200 { line: { id, productName, requiredQty, scannedQty, isComplete }, serial: { serialNumber, productName }, dispatchComplete: false }`.
Errors, in validation order (BR-07, BR-08) — **the UI branches on these codes**:

| Code | Status | Meaning |
|---|---|---|
| `SERIAL_NOT_FOUND` | 404 | No such serial in the system |
| `SERIAL_NOT_AVAILABLE` | 409 | Not `IN_STOCK` (already dispatched, under repair, scrapped…) |
| `SERIAL_ON_OTHER_PROJECT` | 409 | Belongs to another project — `details.projectCode` |
| `PRODUCT_NOT_ON_DISPATCH` | 422 | This product is not on the pick list |
| `LINE_ALREADY_COMPLETE` | 409 | That line already has its full quantity |
| `SERIAL_ALREADY_SCANNED` | 409 | Already scanned on this dispatch |
| `INVALID_TRANSITION` | 409 | The dispatch is not in `PACKING` |

**`DELETE /dispatches/:id/scan/:serialNumber`** — undo a scan while `PACKING`. The serial returns to
`IN_STOCK` and `scannedQty` decrements. → `200 { line }`. Errors: `404 SERIAL_NOT_SCANNED`,
`409 INVALID_TRANSITION`.

**`POST /dispatches/:id/pack-line`** — body `{ lineId, qty }`. Non-serialized lines only →
`422 SERIALIZED_LINE`. `qty` must be ≤ `requiredQty` → `422 QTY_EXCEEDS_REQUIRED`. → `200 { line }`.

**`POST /dispatches/:id/dispatch`** — body `{ vehicleNo, driverName, driverPhone }`.
**BR-07: every line must be complete**, else `409 DISPATCH_INCOMPLETE` with
`details.shortLines: [{ productName, requiredQty, scannedQty, packedQty, short }]`.
Serials → `DISPATCHED`; dispatch → `DISPATCHED` with `dispatchedAt`; project → `DISPATCHED`;
emits `dispatch.dispatched`. → `200 { dispatch }`.

**`POST /dispatches/:id/deliver`** — body `{ deliveredAt, receivedByName }`.
In **one transaction**: dispatch and project → `DELIVERED`, serials → `DELIVERED`, and
**one `Warranty` row per delivered serial** with `startDate = deliveredAt`,
`endDate = startDate + product.warrantyMonths` (BR-09). Then emits `dispatch.delivered`.
→ `200 { dispatch, warrantiesCreated: 8 }`. Errors: `409 INVALID_TRANSITION`.

**`GET /dispatches/:id/packing-slip`** → `application/pdf` listing every line and **every serial
number**, with the vehicle, driver and a signature box.

### 4.6 warranties — `server/src/modules/warranties`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/warranties` | any staff session | C |
| `GET` | `/warranties/serial/:serialNumber` | any staff session | C |

**`GET /warranties`** — `?q&status=ACTIVE|EXPIRED|VOID&expiringInDays&customerId&projectId&page&pageSize`.
`status` is computed, not stored, so filtering is done in the service.
→ `[{ id, serialNumber, product: { name, category, warrantyMonths }, customer: { id, name, phone }, projectCode, startDate, endDate, status, monthsRemaining }]` + `meta`.

**`GET /warranties/serial/:serialNumber`** — **the question support asks on every call**:
→ `{ serialNumber, productName, customer: { id, name, phone }, projectCode, startDate, endDate, status: "ACTIVE", monthsRemaining: 6, isChargeable: false, voidReason: null }`.
Errors: `404 SERIAL_NOT_FOUND`, `404 WARRANTY_NOT_FOUND` (the unit exists but was never delivered).

### 4.7 installations — `server/src/modules/installations`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/installations` | `WAREHOUSE_MANAGER`, `DIRECTOR` | C |
| `PATCH` | `/installations/:id/schedule` | `WAREHOUSE_MANAGER` | C |
| `GET` | `/installations/my` | `INSTALLATION_TECHNICIAN` (own) | C |
| `GET` | `/installations/:id` | `WAREHOUSE_MANAGER`, `DIRECTOR`; `INSTALLATION_TECHNICIAN` (own) | C |
| `POST` | `/installations/:id/start` | `INSTALLATION_TECHNICIAN` (own) | C |
| `POST` | `/installations/:id/photos` | `INSTALLATION_TECHNICIAN` (own), multipart | C |
| `POST` | `/installations/:id/complete` | `INSTALLATION_TECHNICIAN` (own) | C |

**`GET /installations`** — `?status&from&to&technicianId&page&pageSize`.
→ `[{ id, project: { id, code, capacityKw, systemType }, customer: { id, name, phone, city }, siteAddress, status, scheduledDate, crew: [{ id, name, isLead }], startedAt, finishedAt }]` + `meta`.

**`PATCH /installations/:id/schedule`** — body `{ scheduledDate, crew: [{ technicianId, isLead }] }`.
Scheduling is the warehouse manager's job (D-09). At least one member and **exactly one** `isLead`
→ else `422 INVALID_CREW`; every member must be an `INSTALLATION_TECHNICIAN` → `422 INVALID_TECHNICIAN`.
Job → `SCHEDULED`; project → `INSTALLATION_SCHEDULED`; emits `installation.scheduled`.
→ `200 { job }`. Errors: `409 INVALID_TRANSITION` (the project must be `DELIVERED` first).

**`GET /installations/my`** — `?from&to`. Jobs where the caller is on the crew, today first.
→ the same row shape, with `isLead` for the caller.

**`GET /installations/:id`** → the job with the project, the customer, the site address, the crew,
`photos: [...]`, `checklist`, the signature and the quote's system details. A technician not on the
crew → `403 FORBIDDEN`.

**`POST /installations/:id/start`** → `IN_PROGRESS`, `startedAt`; project → `INSTALLING`.
→ `200 { job }`. Errors: `409 INVALID_TRANSITION`.

**`POST /installations/:id/photos`** — `multipart/form-data`, repeatable `files`.
Stores `Attachment` rows (`entityType = INSTALLATION`, `kind = PHOTO`).
→ `201 { attachments: [...], photoCount: 3 }`. The UI shows `photoCount` against the 3 BR-10 needs.

**`POST /installations/:id/complete`** — body:

```json
{ "finishedAt": "2026-10-31T11:40:00.000Z", "confirmedCapacityKw": "3.00",
  "generationTestKw": "2.70",
  "checklist": { "structureMounted": true, "panelsFixed": true, "earthingDone": true,
                 "inverterCommissioned": true, "generationVerified": true, "siteCleaned": true },
  "signatureDataUrl": "data:image/png;base64,…", "signedByName": "Vipul Mehta", "remarks": "" }
```

**BR-10** — all of these are enforced server-side:

| Code | Status | Meaning |
|---|---|---|
| `NOT_STARTED` | 409 | `startedAt` is null |
| `INVALID_TIME_RANGE` | 422 | `finishedAt` is not after `startedAt` |
| `PHOTOS_REQUIRED` | 422 | fewer than 3 `PHOTO` attachments — `details.photoCount` |
| `SIGNATURE_REQUIRED` | 422 | no `signatureDataUrl` and no stored signature |
| `VALIDATION_ERROR` | 422 | `confirmedCapacityKw` missing or ≤ 0 |

On success: the signature is written to disk as an `Attachment` (`kind = SIGNATURE`), the job →
`COMPLETED`, a `TimeLog` is written per crew member, `installation.completed` is emitted (project →
`INSTALLED`, `TAX` invoice, notifications). → `200 { job, invoiceNumber }`.

### 4.8 support — `server/src/modules/support`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/support/lookup` | `SUPPORT_EXECUTIVE`, `DIRECTOR` | C |

**`GET /support/lookup`** — `?q=` (min 3 chars). Matches a **phone, a customer name, a serial number
or a project code** in one call — the "find it in seconds" requirement (US-E1):

```json
{ "matchedBy": "phone",
  "customers": [ { "id": "cus_3", "name": "Vipul Mehta", "phone": "9825041122",
                   "city": "Hyderabad",
                   "projects": [ { "id": "prj_7xk", "code": "PRJ-2026-0007", "status": "CLOSED",
                                   "capacityKw": "3.00", "systemType": "ON_GRID",
                                   "installedAt": "2025-04-22" } ],
                   "systems": [ { "serialNumber": "INV-SG5K-2024-00318",
                                  "productName": "3 kW On-Grid String Inverter",
                                  "category": "INVERTER", "warrantyStatus": "ACTIVE",
                                  "warrantyEndDate": "2027-04-18", "monthsRemaining": 6,
                                  "isChargeable": false } ],
                   "openTickets": 0 } ] }
```

### 4.9 tickets — `server/src/modules/tickets`

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/tickets` | `SUPPORT_EXECUTIVE`, `DIRECTOR` (all); `INSTALLATION_TECHNICIAN` (own assigned); `CUSTOMER` (own) | C |
| `POST` | `/tickets` | `SUPPORT_EXECUTIVE`; `CUSTOMER` (own) | C |
| `GET` | `/tickets/:id` | same as list, ownership-scoped | C |
| `PATCH` | `/tickets/:id/assign` | `SUPPORT_EXECUTIVE` | C |
| `POST` | `/tickets/:id/activities` | `SUPPORT_EXECUTIVE`, `INSTALLATION_TECHNICIAN` (own) | C |
| `POST` | `/tickets/:id/visit` | `INSTALLATION_TECHNICIAN` (own), `SUPPORT_EXECUTIVE` | C |
| `POST` | `/tickets/:id/resolve` | `SUPPORT_EXECUTIVE`, `INSTALLATION_TECHNICIAN` (own) | C |
| `POST` | `/tickets/:id/confirm` | `CUSTOMER` (own), `SUPPORT_EXECUTIVE` (with note) | C |
| `POST` | `/tickets/:id/reopen` | `SUPPORT_EXECUTIVE`, `CUSTOMER` (own) | C |

**`GET /tickets`** — `?status&priority&category&assignedToId&customerId&q&from&to&page&pageSize`.
→ `[{ id, number, customer: { id, name, phone }, projectCode?, serialNumber?, category, priority, status, isUnderWarranty, isChargeable, assignedTo: { id, name }?, createdAt, resolvedAt }]` + `meta`.

**`POST /tickets`** — body `{ customerId, projectId?, serialUnitId?, source, category, faultCode?, description, priority? }`.
A `CUSTOMER` may only raise one for their own project/serial → `403 FORBIDDEN`, and `customerId` is
forced to their own. When `serialUnitId` is given, the service resolves the warranty and sets
`isUnderWarranty` / `isChargeable` (BR-11) — **frozen at creation**, so a ticket opened a day before
expiry stays free. Emits `ticket.created`. → `201 { ticket }`.

**`GET /tickets/:id`** → the ticket with the customer, project, serial + warranty,
`activities: [...]`, `parts: [{ productName, quantity, unitPrice, labourHours, oldSerial?, newSerial? }]`,
`attachments: [...]` and the service invoice if one exists. A `CUSTOMER` does not see `unitCost`.

**`PATCH /tickets/:id/assign`** — body `{ assignedToId }`. Must be an `INSTALLATION_TECHNICIAN` →
`422 INVALID_TECHNICIAN`. → `ASSIGNED`, assignee notified. → `200 { ticket }`.

**`POST /tickets/:id/activities`** — body `{ type, message }` → `201 { activity }`.

**`POST /tickets/:id/visit`** — body:

```json
{ "diagnosis": "DC isolator terminal loose; inverter tripping on E-04.",
  "parts": [ { "productId": "prd_dcbox", "quantity": 1,
               "oldSerialId": "ser_9", "newSerialId": "ser_204" } ],
  "labourHours": "1.50", "startedAt": "…", "finishedAt": "…" }
```

Writes `TicketPart` rows with **both `unitPrice` and `unitCost`** and a `TimeLog`. On a serial swap
(D-07) the **new unit inherits the remaining warranty** of the old one: the new warranty's `endDate`
is copied from the old, the old serial → `REPLACED` with `replacedById`, and its warranty → `VOID`
with a reason. Status → `IN_PROGRESS`, or `AWAITING_PARTS` when a part is out of stock.
→ `200 { ticket, parts, warrantyTransferred: true }`.
Errors: `409 SERIAL_NOT_AVAILABLE`, `404 PRODUCT_NOT_FOUND`.

**`POST /tickets/:id/resolve`** — body `{ resolutionNote }`. → `RESOLVED`, `resolvedAt`;
emits `ticket.resolved` (the customer is asked to confirm) and, when `isChargeable`,
`ticket.billable` (a `SERVICE` invoice is created from parts + labour + visit charge, BR-11).
→ `200 { ticket, invoiceNumber? }`. Errors: `409 INVALID_TRANSITION`.

**`POST /tickets/:id/confirm`** — body `{ confirmationNote? }`.
**BR-12:** a `CUSTOMER` confirming their own ticket needs no note; a `SUPPORT_EXECUTIVE` confirming on
their behalf **must** send `confirmationNote` → else `422 CONFIRMATION_NOTE_REQUIRED`.
Sets `customerConfirmedAt` → `CLOSED`; emits `ticket.closed` (which books the warranty cost when the
work was free). → `200 { ticket }`. Errors: `409 INVALID_TRANSITION` (only from `RESOLVED`).

**`POST /tickets/:id/reopen`** — body `{ reason }`. `RESOLVED` or `CLOSED` → `REOPENED`.
→ `200 { ticket }`.

---

## 5. Events

In-process `EventEmitter` (D-02). **Emitted after the transaction commits**, payloads carry **ids
only**, listeners live in the owning module's `<name>.listeners.js` and are registered once at boot
(`ARCHITECTURE.md` section 6). A failing listener logs and never fails the HTTP request.

| Event | Payload | Emitted by | Listener | Owner | What the listener does |
|---|---|---|---|---|---|
| `lead.created` | `{ leadId }` | `public`, `leads` | `leads.listeners` | B | Notifies every active `SALES_EXECUTIVE`: "New enquiry ENQ-2026-0042 — 3 kW On-Grid, Kukatpally" |
| `survey.submitted` | `{ surveyId }` | `surveys` | `surveys.listeners` | B | Notifies the lead's assigned sales executive that a report is waiting for review |
| `survey.approved` | `{ surveyId, leadId }` | `surveys` | `surveys.listeners` | B | Notifies sales that quoting is now unlocked (BR-03) |
| `quote.sent` | `{ quoteId }` | `quotes` | `quotes.listeners` | B | Creates a `CUSTOMER` `User` for the customer if none exists (random password, phone as the identifier) and notifies them that a quote is ready |
| `quote.accepted` | `{ quoteId }` | `quotes` | `projects.listeners` | B | Creates the `Project` (`AWAITING_ADVANCE`, code from `Counter`) and moves the lead to `WON` |
| `payment.recorded` | `{ paymentId, projectId, invoiceId }` | `payments` | `invoices.listeners` | A | Recomputes `Invoice.amountPaid` and sets `PARTIALLY_PAID` or `PAID`; notifies the director on a full settlement |
| `project.confirmed` | `{ projectId }` | `projects` | `dispatches.listeners` | C | Creates the `Dispatch` (`PENDING`) + one `DispatchLine` per quote item and reserves non-serialized stock (BR-06) |
| | | | `installations.listeners` | C | Creates the `InstallationJob` (`UNSCHEDULED`) (BR-06) |
| | | | `invoices.listeners` | A | Creates the `PROFORMA` invoice for the quote total |
| | | | `subsidies.listeners` | A | Creates the `SubsidyApplication` (`NOT_STARTED`) when `project.subsidyEligible` |
| | | | `notifications` via `dispatches.listeners` | C | Notifies every `WAREHOUSE_MANAGER`: "PRJ-2026-0007 confirmed — pick list ready" |
| `dispatch.dispatched` | `{ dispatchId, projectId }` | `dispatches` | `dispatches.listeners` | C | Notifies the customer with the vehicle and driver details |
| `dispatch.delivered` | `{ dispatchId, projectId }` | `dispatches` | `installations.listeners` | C | Notifies the installation crew and the warehouse that the job can be scheduled. **Warranties are written inside the delivery transaction, not here** (BR-09) |
| `installation.scheduled` | `{ jobId }` | `installations` | `installations.listeners` | C | Notifies the crew and the customer of the date |
| `installation.completed` | `{ jobId, projectId }` | `installations` | `installations.listeners` | C | Moves the project to `INSTALLED` |
| | | | `invoices.listeners` | A | Creates the `TAX` invoice for the balance (quote total − already invoiced) |
| | | | `notifications` via `invoices.listeners` | A | Notifies the customer and the director that the job is done and invoiced |
| `ticket.created` | `{ ticketId }` | `tickets` | `tickets.listeners` | C | Notifies every active `SUPPORT_EXECUTIVE`, with the priority in the title |
| `ticket.billable` | `{ ticketId, lines }` | `tickets` | `invoices.listeners` | A | Creates the `SERVICE` invoice: parts at `unitPrice` + `labourHours × settings.labourRatePerHour` + `settings.serviceVisitCharge` (BR-11) |
| `ticket.resolved` | `{ ticketId }` | `tickets` | `tickets.listeners` | C | Notifies the customer to confirm the fix (BR-12), with a portal link |
| `ticket.closed` | `{ ticketId }` | `tickets` | `expenses.listeners` | A | When the ticket was **free** (under warranty), books an `Expense` on the project for parts at `unitCost` + labour at cost, so BR-13 profit stays honest |

**Adding an event is additive** and needs no permission. **Changing an existing payload or removing a
listener is breaking — stop and ask** (`AGENTS.md` section 6).

---

## 6. Health

| Method | Path | Roles | Owner |
|---|---|---|---|
| `GET` | `/health` | public | A |

→ `200 { status: "ok", uptime: 1284, db: "up", version: "0.1.0", time: "2026-10-31T…" }`.
Returns `503` with `db: "down"` if the Prisma connection check fails.
