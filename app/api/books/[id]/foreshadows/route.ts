import { NextResponse } from "next/server";
import {
  getForeshadowsByBookId,
  createForeshadow,
} from "@/server/storage/foreshadow-store";

interface ForeshadowsRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: ForeshadowsRouteParams
) {
  try {
    const { id } = await params;
    const foreshadows = await getForeshadowsByBookId(id);
    return NextResponse.json({ foreshadows });
  } catch (error) {
    console.error("获取伏笔列表失败:", error);
    return NextResponse.json({ error: "获取伏笔列表失败" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: ForeshadowsRouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, chapterId, chapterNumber, volumeId } =
      body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "伏笔名称不能为空" }, { status: 400 });
    }

    const foreshadow = await createForeshadow(id, {
      name,
      description,
      status,
      chapterId,
      chapterNumber,
      volumeId,
    });
    return NextResponse.json({ foreshadow }, { status: 201 });
  } catch (error) {
    console.error("创建伏笔失败:", error);
    return NextResponse.json({ error: "创建伏笔失败" }, { status: 500 });
  }
}
