# 工程规范

> AI 直接遵循。每次提交前必须通过所有验证命令。

---

## 1. 验证命令

| 命令 | 用途 | 强制时机 |
|------|------|----------|
| `npm run typecheck` | TypeScript 类型检查（不生成文件） | 提交前 |
| `npm run lint` | ESLint 代码检查 | 提交前 |
| `npm run build` | 生产构建验证 | 提交前 |

Rule: 三项全部通过才能提交。任何一项失败必须修复后再提交。

---

## 2. 目录结构

```
app/          # Next.js 前端
server/       # 服务端
shared/       # 跨层复用
data/         # 运行时数据
docs/         # 项目文档
```

### 2.1 `app/` — 前端层

Next.js 应用主体。所有前端行为和路由组合在此。

| 目录 | 职责 |
|------|------|
| `app/page.tsx` / `app/layout.tsx` | 首页入口和全局布局 |
| `app/pages/` | 按路由组织的页面组件（`home/`、`books/`、`settings-ai/`） |
| `app/pages/*/components/` | 页面级业务组件 |
| `app/pages/*/hooks/` | 页面级 React hooks |
| `app/pages/*/api/` | 页面级客户端 API 调用封装 |
| `app/pages/*/config/` | 页面级配置（如面板布局） |
| `app/pages/*/utils/` | 页面级工具函数 |
| `app/api/` | Next.js API 路由适配层（`route.ts`） |
| `app/api-client/` | 客户端通用 API 请求封装 |
| `app/components/` | 应用壳组件（`app-shell/`、`layout-shell`、`shell-provider`） |
| `app/types/` | 前端共享 TypeScript 类型定义 |
| `app/utils/` | 前端通用工具函数 |
| `app/constants/` | 前端常量 |
| `app/globals.css` | 全局样式与 CSS 变量（Design Tokens） |

Rule:
- `app/` 拥有前端行为和路由组合。
- 可调用 `server/*`，但不拥有持久化逻辑。
- 页面间通过自定义事件通信（如 `navigate-settings`），不直接互相导入。

### 2.2 `server/` — 服务端层

服务端业务逻辑和数据持久化。客户端组件禁止直接导入。

| 目录 | 职责 |
|------|------|
| `server/storage/` | 数据库访问与文件持久化（SQLite） |
| `server/ai/` | AI 配置管理和 Provider 调用 |
| `server/utils/` | 服务端工具函数 |

Rule:
- 数据访问、模型/Provider 集成只在此层。
- 路由适配层（`app/api/route.ts`）调用此层，自身不包含业务逻辑。

### 2.3 `shared/` — 跨层复用

跨层共享的合约类型和可复用 UI 组件。

| 目录 | 职责 |
|------|------|
| `shared/ui/` | 设计系统组件库（`split-panel`、`empty-state`、`confirm-delete`、`save-button`、`ai-dropdown`、`array-input`、`theme`） |
| `shared/ai/` | AI Provider 合约与配置类型 |

Rule:
- 保持精简。用于合约定义，不用于页面归属逻辑。
- 不引用 `app/` 或 `server/` 的具体实现。

### 2.4 `data/` — 运行时数据

SQLite 数据库文件和 JSON 配置。不存放源代码。

### 2.5 依赖方向

允许：

```
app → server
app → shared
server → shared
```

禁止：

```
server → app
shared → app
shared → server 实现细节
```

### 2.6 代码放置速查

| 代码特征 | 放置位置 |
|----------|----------|
| 页面、页面组件、路由级 UI | `app/pages/` |
| 页面级 hooks | `app/pages/*/hooks/` |
| 客户端 API 调用封装 | `app/pages/*/api/` 或 `app/api-client/` |
| 路由级工具函数 | `app/utils/` |
| API 路由适配（解析请求→调用 server→返回 JSON） | `app/api/` |
| 数据库访问、文件 IO | `server/storage/` |
| AI 配置、Provider 调用 | `server/ai/` |
| 服务端工具函数 | `server/utils/` |
| 跨层共享的 UI 组件 | `shared/ui/` |
| 跨层共享的类型合约 | `shared/ai/` 或 `app/types/` |

---

## 3. 依赖管理

