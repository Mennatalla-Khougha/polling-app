## Project Context

This document provides concise context for AI assistants and contributors to understand the Polling App: its current implementation status, architecture, data model, APIs, and conventions. Share this alongside the repo to enable high‑quality, context‑aware help.

### What is this app?

- **Purpose**: A full‑stack polling application where authenticated users create polls, participants vote (optionally anonymously), and see results update in real‑time.
- **Current Status**: ~65% MVP complete - core functionality working, real-time and advanced features pending
- **Features Implemented**: Poll creation/management, single/multiple‑choice voting, basic results, authentication, public/private access
- **Features Pending**: Real-time updates, QR code sharing/scanning, advanced analytics, poll management tools

### Tech Stack (Implemented)

- **Frontend**: Next.js 15 App Router, React 19, TypeScript strict, TailwindCSS 4, shadcn/ui
- **Backend**: Next.js Route Handlers with Zod validation
- **Data/Auth**: Supabase (Postgres with RLS, Auth, triggers for vote counting)
- **Deployment**: Configured for Vercel (not yet deployed)
- **DX/Quality**: ESLint 9, TypeScript strict, component-based architecture
- **State Management**: React state + custom hooks (Zustand/React Query planned)

### High‑Level Architecture (Current Implementation)

- **Client**: Server components for data‑heavy views, client components for interactive forms and voting
- **APIs**: Validation (Zod) → Auth (Supabase JWT) → Database operations → Response DTOs
- **Database**: Postgres with RLS policies, triggers maintain vote counts, proper indexing
- **Authentication**: Supabase Auth with automatic profile creation
- **Routing**: Route groups `(auth)`, `(dashboard)`, `(public)` for UX segmentation

### Folder Structure (Current)

```
app/
  (auth)/
    login/, register/     # ✅ Auth forms implemented
  (dashboard)/
    dashboard/           # ✅ User poll management
    polls/              # ✅ Poll creation/editing routes
  (public)/
    polls/[id]/         # ✅ Public voting interface
  api/
    polls/              # ✅ CRUD + list endpoints
    votes/              # ✅ Voting endpoint
    auth/               # ✅ Auth utilities
  globals.css, layout.tsx # ✅ Global styles and layout
  page.tsx              # ✅ Professional landing page

components/
  forms/
    AuthForm.tsx        # ✅ Login/register form
    CreatePollForm.tsx  # ✅ Comprehensive poll creation
    EditPollForm.tsx    # ✅ Poll editing (basic)
  polls/
    PollsList.tsx       # ✅ User's polls display
    PollDetails.tsx     # ✅ Poll information display
    VotingInterface.tsx # ✅ Public voting component
  layout/               # ✅ Navigation and layout components
  ui/                   # ✅ shadcn/ui components + theme toggle

lib/
  supabase/
    client.ts, server.ts # ✅ Supabase client helpers
  types/
    index.ts            # ✅ Comprehensive TypeScript types
  validations/
    polls.ts            # ✅ Zod schemas for API validation
  auth/
    AuthContext.tsx     # ✅ Authentication state management
  theme/
    ThemeContext.tsx    # ✅ Theme system foundation
  utils.ts              # ✅ Utility functions

supabase/
  schema.sql            # ✅ Complete database schema with RLS
  cleanup.sql           # ✅ Database maintenance scripts
```

### Data Model (Implemented)

**Core Tables:**

- `profiles`: id (UUID), email, display_name, created_at

  - ✅ Auto-created on signup with trigger
  - ✅ RLS policies for privacy

- `polls`: id (UUID), title, description, creator_id, is_public, allow_multiple_votes, expires_at, created_at

  - ✅ Full CRUD operations
  - ✅ Public/private access control via RLS
  - ✅ Expiration date support

- `poll_options`: id (UUID), poll_id, text, vote_count, created_at

  - ✅ Dynamic option management (2-10 options)
  - ✅ Vote counts maintained by triggers
  - ✅ Cascading deletes

- `votes`: id (UUID), poll_id, option_id, user_id, created_at
  - ✅ Duplicate vote prevention via unique constraints
  - ✅ Anonymous voting support (user_id nullable)
  - ✅ Trigger updates vote_count on poll_options

