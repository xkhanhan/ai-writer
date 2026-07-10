import { jsonError, jsonSuccess } from "@/app/api/utils";
import {
  getSettingEntityById,
  updateSettingEntity,
  deleteSettingEntity,
} from "@/server/storage/setting-entity-store";

interface SettingEntityRouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_PATCH_FIELDS = [
  "name",
  "level",
  "description",
  "appearance",
  "traits",
  "background",
  "abilities",
  "weaknesses",
  "tagIds",
  "categoryFields",
  "statusFields",
  "deprecated",
] as const;

export async function GET(
  _request: Request,
  { params }: SettingEntityRouteParams
) {
  try {
    const { id } = await params;
    const entity = await getSettingEntityById(id);

    if (!entity) {
      return jsonError("设定实体不存在", 404);
    }

    return jsonSuccess({ success: true, entity });
  } catch (error) {
    console.error("获取设定实体失败:", error);
    return jsonError("获取设定实体失败", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: SettingEntityRouteParams
) {
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

    const entity = await updateSettingEntity(id, updateData);

    if (!entity) {
      return jsonError("设定实体不存在", 404);
    }

    return jsonSuccess({ success: true, entity });
  } catch (error) {
    console.error("更新设定实体失败:", error);
    return jsonError("更新设定实体失败", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: SettingEntityRouteParams
) {
  try {
    const { id } = await params;
    const success = await deleteSettingEntity(id);

    if (!success) {
      return jsonError("设定实体不存在", 404);
    }

    return jsonSuccess({ success: true });
  } catch (error) {
    console.error("删除设定实体失败:", error);
    return jsonError("删除设定实体失败", 500);
  }
}
