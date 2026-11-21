import { mcpHandler } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedOrigins = new Set([
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://vi-companion.vercel.app",
]);

function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return process.env.NODE_ENV !== "production" &&
    (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000");
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": [
      "Authorization",
      "Content-Type",
      "Accept",
      "MCP-Protocol-Version",
      "Mcp-Session-Id",
      "Last-Event-Id",
    ].join(", "),
    "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

async function handle(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!originAllowed(origin)) {
    return new Response("Origin not allowed.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Vary": "Origin" },
    });
  }

  const response = await mcpHandler(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of corsHeaders(origin)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!originAllowed(origin)) {
    return new Response("Origin not allowed.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Vary": "Origin" },
    });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
