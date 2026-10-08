"use client";

import { useState } from "react";
import { Check, Copy, Download, Maximize, Minimize } from "lucide-react";
import { useAppStore } from "@/store/use-store";

export function Preview({ code }: { code: string }) {
  const fullscreen = useAppStore((s) => s.fullscreenPreview);
  const setFullscreen = useAppStore((s) => s.setFullscreenPreview);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vibe-app.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-white/10">
        <span className="text-xs text-gray-500 dark:text-zinc-500">预览</span>
        <div className="flex items-center gap-1">
          <ToolButton onClick={copy} title="复制代码">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </ToolButton>
          <ToolButton onClick={download} title="下载 HTML">
            <Download className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "退出全屏" : "全屏预览"}
          >
            {fullscreen ? (
              <Minimize className="h-3.5 w-3.5" />
            ) : (
              <Maximize className="h-3.5 w-3.5" />
            )}
          </ToolButton>
        </div>
      </div>

      <iframe
        className="w-full flex-1 bg-white"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={code}
        title="应用预览"
      />
    </div>
  );
}

function ToolButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-md p-1.5 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
