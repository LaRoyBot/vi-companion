# Architecture

VI Companion is a monorepo with a Next.js web client and Supabase-backed remote MCP service.

- Web UI: player-authored records and preferences.
- Supabase Postgres: authenticated player-scoped storage with RLS.
- MCP edge function: authenticates the caller and derives identity from the verified token.
- Knowledge layer: disabled until rights review approves sources.
- Platform layer: manual-only today.

Never trust a user ID supplied as a tool argument. Never use a service-role key for player-facing reads/writes. Never claim console connectivity without verified authorization.
