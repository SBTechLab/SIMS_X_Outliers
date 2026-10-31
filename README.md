# SunPower SIMS — Solar Installation Management System

> Enterprise-grade solar project lifecycle & service management platform built for **SunPower Solutions** (Hyderabad, India). Designed for 40+ rooftop projects/month, 15 field technicians, and complete traceability from initial rooftop inquiry to 25-year panel warranty tracking.

---

## 1. Quick Start (Setup in 5 Commands)

```bash
# 1. Clone the repository
git clone <repo-url> && cd SIMS_X_Outliers

# 2. Configure environment (copy .env files)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Install dependencies & initialize database (schema push + seed data)
npm run setup

# 4. Run tests
npm test

# 5. Start both development servers (Client :5173, Server :5000)
npm run dev
```

---

## 2. Seed Demo Accounts

All accounts use the universal password: **`Demo@1234`**

| Role | Sign In Credential | Name / Focus |
|---|---|---|
| **SUPER_ADMIN** | `admin@sunpower.in` | Devendra S. (Users, settings, BOM kit templates, audit log) |
| **DIRECTOR** | `director@sunpower.in` | Ananya Rao (Gross margin, project profit, cash flow, subsidies) |
| **SALES_EXECUTIVE** | `sales1@sunpower.in` | Rajesh Varma (Enquiries, qualifications, survey approval, quotes) |
| **SALES_EXECUTIVE** | `sales2@sunpower.in` | Sneha Reddy (Pipeline, customer follow-up, advance payments) |
| **SURVEY_TECHNICIAN** | `survey1@sunpower.in` | Karthik N. (Mobile roof survey: measurements, shadow, cable runs) |
| **SURVEY_TECHNICIAN** | `survey2@sunpower.in` | Praveen K. (Field survey assessments) |
| **WAREHOUSE_MANAGER** | `warehouse@sunpower.in` | Venkat Raman (Stock, procurement, serial scanning, dispatch) |
| **INSTALLATION_TECHNICIAN** | `install1@sunpower.in` | Suresh Babu (Lead technician: crew checklist, 3 photos, signature) |
| **INSTALLATION_TECHNICIAN** | `install2@sunpower.in` | Mahesh G. (Installation & service visits) |
| **SUPPORT_EXECUTIVE** | `support@sunpower.in` | Kavitha M. (Serial/phone lookup, warranty check, repair tickets) |
| **CUSTOMER** | `9848012345` | Vipul Mehta (Customer portal: quotes, system warranties, payments) |
| **CUSTOMER** | `9848023456` | Sunitha Reddy (Active rooftop installation) |

*Full account list and phone logins documented in [DATABASE.md](docs/DATABASE.md).*

---

## 3. Team Ownership & Responsibilities

| Member | Primary Modules | Roles Owned |
|---|---|---|
| **Member A** | Platform, Auth, Settings, Users, Kit Templates, Audit, Invoices, Subsidies, Payouts, Reports | `SUPER_ADMIN`, `DIRECTOR` |
| **Member B** | Public Site, Leads & CRM, Roof Surveys, Quotes & BOM, Projects, Payments, Customer Portal | `SALES_EXECUTIVE`, `SURVEY_TECHNICIAN`, `CUSTOMER` |
| **Member C** | Products, Inventory, Procurement, Serials, Dispatches, Warranties, Installations, Support Tickets | `WAREHOUSE_MANAGER`, `INSTALLATION_TECHNICIAN`, `SUPPORT_EXECUTIVE` |

---

## 4. Architectural Highlights

- **Frontend**: React 18 (Vite, JS), Tailwind CSS, React Router v6, TanStack Query, react-hook-form + zod, framer-motion, lucide-react, sonner toasts.
- **Backend**: Node.js 20+ Express (ESM), Prisma ORM, PostgreSQL, Zod validation, JWT in `httpOnly` cookie (`sp_token`), rate-limit, helmet, pdfkit.
- **Event-Driven Decoupling**: In-process EventBus (`server/src/core/events.js`) cleanly isolates cross-module triggers (`project.confirmed`, `dispatch.delivered`, `installation.completed`, `ticket.billable`).
- **Audit & Compliance**: Immutable audit trail (`AuditLog`) for sensitive events (BR-18).
- **Sequential Human Identifiers**: Atomic `Counter` generation (`nextCode`) for gap-free human-friendly codes (`ENQ-2026-0001`, `PRJ-2026-0001`, `INV-2026-0001`).

---

## 5. Documentation Index

- [PRD.md](docs/PRD.md) — Product requirements, 5 core problem scenes, state machines, business rules BR-01 to BR-20.
- [AGENTS.md](docs/AGENTS.md) — Multi-agent workflow rules, shared file protocols, coding standards.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Request lifecycle, data flows, event system, and directory structure.
- [DESIGN.md](docs/DESIGN.md) — Design tokens, typography (Manrope/Fraunces), components catalog, UI guidelines.
- [DATABASE.md](docs/DATABASE.md) — Entity-relationship diagram, 36 models, enums, indexing strategy, seed accounts.
- [API_CONTRACTS.md](docs/API_CONTRACTS.md) — REST endpoint specifications, request/response formats, event payloads.
- [SECURITY.md](docs/SECURITY.md) — Authentication, RBAC, ownership guards, rate limiting, and input sanitization.
- [TESTING.md](docs/TESTING.md) — Test suites, edge cases, role-by-role test checklists.
- [MEMORY.md](docs/MEMORY.md) — Project living memory, module progress, and session log.
- [FEATURE_NOTES.md](docs/FEATURE_NOTES.md) — Detailed feature execution guide with sample requests and responses.

