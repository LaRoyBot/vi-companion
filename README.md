# VI Companion

VI Companion is an independent personal player workspace for PS5 and Xbox Series X|S. It helps players keep manually entered sessions, objectives, collections, platform labels and private notes together in one account.

It is not affiliated with Rockstar Games, Take-Two Interactive, Sony, Microsoft or OpenAI.

## What it does

- Player profile and preferences, including preferred platform and spoiler preference.
- Manual play-session tracking. Sessions are not detected from a running console.
- Personal objectives, priorities, due dates and progress.
- Personal collections and checklist items.
- Private notes and tags.
- Data export and account deletion after explicit confirmation.
- Remote MCP tools for use with compatible ChatGPT experiences.

## What it does not do

- It does not connect to PSN or Xbox accounts, collect console credentials, read console/game state or automate gameplay.
- It does not inspect game memory, network traffic, screenshots, video or audio.
- It does not host or retrieve GTA-derived game knowledge, guides or media. Knowledge retrieval is disabled pending rights review.
- It does not store ChatGPT conversation history.

## Architecture

- `apps/web`: Next.js web companion, Supabase account sign-in, OAuth consent UI, and remote MCP resource server.
- `apps/web/app/mcp/route.ts`: stateless Streamable HTTP MCP endpoint using `mcp-handler`.
- `apps/web/lib/mcp/server.ts`: MCP tools, OAuth middleware, Supabase user validation and RLS-bound operations.
- `supabase/migrations`: player data schema, row-level security, child-parent ownership policies and OAuth access-token hook.
- `supabase/functions/delete-account`: server-side account deletion.
- `packages/domain`: reusable domain invariants.

## Development

Requires Node.js 22.13+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The required runtime configuration is listed in [the OAuth operations runbook](docs/operations/OAUTH_SETUP.md). The Supabase project is dedicated to VI Companion. Do not substitute another product's database or credentials.

## MCP endpoint

The canonical MCP resource is `https://vi-companion.vercel.app/mcp`. Its protected-resource metadata is published at `/.well-known/oauth-protected-resource`. User-data tools require OAuth-issued access tokens; the capability-status tool is intentionally public. Account identity comes from the verified token and Supabase Auth, never from a model-supplied user ID.

OAuth Server, DCR, asymmetric JWT signing and the custom access-token hook require the dashboard configuration described in the runbook. Do not call the integration production-ready until an end-to-end PKCE authorization and token-validation test succeeds.

## Public release gates

The website's privacy policy and terms are still clearly marked as drafts. Before public launch, complete legal review, name the service operator and support contact, confirm retention/deletion/transfer details, enable and validate Supabase OAuth, test account isolation and deletion, record an authentic product walkthrough, and complete OpenAI's app review process.

## Security

Report vulnerabilities through [GitHub Security Advisories](https://github.com/LaRoyBot/vi-companion/security/advisories/new). Do not put access tokens, passwords or personal player records in public issues.

## License and trademarks

Source licensing and the terms for use of third-party trademarks/content must be resolved before public distribution. “GTA VI” is used only to describe compatibility intent; it does not imply endorsement or affiliation.
