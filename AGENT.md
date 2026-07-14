# AI Writer Agent 规范

> 本文档是 AI Agent 开发的核心规范。修改代码前必须通读相关章节。

---

## 速查手册

| 我要做什么 | 看哪里 |
|-----------|--------|
| 新建页面组件 | [二、组件规范](#二组件规范) + [项目目录树](#项目目录树) |
| 新建 API 路由 | [三、API 规范](#三api-规范) |
| 新建/修改数据库表 | [四、数据库规范](#四数据库规范) |
| 使用 AI 功能 | [五、AI 开发规范](#五ai-开发规范) |
| 样式/颜色/间距 | [一、视觉规范](#一视觉规范) |
| 抽离公共组件 | [七、工程规范 § 复用决策](#71-复用决策树) |
| 提交代码 | [八、Git 规范](#八git-规范) |
| 技术栈/依赖 | [项目技术栈](#项目技术栈) |

---

## 项目技术栈

```
框架:    Next.js 16 (App Router)
UI:      Ant Design 6 + CSS Modules
AI SDK:  Vercel AI SDK 7 (@ai-sdk/openai, ai)
数据库:  better-sqlite3 (WAL 模式)
语言:    TypeScript 5.5, React 19
```

### 核心依赖说明

| 依赖 | 用途 | 注意事项 |
|------|------|----------|
| `ai` (v7) | AI SDK 核心 | 工具用 `tool()` + `zodSchema()` |
| `@ai-sdk/react` | 前端 AI hooks | `useChat`, `useCompletion` |
| `better-sqlite3` | 本地数据库 | 通过 `getDb()` 获取连接 |
| `antd` (v6) | UI 组件库 | 不使用彩色图标 |

---

## 项目目录树

```
novel-writer/
├── app/                          # Next.js App Router
│   ├── api/                      # ===== API 路由层 =====
│   │   ├── utils.ts              # jsonSuccess / jsonError 工具函数
│   │   ├── ai/                   # AI 相关 API
│   │   │   ├── chat/             # 普通 AI 对话
│   │   │   ├── agent/            # Agent 模式（带工具调用）
│   │   │   │   ├── chat/         # SSE 流式对话
│   │   │   │   ├── conversations/# 会话管理
│   │   │   │   └── scenes/       # 场景配置
│   │   │   ├── config/           # AI 配置 CRUD
│   │   │   ├── models/           # 模型列表
│   │   │   ├── templates/        # 提示词模板 CRUD
│   │   │   └── variables/        # 变量注册表
│   │   ├── books/                # 书籍 CRUD
│   │   │   ├── route.ts          # GET 列表 / POST 创建
│   │   │   └── [id]/             # 单本书操作
│   │   │       ├── route.ts      # GET/PUT/DELETE
│   │   │       ├── facts/        # 事实库
│   │   │       └── foreshadows/  # 伏笔库
│   │   ├── chapters/             # 章节 CRUD
│   │   ├── volumes/              # 卷 CRUD
│   │   ├── outline/              # 总纲
│   │   ├── world-rules/          # 世界规则
│   │   ├── setting-entities/     # 设定实体
│   │   ├── tags/                 # 标签系统
│   │   ├── folders/              # 文件夹
│   │   ├── files/                # 文件
│   │   ├── archive/              # 存稿/归档
│   │   └── logs/                 # 日志
│   │
│   ├── pages/                    # ===== 页面组件层 =====
│   │   ├── home/                 # 首页（书籍列表）
│   │   │   ├── index.tsx
│   │   │   ├── api/              # 页面级 API 封装
│   │   │   └── hooks/
│   │   ├── books/                # 书籍工作区（主页面）
│   │   │   ├── index.tsx         # 主组件：三栏布局
│   │   │   ├── config/           # 面板配置、AI 场景
│   │   │   ├── context/          # React Context（AiProvider）
│   │   │   ├── hooks/            # 页面级 hooks
│   │   │   ├── api/              # 页面级 API 封装
│   │   │   └── components/       # 页面子组件
│   │   │       ├── ai-agent-panel/       # Agent 模式 AI 面板
│   │   │       ├── ai-assistant-panel/   # 助手模式 AI 面板
│   │   │       ├── creation-zone/        # 创作区（卷纲/章纲/正文）
│   │   │       ├── settings-library/     # 设定库
│   │   │       ├── world-rules/          # 世界规则
│   │   │       ├── fact-library/         # 事实库
│   │   │       ├── foreshadow-library/   # 伏笔库
│   │   │       ├── content-library/      # 正文库
│   │   │       ├── tag-library/          # 标签库
│   │   │       ├── log-library/          # 日志库
│   │   │       ├── prompt-library/       # 提示词库
│   │   │       ├── folder-file-editor/   # 文件管理器
│   │   │       ├── review-result-panel/  # 审查结果
│   │   │       ├── archive-view/         # 存稿视图
│   │   │       ├── book-info-form/       # 书籍信息表单
│   │   │       └── list-detail-layout/   # 通用列表-详情布局
│   │   └── settings-ai/          # AI 配置设置页
│   │
│   ├── components/               # ===== 应用级组件 =====
│   │   ├── app-shell/            # 应用外壳
│   │   ├── layout-shell.tsx      # 布局壳
│   │   └── shell-provider.tsx    # 全局 Provider
│   │
│   ├── types/                    # ===== 应用级类型 =====
│   │   ├── index.ts              # Book, Chapter 等核心类型
│   │   └── review.ts             # 审查类型
│   │
│   ├── utils/                    # 应用级工具
│   ├── globals.css               # 全局样式 + CSS 变量
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 入口页
│
├── server/                       # ===== 服务端层 =====
│   ├── ai/                       # AI 引擎
│   │   ├── agent/                # Agent 核心
│   │   │   ├── scene-registry.ts # 场景注册表
│   │   │   ├── tools.ts          # 工具定义
│   │   │   └── constants.ts      # 服务端常量
│   │   ├── context-builder/      # 上下文构建器
│   │   │   ├── builders/         # 各功能的上下文构建
│   │   │   └── types.ts
│   │   ├── generate-ai-text.ts   # 同步生成
│   │   ├── generate-ai-text-stream.ts # 流式生成
│   │   ├── ai-config-store.ts    # AI 配置存储
│   │   └── variable-registry.ts  # 变量注册
│   ├── storage/                  # 数据存储层
│   │   ├── db.ts                 # 数据库连接 + 表初始化 + 迁移
│   │   ├── book-store.ts         # 书籍 Store
│   │   ├── conversation-store.ts # 会话 Store
│   │   ├── fact-store.ts         # 事实 Store
│   │   ├── foreshadow-store.ts   # 伏笔 Store
│   │   ├── outline-store.ts      # 总纲 Store
│   │   ├── setting-entity-store.ts # 设定实体 Store
│   │   ├── world-rule-store.ts   # 世界规则 Store
│   │   ├── tag-store.ts          # 标签 Store
│   │   ├── folder-file-store.ts  # 文件夹/文件 Store
│   │   ├── prompt-template-store.ts # 提示词模板 Store
│   │   └── book-options-store.ts # 书籍选项 Store
│   └── utils/                    # 服务端工具
│       ├── json.ts
│       └── store-helpers.ts
│
├── shared/                       # ===== 共享层（不依赖 app/ 或 server/）=====
│   ├── ai/                       # AI 类型和契约
│   │   ├── ai-action.ts          # AiAction, AiFunctionKey
│   │   ├── contracts.ts          # AI 契约
│   │   ├── config-contracts.ts   # 配置契约
│   │   └── providers.ts          # Provider 定义
│   ├── hooks/                    # 通用 Hooks
│   │   ├── use-ai-stream.ts      # SSE 流式调用
│   │   ├── use-debounce.ts       # 防抖
│   │   └── use-tag-tree.ts       # 标签树
│   ├── types/                    # 全栈共享类型
│   │   ├── index.ts              # 统一导出
│   │   ├── book.ts, chapter.ts, fact.ts, ...
│   └── ui/                       # 通用 UI 组件
│       ├── panel-container/      # 面板容器（PanelContainer/PanelGroup/Panel/Divider）
│       ├── base-modal/           # 基础弹窗
│       ├── empty-state/          # 空状态
│       ├── ai-dropdown/          # AI 下拉菜单
│       ├── ai-scene-modal/       # AI 场景弹窗
│       ├── tag-tree/             # 标签树
│       ├── tag-selector/         # 标签选择器
│       ├── array-input/          # 数组输入
│       └── theme/                # 主题切换
│   ├── constants/                # 共享常量
│   │   └── agent-ui.ts           # Agent UI 文本常量
│   └── utils/                    # 工具函数
│       ├── parse-ai-json.ts      # AI JSON 解析
│       └── tag-tree-utils.ts     # 标签树工具
│
├── docs/                         # 文档
│   ├── plans/                    # 方案文档
│   ├── mockups/                  # 原型
│   └── *.md                      # 各类设计文档
│
└── AGENT.md                      # 本文件
```

### 目录职责边界

| 目录 | 职责 | 禁止 |
|------|------|------|
| `shared/` | 通用类型、hooks、UI、工具 | 依赖 `app/` 或 `server/` |
| `app/api/` | HTTP 路由、参数校验、错误处理 | 包含业务逻辑（委托给 `server/`） |
| `server/` | 业务逻辑、数据库、AI 引擎 | 依赖 `app/` |
| `app/pages/` | 页面组件、状态管理 | 直接调用 `server/`（通过 `app/api/`） |
| `app/components/` | 应用级共享组件 | 依赖具体页面 |

---

## 一、视觉规范

### 1.1 禁止事项

- **禁止彩色图标** — 图标颜色只能是 `var(--text-secondary)` 或 `var(--text-tertiary)`
- **禁止硬编码颜色** — 必须使用 CSS 变量
- **禁止 `!important`** — 用类嵌套提高优先级
- **禁止 emoji 作为功能图标** — 使用 `@ant-design/icons`

### 1.2 颜色系统

```css
/* 主色 */
--color-primary: #2F5D50;
--color-primary-hover: #1e4438;
--color-primary-bg: rgba(47, 93, 80, 0.05);
--color-primary-border: rgba(47, 93, 80, 0.20);

/* 背景 */
--bg-page: #f0ece4;
--bg-elevated: #faf8f4;
--bg-muted: #f5f2ec;

/* 文字 */
--text-primary: #1a1814;
--text-secondary: #4a4640;
--text-tertiary: #807b74;
--text-light: #b5b0a8;

/* 边框 */
--border: #ddd8d0;
--border-light: #ebe7e0;

/* 状态 */
--color-success: #2E8B57;
--color-warning: #964400;
--color-error: #ba1a1a;
```

### 1.3 间距 & 圆角

```css
/* 间距（4px 基数） */
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 20px; --space-6: 24px;

/* 圆角 */
--radius-sm: 4px;   /* 小组件 */
--radius-md: 6px;   /* 卡片、输入框 */
--radius-lg: 8px;   /* 弹窗、面板 */
--radius-full: 9999px;
```

### 1.4 字体 & 图标

```css
--font-display: 'Noto Serif SC', serif;           /* 标题 */
--font-body: 'Inter', 'Noto Sans SC', sans-serif; /* 正文 */
--font-mono: 'JetBrains Mono', monospace;          /* 代码 */
```

- 图标库：`@ant-design/icons`，大小 `14px - 18px`
- 图标按钮必须有 `aria-label`

---

## 二、组件规范

### 2.1 组件模板

```tsx
"use client";

import { useState, useCallback } from "react";
import { SomeIcon } from "@ant-design/icons";
import { Button } from "antd";
import styles from "./index.module.css";

// --- Props ---
interface MyComponentProps {
  title: string;
  onSelect?: (id: string) => void;
}

// --- 组件 ---
export function MyComponent({ title, onSelect }: MyComponentProps) {
  const [active, setActive] = useState<string | null>(null);

  const handleClick = useCallback((id: string) => {
    setActive(id);
    onSelect?.(id);
  }, [onSelect]);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      {/* ... */}
    </div>
  );
}
```

### 2.2 文件结构

```
my-component/
  index.tsx          # 主组件（必须）
  index.module.css   # 样式（必须）
  types.ts           # 类型（超过 3 个类型时提取）
  utils.ts           # 工具函数（有独立逻辑时提取）
  sub-component.tsx  # 子组件（超过 200 行时拆分）
```

### 2.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `AiAgentPanel` |
| 文件/目录 | kebab-case | `ai-agent-panel` |
| CSS 类名 | camelCase | `.cardTitle` |
| 函数/变量 | camelCase | `handleClick` |
| 常量 | UPPER_SNAKE | `MAX_HISTORY` |
| 类型/接口 | PascalCase | `UserProfile` |
| 事件回调 Props | on 前缀 | `onSelect`, `onToggleCollapse` |
| 事件处理函数 | handle 前缀 | `handleClick`, `handleSave` |

### 2.4 CSS Module 规范

```css
/* 必须使用 CSS 变量，禁止硬编码颜色/间距 */
.container {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--text-primary);
}
```

### 2.5 组件拆分规则

| 条件 | 动作 |
|------|------|
| 组件超过 200 行 | 拆分子组件 |
| 定义 3+ 内部组件 | 提取到独立文件 |
| 被 2+ 页面使用 | 迁移到 `shared/ui/` |
| 独立状态逻辑 | 提取为自定义 hook |

---

## 三、API 规范

### 3.1 API 路由模板

```typescript
import { jsonError, jsonSuccess } from "@/app/api/utils";
import { someStore } from "@/server/storage/some-store";

export async function GET(request: Request) {
  try {
    const data = await someStore.list();
    return jsonSuccess({ success: true, data });
  } catch {
    return jsonError("数据读取失败。", 500);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  const payload = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};

  // 参数校验前置
  const name = typeof payload.name === "string" ? payload.name : "";
  if (!name) {
    return jsonError("name 为必填字段。");
  }

  try {
    const item = await someStore.create({ name });
    return jsonSuccess({ success: true, item }, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "创建失败。";
    return jsonError(msg, 500);
  }
}
```

### 3.2 响应格式

```typescript
// 成功
jsonSuccess({ success: true, data })
// → { success: true, data }  status: 200

// 失败
jsonError("错误信息", 400)
// → { success: false, error: "错误信息", message: "错误信息" }  status: 400
```

### 3.3 API 注意事项

- 路由函数名必须是 HTTP 方法大写：`GET`, `POST`, `PUT`, `DELETE`
- 动态路由用 `[id]` 目录名
- 参数校验必须前置，返回 400
- 业务逻辑委托给 `server/storage/*-store.ts`
- 错误信息使用中文（面向用户）

---

## 四、数据库规范

### 4.1 获取连接

```typescript
import { getDb } from "@/server/storage/db";

const db = await getDb();
```

### 4.2 Store 文件模板

```typescript
// server/storage/xxx-store.ts
import { getDb } from "./db";

export interface XxxRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export async function listXxx(): Promise<XxxRecord[]> {
  const db = await getDb();
  return db.prepare("SELECT * FROM xxx ORDER BY created_at DESC").all() as XxxRecord[];
}

export async function getXxxById(id: string): Promise<XxxRecord | undefined> {
  const db = await getDb();
  return db.prepare("SELECT * FROM xxx WHERE id = ?").get(id) as XxxRecord | undefined;
}

export async function createXxx(data: { name: string }): Promise<XxxRecord> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO xxx (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(id, data.name, now, now);
  return getXxxById(id) as Promise<XxxRecord>;
}
```

### 4.3 建表规范

```sql
CREATE TABLE IF NOT EXISTS xxx (
  id         TEXT PRIMARY KEY,
  book_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  content    TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xxx_book_id ON xxx(book_id);
```

### 4.4 数据库规范要点

- 建表必须 `IF NOT EXISTS`
- 查询必须参数化：`WHERE id = ?`，禁止字符串拼接
- JSON 字段用 `TEXT DEFAULT '[]'` 或 `TEXT DEFAULT '{}'`
- 时间字段用 `TEXT` 存 ISO 字符串，`DEFAULT (datetime('now'))`
- 迁移写在 `server/storage/db.ts` 的独立函数中

---

## 五、AI 开发规范

### 5.1 工具定义

```typescript
import { tool } from 'ai';
import { zodSchema } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: '告诉 AI 何时使用此工具',
  inputSchema: zodSchema(z.object({
    field: z.string().describe('字段说明'),
  })),
  execute: async ({ field }) => {
    return { success: true, field };
  },
});
```

### 5.2 前端调用 AI（SSE 流式）

```typescript
import { useAiStream } from "@/shared/hooks/use-ai-stream";

const { loading, rawText, result, run, abort, reset } = useAiStream({
  request: {
    functionKey: "content_generate",
    bookId,
    userMessage: "用户输入",
  },
  parseJson: true,  // 自动解析 JSON 结果
  onChunk: (text) => console.log("进度:", text.length),
  onComplete: (data) => console.log("完成:", data),
  onError: (err) => message.error(err.message),
});

// 触发
<button onClick={run} loading={loading}>生成</button>
```

### 5.3 注册 AI 操作（页面级）

```typescript
import { useRegisterAiActions } from "@/app/pages/books/context/ai-context";

// 在页面组件中注册可用的 AI 操作
useRegisterAiActions([
  {
    key: "character_audit",
    label: "角色一致性检查",
    icon: <UserOutlined />,
    functionKey: "character_audit",
    buildRequest: () => ({
      bookId,
      userMessage: `检查角色: ${character.name}`,
      context: { characterId: character.id },
    }),
    parseResult: (text) => text,
  },
]);
```

### 5.4 场景注册

```typescript
// server/ai/agent/scene-registry.ts
const scene: AgentSceneConfig = {
  id: 'scene_id',
  name: '场景名称',
  description: '场景描述',
  icon: 'icon-name',
  functionKey: 'outline_optimize',
  availableTools: ['tool1', 'tool2'],
  systemPrompt: `系统提示词...`,
};
```

### 5.5 AI 类型定义

- 共享类型放 `shared/ai/ai-action.ts`
- 服务端常量放 `server/ai/agent/constants.ts`
- UI 文本常量放 `shared/constants/agent-ui.ts`

---

## 六、布局规范

### 6.1 三栏布局结构

```
┌──────────┬─────────────────────┬──────────────┐
│ Activity │                     │              │
│   Bar    │    内容区            │   AI 面板    │
│  (56px)  │  (flexible, ≥400px) │ (280px, 可折)│
│          │                     │              │
└──────────┴─────────────────────┴──────────────┘
```

### 6.2 布局代码模板

```tsx
import { PanelContainer, PanelGroup, Panel, Divider } from "@/shared/ui/panel-container";

<div className={styles.container}>
  {/* Activity Bar */}
  <div className={styles.activityBar}>
    {/* 按钮列表 */}
    <div className={styles.activitySpacer} />
    <button onClick={toggleAi} aria-label="AI 助手">
      <RobotOutlined />
    </button>
  </div>

  {/* 内容区 + AI 面板 */}
  <PanelContainer>
    <PanelGroup direction="horizontal">
      <Panel flexible minSize={400}>
        {/* 主内容 */}
      </Panel>
      <Divider />
      <Panel
        title="AI 助手"
        defaultSize={280}
        minSize={240}
        maxSize={400}
        collapsible
        collapsed={!aiVisible}
        onToggleCollapse={toggleAi}
      >
        <AiAgentPanel />
      </Panel>
    </PanelGroup>
  </PanelContainer>
</div>
```

### 6.3 布局关键点

- `Panel flexible` 标记弹性面板，获得 `flex: 1`
- 面板折叠用 `collapsed` 属性，不要条件渲染（`{visible && ...}`）
- AI 面板状态通过 `AiContext` 管理
- 容器必须设置 `width: 100%; height: 100%`

---

## 七、工程规范

### 7.1 复用决策树

```
这段代码/组件是否可能在其他页面复用？
├─ 是 → 放 shared/
│   ├─ UI 组件 → shared/ui/
│   ├─ Hook → shared/hooks/
│   ├─ 类型 → shared/types/ 或 shared/ai/
│   └─ 工具函数 → shared/utils/
├─ 否 → 放页面目录
│   ├─ 页面级 Hook → pages/{page}/hooks/
│   ├─ 页面级组件 → pages/{page}/components/
│   └─ API 封装 → pages/{page}/api/
└─ 不确定 → 第一次直接写在页面内
    ├─ 第二次出现相似代码 → 考虑抽离
    └─ 第三次出现 → 必须抽离
```

### 7.2 依赖方向（单向，禁止反向）

```
shared/ ← app/pages/ ← 页面组件
   ↑           ↑
   └─── server/ (仅通过类型共享)
```

**禁止：**
- `shared/` 导入 `app/` 或 `server/`
- `app/pages/books/` 导入其他页面目录
- 循环依赖

### 7.3 代码复用示例

```typescript
// ❌ 错误：每个组件都写一遍 SSE 调用
function ComponentA() {
  const res = await fetch("/api/ai/chat", { ... });
  const reader = res.body?.getReader();
  // ... 50 行 SSE 解析逻辑
}

// ✅ 正确：使用共享 hook
function ComponentA() {
  const { run, loading } = useAiStream({ request: { ... } });
}
```

### 7.4 可维护性

```typescript
// ❌ 魔法数字
if (status === 3) { ... }

// ✅ 语义化常量
const STATUS_ACTIVE = 3;
if (status === STATUS_ACTIVE) { ... }

// ❌ 废话注释
// 设置状态
setState(value);

// ✅ 解释"为什么"
// 使用 ref 避免 useEffect 依赖频繁变化导致无限循环
const actionsRef = useRef(actions);
```

### 7.5 Props 设计

```typescript
// ❌ 过多 props
<Component title={t} onTitleChange={set} showHeader headerStyle onHeaderClick ... />

// ✅ 组合模式
<Panel title={t} onToggleCollapse={handle}>
  <PanelHeader style="bold" />
  <PanelBody>{children}</PanelBody>
</Panel>
```

---

## 八、Git 规范

### 8.1 提交格式

```
<type>(<scope>): <description>
```

| 类型 | 用途 |
|------|------|
| feat | 新功能 |
| fix | 修复 |
| refactor | 重构（不改变行为） |
| style | 样式调整 |
| docs | 文档 |
| test | 测试 |
| chore | 构建/工具 |

### 8.2 提交前验证

```bash
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint 检查
npm run build        # 构建验证
```

---

## 九、开发检查清单

修改或新建代码前，对照检查：

- [ ] **类型安全** — 没有 `any`，使用 `unknown` + 类型守卫
- [ ] **依赖方向** — shared/ 不依赖 app/ 或 server/
- [ ] **CSS 变量** — 颜色/间距/圆角使用 `var(--xxx)`
- [ ] **图标单色** — 使用 `var(--text-secondary)` 或 `var(--text-tertiary)`
- [ ] **参数校验** — API 入参前置校验
- [ ] **SQL 参数化** — 禁止字符串拼接 SQL
- [ ] **副作用清理** — useEffect 返回清理函数，AbortController 取消请求
- [ ] **组件拆分** — 超过 200 行考虑拆分
- [ ] **复用检查** — 是否有现成的 shared/ 组件/hook 可用
- [ ] **TypeScript 编译** — `npm run typecheck` 通过

---

## 十、参考文件

| 文件 | 用途 |
|------|------|
| [globals.css](app/globals.css) | 全局 CSS 变量 |
| [db.ts](server/storage/db.ts) | 数据库连接 + 表结构 |
| [ai-action.ts](shared/ai/ai-action.ts) | AI 操作类型定义 |
| [use-ai-stream.ts](shared/hooks/use-ai-stream.ts) | SSE 流式调用 hook |
| [panel-container](shared/ui/panel-container) | 面板布局组件 |
| [ai-context.tsx](app/pages/books/context/ai-context.tsx) | AI 上下文 |
| [workspace-panels.tsx](app/pages/books/config/workspace-panels.tsx) | 面板配置 |
| [api/utils.ts](app/api/utils.ts) | API 响应工具 |
| [docs/architecture.md](docs/architecture.md) | 架构设计文档 |
