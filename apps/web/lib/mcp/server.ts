import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { McpServer } from "@modelcontextprotocol/server";
import type { AuthInfo } from "@modelcontextprotocol/server";
import * as z from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type ExtraAuth = AuthInfo & { extra: { userId: string; mcpScopes: string[] } };
type Ctx = { http?: { authInfo?: AuthInfo } };
type DBContext = { user: User; db: SupabaseClient<any, "public">; auth: ExtraAuth };
type Result = { content: Array<{type:"text";text:string}>; structuredContent?:Record<string,unknown>; isError?:boolean; _meta?:Record<string,unknown> };
const resource = () => {
  const value=process.env.MCP_RESOURCE_URL;
  if(!value)throw new Error("Missing MCP_RESOURCE_URL");
  const u=new URL(value);
  if(u.protocol!=="https:"||u.pathname!=="/mcp"||u.search||u.hash)throw new Error("Invalid MCP resource URI");
  return u.toString().replace(/\/$/,"");
};
const issuer = () => {
  const value=process.env.MCP_AUTH_ISSUER;
  if(!value)throw new Error("Missing MCP_AUTH_ISSUER");
  const u=new URL(value);
  if(u.protocol!=="https:"||!u.pathname.endsWith("/auth/v1"))throw new Error("Invalid Supabase auth issuer");
  return value.replace(/\/$/,"");
};
const metadata = () => new URL("/.well-known/oauth-protected-resource",resource()).toString();
let jwks:ReturnType<typeof createRemoteJWKSet>|undefined;
async function verifyToken(_req:Request,token?:string):Promise<ExtraAuth|undefined>{
  if(!token)return undefined;
  const authIssuer=issuer(),resourceUri=resource();
  jwks??=createRemoteJWKSet(new URL(`${authIssuer}/.well-known/jwks.json`));
  const {payload}=await jwtVerify(token,jwks,{issuer:authIssuer,audience:resourceUri,algorithms:["ES256","RS256"],clockTolerance:5});
  const audiences=Array.isArray(payload.aud)?payload.aud:typeof payload.aud==="string"?[payload.aud]:[];
  const scopes=Array.isArray(payload.mcp_scopes)?payload.mcp_scopes.filter((v):v is string=>typeof v==="string"):[];
  if(typeof payload.client_id!=="string"||typeof payload.sub!=="string"||payload.role!=="authenticated"||
    !audiences.includes("authenticated")||!audiences.includes(resourceUri)||!scopes.includes("player:read")||typeof payload.exp!=="number")
    throw new Error("Invalid VI Companion token");
  return {token,clientId:payload.client_id,scopes:["profile"],expiresAt:payload.exp,extra:{userId:payload.sub,mcpScopes:scopes}};
}
const challenge=(error:"invalid_token"|"insufficient_scope"="invalid_token")=>
  `Bearer resource_metadata="${metadata()}", scope="profile", error="${error}", error_description="${error==="invalid_token"?"Connect or reconnect your VI Companion account.":"Reconnect and approve the required VI Companion permissions."}"`;
