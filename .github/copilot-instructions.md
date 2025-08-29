# Copilot Instructions for Polling App (Next.js + Supabase)

## Project Overview
- **Purpose:** Full-stack polling app. Authenticated users create/manage polls; participants vote (optionally anonymously) and see real-time results. Sharing via short links and QR codes.
- **Tech:** Next.js App Router (React 19, TypeScript, TailwindCSS, shadcn/ui), Supabase (Postgres, Auth, RLS, Realtime), Vercel (serverless/edge).

## Architecture & Data Flow
- **Frontend:**
  - Uses Next.js App Router. Route groups: `(auth)`, `(dashboard)`, `(public)` for UX segmentation.
  - Server components for data fetching/SEO; client components for interactivity (forms, voting, QR scan).
  - UI components in `components/` (forms, polls, layout, ui).
- **APIs:**
  - Located in `app/api/`. All mutations: validate (Zod) → authorize (Supabase Auth/JWT) → perform action → return DTO.
  - Rate limiting and anti-abuse via Upstash (optional).
- **Database:**
  - Supabase Postgres. Core tables: `profiles`, `polls`, `poll_options`, `votes`.
  - Row Level Security (RLS) for access control. Triggers maintain denormalized counts for fast reads.
- **Realtime:**
  - Supabase subscriptions for live vote/result updates. UI updates on `postgres_changes` or `poll_option_counts`.
- **Sharing:**
  - QR code generation for poll URLs. QR scan routes to public voting page.

## Developer Workflow
- **Install & Run:**
  - `npm install` then `npm run dev` (see `README.md`).
  - Environment: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- **Linting:**
  - `npm run lint` (ESLint 9, TypeScript strict). Code must pass lint before PRs.
- **Build:**
  - `npm run build` for production. `npm run start` to run locally.
- **Testing:**
  - Vitest/Playwright planned; see `backlog.md` for test coverage goals.

## Project Conventions
- **TypeScript strict everywhere.**
- **Validation:** Zod schemas at API boundaries, centralized in `lib/`.
- **Naming:**
  - Routes: kebab-case
  - DB columns: snake_case
  - TypeScript: camelCase
- **Business logic:** Prefer DB (RLS, triggers) for consistency; keep API handlers thin.
- **State:** Use Zustand or React Query for client/server state as needed.
- **UI:** TailwindCSS + shadcn/ui for all components.

## Integration & Extensibility
- **Supabase:** All data/auth/realtime flows through Supabase. See `lib/supabase/` for helpers.
- **API surface:** See `context.md` for planned endpoints and flows.
- **Backlog:** `backlog.md` defines features, priorities, and acceptance criteria. Always align new work with backlog.

## Key References
- `context.md`: Architecture, flows, conventions, API surface
- `backlog.md`: Features, priorities, acceptance criteria
- `README.md`: Setup, scripts, structure
- `components/`, `lib/`, `app/api/`: Main code organization

---
**For AI agents:**
- Always validate inputs/outputs at API boundaries.
- Keep business rules in DB when possible.
- Use real-time updates for voting/results.
- Follow naming and folder conventions strictly.
- Reference `context.md` and `backlog.md` for all non-obvious decisions.
- Always update `backlog.md` with new tasks/features with every change.
- Always update `context.md` with architectural changes with every change.
- Always update `README.md` with setup/build with every change.
