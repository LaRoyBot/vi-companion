create schema if not exists private;

create table if not exists private.mcp_oauth_client_review_queue (
  client_id text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count bigint not null default 1
);
create table if not exists private.approved_mcp_oauth_clients (
  client_id text primary key,
  display_name text not null,
  active boolean not null default true,
  approved_at timestamptz not null default now()
);

alter table private.mcp_oauth_client_review_queue enable row level security;
alter table private.approved_mcp_oauth_clients enable row level security;
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant select on private.approved_mcp_oauth_clients to supabase_auth_admin;
grant insert, update on private.mcp_oauth_client_review_queue to supabase_auth_admin;

create or replace function private.vi_companion_access_token_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  client_id text := nullif(event->>'client_id', '');
  audiences jsonb;
  resource text := 'https://vi-companion.vercel.app/mcp';
begin
  if client_id is not null then
    insert into private.mcp_oauth_client_review_queue(client_id)
    values (client_id)
    on conflict (client_id) do update
      set last_seen_at = now(),
          seen_count = private.mcp_oauth_client_review_queue.seen_count + 1;

    if exists (select 1 from private.approved_mcp_oauth_clients a
      where a.client_id = client_id and a.active) then
      audiences := claims->'aud';
      if jsonb_typeof(audiences) = 'string' then audiences := jsonb_build_array(audiences #>> '{}');
      elsif jsonb_typeof(audiences) <> 'array' then audiences := '[]'::jsonb; end if;

      if not exists (select 1 from jsonb_array_elements_text(audiences) a(value) where a.value='authenticated') then
        audiences := audiences || jsonb_build_array('authenticated');
      end if;
      if not exists (select 1 from jsonb_array_elements_text(audiences) a(value) where a.value=resource) then
        audiences := audiences || jsonb_build_array(resource);
      end if;
      claims := jsonb_set(claims, '{aud}', audiences, true);
      claims := jsonb_set(claims, '{mcp_scopes}', '["player:read","player:write"]'::jsonb, true);
    end if;
  end if;
  return jsonb_build_object('claims', claims);
end;
$$;

revoke all on function private.vi_companion_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.vi_companion_access_token_hook(jsonb) to supabase_auth_admin;
comment on table private.mcp_oauth_client_review_queue is 'OAuth client IDs observed by the VI Companion Auth hook and awaiting publisher verification.';
comment on table private.approved_mcp_oauth_clients is 'Explicitly approved OAuth client IDs that can receive VI Companion MCP audience and scopes.';
