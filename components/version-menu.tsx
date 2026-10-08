"use client";

import { useEffect, useRef, useState } from "react";
import { History } from "lucide-react";
import { useAppStore } from "@/store/use-store";

export function VersionMenu() {
  const versions = useAppStore((s) => s.versions);
  const restoreVersion = useAppStore((s) => s.restoreVersion);
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-300 transition-all duration-200 hover:border-white/20 hover:text-white"
      >
        <History className="h-4 w-4" />
        历史版本
        <span className="text-xs text-zinc-500">{versions.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-80 w-64 overflow-auto rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-2xl">
          {list.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                restoreVersion(v);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <span>{v.label}</span>
              <span className="text-xs text-zinc-500">
                {new Date(v.timestamp).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
