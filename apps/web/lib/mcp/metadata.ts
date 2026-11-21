import { NextResponse } from "next/server";

export function protectedResourceMetadataResponse() {
  try {
    const resourceValue = process.env.MCP_RESOURCE_URL;
    const issuerValue = process.env.MCP_AUTH_ISSUER;
    if (!resourceValue || !issuerValue) throw new Error("OAuth resource is not configured.");

    const resource = new URL(resourceValue);
    const issuer = new URL(issuerValue);
    if (resource.protocol !== "https:" || resource.pathname !== "/mcp" || resource.search || resource.hash) {
      throw new Error("MCP_RESOURCE_URL must be the canonical HTTPS /mcp URL.");
    }
    if (issuer.protocol !== "https:" || !issuer.pathname.endsWith("/auth/v1")) {
      throw new Error("MCP_AUTH_ISSUER must be the canonical Supabase Auth issuer.");
    }

    const canonicalResource = resource.toString().replace(/\/$/, "");
    const origin = resource.origin;
    return NextResponse.json({
      resource: canonicalResource,
      authorization_servers: [issuer.toString().replace(/\/$/, "")],
      scopes_supported: ["profile"],
      resource_documentation: `${origin}/support`,
      resource_policy_uri: `${origin}/privacy`,
      resource_tos_uri: `${origin}/terms`,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "OAuth resource metadata is not configured." }, { status: 503 });
  }
}
