"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useAppStore, type ChatMessage } from "@/store/use-store";
import { CodeEditor } from "./code-editor";
import { Preview } from "./preview";
import { ConversationPanel } from "./conversation-panel";
import { Button } from "./ui/button";
import { extractHtml } from "@/lib/extract";
import { streamChat } from "@/lib/stream";

export function Workbench() {
  const generatedCode = useAppStore((s) => s.generatedCode);
  const previewCode = useAppStore((s) => s.previewCode);
  const setGeneratedCode = useAppStore((s) => s.setGeneratedCode);
  const setPreviewCode = useAppStore((s) => s.setPreviewCode);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const startModify = useAppStore((s) => s.startModify);
  const finishModify = useAppStore((s) => s.finishModify);
  const failModify = useAppStore((s) => s.failModify);
  const apiConfig = useAppStore((s) => s.apiConfig);
  const fullscreenPreview = useAppStore((s) => s.fullscreenPreview);
  const messages = useAppStore((s) => s.messages);

  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");

  // 编辑代码后 500ms 防抖刷新预览
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(() => setPreviewCode(generatedCode), 500);
    return () => clearTimeout(timerRef.current);
  }, [generatedCode, setPreviewCode]);

  async function handleModify() {
    if (!instruction.trim() || isGenerating) return;
    setError("");

    const baseMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: instruction },
    ];

    startModify();
    const id = useAppStore.getState().generationId;

    let fullText = "";
    try {
      await streamChat(
        "/api/chat",
        { messages: baseMessages, config: apiConfig },
        { onDelta: (t) => (fullText += t) }
      );
      const html = extractHtml(fullText);
      if (!html) throw new Error("未能从响应中提取到 HTML 代码");
      // 若期间用户点击了“返回首页”，则放弃本次结果
      if (useAppStore.getState().generationId !== id) return;
      finishModify(html, baseMessages);
      setInstruction("");
    } catch (e) {
      if (useAppStore.getState().generationId === id) {
        setError((e as Error).message);
        failModify();
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div
        className={`grid min-h-0 flex-1 ${
          fullscreenPreview ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
        }`}
      >
        {!fullscreenPreview && (
          <div className="min-h-0 border-r border-white/10">
            <CodeEditor value={generatedCode} onChange={setGeneratedCode} />
          </div>
        )}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <Preview code={previewCode} />
          </div>
          {!fullscreenPreview && <ConversationPanel />}
        </div>
      </div>

      {/* 底部修改栏 */}
      <div className="border-t border-white/10 bg-[#0a0a0a]/80 p-3">
        <div className="mx-auto flex max-w-[1400px] gap-3">
          <input
            className="h-10 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all duration-200 focus:border-indigo-500"
            placeholder="输入修改意见，例如：把按钮改成圆角、增加深色模式…"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleModify();
            }}
            disabled={isGenerating}
          />
          <Button
            onClick={handleModify}
            disabled={isGenerating || !instruction.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 修改中…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> 发送
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="mx-auto mt-2 max-w-[1400px] text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
