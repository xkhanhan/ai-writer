# 前端 API 规范

> 前端数据请求层规范。API Client 统一拦截错误，业务层只关心结果。

## 1. 架构：漏斗式错误处理

```
API Client (api-client/)   → 拦截所有异常，返回 Result<T>
API 函数 (pages/*/api/)     → 透传 Result<T>
Hooks (pages/*/hooks/)      → 检查 result.ok，调用 showError/showSuccess
页面组件                     → 仅处理业务逻辑，无 try/catch
```

## 2. Result 类型

```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

定义于 `app/api-client/client.ts`，所有 API 函数统一返回 `Result<T>`。

## 3. API Client

```typescript
// app/api-client/client.ts
class ApiClient {
  async request<TResponse>(url: string, config?: RequestConfig): Promise<Result<TResponse>>
  get<TResponse>(url: string, params?: Record<string, string>): Promise<Result<TResponse>>
  post<TResponse, TBody>(url: string, body?: TBody): Promise<Result<TResponse>>
  patch<TResponse, TBody>(url: string, body?: TBody): Promise<Result<TResponse>>
  put<TResponse, TBody>(url: string, body?: TBody): Promise<Result<TResponse>>
  delete<TResponse>(url: string): Promise<Result<TResponse>>
}
```

- `request()` 内部 catch 所有异常，返回 `{ ok: false, error: message }`。
- 禁止在 API 函数层抛出异常。

## 4. API 函数编写规则

每个 API 函数文件位于 `app/pages/{page}/api/`，负责透传 `Result<T>`：

```typescript
// ✅ 正确
export async function fetchItems(bookId: string): Promise<Result<Item[]>> {
  const res = await client.get<{ items: Item[] }>("/api/items", { bookId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.items ?? [] };
}

// ❌ 错误 — 抛出异常
export async function fetchItems(bookId: string): Promise<Item[]> {
  const res = await client.get<{ items: Item[] }>("/api/items", { bookId });
  return res.items;  // res 可能是 error
}
```

## 5. Hook 层处理

Hooks 检查 `result.ok`，调用消息工具，返回干净数据：

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

- 禁止在 Hook 中使用 try/catch 处理 API 错误。
- 成功提示用 `showSuccess()`，错误提示用 `showError()`。
- 工具函数定义于 `app/utils/error-handler.ts`。

## 6. 禁止事项

| 禁止 | 说明 |
|------|------|
| Hook/组件中 try/catch API 错误 | 错误在 Client 层统一拦截 |
| API 函数层抛出异常 | 所有异常返回 `Result<T>` |
| 使用 `message.error` / `message.success` | 统一用 `showError` / `showSuccess` |
| 使用 `ApiError` 类 | 已移除，错误以字符串形式传递 |
