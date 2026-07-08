import { getChaptersByVolumeId, createChapter } from "@/server/storage/outline-store";
import { jsonSuccess, jsonError } from "@/app/api/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const volumeId = searchParams.get("volumeId") ?? "";
    const chapters = await getChaptersByVolumeId(volumeId);
    return jsonSuccess({ chapters });
  } catch (error) {
    console.error("获取章纲列表失败:", error);
    return jsonError("获取章纲列表失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      volumeId, title, summary, prevChapterLink, nextChapterSuspense,
      scenes, time, moodTone, characters, keyEvents,
      foreshadowings, highlights, expectedWords, note
    } = body;
    if (!volumeId || typeof volumeId !== "string") {
      return jsonError("volumeId是必填参数", 400);
    }
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
    return jsonSuccess({ chapter }, 201);
  } catch (error) {
    console.error("创建章纲失败:", error);
    return jsonError("创建章纲失败");
  }
}
