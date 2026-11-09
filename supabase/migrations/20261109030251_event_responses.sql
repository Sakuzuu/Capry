-- One public event detail, including events no longer visible on the live map.
-- Only aggregate counts and timestamps leave the protected response tables.
create function private.event_details(p_event_id uuid)
returns table (
  id uuid, latitude double precision, longitude double precision,
  event_date date, start_time time without time zone,
  end_time time without time zone, end_day_offset smallint,
  status text, created_at timestamptz, updated_at timestamptz,
  planned_count bigint, low_count bigint, medium_count bigint,
  full_count bigint, last_report_at timestamptz, publication_count bigint
)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.latitude, e.longitude, e.event_date, e.start_time,
    e.end_time, e.end_day_offset, e.status, e.created_at, e.updated_at,
    (select count(*) from public.planned_attendance a where a.event_id = e.id),
    count(r.event_id) filter (where r.level = 'low' and r.reported_at >= now() - interval '2 hours'),
    count(r.event_id) filter (where r.level = 'medium' and r.reported_at >= now() - interval '2 hours'),
    count(r.event_id) filter (where r.level = 'full' and r.reported_at >= now() - interval '2 hours'),
    max(r.reported_at),
    1 + (select count(*) from public.event_contributions c where c.event_id = e.id)
  from public.events e
  left join public.crowd_reports r on r.event_id = e.id
  where e.id = p_event_id
  group by e.id;
$$;
revoke all on function private.event_details(uuid) from public;
grant execute on function private.event_details(uuid) to anon, authenticated;

create function public.event_details(p_event_id uuid)
returns table (
  id uuid, latitude double precision, longitude double precision,
  event_date date, start_time time without time zone,
  end_time time without time zone, end_day_offset smallint,
  status text, created_at timestamptz, updated_at timestamptz,
  planned_count bigint, low_count bigint, medium_count bigint,
  full_count bigint, last_report_at timestamptz, publication_count bigint
)
language sql stable security invoker set search_path = ''
as $$ select * from private.event_details(p_event_id); $$;
revoke all on function public.event_details(uuid) from public;
grant execute on function public.event_details(uuid) to anon, authenticated;

-- Direct Data API callers must obey the same schedule rules as the web app.
create function private.can_respond_to_event(p_event_id uuid, p_crowd boolean)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (
        (not p_crowd and e.status = 'planned'
          and ((e.event_date + e.start_time) at time zone 'America/Guayaquil') > now())
        or
        (e.status = 'active'
          and ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
            + e.start_time) at time zone 'America/Guayaquil') <= now()
          and (e.end_time is null or
            ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
              + e.end_day_offset + e.end_time) at time zone 'America/Guayaquil') > now()))
      )
  );
$$;
revoke all on function private.can_respond_to_event(uuid, boolean) from public;
grant execute on function private.can_respond_to_event(uuid, boolean) to authenticated;

drop policy users_add_their_attendance on public.planned_attendance;
create policy users_add_their_attendance on public.planned_attendance
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and private.can_respond_to_event(event_id, false)
  );
drop policy users_add_their_crowd_reports on public.crowd_reports;
create policy users_add_their_crowd_reports on public.crowd_reports
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and private.can_respond_to_event(event_id, true)
  );
drop policy users_refresh_their_crowd_reports on public.crowd_reports;
create policy users_refresh_their_crowd_reports on public.crowd_reports
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and private.can_respond_to_event(event_id, true)
  );
