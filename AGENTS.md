# AGENTS.md — AppTrail

> Context for AI coding assistants working on this repo. Read the whole file before doing anything.
> AppTrail is a working name. We are a team of 3 in UNC COMP 426 (Modern Web Programming) building our final project.

---

## 0. How to work with us (read first)

1. **One step at a time.** We will ask for one step from the Build Plan (§9), e.g. "Do step 3.1". Do only that step. Don't build ahead or refactor unrelated code.
2. **Plan before code.** If a step touches more than one file, first reply with a short plan (files, approach, open questions) and wait for our OK.
3. **Explain after code.** End each step with a **How it works** section: 3–5 bullets tracing the data flow (UI → tRPC procedure → Drizzle → Postgres/Storage), plus any decision we should be able to defend. We present this project live and will be asked how it was built.
4. **The repo wins.** Our code follows the architecture of our class assignment A05 Oriole. Existing folder structure, naming and patterns override this file. If they conflict, ask.
5. **Ask first** before adding a dependency or changing the database schema. If a step needs a schema change, stop and propose the migration.
6. **Don't guess.** If a requirement is ambiguous, ask.
7. **Debugging:** when we paste an error, explain the root cause in one or two sentences before proposing a fix.
8. TypeScript strict mode, no `any`. Small readable functions; comment the *why*, not the *what*.

## 1. Course requirements (never violate)

- Some features require login and show **user-specific data**.
- The database has **at least 4 tables**, with **at least one many-to-one** and **at least one many-to-many** relationship.
- The backend provides an **API (tRPC) that the frontend calls asynchronously**. Client components load and change data through tRPC React Query hooks (`useQuery` / `useMutation`); server-side prefetching is fine if our template does it.
- The app is **deployed on Vercel**, and the live demo runs on the Vercel deployment.

Deliverables:
- **11/25** Database schema and API documentation: every table's columns, types and foreign keys; every procedure marked Public or Auth, with its JSON input and output shapes.
- **12/5** A 5–8 minute video and a live showcase.

## 2. Product

**One-liner:** One place for students to track grad school and internship applications: deadlines, status, recommendation letters, and exactly which version of each essay or resume went to which application.

