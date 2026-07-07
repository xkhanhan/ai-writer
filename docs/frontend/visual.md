# 前端视觉规范

> Design Token 体系。所有 UI 开发必须符合以下规范。

## 1. 技术栈约束

- **唯一组件库**: Ant Design v6 (`antd@^6.5.0`)
- **唯一图标库**: `@ant-design/icons`（Outlined 风格）
- 禁止引入第三方 UI 库（Material UI、Tailwind 等）
- 禁止 `:global(.ant-xxx)` 覆盖 Ant Design 样式
- 允许通过 `ConfigProvider theme` 调整主题色
- 允许在 CSS Modules 中编写布局样式

## 2. 色彩 Token

### 功能色

| 语义 | 变量名 | 色值 |
|------|--------|------|
| 主色 | `--color-primary` | `#2F5D50` |
| 主色悬浮 | `--color-primary-hover` | `#1e4438` |
| 主色浅底 | `--color-primary-bg` | `rgba(47,93,80,0.05)` |
| 成功 | `--color-success` | `#2E8B57` |
| 警告 | `--color-warning` | `#964400` |
| 错误 | `--color-error` | `#ba1a1a` |

### 背景色

| 层级 | 变量名 | 色值 |
|------|--------|------|
| 页面背景 | `--bg-page` | `#f0ece4` |
| 抬升面 | `--bg-elevated` | `#faf8f4` |
| 静音面 | `--bg-muted` | `#f5f2ec` |
| 强调底 | `--bg-strong` | `#e8e4dc` |

### 文字色

| 层级 | 变量名 | 色值 |
|------|--------|------|
| 主文字 | `--text-primary` | `#1a1814` |
| 次文字 | `--text-secondary` | `#4a4640` |
| 三级文字 | `--text-tertiary` | `#807b74` |
| 浅色文字 | `--text-light` | `#b5b0a8` |
| 反白文字 | `--text-inverse` | `#ffffff` |

### 边框色

| 层级 | 变量名 | 色值 |
|------|--------|------|
| 默认边框 | `--border` | `#ddd8d0` |
| 强调边框 | `--border-strong` | `#c0bbb3` |

### 使用规则

- 禁止硬编码颜色值（如 `color: #2F5D50`），必须使用 CSS 变量
- 禁止引入非规范色彩（蓝色、紫色等）
- 功能色限定场景：绿=成功，橙=警告，红=错误

## 3. 字体 Token

| 用途 | 变量名 | 字体栈 |
|------|--------|--------|
| 展示字体 | `--font-display` | `'Noto Serif SC', serif` |
| 正文字体 | `--font-body` | `'Inter', 'Noto Sans', 'Noto Sans SC', sans-serif` |
| 等宽字体 | `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` |

字号阶梯：18px（页面标题）→ 16px（区域标题）→ 14px（正文）→ 13px（辅助）→ 12px（小号）→ 11px（最小）

## 4. 间距/圆角/阴影

### 间距阶梯

| 变量名 | 值 | 场景 |
|--------|-----|------|
| `--space-1` | 4px | 图标与文字间距 |
| `--space-2` | 8px | 按钮组内部、Tag 间距 |
| `--space-3` | 12px | 表单项/列表项间距 |
| `--space-4` | 16px | 区块内边距 |
| `--space-5` | 20px | 面板内边距 |
| `--space-6` | 24px | 弹窗内边距 |
| `--space-8` | 32px | 页面级间距 |

### 圆角阶梯

| 变量名 | 值 | 场景 |
|--------|-----|------|
| `--radius-sm` | 4px | Tag、Badge |
| `--radius-md` | 6px | 输入框、选择器 |
| `--radius-lg` | 8px | 卡片、弹窗 |
| `--radius-xl` | 12px | 大卡片、面板 |
| `--radius-full` | 9999px | 圆形按钮、头像 |

### 阴影层级

| 变量名 | 定义 | 场景 |
|--------|------|------|
| `--shadow` | `0 1px 3px rgba(24,28,34,0.08)` | 卡片、下拉菜单 |
| `--shadow-md` | `0 4px 12px rgba(24,28,34,0.12)` | 弹窗、悬浮面板 |
| `--shadow-lg` | `0 8px 24px rgba(24,28,34,0.16)` | 全屏弹窗 |

## 5. 响应式断点

- 移动端适配统一使用 `@media (max-width: 768px)`。

## 6. 组件使用规范

按钮、标签、表单、弹窗、侧边栏等组件的交互规则详见 [组件规范](./components.md)。
