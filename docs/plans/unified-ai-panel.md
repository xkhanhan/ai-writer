# 统一 AI 面板改造方案

> **For agentic workers:** Use implementation-dev skill to implement this plan task-by-task.

**Goal:** 将 AI 面板从创作区私有组件升级为 workspace 级别的统一共享组件，所有页面通过右侧面板使用 AI 能力，AI 面板可选开关。

**Architecture:**
- 共享层：`shared/ai/ai-action.ts` 定义 `AiAction` 类型（跨页面复用），`shared/hooks/use-ai-stream.ts` 提取 SSE 流式调用逻辑（防重复代码）
- 页面层：`app/pages/books/context/ai-context.tsx` 提供 Context + 注册机制，各页面通过 `useRegisterAiActions` 注册 AI 操作
- UI 层：`AiAssistantPanel` 纯 UI 组件，调用共享 hook；BookWorkspace 布局改为 `Activity Bar | 内容区 | AI 面板`
- 创作区的私有 AI 面板迁移为使用统一面板

**Tech Stack:** React Context, CSS Modules, PanelContainer/PanelGroup/Panel/Divider 公共组件, `/api/ai/chat` SSE 流式接口

**工程规范合规:**
- [x] 依赖方向：shared/ 不依赖 app/ 或 server/（`AiAction` 类型在 shared/ai/，仅引用 shared/types/）
- [x] 共享 hook 在 shared/hooks/（`useAiStream` 不依赖 app/pages/）
- [x] 共享 UI 组件在 shared/ui/ 或页面级（`AiAssistantPanel` 在页面级，仅 books 使用）
- [x] 文件行数：组件 < 200 行，Hook < 150 行
- [x] CSS 使用变量，禁止硬编码颜色
- [x] useEffect 有 cleanup（AbortController）

---

## 文件变更清单

### 新建文件（共享层 — 可被任何页面复用）
| 文件 | 职责 | 层级 |
|------|------|------|
| `shared/ai/ai-action.ts` | `AiAction` 类型定义 + `AiChatRequest` 请求类型 | shared（最底层） |
| `shared/hooks/use-ai-stream.ts` | SSE 流式调用 hook（fetch + reader + 解析） | shared（最底层） |

### 新建文件（页面层 — books 专属）
| 文件 | 职责 | 层级 |
|------|------|------|
| `app/pages/books/context/ai-context.tsx` | AiContext Provider + useRegisterAiActions hook | app/pages |
| `app/pages/books/components/ai-assistant-panel/index.tsx` | 统一 AI 面板组件（纯 UI，调用 useAiStream） | app/pages |
| `app/pages/books/components/ai-assistant-panel/index.module.css` | AI 面板样式 | app/pages |

### 修改文件
| 文件 | 变更 |
|------|------|
| `app/pages/books/index.tsx` | BookWorkspace 布局增加 AI 面板 + Activity Bar AI 按钮 |
| `app/pages/books/index.module.css` | AI 按钮样式 |
| `app/pages/books/config/workspace-panels.tsx` | 各页面 component 函数增加 registerAiActions 调用 |
| `app/pages/books/components/settings-library/index.tsx` | 移除 AiSceneModal，改为通过 context 注册 AI 操作 |
| `app/pages/books/components/world-rules/index.tsx` | 同上 |
| `app/pages/books/components/fact-library/index.tsx` | 同上 |
| `app/pages/books/components/creation-zone/index.tsx` | 移除私有 AI Panel，改为通过 context 注册 |
| `app/pages/books/components/creation-zone/components/ai-panel/` | 废弃（逻辑迁移到 ai-assistant-panel） |

---

## Task 1: 创建共享 AI 类型和流式 Hook

### 1a. 共享 AI 操作类型

**文件:** `shared/ai/ai-action.ts`

定义 `AiAction` 类型（AI 操作描述）和 `AiChatRequest`（请求体），放在 `shared/ai/` 与已有的 `contracts.ts` 并列。这是最底层，不依赖 app/ 或 server/。

