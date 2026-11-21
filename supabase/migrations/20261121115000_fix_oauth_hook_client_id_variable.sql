-- Avoid PL/pgSQL ambiguity between the OAuth client variable and queue column.
-- The hook still reads client_id from event.claims.client_id.
create or replace function private.vi_companion_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  oauth_client_id text := nullif(claims->>'client_id', '');
  authentication_method text := coalesce(event->>'authentication_method', '');
  mcp_resource text := 'https://vi-companion.vercel.app/mcp';
begin
  if oauth_client_id is not null
     and authentication_method in ('oauth', 'oauth_provider/authorization_code', 'token_refresh') then
    insert into private.mcp_oauth_client_review_queue(client_id)
    values (oauth_client_id)
    on conflict (client_id) do update
      set last_seen_at = now(),
          seen_count = private.mcp_oauth_client_review_queue.seen_count + 1;

    if exists (
      select 1
      from private.approved_mcp_oauth_clients approved
      where approved.client_id = oauth_client_id
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
