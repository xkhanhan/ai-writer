import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getTagTreeByBookId,
  createTagCategory,
} from "@/server/storage/tag-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return jsonError("缺少 bookId");
    }

    const tags = await getTagTreeByBookId(bookId);
    return jsonSuccess({ tags });
  } catch (error) {
    console.error("获取标签树失败:", error);
    return jsonError("获取标签树失败", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, ...data } = body;

    if (!bookId) {
      return jsonError("缺少 bookId");
    }
    if (!data.name?.trim()) {
      return jsonError("标签名称不能为空");
    }

    const tag = await createTagCategory(bookId, data);
    return jsonSuccess({ tag }, 201);
  } catch (error) {
    console.error("创建标签失败:", error);
    return jsonError("创建标签失败", 500);
  }
}
