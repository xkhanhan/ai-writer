import { NextResponse } from "next/server";
import { getArchivedChaptersByBookId } from "@/server/storage/outline-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId") ?? "";
    const archives = await getArchivedChaptersByBookId(bookId);
    return NextResponse.json({ archives });
  } catch (error) {
    console.error("获取正文库存稿失败:", error);
    return NextResponse.json({ error: "获取正文库存稿失败" }, { status: 500 });
  }
}
