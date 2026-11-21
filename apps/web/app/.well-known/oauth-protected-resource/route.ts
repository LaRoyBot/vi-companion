import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const value=process.env.MCP_RESOURCE_URL,issuer=process.env.MCP_AUTH_ISSUER;
  if(!value||!issuer)throw new Error("OAuth resource is not configured");
  const resource=new URL(value),auth=new URL(issuer);
  if(resource.protocol!=="https:"||resource.pathname!=="/mcp"||auth.protocol!=="https:")throw new Error("Invalid resource configuration");
  const origin=resource.origin;
  return NextResponse.json({resource:resource.toString().replace(/\/$/,""),authorization_servers:[auth.toString().replace(/\/$/,"")],scopes_supported:["profile"],resource_documentation:`${origin}/support`,resource_policy_uri:`${origin}/privacy`,resource_tos_uri:`${origin}/terms`},{headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=600","Access-Control-Allow-Origin":"*"}});
 }catch{return NextResponse.json({error:"OAuth resource metadata is not configured."},{status:503});}
}