**Users:** students managing 10–30 applications in one season (master's/PhD programs and/or internships).

**Why it beats a spreadsheet:**
1. **Recommenders across applications.** One professor may owe 6 letters. See which are submitted and which are due next.
2. **Document versions per application.** "Which SOP version did I send to CMU?" Every upload is a new version, and each application records the exact versions attached to it.
3. **Nothing slips.** One dashboard of everything due soon, including letters.

Grad school and internship applications share one `applications` table, distinguished by `kind`. Recommenders are used mostly for grad school.

## 3. Tech stack

- Next.js (App Router) + TypeScript
- Supabase: Postgres, Auth (email + password), Storage
- Drizzle ORM (schema in TypeScript, migrations with drizzle-kit)
- tRPC + TanStack Query, Zod for every input
- Tailwind CSS + shadcn/ui
- Vercel

If our template uses different versions or file locations, follow the template.

## 4. Data model

Conventions: snake_case in the database, camelCase in TypeScript (Drizzle maps them). Ids are `uuid` with `default gen_random_uuid()`. Timestamps are `timestamptz`. Every table has `created_at default now()`; tables that can be edited also have `updated_at`.

### Enums

| Enum | Values |
|---|---|
| `application_kind` | `grad_school`, `internship` |
| `application_status` | `researching`, `preparing`, `submitted`, `interviewing`, `offer`, `waitlisted`, `rejected`, `withdrawn` |
| `application_priority` | `reach`, `target`, `safety` |
| `letter_status` | `planned`, `requested`, `confirmed`, `submitted`, `declined` |
| `document_type` | `sop`, `personal_statement`, `cv`, `resume`, `cover_letter`, `writing_sample`, `other` |

### `profiles` — one row per user

Created by a trigger when a row is inserted into `auth.users` (same pattern as Oriole). `display_name` comes from the sign-up metadata.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | FK → `auth.users.id`, on delete cascade |
| display_name | text not null | |
| created_at | timestamptz | |

### `applications` — many-to-one → profiles

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid not null | FK → `profiles.id`, on delete cascade |
| kind | application_kind not null | |
| organization | text not null | school or company |
| position | text not null | program name or role title |
| term | text | e.g. "Fall 2027", "Summer 2027" |
| status | application_status not null | default `researching` |
| priority | application_priority | nullable |
| deadline_at | timestamptz | nullable (rolling deadlines); programs often close at 11:59 PM in their own time zone |
| submitted_at | timestamptz | set the first time status becomes `submitted` |
| portal_url | text | |
| location | text | mostly for internships |
| application_fee_cents | integer | check ≥ 0 |
| notes | text | |
| created_at, updated_at | timestamptz | |

Index: `(user_id, deadline_at)`.

### `recommenders` — many-to-one → profiles

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid not null | FK → `profiles.id`, on delete cascade |
| name | text not null | |
| email | text | |
| title | text | e.g. "Associate Professor" |
| organization | text | e.g. "UNC Computer Science" |
| relationship | text | e.g. "Research advisor, 2 years" |
| notes | text | |
| share_token | uuid not null unique | default `gen_random_uuid()`; P1 recommender portal |
| share_enabled | boolean not null | default `false`; P1 recommender portal |
| created_at, updated_at | timestamptz | |

### `recommendation_requests` — join table: applications ↔ recommenders (many-to-many)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid not null | FK → `applications.id`, on delete cascade |
| recommender_id | uuid not null | FK → `recommenders.id`, on delete cascade |
| status | letter_status not null | default `planned` |
| requested_at | timestamptz | set the first time status becomes `requested` |
| due_at | timestamptz | nullable; the UI falls back to the application's deadline |
| submitted_at | timestamptz | set when status becomes `submitted` |
| notes | text | |
| created_at, updated_at | timestamptz | |

Unique: `(application_id, recommender_id)`.

### `documents` — many-to-one → profiles

A logical document such as "SOP – ML focus" or "Resume – SWE".

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid not null | FK → `profiles.id`, on delete cascade |
| title | text not null | |
| type | document_type not null | |
| created_at, updated_at | timestamptz | |

### `document_versions` — many-to-one → documents

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| document_id | uuid not null | FK → `documents.id`, on delete cascade |
| version_number | integer not null | assigned by the server: current max + 1 |
| storage_path | text not null | object path in the `documents` bucket |
| file_name | text not null | original file name |
| file_size_bytes | integer | |
| change_note | text | e.g. "Shortened intro, added research section" |
| created_at | timestamptz | |

Unique: `(document_id, version_number)`.

### `application_documents` — join table: applications ↔ document_versions (many-to-many)

| Column | Type | Notes |
|---|---|---|
| application_id | uuid not null | FK → `applications.id`, on delete cascade |
| document_version_id | uuid not null | FK → `document_versions.id`, on delete cascade |
| attached_at | timestamptz | default `now()` |

Primary key: `(application_id, document_version_id)`. Rule: at most one version of each document per application (enforced in `applicationDocuments.attach`).

### Relationship summary (for the documentation)

- **Many-to-one:** applications → profiles · recommenders → profiles · documents → profiles · document_versions → documents
- **Many-to-many:** applications ↔ recommenders through `recommendation_requests` · applications ↔ document_versions through `application_documents`

## 5. Security rules

**Drizzle connects as a privileged Postgres role (the user in `DATABASE_URL`), so RLS does not apply to our server queries.** Authorization lives in the tRPC procedures:

- Every `protectedProcedure` scopes reads and writes to the signed-in user's id from the tRPC context (use whatever our template's context provides).
- Child and join rows are authorized through their parents: a document version belongs to the user if its document does; a recommendation request belongs to the user if its application does.
- **When creating a join row, check that both sides belong to the user.** `recommendations.assign` checks the application *and* the recommender; `applicationDocuments.attach` checks the application *and* the document version. Otherwise a user could attach another user's id and read that user's data.
- A row that doesn't exist and a row owned by someone else both return `NOT_FOUND`.

**Still enable RLS on every table.** The public Supabase key ships to the browser, and Supabase's auto-generated REST API would otherwise expose every table. Add owner-only policies: `user_id = auth.uid()` on the user-owned tables, and `exists (...)` checks on the parent for child and join tables.

**Storage**

- Private bucket `documents`. Allowed types: PDF and DOCX. Max size: 10 MB.
- Object path: `{userId}/{documentId}/{randomUUID}-{fileName}`.
- Storage policy: authenticated users can read and write only objects whose first path segment equals `auth.uid()`.
- The browser uploads with the user's session. `documents.addVersion` rejects any `storagePath` that doesn't start with `{userId}/`.
- Downloads use short-lived signed URLs.

**Other**

- Never expose the service-role key to app code. Only local scripts (like the seed script) may use it.
- Validate every input with Zod: uuids, enums, string lengths, URLs, non-negative integers.

