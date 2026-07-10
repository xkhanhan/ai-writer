import { NextResponse } from "next/server";

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message, message }, { status });
}
