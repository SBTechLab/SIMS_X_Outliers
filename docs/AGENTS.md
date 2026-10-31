# AGENTS.md — rules for every agent and human in this repo

This file governs how three people and three AI sessions work on one codebase at the same time
without breaking each other. Read it before you touch anything.

---

## 1. Read order at the start of every session

Read in this order, every time, before writing code:

1. `/CLAUDE.md` — the ten rules that matter most
2. `docs/AGENTS.md` — this file
3. `docs/PRD.md` — what we are building, business rules, state machines
4. `docs/ARCHITECTURE.md` — folder tree, request lifecycle, event bus
5. `docs/RULES.md` — coding standards
6. `docs/DESIGN.md` — tokens, components, layouts, copy tone
7. `docs/API_CONTRACTS.md` — every endpoint and event (the contract between members)
8. `docs/DATABASE.md` — models, enums, relations
9. `docs/MEMORY.md` — what is done, in progress, pending and broken **right now**

Then: `git pull --rebase origin main` before the first edit.

---

## 2. Team and role ownership

Roles are **locked**. See section 4.

| Member | Roles owned | Also owns |
|---|---|---|
| **Member A** | `SUPER_ADMIN`, `DIRECTOR` | Platform/foundation, finance, reports |
| **Member B** | `SALES_EXECUTIVE`, `SURVEY_TECHNICIAN`, `CUSTOMER` | Public website |
| **Member C** | `WAREHOUSE_MANAGER`, `INSTALLATION_TECHNICIAN`, `SUPPORT_EXECUTIVE` | — |

---

## 3. Module ownership map

An agent edits **only its own member's folders**, plus shared files under the protocol in section 5.

### Server — `server/src/modules/`

| Folder | Owner |
|---|---|
| `auth/` | A |
| `users/` | A |
| `settings/` | A |
| `kit-templates/` | A |
| `audit/` | A |
| `notifications/` | A |
| `reports/` | A |
| `invoices/` | A |
| `subsidies/` | A |
| `payouts/` | A |
| `expenses/` | A |
| `search/` | A |
| `public/` | B |
| `leads/` | B |
| `surveys/` | B |
| `quotes/` | B |
| `projects/` | B |
| `payments/` | B |
| `customers/` | B |
| `me/` | B |
| `products/` | C |
| `inventory/` | C |
| `purchases/` | C |
| `serials/` | C |
| `dispatches/` | C |
| `warranties/` | C |
| `installations/` | C |
| `tickets/` | C |
| `support/` | C |

`server/src/core/`, `server/src/middlewares/`, `server/src/config/`, `server/prisma/`, `server/src/jobs/` — **Member A** (foundation). Other members request changes.

### Client — `client/src/features/`

| Folder | Owner |
|---|---|
| `auth/` | A |
| `admin/` | A |
| `director/` | A |
| `finance/` | A |
| `reports/` | A |
| `notifications/` | A |
| `sales/` | B |
| `survey/` | B |
| `quotes/` | B |
| `customer-portal/` | B |
| `public-site/` | B |
| `inventory/` | C |
| `dispatch/` | C |
| `installation/` | C |
| `support/` | C |

`client/src/components/ui/`, `client/src/components/layout/`, `client/src/lib/`, `client/src/styles/`, `client/src/app/` — **Member A** (shared UI kit and shell). Additions welcome via a request; do not rewrite existing components.

---

## 4. Locked roles rule

The eight roles are fixed:

`SUPER_ADMIN`, `DIRECTOR`, `SALES_EXECUTIVE`, `SURVEY_TECHNICIAN`, `CUSTOMER`,
`WAREHOUSE_MANAGER`, `INSTALLATION_TECHNICIAN`, `SUPPORT_EXECUTIVE`

**Never add, remove, rename or merge a role.** If you believe a role change is needed,
**STOP and ask the user first.** Do not "temporarily" add one.

---

## 5. Shared-file protocol

These files are touched by all three members:

- `server/prisma/schema.prisma`
- `server/src/routes.js`
- `client/src/routes/AppRoutes.jsx`
- `client/src/config/navigation/*`
- `docs/API_CONTRACTS.md`

Rules:

1. **Additive changes only.** Append your block at the end of your own section.
2. **Never rename, reorder or delete another member's lines.** Not even to tidy up.
3. Each member's lines are fenced with a comment marker, e.g.
   `// --- Member C: inventory ---`. Stay inside your fence.
