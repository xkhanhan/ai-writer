# SplitPanel 左右分栏组件设计规范

> **版本**: v1.0
> **更新时间**: 2026-07-05
> **状态**: 规范制定
> **适用页面**: 世界规则、设定库、伏笔库等所有使用左右分栏布局的页面

---

## 目录

1. [概述](#1-概述)
2. [组件 API](#2-组件-api)
3. [统一布局规则](#3-统一布局规则)
4. [颜色规则](#4-颜色规则)
5. [骨架屏加载](#5-骨架屏加载)
6. [分隔线实现](#6-分隔线实现)
7. [响应式规则](#7-响应式规则)
8. [按钮标准](#8-按钮标准)
9. [标签定位](#9-标签定位)
10. [Modal 表单标准](#10-modal-表单标准)
11. [代码示例](#11-代码示例)
12. [检查清单](#12-检查清单)

---

## 1. 概述

`SplitPanel` 是项目中所有左右分栏页面的统一基础组件。所有需要左列表 + 右详情模式的页面（世界规则、设定库、伏笔库等）**必须**使用该组件，并遵循本文档定义的布局规范。

### 适用场景

- 左侧为可操作列表，右侧为选中项的详情视图
- 列表项支持新建、选择、切换
- 详情面板支持查看、编辑、删除

### 组件源码位置

- 组件：`shared/ui/split-panel/index.tsx`
- 样式：`shared/ui/split-panel/index.module.css`

---

## 2. 组件 API

```typescript
interface SplitPanelProps {
  /** 左侧面板内容 */
  left: ReactNode;
  /** 右侧面板内容，null 时显示空状态 */
  right: ReactNode | null;
  /** 左侧宽度，默认 280px */
  leftWidth?: number;
  /** 右侧空状态提示，默认 "选择一项查看详情" */
  emptyHint?: string;
}
```

### Props 说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `left` | `ReactNode` | — (必填) | 左侧面板内容，通常包含工具栏和列表 |
| `right` | `ReactNode \| null` | — | 右侧面板内容。传 `null` 时自动显示空状态 |
| `leftWidth` | `number` | `280` | 左侧面板固定宽度（px），右侧自适应 |
| `emptyHint` | `string` | `"选择一项查看详情"` | 右侧空状态的提示文字 |

### 使用方式

```tsx
import { SplitPanel } from "@/shared/ui/split-panel";

<SplitPanel
  left={<LeftPanel />}
  right={selectedItem ? <DetailPanel item={selectedItem} /> : null}
  leftWidth={280}
  emptyHint="选择一项查看详情"
/>
```

---

## 3. 统一布局规则

### 3.1 左侧面板结构

左侧面板由两部分组成：**工具栏** 和 **列表区域**。

#### 工具栏 (Toolbar)

```
布局: display: flex; align-items: center; justify-content: space-between;
内边距: padding-bottom: 10px
内容: 左侧 — 数量标签（如 "3 条规则"）
      右侧 — "新建" 按钮
```

- 数量标签样式：`font-weight: 600; font-size: 13px; color: var(--ink-tertiary); font-family: var(--font-body)`
- 新建按钮样式：**所有页面必须统一使用** `Button type="primary" size="small" icon={<PlusOutlined />}`，按钮文字为"新建"

#### 列表项 (List Item)

```
padding: 8px 10px
border-radius: var(--radius-md)
margin-bottom: 2px
border-left: 3px solid transparent
cursor: pointer
transition: all 0.15s ease
```

**列表项内部结构：**

```
itemBody: display: flex; align-items: center; justify-content: space-between; gap: 8px
  ├── itemName: 名称文字（flex: 1, 溢出省略）
  └── itemMeta: 标签区域（flex-shrink: 0）
```

**交互状态：**

| 状态 | 样式 |
|------|------|
| 默认 | `border-left: 3px solid transparent` |
| 悬停 (hover) | `background: var(--panel-soft)` |
| 选中 (active) | `background: var(--accent-soft); border-left-color: var(--accent)` |

**名称文字样式：**

```
font-size: 12px
font-family: var(--font-body)
color: var(--text)
font-weight: 500
overflow: hidden
text-overflow: ellipsis
white-space: nowrap
```

**标签 (Tag) 在列表项中的定位：**

- 位于列表项 body 的右侧
- `flex-shrink: 0` 防止被挤压
- `margin: 0` 去除默认外边距

#### 左侧空列表状态

当列表无数据时，左侧面板显示空状态组件：

```tsx
<div className={styles.leftEmpty}>
  <EmptyState
    icon={<AppstoreOutlined />}
    title="还没有{实体名}"
    description="描述文字，引导用户操作"
    action={
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        新建{实体名}
      </Button>
    }
  />
</div>
```

### 3.2 右侧面板结构（详情视图）

右侧详情面板分为 **Header** 和 **Content** 两部分。

#### 详情头部 (Detail Header)

```
padding: 16px 20px
border-bottom: 1px solid var(--line)
flex-shrink: 0
```

**标题行 (Title Row)：**

```
display: flex; align-items: center; gap: 10px; margin-bottom: 6px
  ├── title: h3 标题
  │     font-family: var(--font-display)
  │     font-size: 18px
  │     font-weight: 600
  │     color: var(--text)
  │     margin: 0; flex: 1; min-width: 0
  │     overflow: hidden; text-overflow: ellipsis; white-space: nowrap
  ├── primaryTag: 主标签（如等级/状态 Tag）
  └── secondaryTag: 可选的次要标签
```

**创建时间：**

```
font-size: 11px
color: var(--ink-tertiary)
font-family: var(--font-body)
margin-bottom: 10px
```

格式：`创建于 {new Date(createdAt).toLocaleString("zh-CN")}`

**操作按钮区 (Actions)：**

```
display: flex; gap: 8px
```

包含两个按钮（详见 [按钮标准](#8-按钮标准)）：

- 编辑按钮
- 删除按钮

#### 详情内容区 (Detail Content)

```
flex: 1
overflow-y: auto
padding: 16px 20px
```

**正文样式：**

```
font-size: 13px
line-height: 1.8
color: var(--text)
font-family: var(--font-body)
margin: 0
white-space: pre-wrap
word-break: break-word
```

**无内容占位：**

当详情项内容为空时，显示占位文字：

```
font-size: 13px
color: var(--ink-tertiary)
font-style: italic
```

### 3.3 右侧空状态（未选择）

当 `right` prop 传入 `null` 时，SplitPanel 组件自动渲染空状态：

```
容器: flex: 1; display: flex; align-items: center; justify-content: center
文字: font-size: 13px; color: var(--ink-tertiary); font-family: var(--font-body)
内容: "选择一项查看详情"（或自定义 emptyHint）
```

---

## 4. 颜色规则

### 4.1 优先级与 Tag 颜色映射

所有使用 Tag 标记优先级/等级的页面，必须遵循以下统一映射：

| 级别 | Tag 颜色 | 语义 | 说明 |
|------|----------|------|------|
| 核心 / 高优先级 | `color="green"` | 核心项、高优项 | 关键规则、核心设定 |
| 重要 | `color="orange"` | 重要项 | 需要关注但非核心 |
| 一般 / 默认 | 无 color prop | 通用项 | 默认状态 |

**代码示例：**

```tsx
<Tag
  color={level === "core" ? "green" : level === "important" ? "orange" : undefined}
>
  {levelLabels[level]}
</Tag>
```

### 4.2 状态颜色（伏笔库等特殊场景）

| 状态 | 背景色 | 文字色 | 说明 |
|------|--------|--------|------|
| 未揭晓 (hidden) | `#fef3c7` | `#92400e` | 琥珀色系 |
| 已揭晓 (revealed) | `#d1fae5` | `#065f46` | 绿色系 |

### 4.3 禁止事项

- **禁止**使用随机颜色值，必须使用设计 Token 系统
- **禁止**在列表项的 `border-left` 上使用彩色（默认为 `transparent`，选中为 `var(--accent)`）
- **禁止**使用未定义的颜色变量或硬编码非规范颜色

---

## 5. 骨架屏加载

**所有使用 SplitPanel 的页面必须实现骨架屏加载。** 在数据请求期间展示 Skeleton，数据就绪后隐藏。

### 5.1 左侧面板骨架

展示 3-4 个矩形块，模拟列表项：

```tsx
import { Skeleton } from "antd";

<div className={styles.skeletonList}>
  <Skeleton active paragraph={{ rows: 0 }} title={{ width: "60%" }} />
  <Skeleton active paragraph={{ rows: 0 }} title={{ width: "80%" }} />
  <Skeleton active paragraph={{ rows: 0 }} title={{ width: "50%" }} />
  <Skeleton active paragraph={{ rows: 0 }} title={{ width: "70%" }} />
</div>
```

### 5.2 右侧面板骨架

展示标题骨架 + 内容段落骨架：

```tsx
<div className={styles.skeletonDetail}>
  <Skeleton active title={{ width: "40%" }} paragraph={{ rows: 0 }} />
  <Skeleton active title={{ width: "20%" }} paragraph={{ rows: 0 }} style={{ marginTop: 8 }} />
  <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 20 }} />
</div>
```

### 5.3 骨架屏使用规则

- 使用 antd 的 `<Skeleton active />` 组件
- 骨架屏仅在 `loading === true` 时显示
- 数据加载完成后立即切换为实际内容
- 不要在骨架屏上添加额外动画效果

---

## 6. 分隔线实现

### 6.1 分隔机制

**SplitPanel 不使用显式分割线元素。** 分隔效果通过父容器的 `gap` + `background` 实现：

```css
.splitPanel {
  display: flex;
  height: 100%;
  gap: 1px;                              /* 1px 间隙形成分割线 */
  background: var(--border-light);       /* 间隙处显示边框色 */
  overflow: hidden;
}

.leftPanel {
  background: var(--panel);              /* 左面板白色背景 */
}

.rightPanel {
  background: var(--panel);              /* 右面板白色背景 */
}
```

### 6.2 禁止事项

- **禁止**在左右面板之间添加 `<Divider />`、`<div>` 分割线元素
- **禁止**使用 `border-right` 或 `border-left` 模拟分割线
- **禁止**修改 `gap` 值（固定 1px）

---

## 7. 响应式规则

### 7.1 断点定义

| 断点 | 布局方式 | 说明 |
|------|----------|------|
| ≥ 768px | 左右分栏 (flex row) | 默认桌面布局 |
| < 768px | 上下排列 (flex column) | 移动端布局 |

### 7.2 移动端适配 (< 768px)

```css
@media (max-width: 768px) {
  .splitPanel {
    flex-direction: column;
    gap: 1px;
  }

  .leftPanel {
    width: 100% !important;
    min-width: 100% !important;
    max-height: 40%;       /* 左侧列表最多占 40% 高度 */
  }

  .rightPanel {
    flex: 1;               /* 右侧详情占剩余空间 */
  }
}
```

### 7.3 移动端内部样式调整

左侧列表和右侧详情在移动端需要缩小内边距：

| 属性 | 桌面端 | 移动端 |
|------|--------|--------|
| 列表容器 padding | `12px` | `8px 12px` |
| 详情头部 padding | `16px 20px` | `14px 16px` |
| 详情内容 padding | `16px 20px` | `12px 16px` |
| 详情标题字号 | `18px` | `16px` |

---

## 8. 按钮标准

**所有使用 SplitPanel 的页面，按钮必须严格遵循以下规范：**

### 8.1 按钮类型一览

| 操作 | 代码 | 位置 |
|------|------|------|
| **新建** | `<Button type="primary" size="small" icon={<PlusOutlined />}>新建</Button>` | 左侧工具栏 |
| **编辑** | `<Button size="small" icon={<EditOutlined />}>编辑</Button>` | 右侧详情头部 |
| **删除** | `<Button size="small" danger icon={<DeleteOutlined />}>删除</Button>` | 右侧详情头部 |

### 8.2 强制规则

- **必须**使用 `size="small"` 统一按钮尺寸
- 新建按钮**必须**使用 `type="primary"`
- 删除按钮**必须**使用 `danger` 属性
- 编辑按钮**必须**使用默认 type（不加 type prop）
- **禁止**使用 ghost 按钮（`ghost` prop）
- **禁止**使用 link 按钮（`type="link"`）用于新建/编辑/删除操作
- **禁止**使用 text 按钮（`type="text"`）用于新建/编辑/删除操作
- **禁止**混合使用不同变体的按钮

### 8.3 图标来源

所有图标统一使用 `@ant-design/icons`：

```tsx
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
```

---

## 9. 标签定位

### 9.1 列表项中的标签

```
位置: 列表项 body 的最右侧
布局: flex 布局中 flex-shrink: 0 的子元素
间距: margin: 0（去除 Tag 默认外边距）
```

```tsx
<div className={styles.ruleItemBody}>
  <span className={styles.ruleName}>{item.name}</span>
  <Tag color="green" style={{ margin: 0 }}>核心</Tag>
</div>
```

### 9.2 详情头部中的标签

```
位置: 标题文字之后，同一行
布局: flex 布局中的子元素，gap: 10px 控制间距
间距: 使用 Tag 默认 margin（不覆盖）
```

```tsx
<div className={styles.detailTitleRow}>
  <h3 className={styles.detailTitle}>{item.name}</h3>
  <Tag color="green">核心</Tag>
  {/* 可选的次要标签 */}
  <Tag>次要信息</Tag>
</div>
```

### 9.3 标签颜色规则

参见 [第 4 节 颜色规则](#4-颜色规则)。标签颜色必须严格遵循优先级映射，不得使用自定义颜色。

---

## 10. Modal 表单标准

所有使用 SplitPanel 的页面，在新建/编辑实体时，必须使用统一的 Modal 表单模式。

### 10.1 Modal 配置

```tsx
<Modal
  title={modalMode === "create" ? "新建{实体名}" : "编辑{实体名}"}
  open={modalOpen}
  onCancel={handleCancel}
  onOk={handleSave}
  okText="保存"
  cancelText="取消"
  okButtonProps={{ disabled: !formName.trim() }}
  width={560}
  destroyOnClose
>
```

| 属性 | 值 | 说明 |
|------|-----|------|
| `title` | `"新建{实体名}"` / `"编辑{实体名}"` | 根据模式动态切换 |
| `width` | `560` | 固定宽度 |
| `okText` | `"保存"` | 确认按钮文字 |
| `cancelText` | `"取消"` | 取消按钮文字 |
| `destroyOnClose` | `true` | 关闭时销毁内容 |
| `okButtonProps.disabled` | 表单校验条件 | 名称为空时禁用 |

### 10.2 表单布局

```
容器: padding-top: 12px
字段: margin-bottom: 16px
标签: display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: var(--text)
```

- 表单使用**垂直布局**（label 在 input 上方）
- 必填字段在 label 后添加红色星号 `*`
- 使用原生 `<label>` + antd Input/Select/TextArea 组合

### 10.3 表单字段规范

| 字段类型 | 组件 | 说明 |
|----------|------|------|
| 文本输入 | `<Input>` | 用于名称等短文本 |
| 多行文本 | `<Input.TextArea>` | 用于描述等长文本，`rows={6}` |
| 下拉选择 | `<Select>` | 用于等级、状态等枚举值 |
| 数字输入 | `<InputNumber>` | 用于章节号等数值 |

### 10.4 禁止事项

- **禁止**使用 `<Form>` + `<Form.Item>` 包装（使用原生 label 更轻量）
- **禁止**修改 Modal 宽度（固定 560px）
- **禁止**使用自定义 footer 按钮（统一使用 Cancel + Save）
- **禁止**省略 `destroyOnClose`

---

## 11. 代码示例

### 11.1 完整页面模板

以下为使用 SplitPanel 的标准页面模板：

```tsx
"use client";

import { useState } from "react";
import { Button, Input, Modal, Skeleton, Tag } from "antd";
import { AppstoreOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { SplitPanel } from "@/shared/ui/split-panel";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book } from "@/app/types";
import styles from "./index.module.css";

interface MyEntity {
  id: string;
  bookId: string;
  name: string;
  level: "core" | "important" | "general";
  content: string;
  createdAt: string;
  updatedAt: string;
}

const levelLabels: Record<MyEntity["level"], string> = {
  core: "核心",
  important: "重要",
  general: "一般",
};

export default function MyEntityPage({ book }: { book: Book }) {
  const [items, setItems] = useState<MyEntity[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<MyEntity | null>(null);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<MyEntity["level"]>("general");
  const [formContent, setFormContent] = useState("");

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  // ... 表单操作逻辑 ...

  // 左侧面板
  const leftPanel = loading ? (
    <div className={styles.skeletonList}>
      <Skeleton active paragraph={{ rows: 0 }} title={{ width: "60%" }} />
      <Skeleton active paragraph={{ rows: 0 }} title={{ width: "80%" }} />
      <Skeleton active paragraph={{ rows: 0 }} title={{ width: "50%" }} />
    </div>
  ) : items.length === 0 ? (
    <div className={styles.leftEmpty}>
      <EmptyState
        icon={<AppstoreOutlined />}
        title="还没有{实体名}"
        description="描述文字"
        action={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建{实体名}
          </Button>
        }
      />
    </div>
  ) : (
    <div className={styles.entityList}>
      <div className={styles.listToolbar}>
        <span className={styles.entityCount}>{items.length} 条{实体名}</span>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
          新建
        </Button>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className={`${styles.entityItem} ${activeId === item.id ? styles.entityItemActive : ""}`}
          onClick={() => setActiveId(item.id === activeId ? null : item.id)}
        >
          <div className={styles.entityItemBody}>
            <span className={styles.entityName}>{item.name}</span>
            <Tag
              color={item.level === "core" ? "green" : item.level === "important" ? "orange" : undefined}
              style={{ margin: 0 }}
            >
              {levelLabels[item.level]}
            </Tag>
          </div>
        </div>
      ))}
    </div>
  );

  // 右侧面板
  const rightPanel = loading ? (
    <div className={styles.skeletonDetail}>
      <Skeleton active title={{ width: "40%" }} paragraph={{ rows: 0 }} />
      <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 20 }} />
    </div>
  ) : activeItem ? (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div className={styles.detailTitleRow}>
          <h3 className={styles.detailTitle}>{activeItem.name}</h3>
          <Tag
            color={activeItem.level === "core" ? "green" : activeItem.level === "important" ? "orange" : undefined}
          >
            {levelLabels[activeItem.level]}
          </Tag>
        </div>
        <span className={styles.detailTime}>
          创建于 {new Date(activeItem.createdAt).toLocaleString("zh-CN")}
        </span>
        <div className={styles.detailActions}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(activeItem)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(activeItem)}>
            删除
          </Button>
        </div>
      </div>
      <div className={styles.detailContent}>
        <p className={styles.detailText}>{activeItem.content}</p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <SplitPanel left={leftPanel} right={rightPanel} leftWidth={280} />
      {/* Modal 表单 ... */}
    </>
  );
}
```

### 11.2 CSS Modules 模板

```css
/* ===== 左侧列表 ===== */
.leftEmpty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.entityList {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.listToolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  flex-shrink: 0;
}

.entityCount {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink-tertiary);
  font-family: var(--font-body);
}

.entityItem {
  padding: 8px 10px;
  border-radius: var(--radius-md);
  margin-bottom: 2px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.entityItem:hover {
  background: var(--panel-soft);
}

.entityItemActive {
  background: var(--accent-soft);
  border-left-color: var(--accent);
}

.entityItemBody {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.entityName {
  font-size: 12px;
  color: var(--text);
  font-family: var(--font-body);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* ===== 右侧详情面板 ===== */
.detailPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detailHeader {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.detailTitleRow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.detailTitle {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detailTime {
  font-size: 11px;
  color: var(--ink-tertiary);
  font-family: var(--font-body);
  margin-bottom: 10px;
}

.detailActions {
  display: flex;
  gap: 8px;
}

.detailContent {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.detailText {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text);
  font-family: var(--font-body);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ===== 骨架屏 ===== */
.skeletonList {
  padding: 16px 12px;
}

.skeletonList .ant-skeleton + .ant-skeleton {
  margin-top: 12px;
}

.skeletonDetail {
  padding: 16px 20px;
}

/* ===== Modal 表单 ===== */
.modalForm {
  padding-top: 12px;
}

.formField {
  margin-bottom: 16px;
}

.formLabel {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-body);
  color: var(--text);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .entityList {
    padding: 8px 12px;
  }

  .detailHeader {
    padding: 14px 16px;
  }

  .detailContent {
    padding: 12px 16px;
  }

  .detailTitle {
    font-size: 16px;
  }
}
```

---

## 12. 检查清单

新建或修改 SplitPanel 页面时，逐项检查以下内容：

### 布局

- [ ] 使用了 `SplitPanel` 组件（`shared/ui/split-panel`）
- [ ] 左侧面板包含工具栏（数量标签 + 新建按钮）
- [ ] 工具栏 `padding-bottom: 10px`
- [ ] 列表项样式：`padding: 8px 10px`，`border-radius: var(--radius-md)`，`margin-bottom: 2px`
- [ ] 选中状态：`background: var(--accent-soft)`，`border-left-color: var(--accent)`
- [ ] 悬停状态：`background: var(--panel-soft)`

### 按钮

- [ ] 新建按钮：`type="primary" size="small" icon={<PlusOutlined />}`
- [ ] 编辑按钮：`size="small" icon={<EditOutlined />}`
- [ ] 删除按钮：`size="small" danger icon={<DeleteOutlined />}`
- [ ] 没有使用 ghost / link / text 变体按钮

### 标签

- [ ] 列表项标签：`margin: 0`，位于 body 右侧，`flex-shrink: 0`
- [ ] 详情头部标签：标题同行，使用默认 margin
- [ ] 颜色遵循优先级映射（green = 核心，orange = 重要，无色 = 一般）

### 骨架屏

- [ ] 数据加载时显示 Skeleton
- [ ] 左侧：3-4 个矩形块
- [ ] 右侧：标题骨架 + 内容段落骨架
- [ ] 数据就绪后隐藏骨架屏

### 分隔线

- [ ] 使用 `gap: 1px; background: var(--border-light)` 实现
- [ ] 没有使用 Divider 或 border 模拟分割线

### 响应式

- [ ] < 768px 时切换为上下布局
- [ ] 左侧 `max-height: 40%`
- [ ] 移动端调整内边距

### Modal 表单

- [ ] 标题格式：`"新建{实体名}"` / `"编辑{实体名}"`
- [ ] 宽度 `560px`
- [ ] 按钮：取消 + 保存
- [ ] `destroyOnClose`

### 详情面板

- [ ] Header：`padding: 16px 20px`，`border-bottom: 1px solid var(--line)`
- [ ] 标题：`font-size: 18px`，`font-family: var(--font-display)`
- [ ] 创建时间：`font-size: 11px`，`color: var(--ink-tertiary)`
- [ ] 操作按钮：`display: flex; gap: 8px`
- [ ] 内容区：`flex: 1; overflow-y: auto; padding: 16px 20px`
- [ ] 正文：`font-size: 13px; line-height: 1.8; white-space: pre-wrap`
- [ ] 空状态：居中显示，`font-size: 13px; color: var(--ink-tertiary)`

---

**文档维护人**: AI 助手
**最后更新**: 2026-07-05
