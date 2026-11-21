import test from "node:test";
import assert from "node:assert/strict";
import { normalizeObjectiveInput, buildObjectiveUpdate } from "../packages/domain/src/objective.mjs";
import { readFile } from "node:fs/promises";

test("objective input normalizes", () => assert.deepEqual(
  normalizeObjectiveInput({ title: "  Explore  ", progress: 25 }),
  { title: "Explore", progress: 25, status: "active", priority: "normal" },
));
test("invalid progress rejected", () => assert.throws(
  () => normalizeObjectiveInput({ title: "Explore", progress: 101 }), /progress/,
));
test("completion sets invariant", () => assert.deepEqual(
  buildObjectiveUpdate({ progress: 100 }, { status: "active", progress: 20 }, "2026-11-20T00:00:00.000Z"),
  { progress: 100, status: "completed", completed_at: "2026-11-20T00:00:00.000Z" },
));
test("completed objective can reopen", () => assert.deepEqual(
  buildObjectiveUpdate({ progress: 75 }, { status: "completed", progress: 100 }),
  { progress: 75, status: "active", completed_at: null },
));
test("core schema enables row-level security and auth ownership", async () => {
  const sql = await readFile("supabase/migrations/202611200001_create_companion_core.sql", "utf8");
  assert.match(sql, /row level security/i);
  assert.match(sql, /auth\.uid\(\)/i);
});
test("production MCP binds account identity to verified OAuth subject, not caller input", async () => {
  const source = await readFile("apps/web/lib/mcp/server.ts", "utf8");
  assert.match(source, /jwtVerify\(token,jwks/);
  assert.match(source, /db\.auth\.getUser\(auth\.token\)/);
  assert.match(source, /data\.user\.id!==auth\.extra\.userId/);
  assert.doesNotMatch(source, /args\.user_id/);
  assert.doesNotMatch(source, /params\.user_id/);
});
test("manual console adapter does not imply live console or game access", async () => {
  const source = await readFile("apps/web/lib/mcp/server.ts", "utf8");
  assert.match(source, /platform_access:"manual_only"/);
  assert.match(source, /game_state_access:false/);
  assert.match(source, /knowledge_retrieval:"disabled_pending_rights_review"/);
});
