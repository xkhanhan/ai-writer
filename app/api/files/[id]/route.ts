import { NextResponse } from "next/server";
import { getFileById, updateFileContent, deleteFile } from "@/server/storage/folder-file-store";

interface FileRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: FileRouteParams) {
  try {
    const { id } = await params;
    const file = await getFileById(id);

    if (!file) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error("获取文件失败:", error);
    return NextResponse.json(
      { error: "获取文件失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: FileRouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (content === undefined) {
      return NextResponse.json(
        { error: "缺少内容参数" },
        { status: 400 }
      );
    }

    const success = await updateFileContent(id, content);

    if (!success) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新文件失败:", error);
    return NextResponse.json(
      { error: "更新文件失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: FileRouteParams) {
  try {
    const { id } = await params;
    const success = await deleteFile(id);

    if (!success) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除文件失败:", error);
    return NextResponse.json(
      { error: "删除文件失败" },
      { status: 500 }
    );
  }
}
