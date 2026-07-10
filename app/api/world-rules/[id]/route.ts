import { jsonError, jsonSuccess } from "@/app/api/utils";
import {
  getWorldRuleById,
  updateWorldRule,
  deleteWorldRule,
} from "@/server/storage/world-rule-store";

interface WorldRuleRouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_PATCH_FIELDS = [
  "name",
  "content",
  "isFixed",
  "settingType",
  "selectOptions",
  "numberMin",
  "numberMax",
  "numberUnit",
  "sortOrder",
] as const;

export async function GET(_request: Request, { params }: WorldRuleRouteParams) {
  try {
    const { id } = await params;
    const rule = await getWorldRuleById(id);

    if (!rule) {
      return jsonError("规则不存在", 404);
    }

    return jsonSuccess({ success: true, rule });
  } catch (error) {
    console.error("获取世界规则失败:", error);
    return jsonError("获取世界规则失败", 500);
  }
}

export async function PATCH(request: Request, { params }: WorldRuleRouteParams) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("请求体必须是 JSON。");
    }

    const payload =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const updateData: Record<string, unknown> = {};
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in payload) {
        updateData[key] = payload[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return jsonError("至少需要一个更新字段。");
    }

    const rule = await updateWorldRule(id, updateData);

    if (!rule) {
      return jsonError("规则不存在", 404);
    }

    return jsonSuccess({ success: true, rule });
  } catch (error) {
    console.error("更新世界规则失败:", error);
    return jsonError("更新世界规则失败", 500);
  }
}

export async function DELETE(_request: Request, { params }: WorldRuleRouteParams) {
  try {
    const { id } = await params;
    const rule = await getWorldRuleById(id);

    if (rule?.isFixed) {
      return jsonError("固定规则不可删除", 403);
    }

    const success = await deleteWorldRule(id);
    if (!success) {
      return jsonError("规则不存在", 404);
    }

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除世界规则失败:", error);
    return jsonError("删除世界规则失败", 500);
  }
}
