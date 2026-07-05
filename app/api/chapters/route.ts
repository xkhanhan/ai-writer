import { NextResponse } from "next/server";
import { getChaptersByVolumeId, createChapter } from "@/server/storage/outline-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const volumeId = searchParams.get("volumeId") ?? "";
    const chapters = await getChaptersByVolumeId(volumeId);
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("获取章纲列表失败:", error);
    return NextResponse.json({ error: "获取章纲列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      volumeId,
      title,
      summary,
      prevChapterLink,
      nextChapterSuspense,
      scenes,
      time,
      moodTone,
      characters,
      keyEvents,
      foreshadowings,
      highlights,
      expectedWords,
      note
    } = body;
    const chapter = await createChapter(volumeId, {
      title: title ?? "",
      summary,
      prevChapterLink,
      nextChapterSuspense,
      scenes,
      time,
      moodTone,
      characters,
      keyEvents,
      foreshadowings,
      highlights,
      expectedWords,
      note
    });
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    console.error("创建章纲失败:", error);
    return NextResponse.json({ error: "创建章纲失败" }, { status: 500 });
  }
}
