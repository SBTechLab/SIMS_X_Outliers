# SunPower SIMS

Solar Installation Management System for SunPower Solutions — monorepo: `/client` (React 18 + Vite),
`/server` (Node 20 + Express + Prisma + PostgreSQL), `/docs`.

## Read this first

**Read [`docs/AGENTS.md`](docs/AGENTS.md) before you touch anything.** It carries the read order,
the module ownership map, the shared-file protocol and the git rules. Everything below is a summary
of it; where they differ, `docs/AGENTS.md` wins.

Read order every session:
`CLAUDE.md` → `docs/AGENTS.md` → `docs/PRD.md` → `docs/ARCHITECTURE.md` → `docs/RULES.md` →
`docs/DESIGN.md` → `docs/API_CONTRACTS.md` → `docs/DATABASE.md` → `docs/MEMORY.md`

## The ten rules that matter most

1. **The 8 roles are locked** — `SUPER_ADMIN`, `DIRECTOR`, `SALES_EXECUTIVE`, `SURVEY_TECHNICIAN`,
   `CUSTOMER`, `WAREHOUSE_MANAGER`, `INSTALLATION_TECHNICIAN`, `SUPPORT_EXECUTIVE`. Never add,
   remove, rename or merge one. If you think a change is needed, **stop and ask the user.**
2. **Stay in your own folders.** Member A: platform/admin/director/finance/reports. Member B:
   sales/survey/customer/public. Member C: warehouse/installation/support. See the ownership map in
   `docs/AGENTS.md`.
3. **Shared files are additive only** — `schema.prisma`, `server/src/routes.js`,
   `client/src/routes/AppRoutes.jsx`, `client/src/config/navigation/*`, `docs/API_CONTRACTS.md`.
   Never rename or delete another member's lines. Tell the user to announce the change.
4. **Stop and ask** before: a role change, a breaking schema change, editing another member's
   module, or adding a dependency. The tech stack is fixed.
5. **The server is the only enforcement point.** Every route: zod validation → `requireRole(...)` →
   ownership check in the service → business rule (BR-xx from `docs/PRD.md`). The UI mirrors rules;
   it never replaces them.
6. **Module shape is fixed**: `<name>.routes.js`, `<name>.controller.js`, `<name>.service.js`,
   `<name>.validation.js`, optional `<name>.listeners.js`. No Prisma in controllers. No logic in routes.
   Every service function gets the JSDoc header from `docs/RULES.md` (Why / Flow / Example / Throws).
7. **Money is `Decimal(12,2)` in INR**, arithmetic via `Prisma.Decimal`, never JS floats. Tax rates
   come from `Setting`; never hard-code a rate. Dates stored UTC, displayed IST.
8. **Multi-step writes go in `prisma.$transaction`.** Events are emitted **after** the commit, through
   `server/src/core/events.js`. Codes (`ENQ`/`QT`/`PRJ`/`DSP`/`TKT`/`INV`) come from the `Counter`
   table inside the same transaction.
9. **Every page handles loading, empty and error** (`Skeleton`, `EmptyState`, inline retry). Use the
   UI kit and design tokens — no raw hex, no inline styles, `cn()` for classes. Technician and
   customer screens must work at 360px. The product must not look AI-generated: no emojis, no sparkle
   icons, no "Welcome to your dashboard!", no lorem ipsum, realistic Indian data (`docs/DESIGN.md`).
10. **One branch: `main`.** Start with `git pull --rebase origin main`; end by updating
    `docs/MEMORY.md`, `docs/DECISIONS.md` and `docs/FEATURE_NOTES.md`, then `git add -A`, commit with
    a conventional message, `git pull --rebase origin main`, `git push origin main`. Never
    `--force`, never `reset --hard`, never rewrite history.

## Commands

```bash
npm run setup   # install client + server, generate prisma client, db push, seed
npm run dev     # client :5173 and server :5000 together
npm run seed    # reseed the database
npm run test    # node --test on the server
```
