# ARCHITECTURE.md

How the system is put together: the runtime picture, the folder tree, the request lifecycle, the
frontend data flow, the auth flow, the event bus and the environment.

---

## 1. Runtime diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BROWSER — React 18 + Vite  (dev :5173)                                      │
│                                                                              │
│  pages/components                                                            │
│      │  useQuery / useMutation                                               │
│      ▼                                                                       │
│  features/<module>/hooks.js      ── TanStack Query cache, query keys          │
│      │                                                                       │
│      ▼                                                                       │
│  features/<module>/api.js        ── thin axios calls                          │
│      │                                                                       │
│      ▼                                                                       │
│  lib/api.js   axios instance  { baseURL: VITE_API_URL, withCredentials: true }│
└──────────────────────────────────────────┬───────────────────────────────────┘
                                           │  HTTP + Cookie: sp_token (httpOnly)
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  EXPRESS  (dev :5000)   base path  /api/v1                                    │
│                                                                              │
│  helmet → cors(allow-list, credentials) → cookieParser → json → pino-http    │
│      │                                                                       │
│      ▼  rateLimits (login, public enquiries)                                  │
│      │                                                                       │
│      ▼  src/routes.js   mounts every module router                            │
│      │                                                                       │
│      ├─ requireAuth        verify JWT from cookie → req.user                  │
│      ├─ requireRole(...)   role gate (RBAC)                                   │
│      ├─ validate(schema)   zod on body / params / query                        │
│      │                                                                       │
│      ▼  <module>.controller.js      thin: read req → call service → respond    │
│      │                                                                       │
│      ▼  <module>.service.js         business logic, transactions, emits events │
│      │        │                                                              │
│      │        ├──► core/events.js  (EventEmitter)  ──► <module>.listeners.js   │
│      │        ├──► core/audit.js   → AuditLog                                 │
│      │        ├──► core/notify.js  → Notification                             │
│      │        ├──► core/pdf.js     (pdfkit)  → quote / invoice / packing slip  │
│      │        └──► core/upload.js  (multer)  → server/uploads/  (static, RO)   │
│      ▼                                                                       │
│  core/prisma.js  (PrismaClient singleton)                                     │
│      │                                                                       │
│      ▼  AppError thrown anywhere → middlewares/errorHandler.js → JSON error    │
│                                                                              │
│  src/jobs/*  node-cron: expire quotes, flag overdue leads, warranty alerts     │
└──────────────────────────────────────────┬───────────────────────────────────┘
                                           │  Prisma
                                           ▼
                            ┌──────────────────────────────┐
                            │  PostgreSQL                   │
                            └──────────────────────────────┘
```

Two long-lived side channels sit beside the request path:

- **`server/uploads/`** — local disk (D-04). `multer` writes random file names; Express serves the
  folder read-only at `/uploads`. Photos, signatures, subsidy documents, purchase invoices.
- **`node-cron` jobs** — registered once at boot in `src/server.js`, never inside a request.

---

## 2. Folder tree

```
SIMS_X_Outliers/
├── CLAUDE.md                        Ten rules + pointer to docs/AGENTS.md
├── package.json                     Root scripts: setup, dev, seed, test
├── .gitignore  .editorconfig  .prettierrc
├── README.md                        Setup in 5 commands, demo accounts, doc links
│
├── docs/                            Single source of truth for 3 people, 3 AI sessions
│   ├── PROBLEM_STATEMENT.md         The brief, as given
│   ├── PRD.md                       Scope, personas, flow, state machines, BR-xx rules
│   ├── AGENTS.md                    Ownership map, shared-file protocol, git rules
│   ├── ARCHITECTURE.md              This file
│   ├── RULES.md                     Coding standards
│   ├── DESIGN.md                    Tokens, components, layouts, anti-AI checklist
│   ├── API_CONTRACTS.md             Every endpoint + every event — the member contract
│   ├── DATABASE.md                  Models, enums, relations, indexes, seed accounts
│   ├── TESTING.md                   Manual checklists, demo test case, edge cases
│   ├── SECURITY.md                  Auth, RBAC, uploads, audit, password rules
│   ├── FEATURE_NOTES.md             How each backend feature works, for beginners
│   ├── DECISIONS.md                 ADR-lite
│   ├── MEMORY.md                    Living state: done / in progress / pending / bugs
│   └── ASSETS.md                    Image credits
│
├── client/                          React 18 + Vite (JavaScript)
│   ├── index.html                   Font links, #root
│   ├── vite.config.js               React plugin, @ alias → src
│   ├── tailwind.config.js           Design tokens → theme
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── .env.example                 VITE_API_URL
│   └── src/
│       ├── main.jsx                 Mounts <App/>
│       ├── app/
│       │   ├── App.jsx              Router + layout switch
│       │   └── providers.jsx        QueryClientProvider, AuthProvider, Toaster
│       ├── routes/
│       │   ├── AppRoutes.jsx        SHARED FILE — all routes, fenced per member
│       │   ├── ProtectedRoute.jsx   Requires a session; else → /login
│       │   ├── RoleRoute.jsx        Requires one of the given roles; else → 403
│       │   └── roleHome.js          Role → landing path after login
│       ├── config/
│       │   └── navigation/          SHARED FOLDER — sidebar items per role
│       │       ├── superAdmin.js  director.js  sales.js  survey.js
│       │       └── customer.js  warehouse.js  installation.js  support.js
│       ├── components/
│       │   ├── ui/                  The UI kit from DESIGN.md (Member A)
│       │   └── layout/              PublicLayout, AuthLayout, AppLayout, FieldLayout,
│       │                            Sidebar, Topbar, NotificationBell, UserMenu, BottomTabBar
│       ├── features/<module>/       One folder per module — the unit of ownership
│       │   ├── pages/               Route-level screens
│       │   ├── components/          Pieces used only by this module
│       │   ├── api.js               axios calls — no React in here
│       │   └── hooks.js             TanStack Query hooks + query keys
│       ├── lib/
│       │   ├── api.js               axios instance + response/error unwrapping
│       │   ├── queryClient.js       QueryClient defaults
│       │   ├── format.js            Money, date, phone, capacity, duration formatters
│       │   ├── cn.js                clsx + tailwind-merge
│       │   ├── motion.js            framer-motion presets, reduced-motion aware
│       │   └── constants.js         Every enum + label + badge colour (mirrors Prisma)
│       ├── assets/images/           Photos only, credited in docs/ASSETS.md
│       └── styles/
│           └── index.css            CSS variables, font imports, Tailwind layers
│
└── server/                          Node 20 + Express (ES modules)
    ├── package.json                 "type": "module"
    ├── eslint.config.js
    ├── .env.example                 DATABASE_URL, JWT_SECRET, CLIENT_URL, PORT, UPLOAD_DIR, NODE_ENV
    ├── prisma/
    │   ├── schema.prisma            SHARED FILE — the whole system's schema
    │   └── seed.js                  Demo accounts, products, kits, a full worked project
    ├── scripts/
    │   └── smoke.js                 End-to-end API smoke run against a seeded DB
    ├── tests/                       node --test — warranty dates, profit, dispatch, advance
    ├── uploads/                     Gitignored. Photos, signatures, documents.
    └── src/
        ├── server.js               Loads env, registers listeners + cron, starts listening
        ├── app.js                  Express app: middleware chain, /api/v1, static, errors
        ├── routes.js               SHARED FILE — mounts every module router, fenced per member
        ├── config/
        │   └── env.js              process.env parsed and validated with zod; fails fast
        ├── core/                   Cross-cutting plumbing (Member A)
        │   ├── prisma.js           PrismaClient singleton
        │   ├── events.js           EventEmitter wrapper: emit / on / emitAfterCommit
        │   ├── logger.js           pino instance
        │   ├── AppError.js         new AppError(status, CODE, message, details)
        │   ├── asyncHandler.js     Wraps async route handlers so throws reach errorHandler
        │   ├── response.js         ok(res, data, meta) / created(res, data)
        │   ├── pagination.js       Parses ?page&pageSize → { skip, take, meta }
        │   ├── codes.js            Counter-backed ENQ/QT/PRJ/DSP/TKT/INV generators (BR-17)
        │   ├── audit.js            writeAudit({ userId, action, entityType, entityId, before, after, ip })
        │   ├── notify.js           notifyUsers(userIds, { title, body, link }) / notifyRole(role, ...)
        │   ├── money.js            Decimal helpers: sum, mul, taxOf, round2
        │   ├── upload.js           multer config: whitelist, 5 MB, random names
        │   └── pdf.js              pdfkit document shell + header/footer from settings
        ├── middlewares/
        │   ├── requireAuth.js      Verifies the sp_token cookie → req.user
        │   ├── requireRole.js      requireRole('DIRECTOR', 'SUPER_ADMIN')
        │   ├── validate.js         validate({ body, params, query }) with zod
        │   ├── errorHandler.js     AppError / ZodError / Prisma error → JSON
        │   ├── notFound.js         Unmatched route → 404 NOT_FOUND
        │   └── rateLimits.js       loginLimiter, publicEnquiryLimiter
        ├── modules/<module>/       The unit of ownership
        │   ├── <name>.routes.js    Router: middleware chain only
        │   ├── <name>.controller.js  Thin: read req, call service, send response
        │   ├── <name>.service.js   Business logic, transactions, emits events
        │   ├── <name>.validation.js  zod schemas
        │   └── <name>.listeners.js   Optional: this module's event subscriptions
        └── jobs/
            ├── index.js            registerJobs() — called once from server.js
            ├── expireQuotes.job.js        Nightly: SENT quotes past validUntil → EXPIRED
            ├── overdueLeads.job.js        Hourly: flag leads uncontacted > 24h (BR-02)
            └── warrantyAlerts.job.js      Daily: notify on warranties expiring in N days
```

### Folder purposes, one line each

| Path | Purpose |
|---|---|
| `docs/` | Every contract three parallel developers need. Code follows docs, not the reverse. |
| `client/src/app/` | App bootstrap: the router shell and the provider stack. |
| `client/src/routes/` | Route table and the two guards (session, role). |
| `client/src/config/navigation/` | Sidebar/tab-bar items per role; no screen hard-codes nav. |
| `client/src/components/ui/` | The shared UI kit from `DESIGN.md`. One implementation each. |
| `client/src/components/layout/` | The four shells and their parts. |
| `client/src/features/<m>/pages/` | Route-level screens for that module. |
| `client/src/features/<m>/components/` | Pieces used only inside that module. |
| `client/src/features/<m>/api.js` | axios calls. No React, no hooks, no formatting. |
| `client/src/features/<m>/hooks.js` | TanStack Query hooks and the module's query keys. |
| `client/src/lib/` | Framework-free helpers shared by every feature. |
| `client/src/styles/` | Tokens and font imports. The only place raw hex is allowed. |
| `server/prisma/` | Schema and seed. Shared file — additive changes only. |
| `server/src/config/` | Validated environment. Fails fast at boot on a missing variable. |
| `server/src/core/` | Plumbing every module imports: prisma, events, errors, money, pdf, upload. |
| `server/src/middlewares/` | The request chain pieces, in the order of section 3. |
| `server/src/modules/<m>/` | One feature area: routes, controller, service, validation, listeners. |
| `server/src/jobs/` | `node-cron` schedules, registered once at boot. |
| `server/tests/` | `node --test` unit tests for the four critical services. |
| `server/scripts/` | Operational scripts (the API smoke run). |
| `server/uploads/` | Gitignored user files, served read-only. |

---

## 3. Request lifecycle

```
POST /api/v1/projects/prj_7xk/confirm        Cookie: sp_token=…
  │
  ├─ 1  helmet                     security headers
  ├─ 2  cors                       origin in CLIENT_URL allow-list, credentials: true
  ├─ 3  cookieParser               reads sp_token
  ├─ 4  express.json({ limit })    body parsed
  ├─ 5  pino-http                  request log with a request id
  ├─ 6  rateLimits                 only on /auth/login and /public/enquiries
  │
  ├─ 7  requireAuth                verify JWT → req.user = { id, role, name, email }
  │                                no/invalid/expired cookie → 401 UNAUTHENTICATED
  │
  ├─ 8  requireRole('SALES_EXECUTIVE', 'DIRECTOR')
  │                                req.user.role not in list → 403 FORBIDDEN
  │
  ├─ 9  validate({ params: idParam, body: confirmSchema })
  │                                ZodError → 422 VALIDATION_ERROR with field details
  │
  ├─ 10 asyncHandler(controller)   projects.controller.js
  │       const project = await confirmProject(req.params.id, req.user);
  │       return ok(res, project);
  │
  ├─ 11 service                    projects.service.js
  │       • load project + quote + payments
  │       • ownership check (BR-16)
  │       • state check: AWAITING_ADVANCE, else 409 INVALID_TRANSITION
  │       • business rule: paid >= total × advancePercent/100, else 409 ADVANCE_NOT_RECEIVED
  │       • prisma.$transaction: update status, writeAudit
  │       • AFTER commit: events.emit('project.confirmed', { projectId })
  │
  ├─ 12 response.js                ok(res, data) → { success: true, data }
  │
  └─ ✗ any throw → errorHandler.js → { success: false, error: { code, message, details? } }
```

**Layer contract**

| Layer | May do | Must not do |
|---|---|---|
| `routes.js` | Compose middleware, point at a controller | Contain any logic |
| `controller` | Read `req`, call one service function, send a response | Touch Prisma, compute anything, build business errors |
| `service` | Business logic, Prisma, transactions, emit events, audit, notify | Touch `req` or `res`, format for display |
| `validation` | zod schemas only | Hit the database |
| `listeners` | React to events, call its own module's services | Be called directly from a controller |

**Errors.** Anything wrong throws `new AppError(status, CODE, message, details)`. `asyncHandler`
forwards it; `errorHandler` renders it. `ZodError` → `422 VALIDATION_ERROR`. Prisma `P2002` →
`409 DUPLICATE`, `P2025` → `404 NOT_FOUND`. In production the stack is logged, never sent.

---

## 4. Frontend data flow

```
features/dispatch/api.js
    export const scanSerial = (dispatchId, serialNumber) =>
      api.post(`/dispatches/${dispatchId}/scan`, { serialNumber });

features/dispatch/hooks.js
    export const dispatchKeys = {
      all: ['dispatches'],
      list: (filters) => ['dispatches', 'list', filters],
      detail: (id) => ['dispatches', 'detail', id],
    };

    export function useScanSerial(dispatchId) {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (serialNumber) => scanSerial(dispatchId, serialNumber),
        onSuccess: () => qc.invalidateQueries({ queryKey: dispatchKeys.detail(dispatchId) }),
        onError: (e) => toast.error(e.message),       // real server message, BR-07/BR-08
      });
    }

features/dispatch/pages/PackingPage.jsx
    const { data, isLoading, isError, refetch } = useDispatch(id);
    const scan = useScanSerial(id);
    if (isLoading) return <Skeleton variant="table" rows={6} />;
    if (isError)   return <ErrorState onRetry={refetch} />;
```

**Rules**

- `api.js` returns `response.data.data` already unwrapped by the axios interceptor, and throws an
  `ApiError` carrying `{ code, message, details }` so UI can branch on the code.
- Query keys are declared once per module as a `<module>Keys` object. Never an inline array literal
  in a component — invalidation across modules depends on it.
- Defaults in `lib/queryClient.js`: `staleTime` 30s, `retry` 1, `refetchOnWindowFocus` false.
  Lists that change under you (dispatch packing, ticket queue) override `staleTime: 0`.
- Mutations invalidate the narrowest key that is now wrong, plus any cross-module key the event bus
  will have changed (confirming a project invalidates `dispatchKeys.all` and `installationKeys.all`).
- **Auth context** lives in `app/providers.jsx`: on app load it calls `GET /auth/me`.
  `{ user, isLoading, login, logout }` comes from `useAuth()`. While `isLoading`, routes render a
  full-shell skeleton — never a redirect, or a refresh would bounce a signed-in user to `/login`.
- **Route guards.** `ProtectedRoute` requires a session. `RoleRoute roles={[...]}` requires a role and
  otherwise renders the 403 screen (not a redirect, so the user understands what happened).
- No global store. Server state lives in TanStack Query; UI state lives in the component;
  session lives in the auth context.

---

## 5. Auth flow

```
POST /api/v1/auth/login { email, password }
   → bcrypt.compare against User.passwordHash
   → reject if !isActive          403 ACCOUNT_DISABLED
   → wrong email OR password      401 INVALID_CREDENTIALS   (one generic message, SECURITY.md)
   → sign JWT { sub: user.id, role: user.role }, expiresIn 8h
   → res.cookie('sp_token', token, {
         httpOnly: true, sameSite: 'lax',
         secure: NODE_ENV === 'production', maxAge: 8h, path: '/' })
   → update lastLoginAt
   → 200 { success: true, data: { user } }        // the token is never in the body (D-01)

App load / refresh
   → GET /api/v1/auth/me  (cookie sent via withCredentials)
   → 200 { user }  → AuthProvider sets the session
   → 401           → session null → ProtectedRoute redirects to /login

After login
   → navigate(roleHome(user.role))

POST /api/v1/auth/logout   → clearCookie('sp_token') → 204
POST /api/v1/auth/change-password { currentPassword, newPassword }
   → verifies the current password, rehashes, writes an AuditLog row
```

**`roleHome.js`**

| Role | Landing path |
|---|---|
| `SUPER_ADMIN` | `/admin` |
| `DIRECTOR` | `/director` |
| `SALES_EXECUTIVE` | `/sales/leads` |
| `SURVEY_TECHNICIAN` | `/field/surveys` |
| `CUSTOMER` | `/portal` |
| `WAREHOUSE_MANAGER` | `/warehouse` |
| `INSTALLATION_TECHNICIAN` | `/field/jobs` |
| `SUPPORT_EXECUTIVE` | `/support` |

The JWT carries the role, but **every request re-reads the role from the database** in `requireAuth`,
so deactivating a user or changing a role takes effect on the next request rather than in eight hours.

---

## 6. Event bus

`server/src/core/events.js` wraps a Node `EventEmitter`. It exists so three developers can cause
side effects in each other's modules without importing each other's code (D-02).

```js
// core/events.js
import { EventEmitter } from 'node:events';
import { logger } from './logger.js';

const bus = new EventEmitter();
bus.setMaxListeners(50);

/** Registers a listener. Errors are logged, never thrown — one bad listener must not break another. */
export function on(event, handler) {
  bus.on(event, (payload) => {
    Promise.resolve()
      .then(() => handler(payload))
      .catch((err) => logger.error({ err, event, payload }, 'event listener failed'));
  });
}

