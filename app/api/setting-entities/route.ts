import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getSettingEntitiesByBookId,
  createSettingEntity,
} from "@/server/storage/setting-entity-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const category = searchParams.get("category");

    if (!bookId) {
      return jsonError("缺少 bookId");
    }

    const entities = await getSettingEntitiesByBookId(
      bookId,
      (category as Parameters<typeof getSettingEntitiesByBookId>[1]) ||
        undefined
    );
    return jsonSuccess({ entities });
  } catch (error) {
    console.error("获取设定实体失败:", error);
    return jsonError("获取设定实体失败", 500);
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
      return jsonError("实体名称不能为空");
    }
    if (!data.category) {
      return jsonError("缺少分类");
    }

    const entity = await createSettingEntity(bookId, data);
    return jsonSuccess({ entity }, 201);
  } catch (error) {
    console.error("创建设定实体失败:", error);
    return jsonError("创建设定实体失败", 500);
  }
}
