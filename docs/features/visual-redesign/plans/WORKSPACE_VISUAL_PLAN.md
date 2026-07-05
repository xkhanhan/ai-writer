# 书籍工作区前端视觉改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对书籍创作工作区进行全面视觉改造，建立「东方水墨风格」设计体系，重构 7 个面板 + 全局交互规范。

**Architecture:** 在 `shared/ui/` 创建可复用组件（AiDropdown、EmptyState、ConfirmDelete），更新全局 CSS 变量，逐步重构各面板组件。面板从 5 个扩展到 7 个（新增标签库、伏笔库）。

**Tech Stack:** Next.js, React, TypeScript, Ant Design v6.5.0, CSS Modules

**Design Spec:** `docs/superpowers/specs/2026-07-04-workspace-visual-redesign.md`

---

## 文件结构总览

### 新建文件

```
shared/ui/ai-dropdown/index.tsx          — AI 下拉按钮组件
shared/ui/ai-dropdown/index.module.css
shared/ui/empty-state/index.tsx          — 空状态统一组件
shared/ui/empty-state/index.module.css
shared/ui/confirm-delete/index.tsx       — 删除确认弹窗工具函数
shared/ui/save-button/index.tsx          — 保存按钮组件
shared/ui/save-button/index.module.css
shared/ui/array-input/index.tsx          — 数组输入组件（添加/删除标签项）
shared/ui/array-input/index.module.css
app/pages/books/components/tag-library/index.tsx       — 标签库面板
app/pages/books/components/tag-library/index.module.css
app/pages/books/components/foreshadow-library/index.tsx — 伏笔库面板
app/pages/books/components/foreshadow-library/index.module.css
app/pages/books/components/content-library/index.tsx    — 正文库面板（重写 ArchiveView）
app/pages/books/components/content-library/index.module.css
```

### 修改文件

```
app/globals.css                          — 补充缺失的语义变量
app/types/index.ts                       — ActivePanel 扩展 + 新类型
app/pages/books/index.tsx                — 面板渲染适配 7 个
app/pages/books/config/workspace-panels.tsx — 7 个面板配置
app/pages/books/components/book-info-form/index.tsx     — 重构字段
app/pages/books/components/book-info-form/index.module.css
app/pages/books/components/world-rules/index.tsx        — 新建（替代 FolderFileEditor）
app/pages/books/components/world-rules/index.module.css
app/pages/books/components/settings-library/index.tsx   — 新建（替代 FolderFileEditor）
app/pages/books/components/settings-library/index.module.css
app/pages/books/components/creation-zone/index.tsx       — 重构：去掉 view 模式
app/pages/books/components/creation-zone/index.module.css
app/pages/books/components/creation-zone/components/outline-editor/index.tsx — 加保存按钮
app/pages/books/components/creation-zone/components/volume-form/index.tsx    — 加阶段划分
app/pages/books/components/creation-zone/components/chapter-form/index.tsx   — 字段重排+折叠
app/pages/books/components/creation-zone/components/content-editor/index.tsx — AI 下拉+保存+过审
app/pages/books/components/creation-zone/components/navigation-tree/index.tsx — 适配新面板
```

---

## Task 1: 类型定义 + 全局 CSS 变量

**Files:**
- Modify: `app/types/index.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: 扩展 ActivePanel 类型**

在 `app/types/index.ts` 中，将 `ActivePanel` 从 5 个扩展到 7 个：

```typescript
export type ActivePanel = "info" | "world-rules" | "settings" | "tag-library" | "creation" | "foreshadow" | "archive";
```

新增创作区相关类型：

```typescript
// 章纲状态 — 系统维护
export type ChapterStatus = "draft" | "generated" | "approved";

// 伏笔状态
export type ForeshadowStatus = "hidden" | "revealed";

// 伏笔
export interface Foreshadow {
  id: string;
  bookId: string;
  name: string;
  description: string;
  status: ForeshadowStatus;
  chapterId?: string;
  chapterNumber?: number;
  volumeId?: string;
  createdAt: string;
  updatedAt: string;
}

// 标签
export interface TagCategory {
  id: string;
  bookId: string;
  name: string;
  parentId?: string;
  description?: string;
  children?: TagCategory[];
}