- 本项目使用 **npm** 作为包管理器。禁止混用 yarn 或 pnpm。
- 新增依赖前必须评估：
  1. **必要性**：能否用已有依赖或原生实现？
  2. **体积影响**：用 [bundlephobia](https://bundlephobia.com) 检查包大小
  3. **维护状态**：是否活跃维护？最近版本更新时间？
  4. **安全性**：是否存在已知安全漏洞？

| 类型 | 说明 | 示例 |
|------|------|------|
| `dependencies` | 运行时必需 | `react`, `antd`, `next` |
| `devDependencies` | 仅开发时使用 | `typescript`, `eslint`, `@types/*` |

安装后更新 `package-lock.json`，一并提交。

---

## 4. API 设计规范

### 4.1 RESTful 风格

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/[resource]` | 获取列表 |
| GET | `/api/[resource]/[id]` | 获取单个资源 |
| POST | `/api/[resource]` | 创建资源 |
| PATCH | `/api/[resource]/[id]` | 更新资源 |
| DELETE | `/api/[resource]/[id]` | 删除资源 |

### 4.2 路由文件职责

路由文件（`route.ts`）只做三件事：

```
解析请求参数 → 调用 server/ 层处理 → 返回 JSON 响应
```

禁止在路由文件中编写业务逻辑、直接操作数据库或包含大量数据转换。

```typescript
// ✅ 正确：路由文件精简
import { NextResponse } from "next/server";
import { BookService } from "@/server/services/book.service";

export async function GET(request: Request) {
  try {
    const books = await new BookService().getBooks();
    return NextResponse.json(books);
  } catch (error) {
    return handleError(error);
  }
}

// ❌ 错误：路由文件包含业务逻辑
export async function GET(request: Request) {
  const db = await getDb();
  const books = db.prepare("SELECT * FROM books").all();
  return Response.json(books);
}
```

### 4.3 响应格式

成功响应直接返回数据对象或数组：

```json
{ "id": "xxx", "title": "示例书籍" }
```

错误响应：

```json
{ "error": "BOOK_NOT_FOUND", "message": "书籍不存在" }
```

### 4.4 HTTP 状态码

| 状态码 | 用途 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 / 验证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 5. 错误处理规范

### 5.1 客户端

使用 `antd` 的 `message` 组件展示用户友好的错误提示。成功用 `message.success()`，失败用 `message.error()`。

### 5.2 服务端

使用统一的 `BusinessError` 类和 `handleError` 函数：

```typescript
import { NextResponse } from "next/server";
import { BusinessError } from "@/server/utils/errors";

export function handleError(error: unknown): NextResponse {
  if (error instanceof BusinessError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.statusCode }
    );
  }
  console.error("Unhandled error:", error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "服务器内部错误" },
    { status: 500 }
  );
}
```

### 5.3 原则

| 原则 | 说明 |
|------|------|
| 禁止暴露内部信息 | 永远不要将数据库错误、堆栈信息返回给客户端 |
| 使用业务错误码 | 使用 `BusinessError` 类，携带语义化 `code` 字段 |
| 客户端友好提示 | 前端使用 `message.error()` 展示中文提示 |
| 服务端记录日志 | 服务端错误必须记录日志 |
| 适当 HTTP 状态码 | 根据错误类型返回正确的状态码 |

常见场景速查：网络失败→客户端提示；参数错误→400；资源不存在→404；AI 异常→502；未知错误→500 + 日志。

---

## 6. 日志规范

| 级别 | 用途 | 示例 |
|------|------|------|
| `info` | 正常操作记录 | 创建书籍、更新配置 |
| `warn` | 异常但可恢复 | 配置项缺失，使用默认值 |
| `error` | 错误，需要关注 | 数据库操作失败、AI 调用异常 |
| `debug` | 调试信息 | 请求参数、响应数据 |

```typescript
import { logger } from "@/server/utils/logger";

logger.info("Book created", { id: book.id, title: book.title });
logger.error("Failed to create book", error);
logger.debug("API request", { method: "GET", path: "/api/books" });
```

Rule:
- `debug` 仅在 `NODE_ENV === "development"` 时输出。
- 禁止在日志中输出密码、密钥等敏感信息。
- 生产环境可引入结构化日志方案。

---

## 7. 清理规则

- 删除重复实现，不留备份目录（如 `features/` 已废弃，不在其中新增文件）。
- 无用代码直接删除，不留注释占位或 TODO 残留。
- 如果一个目录不再属于活跃架构，迁移所需内容后删除其余部分。
- 保持只有 `app + server + shared + data + docs` 五层结构，不引入平行结构。

---

## 8. 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 组件文件 | `kebab-case.tsx` | `book-info-form.tsx` |
| 工具文件 | `kebab-case.ts` | `id-generator.ts` |
| 路由处理器 | `route.ts` | `app/api/books/route.ts` |
| 页面入口 | `page.tsx` | `app/page.tsx` |
| 类型名 | `PascalCase` | `Book`, `ChapterConfig` |
| 函数和变量 | `camelCase` | `getBookById`, `chapterList` |
| CSS Module | `index.module.css` | 与组件同目录 |

---

## 9. 样式规范

- 使用 CSS Modules，不使用全局 class 或 CSS-in-JS。
- 所有颜色、字体、间距、边框定义为 CSS 变量，在 `app/globals.css` 中声明。
- 主题系统通过 React Context + CSS 变量注入实现（4 套预设主题）。
- 按钮规则：行内按钮用 `size="small"`；新增按钮用 `type="primary"`；删除按钮用 `danger`。

---

## 10. 架构红线

| 禁止 | 说明 |
|------|------|
| `server/` 代码导入到客户端组件 | 违反分层隔离 |
| 在 `shared/` 中引用具体实现 | 共享层应保持框架无关 |
| 在路由文件中编写业务逻辑 | 路由层只做适配 |
| 引入第二个并行目录结构 | 只有唯一的 `app + server + shared` 结构 |
| 跳过验证命令直接提交 | typecheck + lint + build 三项必须全部通过 |
