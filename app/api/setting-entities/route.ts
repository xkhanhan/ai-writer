import { NextResponse } from "next/server";
import {
  getSettingEntitiesByBookId,
  createSettingEntity,
} from "@/server/storage/setting-entity-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const category = searchParams.get("category");

    if (!bookId) {
      return NextResponse.json({ error: "缺少 bookId" }, { status: 400 });
    }

    const entities = await getSettingEntitiesByBookId(
      bookId,
      (category as Parameters<typeof getSettingEntitiesByBookId>[1]) ||
        undefined
    );
    return NextResponse.json({ entities });
  } catch (error) {
    console.error("获取设定实体失败:", error);
    return NextResponse.json({ error: "获取设定实体失败" }, { status: 500 });
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
      return NextResponse.json({ error: "实体名称不能为空" }, { status: 400 });
    }
    if (!data.category) {
      return NextResponse.json({ error: "缺少分类" }, { status: 400 });
    }

    const entity = await createSettingEntity(bookId, data);
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("创建设定实体失败:", error);
    return NextResponse.json({ error: "创建设定实体失败" }, { status: 500 });
  }
}