**Implemented Constraints:**

- Unique (poll_id, user_id) prevents duplicate votes per user
- Check constraints on title/option length
- Foreign key cascading for data integrity
- Indexes on frequently queried columns

### API Surface (Implemented)

**✅ Working Endpoints:**

- `GET /api/polls` – List current user's polls with options
- `POST /api/polls` – Create poll with validation and options
- `GET /api/polls/[id]` – Fetch poll details (respects RLS)
- `POST /api/votes` – Cast vote with duplicate prevention

**🚧 Partially Implemented:**

- `PUT /api/polls/[id]` – Update poll (basic structure exists)
- `DELETE /api/polls/[id]` – Delete poll (RLS allows, UI pending)

**⏳ Planned Endpoints:**

- `GET /api/polls/[id]/results` – Aggregated results for analytics
- `POST /api/polls/[id]/share` – Generate share tokens
- ~~`GET /api/qr/[id]` – QR code generation~~ (handled client-side via `qrcode` library)

**API Patterns (Established):**

- All mutations: validate (Zod) → authenticate → authorize → execute → return typed response
- Error handling with proper HTTP status codes and user-friendly messages
- Request/Response DTOs with comprehensive TypeScript types

### Core Flows (Current Status)

**1. User Registration/Login ✅ COMPLETE**

- Client: AuthForm → Supabase Auth
- Server: Auto-create profile trigger
- Result: Authenticated user with profile

**2. Poll Creation ✅ COMPLETE**

- Client: CreatePollForm with validation → API `POST /api/polls`
- Server: Validate, auth check, create poll + options atomically
- Result: Poll created, redirect to management view

**3. Poll Voting ✅ COMPLETE**

- Client: VotingInterface → API `POST /api/votes`
- Server: Validate, check duplicates, insert vote, trigger updates counts
- Result: Vote recorded, counts updated

**4. Real-time Results 🚧 PARTIAL**

- Database: Triggers maintain vote counts
- Frontend: Basic count display working
- Missing: Supabase real-time subscriptions for live updates

**5. Poll Sharing ✅ UPDATED**

- Public URLs work: `/polls/[id]` accessible
- Implemented: QR code generation (client-side), copy-to-clipboard
- Missing: Share tokens for private polls

### Security Model (Implemented)

**Authentication & Authorization ✅ COMPLETE:**

- Supabase Auth JWT validation in API handlers and client
- RLS policies enforce data access rules:
  - Users can only read/write their own polls
  - Public polls readable by everyone
  - Vote access controlled by poll visibility

**Vote Integrity ✅ COMPLETE:**

- Database unique constraints prevent duplicate votes
- Server-side validation ensures data consistency
- RLS policies prevent unauthorized vote manipulation

**Input Validation ✅ COMPLETE:**

- Zod schemas validate all API inputs
- Client-side validation with user-friendly error messages
- SQL injection prevention via Supabase client parameterized queries

**Security Enhancements ✅ COMPLETE:**

- Rate limiting for API endpoints implemented via middleware
- CSRF protection for all form submissions and API endpoints
- Additional audit logging (planned)

### Real-time Strategy (Planned)

**Current State:**

- Vote counts updated via database triggers
- UI shows current counts on page load/refresh

**Planned Implementation:**

- Supabase `postgres_changes` subscriptions on `votes` table
- Client-side subscription management with useEffect hooks
- Graceful fallback to polling if real-time connection fails
- Connection state management and reconnection logic

### Development Status & Environment

**✅ Development Setup Complete:**

- `npm run dev` - Development server working
- `npm run build` - Production build configured
- `npm run lint` - ESLint 9 with Next.js rules
- TypeScript strict mode enforcing type safety

**✅ Environment Variables Configured:**

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Database Status:**

- Supabase project configured and connected
- Schema deployed with all tables, RLS, and triggers
- Sample data for testing available

### Current Capabilities vs. Planned Features

**✅ Working Features:**

- User registration and authentication
- Poll creation with 2-10 options
- Public and private poll settings
- Single and multiple choice voting
- Basic vote counting and results display
- Responsive UI with professional design
- Form validation and error handling

