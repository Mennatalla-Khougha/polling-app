## Polling App (Next.js + Supabase + Vercel)

A full‑stack polling application. Creators build polls; participants vote with live updates; sharing via short links and QR codes.

### Tech Stack

- Next.js App Router (React 19, TypeScript, TailwindCSS, shadcn/ui)
- Supabase (Auth, Postgres, RLS, Realtime, Storage)
- Vercel (serverless/edge, CDN)

### Current Stage

- Project scaffolded with App Router and base folders
- Architecture and backlog defined: see `context.md` and `backlog.md`
- API route groups present (`app/api/polls`, `app/api/votes`)
- UI scaffolding present (`app/(auth)`, `(dashboard)`, `(public)`)

### Up Next (Roadmap)

High‑level from `backlog.md`:

- Supabase schema: `profiles`, `polls`, `poll_options`, `votes`, counts and RLS
- Email/password auth flow with Supabase
- Poll creation and listing for creators
- Public poll page with voting and realtime updates
- QR code generation for sharing

### Getting Started (Dev)

1. Install deps and run dev server:

```bash
npm install
npm run dev
```

2. Environment variables (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server‑only)

3. Optional local Supabase (for DX): see Supabase CLI docs.

### Scripts

- `npm run dev` – start local dev server
- `npm run build` – production build
- `npm run start` – start production server locally
- `npm run lint` – run ESLint

### Repository Structure (abridged)

```
app/
  (auth)/ (dashboard)/ (public)/
  api/
    polls/ votes/
components/
lib/
  supabase/ types/ hooks/ utils/
public/
```

### Documentation

- Context for AI/contributors: `context.md`
- Feature backlog and acceptance criteria: `backlog.md`

### Deployment

- Target: Vercel. Configure environment variables per project environment.

### Status & Contributions

This project is under active development. See `backlog.md` for current sprint tasks and priorities. Contributions are welcome via issues and PRs aligned with the backlog.
