export interface ApiConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const PROVIDERS = [
  {
    value: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    value: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  {
    value: "custom",
    label: "自定义",
    baseUrl: "",
    defaultModel: "",
  },
];

export const COMMON_MODELS = [
  "deepseek-chat",
  "deepseek-reasoner",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
];

export const DEFAULT_CONFIG: ApiConfig = {
  provider: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 8192,
};

const CONFIG_KEY = "vibe-builder:config";

export function loadConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}

export function persistConfig(config: ApiConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export const SYSTEM_PROMPT = `你是一个全栈开发专家。用户会用自然语言描述一个 Web 应用的需求，或对已有应用提出修改意见。
你需要生成/返回一个完整的、可直接在浏览器中运行的单文件 HTML 应用。
要求：
1. 输出完整 HTML 结构，内联 CSS 和 JavaScript；
2. 使用 Tailwind CSS CDN（https://cdn.tailwindcss.com）；
3. 代码完整可运行，界面美观、现代、响应式；
4. 数据存储使用 localStorage；
5. 若用户是对已有代码提出修改，请基于上下文输出修改后的完整 HTML（不是片段，不要省略）；
6. 用 \`\`\`html 包裹代码；
7. 不要输出任何解释文字，只输出代码块。`;

export const PROJECT_TYPES = [
  "通用应用",
  "落地页",
  "数据仪表盘",
  "工具 / 计算器",
  "小游戏",
  "待办清单",
];

export const STYLES = ["简约", "现代", "暗黑", "极客", "复古", "渐变", "玻璃拟态"];

export const EXAMPLE_PROMPTS = [
  "一个番茄工作法计时器，带音效和任务统计",
  "一个记账本，支持收入支出分类和月度图表",
  "一个待办事项清单，支持拖拽排序和本地保存",
  "一个天气查询页面，输入城市显示未来几天天气",
];
