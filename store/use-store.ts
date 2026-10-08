"use client";

import { create } from "zustand";
import {
  DEFAULT_CONFIG,
  loadConfig,
  persistConfig,
  SYSTEM_PROMPT,
  type ApiConfig,
} from "@/lib/config";

export type Status = "home" | "generating" | "done";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Version {
  id: string;
  code: string;
  timestamp: number;
  label: string;
}

export interface LoadedProject {
  id: string;
  name: string;
  description: string | null;
  currentCode: string | null;
  versions: { id: string; code: string; label: string; createdAt: string }[];
  messages: { id: string; role: string; content: string; createdAt: string }[];
}

const MAX_VERSIONS = 10;

function makeVersion(code: string, index: number): Version {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code,
    timestamp: Date.now(),
    label: index === 1 ? "初始版本" : `第 ${index} 版`,
  };
}

interface AppState {
  apiConfig: ApiConfig;
  isGenerating: boolean;
  generatedCode: string;
  previewCode: string;
  messages: ChatMessage[];
  versions: Version[];
  status: Status;
  streamText: string;
  settingsOpen: boolean;
  fullscreenPreview: boolean;
  generationId: number;
  currentProjectId: string | null;

  hydrate: () => void;
  setApiConfig: (partial: Partial<ApiConfig>) => void;
  saveApiConfig: () => void;
  setSettingsOpen: (open: boolean) => void;
  setFullscreenPreview: (open: boolean) => void;

  startGenerate: () => void;
  finishGenerate: (code: string, baseMessages: ChatMessage[]) => void;
  failGenerate: () => void;

  startModify: () => void;
  finishModify: (code: string, baseMessages: ChatMessage[]) => void;
  failModify: () => void;

  setGeneratedCode: (code: string) => void;
  setPreviewCode: (code: string) => void;
  appendStreamText: (text: string) => void;

  restoreVersion: (version: Version) => void;
  resetToHome: () => void;

  saveProject: (name?: string) => Promise<void>;
  loadProject: (project: LoadedProject) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apiConfig: DEFAULT_CONFIG,
  isGenerating: false,
  generatedCode: "",
  previewCode: "",
  messages: [],
  versions: [],
  status: "home",
  streamText: "",
  settingsOpen: false,
  fullscreenPreview: false,
  generationId: 0,
  currentProjectId: null,

  hydrate: () => set({ apiConfig: loadConfig() }),

  setApiConfig: (partial) => {
    set({ apiConfig: { ...get().apiConfig, ...partial } });
  },

  saveApiConfig: () => {
    persistConfig(get().apiConfig);
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setFullscreenPreview: (open) => set({ fullscreenPreview: open }),

  startGenerate: () =>
    set((state) => ({
      isGenerating: true,
      status: "generating",
      streamText: "",
      generationId: state.generationId + 1,
    })),

  finishGenerate: (code, baseMessages) =>
    set((state) => {
      const version = makeVersion(code, state.versions.length + 1);
      return {
        isGenerating: false,
        status: "done",
        generatedCode: code,
        previewCode: code,
        messages: [...baseMessages, { role: "assistant", content: code }],
        versions: [...state.versions, version].slice(-MAX_VERSIONS),
      };
    }),

  failGenerate: () =>
    set({ isGenerating: false, status: "home", streamText: "" }),

  startModify: () =>
    set((state) => ({
      isGenerating: true,
      generationId: state.generationId + 1,
    })),

  finishModify: (code, baseMessages) =>
    set((state) => {
      const version = makeVersion(code, state.versions.length + 1);
      return {
        isGenerating: false,
        generatedCode: code,
        previewCode: code,
        messages: [...baseMessages, { role: "assistant", content: code }],
        versions: [...state.versions, version].slice(-MAX_VERSIONS),
      };
    }),

  failModify: () => set({ isGenerating: false }),

  setGeneratedCode: (code) => set({ generatedCode: code }),
  setPreviewCode: (code) => set({ previewCode: code }),

  appendStreamText: (text) =>
    set((state) => ({ streamText: state.streamText + text })),

  restoreVersion: (version) =>
    set((state) => ({
      generatedCode: version.code,
      previewCode: version.code,
      messages: [
        ...state.messages,
        { role: "assistant", content: version.code },
      ],
    })),

  resetToHome: () =>
    set((state) => ({
      isGenerating: false,
      generatedCode: "",
      previewCode: "",
      messages: [],
      versions: [],
      status: "home",
      streamText: "",
      fullscreenPreview: false,
      currentProjectId: null,
      generationId: state.generationId + 1,
    })),

  saveProject: async (name) => {
    const state = get();
    const payload = {
      name: name?.trim() || "未命名项目",
      currentCode: state.generatedCode,
      versions: state.versions.map((v) => ({ code: v.code, label: v.label })),
      messages: state.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    };

    const url = state.currentProjectId
      ? `/api/projects/${state.currentProjectId}`
      : "/api/projects";
    const res = await fetch(url, {
      method: state.currentProjectId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "保存失败");
    }

    const project = (await res.json()) as { id: string };
    if (!state.currentProjectId) {
      set({ currentProjectId: project.id });
    }
  },

  loadProject: (project) =>
    set({
      currentProjectId: project.id,
      generatedCode: project.currentCode ?? "",
      previewCode: project.currentCode ?? "",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...project.messages.map((m) => ({
          role: m.role as ChatMessage["role"],
          content: m.content,
        })),
      ],
      versions: project.versions.map((v) => ({
        id: v.id,
        code: v.code,
        timestamp: new Date(v.createdAt).getTime(),
        label: v.label,
      })),
      status: "done",
      streamText: "",
      isGenerating: false,
      fullscreenPreview: false,
    }),
}));
