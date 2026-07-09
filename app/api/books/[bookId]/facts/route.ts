import { NextResponse } from "next/server";
import {
  getStoryFactsByBookId,
  createStoryFact,
} from "@/server/storage/fact-store";

interface FactsRouteParams {
  params: Promise<{ bookId: string }>;
}

export async function GET(request: Request, { params }: FactsRouteParams) {
  try {
    const { bookId } = await params;
    const facts = await getStoryFactsByBookId(bookId);
    return NextResponse.json({ facts });
  } catch (error) {
    console.error("获取事实列表失败:", error);
    return NextResponse.json({ error: "获取事实列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: FactsRouteParams) {
  try {
    const { bookId } = await params;
    const body = await request.json();
    const { content, chapterNumber, chapterId, relatedCharacterIds } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "事实内容不能为空" }, { status: 400 });
    }

    const fact = await createStoryFact(bookId, {
      content,
      chapterNumber,
      chapterId,
      relatedCharacterIds,
    });
    return NextResponse.json({ fact }, { status: 201 });
  } catch (error) {
    console.error("创建事实失败:", error);
    return NextResponse.json({ error: "创建事实失败" }, { status: 500 });
  }
}
