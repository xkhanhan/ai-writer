# 前端工程规范

> 每次提交前必须通过全部验证。详见 [Git 工作流](../management/workflow.md)。

## 1. 验证命令

| 命令 | 用途 | 强制时机 |
|------|------|----------|
| `npm run typecheck` | TypeScript 类型检查 | 提交前 |
| `npm run lint` | ESLint 代码检查 | 提交前 |
| `npm run build` | 生产构建验证 | 提交前 |

三项全部通过才能提交。

## 2. 依赖管理

- 包管理器：**npm**。禁止混用 yarn / pnpm。
- 新增依赖前评估：必要性 → 体积（bundlephobia） → 维护状态 → 安全性。
- `package-lock.json` 必须一并提交。

## 3. 项目结构

```
app/          # Next.js 前端（页面、路由、API 适配）
server/       # 服务端（存储、AI、工具函数）
shared/       # 跨层复用（UI 组件、合约类型）
data/         # 运行时数据（SQLite、JSON）
docs/         # 项目文档
```

### 3.1 `app/` 子目录

| 目录 | 职责 |
|------|------|
| `app/page.tsx` / `layout.tsx` | 根入口、全局布局 |
| `app/pages/` | 按路由组织的页面（`home/`、`books/`、`settings-ai/`） |
| `app/pages/*/components/` | 页面级业务组件 |
| `app/pages/*/hooks/` | 页面级 React Hooks |
| `app/pages/*/api/` | 页面级客户端 API 封装 |
| `app/api/` | API 路由适配层（`route.ts`） |
| `app/api-client/` | 客户端通用请求封装（`Result<T>` 模式） |
| `app/components/` | 应用壳组件（`app-shell/`、`layout-shell`） |
| `app/types/` | 共享 TypeScript 类型 |
| `app/utils/` | 客户端工具函数 |
| `app/globals.css` | 全局样式与 CSS 变量（Design Tokens） |

### 3.2 代码放置速查

| 代码特征 | 放置位置 |
|----------|----------|
| 页面、组件、路由级 UI | `app/pages/` |
| 页面级 Hooks | `app/pages/*/hooks/` |
| 客户端 API 封装 | `app/pages/*/api/` 或 `app/api-client/` |
| API 路由适配 | `app/api/` |
| 跨层 UI 组件 | `shared/ui/` |
| 跨层类型合约 | `shared/ai/` 或 `app/types/` |

## 4. 清理规则

- 删除重复实现，不留备份目录。
- 无用代码直接删除，不留注释占位或 TODO 残留。
- 保持 `app + server + shared + data + docs` 五层结构。

## 5. 样式规范

- 使用 CSS Modules，不使用全局 class 或 CSS-in-JS。
- 所有颜色/字体/间距/边框定义为 CSS 变量（`app/globals.css`）。
- 主题系统通过 React Context + CSS 变量注入（4 套预设主题）。
- 详见 [视觉规范](./visual.md)。
