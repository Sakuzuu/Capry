-- Visitors may read event details, but never the author's account ID.
revoke select on public.events from anon, authenticated;
grant select (
  id, latitude, longitude, event_date, start_time, end_time,
  end_day_offset, status, created_at, updated_at
) on public.events to anon, authenticated;

-- This read-only API deliberately aggregates protected response rows.
-- It has no user-controlled SQL, returns no account identifiers, and uses a
-- fixed search path. The underlying response tables remain private under RLS.
create function public.list_public_events()
returns table (
  id uuid,
  latitude double precision,
  longitude double precision,
  event_date date,
  start_time time without time zone,
  end_time time without time zone,
  end_day_offset smallint,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  planned_count bigint,
  low_count bigint,
  medium_count bigint,
  full_count bigint,
  last_report_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.latitude, e.longitude, e.event_date, e.start_time, e.end_time,
    e.end_day_offset, e.status, e.created_at, e.updated_at,
    (select count(*) from public.planned_attendance a where a.event_id = e.id),
    crowd.low_count, crowd.medium_count, crowd.full_count, crowd.last_report_at
  from public.events e
  cross join lateral (
    select
      count(*) filter (where r.level = 'low' and r.reported_at >= now() - interval '2 hours') as low_count,
      count(*) filter (where r.level = 'medium' and r.reported_at >= now() - interval '2 hours') as medium_count,
      count(*) filter (where r.level = 'full' and r.reported_at >= now() - interval '2 hours') as full_count,
      max(r.reported_at) as last_report_at
    from public.crowd_reports r
    where r.event_id = e.id
  ) crowd
  where e.status in ('planned', 'active');
$$;

revoke all on function public.list_public_events() from public;
grant execute on function public.list_public_events() to anon, authenticated;
