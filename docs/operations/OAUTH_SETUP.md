# VI Companion MCP and OAuth runbook

## Resource server
The canonical MCP endpoint is `https://vi-companion.vercel.app/mcp`, served by Next.js using `mcp-handler` over stateless Streamable HTTP. OAuth middleware validates the JWT signature, exact Supabase Auth issuer, expiry, Supabase `authenticated` audience plus the MCP resource audience, client identity and internal MCP scopes. Each data call is revalidated through Supabase Auth and runs as the signed-in user under PostgreSQL RLS.

Protected-resource metadata is at `/.well-known/oauth-protected-resource`. Supabase's authorization server issuer is `https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1`.

## Supabase dashboard configuration
For project `ixjbqsviiesrgpnjwvvy`:

1. Authentication → URL Configuration: Site URL `https://vi-companion.vercel.app`; allow `https://vi-companion.vercel.app/auth/callback`.
2. Authentication → OAuth Server: enable OAuth 2.1.
3. Set Authorization Path to `/oauth/consent`.
4. Enable Dynamic Client Registration for ChatGPT.
5. Authentication → JWT Signing Keys: activate an asymmetric ES256 or RS256 signing key. The MCP server intentionally rejects HS256.
6. Authentication → Hooks: attach `private.vi_companion_access_token_hook(jsonb)` as the Custom Access Token Hook.
7. Enable email/password or another supported account sign-in provider.

Supabase's custom token hook records OAuth-issued client IDs in a private review queue. It does **not** grant the MCP audience or player scopes until an operator explicitly approves that client ID in `private.approved_mcp_oauth_clients`. This prevents unrelated OAuth clients registered with the same Supabase project from using the VI Companion resource.

## OAuth client approval
After ChatGPT first initiates DCR and requests authorization, inspect pending IDs in Supabase SQL Editor:

```sql
select client_id, first_seen_at, last_seen_at, seen_count
from private.mcp_oauth_client_review_queue
order by last_seen_at desc;
```

Verify a candidate is the official ChatGPT OAuth client registered for VI Companion. Then approve only that exact ID:

```sql
insert into private.approved_mcp_oauth_clients(client_id, display_name)
values ('<verified-chatgpt-dcr-client-id>', 'OpenAI ChatGPT — VI Companion')
on conflict (client_id) do update
set display_name = excluded.display_name, active = true;
```

Never approve an arbitrary ID. To revoke immediately:

```sql
update private.approved_mcp_oauth_clients set active = false
where client_id = '<client-id>';
```

The next access-token refresh/re-authorization picks up the approved claims. Reconnect ChatGPT after approval.

## Vercel environment
Configured for Production, Preview and Development:
- `NEXT_PUBLIC_SUPABASE_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_FUNCTIONS_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co/functions/v1`
- `MCP_AUTH_ISSUER=https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1`
- `MCP_RESOURCE_URL=https://vi-companion.vercel.app/mcp`
- `OPENAI_APPS_CHALLENGE_TOKEN=<token returned by the OpenAI developer portal>` (add only after the portal creates it)

Never expose a service-role key in the Next.js project environment.

## OpenAI domain verification
The OpenAI portal generates a unique token. Configure it as `OPENAI_APPS_CHALLENGE_TOKEN`. The route `/.well-known/openai-apps-challenge` returns that exact raw string with no newline. Do not guess the value or publish the token elsewhere.

## Smoke tests
- `GET /api/health` returns 200.
- `GET /.well-known/oauth-protected-resource` lists the canonical resource and Supabase authorization server.
- MCP initialize and tools/list work over Streamable HTTP.
- Unauthenticated player-data tool calls include `mcp/www_authenticate`.
- Expired, HS256, wrong-issuer, wrong-audience and unapproved OAuth-client tokens are rejected.
- Approved DCR/PKCE tokens contain `client_id`, `sub`, `role=authenticated`, both allowed audiences and `mcp_scopes`.
- Password/magic-link tokens do not receive the MCP resource audience or scopes.
- Verify cross-account isolation, child-row ownership, note privacy and collection progress.
- Test deletion only with a dedicated test account.

## Public listing gates
Publisher verification, OpenAI portal domain verification, five positive and three negative test cases, reviewer access, an authentic walkthrough recording and approval are separate portal steps. Privacy and terms need legal/operator details and approval before public launch.
