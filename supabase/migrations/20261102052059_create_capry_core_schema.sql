-- Capry starts in Quito. Calendar dates and wall-clock times below use
-- America/Guayaquil; activity timestamps use timestamptz (UTC internally).
create extension if not exists postgis with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users (id) on delete set null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(Point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
  ) stored,
  event_date date,
  start_time time without time zone not null,
  end_time time without time zone,
  end_day_offset smallint not null default 0 check (end_day_offset in (0, 1)),
  status text not null default 'active'
    check (status in ('planned', 'active', 'ended', 'cancelled', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_time_consistent check (
    (end_time is null and end_day_offset = 0)
    or (end_time is not null and (
      end_day_offset = 1 or end_time > start_time
    ))
  ),
  constraint events_planned_date_required check (
    status <> 'planned' or event_date is not null
  )
);

comment on column public.events.id is 'Random public identifier used in shareable event links.';
comment on column public.events.event_date is 'Optional Quito calendar date. If omitted, use the Quito date of created_at as the event start date.';
comment on column public.events.start_time is 'Local wall-clock time in America/Guayaquil.';
comment on column public.events.end_time is 'NULL is the only representation of an unspecified end.';
comment on column public.events.end_day_offset is '0 = same local date; 1 = the following local date. Must be 0 when end_time is NULL.';

create index events_location_gist_idx on public.events using gist (location);
create index events_status_date_idx on public.events (status, event_date, start_time);

create table public.planned_attendance (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index planned_attendance_user_idx on public.planned_attendance (user_id);

create table public.crowd_reports (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('low', 'medium', 'full')),
  reported_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on column public.crowd_reports.reported_at is 'Server-stamped instant. Count only reports with reported_at >= now() - interval ''2 hours'' for the live indicator.';

create index crowd_reports_recent_idx on public.crowd_reports (event_id, reported_at desc);
create index crowd_reports_user_idx on public.crowd_reports (user_id);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (event_id, reporter_id)
);

create index moderation_reports_event_created_idx on public.moderation_reports (event_id, created_at desc);
create index moderation_reports_reporter_idx on public.moderation_reports (reporter_id);

-- The client cannot invent creation/report times or change event ownership.
create function private.stamp_event_times()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.id is distinct from old.id or new.creator_id is distinct from old.creator_id then
      raise exception 'Event identity and creator cannot be changed';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger stamp_event_times
before insert or update on public.events
for each row execute function private.stamp_event_times();

create function private.stamp_creation_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger stamp_attendance_creation_time
before insert on public.planned_attendance
for each row execute function private.stamp_creation_time();

create trigger stamp_moderation_creation_time
before insert on public.moderation_reports
for each row execute function private.stamp_creation_time();

create function private.stamp_report_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.event_id is distinct from old.event_id
    or new.user_id is distinct from old.user_id
  ) then
    raise exception 'Report event and author cannot be changed';
  end if;
  new.reported_at := now();
  return new;
end;
$$;

create trigger stamp_report_time
before insert or update on public.crowd_reports
for each row execute function private.stamp_report_time();

alter table public.events enable row level security;
alter table public.planned_attendance enable row level security;
alter table public.crowd_reports enable row level security;
alter table public.moderation_reports enable row level security;

revoke all on public.events, public.planned_attendance, public.crowd_reports,
  public.moderation_reports from anon, authenticated;

grant select on public.events to anon, authenticated;
grant insert, update on public.events to authenticated;

create policy events_are_public on public.events
for select to anon, authenticated using (true);

create policy creators_can_add_events on public.events
for insert to authenticated
with check ((select auth.uid()) = creator_id);

create policy creators_can_edit_events on public.events
for update to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

grant select, insert, delete on public.planned_attendance to authenticated;

create policy users_see_their_attendance on public.planned_attendance
for select to authenticated using ((select auth.uid()) = user_id);

create policy users_add_their_attendance on public.planned_attendance
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy users_remove_their_attendance on public.planned_attendance
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.crowd_reports to authenticated;

create policy users_see_their_crowd_reports on public.crowd_reports
for select to authenticated using ((select auth.uid()) = user_id);

create policy users_add_their_crowd_reports on public.crowd_reports
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy users_refresh_their_crowd_reports on public.crowd_reports
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy users_remove_their_crowd_reports on public.crowd_reports
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert on public.moderation_reports to authenticated;

create policy users_see_their_moderation_reports on public.moderation_reports
for select to authenticated using ((select auth.uid()) = reporter_id);

create policy users_add_moderation_reports on public.moderation_reports
for insert to authenticated with check ((select auth.uid()) = reporter_id);
