import { NextResponse } from "next/server";
import { getVolumesByBookId, createVolume } from "@/server/storage/outline-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId") ?? "";
    const volumes = await getVolumesByBookId(bookId);
    return NextResponse.json({ volumes });
  } catch (error) {
    console.error("获取卷纲列表失败:", error);
    return NextResponse.json({ error: "获取卷纲列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, title, coreConflict, stages, developmentArc, keyPoints, highlights } = body;
    if (!bookId) {
      return NextResponse.json({ error: "bookId是必填参数" }, { status: 400 });
    }
    const volume = await createVolume(bookId, {
      title: title ?? "",
      coreConflict,
      stages,
      developmentArc,
      keyPoints,
      highlights
    });
    return NextResponse.json({ volume }, { status: 201 });
  } catch (error) {
    console.error("创建卷纲失败:", error);
    return NextResponse.json({ error: "创建卷纲失败" }, { status: 500 });
  }
}
