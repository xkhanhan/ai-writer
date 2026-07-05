import { NextResponse } from "next/server";
import { createBook, listBooks } from "@/server/storage/book-store";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET() {
  try {
    const books = await listBooks();
    return NextResponse.json({ success: true, books });
  } catch {
    return jsonError("书籍数据读取失败。", 500);
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const title = typeof payload.title === "string" ? payload.title : "";
  const description =
    typeof payload.description === "string" ? payload.description : "";
  const genre = typeof payload.genre === "string" ? payload.genre : "";
  const platform = typeof payload.platform === "string" ? payload.platform : "";

  try {
    const book = await createBook({ title, description, genre, platform });
    return NextResponse.json({ success: true, book }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message);
    }

    return jsonError("创建书籍失败。", 500);
  }
}
