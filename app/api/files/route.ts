import { NextResponse } from "next/server";
import { createFile } from "@/server/storage/folder-file-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { folderId, name } = body;

    if (!folderId || !name) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const file = await createFile(folderId, name);

    if (!file) {
      return NextResponse.json(
        { error: "文件夹不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error("创建文件失败:", error);
    return NextResponse.json(
      { error: "创建文件失败" },
      { status: 500 }
    );
  }
}
