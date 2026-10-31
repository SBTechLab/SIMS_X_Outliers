# RULES.md — coding standards

Non-negotiable. Three people and three AI sessions write this codebase; it has to read as if one
person wrote it. When this file and a habit disagree, this file wins.

---

## 1. Naming

| Thing | Convention | Example |
|---|---|---|
| Variables, functions | `camelCase` | `advancePercent`, `confirmProject` |
| React components | `PascalCase` | `DataTable`, `PackingPage` |
| Component files | `PascalCase.jsx` | `StatusBadge.jsx`, `LeadBoardPage.jsx` |
| Non-component files | `kebab-case.js` | `role-home.js`, `query-client.js` |
| Backend module files | `<name>.<layer>.js` | `dispatches.service.js` |
| Prisma models | `PascalCase` singular | `SerialUnit`, `InstallationJob` |
| Prisma fields | `camelCase` | `warrantyMonths`, `deliveredAt` |
| Enums + values | `UPPER_SNAKE_CASE` | `SerialStatus.IN_STOCK` |
| Error codes | `UPPER_SNAKE_CASE` | `ADVANCE_NOT_RECEIVED` |
| Env variables | `UPPER_SNAKE_CASE` | `JWT_SECRET` |
| REST resources | plural, kebab-case | `/kit-templates`, `/serials` |
| Actions on a resource | `POST /resource/:id/verb` | `POST /projects/:id/confirm` |
| Query keys | `<module>Keys.<scope>` | `dispatchKeys.detail(id)` |
| CSS custom properties | `--kebab-case` | `--sun-deep` |
| Booleans | `is` / `has` / `wants` prefix | `isActive`, `hasSignature`, `wantsSubsidy` |
| Dates | `At` suffix; dates without time `Date` | `deliveredAt`, `scheduledDate` |
| Money fields | plain noun, no unit suffix | `total`, `unitCost`, `amountPaid` |

Never abbreviate a domain word: `quantity` not `qty` in code (the DB field `scannedQty` is the one
exception, kept for the dispatch line pair `requiredQty`/`scannedQty`/`packedQty`).

---

## 2. Backend module shape

Every module in `server/src/modules/<name>/` has exactly these files:

```
<name>.routes.js        Router. Middleware chain only.
<name>.controller.js    Thin. Read req → call one service function → send response.
<name>.service.js       Business logic, Prisma, transactions, events, audit.
<name>.validation.js    zod schemas.
<name>.listeners.js     Optional. This module's event subscriptions.
```

Split a service that passes 300 lines into `<name>.service.js` plus
`<name>.<concern>.service.js` (for example `dispatches.scan.service.js`). Never split by layer.

### `routes.js`

```js
import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as controller from './dispatches.controller.js';
import * as v from './dispatches.validation.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('WAREHOUSE_MANAGER', 'DIRECTOR'),
  validate({ query: v.listQuery }),
  asyncHandler(controller.list),
);

router.post(
  '/:id/scan',
  requireRole('WAREHOUSE_MANAGER'),
  validate({ params: v.idParam, body: v.scanBody }),
  asyncHandler(controller.scan),
);

export default router;
```

No logic in a route file: no `if`, no `await`, no Prisma, no inline handler body.

### `controller.js`

```js
import { ok, created } from '../../core/response.js';
import * as service from './dispatches.service.js';

export async function scan(req, res) {
  const result = await service.scanSerial(req.params.id, req.body.serialNumber, req.user);
  return ok(res, result);
}
```

A controller is three lines or fewer. **No Prisma calls in a controller, ever.** No computation, no
`try/catch` (`asyncHandler` handles it), no status-code decisions beyond `ok` / `created`.

### `service.js`

Receives plain arguments plus `user`, never `req`. Returns plain data, never touches `res`.
Owns: validation of state transitions, business rules, transactions, audit, notifications, events.

### `validation.js`

