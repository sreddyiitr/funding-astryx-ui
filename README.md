# funding-astryx-ui

Backoffice web app for auto-loan **funding**. Funders work a queue of applications, review the key deal
facts at a glance, and clear the funding tasks (VIN, title and lien, income, TILA, and so on) that stand
between an application and funding.

Built with Meta's [Astryx](https://github.com/meta/astryx) design system (`@astryxdesign/core`) on
React 19, Vite and StyleX. Data comes from the sibling **`funding-graphql`** API.

![Demo: filtering the funding queue, opening an application, and reviewing its funding tasks](docs/demo.webp)

```
browser ──▶ Vite dev server :5173 ──/graphql proxy──▶ funding-graphql :4000 ──▶ Postgres (funding-db) :5432
```

---

## Contents

- [Quick start](#quick-start)
- [Features](#features)
- [Shareable URLs](#shareable-urls)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [GraphQL API used](#graphql-api-used)
- [Theme](#theme)
- [Working with Astryx](#working-with-astryx)
- [Troubleshooting](#troubleshooting)

---

## Quick start

**Prerequisites:** Node.js 20+ (developed on Node 24), npm, and Docker Desktop for the API and database.

```bash
# 1. Database (sibling project)
cd ../funding-db && docker compose up -d

# 2. GraphQL API (sibling project). Needs the application filters added on the
#    feature/application-filters branch.
cd ../funding-graphql && docker compose up -d --build
curl localhost:4000/actuator/health          # {"status":"UP"}

# 3. This UI
cd ../funding-astryx-ui
npm install
npm run dev                                  # http://localhost:5173
```

The dev server proxies `/graphql` to `http://localhost:4000`, so the browser stays same-origin and the
API needs no CORS setup.

---

## Features

### Funding queue (left panel)

| Control | What it does |
| --- | --- |
| **Search** | Partial, case-insensitive match on application ID or deal number |
| **Status** | Views: **Needs action** (default: ready to fund, pending stips, pending verification, exception hold), **All not funded**, **All statuses**, or any single status |
| **Task type** | Only applications with a task of this category (VIN verification, title and lien, …) |
| **Task status** | Only applications with a task in this status (pending review, discrepancy, …). Combined with Task type, both must match **the same task** |
| **Reset** | Restores the default filters (shown only when a filter is active) |

Filtering runs on the server. The list loads 25 rows at a time, with **Load more** for the next page.
Each card shows the applicant, status, application ID and deal number, dealer and state, and the time
left before the SLA deadline (green more than 2h, amber under 2h, red when breached).

### Application hero

The header shows the application ID, submission time, applicant name and status. A status selector
lets you move the application to another status. Below it are 10 key fields:

| | | | | |
| --- | --- | --- | --- | --- |
| Applicant (and co-applicant) | Deal number (and state) | Dealer | Vehicle (model, trim, condition, mileage) | VIN |
| Amount financed (and LTV) | APR · term | Monthly payment (and DTI) | FICO (and verified or stated income) | SLA (and cutoff), or funded date |

### Funding tasks

- A progress bar shows how many tasks are **cleared** (verified or waived).
- An **All / Open** toggle. Open tasks are listed first: discrepancy, then pending review, then expired.
- Each task card shows its category, status, description, who verified it, and when it was last
  updated. A status selector changes the task's status.
- Each card has an expandable **Activity** list with that task's events. Cards with a discrepancy
  start expanded.

### Application activity

Events not tied to a task (submitted, status changes, …) and an **Add note** box.

### Acting as

Status changes and notes are recorded against a user name, the `actor` in the API. Pick who you are
in the **Acting as** menu (top right). It defaults to the first user with the FUNDER role and is saved
in `localStorage` (`funding.actor`). The API rejects names it doesn't know. When it does, the app shows
the error as a toast notification and nothing is changed.

---

## Shareable URLs

The selected application and every queue filter are in the query string, so any view can be
bookmarked or shared:

```
http://localhost:5173/?view=not_funded&task=VIN_VERIFICATION&taskStatus=DISCREPANCY_FLAGGED&app=app_9084781
```

| Param | Values | Default |
| --- | --- | --- |
| `app` | Application ID to open | none |
| `q` | Search text | empty |
| `view` | `open`, `not_funded`, `all`, or a status such as `EXCEPTION_HOLD` | `open` |
| `task` | Task category, such as `INCOME_VERIFICATION` | any |
| `taskStatus` | Task status, such as `PENDING_REVIEW` | any |

- Parameters left at their default are not added to the URL.
- Unrecognized values are ignored, so a hand-edited link can't send an invalid value to the API.
- Changing a filter replaces the current history entry, so typing in search doesn't fill up the Back
  button. Opening an application adds an entry, so **Back** returns to the previous application.

---

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GRAPHQL_URL` | `http://localhost:4000` | Where `/graphql` is proxied by `npm run dev` and `npm run preview` |

```bash
GRAPHQL_URL=http://staging-host:4000 npm run dev
```

For a production deployment, serve `dist/` behind a reverse proxy that forwards `/graphql` to the API.
The app always calls the relative path `/graphql`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build, with the same `/graphql` proxy |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run astryx -- <cmd>` | The project's Astryx CLI, e.g. `npm run astryx -- component Table` |
| `npm run record:demo` | Re-record `docs/demo.webp` (see below) |

### Re-recording the demo

`scripts/record-demo.mjs` drives the running app with Playwright, draws captions and a cursor into the
page, records a video, and converts it to an animated WebP. It only filters, opens and expands; it never
saves a status change or a note, so it leaves the data unchanged.

```bash
brew install ffmpeg webp          # once: ffmpeg + img2webp
npx playwright install chromium   # once, if Playwright has no browser yet
npm run dev                       # in another terminal; the API must be up too
npm run record:demo               # writes docs/demo.webp (~1 MB, ~55 s)
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEMO_URL` | `http://localhost:5173` | App to record |
| `DEMO_OUT` | `docs/demo.webp` | Output file |
| `DEMO_WIDTH` | `1200` | Output width in px (recorded at 1440×900) |
| `DEMO_FPS` | `8` | Frames per second in the WebP |
| `DEMO_KEEP` | not set | Keep the raw `.webm` and print its path |

The captions are in the script. Edit the `caption(...)` calls to change the wording or timing.

---

## Project structure

```
funding-astryx-ui/
├── index.html
├── vite.config.ts              # React + StyleX plugins, /graphql proxy
├── src/
│   ├── main.tsx                # Theme provider (funding theme, light mode), global CSS
│   ├── App.tsx                 # App shell: top nav, queue panel, detail; URL ↔ filter mapping
│   ├── globals.css             # Astryx reset + base styles
│   ├── astryx-themes.js        # GENERATED by `astryx theme add/use`; do not edit
│   ├── lib/
│   │   ├── api.ts              # GraphQL client, types, queries and mutations
│   │   ├── domain.ts           # Status/category labels and colours, money/percent/SLA formatting
│   │   └── hooks.ts            # useAsync, useDebounced, useUrlParam, useUrlState, useLocalStorage
│   ├── components/
│   │   ├── Queue.tsx           # Filters + application list + paging
│   │   ├── ApplicationView.tsx # Loads one application; wires mutations; layout of the page
│   │   ├── Hero.tsx            # Header + 10 stat tiles + application status selector
│   │   ├── Tasks.tsx           # Progress, All/Open toggle, task cards
│   │   └── ActivityTimeline.tsx# Event list used per task and for the application
│   └── themes/funding/         # GENERATED app copy of the theme; do not edit
├── scripts/record-demo.mjs     # Playwright → captioned docs/demo.webp
├── docs/demo.webp              # README demo (npm run record:demo)
├── themes/funding/             # Theme editor source (settings, palette, preview pictures)
├── AGENTS.md, GEMINI.md        # Astryx guide for AI coding agents (written by `astryx init`)
└── README.md
```

---

## GraphQL API used

All calls are in `src/lib/api.ts`.

| Operation | Used for |
| --- | --- |
| `applications(statuses, search, taskCategory, taskStatus, limit, offset)` | Queue. Asks for 26 rows to know whether a next page exists |
| `application(applicationId)` with `dealer`, `applicant`, `vehicle`, `loanTerms`, `tasks`, `activity(limit: 200)` | Hero, tasks and activity |
| `actors` | Acting as menu |
| `updateApplicationStatus(input)` | Hero status selector |
| `updateFundingTaskStatus(input)` | Task status selector |
| `addActivityEvent(input)` with `action: "NOTE_ADDED"` | Add note |

The `statuses`, `search`, `taskCategory` and `taskStatus` arguments were added to `funding-graphql` for
this app (branch `feature/application-filters`). They are optional and combine with AND. The existing
`status`, `dealerId`, `limit` and `offset` arguments work as before.

---

## Theme

The app uses a custom Astryx theme, **`funding`**, made with the Astryx theme editor:

- **Base:** Neutral (the maintained Astryx theme)
- **Accent:** indigo/violet `#5b4ee6` for primary buttons, links, focus, and selected items
- **Neutral:** slate `#64748b` (cool grays)
- **Mode:** light only
- **Selected items:** selected nav, pagination and segmented-control items use the accent tint and
  accent text

Status colours never use the accent, so "selected" and "status" can't be confused:

| Colour | Application status | Task status |
| --- | --- | --- |
| Blue (info) | Ready to fund | none |
| Amber | Pending stips, pending verification | Pending review |
| Red | Exception hold | Discrepancy |
| Green | Funded | Verified |
| Gray | Expired, declined, withdrawn | Waived, expired |

### Changing the theme

```bash
# see current settings, then change one thing
npx astryx experimental theme editor show funding
npx astryx experimental theme editor set funding accent '#4f46e5'
npx astryx experimental theme editor set funding corners pill

# ask how to do something in plain words
npx astryx experimental theme editor how "make cards less rounded"

# pictures of real components with the theme applied
npx astryx experimental theme editor show funding --png      # writes themes/funding/*.png
```

Every change rebuilds `src/themes/funding/`, which the app picks up straight away. Don't hand-edit
`src/themes/funding/` or `src/astryx-themes.js`.

---

## Working with Astryx

- **Start from components, not raw HTML.** Layout uses `VStack`, `HStack`, `Grid`, `Card`, `Layout`
  and `LayoutPanel`. Spacing uses the spacing steps (`gap={4}`, `padding={6}`), not pixel values.
- **Custom styles** use StyleX (`stylex.create` plus the `xstyle` prop) with design tokens from
  `@astryxdesign/core/theme/tokens.stylex`. See `Queue.tsx` for the selected-card style.
- **Look things up with the CLI:**
  ```bash
  npx astryx component Selector          # props and usage
  npx astryx search "date picker"        # find components, docs, templates
  npx astryx template --list --type page # page templates to start from
  npx astryx docs tokens                 # design tokens
  npx astryx doctor                      # check the setup
  ```
- **Icons:** Astryx's built-in names (`startIcon="search"`) or `lucide-react` components passed to
  `<Icon icon={...} />`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Queue shows **"Couldn't load applications"** | The API isn't running on :4000: `curl localhost:4000/actuator/health`. Start `funding-graphql`, or set `GRAPHQL_URL` |
| Validation error saying an argument such as `statuses`, `search` or `taskCategory` is unknown | The API is running an older build. Check out `feature/application-filters` in `funding-graphql` and run `docker compose up -d --build` |
| `role "funder_admin" does not exist` in the API logs | A local Homebrew Postgres has port 5432. Run `brew services stop postgresql@18` |
| Toast **"Unknown actor: …"** | Choose a valid user in **Acting as**, or clear `localStorage["funding.actor"]` |
| `Unexpected stylex.create call at runtime` | The StyleX plugin is missing from `vite.config.ts` (`stylex.vite()` must come before `react()`) |
| Build warns about a chunk over 500 kB | Expected (Astryx + React in one bundle). Fine for an internal tool. Code-split with `import()` if needed |
