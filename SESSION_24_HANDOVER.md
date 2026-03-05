# Mission Control — Session 24 Handover
Date: March 4, 2026

## Session Goal
Phase 2 begins. Developer Audit Module — Session 24: Database + Developer CRUD + Developer Portal.

## What Was Built

| # | Task | Status |
|---|------|--------|
| 1 | `developers` table — created with id, name, email, github_username, password_hash, slug, stacks, status, created_at, updated_at | Done |
| 2 | `tasks` table — added developer_id (FK), acceptance_criteria, linked_pr_numbers columns | Done |
| 3 | `projects` table — added branch_protection JSONB column | Done |
| 4 | `GET /api/developers` — list all developers (never returns password_hash) | Done |
| 5 | `POST /api/developers` — create developer with bcrypt-hashed password | Done |
| 6 | `PATCH /api/developers/[id]` — update status/profile fields, never allows password_hash | Done |
| 7 | `/admin/developers` page — server component + DeveloperList client component with table, inline add form, offboard button | Done |
| 8 | Sidebar — added "Developers" nav link below Projects | Done |
| 9 | `POST /api/dev/auth` — developer login (slug + password, bcrypt.compare, sets dev_session cookie) | Done |
| 10 | `POST /api/dev/auth/signout` — clears dev_session cookie | Done |
| 11 | `/dev/[slug]` page — server component, cookie check, renders login form or dashboard | Done |
| 12 | DevLoginForm — glassmorphism password prompt matching client auth style | Done |
| 13 | DevDashboard — profile card, tasks card, sign out button | Done |
| 14 | Fix: developers page TypeError (fetch failed on Vercel) — switched to direct Supabase query | Done |
| 15 | Fix: bare .select() on projects API routes — replaced with explicit column lists | Done |
| 16 | Fix: added branch_protection to Project TypeScript interface | Done |

## Files Created / Modified

### Created (11 files)
| File | Purpose |
|------|---------|
| `src/app/api/developers/route.ts` | GET (list all) + POST (create with bcrypt) — never returns password_hash |
| `src/app/api/developers/[id]/route.ts` | PATCH — update status/profile, allowlist pattern, never allows password_hash |
| `src/app/api/dev/auth/route.ts` | POST — developer login: slug + password → bcrypt.compare → dev_session cookie |
| `src/app/api/dev/auth/signout/route.ts` | POST — clears dev_session cookie (maxAge: 0) |
| `src/app/admin/developers/page.tsx` | Server component — fetches developers via Supabase, passes to DeveloperList |
| `src/app/admin/developers/DeveloperList.tsx` | Client component — table, inline add form, offboard with confirm dialog |
| `src/app/dev/[slug]/page.tsx` | Server component — reads dev_session cookie, renders login or dashboard |
| `src/app/dev/[slug]/DevLoginForm.tsx` | Client component — password prompt, POST /api/dev/auth, reload on success |
| `src/app/dev/[slug]/DevDashboard.tsx` | Client component — profile card, tasks card, sign out |

### Modified (4 files)
| File | Change |
|------|--------|
| `src/components/admin/Sidebar.tsx` | Added "Developers" nav item with Users icon |
| `src/app/admin/projects/[id]/ProjectTabs.tsx` | Added `branch_protection?` to Project interface |
| `src/app/api/projects/route.ts` | Replaced bare `.select()` with explicit column list on PATCH |
| `src/app/api/projects/[id]/route.ts` | Replaced bare `.select()` with explicit column list on PATCH |

## Database Changes (zsxbbvxkozzkrvyhqrmv)

### New table: `developers`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| github_username | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| slug | TEXT | NOT NULL, UNIQUE |
| stacks | TEXT[] | DEFAULT '{}' |
| status | TEXT | DEFAULT 'active', CHECK (active/paused/offboarded) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### Altered table: `tasks`
| Column Added | Type | Notes |
|--------------|------|-------|
| developer_id | UUID | FK → developers(id) |
| acceptance_criteria | TEXT[] | DEFAULT '{}' |
| linked_pr_numbers | INTEGER[] | DEFAULT '{}' |

