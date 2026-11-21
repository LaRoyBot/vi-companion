import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.MCP_RESOURCE_URL &&
    process.env.MCP_AUTH_ISSUER,
  );
  const challengeConfigured = Boolean(process.env.OPENAI_APPS_CHALLENGE_TOKEN);
  return NextResponse.json({
    service: "vi-companion-web",
    status: configured ? "healthy" : "configuration_required",
    version: "1.0.0",
    integrations: {
      mcp_resource: configured ? "configured" : "configuration_required",
      supabase_oauth_server: "pending_dashboard_activation",
      openai_domain_verification: challengeConfigured ? "token_configured" : "pending_portal_token",
    },
    game_state_access: false,
    knowledge_retrieval: "disabled_pending_rights_review",
  }, { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