## 6. API (tRPC)

**Auth** = `protectedProcedure`. **Public** = `publicProcedure`. Dates are ISO 8601 strings in JSON. Errors use `TRPCError` codes `UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`.

### Shared types

```ts
type Kind = "grad_school" | "internship";
type Status = "researching" | "preparing" | "submitted" | "interviewing" | "offer" | "waitlisted" | "rejected" | "withdrawn";
type Priority = "reach" | "target" | "safety";
type LetterStatus = "planned" | "requested" | "confirmed" | "submitted" | "declined";
type DocType = "sop" | "personal_statement" | "cv" | "resume" | "cover_letter" | "writing_sample" | "other";

type Application = {
  id: string; kind: Kind; organization: string; position: string; term: string | null;
  status: Status; priority: Priority | null;
  deadlineAt: string | null; submittedAt: string | null;
  portalUrl: string | null; location: string | null; applicationFeeCents: number | null;
  notes: string | null; createdAt: string; updatedAt: string;
};
type ApplicationSummary = Application & {
  letters: { submitted: number; total: number };
  documentCount: number;
};
type ApplicationDetail = Application & {
  letters: (RecommendationRequest & {
    recommender: { id: string; name: string; email: string | null; title: string | null };
  })[];
  documents: {
    versionId: string; versionNumber: number; fileName: string; attachedAt: string;
    document: { id: string; title: string; type: DocType; latestVersionNumber: number };
  }[];
};

type Recommender = {
  id: string; name: string; email: string | null; title: string | null;
  organization: string | null; relationship: string | null; notes: string | null;
  shareEnabled: boolean; createdAt: string; updatedAt: string;
};
type RecommenderWithStats = Recommender & {
  counts: Record<LetterStatus, number>;
  nextDueAt: string | null; // earliest unsubmitted letter; falls back to the application deadline
};
type RecommenderDetail = Recommender & {
  letters: (RecommendationRequest & {
    application: { id: string; organization: string; position: string; deadlineAt: string | null; status: Status };
  })[];
};
type RecommendationRequest = {
  id: string; applicationId: string; recommenderId: string; status: LetterStatus;
  requestedAt: string | null; dueAt: string | null; submittedAt: string | null; notes: string | null;
};

// Named "Doc" rather than "Document" to avoid clashing with the DOM's global Document type.
type Doc = { id: string; title: string; type: DocType; createdAt: string; updatedAt: string };
type DocVersion = {
  id: string; documentId: string; versionNumber: number; fileName: string;
  fileSizeBytes: number | null; changeNote: string | null; createdAt: string;
};
type DocSummary = Doc & {
  versionCount: number;
  latestVersion: { id: string; versionNumber: number; createdAt: string } | null;
  applicationCount: number;
};
type DocDetail = Doc & {
  versions: (DocVersion & {
    applications: { id: string; organization: string; position: string; status: Status }[];
  })[];
};

type DashboardSummary = {
  countsByStatus: Record<Status, number>;
  upcoming: { type: "application" | "letter"; id: string; applicationId: string; title: string; dueAt: string }[];
  outstandingLetters: { recommenderId: string; name: string; pending: number }[];
  totalFeesCents: number;
};

type PortalView = {
  recommenderName: string; applicantName: string;
  letters: { id: string; organization: string; position: string; dueAt: string | null; status: LetterStatus }[];
};
```

### `profile` — Auth

- `me` · in: none · out: `{ id, displayName, email }`
- `update` · in: `{ displayName }` · out: `{ id, displayName }`

### `applications` — Auth

- `list` · in: `{ kind?, statuses?: Status[], search?, sort?: "deadline" | "updated" | "organization" }` · out: `ApplicationSummary[]`. `search` matches organization or position.
- `byId` · in: `{ id }` · out: `ApplicationDetail`
- `create` · in: `{ kind, organization, position, term?, status?, priority?, deadlineAt?, portalUrl?, location?, applicationFeeCents?, notes? }` · out: `Application`
- `update` · in: `{ id }` plus any `create` field (all optional) · out: `Application`
- `updateStatus` · in: `{ id, status }` · out: `Application`. Sets `submittedAt` the first time status becomes `submitted`.
- `delete` · in: `{ id }` · out: `{ id }`

### `recommenders` — Auth