/** Emits AFTER the transaction that produced the payload has committed. */
export function emit(event, payload) {
  logger.info({ event, payload }, 'event emitted');
  bus.emit(event, payload);
}
```

**Rules**

1. **Emit after commit, never inside `$transaction`.** A listener that reads the row must find it
   there. Services compute the payload inside the transaction and emit on the line after it returns.
2. **Payloads carry ids only** — `{ projectId }`, not a loaded object. Listeners fetch what they need,
   so they always see current data.
3. **Listeners live in the owning module's `<name>.listeners.js`**, and are registered once at boot by
   `server/src/server.js`. A listener calls only its own module's service functions.
4. **Listeners are independent.** One failing listener logs and does not stop the others, and never
   fails the HTTP request that triggered the event.
5. **A listener that must be atomic with its trigger is not a listener.** Warranty creation on
   delivery (BR-09) happens inside the delivery transaction; `dispatch.delivered` only notifies.
6. Events are fire-and-forget and in-process. No retries, no queue — acceptable for the hackathon and
   recorded as D-02.

### Event table

| Event | Payload | Emitted by | Listeners (owner) |
|---|---|---|---|
| `lead.created` | `{ leadId }` | `leads.service` / `public.service` | notify all SALES_EXECUTIVE (B) |
| `survey.submitted` | `{ surveyId }` | `surveys.service` | notify the assigned sales executive (B) |
| `survey.approved` | `{ surveyId, leadId }` | `surveys.service` | notify sales (B) |
| `quote.sent` | `{ quoteId }` | `quotes.service` | create the CUSTOMER login if missing + notify the customer (B) |
| `quote.accepted` | `{ quoteId }` | `quotes.service` | create the `Project` as `AWAITING_ADVANCE` (B) |
| `payment.recorded` | `{ paymentId, projectId, invoiceId }` | `payments.service` | update `Invoice.amountPaid` and status (A) |
| `project.confirmed` | `{ projectId }` | `projects.service` | create `Dispatch` + lines, reserve stock (C) · create `UNSCHEDULED` `InstallationJob` (C) · create the `PROFORMA` invoice (A) · create the `SubsidyApplication` when eligible (A) · notify WAREHOUSE_MANAGER (C) |
| `dispatch.dispatched` | `{ dispatchId, projectId }` | `dispatches.service` | project → `DISPATCHED`, notify the customer (C) |
| `dispatch.delivered` | `{ dispatchId, projectId }` | `dispatches.service` | notify the installation crew (C). *Warranties are written inside the delivery transaction, not here (BR-09).* |
| `installation.scheduled` | `{ jobId }` | `installations.service` | notify the crew + the customer (C) |
| `installation.completed` | `{ jobId, projectId }` | `installations.service` | project → `INSTALLED` (C) · `TAX` invoice for the balance (A) · notify the customer + the director (A) |
| `ticket.created` | `{ ticketId }` | `tickets.service` | notify all SUPPORT_EXECUTIVE (C) |
| `ticket.billable` | `{ ticketId, lines }` | `tickets.service` | create the `SERVICE` invoice (A) |
| `ticket.resolved` | `{ ticketId }` | `tickets.service` | notify the customer to confirm (C) |
| `ticket.closed` | `{ ticketId }` | `tickets.service` | book the warranty cost when the ticket was free (A) |

Adding an event is additive and needs no permission. **Changing an existing payload is breaking —
stop and ask** (`AGENTS.md` section 6).

---

## 7. Environment

### `server/.env.example`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sunpower_sims?schema=public"
JWT_SECRET="change-me-to-a-long-random-string-at-least-32-chars"
CLIENT_URL="http://localhost:5173"
PORT=5000
UPLOAD_DIR="./uploads"
NODE_ENV="development"
```

