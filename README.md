# AppTrail

One place for students to track grad school and internship applications: deadlines, status, recommendation letters, and exactly which version of each essay or resume went to which application.

Final project for UNC COMP 426. Built with [Next.js](https://nextjs.org) (App Router), [Supabase](https://supabase.com), [Drizzle ORM](https://orm.drizzle.team), [tRPC](https://trpc.io), and [shadcn/ui](https://ui.shadcn.com), following the architecture of the A05 Oriole assignment.

## Getting Started

```bash
npm install
npm run dev            # http://localhost:3000
```

Copy `.env.example` to `.env` and fill in the three values from the team's Supabase project first. Never commit `.env`.

The team shares one Supabase project and its tables already exist, so there is nothing to run after cloning. Only when you change `server/db/schema.ts`:

```bash
git pull                                        # one person changes the schema at a time
npx drizzle-kit generate --name=<what_changed>  # writes a migration to supabase/migrations/
npx drizzle-kit migrate                         # applies it to the database
```

## Project Structure

| Path                                                        | What it is                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`                                            | Root layout (theme, tRPC provider, toasts)                                                                                                                                                  |
| `app/page.tsx`                                              | Landing page (`/`)                                                                                                                                                                          |
| `app/login/`, `app/signup/`                                 | Public auth pages: a server `page.tsx` plus its client form                                                                                                                                 |
| `app/(app)/`                                                | Every page that needs a signed-in user. `layout.tsx` is the app shell (header, navigation, user menu). `/applications` has a list and a board view, `/dashboard` an overview and a calendar |
| `app/r/[token]/`                                            | The recommender portal: the one public page inside the product, opened with the secret link from a recommender's page                                                                       |
| `app/api/trpc/[trpc]/route.ts`                              | tRPC API endpoint                                                                                                                                                                           |
| `server/api/trpc.ts`                                        | tRPC context, `publicProcedure` and `protectedProcedure`                                                                                                                                    |
| `server/api/root.ts`                                        | The app router, which combines the feature routers                                                                                                                                          |
| `server/api/routers/`                                       | One tRPC router per feature                                                                                                                                                                 |
| `server/api/document-storage.ts`                            | Server-side Storage access: signed download URLs and file deletion                                                                                                                          |
| `server/api/site-origin.ts`                                 | The site's public address, read from the request; used to build the portal link                                                                                                             |
| `server/models/`                                            | Zod models: `enums.ts`, API `inputs.ts` and `responses.ts`                                                                                                                                  |
| `server/db/schema.ts`                                       | Drizzle table definitions                                                                                                                                                                   |
| `server/db/relations.ts`                                    | Drizzle relations (`defineRelations`)                                                                                                                                                       |
| `supabase/migrations/`                                      | SQL migrations, including the profile trigger, RLS policies and the storage bucket                                                                                                          |
| `docs/schema-and-api.md`                                    | Database schema and API documentation                                                                                                                                                       |
| `utils/supabase/`                                           | Supabase clients (browser and server), the `requireUser` / `getOptionalUser` helpers, and `storage.ts` (browser uploads to the `documents` bucket)                                          |
| `utils/trpc/`                                               | tRPC React Query client (`api`) and its provider                                                                                                                                            |
| `utils/deadlines.ts`, `utils/letters.ts`, `utils/labels.ts` | Shared helpers: urgency and relative time of a due date, when a letter is due, and the label of every enum value                                                                            |
| `utils/reminder-email.ts`                                   | Builds the `mailto:` draft of a reminder email to a recommender                                                                                                                             |
| `components/ui/`                                            | shadcn/ui components                                                                                                                                                                        |
| `components/shell/`                                         | App shell: navigation links, user menu, edit-profile dialog                                                                                                                                 |
| `components/applications/`                                  | Application pieces: status select (optimistic), create/edit dialog, delete dialog                                                                                                           |
| `components/letters/`                                       | Letter pieces shared by the application and recommender pages: row, status select (optimistic), edit and assign dialogs                                                                     |
| `components/recommenders/`                                  | Recommender create/edit dialog, and the portal link card (turn on, copy, replace, turn off)                                                                                                 |
| `components/documents/`                                     | Document pieces: create/edit dialog, upload form (two-step upload), attach dialog, download hook                                                                                            |
| `components/`                                               | Shared pieces: `PageHeader`, `FormField`, `DeadlineText`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `Brand`                                                                              |
| `proxy.ts`                                                  | Refreshes the Supabase session on each request                                                                                                                                              |

## Working on this repo

`AGENTS.md` holds the product spec, data model, API, security rules and build plan. Read it before making changes.
