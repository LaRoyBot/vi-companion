import { NextResponse } from "next/server";
import { resourceUrl } from "@/lib/mcp/server-metadata";
export const dynamic="force-dynamic";
export async function GET(){
  try{const resource=resourceUrl(),origin=new URL(resource).origin;return NextResponse.json({resource,authorization_servers:["https://ixjbqsviiesrgpnjwvvy.supabase.co/auth/v1"],scopes_supported:["profile"],resource_documentation:`${origin}/support`,resource_policy_uri:`${origin}/privacy`,resource_tos_uri:`${origin}/terms`},{headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=600","Access-Control-Allow-Origin":"*"}});}
  catch{return NextResponse.json({error:"OAuth resource metadata is not configured."},{status:503});}
}
