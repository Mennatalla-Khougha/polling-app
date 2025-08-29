## Project Context

This document provides concise context for AI assistants and contributors to understand the Polling App: its goals, architecture, data model, APIs, and conventions. Share this alongside the repo to enable high‑quality, context‑aware help.

### What is this app?

- **Purpose**: A full‑stack polling application where authenticated users create polls, participants vote (optionally anonymously), and see results update in real‑time.
- **Features**: Poll creation and management, single/multiple‑choice voting, real‑time results, QR code sharing/scanning, public/private access, auth, and basic analytics.

### Tech Stack

- **Frontend**: Next.js App Router (v15+), React 19, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js Route Handlers (Edge/Node as needed)
- **Data/Auth/Realtime**: Supabase (Postgres, RLS, Auth, Realtime, Storage)
- **Deployment**: Vercel (serverless/edge functions, CDN, images)
- **DX/Quality**: ESLint 9, TypeScript strict, Prettier (optional), Vitest/Playwright (planned)
- **Utilities**: Zod, Zustand or React Query (for client/server state), QR code libs, Upstash KV/Rate limit (optional)

### High‑Level Architecture

- **Client** renders server components for data‑heavy/SEO views, hydrates interactive client components for forms, voting, and scanning.
- **APIs** in `app/api/*` perform validation, auth checks, rate limiting, and call Supabase.
- **Database** stores polls, options, votes; RLS gates access; triggers maintain denormalized counts for fast reads.
- **Realtime** uses Supabase channel subscriptions to push vote updates to clients.
- **Sharing** uses short slugs/links; server or client generates QR codes; optional share tokens control access.

### Folder Structure (abridged)

```
app/
  (auth)/           # auth routes
  (dashboard)/      # creator/owner UX
  (public)/         # public voting & results
  api/
    polls/          # CRUD + vote endpoints
    votes/          # admin/owner reads (optional)
components/         # ui, forms, polls, layout
lib/
  supabase/         # client/server helpers
  types/            # shared TypeScript types
  hooks/, utils/    # realtime hooks, helpers
public/             # static assets
```

### Data Model (conceptual)

- `profiles`: id, email, name, avatar_url, timestamps
- `polls`: id, slug (unique), title, description, creator_id, is_public, allow_multiple_votes, allow_anonymous_votes, require_authentication, expires_at, created_at, updated_at
- `poll_options`: id, poll_id, text, order_index, created_at
- `votes`: id, poll_id, option_id, voter_user_id (nullable), voter_anon_id (nullable), voter_ip_hash (nullable), voter_device_id (nullable), created_at
- `poll_option_counts`: (poll_id, option_id) PK, vote_count
- Optional: `poll_shares` (share tokens), `poll_whitelist` (restricted access)

Notes:

- Use unique constraints to prevent duplicate votes per policy (e.g., unique (poll_id, voter_user_id) for single‑select).
- Use triggers to maintain `poll_option_counts` on insert/delete to avoid heavy aggregate reads.
- RLS ensures users read only allowed polls and write only their own resources.

### API Surface (planned)

- `GET /api/polls` – list current user polls (owner) with pagination/filters
- `POST /api/polls` – create poll (+ options)
- `GET /api/polls/[id|slug]` – fetch poll + options (+ counts)
- `PUT /api/polls/[id]` – update poll metadata/options (owner only)
- `DELETE /api/polls/[id]` – delete poll (owner only)
- `POST /api/polls/[id]/vote` – cast vote (auth/anon subject to policy)
- `GET /api/polls/[id]/results` – aggregated counts for display
- `POST /api/polls/[id]/share` – create share token (optional)
- `GET /api/qr/[slug]` – QR payload/image for sharing

All mutations validate payloads (Zod), enforce auth/authorization, and apply rate limits for anti‑abuse.

### Core Flows

1. Create Poll

- Client: form submit → API `POST /api/polls`
- Server: validate, auth, insert `polls`, `poll_options`
- Result: return poll with slug; UI routes to dashboard or public view

2. Vote

- Client: select option(s) → API `POST /api/polls/[id]/vote`
- Server: validate, dedupe per policy, insert `votes`, trigger increments `poll_option_counts`
- Realtime: Supabase broadcasts changes; clients update counts

3. View Results (live)

- Client: subscribe to `votes`/`poll_option_counts` by poll_id
- Server/DB: triggers maintain counts; reads are fast

4. Share via QR

- Server or client: generate QR for poll URL `/poll/[slug]` (optionally embed token)
- Client: scan QR → open public voting page; validate access

### Security Model

- Supabase Auth for identity; JWT validated in API handlers and RLS.
- RLS policies per table (read public polls, write own polls, vote rules).
- Duplicate/abuse prevention via:
  - DB unique constraints (e.g., single vote per user/poll)
  - Optional checks: `voter_ip_hash`, `voter_device_id`, `voter_anon_id`
  - API rate limiting (e.g., Upstash Ratelimit) by IP/session

### Realtime Strategy

- Subscribe to `postgres_changes` for `votes` or to a lightweight `poll_option_counts` channel filtered by `poll_id`.
- Update UI state on incoming events; fall back to periodic refetch if offline.

### Environments & Config

Required envs (examples):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server‑only)
- Optional: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (rate limit/cache)

### Conventions

- TypeScript strict; prefer server components for data fetching + SEO; wrap interactive pieces as client components.
- Zod for runtime validation at API boundaries; centralize schemas.
- Keep API handlers thin: validate → authorize → perform action → return DTO.
- Prefer denormalized counts for hot paths; write triggers once, read often.
- Naming: kebab‑case routes, snake_case DB columns, camelCase TS.

### Non‑Goals (initial scope)

- Complex poll types beyond single/multiple choice (ranked choice is future)
- Advanced analytics and export (future)
- Organization/teams and multi‑tenant billing (future)

### Success Criteria (initial)

- Create, share, and vote on a poll end‑to‑end in < 2 minutes.
- Results reflect new votes within ~500ms via realtime.
- Duplicate votes prevented per selected policy.

### Pointers

- See `backlog.md` for prioritized tasks and acceptance criteria.
- Route groups `(auth)`, `(public)`, `(dashboard)` segment UX contexts.
- Data access goes through Supabase; keep business rules in DB (RLS, triggers, constraints) for consistency across clients.
