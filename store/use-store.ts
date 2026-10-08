"use client";

import { create } from "zustand";
import {
  DEFAULT_CONFIG,
  loadConfig,
  persistConfig,
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
      generationId: state.generationId + 1,
    })),
}));
