# VI Companion MCP and OAuth operations

## Canonical endpoints

- MCP resource: `https://vi-companion.vercel.app/mcp`
- Path-aware OAuth protected-resource metadata: `https://vi-companion.vercel.app/.well-known/oauth-protected-resource/mcp`
- Root compatibility metadata: `https://vi-companion.vercel.app/.well-known/oauth-protected-resource`
- Authorization server issuer: `https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1`
- OIDC discovery: `https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1/.well-known/openid-configuration`
- UserInfo: `https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1/oauth/userinfo`
- Consent UI: `https://vi-companion.vercel.app/oauth/consent`
- Domain challenge: `https://vi-companion.vercel.app/.well-known/openai-apps-challenge`

The MCP resource server uses stateless Streamable HTTP. Its path-aware protected-resource metadata is inserted before the `/mcp` path as required by RFC 9728; the root alias remains for compatibility. The `mcp-handler` adapter verifies JWT signature, issuer, expiry, Supabase's `authenticated` audience, the exact signed MCP `resource` claim, OAuth client ID and internal MCP capability claims. Each player-data call is then validated with Supabase Auth and executed as the authenticated user under PostgreSQL RLS.

## Supabase cloud project activation

The dedicated Supabase project is `ixjbqsviiesrgpnjwvvy`, region `ap-south-1`. The code configuration is committed in `supabase/config.toml`, but changing that file in GitHub does not itself change hosted Supabase Auth settings.

Enable the following in Supabase Dashboard → Authentication:

1. **URL Configuration:** Site URL `https://vi-companion.vercel.app`; additional redirect URL `https://vi-companion.vercel.app/auth/callback`.
2. **OAuth Server:** enable OAuth 2.1, set authorization path `/oauth/consent`, enable Dynamic Client Registration.
3. **JWT Signing Keys:** activate an asymmetric ES256 or RS256 signing key. The MCP service intentionally rejects HS256.
4. **Hooks:** attach `private.vi_companion_access_token_hook(jsonb)` as the Custom Access Token Hook.
5. **Authentication providers:** enable the selected first-party account sign-in provider. Email signup is implemented in the web UI.

The project's Auth APIs currently report `feature_disabled` for OAuth discovery, so OAuth Server is not yet enabled in the hosted project. Do not report OAuth as working until that endpoint responds with discovery metadata and an end-to-end PKCE flow succeeds.

## OAuth scopes and profile identity

`mcp.json` requests `openid email profile` on every OAuth request. Supabase provides OIDC discovery and `/oauth/userinfo`; these let ChatGPT associate the connected account and obtain email identity. The custom resource-server scope is separate from OIDC scopes.

The custom access-token hook records new OAuth `client_id` values in `private.mcp_oauth_client_review_queue`. It grants the MCP resource audience and `mcp_scopes` only after that exact client ID has been approved in `private.approved_mcp_oauth_clients`. An unreviewed client receives no VI Companion MCP access.

After the official ChatGPT DCR client appears, inspect:

```sql
select client_id, first_seen_at, last_seen_at, seen_count
from private.mcp_oauth_client_review_queue
order by last_seen_at desc;
```

Independently verify the client belongs to the ChatGPT connection for VI Companion, then insert only that ID:

```sql
insert into private.approved_mcp_oauth_clients(client_id, display_name)
values ('<verified-client-id>', 'OpenAI ChatGPT — VI Companion')
on conflict (client_id) do update
set display_name = excluded.display_name, active = true;
```

To revoke it, set `active = false`. Never approve arbitrary or user-supplied client IDs.

## Vercel environment

Production, Preview and Development are configured for:

- `NEXT_PUBLIC_SUPABASE_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_FUNCTIONS_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co/functions/v1`
- `MCP_AUTH_ISSUER=https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1`
- `MCP_RESOURCE_URL=https://vi-companion.vercel.app/mcp`

Do not expose a service-role key in the Next.js project environment.

### OpenAI domain verification

The OpenAI developer portal generates the challenge token. Add the exact token as encrypted Vercel environment variable `OPENAI_APPS_CHALLENGE_TOKEN` for Production, then redeploy. The challenge route returns that exact string as `text/plain`, with no JSON wrapper or extra newline. The route returns 503 until the portal-generated value exists; it must not be guessed.

## Validation and release gates

- Health endpoint: `/api/health` reports application configuration.
- Protected-resource metadata: correct canonical resource and issuer.
- MCP: initialize, tools/list and unauthenticated `get_connection_status` call succeed over Streamable HTTP.
- Auth challenge: player-data call without a bearer returns the MCP authentication challenge.
- OAuth: DCR, PKCE, UserInfo, refresh, client allowlisting and audience validation pass end-to-end.
- Negative auth: expired, HS256, wrong issuer, wrong audience, ordinary password token and unapproved OAuth client are rejected.
- Isolation: cross-user access is blocked for tables and child rows; note contents are private; exports and account deletion work with a dedicated test account.
- Public listing: verified publisher identity, portal challenge, current production tool scan, exactly five positive and three negative test cases, reviewer access, demo recording, approved privacy policy and terms, and review acceptance.
- Legal: the public policy pages are placeholders and need operator/contact details, retention schedule, processor list, transfer terms and legal review before public use.