// 世界规则
export interface WorldRule {
  id: string;
  bookId: string;
  name: string;
  level: "core" | "important" | "general";
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 设定库实体
export type SettingCategory = "character" | "item" | "location" | "faction" | "other";

export interface SettingEntity {
  id: string;
  bookId: string;
  category: SettingCategory;
  name: string;
  gender?: string;
  personality?: string;
  traits?: string;
  tags?: string[];
  description?: string;
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: 补充 CSS 变量**

在 `app/globals.css` 末尾（向后兼容别名之后）补充：

```css
/* 折叠区 */
--collapse-bg: #fafaf6;
--collapse-border: #e0e2eb;
--collapse-header-color: #414753;

/* Tag 颜色 */
--tag-core-bg: #2F5D50;
--tag-core-color: #ffffff;
--tag-important-bg: #964400;
--tag-important-color: #ffffff;
--tag-general-bg: #e0e2eb;
--tag-general-color: #414753;

/* 状态筛选按钮 */
--filter-active-bg: var(--color-primary);
--filter-active-color: #ffffff;
--filter-inactive-bg: #ffffff;
--filter-inactive-color: #555555;
--filter-inactive-border: #e0e2eb;
```

- [ ] **Step 3: 验证**

Run: `npm run typecheck && npm run lint`
Expected: PASS（无新增错误）

- [ ] **Step 4: 提交**

```bash
git add app/types/index.ts app/globals.css
git commit -m "chore(types): extend ActivePanel and add new type definitions for workspace redesign"
```

---

## Task 2: 共享 UI 组件

**Files:**
- Create: `shared/ui/ai-dropdown/index.tsx` + `index.module.css`
- Create: `shared/ui/empty-state/index.tsx` + `index.module.css`
- Create: `shared/ui/confirm-delete/index.tsx`
- Create: `shared/ui/save-button/index.tsx` + `index.module.css`
- Create: `shared/ui/array-input/index.tsx` + `index.module.css`

- [ ] **Step 1: 创建 AiDropdown 组件**

`shared/ui/ai-dropdown/index.tsx`:

```tsx
"use client";

import React from "react";
import { Dropdown, type MenuProps } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

export interface AiDropdownMenuItem {
  key: string;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface AiDropdownProps {
  items: AiDropdownMenuItem[];
  disabled?: boolean;
}

export function AiDropdown({ items, disabled }: AiDropdownProps) {
  const menuItems: MenuProps["items"] = items.map((item) => ({
    key: item.key,
    label: (
      <span className={item.disabled ? styles.menuItemDisabled : styles.menuItem}>
        {item.label}
      </span>
    ),
    disabled: item.disabled,
    onClick: item.onClick,
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} disabled={disabled}>
      <button className={styles.trigger}>
        <ThunderboltOutlined />
        <span>AI</span>
        <span className={styles.arrow}>▾</span>
      </button>
    </Dropdown>
  );
}
```

`shared/ui/ai-dropdown/index.module.css`:

```css
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-primary);
  background: white;
  cursor: pointer;
  font-family: var(--font-body);
}
.trigger:hover {
  background: rgba(47, 93, 80, 0.05);
}
.arrow {
  font-size: 10px;
  margin-left: 2px;
}
.menuItem {
  font-size: 12px;
}
.menuItemDisabled {
  font-size: 12px;
  color: #ccc;
}
```

- [ ] **Step 2: 创建 EmptyState 组件**

`shared/ui/empty-state/index.tsx`:

```tsx
"use client";

import React from "react";
import styles from "./index.module.css";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
```

`shared/ui/empty-state/index.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 200px;
}
.icon {
  color: #c1c6d5;
  margin-bottom: 12px;
}
.icon :global(svg) {
  width: 40px;
  height: 40px;
  stroke-width: 1;
}
.title {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.description {
  font-size: 12px;
  color: #b5b9c6;
}
.action {
  margin-top: 12px;
}
.action button,
.action a {
  padding: 6px 18px;
  border: 1px dashed var(--color-primary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}
```

- [ ] **Step 3: 创建 ConfirmDelete 工具函数**

`shared/ui/confirm-delete/index.tsx`:

```tsx
import { Modal } from "antd";

export function confirmDelete(name: string, onOk: () => void | Promise<void>) {
  Modal.confirm({
    title: "确认删除",
    content: (
      <span>
        确定要删除「<strong>{name}</strong>」吗？此操作不可撤销。
      </span>
    ),
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk,
  });
}
```

- [ ] **Step 4: 创建 SaveButton 组件**

`shared/ui/save-button/index.tsx`:

```tsx
"use client";

import React from "react";
import { SaveOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

interface SaveButtonProps {
  onClick?: () => void;
  loading?: boolean;
}

export function SaveButton({ onClick, loading }: SaveButtonProps) {
  return (
    <button className={styles.button} onClick={onClick} disabled={loading}>
      <SaveOutlined />
      <span>{loading ? "保存中…" : "保存"}</span>
    </button>
  );
}
```

`shared/ui/save-button/index.module.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-primary);
  background: white;
  cursor: pointer;
  font-family: var(--font-body);
}
.button:hover {
  background: rgba(47, 93, 80, 0.05);
}
.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 5: 创建 ArrayInput 组件**

`shared/ui/array-input/index.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

interface ArrayInputProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function ArrayInput({ value = [], onChange, placeholder, maxItems }: ArrayInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (maxItems && value.length >= maxItems) return;
    onChange?.([...value, trimmed]);
    setInputValue("");
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange?.(next);
  };

