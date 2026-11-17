-- Supabase default privileges may grant anon directly, separately from PUBLIC.
revoke all on function public.publish_designed_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean,text,text,text) from public, anon;
revoke all on function private.publish_designed_party(double precision,double precision,date,time,time,smallint,text,text,uuid,boolean,text,text,text) from public, anon;
