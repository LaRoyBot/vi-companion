-- A client_id alone is not enough: require both the approved client and the
-- exact VI Companion resource claim for any OAuth-issued database request.
-- Browser sessions without client_id remain governed by their user-scoped RLS.
create or replace function private.vi_companion_client_access_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (auth.jwt()->>'client_id') is null
    or (
      auth.jwt()->>'resource' = 'https://vi-companion.vercel.app/mcp'
      and exists (
        select 1
        from private.approved_mcp_oauth_clients approved
        where approved.client_id = (auth.jwt()->>'client_id')
          and approved.active = true
      )
    );
$$;

revoke all on function private.vi_companion_client_access_allowed() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.vi_companion_client_access_allowed() to authenticated;
