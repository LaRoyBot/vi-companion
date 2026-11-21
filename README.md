# VI Companion

VI Companion is an independent, cross-platform personal player workspace for PS5 and Xbox Series X|S.

## Current scope
- Next.js player workspace
- Local preview mode with sessions, objectives, platform labels, collections and private notes
- Dedicated Supabase schema with authenticated RLS
- Authenticated remote MCP endpoint for player-scoped tools
- Account deletion function
- Security/legal boundaries that keep console inspection, gameplay capture and game-derived AI retrieval disabled

## Architecture
- `apps/web`: standalone companion UI
- `supabase/functions/mcp`: remote MCP service
- `supabase/migrations`: player-scoped PostgreSQL schema and RLS
- `packages/domain`: shared objective invariants

## Local development
1. Install Node 22.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the Next.js URL.

Without Supabase environment variables the UI deliberately stays in local preview mode.

## Supabase setup
Create a dedicated Supabase project for VI Companion. Do not reuse another application's production database. Apply the checked-in migration, configure Auth, then provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Safety / legal boundary
The service does not claim access to a running console or game. It does not inspect memory, network traffic, screenshots, video, audio or automate gameplay. Game-derived knowledge retrieval remains disabled until a rights-approved source scope exists.

VI Companion is not affiliated with Rockstar Games, Take-Two Interactive, Sony, Microsoft or OpenAI.

## Status
Preview foundation. Production public launch still requires legal review, production privacy/terms, OAuth validation, rights-cleared knowledge sources, security testing and ChatGPT app review.
