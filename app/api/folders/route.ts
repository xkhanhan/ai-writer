import { NextResponse } from "next/server";
import { createFolder, getFoldersByBookAndCategory } from "@/server/storage/folder-file-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const category = searchParams.get("category");

    if (!bookId || !category) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const folders = await getFoldersByBookAndCategory(bookId, category);
    return NextResponse.json(folders);
  } catch (error) {
    console.error("获取文件夹失败:", error);
    return NextResponse.json(
      { error: "获取文件夹失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, category, name } = body;

    if (!bookId || !category || !name) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const folder = await createFolder(bookId, category, name);
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("创建文件夹失败:", error);
    return NextResponse.json(
      { error: "创建文件夹失败" },
      { status: 500 }
    );
  }
}
