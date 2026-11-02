-- Keep the RLS-bypassing aggregation outside the Data API schema.
alter function public.list_public_events() set schema private;
revoke all on function private.list_public_events() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.list_public_events() to anon, authenticated;

-- The exposed entry point has invoker privileges and a fixed result shape.
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
security invoker
set search_path = ''
as $$
  select * from private.list_public_events();
$$;

revoke all on function public.list_public_events() from public;
grant execute on function public.list_public_events() to anon, authenticated;
