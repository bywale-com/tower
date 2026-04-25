# Tower — Codebase State Document

This file is the **canonical snapshot** of the repository at a specific point in time.  
Future updates should **append a new dated snapshot section** or bump versions per the rules in [How to version and update this document](#how-to-version-and-update-this-document).

---

## How to version and update this document

### Naming and version identifiers

| Identifier | Semver / format | Meaning |
|------------|-----------------|--------|
| **`STATE_DOC_FORMAT_VERSION`** | `MAJOR.MINOR.PATCH` (Semver) | Version of **this document’s template** (section order, required fields, tables). Bump **MAJOR** if you rename/remove required sections; **MINOR** if you add optional sections; **PATCH** for clarifications only. |
| **`APPLICATION_PACKAGE_VERSION`** | From root `package.json` `version` | Declared app package version (currently independent of git). |
| **`CODE_SNAPSHOT_GIT_SHA`** | 40-char hex + optional short `SHA` | Exact commit this state describes. **Authoritative for “what code ran.”** |
| **`STATE_SNAPSHOT_ID`** | `state-YYYY-MM-DD-<short-sha>` | Human-stable id for this file revision (use in PR titles / release notes). |

**Current values (this revision)**

| Field | Value |
|-------|--------|
| `STATE_DOC_FORMAT_VERSION` | `1.0.0` |
| `APPLICATION_PACKAGE_VERSION` | `0.1.0` |
| `CODE_SNAPSHOT_GIT_SHA` (full) | `1146c8a923e2c9af7e7fdb8ad70bf5d85b8409bc` |
| `CODE_SNAPSHOT_GIT_SHA` (short) | `1146c8a` |
| `STATE_SNAPSHOT_ID` | `state-2026-04-24-1146c8a` |
| Default branch (as of snapshot) | `main` |
| Remote (typical) | `origin` → `https://github.com/bywale-com/tower.git` |

### Update procedure (template for future edits)

1. **Pull or merge** the target `CODE_SNAPSHOT_GIT_SHA` you are documenting.
2. Run `git rev-parse HEAD` and record full + short SHA.
3. Set `STATE_SNAPSHOT_ID` to `state-YYYY-MM-DD-<short-sha>`.
4. Bump `STATE_DOC_FORMAT_VERSION` only if you changed the **template structure** (not for routine app updates).
5. Refresh every section below; remove stale claims; add a row to **Document revision history**.
6. If behavior changed, update **Runtime flows**, **API routes**, **Route map**, and **Supabase usage** accordingly.

### Document revision history

| `STATE_SNAPSHOT_ID` | `CODE_SNAPSHOT_GIT_SHA` (short) | `STATE_DOC_FORMAT_VERSION` | Notes |
|---------------------|----------------------------------|------------------------------|--------|
| `state-2026-04-24-1146c8a` | `1146c8a` | `1.0.0` | Initial STATE.md: post-pull snapshot; intelligence slug route; topic enrich API; discover job UX. |

---

## 1. Executive summary

**Tower** is a **Next.js 14 (App Router)** TypeScript application branded as a market / topic intelligence terminal (“Sovereign Intelligence”). It uses **Supabase** for authentication (cookie-based sessions via `@supabase/ssr`) and for **PostgreSQL-backed reads/writes**. A **global RLS migration** revokes direct `anon` / `authenticated` table privileges; the app uses a **server-only service role client** for most data access and a **separate anon cookie client** for `auth.getUser()` and browser session alignment.

**Primary user journeys**

1. Unauthenticated visitor hits `/` → redirected to `/app/login`.
2. Middleware protects all `/app/*` routes except login/signup; unauthenticated users go to login.
3. After login, users use **Discover** (search + optional topic enrichment job), **Intelligence** (per-topic dashboard at `/app/intelligence/[slug]`), **Feed** (posts ranked by urgency, optional `?space=` filter), **Post detail** (`/app/posts/[id]`), and static/light **Account** / **Creators** pages.

**Notable implementation detail:** `/app/intelligence` (no slug) **redirects to `/app/discover`**; `/app/dashboard` **redirects to `/app/intelligence`** which then redirects to discover — effectively discover-first for those entry points.

---

## 2. Repository purpose and product surface

| Surface | Route | Rendering | Data source |
|---------|-------|-------------|-------------|
| Marketing / entry | `/` | Server | Hard redirect only |
| Login | `/app/login` | Server + form Server Action | Supabase Auth (anon SSR client) |
| Signup | `/app/signup` | Server + form Server Action | Supabase Auth |
| App shell | `/app/*` (except auth) | Client layout + children | Auth: client `getUser`; data: per-page |
| Discover | `/app/discover` | RSC + heavy client child | Supabase: `trending_topics`, `topics` |
| Intelligence (index) | `/app/intelligence` | Server | `redirect("/app/discover")` |
| Intelligence (topic) | `/app/intelligence/[slug]` | RSC | Many tables (see Section 10) |
| Feed | `/app/feed` | RSC (+ client table) | `spaces`, `posts`, `surfaces` |
| Post detail | `/app/posts/[id]` | RSC + client panel | `posts`, `surfaces`, `signals`, `transcripts` |
| Creators | `/app/creators/[username]` | Server (mostly static mock content) | No Supabase in page |
| Account | `/app/account` | Server | Static placeholder |
| Dashboard | `/app/dashboard` | Server | Redirect to `/app/intelligence` |
| Claim signal API | `POST /api/signals/[id]/claim` | Route handler | Auth user + service role DB |
| Enrich topic API | `POST /api/topics/enrich` | Route handler | Auth user + service role DB + TODO worker |

---

## 3. Technology stack (pinned / declared)

Source: root `package.json` at `CODE_SNAPSHOT_GIT_SHA` **unless** lockfile resolves narrower ranges.

### 3.1 Runtime and framework

| Technology | Version / constraint | Role |
|------------|----------------------|------|
| **Node** | Not pinned in repo; use LTS compatible with Next 14 | Runtime |
| **Next.js** | `14.2.35` | App Router, RSC, API routes, `next/font`, `next/image` |
| **React** | `^18` | UI |
| **React DOM** | `^18` | UI |
| **TypeScript** | `^5` | Type-checking (`strict: true` in `tsconfig.json`) |

### 3.2 Backend / data

| Package | Version | Role |
|---------|---------|------|
| `@supabase/supabase-js` | `^2.104.0` | Service role admin client |
| `@supabase/ssr` | `^0.10.2` | Cookie-aware server + browser clients |

### 3.3 UI, styling, utilities

| Package | Version | Role |
|---------|---------|------|
| **Tailwind CSS** | `^3.4.1` | Utility CSS |
| **PostCSS** | `^8` | Tailwind pipeline (`postcss.config.mjs`) |
| **tailwindcss-animate** | `^1.0.7` | Tailwind plugin |
| **tw-animate-css** | `^1.4.0` | Imported in `globals.css` |
| **shadcn** (tailwind preset) | `^4.3.1` | `@import "shadcn/tailwind.css"` in `globals.css` |
| **clsx** | `^2.1.1` | Class names |
| **tailwind-merge** | `^3.5.0` | Merge Tailwind classes |
| **class-variance-authority** | `^0.7.1` | Variants (e.g. `Button`) |
| **lucide-react** | `^1.8.0` | Icons (shadcn config) |
| **@base-ui/react** | `^1.4.1` | Headless primitives (`Button`) |

### 3.4 Tooling

| Tool | Version | Role |
|-------|---------|------|
| **ESLint** | `^8` | Lint |
| **eslint-config-next** | `14.2.35` | Next + TS rules |
| **@types/node** / **@types/react** / **@types/react-dom** | `^20` / `^18` / `^18` | Types |

### 3.5 NPM scripts

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |

---

## 4. Configuration files (every tracked config artifact)

| Path | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, package name `tower`, version `0.1.0` |
| `package-lock.json` | Locked dependency tree |
| `tsconfig.json` | `strict`, path alias `@/*` → `./src/*`, Next plugin |
| `next.config.mjs` | `images.remotePatterns` for `**.cdninstagram.com`, `**.fbcdn.net` |
| `postcss.config.mjs` | PostCSS: `tailwindcss` plugin only |
| `tailwind.config.ts` | Content globs, **extended Material-style color tokens**, `darkMode: "class"`, plugin `tailwindcss-animate` |
| `.eslintrc.json` | Extends `next/core-web-vitals`, `next/typescript`; `@next/next/no-img-element` → **warn** |
| `components.json` | shadcn / Base UI setup: style `base-nova`, RSC, aliases, Tailwind + globals paths |
| `.gitignore` | Ignores `node_modules`, `.next`, `.env*.local`, `next-env.d.ts`, `.vercel`, etc. |
| `middleware.ts` | Supabase session on `/app/:path*`, auth redirects |
| `README.md` | Default create-next-app readme (generic) |
| `HANDOFF.md` | Project handoff notes (separate from this STATE) |
| `data_mapping_reference_original` | Legacy / audit doc: **mock vs live data** mapping spec (`0.1.0-alpha.5` internally) |

**Environment files**

| Path | Tracked? | Purpose |
|------|----------|---------|
| `.env.local` | **No** (gitignored) | Local secrets: Supabase URL, anon key, service role, site URL |

---

## 5. Source tree — complete inventory (git-tracked)

Below is the **full list** of paths tracked by git at `CODE_SNAPSHOT_GIT_SHA` (`git ls-files`).  
**Excluded:** `node_modules/`, `.next/` (ignored), any local-only files.

### 5.1 Root

```
.eslintrc.json
.gitignore
HANDOFF.md
README.md
components.json
data_mapping_reference_original
middleware.ts
next.config.mjs
package-lock.json
package.json
postcss.config.mjs
tailwind.config.ts
tsconfig.json
```

### 5.2 `src/app/` — App Router

```
src/app/favicon.ico
src/app/fonts/GeistMonoVF.woff
src/app/fonts/GeistVF.woff
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
```

### 5.3 `src/app/app/` — Authenticated application segment

```
src/app/app/layout.tsx
src/app/app/account/page.tsx
src/app/app/creators/[username]/page.tsx
src/app/app/dashboard/page.tsx
src/app/app/discover/page.tsx
src/app/app/discover/DiscoverSearch.tsx
src/app/app/discover/actions.ts
src/app/app/feed/page.tsx
src/app/app/feed/FeedPostsTable.tsx
src/app/app/feed/loading.tsx
src/app/app/intelligence/page.tsx
src/app/app/intelligence/[slug]/page.tsx
src/app/app/intelligence/[slug]/page.module.css
src/app/app/login/page.tsx
src/app/app/login/actions.ts
src/app/app/signup/page.tsx
src/app/app/signup/actions.ts
src/app/app/posts/[id]/page.tsx
src/app/app/posts/[id]/page.module.css
src/app/app/posts/[id]/loading.tsx
src/app/app/posts/[id]/SignalsPanel.tsx
```

### 5.4 `src/app/api/` — Route handlers

```
src/app/api/signals/[id]/claim/route.ts
src/app/api/topics/enrich/route.ts
```

### 5.5 `src/components/` — UI components

```
src/components/ui/button.tsx
```

### 5.6 `src/lib/` — Shared libraries

```
src/lib/utils.ts
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/types.ts
```

### 5.7 `supabase/migrations/`

```
supabase/migrations/20260422134800_enable_rls_on_all_public_tables.sql
supabase/migrations/20260423000000_seed_topics_for_search.sql
supabase/migrations/20260423120000_add_stage_to_jobs.sql
```

### 5.8 `stitch_tower_market_intelligence_platform/` — Design references

Static HTML + PNG screens + PRD + design notes used as **visual / UX references** (not compiled into Next).

```
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/creator_intelligence_tncimmigration/code.html
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/creator_intelligence_tncimmigration/screen.png
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/post_intelligence_tncimmigration_reel/code.html
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/post_intelligence_tncimmigration_reel/screen.png
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/search_discover_home/code.html
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/search_discover_home/screen.png
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/search_results_trending_feed/code.html
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/search_results_trending_feed/screen.png
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/terminal_tower/DESIGN.md
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/topic_intelligence_canada_immigration/code.html
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/topic_intelligence_canada_immigration/screen.png
stitch_tower_market_intelligence_platform/stitch_tower_market_intelligence_platform/tower_prd_v1.md
```

---

## 6. Path alias and module boundaries

| Alias | Resolves to | Usage |
|-------|-------------|--------|
| `@/*` | `./src/*` | All imports like `@/lib/supabase/server`, `@/components/ui/button` |

**`server-only`:** `src/lib/supabase/server.ts` imports `server-only` to prevent accidental client bundling.

---

## 7. Application routing — exhaustive route map

Next.js **App Router** file paths under `src/app` define routes.

| URL path | File | Segment config | Notes |
|----------|------|------------------|-------|
| `/` | `src/app/page.tsx` | Static | `redirect("/app/login")` |
| `/app/login` | `src/app/app/login/page.tsx` | Dynamic (searchParams) | Form posts to `login` server action |
| `/app/signup` | `src/app/app/signup/page.tsx` | Dynamic (searchParams) | Form posts to `signup` server action |
| `/app/discover` | `src/app/app/discover/page.tsx` | Static (no dynamic APIs in page file) | Loads topics; renders `DiscoverSearch` |
| `/app/intelligence` | `src/app/app/intelligence/page.tsx` | Static | `redirect("/app/discover")` |
| `/app/intelligence/[slug]` | `src/app/app/intelligence/[slug]/page.tsx` | **Dynamic** (`params.slug`) | `notFound()` if topic missing |
| `/app/feed` | `src/app/app/feed/page.tsx` | Dynamic (`searchParams.space`) | Optional space filter |
| `/app/posts/[id]` | `src/app/app/posts/[id]/page.tsx` | **Dynamic** (`params.id`) | Parallel Supabase queries |
| `/app/creators/[username]` | `src/app/app/creators/[username]/page.tsx` | **Dynamic** (param unused for data) | Mostly static mock object |
| `/app/account` | `src/app/app/account/page.tsx` | Static | Placeholder copy |
| `/app/dashboard` | `src/app/app/dashboard/page.tsx` | Static | `redirect("/app/intelligence")` → chain to discover |
| `POST /api/signals/[id]/claim` | `src/app/api/signals/[id]/claim/route.ts` | Dynamic | JSON body not required |
| `POST /api/topics/enrich` | `src/app/api/topics/enrich/route.ts` | Static path | JSON `{ query: string }` |

**Layouts**

| Path | File | Type | Behavior |
|------|------|------|----------|
| `/` tree | `src/app/layout.tsx` | Server | HTML `lang="en"`, `dark` class, **Manrope** font via `next/font`, wraps `children` |
| `/app` tree | `src/app/app/layout.tsx` | **Client** (`"use client"`) | Sidebar, header, Material Symbols stylesheet, auth pages bypass chrome |

---

## 8. Middleware — behavior specification

**File:** `middleware.ts`  
**Matcher:** `["/app/:path*"]` — runs for all `/app/...` requests.

**Steps**

1. Build `createServerClient` with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, wiring `request` / `response` cookies per `@supabase/ssr` pattern.
2. `await supabase.auth.getUser()`.
3. Define `isAuthPage` = pathname is `/app/login` OR `/app/signup`.
4. If **no user** and **not** auth page → **302** to `/app/login`.
5. If **user** and path is `/app/login` → **302** to `/app/feed`.
6. Otherwise `NextResponse.next()`.

**Implications**

- `/app/signup` is reachable when logged out (intended).
- Logged-in user hitting `/app/login` is sent to feed (signup not redirected here).

---

## 9. Supabase integration — clients, env vars, security model

### 9.1 Environment variables (names only; values are local / deployment secrets)

| Variable | Required by | Purpose |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Middleware, browser client, server clients | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Middleware, `createClient()` (server + browser) | Public anon key; RLS-facing role |
| `SUPABASE_SERVICE_ROLE_KEY` | `createServiceClient()` only | Bypasses RLS; **server-only** |
| `NEXT_PUBLIC_SITE_URL` | Not referenced in tracked `src` at this snapshot | Reserved for absolute URLs / OAuth (verify before relying) |

**Build-time note:** `next build` loads `.env.local` when present. Server pages that call `createServiceClient()` **require** `SUPABASE_SERVICE_ROLE_KEY` at build time for prerender/static generation paths that execute those queries.

### 9.2 Client modules

| Export | File | Implementation | Use when |
|--------|------|----------------|----------|
| `createClient()` | `src/lib/supabase/client.ts` | `createBrowserClient(url, anon)` | Client components / hooks / browser |
| `createClient()` | `src/lib/supabase/server.ts` | `createServerClient(url, anon, { cookies })` | Server Components, Route Handlers: **session / `auth.getUser()`** |
| `createServiceClient()` | `src/lib/supabase/server.ts` | `createSupabaseClient(url, serviceRole, { auth: { persistSession: false } })` | Server-only **data** reads/writes that must bypass table revokes / RLS |

### 9.3 Database security migrations (tracked SQL)

**File:** `supabase/migrations/20260422134800_enable_rls_on_all_public_tables.sql`

- Loops all `public` tables from `pg_tables`.
- For each: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Revokes **all** privileges on each table from roles **`anon`** and **`authenticated`**.

**Consequence:** Any server code that still uses **only** the anon key for `from("posts")` (etc.) will hit **permission denied** unless RLS policies explicitly grant access (current codebase instead uses **service role** for those queries).

**File:** `supabase/migrations/20260423000000_seed_topics_for_search.sql`

- Inserts seed rows into `topics` for slugs: `atlantic-canada-immigration`, `canada-study-permit`, `south-africa-immigration` (`ON CONFLICT (slug) DO NOTHING`).

**File:** `supabase/migrations/20260423120000_add_stage_to_jobs.sql`

- `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stage text DEFAULT 'queued';`

---

## 10. Supabase tables and operations referenced in application code

This is an **exhaustive list of `.from("...")` table names** appearing under `src/` at this snapshot.

| Table | Read | Write | Where |
|-------|------|-------|--------|
| `trending_topics` | ✓ | — | `discover/page.tsx` |
| `topics` | ✓ | ✓ | `intelligence/[slug]/page.tsx`, `api/topics/enrich/route.ts` |
| `spaces` | ✓ | — | `feed/page.tsx`, `intelligence/[slug]/page.tsx` |
| `posts` | ✓ | — | `feed/page.tsx`, `intelligence/[slug]/page.tsx`, `posts/[id]/page.tsx` |
| `surfaces` | ✓ | — | `feed/page.tsx`, `intelligence/[slug]/page.tsx`, `posts/[id]/page.tsx` |
| `signals` | ✓ | ✓ | `posts/[id]/page.tsx`, `api/signals/[id]/claim/route.ts` |
| `transcripts` | ✓ | — | `posts/[id]/page.tsx` |
| `topic_tags` | ✓ | — | `intelligence/[slug]/page.tsx` |
| `monthly_stats` | ✓ | — | `intelligence/[slug]/page.tsx` |
| `popular_queries` | ✓ | — | `intelligence/[slug]/page.tsx` |
| `rising_queries` | ✓ | — | `intelligence/[slug]/page.tsx` |
| `news_items` | ✓ | — | `intelligence/[slug]/page.tsx` |
| `search_logs` | — | ✓ | `discover/actions.ts` |
| `searches` | ✓ | ✓ | `discover/actions.ts` |
| `jobs` | ✓ | ✓ | `api/topics/enrich/route.ts`, **Realtime subscription** in `DiscoverSearch.tsx` |

### 10.1 Typed row shapes (manual TypeScript)

**File:** `src/lib/supabase/types.ts`

Defines: `ContentType`, `SignalStatus`, `Post`, `Surface`, `Signal`, `TranscriptSegment`, `Transcript`.  
These are **not** generated from Supabase CLI in-repo; they must be kept in sync manually with the DB.

---

## 11. API routes — contracts and side effects

### 11.1 `POST /api/signals/[id]/claim`

**File:** `src/app/api/signals/[id]/claim/route.ts`

| Step | Detail |
|------|--------|
| Auth | `createClient()` + `auth.getUser()` — requires valid session |
| Data client | `createServiceClient()` |
| Reads | `signals` by `id` |
| Validates | If `status === "claimed"` and `claimed_by` set and ≠ current user → **409** |
| Writes | `update` `signals` set `status: "claimed"`, `claimed_by: user.id` |
| Responses | **401** unauthenticated; **404** not found; **500** update error; **200** `{ signal }` |

**Consumer:** `SignalsPanel` client component (`fetch`).

### 11.2 `POST /api/topics/enrich`

**File:** `src/app/api/topics/enrich/route.ts`

| Step | Detail |
|------|--------|
| Auth | `createClient()` + `auth.getUser()` — **401** if no user |
| Body | JSON `{ query?: string }`; **400** if missing/blank |
| Slug | `slugify(trimmed query)` — lowercase alphanumerics + hyphens |
| Title | Title-cased words from raw query string |
| Data client | `createServiceClient()` |
| Existing topic | If `topics` row with `slug` and `status = active` → **200** `{ exists: true, topicSlug }` |
| Running job check | Reads latest `running` job for `target_table = topics`; compares associated topic slug (see code) |
| Creates | Pending `topics` row (`status: "pending"`), then `jobs` row (`status: "running"`, `stage: "queued"`, `started_at` now) |
| Worker | **TODO** comment: Trigger.dev task `enrich-topic` not wired (`#13`) |
| Success | **200** `{ jobId, topicSlug }` (or `{ jobId, topicSlug, resumed: true }` in resume branch) |

---

## 12. Server Actions (`"use server"`)

| File | Export | Behavior |
|------|--------|----------|
| `src/app/app/login/actions.ts` | `login` | `signInWithPassword`; redirects with error or to `/app/feed` |
| `src/app/app/signup/actions.ts` | `signup` | `signUp`; redirects with error or to login with success message |
| `src/app/app/discover/actions.ts` | `logSearch` | Inserts into `search_logs` via service client |
| `src/app/app/discover/actions.ts` | `logEnrichRequest` | Upserts `searches` by keyword; inserts `search_logs` |

---

## 13. Client-heavy features

### 13.1 Discover search and enrichment UX

**File:** `src/app/app/discover/DiscoverSearch.tsx` (client)

- Props: `trendingTopics`, `topics` from server page.
- Local state: query string, focus, enrich wizard phases, errors.
- **Job persistence key:** `localStorage["tower:enrich-job"]` stores `{ jobId, slug, stage }`.
- **Realtime:** Subscribes to `postgres_changes` on `public.jobs` filtered by `id=eq.<jobId>`, expects `stage` and `status` updates.
- **Stage enum (client):** `queued` | `finding_creators` | `scraping_posts` | `scoring_signals` | `ready` (labels in `STAGE_LABELS`).
- On terminal stage / completed: navigates to `/app/intelligence/<slug>` after short timeout.
- Calls `POST /api/topics/enrich` for new topics.

**Dependency:** Supabase Realtime must expose `jobs` updates to the `authenticated` user for this subscription to work in production (verify RLS/replication settings outside this repo).

### 13.2 Signals claim UI

**File:** `src/app/app/posts/[id]/SignalsPanel.tsx` (client)

- Optimistic UI for claim; rollback on failure; displays server errors.

---

## 14. Per-page implementation notes (all pages)

| Page file | Key implementation points |
|-----------|---------------------------|
| `src/app/page.tsx` | Root redirect to login |
| `src/app/layout.tsx` | Metadata title/description; Manrope font; dark class |
| `src/app/app/layout.tsx` | Client shell; nav hrefs; `createClient` for user email initial; logout |
| `src/app/app/discover/page.tsx` | Parallel Supabase loads; passes props to `DiscoverSearch` |
| `src/app/app/intelligence/page.tsx` | Single `redirect("/app/discover")` |
| `src/app/app/intelligence/[slug]/page.tsx` | Large dashboard UI; loads topic by slug; `notFound` if no topic; `surfaces.space` compared to slug string; module CSS import |
| `src/app/app/feed/page.tsx` | Optional `spaces` lookup; posts filtered `analyzed_signal_count > 0`; joins surface usernames via `surfaces` map; static right-hand “detail panel” mock object |
| `src/app/app/feed/FeedPostsTable.tsx` | Client table; **`<img>`** for thumbnails (ESLint warn) |
| `src/app/app/feed/loading.tsx` | Feed skeleton |
| `src/app/app/posts/[id]/page.tsx` | `createServiceClient` for data; `createClient` for user; `notFound` on post error; uses `next/image`; imports `page.module.css` |
| `src/app/app/posts/[id]/loading.tsx` | Post skeleton |
| `src/app/app/creators/[username]/page.tsx` | Large static `creator` object (mock marketing UI) |
| `src/app/app/account/page.tsx` | Two-line placeholder |
| `src/app/app/dashboard/page.tsx` | Redirect only |
| `src/app/app/login/page.tsx` | Email/password form → `login` action |
| `src/app/app/signup/page.tsx` | Email/password form → `signup` action |

---

## 15. Styling and design system

### 15.1 Tailwind theme extensions

**File:** `tailwind.config.ts`

- Custom color tokens: `background`, `surface-*`, `primary`, `on-*`, `error`, `outline`, etc. (Material-like naming).
- Font families: `sans`, `headline`, `body`, `label`, `mono` all map to `var(--font-sans)` (Manrope from root layout).

### 15.2 Global CSS

**File:** `src/app/globals.css`

- Imports: `tw-animate-css`, `shadcn/tailwind.css`, Tailwind layers.
- Utilities: `.glass-nav`, `.no-scrollbar`, `.text-balance`.
- CSS variables for light/dark in `@layer base` (shadcn theme tokens).

### 15.3 Fonts and icons

- **Google Font:** Manrope via `next/font/google` in root layout.
- **Material Symbols Outlined:** loaded via `@import` inside `src/app/app/layout.tsx` `<style>` tag (client layout).

### 15.4 Local font binaries (tracked)

- `src/app/fonts/GeistVF.woff`, `src/app/fonts/GeistMonoVF.woff` — present in repo; root layout uses Manrope (Geist files may be legacy/unused — verify before removal).

---

## 16. Next.js image configuration

**File:** `next.config.mjs`

Remote image patterns allow Instagram / Facebook CDN hosts for `next/image` usage on post thumbnails / avatars.

---

## 17. Linting and quality gates

- **ESLint:** Next core-web-vitals + TypeScript rules.
- **`@next/next/no-img-element`:** downgraded to **warn** (feed + intelligence still use `<img>` in places).

---

## 18. Non-application artifacts (still in repo)

| Path | Role |
|------|------|
| `stitch_tower_market_intelligence_platform/**` | HTML mockups, PNGs, `tower_prd_v1.md`, `DESIGN.md` |
| `data_mapping_reference_original` | Data binding audit / mock inventory |
| `HANDOFF.md` | Human handoff notes |

These **do not** ship as React routes unless separately hosted.

---

## 19. Known gaps, TODOs, and operational assumptions

| Item | Detail |
|------|--------|
| Topic enrichment worker | `POST /api/topics/enrich` creates DB rows but **does not** enqueue Trigger.dev (TODO `#13` in code). |
| Realtime | Discover UI expects **`jobs` row updates** over Realtime; worker must update `jobs.stage` / `status`. |
| `NEXT_PUBLIC_SITE_URL` | Documented in prior conversation for deploy URLs; **not** read in tracked application code at this snapshot — confirm usage before documenting as required. |
| Creators page | Mostly **static** demo content; `[username]` param not driving queries. |
| README | Still generic create-next-app text. |
| PowerShell / npm | On Windows, execution policy may block `npm.ps1`; use `npm.cmd` or adjust policy (environment, not repo). |

---

## 20. Deployment and hosting (inferred)

- Typical target: **Vercel** (`.vercel` gitignored).
- Requires all production env vars set in the hosting provider (not only `.env.local`).

---

## 21. Related documentation index

| Document | Purpose |
|----------|---------|
| `STATE.md` (this file) | **Codebase snapshot + structural template** |
| `HANDOFF.md` | Onboarding / transfer notes |
| `data_mapping_reference_original` | Historical mock → data mapping audit |
| `stitch_tower_market_intelligence_platform/.../tower_prd_v1.md` | Product requirements reference |

---

## 22. Appendix — dependency lock reference

For **exact resolved versions** of transitive dependencies, consult `package-lock.json` at `CODE_SNAPSHOT_GIT_SHA`. The tables in Section 3 list **declared** ranges from `package.json`.

---

*End of `STATE.md` — `STATE_DOC_FORMAT_VERSION` 1.0.0 — `STATE_SNAPSHOT_ID` state-2026-04-24-1146c8a*
