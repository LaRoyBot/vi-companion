export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.OPENAI_APPS_CHALLENGE_TOKEN;
  if (!token) {
    return new Response("Domain verification token is not configured.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new Response(token, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
