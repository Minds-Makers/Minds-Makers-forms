-- Minds Makers Forms — Supabase schema
-- Run this once against a fresh Supabase project (SQL editor or `supabase db push`).
-- Order matters: tables -> indexes -> RLS -> RPCs -> realtime.

-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  schema jsonb not null,
  published_schema jsonb,
  version int not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  form_version int not null,
  answers jsonb not null,
  source text not null default 'direct',
  duration_sec int,
  is_spam boolean not null default false,
  submitted_at timestamptz not null default now()
);

create table if not exists form_events (
  id bigserial primary key,
  form_id uuid not null references forms(id) on delete cascade,
  kind text not null check (kind in ('view','start')),
  session_id text,
  created_at timestamptz not null default now()
);

-- Lightweight rate-limit counter used by submit_response (per form, per minute).
create table if not exists submission_rate_limit (
  form_id uuid not null references forms(id) on delete cascade,
  minute_bucket bigint not null,
  count int not null default 0,
  primary key (form_id, minute_bucket)
);

create index if not exists idx_responses_form_submitted on responses (form_id, submitted_at desc);
create index if not exists idx_form_events_form_kind on form_events (form_id, kind);
create index if not exists idx_forms_slug on forms (slug);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

alter table forms enable row level security;
alter table responses enable row level security;
alter table form_events enable row level security;
alter table submission_rate_limit enable row level security;

-- forms: owner has full access to their own rows. No anonymous access at all —
-- public reads go through the get_public_form() RPC below instead.
create policy "forms_owner_select" on forms for select
  using (auth.uid() = owner_id);
create policy "forms_owner_insert" on forms for insert
  with check (auth.uid() = owner_id);
create policy "forms_owner_update" on forms for update
  using (auth.uid() = owner_id);
create policy "forms_owner_delete" on forms for delete
  using (auth.uid() = owner_id);

-- responses: owner can read/update/delete their own form's responses.
-- Anonymous users get NO policy here at all — inserts only happen via the
-- security-definer submit_response() RPC, which bypasses RLS deliberately.
create policy "responses_owner_select" on responses for select
  using (exists (select 1 from forms f where f.id = responses.form_id and f.owner_id = auth.uid()));
create policy "responses_owner_update" on responses for update
  using (exists (select 1 from forms f where f.id = responses.form_id and f.owner_id = auth.uid()));
create policy "responses_owner_delete" on responses for delete
  using (exists (select 1 from forms f where f.id = responses.form_id and f.owner_id = auth.uid()));

-- form_events: owner can read; inserts only via log_form_event() RPC.
create policy "form_events_owner_select" on form_events for select
  using (exists (select 1 from forms f where f.id = form_events.form_id and f.owner_id = auth.uid()));

-- submission_rate_limit: internal bookkeeping table, no direct client access at all.
-- (No policies created — RLS enabled with zero policies means nobody can touch it
-- directly; only the security-definer RPCs below, which run as the table owner, can.)

-- ============================================================================
-- 3. RPCS (security definer — the only way anonymous visitors touch data)
-- ============================================================================

-- Returns just the public-safe columns of a published form, or null.
create or replace function get_public_form(p_slug text)
returns table (
  id uuid,
  title text,
  slug text,
  published_schema jsonb,
  version int,
  settings jsonb
)
language sql
security definer
set search_path = public
as $$
  select f.id, f.title, f.slug, f.published_schema, f.version, f.settings
  from forms f
  where f.slug = p_slug and f.status = 'published'
  limit 1;
$$;

grant execute on function get_public_form(text) to anon, authenticated;

-- Logs a view/start event. Never raises — analytics tracking must never break the form.
create or replace function log_form_event(p_form_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('view', 'start') then
    return;
  end if;
  insert into form_events (form_id, kind) values (p_form_id, p_kind);
exception when others then
  -- swallow errors silently; event logging is best-effort
  null;
end;
$$;

grant execute on function log_form_event(uuid, text) to anon, authenticated;

-- Validates and inserts a public submission. This is the ONLY path an
-- anonymous visitor has to write into `responses`.
create or replace function submit_response(
  p_form_id uuid,
  p_answers jsonb,
  p_source text,
  p_duration_sec int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form forms%rowtype;
  v_response_count int;
  v_minute bigint;
  v_bucket_count int;
  v_new_id uuid;
begin
  select * into v_form from forms where id = p_form_id;

  if v_form.id is null then
    raise exception 'form not found';
  end if;
  if v_form.status <> 'published' then
    raise exception 'form is not published';
  end if;
  if v_form.settings ? 'closeDate'
     and (v_form.settings->>'closeDate') is not null
     and (v_form.settings->>'closeDate')::timestamptz < now() then
    raise exception 'form is closed';
  end if;
  if v_form.settings ? 'responseLimit' and (v_form.settings->>'responseLimit') is not null then
    select count(*) into v_response_count from responses where form_id = p_form_id;
    if v_response_count >= (v_form.settings->>'responseLimit')::int then
      raise exception 'response limit reached';
    end if;
  end if;

  -- Payload size guard (~100 KB).
  if pg_column_size(p_answers) > 100000 then
    raise exception 'payload too large';
  end if;

  -- Rate limit: max 10 submissions per form per minute.
  v_minute := floor(extract(epoch from now()) / 60);
  insert into submission_rate_limit (form_id, minute_bucket, count)
  values (p_form_id, v_minute, 1)
  on conflict (form_id, minute_bucket) do update set count = submission_rate_limit.count + 1
  returning count into v_bucket_count;
  if v_bucket_count > 10 then
    raise exception 'too many submissions, try again shortly';
  end if;

  insert into responses (form_id, form_version, answers, source, duration_sec)
  values (p_form_id, v_form.version, p_answers, coalesce(p_source, 'direct'), p_duration_sec)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function submit_response(uuid, jsonb, text, int) to anon, authenticated;

-- ============================================================================
-- 4. REALTIME
-- ============================================================================

-- Enable realtime on responses so the dashboard can subscribe to INSERTs.
-- RLS still applies to realtime, so an owner only receives events for their
-- own forms' responses.
alter publication supabase_realtime add table responses;

-- ============================================================================
-- 5. NOTES
-- ============================================================================
-- - Create your admin user manually: Supabase dashboard -> Authentication -> Add user.
--   Public sign-up is intentionally not wired into the frontend.
-- - `schema` is a draft the builder edits; `published_schema` is the last published
--   snapshot served by get_public_form(). Publishing copies schema -> published_schema
--   and increments `version`.
