-- Khaleesi Saithe — schema inicial do sketchbook digital.
-- Aplique no projeto Supabase de destino após conferir as políticas e secrets.

create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.artist_profile (
  id integer primary key check (id = 1),
  artist_name text not null default 'Khaleesi Saithe' check (char_length(btrim(artist_name)) between 2 and 120),
  bio text not null default '' check (char_length(bio) <= 2000),
  location text not null default '' check (char_length(location) <= 180),
  public_email text not null default '' check (public_email = '' or (char_length(public_email) <= 254 and public_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')),
  whatsapp_number text not null default '' check (whatsapp_number = '' or whatsapp_number ~ '^\+?[0-9 .()\-]{8,32}$'),
  instagram_url text not null default '' check (instagram_url = '' or (char_length(instagram_url) <= 1000 and instagram_url ~* '^https://[^[:space:]]+$')),
  instagram_embed_url text not null default '' check (instagram_embed_url = '' or (char_length(instagram_embed_url) <= 1000 and instagram_embed_url ~* '^https://[^[:space:]]+$')),
  pinterest_board_url text not null default '' check (pinterest_board_url = '' or (char_length(pinterest_board_url) <= 1000 and pinterest_board_url ~* '^https://[^[:space:]]+$')),
  pinterest_embed_url text not null default '' check (pinterest_embed_url = '' or (char_length(pinterest_embed_url) <= 1000 and pinterest_embed_url ~* '^https://[^[:space:]]+$')),
  timezone text not null default '',
  slot_duration_minutes integer null check (slot_duration_minutes between 15 and 480),
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.artist_profile (id, artist_name)
values (1, 'Khaleesi Saithe')
on conflict (id) do nothing;

create table if not exists public.weekly_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at),
  unique (weekday, opens_at, closes_at)
);

create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (char_length(reason) <= 250),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  whatsapp text not null check (char_length(whatsapp) between 8 and 32),
  tattoo_description text not null check (char_length(tattoo_description) between 10 and 2000),
  body_location text not null check (char_length(body_location) between 2 and 100),
  approximate_size text not null check (char_length(approximate_size) between 1 and 100),
  reference_notes text not null default '' check (char_length(reference_notes) <= 2000),
  reference_url text not null default '' check (char_length(reference_url) <= 1000),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  privacy_consent boolean not null check (privacy_consent),
  consent_at timestamptz not null default now(),
  decision_note text not null default '' check (char_length(decision_note) <= 1000),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  exclude using gist (tstzrange(scheduled_start, scheduled_end, '[)') with &&)
    where (status in ('pending', 'approved'))
);

create index if not exists appointments_created_at_idx on public.appointments (created_at desc);
create index if not exists appointments_status_start_idx on public.appointments (status, scheduled_start);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default '' check (char_length(category) <= 80),
  image_path text not null,
  image_alt text not null default '' check (char_length(image_alt) <= 250),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('flash', 'art')),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  image_path text not null,
  dimensions text not null default '' check (char_length(dimensions) <= 100),
  price numeric(10,2) null check (price is null or price >= 0),
  status text not null default 'available' check (status in ('available', 'reserved', 'sold', 'unavailable')),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  request_kind text not null check (request_kind in ('access', 'correction', 'deletion')),
  message text not null default '' check (char_length(message) <= 1500),
  consent boolean not null check (consent),
  status text not null default 'pending' check (status in ('pending', 'in_review', 'completed', 'rejected')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);

create table if not exists public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  kind text not null check (kind in ('owner_new_request', 'customer_decision')),
  status text not null check (status in ('sent', 'failed', 'not_configured')),
  provider_message_id text null,
  error_code text null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  actor_user_id uuid null,
  changed_fields text[] not null default '{}',
  occurred_at timestamptz not null default now()
);

