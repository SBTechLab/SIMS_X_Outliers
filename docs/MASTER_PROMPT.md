You are the lead engineer of a 3-person hackathon team (Odoo hackathon final round, 18 hours) building "SunPower SIMS" — a Solar Installation Management System for SunPower Solutions, a rooftop solar company (~40 projects/month, 15 technicians, 1–5 kW On-Grid and Off-Grid systems). Read docs/PROBLEM_STATEMENT.md completely before doing anything.

HOW TO WORK THROUGH THIS PROMPT
- The project is split into Phase 0 to Phase 5. Phase 0 must be done and pushed first. In Phase 0, save this entire prompt unchanged as docs/MASTER_PROMPT.md.
- Build ONLY the phase or part I name ("Phase 0", "Phase 2, part C2"). Never start the next part on your own.
- Every session starts with: read CLAUDE.md → docs/AGENTS.md → PRD.md → ARCHITECTURE.md → RULES.md → DESIGN.md → API_CONTRACTS.md → DATABASE.md → MEMORY.md, then `git pull --rebase origin main`.
- Every part ends with: the tests listed in that part passing, docs/MEMORY.md + DECISIONS.md + FEATURE_NOTES.md updated, a conventional commit, `git pull --rebase origin main`, `git push origin main`, then STOP and report what was done and how to test it.
- Each part names its owner (Member A, B or C). A part only edits its owner's folders (listed in AGENTS.md) plus shared files under the shared-file protocol.
- Roles are LOCKED (see below). Stop and ask me before: any role change, a breaking schema change, editing another member's module, or adding a dependency not in the tech stack.
- Code must read as written by a professional team: clean structure, thin controllers, JSDoc with Why/Flow/Example on every service function, no AI-looking UI (DESIGN.md checklist).

################################################################
PHASE 0 — FOUNDATION (Owner: Member A — B and C wait until this is pushed)
################################################################
Build only the foundation here: documentation, repo structure, the database schema for the WHOLE system, auth + role-based access control, shared backend utilities, shared UI kit, layouts, routing shell and seed data. Every contract (schema, enums, API conventions, events, folder ownership) must be complete and stable because three people build on it in parallel. No feature screens beyond what is listed.

==================================================
FIXED TECH STACK (do not substitute anything)
==================================================
Frontend: React 18 + Vite (JavaScript, not TypeScript), Tailwind CSS, React Router v6, TanStack Query, axios, react-hook-form + zod, framer-motion (transitions), lucide-react (icons), recharts (charts), sonner (toasts), clsx + tailwind-merge (cn helper).
Backend: Node.js 20 + Express (ES modules), Prisma ORM, PostgreSQL, zod (validation), jsonwebtoken, bcryptjs, cookie-parser, helmet, cors, express-rate-limit, multer (local uploads), pdfkit (PDFs), pino (logger), node-cron.
Tests: Node built-in test runner (node --test) for critical services.
Monorepo: /client and /server with a root package.json that has scripts: setup, dev (runs both with concurrently), seed, test.

==================================================
ROLES — LOCKED. Never add, remove, rename or merge roles. If you believe a role change is needed, STOP and ask the user first.
==================================================
SUPER_ADMIN — manages the software: users, roles, settings, kit templates, audit log.
DIRECTOR — owner: profit, revenue, company-wide data, invoices, subsidy, technician payouts, reports.
SALES_EXECUTIVE — enquiries/leads, qualification calls, survey scheduling, survey approval, quotes, advance payments, order confirmation.
SURVEY_TECHNICIAN — assigned roof surveys, mobile survey form.
CUSTOMER — customer portal: own projects, quotes, payments, invoices, systems & warranties, service requests.
WAREHOUSE_MANAGER — products, stock, purchases with serial numbers, packing, dispatch scanning, delivery, installation scheduling.
INSTALLATION_TECHNICIAN — assigned installation jobs and service visits, mobile completion form with photos + customer signature.
SUPPORT_EXECUTIVE — customer/serial lookup, tickets, warranty check, service billing.

Team ownership (put this in AGENTS.md):
Member A → SUPER_ADMIN, DIRECTOR (+ platform/foundation, finance, reports)
Member B → SALES_EXECUTIVE, SURVEY_TECHNICIAN, CUSTOMER (+ public website)
Member C → WAREHOUSE_MANAGER, INSTALLATION_TECHNICIAN, SUPPORT_EXECUTIVE

==================================================
STEP 1 — WRITE THE DOCS FIRST (in /docs, before any code)
==================================================
Write real, specific content — not placeholders. These files are the single source of truth for three people and three AI sessions.

