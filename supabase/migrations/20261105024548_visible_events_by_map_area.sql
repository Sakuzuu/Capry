-- Read only currently visible gatherings. Group connected reports within 250 m
-- when their local schedule matches, so the result is device independent.
create function private.visible_events_in_bounds(
  p_west double precision, p_south double precision,
  p_east double precision, p_north double precision
)
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
  with recursive
  candidates as materialized (
    select e.*, coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date) as local_date,
      ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
        + e.start_time) at time zone 'America/Guayaquil') as starts_at,
      case when e.end_time is not null then
        ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
          + e.end_day_offset + e.end_time) at time zone 'America/Guayaquil')
      end as ends_at
    from public.events e
    where e.longitude between p_west - 0.003 and p_east + 0.003
      and e.latitude between p_south - 0.003 and p_north + 0.003
      and e.status in ('planned', 'active')
  ),
  visible as materialized (
    select c.* from candidates c
    where (c.status = 'planned' and c.starts_at > now())
       or (c.status = 'active' and c.starts_at <= now()
         and (c.ends_at >= now() or (c.ends_at is null and
           coalesce((select max(r.reported_at) from public.crowd_reports r
             where r.event_id = c.id), c.created_at) >= now() - interval '2 hours')))
  ),
  edges as (
    select a.id as from_id, b.id as to_id
    from visible a join visible b on a.id <> b.id
      and a.local_date = b.local_date
      and a.start_time = b.start_time
      and a.end_time is not distinct from b.end_time
      and a.end_day_offset = b.end_day_offset
      and extensions.st_dwithin(a.location, b.location, 250)
  ),
  walk(root_id, member_id) as (
    select id, id from visible
    union
    select w.root_id, edge.to_id from walk w
      join edges edge on edge.from_id = w.member_id
  ),
  membership as (
    select member_id, min(root_id::text)::uuid as group_id
    from walk group by member_id
  ),
  groups as (
    select m.group_id, count(*) as publication_count,
      bool_or(v.longitude between p_west and p_east
        and v.latitude between p_south and p_north) as in_view
    from membership m join visible v on v.id = m.member_id
    group by m.group_id
  ),
  totals as (
    select m.group_id, count(distinct a.user_id) as planned_count,
      count(distinct r.user_id) filter (where r.level = 'low' and r.reported_at >= now() - interval '2 hours') as low_count,
      count(distinct r.user_id) filter (where r.level = 'medium' and r.reported_at >= now() - interval '2 hours') as medium_count,
      count(distinct r.user_id) filter (where r.level = 'full' and r.reported_at >= now() - interval '2 hours') as full_count,
      max(r.reported_at) as last_report_at
    from membership m
    left join public.planned_attendance a on a.event_id = m.member_id
    left join public.crowd_reports r on r.event_id = m.member_id
    group by m.group_id
  )
  select v.id, v.latitude, v.longitude, v.event_date, v.start_time,
    v.end_time, v.end_day_offset, v.status, v.created_at, v.updated_at,
    t.planned_count, t.low_count, t.medium_count, t.full_count,
    t.last_report_at, g.publication_count
  from groups g join visible v on v.id = g.group_id
    join totals t on t.group_id = g.group_id
  where g.in_view
  order by v.starts_at, v.id;
$$;

revoke all on function private.visible_events_in_bounds(double precision,double precision,double precision,double precision) from public;
grant execute on function private.visible_events_in_bounds(double precision,double precision,double precision,double precision) to anon, authenticated;

create function public.visible_events_in_bounds(
  p_west double precision, p_south double precision,
  p_east double precision, p_north double precision
)
returns table (
  id uuid, latitude double precision, longitude double precision,
  event_date date, start_time time without time zone,
  end_time time without time zone, end_day_offset smallint,
  status text, created_at timestamptz, updated_at timestamptz,
  planned_count bigint, low_count bigint, medium_count bigint,
  full_count bigint, last_report_at timestamptz, publication_count bigint
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.visible_events_in_bounds(p_west,p_south,p_east,p_north)
  where p_west between -180 and 180 and p_east between -180 and 180
    and p_south between -90 and 90 and p_north between -90 and 90
    and p_west < p_east and p_south < p_north
    and p_east - p_west <= 2 and p_north - p_south <= 2;
$$;
revoke all on function public.visible_events_in_bounds(double precision,double precision,double precision,double precision) from public;
grant execute on function public.visible_events_in_bounds(double precision,double precision,double precision,double precision) to anon, authenticated;
