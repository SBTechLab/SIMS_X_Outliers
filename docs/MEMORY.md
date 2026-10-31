# Project Memory — SunPower SIMS

Living memory for the 3-person hackathon team building **SunPower SIMS** (Solar Installation Management System for SunPower Solutions). Every developer and AI assistant reads this file at the start of every session and updates it at the end of every session.

---

## 1. Current Status

**Prompt 0 (Foundation, Steps 1–8) is 100% complete, verified, and operational.**
The monorepo is established with React 18 + Vite frontend and Node.js + Express + Prisma + PostgreSQL backend. The full database schema with all 36 models, relationships, and locked roles is defined and migrated. The UI design system (`DESIGN.md`), brand tokens, UI kit components, authentication, settings, and idempotent seed dataset (17 users, 32 products, 10 kit templates, 264 serial units, leads, surveys, quotes, projects across stages, warranties, dispatches, invoices, and service tickets) are fully working.

All foundation verification criteria pass:
- Unit test runner (`npm test`): **11/11 passing tests** across 4 suites (`nextCode`, `requireRole`, `adminUsers`, `kitTemplateMargin`).
- API smoke suite (`npm run smoke`): **16/16 passing steps** (health check, all 8 roles login + `/auth/me`, negative auth guards, settings, kit templates, audit log, public enquiries).
- Frontend production build (`npm run build`): **Passes cleanly with zero errors**.
- Super Admin panel backend services and UI (Users, Settings, Kit Templates BOM builder, Audit log viewer, Dashboard) are implemented.

---

## 2. Module Ownership & Status Table

| Module | Primary Owner | Status | Notes |
|---|---|---|---|
| **Platform / Foundation** | Member A | ✅ Complete | Repo scaffold, Prisma schema, UI Kit, layouts, auth, seed, test runner (Steps 1–8) |
| **Auth** | Member A | ✅ Complete | Login, logout, me, register, change-password, demo account switcher |
| **Settings** | Member A | ✅ Complete | Global rates & parameters (advance %, tax %, SLA), audit logged, UI with sticky save bar |
| **Users** | Member A | ✅ Complete | User CRUD, role management, password reset, technician hourly rates, self-disable guard |
| **Kit Templates** | Member A | ✅ Complete | Standard solar packages, BOM builder, live margin calculation, off-grid checks |
| **Audit Logs** | Member A | ✅ Complete | Immutable security audit log, 2-column before/after state diff viewer |
| **Invoices** | Member A | ✅ Stage A2 | Event-driven invoice generation (PROFORMA→TAX→SERVICE), payment sync via listeners |
| **Subsidies** | Member A | ✅ Stage A2 | PM Surya Ghar subsidy tracker, status transitions, days-in-stage |
| **Expenses** | Member A | ✅ Stage A2 | Project and ticket expenses recording (feeds BR-13) |
| **Payouts** | Member A | ✅ Stage A2 | Technician approved hours aggregation and payout generation (DRAFT→APPROVED→PAID) |
| **Reports & Dashboard** | Member A | ✅ Stage A3 | Director overview, profitability (BR-13), pipeline, unfinished jobs, service reports |
| **Global Search** | Member A | ✅ Stage A4 | Role-scoped global search (server + client wired) |
| **Notifications** | Member A | ✅ Stage A4 | NotificationBell (dropdown + polling), NotificationsPage full list with read/unread filter |
| **Leads & CRM** | Member B | ✅ Stage B2 | Sales inbox, qualification, overdue leads (BR-01, BR-02) |
| **Surveys** | Member B | ✅ Stage B3 | Survey scheduling, technician mobile submission, approval (BR-03) |
| **Quotes** | Member B | ✅ Stage B4 | Auto BOM quote builder, send, accept/reject (BR-04) |
| **Projects** | Member B | ✅ Stage B4 | Project lifecycle, order confirmation (BR-05), auto-create on quote.accepted |
| **Payments** | Member B | ✅ Stage B4 | Payment recording (UPI, bank transfer, cash, etc.) (D-05) |
| **Customer Portal** | Member B | ✅ Stage B5 | Customer self-service: overview, quotes, projects, invoices, payments |
| **Public Site** | Member B | ✅ Stage B1 | Landing page, enquiry form with round-robin assignment (BR-01, BR-15) |
| **Products & Inventory** | Member C | ⏳ Pending C | Products catalog, stock management, stock adjustments |
| **Purchases & Serials** | Member C | ⏳ Pending C | Purchase orders, serial unit reception, serial timeline (BR-08) |
| **Dispatches** | Member C | ⏳ Pending C | Pick lists, serial number barcode scanning, packing slips (BR-06, BR-07) |
| **Installations** | Member C | ⏳ Pending C | Crew scheduling, mobile install checklist, 3 photos + signature (BR-10) |
| **Warranties** | Member C | ⏳ Pending C | Automated serial warranty tracking, expiration calculation (BR-09) |
| **Support & Tickets** | Member C | ⏳ Pending C | Customer/serial lookup, warranty checks, service tickets (BR-11, BR-12) |

