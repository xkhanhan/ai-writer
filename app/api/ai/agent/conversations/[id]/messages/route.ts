/**
 * Agent Conversation Messages API — returns messages for a conversation.
 */

import { NextResponse } from "next/server";
import { getMessages } from "@/server/storage/conversation-store";

// GET /api/ai/agent/conversations/:id/messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const messages = await getMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}
