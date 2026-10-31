# DESIGN.md — SunPower Solutions design system

The product should read like software a serious engineering company bought in 2019 and still relies on:
dense where it needs to be, calm, consistent, printed-document-adjacent. **Not** a landing-page template,
and **not** AI-generated. Section 13 is the checklist that keeps it that way.

---

## 1. Brand

**SunPower Solutions** — rooftop solar for homes and small factories.

**Mood:** trustworthy engineering company. Warm sunlight on deep navy. Think a well-printed technical
datasheet, a surveyor's clipboard, a switchgear label. Confident, plain, specific.

**Voice:** short, concrete, professional. Say what happened and what to do next.
- Good: "Dispatch incomplete — 1 × 540W panel not scanned."
- Good: "No surveys scheduled for today."
- Bad: "Oops! Something went wrong 😅", "Welcome to your dashboard!", "Let's get started!"

**Logo lockup:** wordmark `SunPower` in Manrope 700 `ink`, `Solutions` in Manrope 500 `muted`,
preceded by a 20px sun mark (`lucide-react` `Sun`, stroke 2, `sun` colour). No gradient, no glow.

---

## 2. Colour tokens

Defined once in `client/src/styles/index.css` as CSS variables, mapped into the Tailwind theme in
`client/tailwind.config.js`. **Components never use raw hex.**

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `ink` | `#0F1B2D` | `bg-ink` `text-ink` | Primary dark: sidebar, headings, body text, photo overlays |
| `ink-soft` | `#1E2A3E` | `bg-ink-soft` | Sidebar hover, secondary dark surfaces, topbar on dark layouts |
| `paper` | `#FAF8F3` | `bg-paper` | App background (warm off-white, never pure grey) |
| `surface` | `#FFFFFF` | `bg-surface` | Cards, tables, modals, inputs |
| `line` | `#E7E2D8` | `border-line` | Every border, divider, table rule |
| `muted` | `#6B7280` | `text-muted` | Labels, captions, secondary text, placeholder |
| `sun` | `#F59E0B` | `bg-sun` `text-sun` | **The one accent.** Primary buttons, active nav, focus rings, chart key series |
| `sun-deep` | `#D97706` | `hover:bg-sun-deep` | Primary button hover/active |
| `leaf` | `#15803D` | `text-leaf` | Success, paid, approved, active warranty, profit |
| `sky` | `#0369A1` | `text-sky` | Info, in-progress, scheduled, links |
| `alert` | `#B91C1C` | `text-alert` | Danger, destructive, loss, expired, rejected |
| `amber-soft` | `#FEF3C7` | `bg-amber-soft` | Warning/pending backgrounds, highlighted table rows, sun-tinted badges |

**Derived tints** (for badge backgrounds only, declared as variables, not computed in components):
`leaf-soft #DCFCE7`, `sky-soft #E0F2FE`, `alert-soft #FEE2E2`, `ink-tint #F1F3F6`.

### Forbidden
No purple. No neon. No multi-stop gradients. No glassmorphism, no backdrop blur.
No second accent colour — `sun` is the only one. Status colours are semantic, not decorative.

### CSS variables

```css
:root {
  --ink: #0F1B2D;        --ink-soft: #1E2A3E;   --ink-tint: #F1F3F6;
  --paper: #FAF8F3;      --surface: #FFFFFF;    --line: #E7E2D8;
  --muted: #6B7280;
  --sun: #F59E0B;        --sun-deep: #D97706;   --amber-soft: #FEF3C7;
  --leaf: #15803D;       --leaf-soft: #DCFCE7;
  --sky: #0369A1;        --sky-soft: #E0F2FE;
  --alert: #B91C1C;      --alert-soft: #FEE2E2;
  --radius-input: 6px;   --radius-card: 10px;
  --shadow-sm: 0 1px 2px rgba(15, 27, 45, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 27, 45, 0.10);
}
```

The app is light-mode only. A dark theme is out of scope for the hackathon; do not add one
half-finished.

---

## 3. Typography

