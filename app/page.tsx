"use client";

import { useAppStore } from "@/store/use-store";
import { PromptScreen } from "@/components/prompt-screen";
import { GeneratingScreen } from "@/components/generating-screen";
import { Workbench } from "@/components/workbench";

export default function Home() {
  const status = useAppStore((s) => s.status);

  return (
    <>
      {status === "home" && <PromptScreen />}
      {status === "generating" && <GeneratingScreen />}
      {status === "done" && <Workbench />}
    </>
  );
}