1. PRD.md
   - Product vision in 3 lines; the 5 pain points from the problem statement and how each is solved.
   - Persona section for all 8 roles: goals, daily tasks, screens they get, device (technicians = phone/tablet first).
   - End-to-end flow: enquiry → qualification call → survey scheduled → survey done → survey approved → quote (from kit template, auto BOM) → accepted → advance/full payment → order confirmed → pick list + installation job auto-created → packing → serial scanning → dispatch → delivery (warranty auto-starts per serial) → installation (photos, signature) → final invoice → subsidy paperwork → closed → service tickets for 20 years.
   - User stories with acceptance criteria for every scene in the problem statement ("The rooftop inquiry", "Getting the kit right", "Dispatch day and serial numbers", "On the roof", "The rainy season breakdown", "The director's month-end").
   - All state machines (copy the enums from Step 3) with allowed transitions.
   - Numbered business rules BR-01… including at least:
     BR-01 Enquiries are never deleted; duplicate phone numbers are flagged and linked, not rejected.
     BR-02 A lead uncontacted for 24h is flagged overdue.
     BR-03 A quote can only be created when the lead's survey is APPROVED (enforced on the server).
     BR-04 Quote lines are generated from a kit template; sales can adjust quantities and add items.
     BR-05 An order is confirmed only when payments ≥ advancePercent (setting, default 30%) of quote total.
     BR-06 On order confirmation the system auto-creates a dispatch pick list and an unscheduled installation job.
     BR-07 Every serialized product (panel, inverter, battery, charge controller) must be scanned before dispatch; a dispatch cannot complete with unscanned or mismatched units.
     BR-08 A serial can belong to only one project; only IN_STOCK serials can be scanned.
     BR-09 On delivery, a Warranty row is created for every delivered serial: start = deliveredAt, end = start + product.warrantyMonths.
     BR-10 Installation completion requires start time, finish time, confirmed system size, ≥3 photos and a customer signature.
     BR-11 A ticket on a serial with an active warranty is free to the customer (cost booked as warranty expense); otherwise parts + labour are billed automatically.
     BR-12 A ticket is closed only after the customer confirms resolution (portal button, or support records the confirmation with a note).
     BR-13 Project profit = invoiced revenue − (material cost + labour cost + project expenses + warranty service cost).
     BR-14 Money is stored as Decimal(12,2) in INR; tax % comes from settings; never hard-code rates.
   - Out of scope (simulated): real payment gateway, real SMS/WhatsApp API, real government subsidy portal.
   - Demo script outline (8 minutes, role by role).

