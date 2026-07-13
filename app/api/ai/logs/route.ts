import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/utils";
import { getGenerationSessionsPaginated } from "@/server/storage/ai-generation-store";

/**
 * GET /api/ai/logs?bookId=xxx&limit=20&offset=0&functionKey=xxx
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const bookId = url.searchParams.get("bookId");
    if (!bookId) return jsonError("bookId is required", 400);

    const limit = Number(url.searchParams.get("limit")) || 20;
    const offset = Number(url.searchParams.get("offset")) || 0;
    const functionKey = url.searchParams.get("functionKey") || undefined;

    const result = await getGenerationSessionsPaginated(bookId, {
      limit: Math.min(limit, 100),
      offset,
      functionKey,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Logs]", err);
    return jsonError("Internal Server Error", 500);
  }
}