### `client/.env.example`

```bash
VITE_API_URL="http://localhost:5000/api/v1"
```

`server/src/config/env.js` parses `process.env` with zod and **throws at boot** if anything is
missing or malformed — `JWT_SECRET` shorter than 32 characters, a `DATABASE_URL` that is not a
postgres URL, a non-numeric `PORT`. A misconfigured server must fail loudly on start, not at the
first request.

`CLIENT_URL` accepts a comma-separated list, which becomes the CORS allow-list. Requests from an
origin not on the list are refused — there is no `origin: true` anywhere.

### Dev ports and commands

| Service | Port | URL |
|---|---|---|
| Vite client | 5173 | `http://localhost:5173` |
| Express API | 5000 | `http://localhost:5000/api/v1` |
| Uploads (static, read-only) | 5000 | `http://localhost:5000/uploads/<file>` |
| Health check | 5000 | `http://localhost:5000/api/v1/health` |

```bash
npm run setup   # install both, prisma generate, prisma db push, seed
npm run dev     # concurrently: client + server
npm run seed    # reseed
npm run test    # node --test on the server
```

**Migrations.** During the hackathon the schema moves with `prisma db push` (D-03) — three people
generating migrations on one branch would collide constantly. At feature freeze, one person runs
`prisma migrate dev --name baseline` once and commits the single migration.
