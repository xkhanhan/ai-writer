import { NextResponse } from "next/server";
import { getProviderById } from "@/app/pages/settings-ai/config/providers";

async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.map((m: { id: string }) => m.id).sort() ?? [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { providerId, baseUrl, apiKey } = body;

    if (!providerId || !baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, error: "请填写厂商、Base URL 和 API Key" },
        { status: 400 }
      );
    }

    const provider = getProviderById(providerId);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: "未知的厂商" },
        { status: 400 }
      );
    }

    if ((!provider.isCustom && provider.apiFormat !== "openai") || !baseUrl || !apiKey) {
      return NextResponse.json({
        success: true,
        models: provider.models,
        message: provider.models.length > 0 ? "使用预设模型列表" : "自定义厂商，请手动输入模型名称",
      });
    }

    const models = await fetchOpenAIModels(baseUrl, apiKey);

    return NextResponse.json({ success: true, models });
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取模型列表失败",
      },
      { status: 500 }
    );
  }
}
