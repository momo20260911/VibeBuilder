"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useAppStore, type ChatMessage } from "@/store/use-store";
import {
  EXAMPLE_PROMPTS,
  PROJECT_TYPES,
  STYLES,
  SYSTEM_PROMPT,
} from "@/lib/config";
import { extractHtml } from "@/lib/extract";
import { streamChat } from "@/lib/stream";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

export function PromptScreen() {
  const [prompt, setPrompt] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [style, setStyle] = useState(STYLES[1]);
  const [error, setError] = useState("");

  const apiConfig = useAppStore((s) => s.apiConfig);
  const startGenerate = useAppStore((s) => s.startGenerate);
  const finishGenerate = useAppStore((s) => s.finishGenerate);
  const failGenerate = useAppStore((s) => s.failGenerate);
  const appendStreamText = useAppStore((s) => s.appendStreamText);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!apiConfig.apiKey) {
      setError("请先在右上角设置中配置 API Key");
      setSettingsOpen(true);
      return;
    }

    setError("");

    const fullPrompt = `项目类型：${projectType}\n视觉风格：${style}\n需求：${prompt}`;
    const baseMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: fullPrompt },
    ];

    console.log("[generate] 开始生成", {
      model: apiConfig.model,
      baseUrl: apiConfig.baseUrl,
      prompt,
    });

    startGenerate();
    const id = useAppStore.getState().generationId;

    let fullText = "";
    try {
      await streamChat(
        "/api/chat",
        { messages: baseMessages, config: apiConfig },
        {
          onDelta: (t) => {
            fullText += t;
            if (fullText.length < 200 || fullText.length % 500 === 0) {
              console.log("[generate] 累计长度", fullText.length);
            }
            appendStreamText(t);
          },
        }
      );
      console.log("[generate] 流结束，fullText 长度", fullText.length);
      console.log(
        "[generate] fullText 前 300 字符:",
        JSON.stringify(fullText.slice(0, 300))
      );

      const html = extractHtml(fullText);
      console.log("[generate] extractHtml 结果长度", html.length);
      if (!html) throw new Error("未能从响应中提取到 HTML 代码");

      // 若期间用户点击了“返回首页”，则放弃本次结果
      if (useAppStore.getState().generationId !== id) return;
      finishGenerate(html, baseMessages);
      console.log("[generate] finishGenerate 完成，代码长度", html.length);
    } catch (e) {
      console.error("[generate] 生成失败", e);
      if (useAppStore.getState().generationId === id) {
        setError((e as Error).message);
        failGenerate();
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-14">
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            用一句话描述你想创建的应用
          </h1>
          <p className="mt-3 text-zinc-400">
            选择类型与风格，AI 会生成一个可直接运行的单文件 HTML 应用。
          </p>
        </div>

        {/* 大输入框 */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur transition-all duration-200 focus-within:border-indigo-500">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="用一句话描述你想创建的应用…"
            rows={3}
            className="min-h-[120px] w-full resize-none bg-transparent px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
        </div>

        {/* 快捷示例 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">试试：</span>
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition-all duration-200 hover:border-indigo-500 hover:text-white"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* 项目类型 */}
        <div className="mt-6">
          <Label className="mb-2 block">项目类型</Label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_TYPES.map((t) => (
              <Chip
                key={t}
                active={projectType === t}
                onClick={() => setProjectType(t)}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* 风格 */}
        <div className="mt-4">
          <Label className="mb-2 block">视觉风格</Label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <Chip key={s} active={style === s} onClick={() => setStyle(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        {/* 生成按钮 */}
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={handleGenerate}>
            <Wand2 className="h-4 w-4" /> 生成应用
          </Button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-indigo-600 text-white"
          : "border border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
