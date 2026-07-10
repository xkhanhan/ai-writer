import { jsonSuccess, jsonError } from "@/app/api/utils";
import { getTemplateScope } from "@/server/storage/prompt-template-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const functionKey = searchParams.get("functionKey");

  if (!bookId) {
    return jsonError("bookId is required.");
  }
  if (!functionKey) {
    return jsonError("functionKey is required.");
  }

  const scope = await getTemplateScope(bookId, functionKey);
  return jsonSuccess({ scope });
}
