# Visual Standards

## 适用场景

本规范适用于 AI Writer 项目所有 UI 视觉设计，包括 Design Token 管理、主题系统、响应式布局、CSS 使用约束。

---

# Visual Specification

## 技术栈约束

- **唯一组件库：** Ant Design v6 (`antd@^6.5.0`)
- **唯一图标库：** `@ant-design/icons`（Outlined 风格）
- **禁止：** 第三方 UI 库（Material UI、Tailwind 等）
- **禁止：** `:global(.ant-xxx)` 覆盖 antd 样式
- **允许：** `ConfigProvider theme` 调整 token；CSS Modules 布局

## Design Token 清单

所有值定义在 `app/globals.css` 的 `:root` 中。

### 主色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-primary` | `#2F5D50` | 按钮、链接、选中态 |
| `--color-primary-hover` | `#1e4438` | 悬停态 |
| `--color-primary-bg` | `rgba(47,93,80,0.05)` | 选中行背景 |
| `--color-primary-bg-hover` | `rgba(47,93,80,0.10)` | 悬停背景 |
| `--color-primary-border` | `rgba(47,93,80,0.20)` | 焦点边框 |

### 功能色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-success` | `#2E8B57` | 成功状态 |
| `--color-success-bg` | `rgba(46,139,87,0.1)` | 成功背景 |
| `--color-warning` | `#964400` | 警告状态 |
| `--color-warning-bg` | `rgba(150,68,0,0.1)` | 警告背景 |
| `--color-error` | `#ba1a1a` | 错误/删除 |
| `--color-error-bg` | `rgba(186,26,26,0.06)` | 错误背景 |

### 传统色（特定语义）

| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-jade` | `#2F5D50` | 翡翠色语义 |
| `--color-gold` | `#964400` | 金色语义 |
| `--color-indigo` | `#465f88` | 靛蓝色语义 |

### 背景色

| 变量 | 值 | 层级 |
|------|-----|------|
| `--bg-page` | `#f0ece4` | 页面底色 |
| `--bg-elevated` | `#faf8f4` | 卡片、弹窗 |
| `--bg-muted` | `#f5f2ec` | 次级区域 |
| `--bg-strong` | `#e8e4dc` | 分隔、强调 |

### 文字色

| 变量 | 值 | 层级 |
|------|-----|------|
| `--text-primary` | `#1a1814` | 标题、正文 |
| `--text-secondary` | `#4a4640` | 副标题、描述 |
| `--text-tertiary` | `#807b74` | 辅助文字 |
| `--text-light` | `#b5b0a8` | 占位符、图标 |
| `--text-inverse` | `#ffffff` | 深色背景上的文字 |

### 边框色

| 变量 | 值 | 层级 |
|------|-----|------|
| `--border` | `#ddd8d0` | 默认边框 |
| `--border-strong` | `#c0bbb3` | 强调边框 |
| `--border-light` | `#ebe7e0` | 轻量分隔 |

### 阴影

| 变量 | 值 | 用途 |
|------|-----|------|
| `--shadow` | `0 1px 3px rgba(24,28,34,0.08)` | 卡片、下拉 |
| `--shadow-md` | `0 4px 12px rgba(24,28,34,0.12)` | 弹窗、气泡 |
| `--shadow-lg` | `0 8px 24px rgba(24,28,34,0.16)` | 全屏弹窗 |

### 间距

| 变量 | 值 | 用途 |
|------|-----|------|
| `--space-1` | 4px | 图标-文字间距 |
| `--space-2` | 8px | 按钮组、标签间距 |
| `--space-3` | 12px | 表单/列表项间距 |
| `--space-4` | 16px | 块级内边距 |
| `--space-5` | 20px | 面板内边距 |
| `--space-6` | 24px | 弹窗内边距 |
| `--space-8` | 32px | 页面级间距 |

### 圆角

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 0.25rem | 标签、徽章 |
| `--radius-md` | 0.375rem | 输入框、选择器 |
| `--radius-lg` | 0.5rem | 卡片、弹窗 |
| `--radius-xl` | 0.75rem | 大卡片、面板 |
| `--radius-full` | 9999px | 圆形按钮、头像 |

### 字体