create table if not exists private.booking_rate_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_rate_attempts_hash_time_idx on private.booking_rate_attempts (email_hash, created_at desc);
create table if not exists private.privacy_rate_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists privacy_rate_attempts_hash_time_idx on private.privacy_rate_attempts (email_hash, created_at desc);
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin(candidate_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select candidate_user = auth.uid()
    and exists (select 1 from public.admin_users where user_id = candidate_user)
$$;
revoke all on function private.is_admin(uuid) from public;
grant execute on function private.is_admin(uuid) to anon, authenticated;

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  row_json jsonb;
  changed text[] := '{}';
  key_name text;
  target_id uuid;
begin
  if tg_op = 'DELETE' then
    row_json := to_jsonb(old);
  else
    row_json := to_jsonb(new);
  end if;
  begin target_id := (row_json ->> 'id')::uuid; exception when others then target_id := null; end;
  if tg_op = 'UPDATE' then
    for key_name in select jsonb_object_keys(to_jsonb(new)) loop
      if (to_jsonb(old) -> key_name) is distinct from (to_jsonb(new) -> key_name) then
        changed := array_append(changed, key_name);
      end if;
    end loop;
  elsif tg_op = 'INSERT' then
    select coalesce(array_agg(column_name), '{}') into changed from jsonb_object_keys(row_json) as keys(column_name);
  end if;
  insert into public.audit_logs (table_name, record_id, operation, actor_user_id, changed_fields)
  values (tg_table_name, target_id, tg_op, auth.uid(), changed);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create or replace function private.validate_artist_profile_config()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.timezone <> '' and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;
  return new;
end;
$$;
create or replace function private.prevent_schedule_overlap()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  -- Serializa reservas e bloqueios para impedir conflitos entre as duas tabelas.
  perform pg_advisory_xact_lock(1458529021::bigint);
  if tg_table_name = 'appointments' then
    if new.status in ('pending', 'approved') and exists (
      select 1 from public.blocked_slots b
      where tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(new.scheduled_start, new.scheduled_end, '[)')
    ) then
      raise exception 'SLOT_BLOCKED' using errcode = '23P01';
    end if;
  elsif tg_table_name = 'blocked_slots' and exists (
    select 1 from public.appointments a
    where a.status in ('pending', 'approved')
      and tstzrange(a.scheduled_start, a.scheduled_end, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'SLOT_HAS_APPOINTMENT' using errcode = '23P01';
  end if;
  return new;
end;
$$;

grant execute on function private.audit_row_change() to anon, authenticated;
grant execute on function private.touch_updated_at() to authenticated;
grant execute on function private.validate_artist_profile_config() to authenticated;

drop trigger if exists artist_profile_touch on public.artist_profile;
drop trigger if exists artist_profile_timezone_validate on public.artist_profile;
drop trigger if exists appointments_touch on public.appointments;
drop trigger if exists portfolio_items_touch on public.portfolio_items;
drop trigger if exists catalog_items_touch on public.catalog_items;
create trigger artist_profile_touch before update on public.artist_profile for each row execute function private.touch_updated_at();
create trigger artist_profile_timezone_validate before insert or update on public.artist_profile for each row execute function private.validate_artist_profile_config();
create trigger appointments_touch before update on public.appointments for each row execute function private.touch_updated_at();
create trigger portfolio_items_touch before update on public.portfolio_items for each row execute function private.touch_updated_at();
create trigger catalog_items_touch before update on public.catalog_items for each row execute function private.touch_updated_at();
drop trigger if exists appointments_schedule_guard on public.appointments;
drop trigger if exists blocked_slots_schedule_guard on public.blocked_slots;
create trigger appointments_schedule_guard before insert or update on public.appointments for each row execute function private.prevent_schedule_overlap();
create trigger blocked_slots_schedule_guard before insert or update on public.blocked_slots for each row execute function private.prevent_schedule_overlap();

drop trigger if exists appointments_audit on public.appointments;
drop trigger if exists portfolio_items_audit on public.portfolio_items;
drop trigger if exists catalog_items_audit on public.catalog_items;
drop trigger if exists artist_profile_audit on public.artist_profile;
drop trigger if exists weekly_hours_audit on public.weekly_hours;
drop trigger if exists blocked_slots_audit on public.blocked_slots;
drop trigger if exists privacy_requests_audit on public.privacy_requests;
create trigger appointments_audit after insert or update or delete on public.appointments for each row execute function private.audit_row_change();
create trigger portfolio_items_audit after insert or update or delete on public.portfolio_items for each row execute function private.audit_row_change();
create trigger catalog_items_audit after insert or update or delete on public.catalog_items for each row execute function private.audit_row_change();
create trigger artist_profile_audit after update on public.artist_profile for each row execute function private.audit_row_change();
create trigger weekly_hours_audit after insert or update or delete on public.weekly_hours for each row execute function private.audit_row_change();
create trigger blocked_slots_audit after insert or update or delete on public.blocked_slots for each row execute function private.audit_row_change();
create trigger privacy_requests_audit after insert or update or delete on public.privacy_requests for each row execute function private.audit_row_change();

alter table public.admin_users enable row level security;
alter table public.artist_profile enable row level security;
alter table public.weekly_hours enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.catalog_items enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.email_delivery_logs enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.admin_users, public.artist_profile, public.weekly_hours, public.blocked_slots, public.appointments, public.portfolio_items, public.catalog_items, public.privacy_requests, public.email_delivery_logs, public.audit_logs from public, anon, authenticated;
grant select on public.artist_profile, public.weekly_hours, public.portfolio_items, public.catalog_items to anon, authenticated;
grant insert, update, delete on public.artist_profile, public.weekly_hours, public.portfolio_items, public.catalog_items to authenticated;
grant insert on public.blocked_slots to authenticated;
grant select, update, delete on public.appointments to authenticated;
grant select, update, delete on public.blocked_slots to authenticated;
grant select, update, delete on public.privacy_requests to authenticated;
grant select on public.email_delivery_logs, public.audit_logs to authenticated;

-- Remova policies anteriores desta migration antes de recriá-las; é seguro repetir o script.
drop policy if exists "admin profile manage" on public.artist_profile;
drop policy if exists "public hours read" on public.weekly_hours;
drop policy if exists "admin hours manage" on public.weekly_hours;
drop policy if exists "admin blocks manage" on public.blocked_slots;
drop policy if exists "admin appointments read" on public.appointments;
drop policy if exists "admin appointments update" on public.appointments;
drop policy if exists "admin appointments delete" on public.appointments;
drop policy if exists "public portfolio read" on public.portfolio_items;
drop policy if exists "admin portfolio manage" on public.portfolio_items;
drop policy if exists "public catalog read" on public.catalog_items;
drop policy if exists "admin catalog manage" on public.catalog_items;
drop policy if exists "admin privacy requests read" on public.privacy_requests;
drop policy if exists "admin privacy requests update" on public.privacy_requests;
drop policy if exists "admin privacy requests delete" on public.privacy_requests;
drop policy if exists "admin email logs read" on public.email_delivery_logs;
drop policy if exists "admin audit read" on public.audit_logs;

drop policy if exists "public profile read" on public.artist_profile;
create policy "public profile read" on public.artist_profile for select to anon, authenticated using (is_public or private.is_admin(auth.uid()));
create policy "admin profile manage" on public.artist_profile for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create policy "public hours read" on public.weekly_hours for select to anon, authenticated using (is_enabled or private.is_admin(auth.uid()));
create policy "admin hours manage" on public.weekly_hours for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create policy "admin blocks manage" on public.blocked_slots for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
create policy "admin appointments read" on public.appointments for select to authenticated using (private.is_admin(auth.uid()));
create policy "admin appointments update" on public.appointments for update to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
create policy "admin appointments delete" on public.appointments for delete to authenticated using (private.is_admin(auth.uid()));

create policy "public portfolio read" on public.portfolio_items for select to anon, authenticated using (is_published or private.is_admin(auth.uid()));
create policy "admin portfolio manage" on public.portfolio_items for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
create policy "public catalog read" on public.catalog_items for select to anon, authenticated using (is_published or private.is_admin(auth.uid()));
create policy "admin catalog manage" on public.catalog_items for all to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

create policy "admin privacy requests read" on public.privacy_requests for select to authenticated using (private.is_admin(auth.uid()));
create policy "admin privacy requests update" on public.privacy_requests for update to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
create policy "admin privacy requests delete" on public.privacy_requests for delete to authenticated using (private.is_admin(auth.uid()));
create policy "admin email logs read" on public.email_delivery_logs for select to authenticated using (private.is_admin(auth.uid()));
create policy "admin audit read" on public.audit_logs for select to authenticated using (private.is_admin(auth.uid()));

create or replace function public.get_public_slots(p_date date)
returns table (slot_start timestamptz, slot_end timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with settings as (
    select timezone, slot_duration_minutes
    from public.artist_profile
    where id = 1 and is_public = true and timezone <> '' and slot_duration_minutes is not null
      and p_date between (now() at time zone timezone)::date and (now() at time zone timezone)::date + 90
  ), ranges as (
    select
      (p_date + h.opens_at) at time zone s.timezone as opens_at,
      (p_date + h.closes_at) at time zone s.timezone as closes_at,
      s.slot_duration_minutes
    from public.weekly_hours h
    cross join settings s
    where h.weekday = extract(dow from p_date)::smallint and h.is_enabled
  ), candidates as (
    select g.slot_start, g.slot_start + make_interval(mins => r.slot_duration_minutes) as slot_end
    from ranges r
    cross join lateral generate_series(
      r.opens_at,
      r.closes_at - make_interval(mins => r.slot_duration_minutes),
      make_interval(mins => r.slot_duration_minutes)
    ) as g(slot_start)
    where g.slot_start + make_interval(mins => r.slot_duration_minutes) <= r.closes_at
  )
  select c.slot_start, c.slot_end
  from candidates c
  where c.slot_start > now()
    and not exists (
      select 1 from public.appointments a
      where a.status in ('pending', 'approved')
        and tstzrange(a.scheduled_start, a.scheduled_end, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
    and not exists (
      select 1 from public.blocked_slots b
      where tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
  order by c.slot_start
$$;
revoke all on function public.get_public_slots(date) from public;
grant execute on function public.get_public_slots(date) to anon, authenticated;

create or replace function public.create_public_appointment(
  p_name text,
  p_email text,
  p_whatsapp text,
  p_tattoo text,
  p_body_location text,
  p_size text,
  p_references text,
  p_reference_url text,
  p_start timestamptz,
  p_end timestamptz,
  p_consent boolean,
  p_honeypot text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  email_digest text;
  booking_id uuid;
  allowed_slot boolean;
  slot_duration integer;
begin
  if coalesce(p_honeypot, '') <> '' then raise exception 'INVALID_REQUEST' using errcode = '22023'; end if;
  if p_consent is not true or p_start is null or p_end is null or p_end <= p_start then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_email, ''))) > 254
    or coalesce(p_email, '') !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    or char_length(trim(coalesce(p_whatsapp, ''))) not between 8 and 32
    or char_length(trim(coalesce(p_tattoo, ''))) not between 10 and 2000
    or char_length(trim(coalesce(p_body_location, ''))) not between 2 and 100
    or char_length(trim(coalesce(p_size, ''))) not between 1 and 100
    or char_length(coalesce(p_references, '')) > 2000
    or char_length(coalesce(p_reference_url, '')) > 1000 then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  if coalesce(p_reference_url, '') <> '' and p_reference_url !~* '^https://[^[:space:]]+$' then
    raise exception 'INVALID_REFERENCE_URL' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)), 0));
  perform pg_advisory_xact_lock(972341::bigint);
  email_digest := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
  delete from private.booking_rate_attempts where created_at < now() - interval '24 hours';
  if (select count(*) from private.booking_rate_attempts where email_hash = email_digest) >= 4 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  if (select count(*) from private.booking_rate_attempts where email_hash = 'global-booking' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  select ap.slot_duration_minutes into slot_duration
  from public.artist_profile ap
  where ap.id = 1 and ap.is_public and ap.timezone <> '' and ap.slot_duration_minutes is not null;
  if slot_duration is null or extract(epoch from (p_end - p_start)) <> slot_duration * 60 then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.get_public_slots((p_start at time zone (select timezone from public.artist_profile where id = 1))::date) s
    where s.slot_start = p_start and s.slot_end = p_end
  ) into allowed_slot;
  if not allowed_slot then raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001'; end if;

  insert into public.appointments (
    full_name, email, whatsapp, tattoo_description, body_location, approximate_size,
    reference_notes, reference_url, scheduled_start, scheduled_end, status, privacy_consent, consent_at
  ) values (
    trim(p_name), lower(trim(p_email)), trim(p_whatsapp), trim(p_tattoo), trim(p_body_location), trim(p_size),
    trim(coalesce(p_references, '')), trim(coalesce(p_reference_url, '')), p_start, p_end, 'pending', true, now()
  ) returning id into booking_id;

  insert into private.booking_rate_attempts (email_hash) values (email_digest);
  insert into private.booking_rate_attempts (email_hash) values ('global-booking');
  return booking_id;
exception
  when exclusion_violation then raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
end;
$$;
revoke all on function public.create_public_appointment(text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, text) from public;
grant execute on function public.create_public_appointment(text, text, text, text, text, text, text, text, timestamptz, timestamptz, boolean, text) to anon, authenticated;

create or replace function public.create_privacy_request(
  p_name text,
  p_email text,
  p_kind text,
  p_message text,
  p_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  request_id uuid;
  email_digest text;
begin
  if p_consent is not true or char_length(trim(coalesce(p_name, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_email, ''))) > 254
    or coalesce(p_email, '') !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    or p_kind not in ('access', 'correction', 'deletion')
    or char_length(coalesce(p_message, '')) > 1500 then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)), 1));
  perform pg_advisory_xact_lock(972342::bigint);
  email_digest := encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
  delete from private.privacy_rate_attempts where created_at < now() - interval '24 hours';
  if (select count(*) from private.privacy_rate_attempts where email_hash = email_digest) >= 4 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  if (select count(*) from private.privacy_rate_attempts where email_hash = 'global-privacy' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.privacy_requests (full_name, email, request_kind, message, consent)
  values (trim(p_name), lower(trim(p_email)), p_kind, trim(coalesce(p_message, '')), true)
  returning id into request_id;
  insert into private.privacy_rate_attempts (email_hash) values (email_digest);
  insert into private.privacy_rate_attempts (email_hash) values ('global-privacy');
  return request_id;
end;
$$;
revoke all on function public.create_privacy_request(text, text, text, text, boolean) from public;
grant execute on function public.create_privacy_request(text, text, text, text, boolean) to anon, authenticated;

create or replace function public.execute_privacy_deletion(p_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  request_email text;
  request_digest text;
  appointment_ids uuid[];
  removed_count integer := 0;
begin
  if auth.uid() is null or not private.is_admin(auth.uid()) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  select email into request_email
  from public.privacy_requests
  where id = p_request_id and request_kind = 'deletion' and status <> 'completed'
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;

  request_digest := encode(digest(lower(trim(request_email)), 'sha256'), 'hex');
  select coalesce(array_agg(id), '{}'::uuid[]) into appointment_ids
  from public.appointments where email = lower(trim(request_email));
  delete from public.email_delivery_logs where appointment_id = any(appointment_ids);
  delete from public.appointments where id = any(appointment_ids);
  get diagnostics removed_count = row_count;
  delete from private.booking_rate_attempts where email_hash = request_digest;
  delete from private.privacy_rate_attempts where email_hash = request_digest;
  update public.audit_logs set record_id = null where table_name = 'appointments' and record_id = any(appointment_ids);
  delete from public.privacy_requests where email = lower(trim(request_email)) and id <> p_request_id;
  update public.privacy_requests
  set full_name = 'Solicitação anonimizada',
      email = 'anon+' || replace(p_request_id::text, '-', '') || '@example.invalid',
      message = '', status = 'completed', completed_at = now(), handled_by = auth.uid()
  where id = p_request_id;
  return removed_count;
end;
$$;
revoke all on function public.execute_privacy_deletion(uuid) from public, anon;
grant execute on function public.execute_privacy_deletion(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-images', 'portfolio-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "public read portfolio images" on storage.objects;
create policy "public read portfolio images" on storage.objects for select to anon, authenticated using (bucket_id = 'portfolio-images');
drop policy if exists "admin upload portfolio images" on storage.objects;
create policy "admin upload portfolio images" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio-images' and private.is_admin(auth.uid()));
drop policy if exists "admin update portfolio images" on storage.objects;
create policy "admin update portfolio images" on storage.objects for update to authenticated using (bucket_id = 'portfolio-images' and private.is_admin(auth.uid())) with check (bucket_id = 'portfolio-images' and private.is_admin(auth.uid()));
drop policy if exists "admin delete portfolio images" on storage.objects;
create policy "admin delete portfolio images" on storage.objects for delete to authenticated using (bucket_id = 'portfolio-images' and private.is_admin(auth.uid()));

-- Customer reference fields are text/URL only; no private customer image uploads are accepted in this version.