### Altered table: `projects`
| Column Added | Type | Default |
|--------------|------|---------|
| branch_protection | JSONB | `{"require_audit": true, "auto_audit_on_pr": true, "min_confidence_to_pass": 0.7}` |

## Verified Working
- [x] `npx tsc --noEmit` — zero errors on all commits
- [x] `/admin/developers` — table renders, add form creates developers, offboard button works
- [x] Sidebar shows "Developers" link below Projects
- [x] `/dev/[slug]` — shows password prompt when unauthenticated
- [x] `/dev/[slug]` — shows dashboard when dev_session cookie matches developer.id
- [x] Developer login: POST /api/dev/auth validates slug + bcrypt password, sets httpOnly cookie
- [x] Developer sign out: clears cookie, returns to login prompt
- [x] DevDashboard: profile card, tasks card with module names, status badges
- [x] Projects API routes no longer leak client_password via bare .select()
- [x] All changes deployed to Vercel production (mission-control.truetechpro.io)

## Known Issues Fixed This Session
- **`TypeError: fetch failed` on /admin/developers** — the server component used `fetch('http://localhost:3000/api/developers')` to call its own API route, which fails on Vercel serverless. Fixed by switching to direct Supabase query via `createClient()`, matching the pattern in `/admin/page.tsx`.
- **Bare `.select()` on projects API was returning `client_password` to frontend** — both `api/projects/route.ts` and `api/projects/[id]/route.ts` used `.select()` without column lists after `.update()`. Fixed with explicit column lists.
- **Missing `branch_protection` on Project type** — the JSONB column added to the DB wasn't in the TypeScript interface. Added as optional field.
- **Defensive null guard on stacks** — added `dev.stacks?.length` optional chaining in DeveloperList in case a developer row has null stacks.

## Session 25 — What To Do Next
From architecture: Task board extensions for the Developer Audit Module.

1. **Developer assignment dropdown on tasks** — add a `<select>` to each task row in TaskBoard.tsx that lists active developers and PATCHes `developer_id` on the task
2. **Acceptance criteria text field per task** — add an expandable section or modal to each task for editing `acceptance_criteria` (TEXT[] array), display as checklist
3. **Linked PR numbers tracking** — add input for `linked_pr_numbers` (INTEGER[] array) on each task, display as GitHub PR links
4. **Task filters by developer** — filter task board by assigned developer
5. **Developer portal tasks view** — the DevDashboard tasks card currently shows basic info; extend with acceptance criteria and PR links once those are populated

## Critical Technical Rules (carry forward)

### Supabase
- **Project ID:** zsxbbvxkozzkrvyhqrmv — do NOT touch any other project
- **Do NOT touch** the `task_runs` table
- Server components: `import { createClient } from '@/lib/supabase/server'` (this exports `createClient`, NOT `createServerClient`)
- API routes needing service role: `import { createClient } from '@supabase/supabase-js'` directly with `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Never use bare `.select()` — always list columns explicitly to avoid leaking sensitive fields

### Auth
- Admin auth: Supabase Auth (email/password), protected by middleware on `/admin/*`
- Client auth: bcrypt password per project, cookie `client_session` (httpOnly, path=/client, maxAge=86400)
- Developer auth: bcrypt password per developer, cookie `dev_session` (httpOnly, secure, sameSite=strict, path=/dev, maxAge=86400)
- `bcryptjs` (NOT `bcrypt`) — always server-side only, never in React components

### Code Patterns
- Next.js 14.2.35 App Router — `params` is typed as `Promise<{ slug: string }>`, use `await params`
- TypeScript strict mode — `npx tsc --noEmit` must pass with zero errors before every commit
- Never use `fetch()` to call your own API routes from server components — use Supabase client directly (fetch fails on Vercel serverless)
- Fail loudly — no empty catch blocks (except the one in `server.ts` setAll which is a known Next.js pattern)
- Field allowlist pattern for PATCH routes — never spread raw request body into updates
- Never return `password_hash` from any developer endpoint
- shadcn/ui components available: Button, Card, Input, Label
- Dark theme: bg-[#07070f] (main), bg-[#0d0d14] (sidebar), bg-white/5 (cards), border-white/10
