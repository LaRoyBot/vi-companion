import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.MCP_RESOURCE_URL&&process.env.MCP_AUTH_ISSUER);return NextResponse.json({service:"vi-companion-web",status:configured?"healthy":"configuration_required",version:"1.0.0",game_state_access:false,knowledge_retrieval:"disabled_pending_rights_review"},{status:configured?200:503,headers:{"Cache-Control":"no-store"}});}
