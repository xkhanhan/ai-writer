# 请求规范

> HTTP API 路由与请求/响应规范。

## 1. RESTful 风格

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/[resource]` | 获取列表 |
| GET | `/api/[resource]/[id]` | 获取单个资源 |
| POST | `/api/[resource]` | 创建资源 |
| PATCH | `/api/[resource]/[id]` | 更新资源 |
| DELETE | `/api/[resource]/[id]` | 删除资源 |

## 2. 路由文件职责

路由文件（`route.ts`）只做三件事：

```
解析请求参数 → 调用 server/ 层处理 → 返回 JSON 响应
```

禁止在路由文件中编写业务逻辑、直接操作数据库。

```typescript
// ✅ 正确
export async function GET() {
  try {
    const books = await listBooks();
    return NextResponse.json({ success: true, books });
  } catch {
    return jsonError("数据读取失败。", 500);
  }
}

// ❌ 错误 — 路由中包含业务逻辑
export async function GET() {
  const db = await getDb();
  const books = db.prepare("SELECT * FROM books").all();
  return Response.json(books);
}
```

## 3. 响应格式

成功响应：

```json
{ "success": true, "data": { ... } }
```

错误响应：

```json
{ "error": "BOOK_NOT_FOUND", "message": "书籍不存在" }
```

## 4. HTTP 状态码

| 状态码 | 用途 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 参数错误 / 验证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 5. 错误处理

使用统一的 `BusinessError` 类和 `handleError` 函数。详见 [后端架构规范 - 错误处理](./architecture.md)。
