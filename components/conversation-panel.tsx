"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useAppStore } from "@/store/use-store";

export function ConversationPanel() {
  const messages = useAppStore((s) => s.messages);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = messages.filter((m) => m.role !== "system");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, collapsed]);

  return (
    <div className="flex h-56 shrink-0 flex-col border-t border-white/10 bg-[#0a0a0a]/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <MessageSquare className="h-3.5 w-3.5" />
          多轮对话
          <span className="text-zinc-600">({visible.length})</span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "展开对话" : "收起对话"}
        >
          {collapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-auto p-3"
        >
          {visible.length === 0 && (
            <p className="text-center text-xs text-zinc-600">暂无对话记录</p>
          )}

          {visible.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg rounded-br-sm bg-indigo-600 px-3 py-2 text-xs text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg rounded-bl-sm border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                  <span className="font-medium text-indigo-300">
                    已生成 HTML
                  </span>
                  <span className="ml-1.5 text-zinc-500">
                    约 {m.content.length} 字符
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
