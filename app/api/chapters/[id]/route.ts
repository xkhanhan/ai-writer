import { NextResponse } from "next/server";
import { getChapterById, updateChapter, deleteChapter } from "@/server/storage/outline-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const chapter = await getChapterById(id);

    if (!chapter) {
      return NextResponse.json(
        { error: "章纲不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error("获取章纲失败:", error);
    return NextResponse.json(
      { error: "获取章纲失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const chapter = await updateChapter(id, body);

    if (!chapter) {
      return NextResponse.json(
        { error: "章纲不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error("更新章纲失败:", error);
    return NextResponse.json(
      { error: "更新章纲失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteChapter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除章纲失败:", error);
    return NextResponse.json(
      { error: "删除章纲失败" },
      { status: 500 }
    );
  }
}
