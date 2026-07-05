import { NextResponse } from "next/server";
import { getBookOutline, upsertBookOutline } from "@/server/storage/outline-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId") ?? "";
    const outline = await getBookOutline(bookId);
    return NextResponse.json({ outline });
  } catch (error) {
    console.error("获取总纲失败:", error);
    return NextResponse.json({ error: "获取总纲失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { bookId, direction, stages, sellingPoints } = body;
    const outline = await upsertBookOutline(bookId, {
      direction: direction ?? "",
      stages: stages ?? "",
      sellingPoints: sellingPoints ?? ""
    });
    return NextResponse.json({ outline });
  } catch (error) {
    console.error("保存总纲失败:", error);
    return NextResponse.json({ error: "保存总纲失败" }, { status: 500 });
  }
}
