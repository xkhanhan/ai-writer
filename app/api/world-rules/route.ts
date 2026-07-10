import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getWorldRulesByBookId,
  createWorldRule,
  ensureFixedGlobalRules,
} from "@/server/storage/world-rule-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const category = searchParams.get("category");

    if (!bookId) {
      return jsonError("缺少 bookId");
    }

    // 确保固定全局规则存在
    await ensureFixedGlobalRules(bookId);

    const rules = await getWorldRulesByBookId(
      bookId,
      (category as "global" | "writing" | "setting") || undefined
    );
    return jsonSuccess({ rules });
  } catch (error) {
    console.error("获取世界规则失败:", error);
    return jsonError("获取世界规则失败", 500);
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
      return jsonError("规则名称不能为空");
    }

    const rule = await createWorldRule(bookId, data);
    return jsonSuccess({ rule }, 201);
  } catch (error) {
    console.error("创建世界规则失败:", error);
    return jsonError("创建世界规则失败", 500);
  }
}
