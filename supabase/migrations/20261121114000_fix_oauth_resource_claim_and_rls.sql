-- Supabase's Custom Access Token Hook receives OAuth client_id inside event.claims.
-- Keep aud as the Supabase-required "authenticated" string; bind this JWT to the
-- MCP resource through the signed resource claim consumed by the MCP resource server.
create or replace function private.vi_companion_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  client_id text := nullif(claims->>'client_id', '');
  authentication_method text := coalesce(event->>'authentication_method', '');
  mcp_resource text := 'https://vi-companion.vercel.app/mcp';
begin
  if client_id is not null
     and authentication_method in ('oauth', 'oauth_provider/authorization_code', 'token_refresh') then
    insert into private.mcp_oauth_client_review_queue(client_id)
    values (client_id)
    on conflict (client_id) do update
      set last_seen_at = now(),
          seen_count = private.mcp_oauth_client_review_queue.seen_count + 1;

    if exists (
      select 1
      from private.approved_mcp_oauth_clients approved
      where approved.client_id = client_id
        and approved.active = true
    ) then
      claims := jsonb_set(claims, '{resource}', to_jsonb(mcp_resource), true);
      claims := jsonb_set(
        claims,
        '{mcp_scopes}',
        '["player:read","player:write"]'::jsonb,
        true
      );
    else
      claims := claims - 'resource' - 'mcp_scopes';
    end if;
  else
    claims := claims - 'resource' - 'mcp_scopes';
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

revoke all on function private.vi_companion_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.vi_companion_access_token_hook(jsonb) to supabase_auth_admin;

-- Prevent an OAuth client that has not been approved for this MCP resource from
-- using the project's public Supabase key to query player data directly.
-- Browser sessions without an OAuth client_id remain available to the web app.
create or replace function private.vi_companion_client_access_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (auth.jwt()->>'client_id') is null
    or exists (
      select 1
      from private.approved_mcp_oauth_clients approved
      where approved.client_id = (auth.jwt()->>'client_id')
        and approved.active = true
    );
$$;

revoke all on function private.vi_companion_client_access_allowed() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.vi_companion_client_access_allowed() to authenticated;

-- Restrictive policies are ANDed with the existing per-user ownership policies.
-- They do not grant access on their own; they only narrow existing privileges.
drop policy if exists mcp_client_allowlist_guard on public.player_profiles;
create policy mcp_client_allowlist_guard on public.player_profiles
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.platform_profiles;
create policy mcp_client_allowlist_guard on public.platform_profiles
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.play_sessions;
create policy mcp_client_allowlist_guard on public.play_sessions
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.objectives;
create policy mcp_client_allowlist_guard on public.objectives
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.objective_updates;
create policy mcp_client_allowlist_guard on public.objective_updates
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.collections;
create policy mcp_client_allowlist_guard on public.collections
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.collection_items;
create policy mcp_client_allowlist_guard on public.collection_items
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.personal_notes;
create policy mcp_client_allowlist_guard on public.personal_notes
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());

drop policy if exists mcp_client_allowlist_guard on public.user_consents;
create policy mcp_client_allowlist_guard on public.user_consents
as restrictive
for all to authenticated
using (private.vi_companion_client_access_allowed())
with check (private.vi_companion_client_access_allowed());
