-- Presentation stays separate from the established event/schedule API.
create table public.event_designs (
  event_id uuid primary key references public.events(id) on delete cascade,
  title text check (title is null or char_length(title) between 1 and 80),
  cover_preset text not null default 'night' check (cover_preset in ('night','aurora','pulse')),
  cover_path text unique check (cover_path is null or cover_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$')
);
alter table public.event_designs enable row level security;
revoke all on public.event_designs from anon, authenticated;
grant select on public.event_designs to anon, authenticated;
create policy event_designs_are_public on public.event_designs for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers','event-covers',true,3145728,array['image/jpeg','image/png','image/webp']);
create policy accounts_upload_event_covers on storage.objects for insert to authenticated with check (
  bucket_id = 'event-covers' and owner_id = (select auth.uid())::text
  and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
);
create policy accounts_read_own_cover_drafts on storage.objects for select to authenticated using (
  bucket_id = 'event-covers' and owner_id = (select auth.uid())::text
);
create policy accounts_remove_unused_cover_drafts on storage.objects for delete to authenticated using (
  bucket_id = 'event-covers' and owner_id = (select auth.uid())::text
  and not exists (select 1 from public.event_designs d where d.cover_path = name)
);

-- The event and its design are committed together. A failed cover validation
-- rolls back the publication; confirming another event never changes its cover.
create function private.publish_designed_party(
  p_latitude double precision, p_longitude double precision, p_event_date date,
  p_start_time time, p_end_time time, p_end_day_offset smallint,
  p_status text, p_action text, p_candidate_id uuid, p_allow_separate boolean,
  p_title text, p_cover_preset text, p_cover_path text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb; v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from auth.users where id=v_user and not is_anonymous) then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  if char_length(coalesce(p_title,'')) > 80 or p_cover_preset is null or p_cover_preset not in ('night','aurora','pulse') then
    raise exception 'Invalid event design' using errcode='22023';
  end if;
  if p_cover_path is not null and not exists (
    select 1 from storage.objects where bucket_id='event-covers' and name=p_cover_path and owner_id=v_user::text
  ) then raise exception 'Cover is not owned by this account' using errcode='22023'; end if;
  v_result := private.publish_party(p_latitude,p_longitude,p_event_date,p_start_time,p_end_time,p_end_day_offset,
    p_status,p_action,p_candidate_id,p_allow_separate);
  if v_result->>'outcome' = 'created' then
    insert into public.event_designs(event_id,title,cover_preset,cover_path)
    values ((v_result->>'event_id')::uuid,nullif(btrim(p_title),''),p_cover_preset,p_cover_path);
  end if;
  return v_result;
end;
$$;
revoke all on function private.publish_designed_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean,text,text,text) from public;
grant execute on function private.publish_designed_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean,text,text,text) to authenticated;
create function public.publish_designed_party(
  p_latitude double precision, p_longitude double precision, p_event_date date,
  p_start_time time, p_end_time time, p_end_day_offset smallint,
  p_status text, p_action text, p_candidate_id uuid, p_allow_separate boolean,
  p_title text, p_cover_preset text, p_cover_path text
) returns jsonb language sql volatile security invoker set search_path = '' as $$
  select private.publish_designed_party(p_latitude,p_longitude,p_event_date,p_start_time,p_end_time,p_end_day_offset,
    p_status,p_action,p_candidate_id,p_allow_separate,p_title,p_cover_preset,p_cover_path);
$$;
revoke all on function public.publish_designed_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean,text,text,text) from public;
grant execute on function public.publish_designed_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean,text,text,text) to authenticated;