```js
import { z } from 'zod';

export const idParam = z.object({ id: z.string().cuid() });

export const scanBody = z.object({
  serialNumber: z.string().trim().min(3).max(64).toUpperCase(),
});

export const listQuery = z.object({
  status: z.enum(['PENDING', 'PACKING', 'READY', 'DISPATCHED', 'DELIVERED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

---

## 3. Service documentation

**Every exported service function** carries this JSDoc header, in this exact style and order:

```js
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
export async function confirmProject(projectId, user) { … }
```

- **Why** cites the `BR-xx` rule, or says the business reason in one line. Not "confirms a project".
- **Flow** is the steps, arrow-separated, naming each transaction and each event.
- **Example** is a real call with a realistic id and a shortened return value.
- **Throws** lists every `AppError` the function can raise, with status and code. If it throws
  nothing, write `Throws: nothing.`

**Inline comments explain WHY, not what.**

```js
// The serial may already be RESERVED to this project from an earlier scan that was
// rolled back client-side, so treat that as idempotent rather than a conflict.
if (serial.status === 'RESERVED' && serial.projectId === dispatch.projectId) return existing;
```

```js
// BAD — restates the code
// set status to RESERVED
serial.status = 'RESERVED';
```

**No commented-out code.** Delete it; git has it.

---

## 4. Validation

- **Every** request is validated on the server with zod: `body`, `params` and `query`. A route with
  user input and no `validate()` is a bug.
- `params` ids are `z.string().cuid()`. Codes are `z.string().regex(...)`.
- Enums use `z.nativeEnum`-style literal unions matching Prisma exactly — never `z.string()` where an
  enum is meant.
- Query numbers use `z.coerce.number()` with `.int()`, `.min()`, `.max()` and a `.default()`.
- `.trim()` every free-text string; `.max()` every one of them (no unbounded text columns from the API).
- Money in comes as `z.coerce.number().positive().multipleOf(0.01)` and is converted to
  `Prisma.Decimal` in the service.
- Dates come as ISO strings via `z.coerce.date()`.
- Client forms use `react-hook-form` + zod with **the same rules**, imported from a shared schema file
  in the feature folder where practical. The client mirrors; the server decides.
- Unknown keys are stripped, not rejected — zod's default `strip`. The exception is settings updates,
  which use `.strict()` so a typo in a settings key fails loudly.

---

## 5. Errors

```js
throw new AppError(409, 'ADVANCE_NOT_RECEIVED', 'Advance payment not received.', {
  required: '54000.00',
  paid: '5000.00',
});
```

| Status | When |
|---|---|
| `400 BAD_REQUEST` | Malformed request that is not a field error |
| `401 UNAUTHENTICATED` | Missing, invalid or expired session |
| `403 FORBIDDEN` | Authenticated but not allowed (role or ownership, BR-16) |
| `404 NOT_FOUND` | The row does not exist, or the caller may not know it does |
| `409 <CODE>` | A state or business-rule conflict (`INVALID_TRANSITION`, `DISPATCH_INCOMPLETE`, `SERIAL_ALREADY_SCANNED`) |
| `422 VALIDATION_ERROR` | zod failure, or a semantic input error (`PHOTOS_REQUIRED`, `INVALID_CREW`) |
| `429 RATE_LIMITED` | Rate limiter tripped |
| `500 INTERNAL_ERROR` | Unexpected. Logged with the stack; the client sees a generic message. |

Rules:

- Error **codes are a public contract** — they live in `API_CONTRACTS.md` and the UI branches on them.
  Changing one is breaking (stop and ask).
- Messages are written for the person reading the screen, in full sentences, naming the specific thing:
  `Serial INV-SG5K-2024-00318 is already on project PRJ-2026-0003.`
  Never `Something went wrong`, never a raw Prisma message.
- `details` carries machine-readable context (which lines are short, which fields failed). Never a
  stack trace, never a SQL string.
- **Never send a stack trace in production.** `errorHandler` includes `stack` only when
  `NODE_ENV !== 'production'`.
- **Every async route handler is wrapped in `asyncHandler`.** No bare `async` handlers; no `try/catch`
  in controllers.
- Services throw; they never return `{ error }`.

---

## 6. Responses

```js
// success
{ "success": true, "data": { … } }
{ "success": true, "data": [ … ], "meta": { "page": 1, "pageSize": 20, "total": 128 } }

