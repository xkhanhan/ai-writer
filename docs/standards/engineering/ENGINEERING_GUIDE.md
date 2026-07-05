# 工程实践指南

本文档定义 novel-writer 项目的工程实践标准，涵盖构建验证、依赖管理、API 设计和错误处理。

---

## 一、构建与验证

### 1.1 开发命令

| 命令 | 用途 | 何时运行 |
|------|------|----------|
| `npm run dev` | 启动本地开发服务器（Next.js） | 日常开发 |
| `npm run build` | 执行生产构建 | 提交前、部署前 |
| `npm run typecheck` | TypeScript 类型检查（不生成文件） | 提交前 |
| `npm run lint` | ESLint 代码检查 | 提交前 |

### 1.2 提交前必检

每次提交代码前，**必须**通过以下验证：

```bash
# 第一步：类型检查
npm run typecheck

# 第二步：代码规范检查
npm run lint

# 第三步：生产构建验证
npm run build
```

三项全部通过后才能提交。任何一项失败都必须修复后再提交。

### 1.3 PR 验证清单

提交 Pull Request 前，确认以下项目：

- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过
- [ ] 代码中没有遗留的 `console.log`
- [ ] 没有未使用的 import

---

## 二、依赖管理

### 2.1 包管理器

本项目使用 **npm** 作为包管理器。不要混用 yarn 或 pnpm。

### 2.2 新增依赖规则

在引入新的第三方依赖前，需要评估以下内容：

1. **必要性**：是否真的需要新依赖？能否用已有依赖或原生实现？
2. **体积影响**：新增依赖对 bundle size 的影响。使用 [bundlephobia](https://bundlephobia.com) 检查包大小
3. **维护状态**：依赖是否活跃维护？最近的版本更新时间？
4. **安全性**：是否存在已知的安全漏洞？

### 2.3 依赖分类

| 类型 | 说明 | 示例 |
|------|------|------|
| 生产依赖 | 运行时必需 | `react`, `antd`, `zod` |
| 开发依赖 | 仅开发时使用 | `typescript`, `eslint`, `@types/*` |

### 2.4 安装依赖

```bash
# 生产依赖
npm install <package-name>

# 开发依赖
npm install -D <package-name>
```

安装完成后更新 `package-lock.json`，一并提交。

---

## 三、API 设计规范

### 3.1 RESTful 风格

遵循 RESTful API 设计约定：

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/[resource]` | 获取列表 |
| GET | `/api/[resource]/[id]` | 获取单个资源 |
| POST | `/api/[resource]` | 创建资源 |
| PATCH | `/api/[resource]/[id]` | 更新资源 |
| DELETE | `/api/[resource]/[id]` | 删除资源 |

### 3.2 路由文件职责

API 路由文件（`route.ts`）保持精简，只做三件事：

```
解析请求参数 → 调用 server/ 层处理 → 返回 JSON 响应
```

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
  // ...大量业务处理逻辑
  return Response.json(books);
}
```

### 3.3 请求参数处理

```typescript
export async function GET(request: Request) {
  // 1. 解析查询参数
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");

  // 2. 解析请求体（POST/PUT/PATCH）
  const body = await request.json();

  // 3. 调用 server 层
  const result = await service.doSomething(params);

  // 4. 返回 JSON
  return NextResponse.json(result);
}
```

### 3.4 响应格式

**成功响应：**

```json
// 单个资源
{
  "id": "xxx",
  "title": "示例书籍",
  "createdAt": "2026-07-05T00:00:00Z"
}

// 列表资源
[
  { "id": "1", "title": "书籍一" },
  { "id": "2", "title": "书籍二" }
]
```

**错误响应：**

```json
{
  "error": "BOOK_NOT_FOUND",
  "message": "书籍不存在"
}
```

### 3.5 HTTP 状态码

| 状态码 | 用途 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 / 验证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 四、错误处理规范

### 4.1 客户端错误处理

客户端使用 `antd` 的 `message` 组件展示错误信息：

```typescript
import { message } from "antd";

try {
  await createBook(data);
  message.success("书籍创建成功");
} catch (error) {
  message.error("创建失败，请重试");
}
```

### 4.2 服务端错误处理

服务端使用统一的错误处理中间件：

```typescript
import { NextResponse } from "next/server";
import { BusinessError } from "@/server/utils/errors";

export function handleError(error: unknown): NextResponse {
  // 业务错误：返回对应状态码和错误信息
  if (error instanceof BusinessError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.statusCode }
    );
  }

  // 其他错误：返回 500，不暴露内部信息
  console.error("Unhandled error:", error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "服务器内部错误" },
    { status: 500 }
  );
}
```

### 4.3 错误处理原则

| 原则 | 说明 |
|------|------|
| **不暴露内部信息** | 永远不要把数据库错误、堆栈信息等内部细节返回给客户端 |
| **使用业务错误码** | 使用预定义的 `BusinessError` 类，携带语义化的 `code` 字段 |
| **客户端友好提示** | 前端使用 `message.error()` 向用户展示友好的中文提示 |
| **服务端记录日志** | 服务端错误必须记录到日志，方便排查问题 |
| **适当 HTTP 状态码** | 根据错误类型返回正确的 HTTP 状态码 |

### 4.4 常见错误场景

| 场景 | 客户端处理 | 服务端处理 |
|------|-----------|-----------|
| 网络请求失败 | `message.error("网络异常，请检查网络")` | — |
| 参数验证失败 | `message.error("请检查填写内容")` | 返回 400 + 验证错误详情 |
| 资源不存在 | `message.error("内容不存在")` | 返回 404 + `BusinessError` |
| AI 服务异常 | `message.error("AI 服务暂时不可用")` | 返回 502 + 日志记录 |
| 未知服务器错误 | `message.error("服务器异常，请稍后重试")` | 返回 500 + 详细日志 |

---

## 五、日志规范

### 5.1 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| `info` | 正常操作记录 | 创建书籍、更新配置 |
| `warn` | 异常但可恢复的情况 | 配置项缺失，使用默认值 |
| `error` | 错误，需要关注 | 数据库操作失败、AI 调用异常 |
| `debug` | 调试信息，仅开发环境 | 请求参数、响应数据 |

### 5.2 使用规则

```typescript
import { logger } from "@/server/utils/logger";

// 记录正常操作
logger.info("Book created", { id: book.id, title: book.title });

// 记录错误
logger.error("Failed to create book", error);

// 开发环境调试信息（生产环境自动忽略）
logger.debug("API request", { method: "GET", path: "/api/books" });
```

### 5.3 注意事项

- 不要在日志中输出密码、密钥等敏感信息
- `debug` 日志仅在 `NODE_ENV === "development"` 时输出
- 生产环境可考虑引入结构化日志方案
