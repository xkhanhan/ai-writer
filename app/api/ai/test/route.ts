import { NextResponse } from "next/server";

function parseErrorMessage(errorText: string, fallback: string): string {
  if (!errorText) return fallback;

  try {
    const errorJson = JSON.parse(errorText);
    // OpenAI 风格: { error: { message } }
    if (errorJson?.error?.message) return errorJson.error.message;
    // 智谱/部分国产: { error: { code, message } } 或 { msg }
    if (errorJson?.error?.msg) return errorJson.error.msg;
    if (errorJson?.msg) return errorJson.msg;
    if (errorJson?.message) return errorJson.message;
    if (errorJson?.detail) return typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail);
    return fallback;
  } catch {
    // 非 JSON，截取前 200 字符
    return errorText.slice(0, 200) || fallback;
  }
}

async function testOpenAIConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<{ success: boolean; message: string }> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${normalizedBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 16,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const errorMessage = parseErrorMessage(errorText, `HTTP ${response.status}`);

    if (response.status === 401) {
      return { success: false, message: `鉴权失败: ${errorMessage}` };
    }
    if (response.status === 404) {
      return { success: false, message: `模型不存在或接口地址错误: ${errorMessage}` };
    }
    if (response.status === 429) {
      return { success: false, message: `请求频率超限: ${errorMessage}` };
    }
    if (response.status === 400) {
      return { success: false, message: `请求参数被拒绝: ${errorMessage}` };
    }

    return { success: false, message: `连接失败: ${errorMessage}` };
  }

  return { success: true, message: "连接成功" };
}

async function testAnthropicConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<{ success: boolean; message: string }> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${normalizedBaseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 16,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const errorMessage = parseErrorMessage(errorText, `HTTP ${response.status}`);

    if (response.status === 401) {
      return { success: false, message: `鉴权失败: ${errorMessage}` };
    }
    if (response.status === 404) {
      return { success: false, message: `模型不存在或接口地址错误: ${errorMessage}` };
    }
    if (response.status === 429) {
      return { success: false, message: `请求频率超限: ${errorMessage}` };
    }
    if (response.status === 400) {
      return { success: false, message: `请求参数被拒绝: ${errorMessage}` };
    }

    return { success: false, message: `连接失败: ${errorMessage}` };
  }

  return { success: true, message: "连接成功" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, model, apiFormat } = body;

    if (!baseUrl || typeof baseUrl !== "string" || !baseUrl.trim()) {
      return NextResponse.json(
        { success: false, message: "请填写 Base URL" },
        { status: 400 }
      );
    }
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, message: "请填写 API Key" },
        { status: 400 }
      );
    }
    if (!model || typeof model !== "string" || !model.trim()) {
      return NextResponse.json(
        { success: false, message: "请选择或输入模型名称" },
        { status: 400 }
      );
    }

    let result: { success: boolean; message: string };

    if (apiFormat === "anthropic") {
      result = await testAnthropicConnection(baseUrl.trim(), apiKey.trim(), model.trim());
    } else {
      result = await testOpenAIConnection(baseUrl.trim(), apiKey.trim(), model.trim());
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to test connection:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json({
        success: false,
        message: "网络错误: 无法连接到服务器，请检查 Base URL 是否正确",
      });
    }

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "测试连接失败",
    });
  }
}
