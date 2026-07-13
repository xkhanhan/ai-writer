/**
 * Agent Chat API — handles agent conversations with tool calling.
 *
 * Uses Vercel AI SDK for streaming and tool execution.
 */

import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadInternalConfig } from "@/server/ai/ai-config-store";
import { buildContext, type AiFunctionKey } from "@/server/ai/context-builder";
import { getScene } from "@/server/ai/agent/scene-registry";
import { getToolsForScene } from "@/server/ai/agent/tools";
import {
  createConversation,
  getRecentMessages,
  saveMessage,
  updateConversation,
  type ConversationMessage,
} from "@/server/storage/conversation-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  sceneId: string;
  bookId: string;
  conversationId?: string;
  chapterId?: string;
  selectedText?: string;
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, sceneId, bookId, conversationId, chapterId, selectedText } = body;

    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!sceneId) {
      return new Response(JSON.stringify({ error: "sceneId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Get scene config
    const scene = getScene(sceneId);

    // 2. Load AI config
    const aiConfig = await loadInternalConfig();

    if (!aiConfig.apiKey) {
      return new Response(
        JSON.stringify({ error: "请先在设置中配置 AI API Key" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Create or get conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const conv = await createConversation({
        bookId,
        sceneId,
        title: messages[messages.length - 1]?.content?.slice(0, 50) ?? "新对话",
      });
      currentConversationId = conv.id;
    }

    // 4. Save user message
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      await saveMessage({
        conversationId: currentConversationId,
        role: "user",
        content: lastUserMessage.content,
      });
    }

    // 5. Build context
    const context = await buildContext({
      bookId,
      chapterId,
      functionKey: scene.functionKey as AiFunctionKey,
      selectedText,
    });

    // 6. Load conversation history
    const historyMessages = await getRecentMessages(currentConversationId, 50);

    // 7. Format messages for AI
    const formattedMessages = formatMessages(historyMessages, messages);

    // 8. Get tools for this scene
    const tools = getToolsForScene(scene.availableTools) as any;

    // 9. Create OpenAI client
    const openai = createOpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseUrl,
    });

    // 10. Stream response
    const result = streamText({
      model: openai(aiConfig.model),
      system: `${scene.systemPrompt}

## 当前上下文
${context.userPrompt}`,
      messages: formattedMessages,
      tools,
      onFinish: async ({ text }) => {
        // Save assistant message (text only)
        if (text) {
          await saveMessage({
            conversationId: currentConversationId!,
            role: "assistant",
            content: text,
          });
        }

        // Update conversation title if it's a new conversation
        if (!conversationId && text) {
          const title = text.slice(0, 50) + (text.length > 50 ? "..." : "");
          await updateConversation(currentConversationId!, { title });
        }
      },
    });

    // 11. Return streaming response with conversation ID in header
    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": currentConversationId,
      },
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    const message =
      error instanceof Error ? error.message : "Agent 调用失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessages(
  history: ConversationMessage[],
  currentMessages: Array<{ role: string; content: string }>
) {
  // If we have history from DB, use it; otherwise use the messages from request
  if (history.length > 0) {
    return history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.content) // Skip empty messages (tool calls)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }

  return currentMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}