2. AGENTS.md (rules for every AI agent/human working in this repo)
   - Read order at the start of every session: CLAUDE.md → docs/AGENTS.md → PRD.md → ARCHITECTURE.md → RULES.md → DESIGN.md → API_CONTRACTS.md → DATABASE.md → MEMORY.md.
   - Module ownership map (folder → member). An agent only edits its own member's folders, plus shared files under the shared-file protocol.
   - Shared-file protocol: schema.prisma, server/src/routes.js, client/src/routes/AppRoutes.jsx, client/src/config/navigation/*, docs/API_CONTRACTS.md — only additive changes; never rename/delete another member's lines; tell the user to announce it to the team.
   - Locked roles rule (above). Stop-and-ask list: role changes, breaking schema changes, editing another member's module, adding a new dependency.
   - Definition of done for any feature: server validation + RBAC + ownership check, loading/empty/error states in UI, responsive, feature documented in FEATURE_NOTES.md, MEMORY.md updated, committed.
   - End of every session: update MEMORY.md (done, in progress, pending, bugs), DECISIONS.md (any new decision), FEATURE_NOTES.md, then git commit with a conventional message.
   - Git: the whole team works on ONE branch, main. Start every session with `git pull --rebase origin main`; finish with commit → `git pull --rebase origin main` → `git push origin main`. Never force-push, never `git reset --hard`. On a conflict in a shared file keep both sides; ask the user before resolving any other conflict.
   Also create /CLAUDE.md at the repo root: a short file telling the agent to read docs/AGENTS.md first and listing the 10 most important rules.

3. DESIGN.md — must make the product look like a classic, professional business product, NOT AI-generated.
   - Brand: "SunPower Solutions". Mood: trustworthy engineering company, warm sunlight on deep navy.
   - Color tokens (define as CSS variables + Tailwind theme): ink #0F1B2D (primary dark), ink-soft #1E2A3E, paper #FAF8F3 (app background), surface #FFFFFF, line #E7E2D8, muted #6B7280, sun #F59E0B (primary accent), sun-deep #D97706 (hover), leaf #15803D (success), sky #0369A1 (info), alert #B91C1C (danger), amber-soft #FEF3C7. No purple, no neon gradients, no glassmorphism.
   - Typography: "Manrope" for UI (400/500/600/700), "Fraunces" only for marketing headlines on the public site. Type scale and line heights. Tabular numbers for money columns.
   - Spacing (4px grid), radius (6px inputs/buttons, 10px cards), shadows (2 levels only), borders over heavy shadows.
   - Component inventory with variants and states (default/hover/focus/disabled/loading/error): Button (primary, secondary, outline, ghost, danger, link; sm/md/lg; leading icon; loading spinner), IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, DateInput, FileDropzone (with previews), Card, StatCard (value, delta, sparkline slot), DataTable (sorting, sticky header, pagination, row click, empty state), StatusBadge (one color per enum value — define the full mapping), Tabs, Modal, Drawer (right side, for detail views), ConfirmDialog, Stepper/Timeline (project journey), PageHeader (title, breadcrumb, actions, optional background photo with dark overlay), EmptyState (photo or icon + one helpful sentence + action), Skeleton loaders, Toast, Avatar, Pagination, SearchInput (debounced), FilterBar, Money and Date display helpers.
   - Motion (framer-motion): route transition = fade + 8px rise, 180ms ease-out; modal/drawer = 200ms; list items stagger 30ms; button press scale 0.98; skeleton shimmer. Respect prefers-reduced-motion. No bouncy/spring-heavy animations.
   - Imagery rules: photos from client/src/assets/images only (credited in docs/ASSETS.md). Used on public landing hero, login split screen, page headers (with 70% ink overlay), empty states, section banners. Never behind tables or forms. Lazy-load, WebP, explicit width/height.
   - Layouts: Public (top nav, footer), Auth (split screen: photo left, form right), App (left sidebar collapsible, topbar with global search, notification bell, user menu), Field (technician mobile layout: bottom tab bar, large 48px tap targets, sticky primary action at the bottom).
   - Responsive breakpoints; technician and customer screens must work at 360px width.
   - Formatting: INR with en-IN grouping (₹1,50,000), dates "31 Oct 2026", times IST 12h; phone +91 format.
   - Accessibility: visible focus rings (sun color), labels on every input, 4.5:1 contrast, keyboard-usable modals.
   - "Does not look AI-generated" checklist: no emojis in UI, no sparkle icons, no "Welcome to your dashboard!" banners, no lorem ipsum, realistic Indian names/addresses/data, consistent copy tone (short, specific, professional), real error messages, aligned grids, one accent color, no random gradient blobs, no generic stock "AI" illustrations.

4. ARCHITECTURE.md
   - Text diagram: React client → axios (withCredentials) → Express /api/v1 → middleware chain → module controller → service → Prisma → PostgreSQL; event bus; uploads folder; PDF generation; cron.
   - Full folder tree (Step 2) with one-line purpose per folder.
   - Request lifecycle: helmet/cors/rate-limit → cookie auth (requireAuth) → requireRole(...roles) → validate(zodSchema) → controller (thin: read req, call service, send response) → service (business logic, transactions, emits events) → response helper. Errors thrown as AppError → central error handler.
   - Frontend data flow: features/<module>/api.js (axios calls) → features/<module>/hooks.js (TanStack Query useQuery/useMutation with query keys) → pages/components. Global auth context from GET /auth/me. Route guards by role.
   - Auth flow: login → JWT in httpOnly cookie "sp_token" (8h) → /auth/me on app load → role-based redirect to that role's home.
   - Event bus: server/src/core/events.js (Node EventEmitter wrapper); services emit AFTER the DB transaction commits; listeners live in the owning module's listeners.js and are registered at boot. List all events (see API_CONTRACTS).
   - Environment: .env.example for client (VITE_API_URL) and server (DATABASE_URL, JWT_SECRET, CLIENT_URL, PORT=5000, UPLOAD_DIR, NODE_ENV). Dev ports: client 5173, server 5000.

5. RULES.md (coding standards)
   - Naming: camelCase variables/functions, PascalCase components, kebab-case non-component files, UPPER_SNAKE enums, plural REST resources.
   - Backend module shape (every module): <name>.routes.js, <name>.controller.js, <name>.service.js, <name>.validation.js, optional <name>.listeners.js. No Prisma calls in controllers. No business logic in routes.
   - Every service function has a JSDoc header in this exact style:
       /**
        * Confirms an order once enough advance has been paid.
        *
        * Why: BR-05 — work must not start without the advance.
        * Flow: load project + payments → compare with settings.advancePercent → update status in a transaction → emit "project.confirmed".
        * Example:
        *   await confirmProject("prj_123", user)
        *   // → { id: "prj_123", status: "CONFIRMED" }
        * Throws: AppError 409 ADVANCE_NOT_RECEIVED if paid < required.
        */
     Inline comments explain WHY, not what. No commented-out code.
   - All input validated with zod on the server (body, params, query). Client forms mirror the same rules with zod.
   - Errors: throw new AppError(status, CODE, message, details). Never send stack traces in production. Every async route wrapped by asyncHandler.
   - Responses: success { success: true, data, meta? } ; error { success: false, error: { code, message, details? } }. Pagination meta { page, pageSize, total }.
   - Money: Prisma.Decimal for arithmetic, never JS floats. Dates stored UTC, displayed IST.
   - Multi-step writes use prisma.$transaction.
   - Logging with pino; no console.log in committed code.
   - React: function components + hooks; components < 200 lines (split otherwise); no inline style objects; Tailwind via cn(); use design tokens, never raw hex in components; every page handles loading (Skeleton), empty (EmptyState) and error (inline message + retry).
   - Files < 300 lines; functions < 50 lines where reasonable.
   - Git: conventional commits (feat/fix/refactor/docs/chore/test with scope), small commits.

