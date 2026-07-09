import { NextResponse } from "next/server";
import {
  getStoryFactById,
  updateStoryFact,
  deleteStoryFact,
} from "@/server/storage/fact-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fact = await getStoryFactById(id);
    if (!fact) {
      return NextResponse.json({ error: "事实不存在" }, { status: 404 });
    }
    return NextResponse.json({ fact });
  } catch (error) {
    console.error("获取事实详情失败:", error);
    return NextResponse.json({ error: "获取事实详情失败" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fact = await updateStoryFact(id, body);
    if (!fact) {
      return NextResponse.json({ error: "事实不存在" }, { status: 404 });
    }
    return NextResponse.json({ fact });
  } catch (error) {
    console.error("更新事实失败:", error);
    return NextResponse.json({ error: "更新事实失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteStoryFact(id);
    if (!deleted) {
      return NextResponse.json({ error: "事实不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除事实失败:", error);
    return NextResponse.json({ error: "删除事实失败" }, { status: 500 });
  }
}
