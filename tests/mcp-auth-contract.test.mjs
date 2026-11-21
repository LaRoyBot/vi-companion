import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const auth = await readFile(new URL("../apps/web/lib/mcp/server.ts", import.meta.url), "utf8");
const route = await readFile(new URL("../apps/web/app/mcp/route.ts", import.meta.url), "utf8");
const metadata = await readFile(new URL("../apps/web/app/.well-known/oauth-protected-resource/route.ts", import.meta.url), "utf8");
const pathMetadata = await readFile(new URL("../apps/web/app/.well-known/oauth-protected-resource/mcp/route.ts", import.meta.url), "utf8");
const challenge = await readFile(new URL("../apps/web/app/.well-known/openai-apps-challenge/route.ts", import.meta.url), "utf8");
const hookMigration = await readFile(new URL("../supabase/migrations/20261121115000_fix_oauth_hook_client_id_variable.sql", import.meta.url), "utf8");
const rlsMigration = await readFile(new URL("../supabase/migrations/20261121114000_fix_oauth_resource_claim_and_rls.sql", import.meta.url), "utf8");
const resourceRlsMigration = await readFile(new URL("../supabase/migrations/20261121114500_harden_oauth_client_resource_guard.sql", import.meta.url), "utf8");
const plugin = JSON.parse(await readFile(new URL("../plugin.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../mcp.json", import.meta.url), "utf8"));
const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
const performanceMigration = await readFile(new URL("../supabase/migrations/20261121120000_index_foreign_keys_and_optimize_owner_policies.sql", import.meta.url), "utf8");

test("resource uses asymmetric signature, Supabase issuer, MCP audience and expiration", () => {
  assert.match(auth, /algorithms:\["ES256","RS256"\]/);
  assert.match(auth, /issuer:authIssuer/);
  assert.match(auth, /audience:"authenticated"/);
  assert.match(auth, /payload\.exp/);
  assert.match(auth, /payload\.client_id/);
  assert.match(auth, /payload\.resource!==resourceUri/);
});
test("official stateless Streamable HTTP adapter and OAuth middleware are mounted", () => {
  assert.match(auth, /createMcpHandler/);
  assert.match(auth, /withMcpAuth/);
  assert.match(route, /mcpHandler/);
});
test("player data identity is tied to Supabase-verified subject", () => {
  assert.match(auth, /db\.auth\.getUser\(auth\.token\)/);
  assert.match(auth, /data\.user\.id!==auth\.extra\.userId/);
  assert.doesNotMatch(auth, /args\.user_id/);
});
test("MCP claims are granted only to explicitly allowlisted OAuth clients", () => {
  assert.match(hookMigration, /claims->>'client_id'/);
  assert.match(hookMigration, /values \(oauth_client_id\)/);
  assert.match(hookMigration, /private\.approved_mcp_oauth_clients/);
  assert.match(hookMigration, /mcp_scopes/);
  assert.match(rlsMigration, /private\.vi_companion_client_access_allowed/);
  assert.match(rlsMigration, /as restrictive/);
  assert.match(resourceRlsMigration, /auth\.jwt\(\)->>'resource'/);
  assert.match(resourceRlsMigration, /approved_mcp_oauth_clients/);
});
test("public directory short description meets the 30-character limit", () => {
  const value = plugin.extensions["com.openai"].interface.shortDescription;
  assert.ok(value.length <= 30, `shortDescription is ${value.length} characters`);
});
test("OIDC scopes needed for stable profile identity are explicitly requested", () => {
  const auth = manifest.mcpServers["vi-companion"].extensions["com.openai"].auth;
  assert.deepEqual(auth.baseScopes, ["openid", "email", "profile"]);
  assert.equal(auth.oidcEnabled, true);
  assert.deepEqual(auth.oidcScopesSupported, ["openid", "email", "profile"]);
  assert.match(auth.oidcConfigurationUrl, /openid-configuration/);
  assert.match(auth.oidcUserinfoEndpoint, /oauth\/userinfo/);
});
test("foreign-key lookups are indexed and ownership RLS policies use initplan-safe auth calls", () => {
  assert.match(performanceMigration, /objective_updates_objective_id_idx/);
  assert.match(performanceMigration, /play_sessions_platform_profile_id_idx/);
  assert.match(performanceMigration, /user_consents_user_id_idx/);
  assert.match(performanceMigration, /user_id = \(select auth\.uid\(\)\)/);
});
test("hosted Supabase config documents required OAuth server and access-token hook toggles", () => {
  assert.match(config, /\[auth\.oauth_server\]/);
  assert.match(config, /allow_dynamic_registration = true/);
  assert.match(config, /\[auth\.hook\.custom_access_token\]/);
});
test("console/game-state and rights-gated knowledge stay disabled", () => {
  assert.match(auth, /game_state_access:false/);
  assert.match(auth, /knowledge_retrieval:"disabled_pending_rights_review"/);
});
test("protected-resource metadata publishes the canonical resource and issuer", () => {
  assert.match(metadata, /protectedResourceMetadataResponse/);
  assert.match(pathMetadata, /protectedResourceMetadataResponse/);
  assert.match(auth, /oauth-protected-resource\/mcp/);
});
test("OpenAI domain challenge returns only the exact configured portal token", () => {
  assert.match(challenge, /OPENAI_APPS_CHALLENGE_TOKEN/);
  assert.match(challenge, /new Response\(token/);
});
