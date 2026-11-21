import { protectedResourceMetadataOptions, protectedResourceMetadataResponse } from "@/lib/mcp/metadata";
export const dynamic = "force-dynamic";
export function GET() { return protectedResourceMetadataResponse(); }
export function OPTIONS() { return protectedResourceMetadataOptions(); }
