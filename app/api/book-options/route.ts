import { jsonError, jsonSuccess } from "@/app/api/utils";
import { getBookOptions, ensureBookOptions } from "@/server/storage/book-options-store";

export async function GET() {
  try {
    await ensureBookOptions();
    const options = await getBookOptions();
    return jsonSuccess({ success: true, options });
  } catch {
    return jsonError("书籍选项读取失败。", 500);
  }
}
