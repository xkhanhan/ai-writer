# API Specification

## 漏斗式错误处理

错误在 API Client 层捕获，业务代码永远不处理 HTTP 错误。

```
API Client（捕获所有异常 → Result<T>）→ API 函数（透传）→ Hook（检查 ok / 显示消息）→ 页面（仅业务逻辑）
```

### Result 类型

```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

定义在 `app/api-client/client.ts`。所有 API 调用返回 `Result<T>`，**永不抛异常**。

### API Client

```typescript
class ApiClient {
  get<T>(url: string, params?: Record<string, string>): Promise<Result<T>>;
  post<T, B>(url: string, body?: B): Promise<Result<T>>;
  patch<T, B>(url: string, body?: B): Promise<Result<T>>;
  put<T, B>(url: string, body?: B): Promise<Result<T>>;
  delete<T>(url: string): Promise<Result<T>>;
}
```

### API 函数规范

```typescript
// ✅ — 透传 Result<T>
export async function fetchItems(bookId: string): Promise<Result<Item[]>> {
  const res = await client.get<{ success: boolean; items: Item[] }>("/api/items", { bookId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.items ?? [] };
}

// ❌ — 抛出异常
export async function fetchItems(bookId: string): Promise<Item[]> {
  const res = await client.get<{ items: Item[] }>("/api/items", { bookId });
  return res.items;  // 如果 res.ok === false，这里会崩溃
}
```

### Hook 层规范

```typescript
const loadItems = useCallback(async () => {
  setLoading(true);
  const result = await fetchItems(book.id);
  if (result.ok) {
    setItems(result.data);
  } else {
    showError(result.error || "加载失败");
  }
  setLoading(false);
}, [book.id]);
```

**禁止：** 在 Hook 或组件中使用 `try/catch` 处理 API 错误。

## RESTful 约定

| Method | Path | 用途 | 成功状态码 |
|--------|------|------|-----------|
| GET | `/api/[resource]` | 列表查询 | 200 |
| GET | `/api/[resource]/[id]` | 单条查询 | 200 |
| POST | `/api/[resource]` | 创建 | 201 |
| PATCH | `/api/[resource]/[id]` | 部分更新 | 200 |
| DELETE | `/api/[resource]/[id]` | 删除 | 200 |

**PUT vs PATCH 规则：** 统一使用 PATCH 执行部分更新。PUT 仅在需要完整替换资源时使用（当前项目中不使用 PUT）。

## 响应格式

### 成功响应

```json
{ "success": true, "data": { ... } }
```

### 错误响应

```json
{ "success": false, "error": "ERROR_CODE", "message": "人类可读的错误描述" }
```

**关键：错误响应必须包含 `success: false` 字段**，与成功格式对称。禁止只返回 `{ error: "..." }`。

### 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | 成功 | GET / PATCH / DELETE 成功 |
| 201 | 已创建 | POST 创建成功 |
| 400 | 请求错误 | 参数校验失败、业务规则违反 |
| 404 | 资源不存在 | GET / DELETE 找不到资源 |
| 500 | 服务器错误 | 未预期的异常 |

## API 路由层规范

### 路由文件结构

```typescript
import { jsonSuccess, jsonError } from "@/app/api/utils";

export async function GET(request: NextRequest) {
  try {
    const bookId = request.nextUrl.searchParams.get("bookId");
    if (!bookId) return jsonError("MISSING_PARAM", "bookId is required", 400);

    const items = await getItemsByBookId(bookId);
    return jsonSuccess({ items });
  } catch (e) {
    console.error("Failed to fetch items:", e);
    return jsonError("INTERNAL_ERROR", "加载失败", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 校验必填字段
    if (body.name !== undefined && typeof body.name !== "string") {
      return jsonError("INVALID_TYPE", "name must be a string", 400);
    }

    const success = await updateItem(id, body);
    if (!success) return jsonError("NOT_FOUND", "资源不存在", 404);
    return jsonSuccess(null);
  } catch (e) {
    console.error("Failed to update item:", e);
    return jsonError("INTERNAL_ERROR", "更新失败", 500);
  }
}
```

### 路由层禁止事项

| 禁止 | 原因 |
|------|------|
| 直接操作数据库 | 路由是适配器，业务逻辑在 server/ |
| 缺少 try/catch | 未捕获异常会返回 Next.js 默认 500 页面 |
| 不检查 DELETE 返回值 | 可能返回 200 但实际未删除 |
| 将 body 直接透传给 store | 必须先校验字段类型 |
| 使用 PUT 执行部分更新 | 统一使用 PATCH |

## 禁止事项汇总

| 禁止 | 替代方案 |
|------|---------|
| Hook/组件中 try/catch 处理 API 错误 | 漏斗式错误处理 |
| API 函数中 throw | 所有错误返回 Result\<T\> |
| `message.error()` / `message.success()` | `showError()` / `showSuccess()` |
| 路由文件中的业务逻辑 | 路由仅做适配 |
| `{ error: "..." }` 格式 | `{ success: false, error: "...", message: "..." }` |