| 变量 | 字体栈 | 用途 |
|------|--------|------|
| `--font-display` | `'Noto Serif SC', serif` | 标题、品牌 |
| `--font-body` | `'Inter', 'Noto Sans', 'Noto Sans SC', sans-serif` | 正文 |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` | 代码 |

字号阶梯：18px（页面标题）→ 16px（段落标题）→ 14px（正文）→ 13px（辅助）→ 12px（小字）→ 11px（极小）

### 滚动条

| 变量 | 值 |
|------|-----|
| `--scrollbar-thumb` | `#c8c0b4` |
| `--scrollbar-thumb-hover` | `#a8a098` |

### 布局

| 变量 | 值 |
|------|-----|
| `--topbar-height` | 56px |
| `--footerbar-height` | 32px |
| `--content-max-width` | 1024px |
| `--content-padding-x` | 160px |
| `--content-padding-y` | 32px |

## 主题系统

### 4 个预设主题

定义在 `shared/ui/theme/themes.ts`，通过 `ThemeProvider`（React Context）注入。

| ID | 名称 | 特点 |
|----|------|------|
| `warm-paper` | 暖纸色 | 默认，暖黄底色 |
| `cool-gray` | 冷灰调 | 冷灰底色 |
| `clean-white` | 纯白 | 纯白底色 |
| `dark` | 深色 | 深色底色，主色切换为 `#4a9e85` |

### ThemeProvider 注入的变量

ThemeProvider 通过 `useEffect` 在 `document.documentElement.style` 上注入 CSS 变量。当前注入的变量：

**被 ThemeProvider 覆盖的变量（随主题变化）：**
- 背景色：`--bg-page`、`--bg-elevated`、`--bg-muted`、`--bg-strong`
- 文字色：`--text-primary`、`--text-secondary`、`--text-tertiary`、`--text-light`
- 边框色：`--border`、`--border-strong`、`--border-light`
- 主色：`--color-primary`、`--color-primary-hover`
- 阴影：`--shadow`、`--shadow-md`
- 滚动条：`--scrollbar-thumb`、`--scrollbar-thumb-hover`

**未被 ThemeProvider 覆盖的变量（始终使用 `:root` 值）：**
- 功能色：`--color-success`、`--color-warning`、`--color-error` 及其 bg 变体
- 主色派生：`--color-primary-bg`、`--color-primary-bg-hover`、`--color-primary-border`
- 传统色：`--color-jade`、`--color-gold`、`--color-indigo`
- 阴影 `--shadow-lg`
- `--text-inverse`

### 新增主题变量时的规则

1. 需要随主题变化的变量 → 添加到 `ThemeColors` 接口 + `themes.ts` 中的4个主题定义 + `theme-provider.tsx` 的注入列表
2. 不需要随主题变化的变量 → 仅在 `:root` 中定义

## 使用规则

- **禁止硬编码颜色** — 使用 CSS 变量
- **禁止非规范色彩**（蓝色、紫色等）
- 功能色语义：绿色 = 成功，橙色 = 警告，红色 = 错误
- **禁止 `!important`** — 通过类嵌套提升优先级
- `:global()` 仅用于 antd 内部样式微调，优先使用 ConfigProvider tokens

## 响应式

主断点 `@media (max-width: 768px)`，辅助断点 `480px` 和 `1024px`。内容区宽度通过 `--content-padding-x` 控制。

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| V-1 | CSS 无硬编码颜色 | 搜索 hex/rgb 在 .module.css | — |
| V-2 | 无 `!important` | 搜索 `!important` | — |
| V-3 | 无 `:global(.ant-xxx)` 覆盖 | 搜索 `:global` | — |
| V-4 | 使用 antd ConfigProvider tokens | Code Review | — |
| V-5 | CSS 变量在 globals.css 中定义 | 代码检查 | — |
| V-6 | 新增主题变量同步更新 4 个主题 | Code Review | — |
| V-7 | 仅使用 @ant-design/icons Outlined | Code Review | — |
| V-8 | 字体使用 CSS 变量 | Code Review | — |

## 违规整改方案

| 违规 | 整改方式 | 时限 |
|------|---------|------|
| CSS 硬编码颜色 | 替换为 CSS 变量 | 当前迭代 |
| 使用 `:global(.ant-xxx)` | 改用 ConfigProvider tokens | 当前迭代 |
| 使用 `!important` | 通过类嵌套提升优先级 | 当前迭代 |
| 非规范色彩（蓝/紫等） | 替换为规范色彩 | 当前迭代 |
| 新增变量未同步主题 | 补充 ThemeColors + 4 主题定义 | 当前迭代 |
