interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

/**
 * 通过 SSE 读取流式响应。
 * 服务端约定每条事件格式：data: {"delta":"..."} 或 data: [DONE] 或 data: {"error":"..."}
 */
export async function streamChat(
  url: string,
  body: unknown,
  handlers: StreamHandlers
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("[stream] fetch 响应", {
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get("content-type"),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    console.error("[stream] 非 2xx 响应:", res.status, text.slice(0, 300));
    let message = text.slice(0, 200);
    try {
      const j = JSON.parse(text);
      if (j.error) message = j.error;
    } catch {
      /* 非 JSON 时保留原文 */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventCount = 0;
  let deltaChars = 0;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    eventCount++;
    if (eventCount <= 3) {
      console.log(
        "[stream] 收到事件 #" + eventCount + ":",
        JSON.stringify(data.slice(0, 150))
      );
    }

    if (data === "[DONE]") {
      console.log("[stream] 收到 [DONE] 哨兵");
      handlers.onDone?.();
      return;
    }

    try {
      const obj = JSON.parse(data);
      if (obj.error) {
        const err = new Error(obj.error);
        console.error("[stream] 服务端返回错误事件:", obj.error);
        handlers.onError?.(err);
        throw err;
      }
      if (obj.delta) {
        deltaChars += obj.delta.length;
        handlers.onDelta(obj.delta);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.warn(
          "[stream] JSON 解析失败，忽略该行:",
          JSON.stringify(data.slice(0, 80))
        );
        return;
      }
      throw e;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) processLine(part);
  }
  buffer += decoder.decode(); // 冲刷 decoder 中残留的多字节字符
  if (buffer.trim()) processLine(buffer);

  console.log(
    "[stream] 流读取结束，事件数=" + eventCount + "，delta 总字符=" + deltaChars
  );
  handlers.onDone?.();
}
