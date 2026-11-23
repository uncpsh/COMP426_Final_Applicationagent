-- Custom migration (hand-written; Drizzle does not generate this).
-- It covers the parts of the database that live outside the Drizzle schema:
--   1. the trigger that creates a profile for every new auth user,
--   2. Row Level Security and owner-only policies on every table,
--   3. the private `documents` storage bucket and its policies.

-- ====================================================================
-- 1. Profile trigger
-- ====================================================================
-- Supabase Auth owns `auth.users`. When it inserts a user, this trigger
-- creates the matching row in `public.profiles`, taking `display_name` from
-- the sign-up metadata (`options.data.display_name` in `auth.signUp`).
--
-- `security definer`: the insert runs as the function's owner, because the
-- auth service's own role has no rights on our tables.
-- `set search_path = ''`: every name below is schema-qualified, so the
-- function cannot be tricked into using a look-alike object.
-- If this function raised an error the sign-up itself would fail, so it
-- always produces a non-empty name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New user'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
--> statement-breakpoint
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

-- ====================================================================
-- 2. Row Level Security
-- ====================================================================
-- Our server (Drizzle) connects as the table owner, which bypasses RLS, so
-- the tRPC procedures do the real authorization. RLS is here because the
-- publishable key ships to the browser and Supabase's auto-generated REST
-- API would otherwise expose every table to anyone holding it.
--
-- With RLS on and no policy for the `anon` role, signed-out requests see
-- nothing. Signed-in users (`authenticated`) only reach their own rows.
-- `(select auth.uid())` instead of `auth.uid()` lets Postgres evaluate the
-- user id once per query rather than once per row.
alter table public.profiles enable row level security;
--> statement-breakpoint
alter table public.applications enable row level security;
--> statement-breakpoint
alter table public.recommenders enable row level security;
--> statement-breakpoint
alter table public.recommendation_requests enable row level security;
--> statement-breakpoint
alter table public.documents enable row level security;
--> statement-breakpoint
alter table public.document_versions enable row level security;
--> statement-breakpoint
alter table public.application_documents enable row level security;
--> statement-breakpoint

-- profiles: read and update your own row. No insert policy (the trigger
-- creates it) and no delete policy (it goes away with the auth user).
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
--> statement-breakpoint
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
--> statement-breakpoint

-- User-owned tables: the row's `user_id` must be the signed-in user.
create policy "applications_owner_all" on public.applications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
--> statement-breakpoint
create policy "recommenders_owner_all" on public.recommenders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
--> statement-breakpoint
create policy "documents_owner_all" on public.documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
--> statement-breakpoint

-- Child and join tables have no `user_id`; they are authorized through
-- their parents. Writing a join row requires owning BOTH sides, otherwise a
-- user could link another user's row to their own and read it.
create policy "recommendation_requests_owner_all" on public.recommendation_requests
  for all to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.recommenders r
      where r.id = recommender_id and r.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint
create policy "document_versions_owner_all" on public.document_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint
create policy "application_documents_owner_all" on public.application_documents
  for all to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.document_versions v
      join public.documents d on d.id = v.document_id
      where v.id = document_version_id and d.user_id = (select auth.uid())
    )
  );
--> statement-breakpoint

-- ====================================================================
-- 3. Storage
-- ====================================================================
-- Private bucket: PDF and DOCX only, 10 MB per file. The bucket itself
-- enforces the type and size limits, so the browser cannot bypass them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
--> statement-breakpoint

-- Object paths are `{userId}/{documentId}/{randomUUID}-{fileName}`.
-- A signed-in user may only touch objects whose first folder is their own id.
create policy "documents_bucket_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
--> statement-breakpoint
create policy "documents_bucket_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
--> statement-breakpoint
create policy "documents_bucket_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
--> statement-breakpoint
create policy "documents_bucket_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
