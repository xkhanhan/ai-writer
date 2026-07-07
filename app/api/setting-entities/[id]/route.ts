import { NextResponse } from "next/server";
import {
  getSettingEntityById,
  updateSettingEntity,
  deleteSettingEntity,
} from "@/server/storage/setting-entity-store";

interface SettingEntityRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: SettingEntityRouteParams
) {
  try {
    const { id } = await params;
    const entity = await getSettingEntityById(id);

    if (!entity) {
      return NextResponse.json({ error: "设定实体不存在" }, { status: 404 });
    }

    return NextResponse.json({ entity });
  } catch (error) {
    console.error("获取设定实体失败:", error);
    return NextResponse.json({ error: "获取设定实体失败" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: SettingEntityRouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const entity = await updateSettingEntity(id, body);

    if (!entity) {
      return NextResponse.json({ error: "设定实体不存在" }, { status: 404 });
    }

    return NextResponse.json({ entity });
  } catch (error) {
    console.error("更新设定实体失败:", error);
    return NextResponse.json({ error: "更新设定实体失败" }, { status: 500 });
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
      return NextResponse.json({ error: "设定实体不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除设定实体失败:", error);
    return NextResponse.json({ error: "删除设定实体失败" }, { status: 500 });
  }
}