// error
{ "success": false, "error": { "code": "ADVANCE_NOT_RECEIVED",
                               "message": "Advance payment not received.",
                               "details": { "required": "54000.00", "paid": "5000.00" } } }
```

- Built only through `core/response.js` (`ok`, `created`) — never a hand-written `res.json`.
- `201` for a created row, `200` for everything else, `204` with no body for logout and deletes.
- Pagination `meta` is always `{ page, pageSize, total }`. A list endpoint without pagination is a bug.
- Money is serialised as a **string** (`"54000.00"`), not a float — `Decimal` must not pass through
  JS number precision. The client formats it; it never does arithmetic on it.
- Dates are ISO 8601 UTC with `Z`. The server never formats a date for display.
- A list never returns a nested object graph deeper than two levels; a detail endpoint does.
- Never leak `passwordHash`, and never return another user's email to a CUSTOMER.

---

## 7. Money and time

- Stored as `Decimal(12,2)`, in INR only (BR-14).
- All arithmetic through `Prisma.Decimal` or the helpers in `core/money.js`
  (`sum`, `mul`, `taxOf`, `round2`). **Never `+`, `*`, `parseFloat` or `Number()` on money.**

```js
// GOOD
const lineTotal = mul(item.unitPrice, item.quantity);
const taxTotal  = taxOf(subtotal, settings.defaultTaxPercent);

// BAD — floats
const lineTotal = item.unitPrice * item.quantity;
```

- Tax percentages come from `Product.taxPercent` or `Setting.defaultTaxPercent`. **No literal rate
  anywhere in code.** Same for `advancePercent`, `labourRatePerHour`, `serviceVisitCharge`,
  `quoteValidityDays`.
- Round only at the line and total level, two decimals, half-up.
- **Dates are stored UTC** and displayed IST. The server stores `new Date()`; the client formats with
  `timeZone: 'Asia/Kolkata'`.
- Date-only fields (`scheduledDate`, `periodStart`) are stored at UTC midnight and never shifted.
- Durations come from `TimeLog.minutes` (integer), never from re-subtracting timestamps in the UI.

---

## 8. Transactions

Any write that touches more than one row goes in `prisma.$transaction`:

```js
const result = await prisma.$transaction(async (tx) => {
  const number = await nextCode(tx, 'DSP');          // BR-17: inside the transaction
  const dispatch = await tx.dispatch.create({ data: { number, projectId, … } });
  await tx.dispatchLine.createMany({ data: lines });
  await tx.project.update({ where: { id: projectId }, data: { status: 'PACKING' } });
  return dispatch;
});

// AFTER the commit — a listener must be able to read what we wrote
events.emit('dispatch.created', { dispatchId: result.id, projectId });
```

- Pass `tx` down to helpers; never mix the global `prisma` and `tx` in one transaction.
- `nextCode(tx, prefix)` is always called with `tx` (BR-17).
- Interactive transactions stay short — no HTTP calls, no PDF generation, no file writes inside one.
- **Never emit an event inside a transaction** (`ARCHITECTURE.md` section 6).
- Warranty creation on delivery is part of the delivery transaction (BR-09), not a listener.

---

## 9. Logging

- `pino` via `core/logger.js`. **No `console.log`, `console.error` or `console.warn` in committed code**
  — the ESLint config fails the build on it.
- `logger.info` for a business event worth a line (`order confirmed`, `dispatch dispatched`).
  `logger.warn` for a handled business rejection. `logger.error` with the `err` object for anything
  unexpected.
- Log objects, not interpolated strings: `logger.info({ projectId, paid }, 'order confirmed')`.
- **Never log a password, a password hash, a JWT, a cookie header or a full request body** containing
  any of them.
- `pino-http` gives each request an id; include it when logging inside a request.

---

## 10. React

- Function components and hooks only. No classes, no `forwardRef` unless the component wraps a DOM node.
- **Components under 200 lines.** Past that, split: extract the form, the table columns, the row, the
  drawer body.
- **Files under 300 lines. Functions under 50 lines** where it reads naturally.
- One exported component per file, named the same as the file.
- **No inline style objects.** Tailwind classes only, merged with `cn()`:

```jsx
<button className={cn('h-10 rounded-[6px] px-4 font-medium', variants[variant], className)} />
```

- **Design tokens only — no raw hex, no arbitrary colour, no `#F59E0B` in a component.** The only
  files allowed to contain hex are `client/src/styles/index.css` and `client/tailwind.config.js`.
