import { createClient } from "npm:@supabase/supabase-js@2.119.1";

const headers = {"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type,mcp-session-id","access-control-allow-methods":"GET,POST,OPTIONS"};
const tools=[
 {name:"get_connection_status",description:"Return the authenticated player's connection and capability status.",inputSchema:{type:"object",properties:{},additionalProperties:false}},
 {name:"get_player_profile",description:"Get the authenticated player's profile.",inputSchema:{type:"object",properties:{},additionalProperties:false}},
 {name:"list_sessions",description:"List the authenticated player's sessions.",inputSchema:{type:"object",properties:{limit:{type:"number",maximum:100}},additionalProperties:false}},
 {name:"create_objective",description:"Create a personal objective.",inputSchema:{type:"object",required:["title"],properties:{title:{type:"string",maxLength:120},description:{type:"string",maxLength:1000}},additionalProperties:false}},
 {name:"list_objectives",description:"List the authenticated player's objectives.",inputSchema:{type:"object",properties:{},additionalProperties:false}},
 {name:"update_objective_progress",description:"Advance a personal objective by setting progress 0-100.",inputSchema:{type:"object",required:["objective_id","progress"],properties:{objective_id:{type:"string"},progress:{type:"number",minimum:0,maximum:100}},additionalProperties:false}},
 {name:"list_collections",description:"List the authenticated player's personal collections.",inputSchema:{type:"object",properties:{},additionalProperties:false}},
 {name:"create_collection",description:"Create a personal collection.",inputSchema:{type:"object",required:["title"],properties:{title:{type:"string",maxLength:100}},additionalProperties:false}},
 {name:"list_personal_notes",description:"List the authenticated player's private notes.",inputSchema:{type:"object",properties:{},additionalProperties:false}}
];

function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers});}
function result(id:any,text:string){return json({jsonrpc:"2.0",id,result:{content:[{type:"text",text}]}});}
function error(id:any,code:number,message:string){return json({jsonrpc:"2.0",id,error:{code,message}});}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("",{status:204,headers});
 if(req.method==="GET")return json({name:"VI Companion MCP",version:"0.1.0",protocol:"authenticated"});
 if(req.method!=="POST")return json({error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY"),auth=req.headers.get("authorization");
 if(!url||!key||!auth)return json({error:"Authentication required"},401);
 const supabase=createClient(url,key,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return json({error:"Invalid authentication"},401);
 let body:any;try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const id=body.id,method=body.method,params=body.params||{};
 if(method==="initialize")return json({jsonrpc:"2.0",id,result:{protocolVersion:"2025-06-18",capabilities:{tools:{}},serverInfo:{name:"vi-companion",version:"0.1.0"}}});
 if(method==="notifications/initialized")return new Response(null,{status:204,headers});
 if(method==="tools/list")return json({jsonrpc:"2.0",id,result:{tools}});
 if(method!=="tools/call")return error(id,-32601,"Method not found");
 const name=params.name,args=params.arguments||{};
 try{
  if(name==="get_connection_status")return result(id,JSON.stringify({authenticated:true,user_id:user.id,platform_access:"manual_only",game_state_access:false,knowledge_retrieval:"disabled_pending_rights_review"}));
  if(name==="get_player_profile"){const {data,error:e}=await supabase.from("player_profiles").select("*").eq("user_id",user.id).maybeSingle();if(e)throw e;return result(id,JSON.stringify(data||{user_id:user.id,preferred_platform:null,spoiler_preference:"avoid"}))}
  if(name==="list_sessions"){const limit=Math.min(Number(args.limit||20),100);const {data,error:e}=await supabase.from("play_sessions").select("id,platform,label,focus,status,started_at,ended_at").order("started_at",{ascending:false}).limit(limit);if(e)throw e;return result(id,JSON.stringify(data||[]))}
  if(name==="create_objective"){const {data,error:e}=await supabase.from("objectives").insert({user_id:user.id,title:String(args.title),description:args.description?String(args.description):null}).select("*").single();if(e)throw e;return result(id,JSON.stringify(data))}
  if(name==="list_objectives"){const {data,error:e}=await supabase.from("objectives").select("*").order("created_at",{ascending:false});if(e)throw e;return result(id,JSON.stringify(data||[]))}
  if(name==="update_objective_progress"){const p=Math.max(0,Math.min(100,Number(args.progress)));const status=p===100?"completed":"active";const {data,error:e}=await supabase.from("objectives").update({progress:p,status,completed_at:p===100?new Date().toISOString():null}).eq("id",String(args.objective_id)).select("*").single();if(e)throw e;return result(id,JSON.stringify(data))}
  if(name==="list_collections"){const {data,error:e}=await supabase.from("collections").select("*,collection_items(*)").order("created_at",{ascending:false});if(e)throw e;return result(id,JSON.stringify(data||[]))}
  if(name==="create_collection"){const {data,error:e}=await supabase.from("collections").insert({user_id:user.id,title:String(args.title)}).select("*").single();if(e)throw e;return result(id,JSON.stringify(data))}
  if(name==="list_personal_notes"){const {data,error:e}=await supabase.from("personal_notes").select("id,title,body,tags,created_at,updated_at").order("created_at",{ascending:false}).limit(50);if(e)throw e;return result(id,JSON.stringify(data||[]))}
  return error(id,-32601,"Unknown tool");
 }catch(e){return error(id,-32000,e instanceof Error?e.message:"Request failed")}
});