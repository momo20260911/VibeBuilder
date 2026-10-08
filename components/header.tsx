"use client";

import { Home, Settings, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/use-store";
import { Button } from "./ui/button";
import { VersionMenu } from "./version-menu";

export function Header() {
  const apiConfig = useAppStore((s) => s.apiConfig);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const resetToHome = useAppStore((s) => s.resetToHome);
  const configured = Boolean(apiConfig.apiKey);

  function handleHome() {
    if (window.confirm("确定要返回首页吗？当前进度将丢失。")) {
      resetToHome();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHome}
            aria-label="返回首页"
            title="返回首页"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">返回首页</span>
          </Button>

          <div className="ml-1 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Vibe Builder
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VersionMenu />

          <div className="ml-1 flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                configured ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="hidden text-zinc-400 sm:inline">
              {configured ? "API 已配置" : "API 未配置"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="设置"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
