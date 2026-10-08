"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { useAppStore } from "@/store/use-store";
import { COMMON_MODELS, PROVIDERS, type ApiConfig } from "@/lib/config";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Select } from "./ui/select";

type TestStatus = "idle" | "testing" | "success" | "error";

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error("连接超时，请检查网络或 Base URL");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function SettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const apiConfig = useAppStore((s) => s.apiConfig);
  const setApiConfig = useAppStore((s) => s.setApiConfig);
  const saveApiConfig = useAppStore((s) => s.saveApiConfig);

  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [modelReply, setModelReply] = useState("");

  useEffect(() => {
    if (open) {
      setTestStatus("idle");
      setTestMessage("");
      setModelReply("");
    }
  }, [open]);

  function update(partial: Partial<ApiConfig>) {
    setApiConfig(partial);
    // 配置变化后重置测试结果，避免旧的成功/失败状态误导用户
    setTestStatus((s) => (s === "testing" ? s : "idle"));
  }

  function handleProviderChange(value: string) {
    const p = PROVIDERS.find((x) => x.value === value);
    update({
      provider: value,
      baseUrl: p?.baseUrl ?? "",
      model: p?.defaultModel ?? apiConfig.model,
    });
  }

  async function handleTest() {
    if (!apiConfig.apiKey.trim()) {
      setTestStatus("error");
      setTestMessage("请先填写 API Key");
      return;
    }

    setTestStatus("testing");
    setTestMessage("");
    setModelReply("");

    try {
      const res = await fetchWithTimeout(
        "/api/test-connection",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: apiConfig }),
        },
        10000
      );

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        modelReply?: string;
        error?: string;
      };

      if (data.success) {
        setTestStatus("success");
        setTestMessage(data.message || "连接成功");
        setModelReply(data.modelReply || "");
        saveApiConfig(); // 测试成功，自动保存当前配置到 localStorage
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "连接失败");
      }
    } catch (e) {
      setTestStatus("error");
      setTestMessage((e as Error).message || "连接失败");
    }
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        模型服务配置
      </h2>
      <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
        配置统一保存在浏览器 localStorage。
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="provider">服务商 Provider</Label>
          <Select
            id="provider"
            value={apiConfig.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="base-url">Base URL</Label>
          <Input
            id="base-url"
            value={apiConfig.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model">模型名称 Model</Label>
          <Input
            id="model"
            list="model-list"
            value={apiConfig.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder="输入或选择模型"
          />
          <datalist id="model-list">
            {COMMON_MODELS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-..."
            autoComplete="off"
            value={apiConfig.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">Temperature</Label>
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              {apiConfig.temperature.toFixed(1)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={apiConfig.temperature}
            onChange={(v) => update({ temperature: v })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max-tokens">Max Tokens</Label>
          <Input
            id="max-tokens"
            type="number"
            min={256}
            max={8192}
            value={apiConfig.maxTokens}
            onChange={(e) => update({ maxTokens: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* 测试连接 */}
      <div className="mt-6 border-t border-gray-200 pt-5 dark:border-white/10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testStatus === "testing"}
        >
          {testStatus === "testing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              正在测试...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              测试连接
            </>
          )}
        </Button>

        {testStatus === "success" && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            <p>✅ 连接成功！模型已响应</p>
            {modelReply && (
              <p className="mt-1 break-words text-xs text-emerald-600/80 dark:text-emerald-400/80">
                模型返回：{modelReply}
              </p>
            )}
          </div>
        )}

        {testStatus === "error" && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
            <p>❌ 连接失败: {testMessage}</p>
            <button
              onClick={handleTest}
              className="mt-2 text-xs text-red-600 underline underline-offset-2 transition-colors hover:text-red-500 dark:text-red-300 dark:hover:text-red-200"
            >
              重试
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => {
            saveApiConfig();
            setOpen(false);
          }}
        >
          完成
        </Button>
      </div>
    </Dialog>
  );
}
