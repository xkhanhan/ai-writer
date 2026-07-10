import { jsonSuccess, jsonError } from "@/app/api/utils";
import {
  getStoryFactsByBookId,
  createStoryFact,
} from "@/server/storage/fact-store";

interface FactsRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: FactsRouteParams) {
  try {
    const { id } = await params;
    const facts = await getStoryFactsByBookId(id);
    return jsonSuccess({ facts });
  } catch (error) {
    console.error("获取事实列表失败:", error);
    return jsonError("获取事实列表失败", 500);
  }
}

export async function POST(request: Request, { params }: FactsRouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, chapterNumber, chapterId, relatedCharacterIds } = body;

    if (!content?.trim()) {
      return jsonError("事实内容不能为空");
    }

    const fact = await createStoryFact(id, {
      content,
      chapterNumber,
      chapterId,
      relatedCharacterIds,
    });
    return jsonSuccess({ fact }, 201);
  } catch (error) {
    console.error("创建事实失败:", error);
    return jsonError("创建事实失败", 500);
  }
}
