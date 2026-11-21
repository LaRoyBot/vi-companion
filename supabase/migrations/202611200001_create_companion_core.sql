-- VI Companion core schema.
-- Personal player records only; no game assets or game-derived knowledge are stored.

create extension if not exists pgcrypto;
create type public.platform_kind as enum ('ps5','xbox');
create type public.session_state as enum ('active','completed','cancelled');
create type public.objective_state as enum ('active','paused','completed','archived');
create type public.objective_priority as enum ('low','normal','high');
create type public.collection_item_state as enum ('not_started','in_progress','completed','skipped');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

create table public.player_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
 display_name text check(display_name is null or char_length(display_name) between 1 and 60),
 preferred_platform public.platform_kind,
 spoiler_preference text not null default 'avoid' check(spoiler_preference in('avoid','ask_first','all_ok')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.platform_profiles(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 platform public.platform_kind not null,label text not null check(char_length(label) between 1 and 60),
 connection_mode text not null default 'manual' check(connection_mode='manual'),
 connection_status text not null default 'manual_profile' check(connection_status='manual_profile'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,platform,label)
);
create table public.play_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 platform public.platform_kind not null,platform_profile_id uuid references public.platform_profiles(id) on delete set null,
 label text not null default 'Play session' check(char_length(label) between 1 and 100),
 focus text check(focus is null or char_length(focus)<=300),private_note text check(private_note is null or char_length(private_note)<=2000),
 status public.session_state not null default 'active',started_at timestamptz not null default now(),ended_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ended_at is null or ended_at>=started_at),check(status<>'completed' or ended_at is not null)
);
create unique index one_active_session_per_platform on public.play_sessions(user_id,platform) where status='active';

create table public.objectives(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 title text not null check(char_length(title) between 2 and 120),description text check(description is null or char_length(description)<=1000),
 category text not null default 'personal',status public.objective_state not null default 'active',
 priority public.objective_priority not null default 'normal',progress integer not null default 0 check(progress between 0 and 100),
 due_at timestamptz,completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status<>'completed' or progress=100)
);
create table public.objective_updates(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 objective_id uuid not null references public.objectives(id) on delete cascade,progress integer not null check(progress between 0 and 100),
 note text check(note is null or char_length(note)<=500),created_at timestamptz not null default now()
);
create table public.collections(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 title text not null check(char_length(title) between 2 and 100),description text check(description is null or char_length(description)<=500),
 category text not null default 'personal',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.collection_items(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 collection_id uuid not null references public.collections(id) on delete cascade,label text not null check(char_length(label) between 1 and 160),
 personal_note text check(personal_note is null or char_length(personal_note)<=500),status public.collection_item_state not null default 'not_started',
 sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.personal_notes(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 title text not null check(char_length(title) between 1 and 120),body text not null check(char_length(body) between 1 and 4000),
 tags text[] not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.user_consents(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 consent_type text not null,version text not null,granted_at timestamptz not null default now(),revoked_at timestamptz,created_at timestamptz not null default now()
);
create table public.tool_audit_events(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 tool_name text not null check(char_length(tool_name) between 1 and 80),outcome text not null check(outcome in('success','rejected','error')),created_at timestamptz not null default now()
);

create index play_sessions_user_started_idx on public.play_sessions(user_id,started_at desc);
create index objectives_user_status_idx on public.objectives(user_id,status,priority);
create index objective_updates_user_created_idx on public.objective_updates(user_id,created_at desc);
create index collection_items_collection_idx on public.collection_items(collection_id,sort_order);
create index personal_notes_user_created_idx on public.personal_notes(user_id,created_at desc);

create trigger player_profiles_updated_at before update on public.player_profiles for each row execute function public.set_updated_at();
create trigger platform_profiles_updated_at before update on public.platform_profiles for each row execute function public.set_updated_at();
create trigger play_sessions_updated_at before update on public.play_sessions for each row execute function public.set_updated_at();
create trigger objectives_updated_at before update on public.objectives for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger collection_items_updated_at before update on public.collection_items for each row execute function public.set_updated_at();
create trigger personal_notes_updated_at before update on public.personal_notes for each row execute function public.set_updated_at();

do $$
declare t text;
begin
 foreach t in array array['player_profiles','platform_profiles','play_sessions','objectives','collections','personal_notes','user_consents'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I on public.%I for select to authenticated using(user_id=(select auth.uid()))',t||'_select_own',t);
  execute format('create policy %I on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',t||'_insert_own',t);
  execute format('create policy %I on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t||'_update_own',t);
  execute format('create policy %I on public.%I for delete to authenticated using(user_id=(select auth.uid()))',t||'_delete_own',t);
 end loop;
end $$;

alter table public.objective_updates enable row level security;
create policy objective_updates_select_own on public.objective_updates for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid())));
create policy objective_updates_insert_own on public.objective_updates for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid())));
create policy objective_updates_update_own on public.objective_updates for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid())));
create policy objective_updates_delete_own on public.objective_updates for delete to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid())));

alter table public.collection_items enable row level security;
create policy collection_items_select_own on public.collection_items for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())));
create policy collection_items_insert_own on public.collection_items for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())));
create policy collection_items_update_own on public.collection_items for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())));
create policy collection_items_delete_own on public.collection_items for delete to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())));

alter table public.tool_audit_events enable row level security;
revoke all on public.tool_audit_events from anon,authenticated;
revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
