export interface HistoryMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 历史 messages 过长时，只保留 system 提示词 + 最近 N 轮对话 + 最新代码，
 * 避免超出模型的上下文限制。
 * 每轮 = 一条 user + 一条 assistant。若窗口末尾是刚发出的 user 修改意见
 * （尚无对应 assistant），则额外补上最近一次 assistant 代码，确保“最新代码”在上下文中。
 */
export function trimHistory(
  messages: HistoryMessage[],
  maxRounds = 3
): HistoryMessage[] {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const recent = rest.slice(-(maxRounds * 2));

  if (recent.length && recent[recent.length - 1].role === "user") {
    const lastAssistant = [...rest]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistant && !recent.includes(lastAssistant)) {
      return [...system, lastAssistant, ...recent];
    }
  }

  return [...system, ...recent];
}
