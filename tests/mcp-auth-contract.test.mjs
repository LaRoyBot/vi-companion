import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const auth = await readFile(new URL("../apps/web/lib/mcp/server.ts", import.meta.url), "utf8");
const route = await readFile(new URL("../apps/web/app/mcp/route.ts", import.meta.url), "utf8");
const metadata = await readFile(new URL("../apps/web/app/.well-known/oauth-protected-resource/route.ts", import.meta.url), "utf8");

test("resource uses asymmetric JWT signature, issuer, audience and expiration", () => {
  assert.match(auth, /algorithms:\["ES256","RS256"\]/);
  assert.match(auth, /issuer:authIssuer/);
  assert.match(auth, /audience:resourceUri/);
  assert.match(auth, /payload\.exp/);
  assert.match(auth, /payload\.client_id/);
});
test("official Streamable HTTP adapter and OAuth middleware are mounted", () => {
  assert.match(auth, /createMcpHandler/);
  assert.match(auth, /withMcpAuth/);
  assert.match(route, /mcpHandler/);
});
test("profile identity comes from Supabase-verified bearer subject", () => {
  assert.match(auth, /db\.auth\.getUser\(auth\.token\)/);
  assert.match(auth, /"openai\/profile":true/);
  assert.match(auth, /data\.user\.id!==auth\.extra\.userId/);
  assert.doesNotMatch(auth, /args\.user_id/);
});
test("console/game-state and rights-gated knowledge stay disabled", () => {
  assert.match(auth, /game_state_access:false/);
  assert.match(auth, /knowledge_retrieval:"disabled_pending_rights_review"/);
});
test("protected-resource metadata publishes the canonical resource and issuer", () => {
  assert.match(metadata, /process\.env\.MCP_RESOURCE_URL/);
  assert.match(metadata, /process\.env\.MCP_AUTH_ISSUER/);
  assert.match(metadata, /authorization_servers/);
  assert.match(metadata, /scopes_supported/);
});
