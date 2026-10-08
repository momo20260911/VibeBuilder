# Vibe Builder

输入一句话，AI 帮你生成一个可直接运行的 Web 应用原型。支持多轮对话修改、历史版本回滚，代码可实时编辑与沙盒预览。

## ✨ 功能特性

- 🧠 **自然语言生成应用**：描述需求（如「一个番茄钟计时器」），AI 自动生成完整的单文件 HTML 应用，内联 CSS/JS 与 Tailwind CDN。
- 🔀 **多服务商支持**：DeepSeek / OpenAI / Anthropic / 自定义（OpenAI 兼容接口），切换服务商自动填充 Base URL 与默认模型。
- 💬 **多轮对话修改**：在已有应用基础上用自然语言继续改（如「加个暗黑模式」），AI 基于完整上下文生成新版本。
- 🕑 **历史版本回滚**：最多保留 10 个版本，一键回滚，编辑器与预览同步切换。
- ✏️ **实时编辑 + 预览**：内置 Monaco 编辑器可手动改代码；沙盒 iframe 实时预览。
- 🔌 **测试连接**：设置面板内一键测试 API 连接（10s 超时），成功自动保存配置，失败保留输入。
- 🔒 **隐私安全**：API Key 只存在你自己的浏览器 localStorage，服务端不保存、无需任何环境变量。

## 🛠 技术栈

- **框架**：Next.js 14（App Router）
- **语言**：TypeScript / React 18
- **样式**：Tailwind CSS
- **状态**：Zustand
- **编辑器**：Monaco Editor（`@monaco-editor/react`）
- **AI 调用**：OpenAI SDK（OpenAI 兼容模式，适配 DeepSeek / OpenAI / Anthropic）
- **流式输出**：SSE（Server-Sent Events）

## 🚀 快速开始

环境要求：Node.js 18.17+（推荐 20 LTS）

```bash
npm install
npm run dev
```

打开 http://localhost:3000，点击右上角「设置」填入你的 API Key 即可开始。

生产构建：

```bash
npm run build
npm start
```

## 📖 使用说明

1. 在首页输入需求描述（或点击示例提示词）。
2. 点击「生成」，等待 AI 流式生成（可实时看到进度）。
3. 生成完成后，左侧 Monaco 编辑器可继续改代码，右侧沙盒实时预览。
4. 想继续改？在下方对话面板输入修改意见，AI 基于上下文生成新版本。
5. 改坏了？点右上角「历史版本」一键回滚。
6. 「返回首页」会清空当前进度并回到首页（有二次确认）。

### 模型服务商配置

| 服务商 | Base URL | 默认模型 |
| --- | --- | --- |
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat |
| OpenAI | https://api.openai.com/v1 | gpt-4o |
| Anthropic | https://api.anthropic.com/v1 | claude-3-5-sonnet-20241022 |
| 自定义 | 任意 OpenAI 兼容地址 | 自填 |

> 💡 DeepSeek 的 `deepseek-reasoner` 会把大量 token 消耗在推理过程上，生成应用建议使用 `deepseek-chat`。

## 📁 项目结构

```
vibe-builder/
├── app/
│   ├── page.tsx                      # 主页面（home / generating / done 状态切换）
│   ├── layout.tsx                    # 根布局
│   ├── globals.css
│   └── api/
│       ├── chat/route.ts             # 生成 / 修改对话（SSE 流式）
│       └── test-connection/route.ts  # 连接测试
├── components/
│   ├── prompt-screen.tsx             # 首页需求输入
│   ├── workbench.tsx                 # 编辑器 + 预览工作台
│   ├── header.tsx                    # 顶栏（返回首页 / 版本 / 设置）
│   ├── settings-dialog.tsx           # 设置面板
│   ├── conversation-panel.tsx        # 多轮对话气泡
│   ├── version-menu.tsx              # 历史版本下拉
│   ├── code-editor.tsx               # Monaco 编辑器
│   ├── preview.tsx                   # 沙盒 iframe 预览
│   ├── generating-screen.tsx         # 生成中动画
│   └── ui/                           # 基础 UI 组件
├── lib/
│   ├── config.ts                     # 服务商 / 配置常量
│   ├── stream.ts                     # SSE 流式解析
│   ├── history.ts                    # 上下文裁剪
│   ├── extract.ts                    # HTML 提取
│   └── utils.ts
├── store/use-store.ts                # Zustand 全局状态
├── nginx.conf                        # Nginx 反代配置
├── ecosystem.config.js               # PM2 配置
├── Dockerfile                        # Docker 构建
└── DEPLOY.md                         # 部署文档（Rocky Linux 9）
```

## 🚚 部署

见 [DEPLOY.md](./DEPLOY.md)。要点：

- **无需任何环境变量 / API Key**：Key 由每个用户在浏览器端自备，服务端不涉及密钥。
- 支持 PM2 + Nginx 反代（SSE 需关闭 `proxy_buffering`），或 Docker 一键部署。
- 部署文档针对 Rocky Linux 9（RHEL/CentOS 系列），含 SELinux、firewalld 等关键配置。