  return (
    <div className={styles.container}>
      <div className={styles.tags}>
        {value.map((item, index) => (
          <span key={index} className={styles.tag}>
            {item}
            <CloseOutlined className={styles.tagClose} onClick={() => handleRemove(index)} />
          </span>
        ))}
      </div>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={placeholder || "输入后回车添加"}
        />
        <button className={styles.addButton} onClick={handleAdd} type="button">
          <PlusOutlined />
        </button>
      </div>
    </div>
  );
}
```

`shared/ui/array-input/index.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 12px;
  color: var(--text-primary);
}
.tagClose {
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
}
.tagClose:hover {
  color: var(--color-danger);
}
.inputRow {
  display: flex;
  gap: 4px;
}
.input {
  flex: 1;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  font-family: var(--font-body);
  outline: none;
}
.input:focus {
  border-color: var(--color-primary);
}
.addButton {
  width: 28px;
  height: 28px;
  border: 1px dashed var(--color-primary);
  border-radius: 4px;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 6: 验证**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add shared/ui/
git commit -m "feat(ui): add shared components (AiDropdown, EmptyState, ConfirmDelete, SaveButton, ArrayInput)"
```

---

## Task 3: 面板配置 + ActivityBar 更新

**Files:**
- Modify: `app/pages/books/config/workspace-panels.tsx`
- Modify: `app/pages/books/index.tsx`
- Modify: `app/pages/books/index.module.css`

- [ ] **Step 1: 更新面板配置**

重写 `app/pages/books/config/workspace-panels.tsx`，配置 7 个面板：

```tsx
import React from "react";
import {
  ReadOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  TagsOutlined,
  EditOutlined,
  PushpinOutlined,
  BookOutlined,
} from "@ant-design/icons";
import type { Book } from "@/app/types";

export interface WorkspacePanel {
  key: "info" | "world-rules" | "settings" | "tag-library" | "creation" | "foreshadow" | "archive";
  title: string;
  icon: React.ReactNode;
  component: (book: Book) => React.ReactNode;
}

export const workspacePanels: WorkspacePanel[] = [
  { key: "info", title: "书籍信息", icon: <ReadOutlined />, component: (book) => <div>书籍信息</div> },
  { key: "world-rules", title: "世界规则", icon: <AppstoreOutlined />, component: (book) => <div>世界规则</div> },
  { key: "settings", title: "设定库", icon: <FileTextOutlined />, component: (book) => <div>设定库</div> },
  { key: "tag-library", title: "标签库", icon: <TagsOutlined />, component: (book) => <div>标签库</div> },
  { key: "creation", title: "创作区", icon: <EditOutlined />, component: (book) => <div>创作区</div> },
  { key: "foreshadow", title: "伏笔库", icon: <PushpinOutlined />, component: (book) => <div>伏笔库</div> },
  { key: "archive", title: "正文库", icon: <BookOutlined />, component: (book) => <div>正文库</div> },
];
```

注意：各面板 component 占位为 `<div>`，后续 Task 逐步替换为真实组件。

- [ ] **Step 2: 更新 ActivePanel 默认值**

在 `app/pages/books/index.tsx` 中，确保默认面板为 `"info"`（已正确），确认 `activePanel` 类型与新的 `ActivePanel` 匹配。由于占位组件都是 `<div>`，面板切换应该正常工作。

- [ ] **Step 3: 验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS（7 个面板图标可见，切换正常）

- [ ] **Step 4: 提交**

```bash
git add app/pages/books/config/workspace-panels.tsx app/pages/books/index.tsx
git commit -m "feat(workspace): expand ActivityBar from 5 to 7 panels with new icons"
```

---

## Task 4: 书籍信息面板重构

**Files:**
- Modify: `app/pages/books/components/book-info-form/index.tsx`
- Modify: `app/pages/books/components/book-info-form/index.module.css`
- Modify: `app/pages/books/config/workspace-panels.tsx`（替换占位）

- [ ] **Step 1: 重构表单字段**

按照设计文档重构 `BookInfoForm`，使用 12 个字段：

```tsx
// 字段布局
// 第1行：书名（全宽）
// 第2行：题材 + 子题材（各50%）
// 第3行：发布平台 + 目标受众（各50%）
// 第4行：标签（全宽，从标签库选取）
// 第5行：文笔文风（全宽）
// 第6行：每章字数 + 总字数（各50%）
// 第7行：参考作品（全宽）
// 第8行：核心卖点（全宽）
// 第9行：简介（全宽，TextArea，300字限制）
```

使用 antd `Form`、`Input`、`Select`、`InputNumber`、`Tag` 组件。所有字段居中排列（max-width 720px）。

- [ ] **Step 2: 更新 CSS 样式**

更新 `index.module.css`，使用 CSS 变量：

```css
.formContainer {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 48px;
}
.formLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 5px;
}
.formLabelRequired::after {
  content: " *";
  color: var(--color-danger);
}
.formHint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
```

- [ ] **Step 3: 替换面板配置中的占位**

在 `workspace-panels.tsx` 中，将 `info` 面板的 component 替换为真实组件：

```tsx
import { BookInfoForm } from "../components/book-info-form";
// ...
{ key: "info", title: "书籍信息", icon: <ReadOutlined />, component: (book) => <BookInfoForm book={book} /> },
```

- [ ] **Step 4: 验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS，书籍信息面板显示 12 个字段

- [ ] **Step 5: 提交**

```bash
git add app/pages/books/components/book-info-form/ app/pages/books/config/workspace-panels.tsx
git commit -m "feat(book-info): restructure form with 12 metadata fields"
```

---

## Task 5: 世界规则 + 设定库面板

**Files:**
- Create: `app/pages/books/components/world-rules/index.tsx` + `index.module.css`
- Create: `app/pages/books/components/settings-library/index.tsx` + `index.module.css`
- Modify: `app/pages/books/config/workspace-panels.tsx`

- [ ] **Step 1: 创建世界规则面板**

新建 `app/pages/books/components/world-rules/index.tsx`：

```tsx
"use client";
import React, { useState } from "react";
import { Breadcrumb } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { WorldRule } from "@/app/types";
import styles from "./index.module.css";