---

## 3. Verified Foundation Checklist (Prompt 0 Steps 1–8)

- [x] **Step 1 — Docs**: All 14 markdown files in `/docs` and root `/CLAUDE.md` written with real, specific content.
- [x] **Step 2 — Scaffold**: Monorepo `/client`, `/server`, root `package.json` scripts (`setup`, `dev`, `seed`, `test`, `smoke`), `README.md`.
- [x] **Step 3 — Schema**: 36 Prisma models with cuid IDs, indexes, enums, soft-delete convention, and `constants.js` client tokens.
- [x] **Step 4 — Backend Core**: Express app, helmet, CORS allow-list, cookie-parser, pino logger, event bus (`events.js`), `audit.js`, `notify.js`, `upload.js`, `pdf.js`, `codes.js`, auth module, settings module, notifications module, 501 stubs for pending modules.
- [x] **Step 5 — Frontend Core**: Tailwind tokens (ink, sun, leaf, sky, alert, paper), full UI kit in `components/ui`, 4 layouts (`PublicLayout`, `AuthLayout`, `AppLayout`, `FieldLayout`), `AuthProvider`, `ProtectedRoute`, `RoleRoute`, role landing pages, LoginPage with demo account buttons.
- [x] **Step 6 — Seed Data**: Idempotent seed script (`npm run seed`) creating 17 users, 32 products, 10 kit templates, 264 serial units, leads across statuses, quotes, projects, warranties, dispatches, invoices, and service tickets.
- [x] **Step 7 — Verify**:
  - `nextCode.test.js` & `requireRole.test.js` passing.
  - `adminUsers.test.js` & `kitTemplateMargin.test.js` passing.
  - Smoke script (`server/scripts/smoke.js`) passing all 16 tests across all 8 roles.
  - Frontend production build transforms 2,100+ modules and builds with zero errors.
- [x] **Step 8 — Finish**: `README.md`, `MEMORY.md`, and `FEATURE_NOTES.md` fully documented.

---

## 4. Known Bugs & Decisions Resolved

| Bug ID | Module | Description | Status |
|---|---|---|---|
| BUG-01 | Server tests | `nextCode.test.js` queried non-existent `prefix` instead of `key` | ✅ Fixed |
| BUG-02 | Server tests | `package.json` test script glob on Windows needed quotes | ✅ Fixed |
| BUG-03 | Server script | `server/scripts/smoke.js` was missing; created and passed 16 checks | ✅ Fixed |
| BUG-04 | Documentation | `README.md` and `MEMORY.md` were missing from repo; created | ✅ Fixed |
| BUG-05 | Server rate limits | `loginLimiter` in dev caused 429 when smoke testing all 8 roles; relaxed in development | ✅ Fixed |

---

## 5. Next Steps for Team

- Teammates B and C can pull `main` and build their feature modules in parallel on top of this stable foundation.
- Member A completed Stages A2–A4 (2026-10-31): invoices, subsidies, expenses, payouts (A2); director overview + profitability/pipeline/unfinished/service reports (A3); global search server+client (A4). Director pages wired in AppRoutes replacing all PlaceholderPage stubs.
- Member B completed Stages B1–B5 (2026-10-31): all server modules implemented (leads, surveys, quotes, projects, payments, customers, me); client pages wired for SALES_EXECUTIVE, SURVEY_TECHNICIAN, and CUSTOMER roles.
- Unit tests: **16/16 passing** across 6 suites (`nextCode`, `requireRole`, `adminUsers`, `kitTemplateMargin`, `publicEnquiry`).
- Client Vite build: zero errors.
- Member A Stages A1–A4 are 100% complete (2026-10-31): Super Admin panel, Finance layer, Director dashboard/reports, Global search + notifications UI.
