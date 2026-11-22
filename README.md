# AppTrail

One place for students to track grad school and internship applications: deadlines, status, recommendation letters, and exactly which version of each essay or resume went to which application.

Final project for UNC COMP 426. Built with [Next.js](https://nextjs.org) (App Router), [Supabase](https://supabase.com), [Drizzle ORM](https://orm.drizzle.team), [tRPC](https://trpc.io), and [shadcn/ui](https://ui.shadcn.com), following the architecture of the A05 Oriole assignment.

## Getting Started

```bash
npm install
npm run dev            # http://localhost:3000
```

Copy `.env.example` to `.env` and fill in the three values from the team's Supabase project first. Never commit `.env`.

## Project Structure

| Path | What it is |
| --- | --- |
| `app/layout.tsx` | Root layout (theme, tRPC provider) |
| `app/page.tsx` | Landing page (`/`) |
| `app/api/trpc/[trpc]/route.ts` | tRPC API endpoint |
| `server/api/trpc.ts` | tRPC context, `publicProcedure` and `protectedProcedure` |
| `server/api/root.ts` | The app router; feature routers go in `server/api/routers/` |
| `server/db/schema.ts` | Drizzle table definitions |
| `server/db/relations.ts` | Drizzle relations (`defineRelations`) |
| `utils/supabase/` | Supabase clients (browser and server) and the `requireUser` helper |
| `utils/trpc/` | tRPC React Query client (`api`) and its provider |
| `components/ui/` | shadcn/ui components |
| `proxy.ts` | Refreshes the Supabase session on each request |

## Working on this repo

`AGENTS.md` holds the product spec, data model, API, security rules and build plan. Read it before making changes.