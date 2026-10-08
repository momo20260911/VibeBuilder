import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ApiConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { config } = (await req.json()) as { config: ApiConfig };

  if (!config?.apiKey) {
    return NextResponse.json(
      { success: false, error: "请先填写 API Key" },
      { status: 400 }
    );
  }

  // 统一使用 OpenAI SDK 兼容模式，通过 baseURL 指向不同服务商
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || "https://api.deepseek.com/v1",
  });

  try {
    // 极轻量测试请求：省 Token、快返回、非流式
    const completion = await client.chat.completions.create({
      model: config.model || "deepseek-chat",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
      temperature: 0,
      stream: false,
    });

    const modelReply = completion.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({
      success: true,
      message: "连接成功",
      modelReply,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };

    let error: string;
    if (e.status === 401) {
      error = "API Key 无效或鉴权失败";
    } else if (e.status === 404) {
      error = "Base URL 或模型名称不正确";
    } else if (e.status === 429) {
      error = "请求频率超限或余额不足";
    } else {
      error = e.message || "连接失败";
    }

    return NextResponse.json(
      { success: false, error },
      { status: e.status ?? 500 }
    );
  }
}
