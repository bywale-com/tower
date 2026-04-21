# Tower — Handoff Document for Claude Desktop
**Version:** 0.2.0-alpha
**Date:** April 21, 2026
**Status:** Active Development — Handoff in Progress

---

## What Tower Is

Tower is a market intelligence platform that finds real questions
people are asking online about immigration and surfaces them to
immigration consulting firms as demand signals.

Core loop:
Search → Feed → Post Intelligence

A user searches a topic, sees a ranked feed of posts by urgency,
clicks into a post and sees the real questions people are asking
in the comments — scored, labeled, and ready to claim.

---

## Tech Stack

- **Frontend:** Next.js 14, App Router, TypeScript, Tailwind CSS, shadcn/ui, Sovereign Lens design system
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (installed, NOT YET WIRED)
- **Hosting:** Vercel (not yet deployed)
- **Automation:** n8n (external, not in repo)

---

## Repository Structure

```
src/app/
  page.tsx                          — root landing
  app/
    layout.tsx                      — shared sidebar + topbar
    dashboard/page.tsx              — redirects to /app/intelligence
    discover/page.tsx               — home search screen (mock data)
    feed/page.tsx                   — post feed (LIVE DATA ✅)
    feed/FeedPostsTable.tsx         — client component for row clicks
    intelligence/page.tsx           — topic intelligence (mock data)
    creators/[username]/page.tsx    — creator intelligence (mock data)
    posts/[id]/page.tsx             — post intelligence (LIVE DATA ✅)
lib/
  supabase/
    client.ts                       — browser client
    server.ts                       — server component client
```

---

## Database Schema — All Tables

### `surfaces` (scraped Instagram accounts)
```sql
id, keyword, url, username, full_name, biography, user_id,
platform, followers, following, post_count, is_verified,
is_business_account, is_professional_account, external_url,
collected_at, status, last_scraped_at, incumbency_score,
avg_urgency_score, total_signals_generated, transcribed_count,
follower_growth_7d_pct, created_at, updated_at, space_title,
space_id, avatar_url
```
- `status` = 'pending' or 'active'
- `space_title` = LLM-derived space slug e.g. "canada-immigration"
- `space_id` = FK to `spaces.id` (auto-populated by trigger)

### `spaces` (derived organizational units)
```sql
id, slug, title, keywords[], surface_count, created_at
```
- Auto-created by trigger when new `space_title` appears on surfaces
- `surface_count` increments automatically

### `posts` (scraped Instagram posts)
```sql
id, surface_id, platform_post_id, url, platform, caption,
hashtags[], content_type, thumbnail_url, video_url, external_url,
like_count, comments_count, view_count, duration_seconds,
posted_at, last_comment_at, title, excerpt, engagement_rate,
urgency_score, analyzed_signal_count, high_urgency_signal_count,
signal_velocity_pct_change, ai_summary, is_viral, scraped_at,
last_scraped_at, next_refresh_at, scrape_job_url,
unique_viewers_count, location, latest_comments (JSONB),
space_id, surface_username, needs_scrape, next_compute_at
```
- `surface_username` auto-populated from surfaces via trigger
- `next_compute_at` drives the daily recompute cron
- `needs_scrape` boolean — whether post needs fresh comment scrape
- `latest_comments` JSONB — raw comment data from scraper
- `urgency_score` — avg urgency of signals (0-100)
- `analyzed_signal_count` — count of processed signals
- `high_urgency_signal_count` — signals where urgency >= 40

### `signals` (processed comments = demand signals)
```sql
id, post_id, surface_id, space_id, text, commenter_username,
commenter_url, platform, commented_at, urgency_score,
intent_label, is_answered, status, claimed_by, scraped_at,
created_at
```
- `is_answered` = TEXT: 'true', 'false', or 'privated'
- `status` = 'open', 'claimed', 'answered'
- `urgency_score` = 0-100, LLM scored
- `intent_label` = 'question' | 'frustration' | 'seeking_help' | 'sharing_experience' | 'other'

### `topics` (seeded macro topics)
```sql
id, slug, title, query, platforms[], demand_signals,
total_questions, unanswered, avg_response_hours, top_platform,
volatility_score, urgency_summary, signal_delta_24h_pct,
status, last_updated, next_refresh_at, created_at
```
- One seed row exists: "canada-immigration"

### `topic_tags` (keywords under each topic)
```sql
id, topic_id, tag, created_at
```
- 21 tags seeded under canada-immigration

### `searches` (keyword inputs that trigger scrapes)
```sql
id, keyword, status, created_at, last_run_at, run_count
```

