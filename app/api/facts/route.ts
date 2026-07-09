import { NextResponse } from "next/server";
import {
  getStoryFactsByBookId,
  createStoryFact,
} from "@/server/storage/fact-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId" }, { status: 400 });
    }

    const facts = await getStoryFactsByBookId(bookId);
    return NextResponse.json({ facts });
  } catch (error) {
    console.error("获取事实列表失败:", error);
    return NextResponse.json({ error: "获取事实列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, ...data } = body;

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId" }, { status: 400 });
    }
    if (!data.content?.trim()) {
      return NextResponse.json({ error: "事实内容不能为空" }, { status: 400 });
    }

    const fact = await createStoryFact(bookId, data);
    return NextResponse.json({ fact }, { status: 201 });
  } catch (error) {
    console.error("创建事实失败:", error);
    return NextResponse.json({ error: "创建事实失败" }, { status: 500 });
  }
}
