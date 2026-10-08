"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { FolderKanban, LogIn, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";

export function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
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

  if (status === "loading") {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
    );
  }

  if (status !== "authenticated") {
    return (
      <Button variant="ghost" size="sm" onClick={() => signIn("github")}>
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">登录</span>
      </Button>
    );
  }

  const user = session.user;
  const name = user?.name || user?.email || "用户";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="用户菜单"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-gray-200 px-3 py-2 dark:border-white/10">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {name}
            </p>
            {user?.email && (
              <p className="truncate text-xs text-gray-400 dark:text-zinc-500">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/dashboard");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <FolderKanban className="h-4 w-4" /> 我的项目
          </button>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-gray-100 dark:text-red-400 dark:hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}
