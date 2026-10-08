"use client";

import { useEffect, useRef, useState } from "react";
import { Diff, History } from "lucide-react";
import { useAppStore, type Version } from "@/store/use-store";
import { DiffDialog } from "./diff-dialog";

export function VersionMenu() {
  const versions = useAppStore((s) => s.versions);
  const restoreVersion = useAppStore((s) => s.restoreVersion);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [diffOpen, setDiffOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (versions.length === 0) return null;

  // 最新版本显示在最上面
  const list = [...versions].reverse();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  function openDiff() {
    setOpen(false);
    setDiffOpen(true);
  }

  function closeDiff() {
    setDiffOpen(false);
    setSelected([]);
  }

  // 按时间排序：旧在前（original）、新在后（modified）
  const diffVersions: Version[] = selected
    .map((id) => versions.find((v) => v.id === id))
    .filter((v): v is Version => Boolean(v))
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-all duration-200 hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white"
        >
          <History className="h-4 w-4" />
          历史版本
          <span className="text-xs text-gray-400 dark:text-zinc-500">
            {versions.length}
          </span>
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-50 max-h-96 w-72 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <div className="px-2 py-1.5 text-xs text-gray-400 dark:text-zinc-500">
              点击版本可回滚，勾选两个可对比
            </div>

            {list.map((v) => {
              const checked = selected.includes(v.id);
              const disabled = !checked && selected.length >= 2;
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <button
                    onClick={() => {
                      restoreVersion(v);
                      setOpen(false);
                    }}
                    className="flex flex-1 items-center justify-between text-left text-sm text-gray-700 transition-colors duration-200 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-white"
                  >
                    <span>{v.label}</span>
                    <span className="text-xs text-gray-400 dark:text-zinc-500">
                      {new Date(v.timestamp).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(v.id)}
                    disabled={disabled}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`选择对比 ${v.label}`}
                    title="选择对比"
                  />
                </div>
              );
            })}

            {selected.length === 2 && (
              <div className="sticky bottom-0 border-t border-gray-200 bg-white p-1.5 dark:border-white/10 dark:bg-zinc-900">
                <button
                  onClick={openDiff}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-500"
                >
                  <Diff className="h-4 w-4" />
                  对比版本
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DiffDialog
        open={diffOpen}
        original={diffVersions[0]}
        modified={diffVersions[1]}
        onClose={closeDiff}
      />
    </>
  );
}