const ok=(data:Record<string,unknown>):Result=>({content:[{type:"text",text:JSON.stringify(data)}],structuredContent:data,isError:false});
const fail=(message:string):Result=>({content:[{type:"text",text:message}],isError:true});
const authFail=(kind:"invalid_token"|"insufficient_scope"="invalid_token"):Result=>({content:[{type:"text",text:"Connect VI Companion to your account, then try again."}],_meta:{"mcp/www_authenticate":[challenge(kind)]},isError:true});
async function withUser(ctx:Ctx,scope:"player:read"|"player:write",fn:(x:DBContext)=>Promise<Result>):Promise<Result>{
  const auth=ctx.http?.authInfo as ExtraAuth|undefined;
  if(!auth?.token||!auth.extra?.userId)return authFail();
  if(!auth.extra.mcpScopes.includes(scope))return authFail("insufficient_scope");
  const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return fail("VI Companion's player data service is not configured.");
  const db=createClient<any>(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${auth.token}`}}});
  const {data,error}=await db.auth.getUser(auth.token);
  if(error||!data.user||data.user.id!==auth.extra.userId)return authFail();
  return fn({user:data.user,db,auth});
}
const oauth={securitySchemes:[{type:"oauth2",scopes:["profile"]}]};
const read=<S extends z.ZodType,>(title:string,description:string,inputSchema:S)=>({title,description,inputSchema,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:oauth});
const write=<S extends z.ZodType,>(title:string,description:string,inputSchema:S)=>({title,description,inputSchema,annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},_meta:oauth});
const remove=<S extends z.ZodType,>(title:string,description:string,inputSchema:S)=>({title,description,inputSchema,annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:false},_meta:oauth});
function registerTools(server:McpServer){
  server.registerTool("get_connection_status",{title:"Get connection status",description:"Describe VI Companion capabilities. This does not connect to or inspect a console or game.",inputSchema:z.object({}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},_meta:{securitySchemes:[{type:"noauth"}]}},
    async()=>ok({platform_access:"manual_only",supported_platforms:["ps5","xbox"],game_state_access:false,console_credentials_collected:false,knowledge_retrieval:"disabled_pending_rights_review"}));
  server.registerTool("get_profile",{...read("Get connected profile","Return the stable identity for the authenticated account. No user ID is accepted from the model.",z.object({})),outputSchema:z.object({id:z.string(),name:z.string().optional(),nickname:z.string().optional(),email:z.string().email().optional()}),_meta:{...oauth,"openai/profile":true}},
    async(_a,c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data}=await db.from("player_profiles").select("display_name").eq("user_id",user.id).maybeSingle();const p:Record<string,unknown>={id:user.id};if(typeof data?.display_name==="string"&&data.display_name.trim()){p.name=data.display_name.trim();p.nickname=data.display_name.trim();}if(user.email)p.email=user.email;return ok(p);}));
  server.registerTool("get_player_profile",read("Get player profile","Read your preferences and preferred platform.",z.object({})),
    async(_a,c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data,error}=await db.from("player_profiles").select("display_name,preferred_platform,spoiler_preference,created_at,updated_at").eq("user_id",user.id).maybeSingle();if(error)return fail("Could not load your profile.");return ok(data??{display_name:null,preferred_platform:null,spoiler_preference:"avoid"});}));
  server.registerTool("update_player_preferences",write("Update player preferences","Save your display name, preferred platform and spoiler preference.",z.object({display_name:z.string().trim().min(1).max(60).optional(),preferred_platform:z.enum(["ps5","xbox"]).optional(),spoiler_preference:z.enum(["avoid","ask_first","all_ok"]).optional()}).refine(v=>Object.keys(v).length>0)),
    async(a,c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("player_profiles").upsert({user_id:user.id,...a},{onConflict:"user_id"}).select("display_name,preferred_platform,spoiler_preference,updated_at").single();if(error)return fail("Could not save preferences.");return ok(data);}));
  server.registerTool("list_platform_profiles",read("List platform profiles","List manually entered PS5 and Xbox profile labels, not connected console accounts.",z.object({})),
    async(_a,c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data,error}=await db.from("platform_profiles").select("id,platform,label,connection_mode,connection_status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);if(error)return fail("Could not list platform profiles.");return ok({items:data??[]});}));
  server.registerTool("set_preferred_platform",write("Set preferred platform","Set your preferred console.",z.object({platform:z.enum(["ps5","xbox"])})),
    async({platform},c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("player_profiles").upsert({user_id:user.id,preferred_platform:platform},{onConflict:"user_id"}).select("preferred_platform,updated_at").single();if(error)return fail("Could not set preferred platform.");return ok(data);}));
  server.registerTool("start_session",write("Start a play session","Create a manual session record. VI Companion does not detect when gameplay starts.",z.object({platform:z.enum(["ps5","xbox"]),label:z.string().trim().min(1).max(100).default("Play session"),focus:z.string().trim().max(300).optional(),private_note:z.string().trim().max(2000).optional()})),
    async(a,c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("play_sessions").insert({...a,user_id:user.id}).select("id,platform,label,focus,private_note,status,started_at").single();if(error?.code==="23505")return fail("An active session already exists on that platform.");if(error)return fail("Could not start the session.");return ok(data);}));
  server.registerTool("end_session",write("End a play session","Mark one active manual play session complete.",z.object({session_id:z.string().uuid()})),
    async({session_id},c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("play_sessions").update({status:"completed",ended_at:new Date().toISOString()}).eq("id",session_id).eq("user_id",user.id).eq("status","active").select("id,platform,label,status,started_at,ended_at").maybeSingle();if(error)return fail("Could not end the session.");return data?ok(data):fail("Active session not found in your account.");}));
  server.registerTool("list_sessions",read("List play sessions","List your manually recorded play sessions.",z.object({limit:z.number().int().min(1).max(50).default(20),status:z.enum(["active","completed","cancelled"]).optional()})),
    async({limit,status},c)=>withUser(c as Ctx,"player:read",async({user,db})=>{let q=db.from("play_sessions").select("id,platform,label,focus,status,started_at,ended_at").eq("user_id",user.id).order("started_at",{ascending:false}).limit(limit);if(status)q=q.eq("status",status);const {data,error}=await q;if(error)return fail("Could not list sessions.");return ok({items:data??[]});}));
  server.registerTool("get_session_details",read("Get session details","Read one of your play-session records.",z.object({session_id:z.string().uuid()})),
    async({session_id},c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data,error}=await db.from("play_sessions").select("id,platform,label,focus,private_note,status,started_at,ended_at,created_at,updated_at").eq("id",session_id).eq("user_id",user.id).maybeSingle();if(error)return fail("Could not load the session.");return data?ok(data):fail("Session not found in your account.");}));
  server.registerTool("create_objective",write("Create objective","Add a personal objective to your goals.",z.object({title:z.string().trim().min(2).max(120),description:z.string().trim().max(1000).optional(),category:z.string().trim().min(1).max(50).default("personal"),priority:z.enum(["low","normal","high"]).default("normal"),due_at:z.string().datetime({offset:true}).optional()})),
    async(a,c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("objectives").insert({...a,user_id:user.id}).select("id,title,description,category,priority,status,progress,due_at,created_at").single();if(error)return fail("Could not create objective.");return ok(data);}));
  server.registerTool("list_objectives",read("List objectives","List your objectives, optionally filtered by status.",z.object({status:z.enum(["active","paused","completed","archived"]).optional(),limit:z.number().int().min(1).max(100).default(50)})),
    async({status,limit},c)=>withUser(c as Ctx,"player:read",async({user,db})=>{let q=db.from("objectives").select("id,title,description,category,status,priority,progress,due_at,completed_at,created_at,updated_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(limit);if(status)q=q.eq("status",status);const {data,error}=await q;if(error)return fail("Could not list objectives.");return ok({items:data??[]});}));
  server.registerTool("update_objective",write("Update objective","Update a personal objective's title, description, priority, due date, progress or status.",z.object({objective_id:z.string().uuid(),title:z.string().trim().min(2).max(120).optional(),description:z.string().trim().max(1000).optional(),priority:z.enum(["low","normal","high"]).optional(),progress:z.number().int().min(0).max(100).optional(),status:z.enum(["active","paused","completed","archived"]).optional(),due_at:z.string().datetime({offset:true}).nullable().optional()}).refine(v=>Object.keys(v).length>1)),
    async({objective_id,...patch},c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const update:Record<string,unknown>={...patch};if(patch.status==="completed"||patch.progress===100){update.status="completed";update.progress=100;update.completed_at=new Date().toISOString();}else if(patch.status||typeof patch.progress==="number")update.completed_at=null;const {data,error}=await db.from("objectives").update(update).eq("id",objective_id).eq("user_id",user.id).select("id,title,description,status,priority,progress,due_at,completed_at,updated_at").maybeSingle();if(error)return fail("Could not update objective.");return data?ok(data):fail("Objective not found in your account.");}));
  server.registerTool("complete_objective",write("Complete objective","Mark one of your objectives complete.",z.object({objective_id:z.string().uuid()})),
    async({objective_id},c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("objectives").update({status:"completed",progress:100,completed_at:new Date().toISOString()}).eq("id",objective_id).eq("user_id",user.id).select("id,title,status,progress,completed_at").maybeSingle();if(error)return fail("Could not complete objective.");return data?ok(data):fail("Objective not found.");}));
  server.registerTool("get_next_objectives",read("Get next objectives","Suggest active objectives using saved priority and due dates, not live game state.",z.object({limit:z.number().int().min(1).max(20).default(5)})),
    async({limit},c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data,error}=await db.from("objectives").select("id,title,description,priority,progress,due_at").eq("user_id",user.id).eq("status","active").order("priority",{ascending:false}).order("due_at",{ascending:true,nullsFirst:false}).limit(limit);if(error)return fail("Could not load objectives.");return ok({items:data??[]});}));
  server.registerTool("create_collection",write("Create collection","Create a personal checklist or collection.",z.object({title:z.string().trim().min(2).max(100),description:z.string().trim().max(500).optional(),category:z.string().trim().min(1).max(50).default("personal")})),
    async(a,c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("collections").insert({...a,user_id:user.id}).select("id,title,description,category,created_at").single();if(error)return fail("Could not create collection.");return ok(data);}));
  server.registerTool("list_collections",read("List collections","List your collections and their checklist items.",z.object({})),
    async(_a,c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data,error}=await db.from("collections").select("id,title,description,category,created_at,updated_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);if(error)return fail("Could not list collections.");const ids=(data??[]).map(x=>x.id);const {data:children,error:ce}=ids.length?await db.from("collection_items").select("id,collection_id,label,personal_note,status,sort_order,updated_at").eq("user_id",user.id).in("collection_id",ids).order("sort_order",{ascending:true}):{data:[],error:null};if(ce)return fail("Could not load collection items.");return ok({items:(data??[]).map(c=>({...c,items:(children??[]).filter(i=>i.collection_id===c.id)}))});}));
  server.registerTool("add_collection_item",write("Add collection item","Add an item to one of your collections.",z.object({collection_id:z.string().uuid(),label:z.string().trim().min(1).max(160),personal_note:z.string().trim().max(500).optional(),sort_order:z.number().int().min(0).max(10000).default(0)})),
    async(a,c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("collection_items").insert({...a,user_id:user.id}).select("id,collection_id,label,personal_note,status,sort_order").single();if(error)return fail("Could not add item; confirm the collection belongs to you.");return ok(data);}));
  server.registerTool("update_collection_item",write("Update collection item","Update a checklist item's label, note, completion status or order.",z.object({item_id:z.string().uuid(),label:z.string().trim().min(1).max(160).optional(),personal_note:z.string().trim().max(500).nullable().optional(),status:z.enum(["not_started","in_progress","completed","skipped"]).optional(),sort_order:z.number().int().min(0).max(10000).optional()}).refine(v=>Object.keys(v).length>1)),
    async({item_id,...patch},c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("collection_items").update(patch).eq("id",item_id).eq("user_id",user.id).select("id,collection_id,label,personal_note,status,sort_order,updated_at").maybeSingle();if(error)return fail("Could not update item.");return data?ok(data):fail("Collection item not found.");}));
  server.registerTool("get_collection_progress",read("Get collection progress","Calculate completion for one of your collections.",z.object({collection_id:z.string().uuid()})),
    async({collection_id},c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const {data:collection,error:ce}=await db.from("collections").select("id,title").eq("id",collection_id).eq("user_id",user.id).maybeSingle();if(ce)return fail("Could not load collection.");if(!collection)return fail("Collection not found.");const {data,error}=await db.from("collection_items").select("status").eq("collection_id",collection_id).eq("user_id",user.id);if(error)return fail("Could not load items.");const total=data?.length??0,completed=(data??[]).filter(x=>x.status==="completed").length;return ok({collection_id,title:collection.title,total_items:total,completed_items:completed,remaining_items:total-completed,progress_percent:total?Math.round(completed/total*100):0});}));
  server.registerTool("create_personal_note",write("Create personal note","Save a private note to your VI Companion account.",z.object({title:z.string().trim().min(1).max(120),body:z.string().trim().min(1).max(4000),tags:z.array(z.string().trim().min(1).max(30)).max(10).default([])})),
    async(a,c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("personal_notes").insert({...a,user_id:user.id}).select("id,title,body,tags,created_at").single();if(error)return fail("Could not save note.");return ok(data);}));
  server.registerTool("list_personal_notes",read("List personal notes","List private notes. Include note body only when explicitly requested.",z.object({include_body:z.boolean().default(false),limit:z.number().int().min(1).max(50).default(20)})),
    async({include_body,limit},c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const cols=include_body?"id,title,body,tags,created_at,updated_at":"id,title,tags,created_at,updated_at";const {data,error}=await db.from("personal_notes").select(cols).eq("user_id",user.id).order("created_at",{ascending:false}).limit(limit);if(error)return fail("Could not load notes.");return ok({items:data??[]});}));
  server.registerTool("delete_personal_note",remove("Delete personal note","Permanently delete a specific note only when the user explicitly requests it.",z.object({note_id:z.string().uuid()})),
    async({note_id},c)=>withUser(c as Ctx,"player:write",async({user,db})=>{const {data,error}=await db.from("personal_notes").delete().eq("id",note_id).eq("user_id",user.id).select("id").maybeSingle();if(error)return fail("Could not delete note.");return data?ok({deleted:true,note_id}):fail("Note not found.");}));
  server.registerTool("export_player_data",read("Export player data","Export personal records in your account.",z.object({})),
    async(_a,c)=>withUser(c as Ctx,"player:read",async({user,db})=>{const tables=["player_profiles","platform_profiles","play_sessions","objectives","objective_updates","collections","collection_items","personal_notes","user_consents"] as const;const rows=await Promise.all(tables.map(async table=>{const {data,error}=await db.from(table).select("*").eq("user_id",user.id).limit(1000);return {table,data:error?null:data,failed:Boolean(error)};}));if(rows.some(x=>x.failed))return fail("Could not complete export.");return ok({exported_at:new Date().toISOString(),account_id:user.id,records:Object.fromEntries(rows.map(x=>[x.table,x.data]))});}));
  server.registerTool("delete_account",remove("Delete VI Companion account","Permanently delete the account and associated data. Requires exact confirmation phrase DELETE.",z.object({confirmation:z.literal("DELETE")})),
    async({confirmation},c)=>withUser(c as Ctx,"player:write",async({auth})=>{const endpoint=process.env.SUPABASE_FUNCTIONS_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!endpoint||!key||confirmation!=="DELETE")return fail("Account deletion is not configured or was not confirmed.");const r=await fetch(`${endpoint.replace(/\/$/,"")}/delete-account`,{method:"POST",headers:{Authorization:`Bearer ${auth.token}`,apikey:key,"Content-Type":"application/json"},body:JSON.stringify({confirmation:"DELETE"}),cache:"no-store"});if(!r.ok)return fail("Deletion failed; the account has not been confirmed as deleted.");return ok({deleted:true});}));
}
const base=createMcpHandler(registerTools,{serverInfo:{name:"vi-companion",version:"1.0.0"}});
export const mcpHandler=withMcpAuth(base,verifyToken,{required:false,requiredScopes:["profile"],resourceMetadataPath:"/.well-known/oauth-protected-resource"});
