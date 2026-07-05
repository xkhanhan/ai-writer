import { NextResponse } from "next/server";
import { getBookOptions } from "@/server/storage/book-options-store";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET() {
  try {
    const options = await getBookOptions();
    return NextResponse.json({ success: true, options });
  } catch {
    return jsonError("书籍选项读取失败。", 500);
  }
}