```typescript
// shared/ai/ai-action.ts
/**
 * AI 操作定义 — 跨页面共享类型。
 * 放在 shared/ai/ 遵循架构规范：shared/ 是最底层，不依赖 app/ 或 server/。
 */

/** 后端支持的 AI 功能键（从 server/ai/context-builder/types.ts 复制，避免 shared→server 依赖） */
export type AiFunctionKey =
  | "content_generate"
  | "review_extract"
  | "polish"
  | "deslop"
  | "expand"
  | "character_audit"
  | "fact_consistency"
  | "book_synopsis_expand"
  | "book_info_suggest"
  | "world_rule_suggest"
  | "outline_optimize"
  | "volume_generate";

/** 单个 AI 操作定义 */
export interface AiAction {
  /** 操作唯一标识（格式："{page}.{功能}"，如 "settings.character_audit"） */
  id: string;
  /** 显示标题 */
  title: string;
  /** 描述文字 */
  description: string;
  /** 映射到 context-builder 的 functionKey */
  functionKey: AiFunctionKey;
  /** 额外参数传给 /api/ai/chat */
  extraParams?: Record<string, unknown>;
  /** 输入框标签（留空则不显示输入框） */
  inputLabel?: string;
  /** 输入框占位文字 */
  inputPlaceholder?: string;
  /** 结果模式：text 直接显示文本，json 需解析后结构化展示 */
  resultMode?: "text" | "json";
  /** 采纳回调，接收 AI 返回的原始文本或解析后的 JSON */
  onAdopt?: (result: string | unknown) => void | Promise<void>;
}

/** /api/ai/chat 请求体 */
export interface AiChatRequest {
  functionKey: AiFunctionKey;
  bookId: string;
  selectedText?: string;
  stream?: boolean;
  chapterId?: string;
  extraVariables?: Record<string, string>;
  [key: string]: unknown;
}
```

### 1b. 共享 SSE 流式调用 Hook

**文件:** `shared/hooks/use-ai-stream.ts`

提取 SSE 流式调用逻辑为共享 hook，任何组件（AiAssistantPanel、ContentEditor、ContentLibrary 等）都可复用，无需重复 fetch + reader + SSE 解析代码。

```typescript
// shared/hooks/use-ai-stream.ts
/**
 * useAiStream — 通用 SSE 流式 AI 调用 hook。
 *
 * 放在 shared/hooks/ 遵循工程规范：
 * - 不依赖 app/pages/ 下的任何模块
 * - 依赖 shared/ai/ai-action.ts（类型）和 shared/utils/（工具函数）
 * - 清理所有副作用（AbortController）
 */
"use client";

import { useState, useCallback, useRef } from "react";
import type { AiChatRequest } from "@/shared/ai/ai-action";
import { parseAiJson } from "@/shared/utils/parse-ai-json";

export interface UseAiStreamOptions {
  /** 请求体（不含 stream 字段，hook 自动添加） */
  request: Omit<AiChatRequest, "stream">;
  /** 是否解析 JSON 结果 */
  parseJson?: boolean;
  /** 流式回调，每次收到新内容时触发 */
  onChunk?: (accumulated: string) => void;
  /** 完成回调 */
  onComplete?: (result: string | unknown) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface UseAiStreamReturn {
  /** 是否正在加载 */
  loading: boolean;
  /** 流式累积的原始文本 */
  rawText: string;
  /** 最终结果（文本或解析后的 JSON） */
  result: unknown;
  /** 是否有结果 */
  hasResult: boolean;
  /** 发起 AI 调用 */
  run: () => Promise<void>;
  /** 中止当前调用 */
  abort: () => void;
  /** 重置状态 */
  reset: () => void;
}

export function useAiStream(options: UseAiStreamOptions): UseAiStreamReturn {
  const { request, parseJson = false, onChunk, onComplete, onError } = options;

  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setRawText("");
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = new Error(`AI 调用失败 (${res.status})`);
        onError?.(err);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              accumulated += parsed.content;
              setRawText(accumulated);
              onChunk?.(accumulated);
            }
          } catch { /* skip non-JSON lines */ }
        }
      }

      if (parseJson) {
        const parsed = parseAiJson(accumulated);
        setResult(parsed.ok ? parsed.data : accumulated);
        onComplete?.(parsed.ok ? parsed.data : accumulated);
      } else {
        setResult(accumulated);
        onComplete?.(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError?.(err instanceof Error ? err : new Error("AI 调用失败"));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [loading, request, parseJson, onChunk, onComplete, onError]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abort();
    setLoading(false);
    setRawText("");
    setResult(null);
  }, [abort]);

  return { loading, rawText, result, hasResult: result !== null, run, abort, reset };
}
```

