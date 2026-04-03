# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start development server
bun run build        # Production build
bun run lint         # Run ESLint
bun run lint:fix     # Fix linting issues and format
bun run lint:strict  # Strict linting (zero warnings)
bun run format       # Format all files with Prettier

bun run db:generate  # Generate Drizzle migrations
bun run db:push      # Push migrations to database
bun run db:studio    # Open Drizzle Studio (visual DB editor)
```

There are no automated tests in this project.

## Architecture

**Dejado** is a SaaS admin dashboard starter built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

### Key Directories

- `src/app/` — Next.js App Router pages. Route groups: `(auth)` for sign-in/up, `(dashboard)` for protected pages, `auth-settings` for Clerk workspace/team/billing/profile.
- `src/features/` — Feature modules, each self-contained with `components/`, `actions/` (server actions), `schemas/` (Zod validation), and `utils/`.
- `src/components/ui/` — shadcn/ui components. Add new components via `bunx shadcn@latest add <component>`.
- `src/components/layout/` — Sidebar, header, and shell layout components.
- `src/config/nav-config.ts` — Navigation structure with RBAC access rules.
- `src/db/schema.ts` — Drizzle ORM schema (PostgreSQL/Neon).
- `src/hooks/` — Custom React hooks. `use-nav.ts` is central to RBAC navigation filtering.

### RBAC Navigation System

Navigation visibility is handled **entirely client-side** via `src/hooks/use-nav.ts` and configured in `src/config/nav-config.ts`. Access rules support:

```typescript
access: {
  requireOrg: true,          // requires active org (instant, via useOrganization())
  permission: 'org:admin:manage', // from membership.permissions
  role: 'admin',             // from membership.role
}
```

Use `useFilteredNavItems(navItems)` in components to get RBAC-filtered nav. This is UX-only — actual security must be enforced server-side in API routes and server actions.

See `docs/nav-rbac.md` for full documentation.

### Data Flow Pattern

- Server actions in `src/features/*/actions/` handle mutations and data fetching.
- Zod schemas in `src/features/*/schemas/` validate both client-side (React Hook Form) and server-side.
- URL state is managed with `nuqs` (type-safe search params).
- Global UI state uses Zustand (`src/stores/`).

### Authentication

Clerk handles all auth, organizations, teams, and billing. See `docs/clerk_setup.md` for setup. Environment variables are templated in `.env.example.txt`.

### Database

PostgreSQL via Neon (serverless). Drizzle ORM with schema at `src/db/schema.ts`. Migrations stored in `/drizzle`.

## Path Aliases

- `@/*` → `src/*`
- `~/*` → root
