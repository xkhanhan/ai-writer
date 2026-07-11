import { jsonSuccess, jsonError } from "@/app/api/utils";
import { getVariablesForFunction } from "@/server/ai/variable-registry";

/**
 * GET /api/ai/variables?functionKey=xxx
 *
 * Returns the variable definitions for a given functionKey.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const functionKey = searchParams.get("functionKey") ?? "";

  if (!functionKey) {
    return jsonError("functionKey is required.");
  }

  const variables = getVariablesForFunction(functionKey);
  return jsonSuccess({ variables });
}
