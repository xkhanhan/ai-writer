import { NextResponse } from "next/server";
import { getArchivedChapterById, deleteArchivedChapter } from "@/server/storage/outline-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const archive = await getArchivedChapterById(id);

    if (!archive) {
      return NextResponse.json(
        { error: "存稿不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ archive });
  } catch (error) {
    console.error("获取存稿失败:", error);
    return NextResponse.json(
      { error: "获取存稿失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteArchivedChapter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除存稿失败:", error);
    return NextResponse.json(
      { error: "删除存稿失败" },
      { status: 500 }
    );
  }
}
