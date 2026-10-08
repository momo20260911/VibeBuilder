"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Loader2, X } from "lucide-react";
import { useTheme } from "next-themes";
import type { Version } from "@/store/use-store";

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 text-gray-500 dark:text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> 加载对比编辑器…
      </div>
    ),
  }
);

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DiffDialog({
  open,
  original,
  modified,
  onClose,
}: {
  open: boolean;
  original?: Version;
  modified?: Version;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();

  if (!open || !original || !modified) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="animate-dialog-in relative flex h-[90vh] w-[90vw] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
        {/* 顶部：版本信息 + 关闭 */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-gray-400 dark:text-zinc-500">
                旧
              </span>
              <span className="truncate font-medium text-gray-900 dark:text-white">
                {original.label}
              </span>
              <span className="shrink-0 text-xs text-gray-400 dark:text-zinc-500">
                {formatTime(original.timestamp)}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500" />
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-gray-400 dark:text-zinc-500">
                新
              </span>
              <span className="truncate font-medium text-gray-900 dark:text-white">
                {modified.label}
              </span>
              <span className="shrink-0 text-xs text-gray-400 dark:text-zinc-500">
                {formatTime(modified.timestamp)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="关闭"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 差异对比 */}
        <div className="min-h-0 flex-1">
          <DiffEditor
            height="100%"
            language="html"
            original={original.code}
            modified={modified.code}
            theme={resolvedTheme === "light" ? "light" : "vs-dark"}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
