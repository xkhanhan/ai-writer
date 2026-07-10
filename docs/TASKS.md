# Task Board

> **只读参考**：此文件列出所有待做任务。认领通过 `.\scripts\claim-task.ps1` 完成，不要直接编辑此文件。
> 最后更新：2026-07-10

---

## 认领协议

**使用脚本认领，不要手动编辑此文件。**

```powershell
.\scripts\claim-task.ps1 claim <TASK-ID> <YOUR-NAME>   # 认领（原子锁，防竞态）
.\scripts\claim-task.ps1 status                         # 查看所有认领状态
.\scripts\claim-task.ps1 done <TASK-ID>                 # 标记完成
.\scripts\claim-task.ps1 clear <TASK-ID>                # 释放认领
```

详细流程见 `.claude/CLAUDE.md` → Multi-Agent Coordination Protocol。

---

## 治理遗留

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| G-001 | API 响应格式统一：统一 jsonSuccess/jsonError，消除本地重定义 | pending | none | P1 | `app/api/utils.ts`, `app/api/*/route.ts` | — |
| G-002 | 验证逻辑下沉到 store：路由层验证移到 store 函数 | pending | none | P1 | `app/api/*/route.ts`, `server/storage/*-store.ts` | — |
| G-003 | JS 时间戳 → SQL datetime：book-store, folder-file-store | pending | none | P1 | `server/storage/book-store.ts`, `server/storage/folder-file-store.ts` | — |
| G-004 | CSS 硬编码清理：rgba、fallback 色值对齐 token | pending | none | P2 | `app/**/*.module.css` | — |
| G-005 | PanelGroup 性能优化：memoization + Divider 检测 | pending | none | P2 | `shared/ui/panel-container/panel-group.tsx`, `shared/ui/panel-container/divider.tsx` | — |

---

## AI 核心循环 — 阶段 A（最小闭环）

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| A-001 | /api/ai/chat 扩展上下文参数：接收 bookId/chapterId/functionKey，调用 ContextBuilder | pending | none | P0 | `app/api/ai/chat/route.ts`, `server/ai/context-builder.ts` | — |
| A-002 | ContentEditor "生成内容" 按钮接通：从 message.info 改为真正调 AI | pending | none | P0 | `app/pages/books/components/creation-zone/components/content-editor/index.tsx` | A-001 |
| A-003 | 内嵌结果面板组件：加载态 → 结果展示 → 采纳/放弃 | pending | none | P0 | `app/pages/books/components/creation-zone/components/ai-result-panel/` | A-001 |
| A-004 | GenerationSession 记录：每次生成记录到 ai_generation_sessions | pending | none | P0 | `app/api/ai/chat/route.ts`, `server/storage/ai-generation-store.ts` | A-001 |

---

## AI 核心循环 — 阶段 B（完整闭环）

### 提示词库

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| B-001 | 提示词库 UI：列表+编辑+变量说明，一级 Tab 按场景分类 | pending | none | P1 | `app/pages/books/components/prompt-library/` | Phase 0 |
| B-002 | 变量检查能力：验证 $变量 是否能正确替换 | pending | none | P1 | `app/pages/books/components/prompt-library/` | B-001 |
| B-003 | 测试能力：发送测试数据，查看 AI 输出 | pending | none | P1 | `app/pages/books/components/prompt-library/` | B-001 |

### AI 面板

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| B-004 | AI 面板 UI：PanelContainer Tab 右侧可折叠 AI 助手面板 | pending | none | P1 | `shared/ui/panel-container/`, `app/pages/books/` | PanelContainer Phase 2 |
| B-005 | 上下文感知（useAIContext hook）：监听自定义事件，自动收集当前面板+选中项 | pending | none | P1 | `app/pages/books/hooks/` | B-004 |
| B-006 | 对话功能（useChat + 流式响应）：流式对话，感知上下文 | pending | none | P1 | `app/pages/books/hooks/`, `app/api/ai/chat/route.ts` | B-004, B-005 |

### 过审流水线

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| B-007 | 过审 ContextBuilder：一次性提取事实/伏笔/角色状态 | pending | none | P0 | `server/ai/context-builder.ts` | Phase 0 |
| B-008 | 过审结果结构化 JSON | pending | none | P0 | `server/ai/generate-ai-text-stream.ts` | B-007 |
| B-009 | 过审结果 UI（批量确认）：一次展示所有提取结果，用户勾选确认 | pending | none | P0 | `app/pages/books/components/review-result-panel/` | B-008 |
| B-010 | 数据落库（事实/伏笔/角色状态）：确认后写入对应数据库 | pending | none | P0 | `app/api/ai/review/route.ts`, `server/storage/` | B-009 |

