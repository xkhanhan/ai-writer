import { NextResponse } from "next/server";
import { deleteFolder } from "@/server/storage/folder-file-store";

interface FolderRouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: FolderRouteParams) {
  try {
    const { id } = await params;
    const success = await deleteFolder(id);

    if (!success) {
      return NextResponse.json(
        { error: "文件夹不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除文件夹失败:", error);
    return NextResponse.json(
      { error: "删除文件夹失败" },
      { status: 500 }
    );
  }
}