**验证:** `npx tsc --noEmit` 通过。确认 shared/hooks/ 不依赖 app/ 或 server/。

---

## Task 2: 创建 AiContext + AiAssistantPanel

### 2a. AiContext（页面级 Context + 注册机制）

**文件:** `app/pages/books/context/ai-context.tsx`

仅包含 Context Provider 和注册逻辑，类型从 shared/ai/ 导入。

```tsx
// app/pages/books/context/ai-context.tsx
"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from "react";
import type { AiAction } from "@/shared/ai/ai-action";

/** AI Context 值 */
interface AiContextValue {
  /** 当前页面注册的 AI 操作列表 */
  actions: AiAction[];
  /** AI 面板是否可见 */
  visible: boolean;
  /** 切换 AI 面板可见性 */
  toggleVisible: () => void;
  /** bookId */
  bookId: string;
}

const AiContext = createContext<AiContextValue | null>(null);

export function useAiContext() {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAiContext must be used within AiProvider");
  return ctx;
}

// ─── 注册 hook ───

/**
 * 页面调用此 hook 注册当前可用的 AI 操作。
 * 组件卸载时自动清除。
 */
export function useRegisterAiActions(actions: AiAction[]) {
  const { setRegistration } = useAiRegistrationContext();
  const key = actions.length > 0 ? actions[0].id.split(".")[0] : "unknown";

  useEffect(() => {
    setRegistration(key, { actions });
    return () => setRegistration(key, null);
  }, [key, actions, setRegistration]);
}

// ─── 内部 Registration Context ───

interface Registration { actions: AiAction[] }

const AiRegistrationContext = createContext<{
  setRegistration: (key: string, reg: Registration | null) => void;
} | null>(null);

function useAiRegistrationContext() {
  const ctx = useContext(AiRegistrationContext);
  if (!ctx) throw new Error("useRegisterAiActions must be used within AiProvider");
  return ctx;
}

// ─── Provider ───

export function AiProvider({ bookId, children }: { bookId: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [registrations, setRegistrations] = useState<Record<string, Registration>>({});

  const toggleVisible = useCallback(() => setVisible((v) => !v), []);

  const setRegistration = useCallback((key: string, reg: Registration | null) => {
    setRegistrations((prev) => {
      if (reg === null) { const { [key]: _, ...rest } = prev; return rest; }
      return { ...prev, [key]: reg };
    });
  }, []);

  const allActions = Object.values(registrations).flatMap((r) => r.actions);

  return (
    <AiRegistrationContext.Provider value={{ setRegistration }}>
      <AiContext.Provider value={{ actions: allActions, visible, toggleVisible, bookId }}>
        {children}
      </AiContext.Provider>
    </AiRegistrationContext.Provider>
  );
}
```

### 2b. AiAssistantPanel（纯 UI，调用 useAiStream）

**文件:** `app/pages/books/components/ai-assistant-panel/index.tsx` + `index.module.css`

纯 UI 组件，通过 `useAiContext` 获取 actions，通过 `useAiStream` 执行 AI 调用。

