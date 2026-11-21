# VI Companion MCP and OAuth setup

## Server
The public resource is `https://vi-companion.vercel.app/mcp`, served by Next.js with `mcp-handler` and stateless Streamable HTTP. OAuth middleware verifies the JWT signature, issuer, expiry, exact audience, OAuth client identity and player scopes. Each player-data call is revalidated with Supabase Auth and runs under user-scoped RLS.

## Supabase dashboard steps
For project `ixjbqsviiesrgpnjwvvy`:
1. Authentication → URL Configuration: Site URL `https://vi-companion.vercel.app`; allow `https://vi-companion.vercel.app/auth/callback`.
2. Authentication → OAuth Server: enable OAuth 2.1.
3. Set Authorization Path to `/oauth/consent`.
4. Enable Dynamic Client Registration for initial ChatGPT connection if offered.
5. Authentication → JWT Signing Keys: activate asymmetric ES256 or RS256. MCP intentionally rejects HS256.
6. Authentication → Hooks: select `private.vi_companion_access_token_hook(jsonb)` as Custom Access Token Hook.
7. Enable email/password sign-up, or another supported provider.

The token hook adds one fixed MCP audience to OAuth access tokens, preserves the Supabase `authenticated` audience for RLS, and adds internal scopes only when an OAuth client identity and OAuth/token-refresh method are present. It is a single-resource setup. Validate real PKCE token claims before external submission.

## Vercel environment
Set Production, Preview and Development:
- `NEXT_PUBLIC_SUPABASE_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_FUNCTIONS_URL=https://ixjbqsviiesrgpnjwvvy.supabase.co/functions/v1`
- `MCP_AUTH_ISSUER=https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1`
- `MCP_RESOURCE_URL=https://vi-companion.vercel.app/mcp`

Never expose a service-role key to the Next.js app.

## Tests
Check `/api/health`; `/.well-known/oauth-protected-resource`; MCP initialize/tools/list; unauthenticated tool-call challenge; invalid, expired and wrong-audience tokens; a real DCR/PKCE exchange; ordinary password token rejection; cross-user isolation including child rows; and account deletion against a dedicated test user.

Remaining review gates: enable OAuth in dashboard, verify live PKCE/DCR, legal approval of privacy/terms and support contact, developer identity verification, OpenAI domain challenge, sample reviewer credentials, exactly five positive and three negative tests, demo recording and OpenAI review.
