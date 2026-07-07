# 后端架构规范

> server/ 目录结构与 server-only 约束。前端架构详见 [前端架构规范](../frontend/architecture.md)。

## 1. server/ 目录结构

| 目录 | 职责 |
|------|------|
| `server/storage/` | 数据持久化：SQLite 读写、数据库连接与迁移 |
| `server/ai/` | AI Provider 调用与配置持久化 |
| `server/utils/` | 服务端工具函数（ID 生成、错误处理、日志） |

## 2. Server-Only 约束

- `server/` 代码**禁止**被客户端组件直接导入。
- 前后端通信只能通过 `app/api/` 路由。
- 路由文件（`route.ts`）是唯一的中间层：解析请求 → 调用 `server/` 函数 → 返回 JSON。

## 3. 数据访问模式

- 使用导出函数模式（`listBooks()`、`createBook()`），每个 `*-store.ts` 负责一张表的 CRUD。
- 数据库连接通过 `getDb()` 获取（`server/storage/db.ts`）。
- 不存在 Service / Repository / Model 分层，不存在依赖注入。
- 详见 [数据库规范](./database.md)。

## 4. 错误处理

```typescript
// server/utils/errors.ts
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

// app/api/route.ts 中统一处理
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

## 5. 日志规范

| 级别 | 用途 |
|------|------|
| `info` | 正常操作记录（创建书籍、更新配置） |
| `warn` | 异常但可恢复 |
| `error` | 错误，需要关注 |
| `debug` | 调试信息（仅开发环境） |

- 禁止在日志中输出密码、密钥等敏感信息。

## 6. 架构红线

| 禁止 | 说明 |
|------|------|
| `server/` 代码导入到客户端 | 违反分层隔离 |
| 在路由文件中编写业务逻辑 | 路由层只做适配 |
| 引入第二个并行目录结构 | 只有唯一的 `app + server + shared` 结构 |