### 文本处理

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| B-011 | 润色/去AI味/扩写接通：正文库 AI 按钮接通 | pending | none | P1 | `app/pages/books/components/content-library/` | Phase 0 |
| B-012 | AI 检查角色：角色设定+规则+事实 → 问题列表 | pending | none | P1 | `app/pages/books/components/settings-library/` | Phase 0 |
| B-013 | 事实一致性检查：全量事实+规则 → 矛盾列表 | pending | none | P1 | `app/pages/books/components/fact-library/` | Phase 0 |

---

## AI 面板能力扩展

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| P-001 | 过审落库：ReviewResultPanel 确认后写入事实库/伏笔库/设定库 | pending | none | P0 | `app/pages/books/components/review-result-panel/`, `app/api/ai/review/route.ts` | B-009, B-010 |
| P-002 | 伏笔库后端持久化：foreshadows 表 + API + Store | pending | none | P0 | `server/storage/foreshadow-store.ts`, `app/api/books/[id]/foreshadows/`, `app/pages/books/components/foreshadow-library/` | — |
| P-003 | 设定库角色一致性检查：接入 character_audit | pending | none | P1 | `app/pages/books/components/settings-library/` | B-012 |
| P-004 | 事实库事实一致性检查：接入 fact_consistency | pending | none | P1 | `app/pages/books/components/fact-library/` | B-013 |
| P-005 | 正文库 AI 按钮接通：润色/去AI味/扩写 | pending | none | P1 | `app/pages/books/components/content-library/` | B-011 |
| P-006 | 书籍简介扩写：接入 book_synopsis_expand | pending | none | P2 | `app/pages/books/components/book-info-form/` | — |
| P-007 | 世界规则 AI 建议：新增 world_rule_suggest | pending | none | P2 | `app/pages/books/components/world-rules/`, `server/ai/context-builder.ts` | — |
| P-008 | 标签库 AI 自动打标 | pending | none | P3 | `app/pages/books/components/tag-library/` | P-003 |

---

## 创作区增强

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| C-001 | 卷纲工作台：关联统计仪表盘（角色/伏笔/事实统计） | pending | none | P2 | `app/pages/books/components/creation-zone/components/volume-view/` | — |
| C-002 | 章纲自定义开头/结尾 | pending | none | P2 | `app/pages/books/components/creation-zone/components/chapter-form/` | — |
| C-003 | 章纲 → AI 快速生成建议 | pending | none | P2 | `app/pages/books/components/creation-zone/` | A-001 |
| C-004 | 回退机制 Phase 1：标记+重新过审 | pending | none | P2 | `app/pages/books/components/creation-zone/` | B-009 |

---

## PanelContainer 增强

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| PC-001 | Phase 2: Tab 支持 | pending | none | P1 | `shared/ui/panel-container/` | — |
| PC-002 | 消费者标准化（标题/搜索/操作栏统一） | pending | none | P1 | `app/pages/books/components/*/` | PC-001 |
| PC-003 | 布局持久化（localStorage） | pending | none | P2 | `shared/ui/panel-container/` | — |
| PC-004 | Phase 4: 嵌套拆分（创作区垂直 PanelGroup） | pending | none | P2 | `shared/ui/panel-container/` | PC-001 |

---

## UI 优化

| ID | Task | Status | Owner | Priority | Files | Depends |
|----|------|--------|-------|----------|-------|---------|
| UI-001 | 右侧面板视觉重新设计 | pending | none | P2 | `app/pages/books/components/*/index.module.css` | — |
| UI-002 | 设定库人物卡片展示优化 | pending | none | P2 | `app/pages/books/components/settings-library/` | — |
| UI-003 | 左侧面板交互反馈（hover/active） | pending | none | P3 | `app/pages/books/components/*/index.module.css` | — |
| UI-004 | 搜索栏样式统一 | pending | none | P3 | `app/pages/books/components/*/index.module.css` | — |
| UI-005 | 深色主题适配检查 | pending | none | P3 | `app/**/*.module.css`, `app/globals.css` | — |
| UI-006 | 响应式布局小屏幕适配 | pending | none | P3 | `app/**/*.module.css` | — |
