import { NextResponse } from "next/server";
import OpenAI from "openai";
import { trimHistory } from "@/lib/history";
import type { ApiConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { messages, config } = (await req.json()) as {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    config: ApiConfig;
  };

  console.log("[chat] 收到请求", {
    messagesCount: messages?.length,
    model: config?.model,
    baseUrl: config?.baseUrl,
    apiKey: config?.apiKey ? `${config.apiKey.slice(0, 6)}...` : "(空)",
  });

  if (!messages?.length) {
    console.log("[chat] 缺少 messages，返回 400");
    return NextResponse.json({ error: "缺少消息" }, { status: 400 });
  }
  if (!config?.apiKey) {
    console.log("[chat] 缺少 API Key，返回 400");
    return NextResponse.json({ error: "未配置 API Key" }, { status: 400 });
  }

  // 统一使用 OpenAI SDK 兼容模式，通过 baseURL 指向不同服务商
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || "https://api.deepseek.com/v1",
  });

  // 历史过长时只保留最近 3 轮 + 最新代码
  const trimmed = trimHistory(messages);
  console.log("[chat] trimHistory 后消息条数", trimmed.length);

  const abortController = new AbortController();
  let stream: AsyncIterable<unknown>;
  try {
    console.log("[chat] 调用模型 create，stream=true, model=", config.model);
    stream = (await client.chat.completions.create(
      {
        model: config.model || "deepseek-chat",
        messages: trimmed as never,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 8192,
        stream: true,
      },
      { signal: abortController.signal }
    )) as unknown as AsyncIterable<unknown>;
    console.log("[chat] create 成功，开始读取流");
  } catch (err) {
    console.error("[chat] create 失败（返回 500）", err);
    return NextResponse.json(
      { error: `调用模型失败：${(err as Error).message}` },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  let deltaCount = 0;
  let totalChars = 0;
  let reasoningChars = 0;

  const readable = new ReadableStream({
    async start(controller) {
      let firstChunkLogged = false;
      try {
        for await (const chunk of stream) {
          if (!firstChunkLogged) {
            console.log(
              "[chat] 首个 chunk 完整内容:",
              JSON.stringify(chunk).slice(0, 500)
            );
            firstChunkLogged = true;
          }

          const delta = (
            chunk as {
              choices?: Array<{
                delta?: {
                  content?: string | null;
                  reasoning_content?: string | null;
                };
              }>;
            }
          ).choices?.[0]?.delta;

          const content = delta?.content ?? "";
          const reasoning = delta?.reasoning_content ?? "";

          if (reasoning) reasoningChars += reasoning.length;

          if (content) {
            deltaCount++;
            totalChars += content.length;
            if (deltaCount <= 3) {
              console.log(
                "[chat] 收到 delta #" + deltaCount,
                JSON.stringify(content.slice(0, 80))
              );
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: content })}\n\n`)
            );
          }
        }

        console.log(
          "[chat] 流结束，delta 数量=" +
            deltaCount +
            "，正文总字符=" +
            totalChars +
            "，推理字符=" +
            reasoningChars
        );

        if (totalChars === 0) {
          const hint =
            reasoningChars > 0
              ? `模型未返回正文（仅输出了 ${reasoningChars} 字符的推理过程，token 预算被推理耗尽）。请将模型改为 deepseek-chat 后重试。`
              : "模型未返回任何内容，请检查模型名称或 Base URL 是否正确。";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: hint })}\n\n`)
          );
        } else {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      } catch (err) {
        console.error("[chat] 读取流时出错", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: (err as Error).message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      console.log("[chat] 客户端取消连接");
      abortController.abort();
    },
  });

  console.log("[chat] 返回 SSE 响应");
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
