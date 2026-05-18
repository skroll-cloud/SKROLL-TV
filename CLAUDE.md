# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server at http://localhost:3000
npm run build    # Production build
npm start        # Run production build
```

No linter, no test suite configured.

## Architecture

**Stack:** Next.js 16 (App Router) + Supabase + Tailwind CSS. No TypeScript in the two main page files (`.js`), though the project has TS config and `layout.tsx`.

**Two routes:**
- `app/page.js` — main SPA (all sections rendered conditionally on `currentSection` state)
- `app/video/[id]/page.js` — video detail page

Both are `'use client'` single-component files. All logic, state, and JSX live in one large component per route. There are no shared components, hooks, or context — everything is self-contained per file.

**Supabase client** is instantiated inline at the top of each file with hardcoded credentials (not from env vars, despite `lib/supabase.js` existing with the env-var pattern). Do not refactor to env vars without testing both files.

## Supabase schema

| Table | Key columns |
|-------|-------------|
| `videos` | `id`, `title`, `file_url`, `uploaded_by`, `referent`, `type_id`, `uploaded_at`, `bertrand_vote`, `sebastien_vote`, `pierreemmanuel_vote` |
| `comments` | `id`, `video_id`, `user_id`, `text`, `assignee` (varchar), `resolved` (boolean, default false), `created_at` |
| `audio_tracks` | `id`, `video_id`, `name`, `file_url`, `track_type`, `uploaded_by` |
| `video_types` | `id`, `name` |
| `tasks` | `id`, `name`, `description`, `assignee`, `status`, `deadline`, `folder_name` |
| `ideas` | `id`, `title`, `description`, `tags` (array), `link_url`, `status`, `created_at` |
| `contacts` | `id`, `name`, `type`, `contact`, `status`, `notes` |
| `shared_files` | `id`, `name`, `file_url`, `file_type`, `uploaded_by` |
| `users` | `id`, `name`, `password` (plain text) |
| `user_profiles` | `username` (PK), `email`, `notify_weekly`, `updated_at` |

**Storage buckets:** `Videos` (capital V) for video files, `files` for audio tracks and shared files.

**SQL required for comments task system** (must be run if not already):
```sql
ALTER TABLE comments ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS assignee varchar;
```

## Authentication

Simple custom auth — no Supabase Auth, no JWT. On login, the app queries `users` table for matching `name` + `password` (plain text). The username is stored in `localStorage` as `skroll_user` and read on mount. Three users: `Bertrand`, `Sébastien`, `Pierre Emmanuel`.

## Vote system

Each video has three vote columns: `bertrand_vote`, `sebastien_vote`, `pierreemmanuel_vote`. Values: `null | 'ameliorer' | 'pad' | 'non'`.

`getVideoStatus(video)` computes the derived status:
- Any `'non'` → `'À supprimer'`
- All `'pad'` → `'PAD'`
- Any non-null → `'En cours'`
- All null → `'En attente'`

`cycleVote(current)` cycles: `null → ameliorer → pad → non → null`. Implemented with explicit if/else — **do not refactor to object lookup**, as `null` as an object key converts to the string `'null'` and breaks the cycle.

## Navigation with filter context

When navigating from the main page to a video, the current status filter is passed as `?from=En+cours` (URL param). The video detail page reads `fromFilter` from `useSearchParams()` and uses it to build `navigationVideos` — a filtered subset for prev/next arrows and the progress bar. This keeps the user within their filtered context (e.g., navigating only "En cours" videos with the arrows).

`localStorage.setItem('skroll_section', sectionId)` is used when navigating back from the video detail page to restore the active section in the main page.

## Section routing (main page)

`currentSection` drives which section is rendered. Values: `'videos'`, `'comments'`, `'tasks'`, `'ideas'`, `'contacts'`, `'files'`, `'espace-perso'`. Old status-based sections (`'en-attente'`, `'en-cours'`, etc.) still exist in the JSX but are no longer reachable from the nav.

## Comments as tasks

Comments double as a task system:
- `assignee` — assigns a comment to a user; shows in that user's Espace perso
- `resolved` — hides the comment from the default view in the Comments section and Espace perso
- The Comments section groups by video, shows unresolved by default, with toggle for resolved
- `loadAssignedTasks()` fetches comments where `assignee = currentUser AND resolved = false`
- `loadMyVideoComments()` fetches unresolved comments on videos where I am `referent` or `uploaded_by` (queries DB directly, does not depend on local `videos` state)

## Key UI patterns

- **Status filter tags** on the videos page set `statusFilter` state; this value is also passed as `?from=` when opening any video
- **Ideas section**: compact list with click-to-open modal editor (`editingIdea` state), collapsible add form
- **Mobile**: swipe gesture on video detail page (touch handlers + `swipeOffset` transform); swipe/grid toggle on main page
- **Inline comments**: toggled per video card on the main page via `expandedComments` video ID state
