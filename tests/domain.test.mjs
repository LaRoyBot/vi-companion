import test from "node:test";import assert from "node:assert/strict";
import {normalizeObjectiveInput,buildObjectiveUpdate} from "../packages/domain/src/objective.mjs";
test("objective input normalizes",()=>assert.deepEqual(normalizeObjectiveInput({title:"  Explore  ",progress:25}),{title:"Explore",progress:25,status:"active",priority:"normal"}));
test("invalid progress rejected",()=>assert.throws(()=>normalizeObjectiveInput({title:"Explore",progress:101}),/progress/));
test("completion sets invariant",()=>assert.deepEqual(buildObjectiveUpdate({progress:100},{status:"active",progress:20},"2026-11-20T00:00:00.000Z"),{progress:100,status:"completed",completed_at:"2026-11-20T00:00:00.000Z"}));
test("completed objective can reopen",()=>assert.deepEqual(buildObjectiveUpdate({progress:75},{status:"completed",progress:100}),{progress:75,status:"active",completed_at:null}));
test("migration exists",async()=>{const fs=await import("node:fs/promises");const sql=await fs.readFile("supabase/migrations/202611200001_create_companion_core.sql","utf8");assert.match(sql,/row level security/i);assert.match(sql,/auth\.uid\(\)/i)});
test("MCP never accepts arbitrary user id",async()=>{const fs=await import("node:fs/promises");const s=await fs.readFile("supabase/functions/mcp/index.ts","utf8");assert.match(s,/auth\.getUser\(\)/);assert.doesNotMatch(s,/user_id\s*:/)});
test("platform connection is manual only",async()=>{const fs=await import("node:fs/promises");const s=await fs.readFile("supabase/migrations/202611200001_create_companion_core.sql","utf8");assert.match(s,/connection_mode text not null default 'manual'/i);assert.match(s,/connection_status text not null default 'manual_profile'/i)});