**UI: Manrope** — 400, 500, 600, 700. **Marketing headlines only: Fraunces** — 600, on the public
site hero and section titles. Fraunces never appears inside the app.

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600&display=swap" rel="stylesheet">
```

| Name | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 40 / 48 | Fraunces 600 | Public hero headline only |
| `h1` | 28 / 36 | 600 | Page title in `PageHeader` |
| `h2` | 22 / 30 | 600 | Section heading, modal title |
| `h3` | 18 / 26 | 600 | Card title, drawer title |
| `body` | 15 / 24 | 400 | Default text |
| `body-strong` | 15 / 24 | 500 | Emphasis, table row primary cell |
| `small` | 13 / 20 | 400 | Captions, helper text, table secondary cell |
| `label` | 13 / 18 | 500 | Form labels, table headers (also `tracking-wide`) |
| `micro` | 11 / 16 | 600 | Badge text, overline (`uppercase tracking-wider`) |
| `mono` | 13 / 20 | 500 | Serial numbers, codes, references (`ui-monospace`) |

**Numbers.** Every money or quantity column uses tabular figures and right alignment:

```css
.tnum { font-variant-numeric: tabular-nums; }
```

Serial numbers, `ENQ-`/`QT-`/`PRJ-`/`DSP-`/`TKT-`/`INV-` codes and payment references render in
`mono` so a technician can read them aloud over the phone.

---

## 4. Spacing, radius, shadows

**4px grid.** Allowed steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Nothing else.

| Context | Spacing |
|---|---|
| Inside a badge | 2px / 8px |
| Inside a button (md) | 10px / 16px |
| Card padding | 20px (24px on desktop) |
| Table cell | 12px / 16px |
| Form field gap | 16px |
| Section gap | 32px |
| Page gutter | 16px mobile, 24px tablet, 32px desktop |

**Radius:** `6px` inputs, buttons, badges, small controls. `10px` cards, modals, drawers, photo
frames. Nothing is fully rounded except `Avatar` and the notification dot.

**Shadows — two levels only:**
- `shadow-sm` — raised surfaces at rest (sticky table header, field-layout bottom bar).
- `shadow-md` — overlays only (modal, drawer, dropdown, toast).

Everything else uses a **1px `line` border**. Borders over shadows is the house style; a page should
look like it was drawn with a pen, not airbrushed.

---

## 5. Component inventory

All in `client/src/components/ui/`, owned by Member A. Every component: `className` passthrough
merged with `cn()`, forwarded ref where it wraps a DOM element, and no inline style objects.

### Button
`variant`: `primary` | `secondary` | `outline` | `ghost` | `danger` | `link`
`size`: `sm` (32px) | `md` (40px) | `lg` (48px — field layouts)
`props`: `leadingIcon`, `trailingIcon`, `loading`, `disabled`, `fullWidth`, `as`

| Variant | Default | Hover | Focus | Disabled | Loading |
|---|---|---|---|---|---|
| `primary` | `bg-sun` `text-ink` 600 | `bg-sun-deep` | 2px `sun` ring, 2px offset | `opacity-50` + `cursor-not-allowed` | spinner replaces leading icon, label stays, pointer-events off |
| `secondary` | `bg-ink` `text-white` | `bg-ink-soft` | same | same | same |
| `outline` | `bg-surface` `border-line` `text-ink` | `bg-ink-tint` | same | same | same |
| `ghost` | transparent `text-ink` | `bg-ink-tint` | same | same | same |
| `danger` | `bg-alert` `text-white` | darker `alert` | 2px `alert` ring | same | same |
| `link` | `text-sky` underline-offset-2 | underline | same | `text-muted` | — |

Press: `active:scale-[0.98]`, 90ms. Never two `primary` buttons in one action group.

### IconButton
Square 32/40/48px, `ghost` or `outline`, **`aria-label` required**, optional `tooltip`.
48px in field layouts.

### Input
`label` (required), `hint`, `error`, `prefix`, `suffix`, `required`, `disabled`, `readOnly`.
Height 40px (48px field). `border-line`, `rounded-[6px]`, `bg-surface`, `placeholder:text-muted`.
Focus: `border-sun` + 2px `sun` ring. Error: `border-alert` + message below in `small text-alert`
with `aria-describedby`. Disabled: `bg-ink-tint text-muted`.
Money inputs get an `₹` prefix and `.tnum`.

### Textarea
Same tokens, 3 rows default, `resize-y`, optional character counter.

### Select
Native `<select>` styled to match `Input`, with a `ChevronDown` suffix. Options come from
`client/src/lib/constants.js` — never hard-coded in a screen.

### Checkbox / Radio
18px box, `border-line`, checked `bg-sun` with `ink` check/dot, 2px `sun` focus ring, label clickable,
44px minimum touch row on mobile.

### Switch
40×22px track, `ink-tint` off / `sun` on, 18px white knob, 150ms ease-out, `role="switch"`.
For settings, not for form submission.

### DateInput
Native `date` / `datetime-local` styled as `Input`, with a `Calendar` suffix icon. Displays IST,
submits ISO.

### FileDropzone
Dashed `line` border, `rounded-[10px]`, `paper` fill, `Upload` icon + "Drag photos here or tap to
choose". Drag-over: `border-sun` `bg-amber-soft`. Shows a 64px thumbnail grid with filename, size and
a remove `IconButton`; a per-file progress bar while uploading; a per-file `alert` message on
rejection. Accepts jpg/png/webp/pdf, 5 MB (SECURITY.md). On mobile, `capture="environment"` so the
camera opens directly.

### Card
`bg-surface`, `border-line`, `rounded-[10px]`, `p-5` / `md:p-6`.
Slots: `title`, `description`, `actions`, `footer`. Optional `padded={false}` for a table inside a card.

### StatCard
Label (`label text-muted uppercase`), value (`h1 .tnum`), delta chip (`leaf` with `ArrowUp` / `alert`
with `ArrowDown` / `muted` "no change" — always with the comparison period: "vs last month"),
and a `sparkline` slot (recharts, 40px tall, `sun` stroke, no axes, no grid, no tooltip).
Loading: three skeleton bars.

### DataTable
The workhorse. Props: `columns`, `rows`, `loading`, `empty`, `onRowClick`, `sort`, `onSortChange`,
`page`, `pageSize`, `total`, `onPageChange`, `rowKey`, `stickyHeader`, `dense`.
- Header: `label` weight 500, `uppercase tracking-wide text-muted`, `bg-paper`, bottom `line` border,
  sticky under the topbar when `stickyHeader`.
- Rows: 48px (`dense` 40px), bottom `line` border, `hover:bg-paper`, `cursor-pointer` when clickable,
  `focus-visible` ring for keyboard row navigation.
- Column `align: 'right'` + `numeric: true` applies `.tnum` and right alignment — mandatory for money.
- Sorting: clickable header with `ChevronUp`/`ChevronDown`; only one sort at a time.
- Loading: 5 skeleton rows matching the column widths (never a spinner over the table).
- Empty: `EmptyState` spanning the full width inside the table frame.
- Mobile (< 768px): each row collapses into a stacked card — primary cell as the title, the rest as
  label/value pairs. Tables never scroll horizontally on a phone.

### StatusBadge
`micro` text, `rounded-[6px]`, `px-2 py-0.5`, tinted background + matching text, **no icon, no dot**.
One colour per enum value — the full mapping lives in `client/src/lib/constants.js` and must match
this table exactly:

| Enum | Value | Background / text |
|---|---|---|
| **LeadStatus** | `NEW` | `sky-soft` / `sky` |
| | `CONTACTED` | `sky-soft` / `sky` |
| | `QUALIFIED` | `leaf-soft` / `leaf` |
| | `NOT_QUALIFIED` | `ink-tint` / `muted` |
| | `SURVEY_SCHEDULED` | `amber-soft` / `sun-deep` |
| | `SURVEY_DONE` | `amber-soft` / `sun-deep` |
| | `SURVEY_APPROVED` | `leaf-soft` / `leaf` |
| | `SURVEY_REJECTED` | `alert-soft` / `alert` |
| | `QUOTED` | `sky-soft` / `sky` |
| | `WON` | `leaf-soft` / `leaf` |
| | `LOST` | `ink-tint` / `muted` |
| **SurveyStatus** | `SCHEDULED` | `sky-soft` / `sky` |
| | `IN_PROGRESS` | `amber-soft` / `sun-deep` |
| | `SUBMITTED` | `amber-soft` / `sun-deep` |
| | `APPROVED` | `leaf-soft` / `leaf` |
| | `REJECTED` | `alert-soft` / `alert` |
| | `CANCELLED` | `ink-tint` / `muted` |
| **QuoteStatus** | `DRAFT` | `ink-tint` / `muted` |
| | `SENT` | `sky-soft` / `sky` |
| | `ACCEPTED` | `leaf-soft` / `leaf` |
| | `REJECTED` | `alert-soft` / `alert` |
| | `EXPIRED` | `ink-tint` / `muted` |
| **ProjectStatus** | `AWAITING_ADVANCE` | `amber-soft` / `sun-deep` |
| | `CONFIRMED` | `sky-soft` / `sky` |
| | `PACKING` | `sky-soft` / `sky` |
| | `DISPATCHED` | `sky-soft` / `sky` |
| | `DELIVERED` | `sky-soft` / `sky` |
| | `INSTALLATION_SCHEDULED` | `amber-soft` / `sun-deep` |
| | `INSTALLING` | `amber-soft` / `sun-deep` |
| | `INSTALLED` | `leaf-soft` / `leaf` |
| | `CLOSED` | `ink-tint` / `muted` |
| | `CANCELLED` | `alert-soft` / `alert` |
| **SerialStatus** | `IN_STOCK` | `leaf-soft` / `leaf` |
| | `RESERVED` | `amber-soft` / `sun-deep` |
| | `DISPATCHED` | `sky-soft` / `sky` |
| | `DELIVERED` | `leaf-soft` / `leaf` |
| | `UNDER_REPAIR` | `amber-soft` / `sun-deep` |
| | `REPLACED` | `ink-tint` / `muted` |
| | `RETURNED` | `ink-tint` / `muted` |
| | `SCRAPPED` | `alert-soft` / `alert` |
| **DispatchStatus** | `PENDING` | `ink-tint` / `muted` |
| | `PACKING` | `amber-soft` / `sun-deep` |
| | `READY` | `sky-soft` / `sky` |
| | `DISPATCHED` | `sky-soft` / `sky` |
| | `DELIVERED` | `leaf-soft` / `leaf` |
| **InstallationStatus** | `UNSCHEDULED` | `ink-tint` / `muted` |
| | `SCHEDULED` | `sky-soft` / `sky` |
| | `IN_PROGRESS` | `amber-soft` / `sun-deep` |
| | `COMPLETED` | `leaf-soft` / `leaf` |
| **TicketStatus** | `OPEN` | `alert-soft` / `alert` |
| | `ASSIGNED` | `sky-soft` / `sky` |
| | `IN_PROGRESS` | `amber-soft` / `sun-deep` |
| | `AWAITING_PARTS` | `amber-soft` / `sun-deep` |
| | `RESOLVED` | `leaf-soft` / `leaf` |
| | `CLOSED` | `ink-tint` / `muted` |
| | `REOPENED` | `alert-soft` / `alert` |
| **InvoiceStatus** | `DRAFT` | `ink-tint` / `muted` |
| | `ISSUED` | `sky-soft` / `sky` |
| | `PARTIALLY_PAID` | `amber-soft` / `sun-deep` |
| | `PAID` | `leaf-soft` / `leaf` |
| | `CANCELLED` | `ink-tint` / `muted` |
| **SubsidyStatus** | `NOT_STARTED` | `ink-tint` / `muted` |
| | `DOCUMENTS_PENDING` | `amber-soft` / `sun-deep` |
| | `APPLIED` | `sky-soft` / `sky` |
| | `INSPECTION_DONE` | `sky-soft` / `sky` |
| | `APPROVED` | `leaf-soft` / `leaf` |
| | `DISBURSED` | `leaf-soft` / `leaf` |
| | `REJECTED` | `alert-soft` / `alert` |
| **PayoutStatus** | `DRAFT` | `ink-tint` / `muted` |
| | `APPROVED` | `sky-soft` / `sky` |
| | `PAID` | `leaf-soft` / `leaf` |
| **WarrantyStatus** | `ACTIVE` | `leaf-soft` / `leaf` |
| | `EXPIRED` | `ink-tint` / `muted` |
| | `VOID` | `alert-soft` / `alert` |
| **TicketPriority** | `LOW` | `ink-tint` / `muted` |
| | `MEDIUM` | `sky-soft` / `sky` |
| | `HIGH` | `amber-soft` / `sun-deep` |
| | `CRITICAL` | `alert-soft` / `alert` |

### Tabs
Underline style: 2px `sun` under the active tab, `text-ink` 600 active, `text-muted` inactive,
`hover:text-ink`. Bottom `line` border across the row. Keyboard arrow navigation,
`role="tablist"`. Horizontally scrollable on mobile with no visible scrollbar.

### Modal
Centered, `max-w-lg` (`sm`/`md`/`lg`), `rounded-[10px]`, `shadow-md`, `ink/40` backdrop.
Title `h2`, close `IconButton` top-right, footer right-aligned with secondary then primary.
Focus trapped, focus returns to the trigger on close, `Esc` closes, backdrop click closes unless
`dismissible={false}`. Body scrolls; header and footer stay.
**Use for short confirmations and small forms only.** Detail views go in a `Drawer`.

### Drawer
Right side, `w-full sm:w-[480px] lg:w-[560px]`, full height, `shadow-md`, `ink/40` backdrop.
Header: title + subtitle + close. Body scrolls. Optional sticky footer for actions.
This is the detail view for a lead, a project, a serial, a ticket — the list stays visible behind it.
On mobile it becomes a bottom sheet (90vh, rounded top corners, drag handle).

### ConfirmDialog
Built on `Modal`, `sm`. Props: `title`, `message`, `confirmLabel`, `variant` (`danger` | `primary`),
`onConfirm`, `loading`. The message always names the consequence in plain words:
"Cancel project PRJ-2026-0012? Reserved stock returns to inventory and the installation job is removed."

### Stepper / Timeline
Two forms, one component family.
- **Stepper** (horizontal, desktop): the project journey — Enquiry · Survey · Quote · Confirmed ·
  Dispatched · Delivered · Installed · Closed. Complete = `leaf` filled circle with `Check`;
  current = `sun` filled with the index; future = `surface` with `line` border and `muted` index.
  Connector: 2px `leaf` behind complete steps, `line` ahead.
- **Timeline** (vertical, always on mobile): dated events down a 2px `line` rail with 10px dots —
  `leaf` done, `sun` current, `line` pending. Each item: title, actor, timestamp, optional detail.
  Used for the project journey, the lead activity log, the serial history and the ticket log.

### PageHeader
Breadcrumb (`small text-muted`, `/` separators) · `h1` title · optional subtitle · right-aligned
action buttons. Optional `backgroundImage`: 180px tall, `object-cover`, with a **70% `ink` overlay**
and white text. Used on section landing pages only — never above a table or a form.

### EmptyState
Centered, `py-16`. A 96px photo in a `rounded-[10px]` frame **or** a 40px `lucide` icon in a
`ink-tint` circle, then `h3` title, then **one** helpful sentence in `small text-muted`, then one
primary action.
"No dispatches ready to pack. Pick lists appear here as soon as an order is confirmed."
Never an exclamation mark. Never "Nothing here yet!".

### Skeleton
`bg-ink-tint`, `rounded-[6px]`, shimmer via a 1.4s linear-gradient sweep. Variants: `text`
(single line, randomised 60–90% width), `block` (given height), `circle`, `card`, `table` (n rows ×
column widths). Shapes match the real content so the layout does not jump.

### Toast (sonner)
Top-right desktop, bottom-centre mobile (above the tab bar). `surface` background, `line` border,
`rounded-[10px]`, `shadow-md`, 4px left bar in `leaf` / `alert` / `sky`. One line of text, optional
action link. 4s success, 6s error, errors dismissible. No emojis, no icons beyond the colour bar.

### Avatar
Circle, 24/32/40px. Initials from the user's name in `ink` on `amber-soft`, `micro` weight 600.
No generated cartoon faces.

### Pagination
"Showing 21–40 of 128" in `small text-muted` on the left; `Previous` / `Next` `outline` buttons plus
numbered pages (first, last, current ±1, ellipses) on the right. Mobile: just Previous / Next with
the count between.

### SearchInput
`Search` leading icon, 300ms debounce, clear `IconButton` when non-empty, `placeholder` naming the
fields searched: "Search by name, phone, serial or project code". `role="searchbox"`; `Esc` clears.
The global topbar version opens a dropdown of grouped results (Customers / Projects / Serials /
Tickets / Leads).

### FilterBar
A horizontal row above a table: `Select`s and `DateInput`s, a "Clear filters" `link` button when any
filter is set, and the active count. Filters sync to the URL query string so a filtered list is a
shareable link. Collapses into a "Filters (2)" `Drawer` trigger below 768px.

### Money and Date display helpers
Not components — formatting functions in `client/src/lib/format.js`, so every screen renders the
same way. See section 11.

---

## 6. Motion

`framer-motion`, used sparingly. Motion should feel like a page turning, not a toy bouncing.

| Element | Animation | Duration / easing |
|---|---|---|
| Route transition | opacity 0 → 1, `y` 8px → 0 | 180ms `easeOut` |
| Modal | backdrop fade; panel opacity + `scale` 0.98 → 1 | 200ms `easeOut` |
| Drawer | slide `x` 100% → 0 (mobile: `y`) | 200ms `easeOut` |
| List / table rows | fade + 4px rise, **stagger 30ms**, first 12 items only | 150ms `easeOut` |
| Button press | `scale` 0.98 | 90ms |
| Accordion / collapse | height auto | 180ms `easeOut` |
| Skeleton | background-position shimmer | 1.4s linear, infinite |
| Toast | slide in from the edge + fade | 200ms `easeOut` |
| Scan feedback | one 150ms background flash (`leaf-soft` or `alert-soft`) on the line | 150ms |

**No springs with bounce. No `rotate`. No infinite animation except the skeleton and the loading
spinner. Nothing longer than 220ms** (the skeleton excepted). Never animate `width`, `height` or
`top`/`left` where `transform` works.

```js
// Respect the OS setting. Put this in client/src/lib/motion.js and use it everywhere.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fadeRise = reduce
  ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } }
  : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, ease: 'easeOut' } };
