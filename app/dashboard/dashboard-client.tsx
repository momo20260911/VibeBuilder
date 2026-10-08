"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  currentCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export function DashboardClient({ projects }: { projects: ProjectItem[] }) {
  const router = useRouter();
  const loadProject = useAppStore((s) => s.loadProject);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleOpen(id: string) {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) return;
    const project = await res.json();
    loadProject(project);
    router.push("/");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定要删除这个项目吗？此操作不可恢复。")) return;
    setDeleting(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            我的项目
          </h1>
          <p className="mt-2 text-gray-500 dark:text-zinc-400">
            管理你保存的所有应用原型
          </p>
        </div>
        <Button onClick={() => router.push("/")}>
          <Plus className="h-4 w-4" /> 新建应用
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center dark:border-white/10">
          <p className="text-gray-500 dark:text-zinc-400">还没有保存的项目</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-zinc-500">
            在工作区生成应用后点击「保存」，即可在这里看到。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="relative h-40 w-full overflow-hidden border-b border-gray-200 bg-white dark:border-white/10">
                {p.currentCode ? (
                  <iframe
                    srcDoc={p.currentCode}
                    sandbox="allow-scripts"
                    className="pointer-events-none"
                    style={{
                      width: "400%",
                      height: "400%",
                      transform: "scale(0.25)",
                      transformOrigin: "top left",
                      border: 0,
                    }}
                    loading="lazy"
                    title={p.name}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300 dark:text-zinc-600">
                    无代码
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h2 className="truncate font-medium text-gray-900 dark:text-white">
                  {p.name}
                </h2>
                <p className="mt-1 truncate text-xs text-gray-400 dark:text-zinc-500">
                  {p.description || "暂无描述"}
                </p>
                <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500">
                  更新于 {formatTime(p.updatedAt)}
                </p>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => handleOpen(p.id)}>
                    <FolderOpen className="h-3.5 w-3.5" /> 打开
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
