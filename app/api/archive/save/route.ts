import { NextResponse } from "next/server";
import { saveArchivedChapter } from "@/server/storage/outline-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, chapterId, sortOrder, title, content } = body;
    const archive = await saveArchivedChapter(bookId, {
      chapterId,
      sortOrder: sortOrder ?? 0,
      title: title ?? "",
      content: content ?? ""
    });
    return NextResponse.json({ archive }, { status: 201 });
  } catch (error) {
    console.error("保存存稿失败:", error);
    return NextResponse.json({ error: "保存存稿失败" }, { status: 500 });
  }
}