```

Under `prefers-reduced-motion: reduce`: no transform animation anywhere, shimmer becomes a static
tint, and the scan flash becomes a persistent border instead.

---

## 7. Imagery

Photos come **only** from `client/src/assets/images/`, every one credited in
[`ASSETS.md`](ASSETS.md). No illustration packs, no 3D renders, no "AI" art, no icon-with-gradient-blob
hero graphics.

**Subject matter:** real rooftop solar work in India — panels on an RCC roof, a technician with a
drill on a mounting rail, an inverter on a wall, a warehouse aisle of panel cartons, a small factory
roof array, a residential terrace at golden hour. People in work clothes, not models in hard hats
pointing at a tablet.

**Where photos are allowed**

| Place | Treatment |
|---|---|
| Public landing hero | Full-width, 520px desktop / 360px mobile, `ink` gradient from the left at 60% so the headline reads |
| Auth split screen | Left half, full height, `object-cover`, 25% `ink` overlay, small caption bottom-left |
| `PageHeader` background | 180px, **70% `ink` overlay**, white title |
| `EmptyState` | 96px square, `rounded-[10px]`, no overlay |
| Public section banners | 240px, 50% `ink` overlay |
| Public package cards | 160px top image |

**Never** behind a table, a form, a dashboard metric, a modal or a drawer. Data surfaces stay plain
`surface` or `paper`.

**Technical rules**

- WebP, with a JPEG fallback via `<picture>` for the hero.
- Explicit `width` and `height` on every `<img>` — no layout shift, ever.
- `loading="lazy"` and `decoding="async"` on everything below the fold; the hero is `eager` +
  `fetchpriority="high"`.
- Hero ≤ 250 KB, banners ≤ 120 KB, empty-state images ≤ 25 KB.
- `alt` describes the scene for a screen reader ("Technician fastening a solar panel to a rooftop
  mounting rail"), or `alt=""` when purely decorative.
- `object-cover` with `object-position` chosen per image so faces and panels are never cropped badly.

---

## 8. Layouts

Four shells in `client/src/components/layout/`, picked by the route, not by the role.

### 8.1 PublicLayout — marketing site
- Sticky top nav, 72px, `surface` with a bottom `line` border: logo left; Packages · How it works ·
  Subsidy · Contact centre; `Sign in` (`outline`) + `Get a quote` (`primary`) right.
- Mobile: logo + hamburger → full-screen `ink` sheet.
- Content max-width 1200px, Fraunces headlines.
- Footer: `ink` background, four columns (Company · Packages · Support · Contact with a real address,
  phone and GSTIN from settings), bottom bar with copyright. No newsletter box.

### 8.2 AuthLayout — login, register, change password
- Split screen. **Left 45%**: rooftop photo, full height, 25% `ink` overlay, logo top-left in white,
  a one-line caption bottom-left ("Over 1,200 rooftops powered across Gujarat").
- **Right 55%**: `paper`, centred 400px form card — `h2` title, one line of helper text, fields,
  full-width `primary` submit, secondary link below.
- Below 1024px the photo collapses to a 160px top banner.
- Errors inline above the submit button, never as a toast.

### 8.3 AppLayout — desktop staff shell
```
┌─────────────┬──────────────────────────────────────────────────┐
│             │  Topbar 64px: search · bell · user menu          │
│  Sidebar    ├──────────────────────────────────────────────────┤
│  248px      │  PageHeader                                      │
│  ink        │                                                  │
│  (64px      │  Page content — max-w-[1400px], px-8, py-6       │
│  collapsed) │                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```
- **Sidebar**: `ink` background, 248px, collapsible to 64px (icons only, label tooltips); the state
  persists in `localStorage`. Logo block 64px tall at the top. Nav items 40px, 13px label,
  `lucide` icon 18px; active = `ink-soft` background with a 3px `sun` left bar and white text;
  hover = `ink-soft`. Optional group headings in `micro uppercase` `muted`. Items come from
  `client/src/config/navigation/<role>.js` — a screen never hard-codes nav.
- **Topbar**: `surface`, bottom `line` border. Collapse toggle, global `SearchInput` (max 420px,
  `⌘K` / `Ctrl+K`), `NotificationBell`, `UserMenu`.
- **NotificationBell**: `Bell` icon with a `sun` dot when unread; the dropdown lists the last 10 with
  title, body, relative time, unread rows on `amber-soft`; "Mark all as read" + "View all".
- **UserMenu**: `Avatar` + name + role label; menu: Profile, Change password, Sign out.
- Below 1024px the sidebar becomes an off-canvas drawer behind a hamburger.
- Content background `paper`, so white cards read as raised without a shadow.

### 8.4 FieldLayout — technician mobile shell
For `SURVEY_TECHNICIAN` and `INSTALLATION_TECHNICIAN`, and reused for the customer portal on a phone.
- **Top bar** 56px: `ink`, job title or screen name centred, back `IconButton` left, bell right.
- **Content**: `paper`, `px-4 py-4`, bottom padding of 88px so the tab bar never covers anything.
- **Bottom tab bar**: 64px, `surface`, top `line` border, `shadow-sm`, 3–4 items, 22px icon over an
  11px label, active in `sun` with the icon filled, `env(safe-area-inset-bottom)` respected.
- **Sticky primary action**: a 48px full-width `primary` button in a `surface` bar with a top `line`
  border, pinned directly above the tab bar on any form screen ("Submit survey", "Complete
  installation"). It stays visible while the form scrolls.
- **Tap targets ≥ 48px.** Inputs 48px, `font-size: 16px` so iOS does not zoom on focus.
- One column only. Forms are grouped into labelled sections with `h3` headings, no multi-column rows.
- Photo capture goes straight to the camera (`capture="environment"`).

---

## 9. Responsive

| Breakpoint | Width | Shape |
|---|---|---|
| base | 360–639 | One column. Tables become stacked cards. Bottom tab bar in `FieldLayout`. Drawer = bottom sheet. Page gutter 16px. |
| `sm` | 640 | Two-column stat grids. Filters still collapsed. |
| `md` | 768 | Real tables appear. Filters inline. Drawer slides from the right. Gutter 24px. |
| `lg` | 1024 | Sidebar becomes permanent. 3-column stat grids. Split detail layouts. Gutter 32px. |
| `xl` | 1280 | 4-column stat grids. Content caps at 1400px. |

**360px is a hard requirement** for every `SURVEY_TECHNICIAN`, `INSTALLATION_TECHNICIAN` and
`CUSTOMER` screen: no horizontal page scroll, no truncated label that matters, no control under 44px,
every form submittable one-handed. Test at 360×640 before calling anything done.

Warehouse scanning screens must also work at 768px (tablet, landscape and portrait) — the serial
input stays reachable with the on-screen keyboard open.

---

## 10. Accessibility

- **Focus is always visible:** `focus-visible:ring-2 ring-sun ring-offset-2 ring-offset-surface`.
  Never `outline: none` without a replacement.
- Every input has a real `<label>` (not a placeholder standing in for one). Errors are linked by
  `aria-describedby` and announced with `role="alert"`.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI borders. `ink` on `paper` is 14.8:1; `muted` on `surface`
  is 4.8:1; `ink` on `sun` is 7.9:1 — **so `sun` buttons carry `ink` text, never white.**
  `sun` text on `surface` fails, so `sun` is never used for body copy.
- Modals and drawers trap focus, restore it on close, and close on `Esc`. Background content gets
  `aria-hidden`.
- Tables: `<th scope="col">`, a `<caption>` when the heading is not adjacent, sortable headers as
  `<button>` with `aria-sort`.
- Status is never colour-only — the badge always carries its label text.
- Icon-only buttons always have `aria-label`.
- Keyboard: every action reachable by `Tab`; a "Skip to content" link first in `AppLayout`;
  `⌘K`/`Ctrl+K` for search; `Esc` to close any overlay.
- Loading regions get `aria-busy="true"`; toasts live in an `aria-live="polite"` region.
- The signature pad has a typed-name fallback for anyone who cannot draw on the screen.

---

## 11. Formatting

All in `client/src/lib/format.js`. Screens call these; they never format inline.

| Thing | Format | Example | Implementation |
|---|---|---|---|
| Money | INR, en-IN grouping, no decimals when whole | `₹1,50,000` · `₹1,50,000.50` | `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })` |
| Money (compact, stat cards) | | `₹1.5L` · `₹12.4L` · `₹1.2Cr` | lakh/crore, one decimal |
| Negative money | parentheses + `alert` | `(₹12,400)` | never a minus sign in a table |
| Date | `d MMM yyyy` | `31 Oct 2026` | |
| Date + time | `d MMM yyyy, h:mm a` IST | `31 Oct 2026, 2:30 pm` | `timeZone: 'Asia/Kolkata'` |
| Time only | 12h lowercase | `2:30 pm` | |
| Relative | under 7 days, then absolute | `4 hours ago` · `2 days ago` · `18 Sep 2026` | |
| Duration | | `3h 20m` | from `TimeLog.minutes` |
| Phone | `+91 98765 43210` | | stored as 10 digits, displayed grouped |
| Capacity | one decimal + unit | `3.0 kW` · `5.5 kW` | |
| Percent | one decimal | `18.0%` · `31.4%` | |
| Quantity | integer + unit | `12 pcs` · `45 m` · `1 set` | unit from `Product.unit` |
| Serial / code | `mono`, uppercase, never truncated mid-string | `INV-SG5K-2024-00318` | ellipsis only at the end |
| Area | | `420 sqft` | |
| Pincode | | `380015` | |

Dates are stored in UTC and displayed in IST, always. The server never formats for display.

---

## 12. Charts (recharts)

- Primary series `sun`; comparison series `ink-soft`; positive `leaf`, negative `alert`, neutral
  `sky`. Never more than four series on one chart.
- Grid: horizontal `line` strokes only, no vertical lines, no chart border.
- Axes: `small text-muted`, no axis lines, money on the Y axis in compact form (`₹1.5L`).
- Tooltip: `surface` card, `line` border, `rounded-[6px]`, `shadow-md`, label + formatted value.
- Bars: 6px top radius, 24px max width. Lines: 2px stroke, dots only on hover.
- Every chart has a title, the period it covers, and an `EmptyState` when there is no data.
- No pie chart with more than four slices; no donut with a number in the hole; no 3D; no animation
  longer than 300ms.

---

## 13. "Does not look AI-generated" checklist

Run this before every commit that touches UI.

- [ ] **No emojis anywhere in the product.** Not in headings, buttons, toasts, empty states or seed data.
- [ ] **No sparkle, wand, rocket or magic icons.** `lucide-react` only, and only literal icons —
      `Sun` for solar, `Package` for dispatch, `Wrench` for service.
- [ ] **No "Welcome to your dashboard!"**, no "Let's get started", no "You're all set!", no
      exclamation marks in UI copy at all.
- [ ] **No lorem ipsum, no `Foo Bar`, no `test@test.com`, no `John Doe`.**
- [ ] **Realistic Indian data everywhere** — Vipul Mehta, Fatima Shaikh, Harpreet Kaur; 14 Shantivan
      Society, Satellite, Ahmedabad 380015; `+91 98250 41122`; ₹1,42,500; Luminous / Tata Power
      Solar / Waaree as brands; GSTIN `24AABCS1429P1ZV`.
- [ ] **One accent colour** (`sun`). Status colours are the only other colours, and they are semantic.
- [ ] **No gradient blobs, no decorative glows, no floating shapes, no glassmorphism, no mesh backgrounds.**
- [ ] **No generic stock illustration** (people-with-laptops SVGs, isometric servers, "AI" brains).
      Real photographs or nothing.
- [ ] **Copy is specific.** "Scan every inverter and battery before dispatch" beats "Manage your
      inventory efficiently". No marketing adjectives inside the app — no "powerful", "seamless",
      "effortless", "robust".
- [ ] **Real error messages** that say what failed and what to do: "Serial INV-SG5K-2024-00318 is
      already on project PRJ-2026-0003." Never "Something went wrong."
- [ ] **Aligned grids.** Money right-aligned and tabular; labels consistently placed; card paddings
      identical across a page; no 1px drift.
- [ ] **Consistent density.** A table row is 48px on every screen. A card pad is 20px on every screen.
- [ ] **Buttons are verbs matching the domain** — "Approve survey", "Record payment",
      "Confirm order", "Complete installation". Never "Submit", "OK", "Click here", "Save changes"
      where something more specific is true.
- [ ] **Numbers look real.** 40 projects a month, 15 technicians, ₹45,000/kW, 18% GST, 240-month
      panel warranty. No `1234`, no `$999`, no 100% margins.
- [ ] **No centred text in data-dense areas.** Left-align text, right-align numbers.
- [ ] **No full-page spinner.** Skeletons shaped like the content that is coming.
- [ ] **No shadow stack.** Two shadow levels exist; everything else uses a 1px `line` border.
- [ ] **Empty states say what will appear and why**, with one action. No shrugging mascots.
