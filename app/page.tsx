"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/use-store";
import { Header } from "@/components/header";
import { SettingsDialog } from "@/components/settings-dialog";
import { PromptScreen } from "@/components/prompt-screen";
import { GeneratingScreen } from "@/components/generating-screen";
import { Workbench } from "@/components/workbench";

export default function Home() {
  const hydrate = useAppStore((s) => s.hydrate);
  const status = useAppStore((s) => s.status);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {status === "home" && <PromptScreen />}
      {status === "generating" && <GeneratingScreen />}
      {status === "done" && <Workbench />}
      <SettingsDialog />
    </div>
  );
}
