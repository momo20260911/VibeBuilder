"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/use-store";

export function GeneratingScreen() {
  const streamText = useAppStore((s) => s.streamText);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streamText]);

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-4xl flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 text-zinc-300">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        <span>AI 正在生成应用…</span>
      </div>

      <div className="mt-6 h-64 w-full overflow-auto rounded-xl border border-white/10 bg-black/40 p-4">
        <pre
          ref={preRef}
          className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-400"
        >
          {streamText || "等待响应…"}
        </pre>
      </div>
    </div>
  );
}
