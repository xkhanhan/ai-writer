# 输入限制与文本截断规范

## 背景

项目中有约 69 个输入控件分布在 14 个文件中，但验证规则零散、不统一：40+ 个字段无任何前端验证，简介 maxLength 在不同位置不一致（300 vs 500），文件名无长度限制，TextArea 除简介外均无 maxLength。截断方面，两处布局缺陷（仪表盘 grid、导航树卷标题）可能导致长文本溢出。

本文档定义统一的输入限制规则和文本截断策略，确保所有输入内容可控、展示不溢出。

---

## 1. 输入限制规则

### 1.1 字段分级 maxLength

按字段语义分为 5 级，所有 Input/TextArea 统一添加 maxLength：

| 级别 | maxLength | 适用字段 |
|------|-----------|---------|
| L1 短名称 | **60** | 书名、规则名、标签名、设定名、伏笔名、文件夹名、文件名、卷标题、章标题 |
| L2 中等文本 | **200** | 时间、情绪基调、看点、核心卖点、参考作品、核心冲突、性格描述、特点癖好、关联章节号 |
| L3 长文本 | **2000** | 简介、规则内容、设定描述、标签详情、伏笔描述、前章衔接、下章悬念、补充说明、整体方向 |
| L4 超长文本 | **10000** | 情节摘要、阶段划分、预计看点(逗号分隔) |
| L5 无限制 | **不限** | Markdown 编辑器、正文编辑器、AI JSON 配置 |

### 1.2 TextArea 统一添加 showCount

所有 TextArea（除编辑器类 L5）添加 `showCount` 属性，让用户感知字数上限。

### 1.3 特殊字符过滤

文件夹名和文件名输入添加字符过滤：
- 禁止字符：`/ \ : * ? " < > |`
- 通过 `onKeyDown` 拦截 + 提交时 `trim()` + 非法字符替换

### 1.4 标签模式 Select

`Select mode="tags"` 的自定义标签：
- 设置 `maxCount={10}` 限制最大标签数
- 自定义标签 maxLength={20}

### 1.5 统一 trim 处理

所有字符串类型字段在提交时统一 `trim()`，去除首尾空白。

---

## 2. 文本截断策略

### 2.1 策略矩阵

| 场景 | 截断策略 | 行数 | CSS 方案 |
|------|---------|------|---------|
| 列表项标题（名称、规则名、标签名） | 单行截断打点 | 1 | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0` |
| 书籍卡片描述 | 多行截断打点 | 2 | `-webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden` |
| 内容预览 | 多行截断打点 | 2 | 同上 |
| 详情面板长文本 | 不截断，滚动 | 不限 | `white-space: pre-wrap; word-break: break-word`（在 overflow-y: auto 容器内） |
| 编辑器（Markdown/正文） | 不截断，全屏滚动 | 不限 | 编辑器场景，内容完整性优先 |
| 弹窗表单列表项 | 单行截断打点 | 1 | 同列表项标题 |

### 2.2 需修复的截断缺陷

#### 2.2.1 导航树卷标题

**文件**: `app/pages/books/components/creation-zone/components/navigation-tree/index.module.css`

`.volumeTitle` 缺少截断，而 `.chapterTitle` 已有。需统一添加：

```css
.volumeTitle {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 2.2.2 仪表盘网格字段值

**文件**: `app/pages/books/components/book-info-form/index.module.css`

`.infoVal` 和 `.dashTitle` 在 grid 布局中无截断保护。修复：

```css
.infoVal {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.dashTitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
```

#### 2.2.3 伏笔库描述 word-break

**文件**: `app/pages/books/components/foreshadow-library/index.module.css`

`.itemDesc` 缺少 `word-break: break-word`，超长无空格字符串可能水平溢出：

```css
.itemDesc {
  /* 保留现有样式 */
  word-break: break-word;
}
```

#### 2.2.4 伏笔库列表项名称截断

**文件**: `app/pages/books/components/foreshadow-library/index.module.css`

`.itemName` 缺少截断：

```css
.itemName {
  /* 保留现有样式 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
```

---

## 3. 受影响的文件清单

### 输入限制修改（添加 maxLength / showCount / 字符过滤）

| 文件 | 修改内容 |
|------|---------|
| `app/pages/books/components/folder-file-editor/components/create-modal/index.tsx` | 文件夹名/文件名 Input 添加 maxLength={60} + 字符过滤 |
| `app/pages/books/components/world-rules/index.tsx` | 规则内容 TextArea 添加 maxLength={2000}, showCount |
| `app/pages/books/components/settings-library/index.tsx` | 描述 TextArea 添加 maxLength={2000}, showCount; 性格/特点 Input 添加 maxLength={200} |
| `app/pages/books/components/tag-library/index.tsx` | 标签详情 TextArea 添加 maxLength={2000}, showCount |
| `app/pages/books/components/foreshadow-library/index.tsx` | 伏笔描述 TextArea 添加 maxLength={2000}, showCount; 关联章节号 Input 添加 maxLength={200} |
| `app/pages/books/components/creation-zone/components/outline-editor/index.tsx` | 整体方向/阶段划分 TextArea 添加 maxLength; 核心卖点 Input 添加 maxLength={200} |
| `app/pages/books/components/creation-zone/components/volume-form/index.tsx` | 卷标题 Input 添加 maxLength={60}; 核心冲突 TextArea 添加 maxLength={2000}; 阶段/看点 Input 添加 maxLength |
| `app/pages/books/components/creation-zone/components/chapter-form/index.tsx` | 章标题 Input 添加 maxLength={60}; 各 TextArea 添加 maxLength; 各 Input 添加 maxLength |
| `app/pages/books/components/book-info-form/index.tsx` | 统一简介 maxLength=2000; 参考作品/核心卖点 Input 添加 maxLength={200}; Select mode="tags" 添加 maxCount |
| `app/pages/home/index.tsx` | 创建/编辑弹窗简介 maxLength 统一为 2000 |

### 截断策略修改（CSS 修复）

| 文件 | 修改内容 |
|------|---------|
| `app/pages/books/components/creation-zone/components/navigation-tree/index.module.css` | `.volumeTitle` 添加截断三件套 |
| `app/pages/books/components/book-info-form/index.module.css` | `.infoVal` 和 `.dashTitle` 添加截断保护 |
| `app/pages/books/components/foreshadow-library/index.module.css` | `.itemDesc` 添加 word-break; `.itemName` 添加截断 |

---

## 4. 服务端一致性

在 `server/storage/book-store.ts` 的写入方法中，确保与前端一致的 maxLength 校验：

- 书名：最长 60（已有）
- 简介：最长 2000（需从 500 调整）
- 其他字段：按 L1-L4 级别添加校验

---

## 5. 验证方式

完成修改后通过以下验证集：
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 手动验证：在各输入框输入超长文本，确认 maxLength 生效、showCount 正确显示
- 手动验证：在导航树、仪表盘、伏笔库中展示超长内容，确认无布局溢出
