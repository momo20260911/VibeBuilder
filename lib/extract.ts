/**
 * 从模型流式输出中提取 ```html ... ``` 代码块。
 * 若无标记，尝试匹配 <html>...</html>；再兜底返回原文本。
 */
export function extractHtml(text: string): string {
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim()) return fence[1].trim();

  const anyFence = text.match(/```\s*([\s\S]*?)```/);
  if (anyFence && anyFence[1].trim()) return anyFence[1].trim();

  const full = text.match(/<html[\s\S]*?<\/html>/i);
  if (full) return full[0].trim();

  return text.trim();
}
