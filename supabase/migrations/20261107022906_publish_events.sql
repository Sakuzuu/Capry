-- A confirmation adds a reversible contribution, never merges event rows.
create table public.event_contributions (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_contributions enable row level security;
revoke all on public.event_contributions from anon, authenticated;
grant select, delete on public.event_contributions to authenticated;
create policy contributors_see_own on public.event_contributions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy contributors_withdraw_own on public.event_contributions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The map now groups only explicitly confirmed contributions. Nearby distinct
-- events retain separate map markers even when their schedule is identical.
create or replace function private.visible_events_in_bounds(
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
  select e.id, e.latitude, e.longitude, e.event_date, e.start_time,
    e.end_time, e.end_day_offset, e.status, e.created_at, e.updated_at,
    (select count(*) from public.planned_attendance a where a.event_id = e.id),
    (select count(*) from public.crowd_reports r where r.event_id = e.id
      and r.level = 'low' and r.reported_at >= now() - interval '2 hours'),
    (select count(*) from public.crowd_reports r where r.event_id = e.id
      and r.level = 'medium' and r.reported_at >= now() - interval '2 hours'),
    (select count(*) from public.crowd_reports r where r.event_id = e.id
      and r.level = 'full' and r.reported_at >= now() - interval '2 hours'),
    (select max(r.reported_at) from public.crowd_reports r where r.event_id = e.id),
    1 + (select count(*) from public.event_contributions c where c.event_id = e.id)
  from public.events e
  where e.longitude between p_west and p_east
    and e.latitude between p_south and p_north
    and e.status in ('planned', 'active')
    and (
      (e.status = 'planned' and
        ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
          + e.start_time) at time zone 'America/Guayaquil') > now())
      or
      (e.status = 'active' and
        ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
          + e.start_time) at time zone 'America/Guayaquil') <= now()
        and (case when e.end_time is not null then
          ((coalesce(e.event_date, (e.created_at at time zone 'America/Guayaquil')::date)
            + e.end_day_offset + e.end_time) at time zone 'America/Guayaquil') >= now()
        else coalesce((select max(r.reported_at) from public.crowd_reports r
          where r.event_id = e.id), e.created_at) >= now() - interval '2 hours' end))
    )
  order by e.created_at desc, e.id;
$$;

create function private.publish_party(
  p_latitude double precision, p_longitude double precision,
  p_event_date date, p_start_time time, p_end_time time,
  p_end_day_offset smallint, p_status text, p_action text,
  p_candidate_id uuid default null, p_allow_separate boolean default false
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_day date := coalesce(p_event_date, (now() at time zone 'America/Guayaquil')::date);
  v_point extensions.geography;
  v_candidates jsonb;
  v_match public.events%rowtype;
  v_new_id uuid;
begin
  if v_user is null or (select is_anonymous from auth.users where id = v_user) then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_latitude is null or p_longitude is null or
    not (p_latitude between -0.5 and 0.1 and p_longitude between -78.8 and -78.2) then
    raise exception 'Location outside Quito' using errcode = '22023';
  end if;
  if p_start_time is null or p_status not in ('planned', 'active') or
    p_end_day_offset not in (0,1) or
    (p_end_time is null and p_end_day_offset <> 0) or
    (p_end_time is not null and p_end_day_offset = 0 and p_end_time <= p_start_time) or
    p_action not in ('check','create','confirm') then
    raise exception 'Invalid schedule' using errcode = '22023';
  end if;
  if p_status = 'planned' and
    (p_event_date is null or
      ((v_day + p_start_time) at time zone 'America/Guayaquil') <= now()) then
    raise exception 'Future event requires a future date and time' using errcode = '22023';
  end if;
  if p_status = 'active' and
    (((v_day + p_start_time) at time zone 'America/Guayaquil') > now() or
      (p_end_time is not null and
        ((v_day + p_end_day_offset + p_end_time) at time zone 'America/Guayaquil') <= now())) then
    raise exception 'Active event must be happening now' using errcode = '22023';
  end if;

  v_point := extensions.st_setsrid(
    extensions.st_makepoint(p_longitude, p_latitude),4326)::extensions.geography;
  if p_action <> 'check' then
    -- Serialize the candidate check and insert to avoid two concurrent first posts.
    lock table public.events in share row exclusive mode;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'latitude',e.latitude,'longitude',e.longitude,
    'event_date',e.event_date,'start_time',e.start_time,
    'end_time',e.end_time,'end_day_offset',e.end_day_offset,'status',e.status,
    'same_schedule',e.start_time = p_start_time
      and e.end_time is not distinct from p_end_time
      and e.end_day_offset = p_end_day_offset
  ) order by e.created_at desc), '[]'::jsonb)
  into v_candidates
  from public.events e
  where e.status in ('planned','active')
    and coalesce(e.event_date,(e.created_at at time zone 'America/Guayaquil')::date) = v_day
    and extensions.st_dwithin(e.location,v_point,250);

  if p_action = 'check' then
    return jsonb_build_object('outcome','candidates','candidates',v_candidates);
  end if;
  if p_action = 'confirm' then
    select * into v_match from public.events e where e.id = p_candidate_id
      and e.status in ('planned','active')
      and coalesce(e.event_date,(e.created_at at time zone 'America/Guayaquil')::date) = v_day
      and e.start_time = p_start_time
      and e.end_time is not distinct from p_end_time
      and e.end_day_offset = p_end_day_offset
      and extensions.st_dwithin(e.location,v_point,250);
    if not found then
      return jsonb_build_object('outcome','candidate_changed','candidates',v_candidates);
    end if;
    if v_match.creator_id <> v_user then
      insert into public.event_contributions(event_id,user_id)
        values(v_match.id,v_user) on conflict do nothing;
    end if;
    return jsonb_build_object('outcome','confirmed','event_id',v_match.id);
  end if;
  if jsonb_array_length(v_candidates) > 0 and not p_allow_separate then
    return jsonb_build_object('outcome','needs_confirmation','candidates',v_candidates);
  end if;
  insert into public.events(creator_id,latitude,longitude,event_date,start_time,
    end_time,end_day_offset,status)
  values(v_user,p_latitude,p_longitude,p_event_date,p_start_time,
    p_end_time,p_end_day_offset,p_status) returning id into v_new_id;
  return jsonb_build_object('outcome','created','event_id',v_new_id);
end;
$$;
revoke all on function private.publish_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean) from public;
grant execute on function private.publish_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean) to authenticated;

create function public.publish_party(
  p_latitude double precision, p_longitude double precision,
  p_event_date date, p_start_time time, p_end_time time,
  p_end_day_offset smallint, p_status text, p_action text,
  p_candidate_id uuid default null, p_allow_separate boolean default false
)
returns jsonb language sql volatile security invoker set search_path = ''
as $$
  select private.publish_party(p_latitude,p_longitude,p_event_date,p_start_time,
    p_end_time,p_end_day_offset,p_status,p_action,p_candidate_id,p_allow_separate);
$$;
revoke all on function public.publish_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean) from public;
grant execute on function public.publish_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean) to authenticated;
