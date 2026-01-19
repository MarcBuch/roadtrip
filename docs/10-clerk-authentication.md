# Clerk Authentication Implementation Plan

Template reference: IMPLEMENTATION_PLAN_TEMPLATE.md

## Goals

- Add user authentication with Clerk for the Next.js App Router experience and tRPC backend.
- Protect route persistence operations so data is scoped to the signed-in Clerk user.
- Keep anonymous read access (optional) while ensuring writes are authenticated.

## Non-Goals

- Migrating to Supabase Auth or rewriting the persistence layer.
- Social login provider selection beyond Clerk defaults.
- Full UI redesign of existing panels.

## Assumptions

- Next.js 14+ (App Router) with TypeScript is stable.
- TRPC handlers live under app/api/trpc, currently unauthenticated ([app/api/trpc/[...trpc]/route.ts](app/api/trpc/%5B...trpc%5D/route.ts#L1-L13)).
- Supabase project is provisioned but tables will be created fresh for this implementation (no migration of prior data); `user_id` will be stored as `uuid`.
- The app shell is defined in [app/layout.tsx](app/layout.tsx#L1-L25) and is safe to wrap with providers.

## Dependencies

- Clerk account + application configured for the deployed domains.
- Environment variables available at build time:
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - CLERK_SECRET_KEY
  - Optional: CLERK_SIGN_IN_URL, CLERK_SIGN_UP_URL, CLERK_AFTER_SIGN_IN_URL, CLERK_AFTER_SIGN_UP_URL
- Supabase service role key stored server-side (no exposure to the client).

## Milestones & Steps

### 1) Install & bootstrap Clerk SDK

- Add dependency: `@clerk/nextjs`.
- Add environment variables to `.env.local` and document them in README.
- Update `next.config.ts` if needed to allow Clerk-provided domains for webhooks/assets.

### 2) App shell integration

- Wrap the app with `ClerkProvider` in [app/layout.tsx](app/layout.tsx#L1-L25); preserve existing fonts and globals.
- Add a global `SignedIn`/`SignedOut` guard or a header slot for auth controls (e.g., `UserButton`, `SignInButton`).
- Ensure Suspense/SSR options align with App Router defaults (`<ClerkProvider>` supports both).

### 3) Middleware protection

- Add `middleware.ts` using `clerkMiddleware` to protect authenticated surfaces:
  - Always protect: `/api/trpc`, `/routes`-adjacent API routes.
  - Allow public: `/`, `/sign-in`, `/sign-up`, static assets.
- Configure `config.matcher` to avoid Next internals and `_next/static`.

### 4) Auth UI routes

- Create `/sign-in` and `/sign-up` routes under `app/(auth)/...` using Clerk components (`<SignIn>`, `<SignUp>`).
- Provide redirect URLs via env or component props to return to the planner after auth.
- Add a minimal unauthenticated CTA section on the main page prompting sign-in for saving routes.

### 5) tRPC context & procedures

- Update the TRPC fetch handler to pass auth into context: `createContext: ({ req }) => ({ auth: getAuth(req) })`.
- Define `protectedProcedure` middleware (requires `auth.userId`).
- Apply `protectedProcedure` to mutations that write to Supabase: create, update, delete, addWaypoint, removeWaypoint.
- Persist `user_id` when creating routes; scope read operations to the user (or optionally public + user-owned) by filtering on `user_id`.
- Add error shapes for unauthenticated access.

### 6) Supabase setup (fresh)

- Create `routes` and `waypoints` tables from scratch with `user_id` as `uuid`; include indexes on `user_id` and relevant foreign keys.
- Seed optional demo data with `user_id` null or a shared demo uuid to keep anonymous reads.
- Switch server-side Supabase client to use a non-public key (service role) and ensure it is only used server-side.
- Update insert/update queries in [lib/trpc/routes.ts](lib/trpc/routes.ts#L1-L176) to include `user_id: auth.userId` and filter queries by the same.

### 7) UI wiring

- Add a small header/auth bar on the planner page showing `UserButton` when signed in and a `SignInButton` otherwise.
- Disable or gray out save/library actions when signed out; show a tooltip or inline prompt.
- Ensure optimistic UI state does not bypass backend checks.

### 8) Testing & rollout

- Unit test tRPC auth middleware to ensure unauthenticated requests are rejected.
- Integration test happy path: sign-in → create route → list routes → delete route.
- Regression test anonymous read flow if kept public.
- Verify Supabase rows store correct `user_id` and that cross-user access is denied.
- Smoke-test middleware exclusions (static assets, auth pages).

## Risks & Mitigations

- **Service key exposure**: keep Supabase service role key server-only; use edge runtime cautiously or stick to Node runtime for TRPC.
- **Fresh schema mistakes**: codify table definitions in SQL and keep them under version control to avoid drift between environments.
- **Auth-required UX**: gating save actions may surprise users; provide clear prompts and a demo route.

## Acceptance Criteria

- Auth pages render and complete Clerk sign-in/sign-up flows.
- Protected TRPC mutations fail for unauthenticated requests with a clear error.
- New routes persist with `user_id` matching the signed-in Clerk user, and lists only return that user’s routes (plus allowed public ones if configured).
- Save/Library UI reacts to auth state (disabled or prompts) and works end-to-end when signed in.

## Estimates (rough)

- Dependency + env + layout wiring: 0.5 day
- Middleware + auth pages: 0.5 day
- TRPC context + Supabase filters + schema creation: 1 day
- UI gating + tests: 0.5 day
- Buffer/QA: 0.5 day