- Arbitrary Tailwind values are allowed only for the two radii (`rounded-[6px]`, `rounded-[10px]`) and
  documented fixed layout sizes (`w-[248px]` sidebar).
- **Every page handles three states**, in this order, before the happy path:

```jsx
if (isLoading) return <Skeleton variant="table" rows={6} />;
if (isError)   return <ErrorState message={error.message} onRetry={refetch} />;
if (!rows.length) return <EmptyState title="No dispatches to pack" … />;
```

A page that renders `undefined.map` on first paint is not done.

- Data fetching lives in `hooks.js`, never `useEffect` + `fetch` in a component.
- Forms: `react-hook-form` + `zodResolver`. No manual `useState` per field. Server field errors are
  mapped back onto the form with `setError`.
- Lists need a stable `key` from the row id. Never the array index.
- `useMemo` / `useCallback` only where there is a measured reason — not by reflex.
- Enum labels and badge colours come from `lib/constants.js`. **Never a hard-coded status string in a
  component.**
- Formatting comes from `lib/format.js`. Never `toLocaleString` in a component.
- All user-visible copy follows the tone in `DESIGN.md` section 1 and passes the checklist in
  `DESIGN.md` section 13.
- Accessibility is part of the component, not a later pass: label every input, `aria-label` every
  icon button, visible focus rings, keyboard-usable overlays.

---

## 11. Imports and file layout

Order imports in groups, blank line between:

```js
// 1. node / external
import { Router } from 'express';
import { z } from 'zod';

// 2. core / middlewares (server)  |  lib / components (client)
import { AppError } from '../../core/AppError.js';
import { prisma } from '../../core/prisma.js';

// 3. this module
import * as service from './dispatches.service.js';
```

- Server imports are **ESM with explicit `.js` extensions** — `"type": "module"`, no bare directory
  imports, no CommonJS `require`.
- Client imports use the `@` alias for anything outside the current feature:
  `import { Button } from '@/components/ui/Button.jsx'`.
- **A feature never imports from another feature.** Shared code moves to `lib/` or `components/ui/`
  (ask the owner first — `AGENTS.md`).
- No default exports on the server except a module's router. Named exports elsewhere.

---

## 12. Git

Conventional commits with a scope, in the imperative:

```
feat(dispatch): scan serials with duplicate and cross-project guards
fix(quotes): block accepting a quote past validUntil
refactor(projects): move the advance check into the service
docs(api): document the warranty endpoints
chore(client): pin recharts to 2.12.7
test(warranty): 240-month panel date arithmetic
```

- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`. Scope is the module name.
- **Small commits**, one logical change each. Not "end of day dump".
- Subject in the imperative, under 72 characters, no trailing period.
- Never commit `.env`, `node_modules/`, `server/uploads/`, build output, or a `console.log`.
- One branch: `main`. The full pull/push ritual and the conflict rules are in `AGENTS.md` section 9.

---

## 13. Checklist before you commit

- [ ] zod validation on body, params and query
- [ ] `requireRole(...)` matching `API_CONTRACTS.md` exactly
- [ ] ownership check in the service (BR-16)
- [ ] the `BR-xx` rule enforced server-side with the documented error code
- [ ] multi-row writes in `prisma.$transaction`; codes via `nextCode(tx, …)`
- [ ] events emitted after the commit
- [ ] JSDoc header on every exported service function (Why / Flow / Example / Throws)
- [ ] no `console.log`, no commented-out code, no `TODO` placeholder
- [ ] loading / empty / error states in every page
- [ ] no raw hex, no inline styles, `cn()` for classes, tokens only
- [ ] 360px checked for technician and customer screens
- [ ] `DESIGN.md` section 13 checklist passed
- [ ] `FEATURE_NOTES.md`, `MEMORY.md` and (if a decision was made) `DECISIONS.md` updated
- [ ] conventional commit message with a scope
