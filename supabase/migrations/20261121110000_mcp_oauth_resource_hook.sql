-- Add one fixed resource audience to OAuth-issued access tokens; retain authenticated for RLS.
create schema if not exists private;
create or replace function private.vi_companion_access_token_hook(event jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare claims jsonb:=coalesce(event->'claims','{}'::jsonb);aud jsonb;method text:=coalesce(event->>'authentication_method','');resource text:='https://vi-companion.vercel.app/mcp';
begin
 if claims?'client_id' and method in('oauth','oauth_provider/authorization_code','token_refresh') then
  aud:=claims->'aud';
  if jsonb_typeof(aud)='string' then aud:=jsonb_build_array(aud#>>'{}');elsif jsonb_typeof(aud)<>'array' then aud:='[]'::jsonb;end if;
  if not exists(select 1 from jsonb_array_elements_text(aud) x(value) where x.value=resource) then aud:=aud||jsonb_build_array(resource);end if;
  claims:=jsonb_set(claims,'{aud}',aud,true);
  claims:=jsonb_set(claims,'{mcp_scopes}','["player:read","player:write"]'::jsonb,true);
 end if;
 return jsonb_build_object('claims',claims);
end $$;
revoke all on function private.vi_companion_access_token_hook(jsonb) from public,anon,authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.vi_companion_access_token_hook(jsonb) to supabase_auth_admin;
