import { NextResponse } from "next/server";
import {
  getTagCategoryById,
  countTagRefs,
} from "@/server/storage/tag-store";

interface RefsRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RefsRouteParams) {
  try {
    const { id } = await params;
    const tag = await getTagCategoryById(id);

    if (!tag) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    const count = await countTagRefs(tag.bookId, id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("获取标签引用计数失败:", error);
    return NextResponse.json({ error: "获取引用计数失败" }, { status: 500 });
  }
}
