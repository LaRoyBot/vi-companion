# Deployment runbook

## Web
Deploy `apps/web` as a Next.js project on Vercel.

Public environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Supabase
1. Create a dedicated project.
2. Apply the checked-in migration.
3. Configure Auth redirect URLs for the web origin.
4. Deploy `mcp` and `delete-account`.
5. Set function secrets without committing them.
6. Test authenticated access and RLS with two separate users.

## Release gate
Do not publish the public ChatGPT listing while privacy/terms are drafts, rights review is incomplete, or the MCP endpoint can access another player's records.