interface WorldRulesProps {
  bookId: string;
}

type ViewState = { type: "list" } | { type: "create" } | { type: "edit"; rule: WorldRule };

const levelColors: Record<string, string> = {
  core: styles.levelCore,
  important: styles.levelImportant,
  general: styles.levelGeneral,
};

const levelLabels: Record<string, string> = { core: "核心", important: "重要", general: "一般" };

export function WorldRules({ bookId }: WorldRulesProps) {
  const [view, setView] = useState<ViewState>({ type: "list" });
  const [rules, setRules] = useState<WorldRule[]>([]); // TODO: 从 API 加载

  const handleDelete = (rule: WorldRule) => {
    confirmDelete(rule.name, () => {
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    });
  };

  // 列表视图
  if (view.type === "list") {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.ruleCount}>{rules.length} 条规则</span>
          <button className={styles.addButton} onClick={() => setView({ type: "create" })}>
            + 新建
          </button>
        </div>
        {rules.length === 0 ? (
          <EmptyState
            icon={<AppstoreOutlined />}
            title="还没有世界规则"
            description="定义你的世界观规则，辅助 AI 生成"
            action={
              <button onClick={() => setView({ type: "create" })}>
                + 新建第一条规则
              </button>
            }
          />
        ) : (
          <div className={styles.ruleList}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={styles.ruleItem}
                onClick={() => setView({ type: "edit", rule })}
              >
                <span className={styles.ruleName}>{rule.name}</span>
                <span className={`${styles.levelTag} ${levelColors[rule.level]}`}>
                  {levelLabels[rule.level]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 新建/编辑视图 — 表单
  return (
    <div className={styles.container}>
      <div className={styles.form}>
        {/* 规则名称、规则等级 Select、规则内容 TextArea */}
        {/* 底部：保存 + 取消 返回列表 */}
      </div>
    </div>
  );
}
```

CSS: 3 个等级 Tag 颜色（core=绿色, important=橙色, general=灰色），列表项 hover 效果。

- [ ] **Step 2: 创建设定库面板**

新建 `app/pages/books/components/settings-library/index.tsx`：

核心结构：
- 顶部 Tab 切换分类（人物/物品/地点/势力/其他）
- 左侧列表 + 右侧编辑/查看
- 编辑模式：表单字段 + 底部「标记废弃」按钮
- 查看模式：纯文本展示 + 状态区（虚线框，系统自动维护）
- 面包屑：`设定库 › 人物列表 › 林远`

详细字段参照设计文档 §3。

- [ ] **Step 3: 替换面板配置**

在 `workspace-panels.tsx` 中替换 `world-rules` 和 `settings` 的占位组件。

- [ ] **Step 4: 验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS，世界规则和设定库面板可切换显示

- [ ] **Step 5: 提交**

```bash
git add app/pages/books/components/world-rules/ app/pages/books/components/settings-library/ app/pages/books/config/workspace-panels.tsx
git commit -m "feat(world-rules): add flat list panel with CRUD; feat(settings): add categorized settings panel with edit/view modes"
```

---

## Task 6: 标签库 + 伏笔库面板

**Files:**
- Create: `app/pages/books/components/tag-library/index.tsx` + `index.module.css`
- Create: `app/pages/books/components/foreshadow-library/index.tsx` + `index.module.css`
- Modify: `app/pages/books/config/workspace-panels.tsx`

- [ ] **Step 1: 创建标签库面板**

新建 `app/pages/books/components/tag-library/index.tsx`：

核心结构：
- 左侧：标签大类列表（可新建大类）
- 右侧：选中大类的子类树形结构（可展开/折叠/编辑）
- 右侧详情面板：标签名称、父级、详情描述 + 添加子标签按钮
- 面包屑：`标签库 › 种族 › 妖族`

支持无限层级细分。使用 antd `Tree` 或自定义递归组件。

- [ ] **Step 2: 创建伏笔库面板**

新建 `app/pages/books/components/foreshadow-library/index.tsx`：

核心结构：
- 顶部搜索框 + 状态筛选按钮组（全部/未揭晓/已揭晓）
- 列表分两组：未揭晓（前置）+ 已揭晓
- 每条：伏笔名称 + 状态Tag + 章节链接 + 描述
- 已揭晓条目 `opacity: 0.7` + 标题删除线
- 按章节排序（越早越靠前）

- [ ] **Step 3: 替换面板配置**

在 `workspace-panels.tsx` 中替换 `tag-library` 和 `foreshadow` 的占位组件。

- [ ] **Step 4: 验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add app/pages/books/components/tag-library/ app/pages/books/components/foreshadow-library/ app/pages/books/config/workspace-panels.tsx
git commit -m "feat(tag-library): add hierarchical tag panel; feat(foreshadow): add foreshadow library with search and filter"
```

---

## Task 7: 正文库面板

**Files:**
- Create: `app/pages/books/components/content-library/index.tsx` + `index.module.css`
- Modify: `app/pages/books/config/workspace-panels.tsx`

- [ ] **Step 1: 创建正文库面板**

新建 `app/pages/books/components/content-library/index.tsx`：

核心结构：
- 列表显示所有过审正文
- 每条：章节标题 + 字数 + 正文预览（2行截断） + `AI ▾` 下拉 + 查看链接
- 空状态引导
- 面包屑：`正文库`

使用 `AiDropdown` 组件提供 AI 操作（去AI味、润色、扩写）。

- [ ] **Step 2: 替换面板配置**

在 `workspace-panels.tsx` 中替换 `archive` 的占位为 `ContentLibrary`。

- [ ] **Step 3: 删除旧的 archive-view 组件**

旧的 `components/archive-view/` 不再使用，可删除或保留标记为 deprecated。

- [ ] **Step 4: 验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS，7 个面板全部可切换

- [ ] **Step 5: 提交**

```bash
git add app/pages/books/components/content-library/ app/pages/books/config/workspace-panels.tsx
git commit -m "feat(content-library): add approved content library panel with AI actions"
```

---

## Task 8: 创作区重构

**Files:**
- Modify: `app/pages/books/components/creation-zone/index.tsx`
- Modify: `app/pages/books/components/creation-zone/components/outline-editor/index.tsx`
- Modify: `app/pages/books/components/creation-zone/components/volume-form/index.tsx`
- Modify: `app/pages/books/components/creation-zone/components/chapter-form/index.tsx`
- Modify: `app/pages/books/components/creation-zone/components/content-editor/index.tsx`
- Modify: `app/pages/books/components/creation-zone/components/navigation-tree/index.tsx`
- Delete (or deprecate): `app/pages/books/components/creation-zone/components/volume-view/index.tsx`
- Delete (or deprecate): `app/pages/books/components/creation-zone/components/chapter-view/index.tsx`

- [ ] **Step 1: 去掉 view 模式**

创作区纯编辑模式，删除 `volume-view` 和 `chapter-view` 组件引用。在 `creation-zone/index.tsx` 中，所有卷纲/章纲视图直接渲染编辑表单。

更新 `use-creation-zone.ts` 中的 `ViewMode` 类型，移除 view 相关状态。

- [ ] **Step 2: 所有编辑器加保存按钮**

在 `outline-editor`、`volume-form`、`chapter-form` 右上角添加 `SaveButton` 组件。

```tsx
import { SaveButton } from "@/shared/ui/save-button";
// 在每个编辑器顶部右侧
<div className={styles.toolbar}>
  <SaveButton onClick={handleSave} loading={saving} />
</div>
```

- [ ] **Step 3: 卷纲加阶段划分**

在 `volume-form` 中，参照总纲的阶段划分结构，添加可增删改的阶段列表：

```tsx
// 卷纲新增字段
- 卷核心冲突（TextArea）
- 卷梗概（TextArea）
- 阶段划分（可增删改列表，同总纲）
```

删除旧字段：发展弧线、重要节点。

- [ ] **Step 4: 章纲字段重排 + 折叠**

重写 `chapter-form`：

**主区域（始终可见）**：
1. 章节标题 + 目标字数（第一排）
2. 前章衔接 + 下章悬念（第二排）
3. 情节摘要
4. 补充说明

**折叠区（Collapse）**：场景、时间、情绪基调、出场人物、重大事件、伏笔、预计看点

状态标签显示在标题旁（系统维护，不可编辑）。

- [ ] **Step 5: 正文编辑器 AI 下拉 + 保存 + 过审**

重写 `content-editor`：

**顶部 Tab 栏右侧按钮组**：`AI ▾` + `保存` + `过审`
**底部状态栏**：字数统计 + 保存状态

使用 `AiDropdown` 和 `SaveButton` 组件。

- [ ] **Step 6: 导航树适配**

更新 `navigation-tree` 的状态颜色和标签，适配新的 `ChapterStatus` 类型。

- [ ] **Step 7: 验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS，创作区无 view 模式，所有编辑器有保存按钮

- [ ] **Step 8: 提交**

```bash
git add app/pages/books/components/creation-zone/
git commit -m "feat(creation-zone): remove view mode, add save buttons, simplify chapter outline, add AI dropdown to content editor"
```

---

## Task 9: 面板渲染适配 + 全局清理

**Files:**
- Modify: `app/pages/books/index.tsx`
- Modify: `app/pages/books/index.module.css`
- Modify: `app/pages/books/config/workspace-panels.tsx`

- [ ] **Step 1: 确认面板渲染**

确保 `app/pages/books/index.tsx` 中面板渲染逻辑兼容 7 个面板。当前使用 `display: none` 切换，需要确认无性能问题。

- [ ] **Step 2: 面包屑导航**

在每个面板组件内部实现面包屑导航（或在 `index.tsx` 中统一渲染）。格式：

```
{书名} › {面板名}          — 列表视图
{书名} › {面板名} › {列表}  — 编辑/查看视图
```

使用 antd `Breadcrumb` 组件。

- [ ] **Step 3: 删除旧的 FolderFileEditor**

世界规则和设定库已用新组件替代，`folder-file-editor` 不再被引用，可以删除。

- [ ] **Step 4: 最终验证**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS，所有 7 个面板功能完整

- [ ] **Step 5: 提交**

```bash
git add app/pages/books/
git commit -m "feat(workspace): complete visual redesign - 7 panels, shared components, unified interaction patterns"
```