- `list` · in: none · out: `RecommenderWithStats[]`
- `byId` · in: `{ id }` · out: `RecommenderDetail`
- `create` · in: `{ name, email?, title?, organization?, relationship?, notes? }` · out: `Recommender`
- `update` · in: `{ id }` plus any `create` field (all optional) · out: `Recommender`
- `delete` · in: `{ id }` · out: `{ id }`
- `setSharing` (P1) · in: `{ id, enabled, regenerateToken? }` · out: `{ shareEnabled, shareUrl: string | null }`

### `recommendations` — Auth (the applications ↔ recommenders join)

- `assign` · in: `{ applicationId, recommenderId, dueAt? }` · out: `RecommendationRequest`. `CONFLICT` if already assigned.
- `update` · in: `{ id, status?, dueAt?, notes? }` · out: `RecommendationRequest`. Sets `requestedAt` / `submittedAt` on status changes.
- `remove` · in: `{ id }` · out: `{ id }`

### `documents` — Auth

- `list` · in: `{ type? }` · out: `DocSummary[]`
- `byId` · in: `{ id }` · out: `DocDetail`
- `create` · in: `{ title, type }` · out: `Doc`
- `update` · in: `{ id, title?, type? }` · out: `Doc`
- `delete` · in: `{ id }` · out: `{ id }`. Also deletes the document's files from Storage.
- `addVersion` · in: `{ documentId, storagePath, fileName, fileSizeBytes, changeNote? }` · out: `DocVersion`
- `downloadUrl` · in: `{ versionId }` · out: `{ url, expiresInSeconds }`

### `applicationDocuments` — Auth (the applications ↔ document_versions join)

- `attach` · in: `{ applicationId, documentVersionId }` · out: `{ applicationId, documentVersionId, attachedAt }`. Replaces any other version of the same document on that application.
- `detach` · in: `{ applicationId, documentVersionId }` · out: `{ applicationId, documentVersionId }`

### `dashboard` — Auth

- `summary` · in: none · out: `DashboardSummary`.
  `upcoming` = overdue items plus the next 30 days: applications in `researching` or `preparing` that have a deadline, and letters that are not `submitted` or `declined`, sorted by due date. `totalFeesCents` sums the fees of applications that have a `submittedAt`.

### `portal` — **Public** (P1; for recommenders, no login)

- `byToken` · in: `{ token }` · out: `PortalView`. Works only when `share_enabled` is true; returns only letters in `requested`, `confirmed` or `submitted`.
- `markSubmitted` · in: `{ token, requestId }` · out: `{ id, status, submittedAt }`. Only for that recommender's letters.

## 7. Pages and UX

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page: value proposition, screenshots, sign-up button |
| `/login`, `/signup` | Public | Supabase email + password |
| `/dashboard` | Auth | Upcoming deadlines, counts by status, letters outstanding per recommender, total fees |
| `/applications` | Auth | Table with kind and status filters, search, sort by deadline, inline status select, "New application" dialog. P1: board view |
| `/applications/[id]` | Auth | Details and edit. **Letters** section: assign a recommender, set status and due date. **Documents** section: attach a version, download. P1: "newer version available" |
| `/recommenders`, `/recommenders/[id]` | Auth | Letter counts per recommender; detail lists their letters across all applications. P1: reminder email draft, share link |
| `/documents`, `/documents/[id]` | Auth | Version history, upload a new version with a change note, see which applications use each version |
| `/r/[token]` | Public (P1) | Recommender portal: their requested letters, mark as submitted |

UX rules:

- Deadlines show relative time ("in 3 days") and the absolute date in the user's local time zone. Urgency: overdue → red, ≤ 3 days → orange, ≤ 7 days → amber. Always pair color with text.
- `offer` is labeled "Admitted" for `grad_school` and "Offer" for `internship`.
- Every list has a loading skeleton, an empty state with a call to action, and an error state.
- Mutations show a toast and invalidate the affected queries. Status changes are optimistic and roll back on error.
- Confirm before deleting an application, a document, or a version that is attached to applications.
- Works at 375 px wide. Use shadcn/ui (Card, Table, Badge, Dialog, Select, Tabs, Skeleton, toast).

## 8. Scope

