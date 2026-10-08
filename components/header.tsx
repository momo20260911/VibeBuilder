"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Check,
  Home,
  Loader2,
  LogIn,
  Moon,
  Save,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/use-store";
import { Button } from "./ui/button";
import { VersionMenu } from "./version-menu";
import { UserMenu } from "./user-menu";

export function Header() {
  const router = useRouter();
  const hydrate = useAppStore((s) => s.hydrate);
  const apiConfig = useAppStore((s) => s.apiConfig);
  const status = useAppStore((s) => s.status);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const resetToHome = useAppStore((s) => s.resetToHome);
  const saveProject = useAppStore((s) => s.saveProject);
  const configured = Boolean(apiConfig.apiKey);

  const { data: _session, status: authStatus } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const isDark = mounted ? resolvedTheme === "dark" : true;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function handleHome() {
    if (
      status === "done" &&
      !window.confirm("确定要返回首页吗？当前进度将丢失。")
    ) {
      return;
    }
    resetToHome();
    router.push("/");
  }

  async function handleSave() {
    if (authStatus !== "authenticated") {
      signIn("github");
      return;
    }
    setSaveState("saving");
    try {
      await saveProject();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  const authenticated = authStatus === "authenticated";
  const saveLabel = !authenticated
    ? "登录后保存"
    : saveState === "saving"
      ? "保存中…"
      : saveState === "saved"
        ? "已保存"
        : saveState === "error"
          ? "保存失败"
          : "保存";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0a0a0a]/70">
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

          <button
            onClick={() => router.push("/dashboard")}
            className="ml-1 flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            title="我的项目"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              Vibe Builder
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <VersionMenu />

          {status === "done" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveState === "saving"}
            >
              {!authenticated ? (
                <LogIn className="h-4 w-4" />
              ) : saveState === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveState === "saved" ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveLabel}
            </Button>
          )}

          <div className="ml-1 flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                configured ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="hidden text-gray-500 sm:inline dark:text-zinc-400">
              {configured ? "API 已配置" : "API 未配置"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="切换主题"
            title="切换主题"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="设置"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