```tsx
// app/pages/books/components/ai-assistant-panel/index.tsx
"use client";

import { useState, useCallback } from "react";
import { Spin, Button, message } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { useAiContext } from "../../context/ai-context";
import { useAiStream } from "@/shared/hooks/use-ai-stream";
import type { AiAction } from "@/shared/ai/ai-action";
import styles from "./index.module.css";

export function AiAssistantPanel() {
  const { actions, bookId } = useAiContext();
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const [userInput, setUserInput] = useState("");

  const stream = useAiStream({
    request: {
      functionKey: activeAction?.functionKey ?? "polish",
      bookId,
      selectedText: userInput,
      ...activeAction?.extraParams,
    },
    parseJson: activeAction?.resultMode === "json",
    onComplete: () => {},
    onError: (err) => message.error(err.message),
  });

  const handleRun = useCallback((action: AiAction, input?: string) => {
    setActiveAction(action);
    setUserInput(input ?? "");
    // 需要延迟一步让 state 更新后再调用 stream.run()
    // 改用直接传参的方式
    stream.reset();
    setTimeout(() => stream.run(), 0);
  }, [stream]);

  const handleAdopt = useCallback(async () => {
    if (!activeAction || !stream.hasResult) return;
    try {
      await activeAction.onAdopt?.(stream.result);
      message.success("已采纳");
      stream.reset();
      setActiveAction(null);
    } catch { message.error("采纳失败"); }
  }, [activeAction, stream]);

  // ─── 空状态 ───
  if (actions.length === 0) {
    return (
      <div className={styles.emptyHint}>
        <div className={styles.emptyIcon}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 4l3 7.5L27 14l-5.5 5 1.5 8L16 22.5 9 27l1.5-8L5 14l8-2.5L16 4z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.25" />
          </svg>
        </div>
        <div className={styles.emptyTitle}>AI 写作助手</div>
        <div className={styles.emptyDesc}>当前页面暂无可用的 AI 功能</div>
      </div>
    );
  }

  // ─── 结果视图 ───
  if (activeAction && (stream.hasResult || stream.rawText)) {
    return (
      <div className={styles.body}>
        <div className={styles.resultHeader}>{activeAction.title}</div>
        {stream.loading && stream.rawText && <div className={styles.rawOutput}>{stream.rawText}</div>}
        {!stream.loading && stream.hasResult && (
          <div className={styles.resultCard}>
            <pre className={styles.resultPre}>
              {typeof stream.result === "string" ? stream.result : JSON.stringify(stream.result, null, 2)}
            </pre>
            {activeAction.onAdopt && (
              <div className={styles.resultActions}>
                <Button type="primary" size="small" onClick={handleAdopt}>采纳</Button>
                <Button size="small" onClick={() => { stream.reset(); setActiveAction(null); }}>放弃</Button>
                <Button size="small" onClick={() => stream.run()}>重新生成</Button>
              </div>
            )}
          </div>
        )}
        {stream.loading && !stream.rawText && (
          <div className={styles.loadingState}><Spin size="small" /><span>生成中...</span></div>
        )}
      </div>
    );
  }

  // ─── 操作列表 ───
  return (
    <div className={styles.body}>
      {actions.map((action) => (
        <div key={action.id}>
          <div className={styles.actionCard} onClick={() => handleRun(action)}>
            <div>
              <div className={styles.actionTitle}>{action.title}</div>
              <div className={styles.actionDesc}>{action.description}</div>
            </div>
          </div>
          {activeAction?.id === action.id && action.inputLabel && (
            <div className={styles.inputArea}>
              <div className={styles.inputLabel}>{action.inputLabel}</div>
              <textarea className={styles.inputTextarea} value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={action.inputPlaceholder || ""} rows={3} />
              <Button type="primary" size="small" icon={<ThunderboltOutlined />}
                loading={stream.loading} onClick={() => stream.run()}>生成</Button>
              <Button size="small" onClick={() => { stream.reset(); setActiveAction(null); }}>取消</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**CSS 文件:** 复用 `creation-zone/components/ai-panel/index.module.css` 设计语言，增加 inputArea、inputTextarea、resultHeader、resultPre 样式。

**验证:** `npx tsc --noEmit` 通过。

---

## Task 3: 重构 BookWorkspace 布局

**文件:**
- `app/pages/books/index.tsx`
- `app/pages/books/index.module.css`

将 BookWorkspace 的布局从 `Activity Bar | 内容区` 改为 `Activity Bar | 内容区 | AI 面板`。

### 3a. 修改 index.tsx

```tsx
// app/pages/books/index.tsx
"use client";

import { RobotOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { Book } from "@/app/types";
import { workspacePanels } from "./config/workspace-panels";
import { useWorkspacePersist } from "./hooks/use-workspace-persist";
import { AiProvider, useAiContext } from "./context/ai-context";
import { AiAssistantPanel } from "./components/ai-assistant-panel";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import styles from "./index.module.css";

interface BookWorkspaceProps {
  book: Book;
  onBack: () => void;
}

export default function BookWorkspace({ book, onBack }: BookWorkspaceProps) {
  return (
    <AiProvider bookId={book.id}>
      <BookWorkspaceInner book={book} onBack={onBack} />
    </AiProvider>
  );
}

function BookWorkspaceInner({ book, onBack }: BookWorkspaceProps) {
  const {
    activePanel,
    setActivePanel,
    panelSelections,
    setPanelSelection,
  } = useWorkspacePersist(book.id);

  const { visible: aiVisible, toggleVisible: toggleAi } = useAiContext();

  return (
    <div className={styles.container}>
      {/* Activity Bar */}
      <div className={styles.activityBar}>
        {workspacePanels.map((panel) => (
          <button
            key={panel.key}
            className={`${styles.activityButton} ${styles.activityTooltip} ${
              activePanel === panel.key ? styles.activityButtonActive : ""
            }`}
            data-tooltip={panel.title}
            aria-label={panel.title}
            onClick={() => setActivePanel(panel.key)}
          >
            {panel.icon}
          </button>
        ))}
        <div className={styles.activitySpacer} />
        {/* AI 面板切换按钮 */}
        <button
          className={`${styles.activityButton} ${styles.activityTooltip} ${
            aiVisible ? styles.activityButtonActive : ""
          }`}
          data-tooltip="AI 助手"
          aria-label="AI 助手"
          onClick={toggleAi}
        >
          <RobotOutlined />
        </button>
        <button
          className={`${styles.activityButton} ${styles.activityTooltip}`}
          data-tooltip="返回"
          aria-label="返回"
          onClick={onBack}
        >
          <ArrowLeftOutlined />
        </button>
      </div>

      {/* 内容区 + AI 面板 */}
      <PanelContainer>
        <PanelGroup direction="horizontal">
          {/* 内容区 */}
          <div className={styles.contentArea}>
            <div className={styles.contentBody}>
              {workspacePanels.map((panel) => {
                if (activePanel !== panel.key) return null;
                return (
                  <div key={panel.key} className={styles.panelWrapper}>
                    {panel.component({
                      book,
                      activeId: panelSelections[panel.key],
                      onActiveChange: (id: string) =>
                        setPanelSelection(panel.key, id),
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {/* AI 面板 */}
          {aiVisible && (
            <>
              <Divider />
              <Panel
                title="AI 助手"
                defaultSize={280}
                minSize={240}
                maxSize={400}
                collapsible
                collapsed={!aiVisible}
              >
                <AiAssistantPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </PanelContainer>
    </div>
  );
}
```

### 3b. 修改 index.module.css

添加 AI 按钮样式（复用现有 activityButton 模式），无需新增复杂样式。

**验证:** `npx tsc --noEmit` 通过。手动验证 Activity Bar 显示 AI 按钮，点击可切换右侧面板。

---

## Task 4: 迁移各页面 AI 操作注册

修改以下页面，移除各自的 AiSceneModal，改为通过 `useRegisterAiActions` 注册 AI 操作：

### 4a. 设定库 (`settings-library/index.tsx`)

移除：
- `useState` for `aiOpen`
- `AiSceneModal` 组件
- `getSettingsLibraryScenes` 导入

新增：
```tsx
import { useRegisterAiActions } from "../../context/ai-context";

// 在组件内部
useRegisterAiActions([{
  id: "settings.character_audit",
  title: "角色一致性检查",
  description: "检查角色设定的前后一致性",
  functionKey: "character_audit",
  inputLabel: "描述要检查的角色或关注点",
  inputPlaceholder: "例如：检查主角的能力设定是否前后一致...",
  resultMode: "text",
}]);
```

### 4b. 世界规则 (`world-rules/index.tsx`)

移除 AiSceneModal，注册：
```tsx
useRegisterAiActions([{
  id: "world-rules.suggest",
  title: "AI 生成世界规则",
  description: "根据世界观设定自动生成规则",
  functionKey: "world_rule_suggest",
  inputLabel: "描述你的世界观设定",
  inputPlaceholder: "例如：修仙世界，分为凡人界和仙界...",
  resultMode: "json",
  onAdopt: async (result) => {
    await handleAiSave(result as Record<string, { name: string; content: string }[]>);
  },
}]);
```

### 4c. 事实库 (`fact-library/index.tsx`)

移除 AiSceneModal（如果有的话），注册：
```tsx
useRegisterAiActions([{
  id: "fact-library.consistency",
  title: "AI 事实一致性检查",
  description: "检查所有事实记录的一致性",
  functionKey: "fact_consistency",
  inputLabel: "描述要检查的范围或关注点",
  inputPlaceholder: "例如：检查第3章到第5章的设定是否一致...",
  resultMode: "text",
}]);
```

### 4d. 创作区 (`creation-zone/index.tsx`)

移除私有 AI Panel 相关状态和组件，改为通过 context 注册：
```tsx
import { useRegisterAiActions } from "../../context/ai-context";

// 在组件内部，根据当前 view.type 动态注册
const aiActions: AiAction[] = [];

if (view.type === "outline") {
  aiActions.push({
    id: "creation.outline_optimize",
    title: "优化总纲",
    description: "诊断并优化方向、阶段、卖点",
    functionKey: "outline_optimize",
    extraVariables: { /* outline data */ },
    resultMode: "json",
    onAdopt: async (result) => { /* save outline */ },
  });
}

if (view.type === "content-editor") {
  aiActions.push(
    { id: "creation.generate", title: "生成正文", ... },
    { id: "creation.polish", title: "润色", ... },
    { id: "creation.deslop", title: "去AI味", ... },
  );
}

useRegisterAiActions(aiActions);
```

同时移除：
- `AiPanel` 组件的导入和使用
- `logOpen`, `sysLogOpen`, `logRefreshKey` 状态
- 面板布局从三栏恢复为两栏（大纲 | 内容区），AI 由 workspace 层级提供

### 4e. 其他页面

以下页面目前无 AI 功能，暂时不需要注册：
- 标签库 (`tag-library`)
- 伏笔库 (`foreshadow-library`)
- 日志 (`log-library`)
- 书籍信息 (`book-info-form`) — 已有 AiSceneModal，可后续迁移

**验证:** `npx tsc --noEmit` 通过。每个页面的 AI 功能通过右侧面板可用。

---

## Task 5: 清理废弃代码

移除不再需要的文件和代码：
- `creation-zone/components/ai-panel/` — 逻辑已迁移到统一面板
- `creation-zone/components/ai-log-drawer/` — 日志功能可后续在统一面板中添加
- `creation-zone/components/system-log-drawer/` — 同上
- `shared/ui/ai-scene-modal/` — 保留（书籍信息页面仍在使用，后续再迁移）

**验证:** `npx tsc --noEmit` + `npm run build` 通过。

---

## 迁移优先级

1. **Task 1-3** — 基础设施（必须先完成）
2. **Task 4a** — 设定库迁移（最简单的页面，用于验证方案）
3. **Task 4b** — 世界规则迁移
4. **Task 4c** — 事实库迁移
5. **Task 4d** — 创作区迁移（最复杂，最后处理）
6. **Task 5** — 清理

## 注意事项

- 创作区面板顺序调整后需确认大纲拖拽、内容区 flex 仍然正常
- AI 面板的 `visible` 状态应在切换 Tab 时保持不变
- 各页面的 `useRegisterAiActions` 要在 useEffect 中注册，确保 cleanup 正确
- `AiProvider` 包裹在 `BookWorkspace` 层级，所有 Tab 共享同一个 Provider
