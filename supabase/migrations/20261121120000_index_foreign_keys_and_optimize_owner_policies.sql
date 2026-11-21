-- Cover foreign-key lookups that were not already served by a suitable index.
create index if not exists collection_items_user_id_idx on public.collection_items(user_id);
create index if not exists collections_user_id_idx on public.collections(user_id);
create index if not exists objective_updates_objective_id_idx on public.objective_updates(objective_id);
create index if not exists play_sessions_platform_profile_id_idx on public.play_sessions(platform_profile_id);
create index if not exists tool_audit_events_user_id_idx on public.tool_audit_events(user_id);
create index if not exists user_consents_user_id_idx on public.user_consents(user_id);

-- Wrap auth.uid() in a scalar subquery so PostgreSQL can evaluate it once per
-- statement rather than re-evaluating it for each candidate row.
drop policy if exists collections_own on public.collections;
create policy collections_own on public.collections
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists objectives_own on public.objectives;
create policy objectives_own on public.objectives
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists personal_notes_own on public.personal_notes;
create policy personal_notes_own on public.personal_notes
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists platform_profiles_own on public.platform_profiles;
create policy platform_profiles_own on public.platform_profiles
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists play_sessions_own on public.play_sessions;
create policy play_sessions_own on public.play_sessions
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists player_profiles_own on public.player_profiles;
create policy player_profiles_own on public.player_profiles
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists user_consents_own on public.user_consents;
create policy user_consents_own on public.user_consents
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists tool_audit_events_own on public.tool_audit_events;
create policy tool_audit_events_own on public.tool_audit_events
for select to authenticated
using (user_id = (select auth.uid()));