- **P0 — must work on Vercel by 12/1:** auth and the profile trigger · applications CRUD and status · recommenders and letter tracking · documents, versions, upload/download, attaching versions to applications · dashboard.
- **P1 — only after P0 is deployed:** kanban board (one column per status, dnd-kit, reuses `applications.updateStatus`) · "newer version available" badge with one-click update · reminder email draft (a `mailto:` link listing the recommender's pending programs and deadlines) · recommender portal · calendar month view.
- **P2 — not building; for the "future ideas" part of the video:** email reminders with Vercel Cron · calendar subscription (.ics feed) · text diff between essay versions · status history timeline and stats · AI extraction of deadlines and requirements from a program page · shared program catalog with crowd-sourced deadlines.

## 9. Build plan

Owners: **A** = applications + dashboard · **B** = recommenders · **C** = documents + Storage. Phases 1–2 are done together.

**Phase 1 — Foundation and docs (due 11/25)**

- 1.1 Make sure the template runs locally and deploys to Vercel. List the env vars Vercel needs. Remind us to add the Vercel URL to Supabase Auth → URL Configuration and to turn off email confirmation for development and the demo.
- 1.2 Write the Drizzle schema for §4: enums, tables, constraints, indexes, and Drizzle `relations`. Don't run migrations yet; show the code and explain each relationship.
- 1.3 Generate and apply the migration. Then write the SQL for the profile trigger, RLS and owner policies on every table, and the `documents` bucket with its storage policies.
- 1.4 Create the tRPC routers for §6 with real Zod inputs and typed outputs; bodies may throw `NOT_IMPLEMENTED` for now. This keeps the documentation and the code in sync.
- 1.5 Write `docs/schema-and-api.md` for the 11/25 submission: every table (columns, types, PK/FK, constraints), the relationship summary, and every procedure with its access level and a realistic JSON example of its input and output. Leave a spot for a screenshot of the Supabase Schema Visualizer.

**Phase 2 — Auth and app shell**

- 2.1 Sign up (with display name), log in, log out; redirect signed-out users away from app routes.
- 2.2 App shell: navigation (Dashboard, Applications, Recommenders, Documents), user menu, landing page.

**Phase 3 — Applications (A)**

- 3.1 Implement the `applications` router with ownership checks.
- 3.2 `/applications`: filters, search, sort, inline status select (optimistic).
- 3.3 Create/edit dialog with validation and a date + time deadline input (defaults to 11:59 PM local time).
- 3.4 `/applications/[id]` with placeholder Letters and Documents sections.

**Phase 4 — Recommenders (B)**

- 4.1 Implement the `recommenders` and `recommendations` routers.
- 4.2 `/recommenders` list (letter counts, next due date) and detail page.
- 4.3 Letters section on the application detail page.

**Phase 5 — Documents (C)**

- 5.1 Upload helper (browser → `documents` bucket) and the `documents` router, including `addVersion` and `downloadUrl`.
- 5.2 `/documents` list and detail: version history, upload with a change note, where each version is used.
- 5.3 `applicationDocuments` router and the Documents section on the application detail page.

**Phase 6 — Dashboard (A)**

- 6.1 `dashboard.summary` and `/dashboard`.

**Phase 7 — P1 (only if P0 is deployed and working)**

- 7.1 Kanban board
- 7.2 Newer-version badge
- 7.3 Reminder email draft
- 7.4 Recommender portal
- 7.5 Calendar view

**Phase 8 — Demo readiness (12/2–12/4)**

- 8.1 Seed script (runs locally; service-role key from `.env.local`): a demo user; about 8 grad school and 4 internship applications across all statuses; 3 recommenders with mixed letter statuses; an SOP with 4 versions, a CV with 3 and a resume with 2 (small placeholder PDFs), attached to applications. **Generate every date relative to today** so the dashboard looks current on demo day.
- 8.2 Polish: empty, loading and error states; mobile layout; consistent badges.
- 8.3 Checklist on the production Vercel URL: sign up, create, edit, change status, assign a recommender, upload, download, attach, delete. No console errors.

## 10. Definition of done (every step)

- Type check and lint pass; no `any`.
- Protected procedures check auth and ownership; inputs are validated with Zod.
- The UI handles loading, empty and error states.
- It works on the Vercel deployment, not only on localhost.
- The reply ends with a **How it works** section (§0, rule 3).

## 11. Known gotchas

- If Drizzle connects through Supabase's transaction pooler (port 6543), prepared statements must be off: `postgres(url, { prepare: false })`.
- Server-side Supabase clients read the session from cookies (`@supabase/ssr`), as in our template.
- Store and compare deadlines as `timestamptz`; convert to local time only for display.
- Uploading is two steps (Storage upload, then `documents.addVersion`). If the second step fails, delete the uploaded object.
- Deleting a document also deletes its files from Storage.
- Only one teammate changes the schema at a time (pull first, then generate the migration), or migrations will conflict.
