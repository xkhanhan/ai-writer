/**
 * Agent Conversations API — manages conversations.
 */

import { NextResponse } from "next/server";
import {
  getConversations,
  deleteConversation,
} from "@/server/storage/conversation-store";

// GET /api/ai/agent/conversations?bookId=xxx&sceneId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const sceneId = searchParams.get("sceneId");

    if (!bookId) {
      return NextResponse.json(
        { error: "bookId is required" },
        { status: 400 }
      );
    }

    const conversations = await getConversations(bookId, sceneId ?? undefined);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/agent/conversations?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
