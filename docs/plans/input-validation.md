# 输入限制与文本截断规范

> **状态：待实现**

## 背景

项目中有约 69 个输入控件分布在 14 个文件中，验证规则零散、不统一：40+ 个字段无前端验证，简介 maxLength 不一致（300 vs 500），文件名无长度限制。本文档定义统一的输入限制规则和文本截断策略。

## 1. 输入限制规则

### 1.1 字段分级 maxLength

| 级别 | maxLength | 适用字段 |
|------|-----------|---------|
| L1 短名称 | **60** | 书名、规则名、标签名、设定名、伏笔名、文件夹名、文件名、卷标题、章标题 |
| L2 中等文本 | **200** | 时间、情绪基调、看点、核心卖点、参考作品、核心冲突、性格描述、特点癖好、关联章节号 |
| L3 长文本 | **2000** | 简介、规则内容、设定描述、标签详情、伏笔描述、前章衔接、下章悬念、补充说明、整体方向 |
| L4 超长文本 | **10000** | 情节摘要、阶段划分、预计看点（逗号分隔） |
| L5 无限制 | **不限** | Markdown 编辑器、正文编辑器、AI JSON 配置 |

### 1.2 TextArea 统一添加 showCount

所有 TextArea（除编辑器类 L5）添加 `showCount` 属性。

### 1.3 特殊字符过滤

文件夹名和文件名禁止字符：`/ \ : * ? " < > |`，通过 `onKeyDown` 拦截 + 提交时 `trim()` + 非法字符替换。

### 1.4 标签模式 Select

`Select mode="tags"` 设置 `maxCount={10}`，自定义标签 `maxLength={20}`。

### 1.5 统一 trim 处理

所有字符串类型字段在提交时统一 `trim()`。

## 2. 文本截断策略

| 场景 | 截断策略 | 行数 | CSS 方案 |
|------|---------|------|---------|
| 列表项标题 | 单行截断打点 | 1 | `text-overflow: ellipsis` |
| 书籍卡片描述 | 多行截断打点 | 2 | `-webkit-line-clamp: 2` |
| 内容预览 | 多行截断打点 | 2 | 同上 |
| 详情面板长文本 | 不截断，滚动 | 不限 | `pre-wrap` + `break-word` |
| 编辑器 | 不截断，全屏滚动 | 不限 | 编辑器场景 |
| 弹窗表单列表项 | 单行截断打点 | 1 | 同列表项标题 |

### 需修复的截断缺陷

1. **导航树卷标题** — `.volumeTitle` 缺少截断，需添加 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0`
2. **仪表盘网格字段值** — `.infoVal` 和 `.dashTitle` 缺少截断保护
3. **伏笔库描述** — `.itemDesc` 缺少 `word-break: break-word`
4. **伏笔库列表项名称** — `.itemName` 缺少截断

## 3. 受影响文件

### 输入限制修改

| 文件 | 修改内容 |
|------|---------|
| `folder-file-editor/.../create-modal/index.tsx` | 文件名 maxLength={60} + 字符过滤 |
| `world-rules/index.tsx` | 规则内容 maxLength={2000}, showCount |
| `settings-library/index.tsx` | 描述 maxLength={2000}; 性格/特点 maxLength={200} |
| `tag-library/index.tsx` | 标签详情 maxLength={2000}, showCount |
| `foreshadow-library/index.tsx` | 伏笔描述 maxLength={2000}; 关联章节 maxLength={200} |
| `creation-zone/.../outline-editor/index.tsx` | 整体方向/阶段划分 maxLength; 核心卖点 maxLength={200} |
| `creation-zone/.../volume-form/index.tsx` | 卷标题 maxLength={60}; 核心冲突 maxLength={2000} |
| `creation-zone/.../chapter-form/index.tsx` | 章标题 maxLength={60}; 各字段 maxLength |
| `book-info-form/index.tsx` | 简介统一 maxLength=2000; 参考作品/卖点 maxLength={200}; tags maxCount |
| `home/index.tsx` | 创建/编辑弹窗简介 maxLength 统一为 2000 |

### CSS 截断修复

| 文件 | 修改内容 |
|------|---------|
| `navigation-tree/index.module.css` | `.volumeTitle` 添加截断 |
| `book-info-form/index.module.css` | `.infoVal` + `.dashTitle` 添加截断 |
| `foreshadow-library/index.module.css` | `.itemDesc` 添加 word-break; `.itemName` 添加截断 |

## 4. 服务端一致性

在 `server/storage/book-store.ts` 中确保与前端一致的 maxLength 校验（书名 60、简介 2000 等）。

## 5. 验证方式

- `npm run typecheck` / `npm run lint` / `npm run build`
- 手动验证各输入框 maxLength 生效、showCount 正确显示
- 手动验证导航树、仪表盘、伏笔库无布局溢出