### `jobs` (scrape job tracking)
```sql
id, job_id, target_table, target_record_id, search_id,
status, started_at, completed_at, error, created_at
```

### `transcripts` (post transcriptions)
```sql
id, post_id, segments (JSONB), created_at
```
- segments schema: [{start_time: "00:01", text: "..."}]

### `signal_velocity` (hourly signal counts per post)
```sql
id, post_id, count_per_hour, recorded_at
```

### `popular_queries` (intent clusters per topic)
```sql
id, topic_id, query_text, rate_per_hour, source_type, recorded_at
```

### `rising_queries` (velocity acceleration per topic)
```sql
id, topic_id, query_text, growth_pct, is_breakout, recorded_at
```

### `monthly_stats` (answered vs unanswered per month)
```sql
id, topic_id, year, month, answered_count, unanswered_count, created_at
```

### `news_items` (external headlines per topic)
```sql
id, topic_id, headline, source, thumbnail_url, external_url,
published_at, created_at
```

### `search_logs` (user search behaviour in app)
```sql
id, query_string, user_id, session_id, created_at
```

### `trending_topics` (written by background job)
```sql
id, label, velocity_score, updated_at
```

### `post_topics` (junction — post to topic)
```sql
post_id, topic_id, relevance_score, created_at
```

### `signal_topics` (junction — signal to topic)
```sql
signal_id, topic_id, relevance_score, created_at
```

---

## What's Live vs Mock

| Screen | Status | Notes |
|---|---|---|
| `/app/feed` | ✅ LIVE | Real posts, ranked by urgency |
| `/app/posts/[id]` | ✅ LIVE | Real post data, signals, transcript |
| `/app/discover` | ❌ MOCK | Search not wired |
| `/app/intelligence` | ❌ MOCK | No real topic data yet |
| `/app/creators/[username]` | ❌ MOCK | No creator queries yet |

---

## What Needs To Be Built Next (Priority Order)

### 1. `/app/discover` — Wire search (HIGHEST PRIORITY)
- Search input queries `topics` table by slug/title match
- Log every search to `search_logs` table
- Autocomplete suggestions from `trending_topics` table
- On select → navigate to `/app/feed?space=canada-immigration`
- Trending chips from `trending_topics` ordered by `velocity_score`

### 2. `/app/feed` — Add filtering
- Filter by space/topic using URL param `?space=`
- Filter by urgency tier
- Filter by platform
- Detail panel on right — wire to selected post data

### 3. `/app/intelligence` — Wire to real data
Query live data from:
- `topics` — headline stats (demand_signals, unanswered, volatility_score, etc.)
- `topic_tags` — keyword chips
- `signals` — recent high-urgency signals
- `monthly_stats` — answered vs unanswered chart
- `popular_queries` — top intent clusters (populate via background job if empty)
- `rising_queries` — breakout queries (populate via background job if empty)
- `news_items` — headlines feed

### 4. `/app/creators/[username]` — Wire to real data
Query surfaces WHERE username = params.username:
- Profile card from surfaces columns
- Incumbency score gauge
- Recent demand signals from signals WHERE surface_id
- Contributions feed from posts WHERE surface_id ordered by posted_at DESC

### 5. Auth (lower priority — needed before showing to real users)
Supabase Auth is installed but not wired. When the time comes:
- `/app/login` — email/password login page
- `/app/signup` — signup page
- `middleware.ts` at root — protects all `/app/*` routes
- Redirect unauthenticated → `/app/login`
- Redirect authenticated away from `/app/login` → `/app/feed`

---

## Urgency Rules (use everywhere consistently)

```
urgency_score >= 70 → "Critical" — red (bg-error)
urgency_score >= 40 → "High" — orange
urgency_score >= 20 → "Med" — yellow
urgency_score < 20  → "Low" — grey
```

## is_answered Display Rules

```
'true'     → green "Answered" badge
'false'    → red "Unanswered" badge
'privated' → grey "Privated" badge
```

---

## Design System

**Do not override fonts or colors.** Keep whatever is already in the codebase.
The site uses Manrope throughout as the primary font — preserve this.
The existing dark-mode color palette, radii, and spacing are already correct.

The reference screens are `/app/feed` and `/app/posts/[id]` — use these as
visual ground truth when building new screens.

---

## Supabase Connection

Environment variables needed:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Server components use: `createClient()` from `@/lib/supabase/server`
Client components use: `createClient()` from `@/lib/supabase/client`

---

## Start Here

The most important thing to build right now is the **Discover flow**,
followed by the **Intelligence screen**.

The feed → post intelligence loop is already working end-to-end and
should be used as the reference for how to query Supabase and render
live data in new screens.

Auth comes later — it is not blocking current work.
