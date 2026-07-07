import { NextResponse } from "next/server";
import {
  getWorldRulesByBookId,
  createWorldRule,
  ensureFixedGlobalRules,
} from "@/server/storage/world-rule-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const category = searchParams.get("category");

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId" }, { status: 400 });
    }

    // 确保固定全局规则存在
    await ensureFixedGlobalRules(bookId);

    const rules = await getWorldRulesByBookId(
      bookId,
      (category as "global" | "writing" | "setting") || undefined
    );
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("获取世界规则失败:", error);
    return NextResponse.json({ error: "获取世界规则失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, ...data } = body;

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId" }, { status: 400 });
    }
    if (!data.name?.trim()) {
      return NextResponse.json({ error: "规则名称不能为空" }, { status: 400 });
    }

    const rule = await createWorldRule(bookId, data);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("创建世界规则失败:", error);
    return NextResponse.json({ error: "创建世界规则失败" }, { status: 500 });
  }
}
