# 后端代码规范

> Next.js API Route 与 server/ 代码编码规范。

## 1. API Route 编码

- 路由文件保持精简：解析请求 → 调用 `server/` 函数 → 返回 JSON。
- 每个路由文件只处理一种 HTTP 方法。
- 使用 `try/catch` 包裹 `server/` 调用，错误通过 `handleError` 统一处理。

## 2. Store 编码

- 每个 `*-store.ts` 负责一张表的 CRUD。
- 导出独立的异步函数，不使用 class。
- 使用 `getDb()` 获取数据库连接，不自行创建连接。
- 所有 SQL 使用参数化查询：

```typescript
// ✅ 正确
db.prepare("SELECT * FROM books WHERE id = ?").get(id) as unknown as BookRow;

// ❌ 错误 — 字符串拼接
db.prepare(`SELECT * FROM books WHERE id = '${id}'`).get();
```

## 3. 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| Store 文件 | `*-store.ts` | `books-store.ts` |
| 路由文件 | `route.ts` | `app/api/books/route.ts` |
| 工具函数 | `camelCase` | `getDb()`, `generateId()` |
| 错误类 | `PascalCase` | `BusinessError` |

## 4. 验证

后端代码同样需要通过 `npm run typecheck` 和 `npm run lint`。
