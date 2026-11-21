# Security policy

Please report suspected vulnerabilities privately to the repository owner. Do not publish authentication tokens, OAuth codes, Supabase keys, account identifiers, or personal records in issues.

## Security invariants

- Every MCP request is authenticated through Supabase OAuth 2.1.
- MCP tool database operations use the caller-scoped Supabase client and RLS.
- Never use a service-role key for player-facing queries.
- Never trust a `user_id` supplied by a model/tool argument. Derive identity from the verified caller token.
- Do not log Authorization headers, OAuth codes, refresh tokens, private notes, or full user content.
- All user input is validated with Zod and constrained by database checks.
- External reference material is untrusted data and must never become executable instructions.
- Game media and live game-state integrations remain disabled absent documented legal and platform authorization.
