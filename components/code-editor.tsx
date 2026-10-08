"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-gray-500 dark:text-zinc-500">
      <Loader2 className="h-4 w-4 animate-spin" /> 加载编辑器…
    </div>
  ),
});

export function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="html"
      language="html"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme={resolvedTheme === "light" ? "light" : "vs-dark"}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        smoothScrolling: true,
      }}
    />
  );
}
