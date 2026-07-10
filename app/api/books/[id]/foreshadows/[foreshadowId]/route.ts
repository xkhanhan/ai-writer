import { NextResponse } from "next/server";
import {
  getForeshadowById,
  updateForeshadow,
  deleteForeshadow,
} from "@/server/storage/foreshadow-store";

interface ForeshadowRouteParams {
  params: Promise<{ id: string; foreshadowId: string }>;
}

export async function GET(
  _request: Request,
  { params }: ForeshadowRouteParams
) {
  try {
    const { foreshadowId } = await params;
    const foreshadow = await getForeshadowById(foreshadowId);
    if (!foreshadow) {
      return NextResponse.json({ error: "伏笔不存在" }, { status: 404 });
    }
    return NextResponse.json({ foreshadow });
  } catch (error) {
    console.error("获取伏笔详情失败:", error);
    return NextResponse.json({ error: "获取伏笔详情失败" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: ForeshadowRouteParams
) {
  try {
    const { foreshadowId } = await params;
    const body = await request.json();
    const foreshadow = await updateForeshadow(foreshadowId, body);
    if (!foreshadow) {
      return NextResponse.json({ error: "伏笔不存在" }, { status: 404 });
    }
    return NextResponse.json({ foreshadow });
  } catch (error) {
    console.error("更新伏笔失败:", error);
    return NextResponse.json({ error: "更新伏笔失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: ForeshadowRouteParams
) {
  try {
    const { foreshadowId } = await params;
    const deleted = await deleteForeshadow(foreshadowId);
    if (!deleted) {
      return NextResponse.json({ error: "伏笔不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除伏笔失败:", error);
    return NextResponse.json({ error: "删除伏笔失败" }, { status: 500 });
  }
}
