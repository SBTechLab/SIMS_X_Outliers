# ASSETS.md

Every image in `client/src/assets/images/` must have a row in this table before it is committed.
No row, no commit — an uncredited photo is a licensing problem we cannot fix after a demo.

---

## 1. Rules

- **Source:** free-licence stock only — [Unsplash](https://unsplash.com),
  [Pexels](https://pexels.com) or [Pixabay](https://pixabay.com). Their licences permit commercial
  use without attribution, but we credit anyway: it costs one row and settles the question.
- **No AI-generated images.** No Midjourney, no DALL·E, no Stable Diffusion. The product must not look
  AI-generated (`DESIGN.md` section 13), and that starts with the photography.
- **No illustration packs, no 3D renders, no isometric scenes, no "AI brain" graphics.**
- **Subject matter:** real rooftop solar work, preferably Indian — panels on an RCC terrace, a
  technician on a mounting rail, a wall-mounted inverter, a warehouse aisle of panel cartons, a small
  factory roof array. People in work clothes doing work, not models posing with a tablet.
- **Format:** WebP, with a JPEG fallback for the hero only.
- **Naming:** `kebab-case`, describing the content and its use —
  `hero-rooftop-install.webp`, `auth-technician-panel.webp`, `empty-no-dispatches.webp`.
- **Budgets:** hero ≤ 250 KB · banner ≤ 120 KB · empty state ≤ 25 KB · package card ≤ 60 KB.
- **Dimensions** are recorded here and set explicitly on every `<img>`, so nothing shifts on load.
- Placement rules (where a photo may and may not appear) are in `DESIGN.md` section 7.
  **Never behind a table, a form, a dashboard metric, a modal or a drawer.**

---

## 2. Credit table

| File | Used on | Dimensions | Size | Photographer | Source URL | Licence |
|---|---|---|---|---|---|---|
| | | | | | | |

### Rows the team needs to fill

Each row below is a slot the UI expects. Add the file, fill the row, delete this note when the table
is complete.

| # | File name to create | Where it is used | Target dimensions | Treatment |
|---|---|---|---|---|
| 1 | `hero-rooftop-install.webp` (+ `.jpg` fallback) | Public landing hero | 1920 × 1080 | `ink` gradient from the left at 60% so the Fraunces headline reads |
| 2 | `auth-technician-panel.webp` | Auth split screen, left 45% | 1200 × 1600 (portrait) | 25% `ink` overlay, logo top-left, caption bottom-left |
| 3 | `banner-ongrid.webp` | Public "How it works" / On-Grid section | 1600 × 600 | 50% `ink` overlay |
| 4 | `banner-offgrid.webp` | Public Off-Grid / battery backup section | 1600 × 600 | 50% `ink` overlay |
| 5 | `banner-subsidy.webp` | Public subsidy section | 1600 × 600 | 50% `ink` overlay |
| 6 | `package-ongrid.webp` | On-Grid package cards | 800 × 500 | No overlay, 160px tall in the card |
| 7 | `package-offgrid.webp` | Off-Grid package cards | 800 × 500 | No overlay |
| 8 | `header-warehouse.webp` | `PageHeader` background — warehouse / dispatch | 1600 × 400 | **70% `ink` overlay**, white title |
| 9 | `header-installation.webp` | `PageHeader` background — installations | 1600 × 400 | 70% `ink` overlay |
| 10 | `header-service.webp` | `PageHeader` background — support / tickets | 1600 × 400 | 70% `ink` overlay |
| 11 | `empty-no-leads.webp` | `EmptyState` — sales lead board | 400 × 400 | 96px square, `rounded-[10px]` |
| 12 | `empty-no-surveys.webp` | `EmptyState` — survey technician's day | 400 × 400 | 96px square |
| 13 | `empty-no-dispatches.webp` | `EmptyState` — nothing to pack | 400 × 400 | 96px square |
| 14 | `empty-no-jobs.webp` | `EmptyState` — installation technician's day | 400 × 400 | 96px square |
| 15 | `empty-no-tickets.webp` | `EmptyState` — support queue clear | 400 × 400 | 96px square |
| 16 | `empty-no-projects.webp` | `EmptyState` — customer portal, no projects yet | 400 × 400 | 96px square |

### Placeholder files

Until the real photos are added, the seed's installation photos reference placeholder paths under
`/uploads/` created by `prisma/seed.js`. Those are **demo data, not assets** — they do not belong in
`client/src/assets/images/` and need no credit row.

---

## 3. Icons

Icons come from **`lucide-react`** only (ISC licence, no attribution required) — the one dependency,
one visual language.

- Only **literal** icons: `Sun` for solar, `Package` for dispatch, `Wrench` for service,
  `FileText` for quotes, `ScanLine` for serial scanning, `Receipt` for invoices.
- **No `Sparkles`, no `Wand2`, no `Rocket`, no `Brain`, no `Zap` as decoration** — see the checklist
  in `DESIGN.md` section 13.
- Stroke width 2, size 18px in navigation, 20px in buttons, 22px in the field tab bar, 40px in empty
  states. No icon fonts, no custom SVG sets.

## 4. Fonts

| Font | Weights | Use | Source | Licence |
|---|---|---|---|---|
| **Manrope** | 400, 500, 600, 700 | All UI | [Google Fonts](https://fonts.google.com/specimen/Manrope) | SIL Open Font License 1.1 |
| **Fraunces** | 600 | Public marketing headlines only | [Google Fonts](https://fonts.google.com/specimen/Fraunces) | SIL Open Font License 1.1 |

Loaded via a single Google Fonts `<link>` in `client/index.html` with `display=swap`. Both licences
permit commercial use and embedding.