4. After editing a shared file, **tell the user to announce it to the team** so the
   others pull before their next edit.
5. On a rebase conflict in a shared file: **keep both sides**. Never pick one.
6. On a rebase conflict in any other file: **ask the user before resolving.**

---

## 6. Stop-and-ask list

Stop and ask the user before:

- any change to the role list (add / remove / rename / merge);
- any **breaking** schema change — dropping a column or model, renaming a field, changing a
  type, changing an enum value, or anything that needs data migration;
- editing a file owned by another member;
- adding a new dependency to `client/package.json` or `server/package.json` — the stack is fixed
  (see `docs/ARCHITECTURE.md`);
- changing an error code, response shape or endpoint path already published in `API_CONTRACTS.md`;
- changing the meaning of an existing event payload;
- anything that would require `git push --force`.

---

## 7. Definition of done

A feature is **not done** until all of these are true:

- [ ] **Server validation** — zod schema on body, params and query; invalid input returns `422`.
- [ ] **RBAC** — `requireRole(...)` on the route, with the exact role list from `API_CONTRACTS.md`.
- [ ] **Ownership check** — in the service, not the route: a CUSTOMER sees only their own rows, a
      technician only assigned work (BR-16).
- [ ] **Business rules** — the relevant BR-xx from `PRD.md` is enforced server-side, with the documented error code.
- [ ] **Transactions** — every multi-step write wrapped in `prisma.$transaction`.
- [ ] **Events** — emitted *after* the transaction commits; listeners registered at boot.
- [ ] **UI states** — loading (`Skeleton`), empty (`EmptyState`), error (inline message + retry).
- [ ] **Responsive** — works at 360px for technician and customer screens; no horizontal scroll.
- [ ] **Design tokens only** — no raw hex in components; `cn()` for class merging.
- [ ] **Documented** — the feature added to `docs/FEATURE_NOTES.md` using the template there.
- [ ] **`docs/MEMORY.md` updated** — module status row, in-progress and pending lists.
- [ ] **Committed** — conventional commit message, pushed to `main`.

---

## 8. End of every session

Do all five, in order, every time:

1. Update `docs/MEMORY.md` — Current status, Module status table, In progress, Pending / TODO,
   Known bugs, and a new Session log row (date-time, member, what changed).
2. Update `docs/DECISIONS.md` — add an ADR row for any new decision you made. If you made a
   decision and did not record it, the next session will undo it.
3. Update `docs/FEATURE_NOTES.md` — one entry per feature you finished, using the template.
4. `git add -A` and commit with a conventional message.
5. `git pull --rebase origin main` then `git push origin main`.

---

## 9. Git rules

The whole team works on **one branch: `main`**. No feature branches.

**Start of session**

```bash
git pull --rebase origin main
```

**End of session**

```bash
git add -A
git commit -m "feat(dispatch): serial scanning with duplicate and cross-project guards"
git pull --rebase origin main
git push origin main
```

**Never**

- `git push --force` (or `--force-with-lease`)
- `git reset --hard`
- `git rebase -i`, `git commit --amend`, or any history rewrite
- `git checkout -- .` over someone else's work

**Conflicts**

- In a shared file (section 5): keep **both** sides, then verify the file still parses.
- Anywhere else: **ask the user** before resolving.

**Commit messages** — conventional, with a scope:

```
feat(leads): qualification call logging and overdue flag
fix(dispatch): reject serial already on another project
refactor(quotes): move BOM expansion into the service
docs(api): add warranty endpoints
chore(deps): pin prisma 5.x
test(warranty): date arithmetic for 240-month panels
```

Small commits. One logical change each.

---

## 10. Working style for AI agents

- **Read before you write.** Grep for an existing helper before adding one. The UI kit and
  `server/src/core/` already cover most needs.
- **Follow the module shape exactly** (`RULES.md` section on backend module shape). Three
  developers must be able to read each other's modules without thinking.
- **Never invent an endpoint.** If it is not in `API_CONTRACTS.md`, add it there first (additively),
  then implement it.
- **Never invent an enum value.** The enums in `DATABASE.md` and `client/src/lib/constants.js` are
  the full set.
- **No placeholder content.** No lorem ipsum, no `TODO: implement`, no fake data in committed code.
  Realistic Indian names, addresses and amounts, always.
- **Do not refactor another member's module** to suit yours. Ask the user to route it.
- **If you are blocked by a missing foundation piece**, say so and stop — do not build a private
  copy of it in your module.