6. MEMORY.md — living project memory. Sections: Current status (one paragraph), Module status table (module | owner | status | notes), In progress, Pending / TODO, Known bugs (ID | module | description | status), Session log (date-time, member, what changed). Fill with the foundation state at the end of this session.

7. DECISIONS.md — ADR-lite (ID, date, decision, why, alternatives). Pre-fill:
   D-01 JWT in httpOnly cookie (not localStorage) for XSS safety.
   D-02 In-process event bus for cross-module side effects (decouples 3 parallel developers).
   D-03 prisma db push during the hackathon; single baseline migration at freeze (avoids parallel migration conflicts).
   D-04 Local disk uploads with random file names (no cloud dependency for the demo).
   D-05 Payments are recorded, not processed (no gateway).
   D-06 Warranty starts at delivery per serial, duration from product.warrantyMonths.
   D-07 A replacement unit inherits the remaining warranty of the unit it replaces.
   D-08 Money as Decimal(12,2).
   D-09 Installation scheduling done by WAREHOUSE_MANAGER; survey approval by SALES_EXECUTIVE (DIRECTOR may also approve); finance screens in DIRECTOR panel; service visits by INSTALLATION_TECHNICIAN. (Defaults chosen by the team — roles unchanged.)

8. TESTING.md — manual test checklist per role (checkboxes), the full end-to-end demo flow as a test case, edge cases (duplicate phone, quote before survey approval, confirm without advance, scanning a wrong/duplicate/already-dispatched serial, completing install without signature, ticket on expired warranty, customer viewing another customer's data → 403), API smoke script (server/scripts/smoke.js) description, and which services have node --test unit tests (warranty dates, profit calc, dispatch validation, advance check).

9. SECURITY.md — bcrypt (10 rounds); JWT httpOnly + sameSite=lax + secure in prod; helmet; CORS allow-list from CLIENT_URL with credentials; rate limits on /auth/login and /public/enquiries; zod on every input; Prisma only (no raw SQL string building); RBAC on every route + ownership checks (customer sees only own records; technicians only assigned jobs/surveys); upload whitelist (jpg/png/webp/pdf, 5 MB, random names, served read-only); no secrets committed; password rules (min 8, letter+number); audit log for sensitive actions (role change, price/discount change, serial override, payment, ticket billing decision); generic login error message; account deactivation instead of deletion.

10. DATABASE.md — ER overview (text diagram), purpose of every model, every enum with meaning, relations, indexes and why, money/time conventions, soft-delete convention (isActive), how to run db push/seed/reset, table of seed accounts.

11. API_CONTRACTS.md — conventions (base /api/v1, response shapes, pagination ?page&pageSize, search ?q, auth cookie), then EVERY endpoint below with method, path, roles allowed, owner member, request body fields, response summary. Then the EVENTS table with payload and listeners. Teammates code against this file, so it must be complete.

12. FEATURE_NOTES.md — "How each backend feature works" for beginners. Template per feature: What it does · Who uses it · Files · Flow (numbered) · Example request + example response (JSON) · Business rules applied · Common errors. Fill it for auth, RBAC, uploads, notifications, event bus. Teammates add their features later.

13. ASSETS.md — image credit table (file, photographer, source URL, license) — leave rows for images the team adds.

==================================================
STEP 2 — REPO SCAFFOLD
==================================================
/client
  src/app (App.jsx, providers.jsx — QueryClient, AuthProvider, Toaster)
  src/routes (AppRoutes.jsx, ProtectedRoute.jsx, RoleRoute.jsx, roleHome.js)
  src/config/navigation (superAdmin.js, director.js, sales.js, survey.js, customer.js, warehouse.js, installation.js, support.js)
  src/components/ui (UI kit from DESIGN.md)
  src/components/layout (PublicLayout, AuthLayout, AppLayout, FieldLayout, Sidebar, Topbar, NotificationBell, UserMenu, BottomTabBar)
  src/features/<module>/ (pages/, components/, api.js, hooks.js) — create empty module folders for: auth, admin, director, finance, reports, sales, survey, quotes, customer-portal, public-site, inventory, dispatch, installation, support, notifications
  src/lib (api.js axios instance, queryClient.js, format.js, cn.js, constants.js with all enums + status labels + badge colors)
  src/assets/images (keep folder + .gitkeep)
  src/styles (index.css with tokens and font imports)
/server
  prisma/schema.prisma, prisma/seed.js
  src/app.js, src/server.js, src/routes.js (mounts every module router)
  src/config (env.js validated with zod)
  src/core (prisma.js, events.js, logger.js, AppError.js, asyncHandler.js, response.js, pagination.js, audit.js, notify.js, upload.js, pdf.js)
  src/middlewares (requireAuth.js, requireRole.js, validate.js, errorHandler.js, notFound.js, rateLimits.js)
  src/modules/<module>/ — create folders for: auth, users, settings, kit-templates, audit, notifications, reports, invoices, subsidies, payouts, expenses (Member A); public, leads, surveys, quotes, projects, payments, customers, me (Member B); products, inventory, purchases, serials, dispatches, warranties, installations, tickets, support (Member C). Each gets a router file that mounts and returns 501 NOT_IMPLEMENTED with code "NOT_IMPLEMENTED" so routes exist from day one.
  src/jobs (cron jobs folder)
  uploads/ (gitignored)
  tests/
/docs (Step 1)
root: package.json (scripts), .gitignore, .editorconfig, .prettierrc, eslint config for client and server, README.md (setup in 5 commands, demo accounts, links to docs).

==================================================
STEP 3 — PRISMA SCHEMA (the whole system, now)
==================================================
Use cuid ids, createdAt/updatedAt on every model, @@index on foreign keys and search fields. Models and key fields:

User: name, email (unique), phone (unique, nullable for staff), passwordHash, role (Role enum), isActive, hourlyRate Decimal? (technicians), lastLoginAt.
Customer: userId? (unique, link to CUSTOMER user), name, phone (indexed), altPhone, email, addressLine, city, state, pincode, customerType (RESIDENTIAL | COMMERCIAL), notes.
Lead: code (ENQ-2026-0001, unique), customerId?, name, phone (indexed), email, address, city, pincode, source (WEB_FORM | WHATSAPP | PHONE_CALL | WALK_IN | REFERRAL), requestedSystemType (ON_GRID | OFF_GRID | NOT_SURE), requestedCapacityKw Decimal?, wantsSubsidy Bool, status (LeadStatus), assignedToId?, duplicateOfId?, firstContactedAt?, lostReason?, roofAreaSqft?, monthlyBillInr?, gridConnectionOk Bool?, sanctionedLoadKw?, qualificationNotes.
LeadActivity: leadId, userId, type (CALL | NOTE | STATUS_CHANGE | WHATSAPP | VISIT), message, createdAt.
Survey: leadId, technicianId, scheduledAt, status (SurveyStatus), roofType (RCC | METAL_SHEET | TILED | OTHER), shadowFreeAreaSqft, roofDirection (N|NE|E|SE|S|SW|W|NW), tiltDegrees, cableDistanceMeters, structureHeightFt, earthingPointAvailable Bool, recommendedCapacityKw, recommendedSystemType, notes, submittedAt, reviewedById, reviewedAt, rejectionReason.
Attachment: entityType (SURVEY | INSTALLATION | TICKET | SUBSIDY | PURCHASE | PROJECT), entityId, fileUrl, fileName, mimeType, sizeBytes, kind (PHOTO | DOCUMENT | SIGNATURE), uploadedById.
ProductCategory enum: PANEL | INVERTER | BATTERY | CHARGE_CONTROLLER | MOUNTING_STRUCTURE | DC_BOX | AC_BOX | CABLE | EARTHING | CONNECTOR | ACCESSORY | SERVICE.
Product: sku (unique), name, category, brand, specs (Json), unit (PCS | METER | SET | HOUR), isSerialized Bool, warrantyMonths Int, costPrice Decimal, sellPrice Decimal, taxPercent Decimal, reorderLevel Int, stockQty Int (for non-serialized), isActive.
KitTemplate: name ("3 kW On-Grid"), systemType, capacityKw, description, basePrice Decimal, isActive. KitTemplateItem: kitTemplateId, productId, quantity, notes.
Quote: number (QT-2026-0001), leadId, customerId, kitTemplateId?, status (QuoteStatus), systemType, capacityKw, subtotal, discount, taxTotal, total, validUntil, notes, sentAt, acceptedAt, acceptedById, createdById. QuoteItem: quoteId, productId, description, quantity, unitPrice, taxPercent, lineTotal.
Project: code (PRJ-2026-0001), customerId, quoteId (unique), status (ProjectStatus), systemType, capacityKw, siteAddress, confirmedAt, deliveredAt, installedAt, closedAt, subsidyEligible Bool.
Payment: projectId?, invoiceId?, customerId, amount, type (ADVANCE | PARTIAL | FINAL | SERVICE), mode (UPI | BANK_TRANSFER | CASH | CHEQUE | CARD), reference, receivedAt, recordedById.
Supplier: name, phone, gstin. Purchase: number, supplierId, invoiceRef, purchasedAt, total, createdById. PurchaseItem: purchaseId, productId, quantity, unitCost.
SerialUnit: serialNumber (unique), productId, purchaseItemId?, unitCost Decimal, status (SerialStatus), projectId?, dispatchId?, replacedById?, notes.
Dispatch: number (DSP-2026-0001), projectId (unique), status (DispatchStatus), packedById, vehicleNo, driverName, driverPhone, dispatchedAt, deliveredAt, receivedByName. DispatchLine: dispatchId, productId, requiredQty, scannedQty (serialized) / packedQty (non-serialized).
Warranty: serialUnitId (unique), customerId, projectId, startDate, endDate, status computed in service (ACTIVE | EXPIRED | VOID), voidReason.
InstallationJob: projectId (unique), status (InstallationStatus), scheduledDate, scheduledById, startedAt, finishedAt, confirmedCapacityKw, generationTestKw, checklist Json, customerSignatureUrl, signedByName, signedAt, remarks. InstallationCrew: jobId, technicianId, isLead.
TimeLog: technicianId, entityType (SURVEY | INSTALLATION | TICKET), entityId, startedAt, endedAt, minutes, approved Bool.
Ticket: number (TKT-2026-0001), customerId, projectId?, serialUnitId?, source (PHONE | PORTAL | WHATSAPP | EMAIL), category (NO_POWER | LOW_GENERATION | INVERTER_FAULT | BATTERY_ISSUE | PHYSICAL_DAMAGE | OTHER), faultCode, description, priority (LOW | MEDIUM | HIGH | CRITICAL), status (TicketStatus), isUnderWarranty Bool?, isChargeable Bool?, assignedToId?, createdById, resolvedAt, customerConfirmedAt, confirmationNote. TicketActivity: ticketId, userId, type, message. TicketPart: ticketId, productId, quantity, unitPrice, unitCost, oldSerialId?, newSerialId?, labourHours Decimal?
Invoice: number (INV-2026-0001), customerId, projectId?, ticketId?, type (PROFORMA | TAX | SERVICE), status (InvoiceStatus), issueDate, dueDate, subtotal, taxTotal, total, amountPaid. InvoiceLine: invoiceId, description, quantity, unitPrice, taxPercent, lineTotal.
SubsidyApplication: projectId (unique), scheme (text), status (SubsidyStatus), applicationRef, appliedAt, inspectionAt, approvedAt, disbursedAt, amountExpected Decimal?, amountReceived Decimal?, remarks.
Expense: projectId?, ticketId?, category (TRANSPORT | LABOUR_EXTRA | CIVIL_WORK | MISC), amount, description, spentAt, createdById.
Payout: technicianId, periodStart, periodEnd, totalMinutes, hourlyRate, incentive, amount, status (DRAFT | APPROVED | PAID), paidAt.
Setting: key (unique), value Json — keys: company (name, gstin, address, phone, email), advancePercent (30), defaultTaxPercent, labourRatePerHour, serviceVisitCharge, quoteValidityDays (15), surveySlaHours, warrantyExpiryAlertDays (30).
Notification: userId, title, body, link, isRead, createdAt.
AuditLog: userId, action, entityType, entityId, before Json?, after Json?, ip, createdAt.
ShareLink: token (unique), type (DIRECTOR_REPORT), params Json, expiresAt, createdById.
Counter: key (unique), value — used for human-readable codes (ENQ/QT/PRJ/DSP/TKT/INV) generated inside transactions.

Enums:
Role (8 above).
LeadStatus: NEW, CONTACTED, QUALIFIED, NOT_QUALIFIED, SURVEY_SCHEDULED, SURVEY_DONE, SURVEY_APPROVED, SURVEY_REJECTED, QUOTED, WON, LOST.
SurveyStatus: SCHEDULED, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED, CANCELLED.
QuoteStatus: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED.
ProjectStatus: AWAITING_ADVANCE, CONFIRMED, PACKING, DISPATCHED, DELIVERED, INSTALLATION_SCHEDULED, INSTALLING, INSTALLED, CLOSED, CANCELLED.
SerialStatus: IN_STOCK, RESERVED, DISPATCHED, DELIVERED, UNDER_REPAIR, REPLACED, RETURNED, SCRAPPED.
DispatchStatus: PENDING, PACKING, READY, DISPATCHED, DELIVERED.
InstallationStatus: UNSCHEDULED, SCHEDULED, IN_PROGRESS, COMPLETED.
TicketStatus: OPEN, ASSIGNED, IN_PROGRESS, AWAITING_PARTS, RESOLVED, CLOSED, REOPENED.
InvoiceStatus: DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED.
SubsidyStatus: NOT_STARTED, DOCUMENTS_PENDING, APPLIED, INSPECTION_DONE, APPROVED, DISBURSED, REJECTED.
Copy every enum + label + badge color into client/src/lib/constants.js.

==================================================
ENDPOINT + EVENT LIST (write all of this into docs/API_CONTRACTS.md)
==================================================
Base /api/v1. "own" = ownership-scoped (customer sees only own records, technician only assigned work).

MEMBER A
auth: POST /auth/login · POST /auth/logout · GET /auth/me · POST /auth/register (public, customer) · POST /auth/change-password
users (SUPER_ADMIN): GET /users · POST /users · PATCH /users/:id · PATCH /users/:id/status · POST /users/:id/reset-password · GET /users/technicians?type=survey|installation (also SALES_EXECUTIVE, WAREHOUSE_MANAGER, SUPPORT_EXECUTIVE)
settings: GET /settings (all staff) · PUT /settings (SUPER_ADMIN)
kit-templates: GET /kit-templates (staff + public active list via /public/packages) · GET /kit-templates/:id · POST · PATCH /:id · PUT /:id/items (SUPER_ADMIN)
audit: GET /audit-logs (SUPER_ADMIN, DIRECTOR)
notifications: GET /notifications · GET /notifications/unread-count · PATCH /notifications/:id/read · PATCH /notifications/read-all (all, own)
invoices (DIRECTOR, SUPER_ADMIN; CUSTOMER own read; SALES read): GET /invoices · GET /invoices/:id · POST /invoices · PATCH /invoices/:id/status · GET /invoices/:id/pdf
subsidies (DIRECTOR, SALES_EXECUTIVE): GET /subsidies · GET /subsidies/:id · PATCH /subsidies/:id · POST /subsidies/:id/documents
expenses (DIRECTOR, WAREHOUSE_MANAGER, SUPPORT_EXECUTIVE create): GET /expenses · POST /expenses
payouts (DIRECTOR): GET /payouts?month= · POST /payouts/generate · PATCH /payouts/:id/approve · PATCH /payouts/:id/mark-paid
reports (DIRECTOR, SUPER_ADMIN): GET /reports/overview?range=today|week|month|custom&from&to · GET /reports/profitability · GET /reports/profitability/:projectId · GET /reports/pipeline · GET /reports/unfinished · GET /reports/service · GET /reports/export?type=csv|pdf&report= · POST /reports/share → { url, expiresAt } · GET /public/reports/:token
search: GET /search?q= (staff; customers, projects, serials, tickets, leads scoped by role)

MEMBER B
public: GET /public/packages · POST /public/enquiries (rate limited) → { code } · GET /public/stats (projects completed, kW installed)
leads (SALES_EXECUTIVE, DIRECTOR): GET /leads?status&source&assignedTo&overdue&q · POST /leads · GET /leads/:id · PATCH /leads/:id · POST /leads/:id/activities · POST /leads/:id/qualify · POST /leads/:id/assign · POST /leads/:id/mark-lost
surveys: POST /surveys (SALES) · GET /surveys (SALES all; SURVEY_TECHNICIAN own) · GET /surveys/:id · POST /surveys/:id/start (tech) · PUT /surveys/:id/report (tech, multipart photos) · POST /surveys/:id/approve · POST /surveys/:id/reject (SALES, DIRECTOR) · PATCH /surveys/:id/reschedule
quotes: POST /quotes {leadId, kitTemplateId} · GET /quotes · GET /quotes/:id · PATCH /quotes/:id (DRAFT only) · PUT /quotes/:id/items · POST /quotes/:id/send · POST /quotes/:id/accept (SALES or CUSTOMER own) · POST /quotes/:id/reject · GET /quotes/:id/pdf
projects: POST /projects {quoteId} · GET /projects?status · GET /projects/:id (timeline across all modules) · POST /projects/:id/confirm · POST /projects/:id/cancel  (read: all staff roles; CUSTOMER own)
payments (SALES_EXECUTIVE, DIRECTOR): POST /payments · GET /payments?projectId&customerId
customers (staff): GET /customers?q · GET /customers/:id · PATCH /customers/:id
me (CUSTOMER): GET /me/overview · GET /me/projects · GET /me/projects/:id · GET /me/quotes · GET /me/payments · GET /me/invoices (uses invoices service) · GET /me/systems (uses warranties service)

MEMBER C
products (WAREHOUSE_MANAGER write; staff read): GET /products?category&q · POST /products · PATCH /products/:id · PATCH /products/:id/status
inventory: GET /inventory/summary · GET /inventory/low-stock · POST /inventory/adjust (WAREHOUSE_MANAGER, audited)
purchases (WAREHOUSE_MANAGER, DIRECTOR read): GET /purchases · POST /purchases (items + serial numbers for serialized products) · GET /purchases/:id · GET /suppliers · POST /suppliers
serials (staff): GET /serials?q&status&productId · GET /serials/:serialNumber (full history timeline)
dispatches (WAREHOUSE_MANAGER): GET /dispatches?status · GET /dispatches/:id · POST /dispatches/:id/start-packing · POST /dispatches/:id/scan {serialNumber} · DELETE /dispatches/:id/scan/:serialNumber · POST /dispatches/:id/pack-line {lineId, qty} · POST /dispatches/:id/dispatch {vehicleNo, driverName, driverPhone} · POST /dispatches/:id/deliver {deliveredAt, receivedByName} · GET /dispatches/:id/packing-slip (pdf)
warranties: GET /warranties?q&status&expiringInDays (staff) · GET /warranties/serial/:serialNumber
installations: GET /installations?status&from&to (WAREHOUSE_MANAGER, DIRECTOR) · PATCH /installations/:id/schedule {scheduledDate, crew:[{technicianId,isLead}]} · GET /installations/my (INSTALLATION_TECHNICIAN own) · GET /installations/:id · POST /installations/:id/start · POST /installations/:id/photos (multipart) · POST /installations/:id/complete {finishedAt, confirmedCapacityKw, generationTestKw, checklist, signatureDataUrl, signedByName}
support (SUPPORT_EXECUTIVE): GET /support/lookup?q= (phone, name, serial, project code) → customers + systems + warranty status
tickets: GET /tickets (SUPPORT all; INSTALLATION_TECHNICIAN own assigned; CUSTOMER own) · POST /tickets (SUPPORT or CUSTOMER own) · GET /tickets/:id · PATCH /tickets/:id/assign · POST /tickets/:id/activities · POST /tickets/:id/visit {diagnosis, parts:[...], labourHours, replacementSerials} · POST /tickets/:id/resolve · POST /tickets/:id/confirm (CUSTOMER own or SUPPORT with note) · POST /tickets/:id/reopen

EVENTS (emitted after commit; listeners live in the owning module's listeners.js)
lead.created {leadId} → notify SALES (B)
survey.submitted {surveyId} → notify assigned sales (B)
survey.approved {surveyId, leadId} → notify sales (B)
quote.sent {quoteId} → create customer login if missing + notify customer (B)
quote.accepted {quoteId} → create project AWAITING_ADVANCE (B)
payment.recorded {paymentId, projectId, invoiceId} → update invoice amountPaid/status (A)
project.confirmed {projectId} → create Dispatch + DispatchLines from quote items and reserve stock (C); create UNSCHEDULED InstallationJob (C); create PROFORMA invoice (A); create SubsidyApplication if subsidyEligible (A); notify warehouse (C)
dispatch.dispatched {dispatchId, projectId} → project DISPATCHED, notify customer (C)
dispatch.delivered {dispatchId, projectId} → warranties created in same transaction (C); notify installation crew (C)
installation.scheduled {jobId} → notify crew + customer (C)
installation.completed {jobId, projectId} → project INSTALLED (C); TAX invoice for balance (A); notify customer + director (A)
ticket.created {ticketId} → notify SUPPORT (C)
ticket.billable {ticketId, lines} → create SERVICE invoice (A)
ticket.resolved {ticketId} → notify customer to confirm (C)
ticket.closed {ticketId} → book warranty cost if free (A)
