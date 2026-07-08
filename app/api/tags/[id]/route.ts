import { NextResponse } from "next/server";
import {
  getTagCategoryById,
  updateTagCategory,
  deleteTagCategory,
} from "@/server/storage/tag-store";

interface TagRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    const tag = await getTagCategoryById(id);

    if (!tag) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("获取标签失败:", error);
    return NextResponse.json({ error: "获取标签失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tag = await updateTagCategory(id, body);

    if (!tag) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("更新标签失败:", error);
    return NextResponse.json({ error: "更新标签失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: TagRouteParams) {
  try {
    const { id } = await params;
    const success = await deleteTagCategory(id);

    if (!success) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除标签失败:", error);
    return NextResponse.json({ error: "删除标签失败" }, { status: 500 });
  }
}