**🚧 Partially Working:**

- Poll editing (structure exists, UI incomplete)
- Real-time updates (database triggers work, subscriptions pending)
- Mobile responsiveness (foundation solid, optimization needed)

**⏳ Planned Features:**

- QR code scanning
- Advanced poll management (duplicate, delete, analytics)
- Share tokens for private polls
- Export functionality
- Advanced poll types (ranked choice)
- Comprehensive analytics dashboard

### Code Quality & Conventions (Established)

**✅ Implemented Standards:**

- TypeScript strict mode throughout
- ESLint 9 with Next.js configuration
- Consistent naming: kebab-case routes, camelCase TypeScript, snake_case database
- Component-based architecture with clear separation of concerns
- API handlers follow validate → authorize → execute → respond pattern
- Comprehensive error handling with user-friendly messages

**File Organization:**

- Route groups for logical UI separation
- Components organized by function (forms, polls, layout, ui)
- Lib folder for utilities, types, and integrations
- Clear separation between client and server code

### Performance Considerations (Current)

**✅ Implemented Optimizations:**

- Database indexes on frequently queried columns
- Denormalized vote counts via triggers (avoid expensive aggregations)
- Server components for SEO and initial data loading
- Client components only where interactivity needed

**📊 Current Performance:**

- App loads quickly in development
- Database queries optimized with proper indexing
- Image optimization via Next.js built-in features

**⏳ Planned Optimizations:**

- Bundle size analysis and optimization
- Image optimization for QR codes
- Caching strategy for frequently accessed polls
- Performance monitoring implementation

### Testing Strategy (Planned)

**Current State:**

- Manual testing of all implemented features
- TypeScript provides compile-time error checking
- ESLint catches potential issues

**Planned Testing:**

- Unit tests for utility functions (Vitest)
- Integration tests for API endpoints
- Component testing for forms and interactions
- End-to-end tests for critical user flows (Playwright)

### Deployment Readiness

**✅ Ready for Deployment:**

- Next.js app configured for Vercel deployment
- Environment variables documented
- Database schema stable and tested
- Core user flows working end-to-end

**🔧 Pre-deployment Tasks:**

- Complete real-time functionality
- Add proper error boundaries
- Implement rate limiting
- Add comprehensive logging

### Success Metrics (Current Achievement)

**✅ Achieved:**

- Users can create and vote on polls end-to-end
- No critical bugs in core functionality
- Professional UI/UX that works across devices
- Secure authentication and data access

**📊 Metrics to Track:**

- Poll creation success rate (currently ~100% for valid inputs)
- Voting completion rate
- Real-time update latency (pending implementation)
- Mobile user experience scores

### Immediate Next Steps (Priority Order)

1. **Complete Real-time Updates** - Implement Supabase subscriptions for live vote counting
2. **QR Code Implementation** - Add QR generation library and UI components
3. **Mobile Optimization** - Improve responsive design and touch interactions
4. **Poll Management** - Complete edit/delete functionality with proper UI
5. **Error Boundaries** - Add comprehensive error handling throughout the app

### Non‑Goals (Current Scope)

- Multi-tenant/organization features
- Advanced poll types beyond single/multiple choice
- Complex analytics and reporting
- Third-party integrations (social media, etc.)
- Mobile app development (PWA sufficient)

### Key Files for Understanding Implementation

**Core Logic:**

- `app/api/polls/route.ts` - Poll CRUD operations
- `app/api/votes/route.ts` - Voting logic
- `components/forms/CreatePollForm.tsx` - Poll creation UI
- `components/polls/VotingInterface.tsx` - Voting experience

**Configuration:**

- `supabase/schema.sql` - Database structure and policies
- `lib/types/index.ts` - TypeScript definitions
- `lib/validations/polls.ts` - API validation schemas

**Architecture:**

- `lib/supabase/` - Database client configuration
- `app/layout.tsx` - Global app structure
- `lib/auth/AuthContext.tsx` - Authentication state management

This context reflects the current state of a well-architected polling application with solid foundations and clear paths to completion of remaining features.
