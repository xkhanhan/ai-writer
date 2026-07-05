import { NextResponse } from "next/server";
import { getBookById, updateBook, deleteBook } from "@/server/storage/book-store";

interface BookRouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: BookRouteParams) {
  try {
    const { id } = await params;
    const book = await getBookById(id);

    if (!book) {
      return NextResponse.json(
        { error: "书籍不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error("获取书籍失败:", error);
    return NextResponse.json(
      { error: "获取书籍失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: BookRouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const success = await updateBook(id, body);

    if (!success) {
      return NextResponse.json(
        { error: "书籍不存在或未修改" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新书籍失败:", error);
    return NextResponse.json(
      { error: "更新书籍失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: BookRouteParams) {
  try {
    const { id } = await params;
    const success = await deleteBook(id);

    if (!success) {
      return NextResponse.json(
        { error: "书籍不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除书籍失败:", error);
    return NextResponse.json(
      { error: "删除书籍失败" },
      { status: 500 }
    );
  }
}
