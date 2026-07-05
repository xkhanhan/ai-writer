import { NextResponse } from "next/server";
import { getVolumeById, updateVolume, deleteVolume } from "@/server/storage/outline-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const volume = await getVolumeById(id);

    if (!volume) {
      return NextResponse.json(
        { error: "卷纲不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ volume });
  } catch (error) {
    console.error("获取卷纲失败:", error);
    return NextResponse.json(
      { error: "获取卷纲失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const volume = await updateVolume(id, body);

    if (!volume) {
      return NextResponse.json(
        { error: "卷纲不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ volume });
  } catch (error) {
    console.error("更新卷纲失败:", error);
    return NextResponse.json(
      { error: "更新卷纲失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteVolume(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除卷纲失败:", error);
    return NextResponse.json(
      { error: "删除卷纲失败" },
      { status: 500 }
    );
  }
}
