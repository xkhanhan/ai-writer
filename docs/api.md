# API Specification

## Funnel Error Handling

Errors are caught at the API Client layer. Business code never handles HTTP errors.

```
API Client (catch all → Result<T>)  →  API functions (passthrough)  →  Hooks (check ok, show message)  →  Page (business logic only)
```

### Result Type

```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

Defined in `app/api-client/client.ts`.

### API Client

```typescript
// app/api-client/client.ts
class ApiClient {
  get<T>(url: string, params?: Record<string, string>): Promise<Result<T>>;
  post<T, B>(url: string, body?: B): Promise<Result<T>>;
  patch<T, B>(url: string, body?: B): Promise<Result<T>>;
  put<T, B>(url: string, body?: B): Promise<Result<T>>;
  delete<T>(url: string): Promise<Result<T>>;
}
```

`request()` internally catches all exceptions and returns `{ ok: false, error: message }`.

### API Function Rules

```typescript
// ✅ — passthrough Result<T>
export async function fetchItems(bookId: string): Promise<Result<Item[]>> {
  const res = await client.get<{ items: Item[] }>("/api/items", { bookId });
  if (!res.ok) return res;
  return { ok: true, data: res.data.items ?? [] };
}

// ❌ — throws exception
export async function fetchItems(bookId: string): Promise<Item[]> {
  const res = await client.get<{ items: Item[] }>("/api/items", { bookId });
  return res.items;
}
```

### Hook Layer

```typescript
const loadItems = useCallback(async () => {
  setLoading(true);
  const result = await fetchItems(book.id);
  if (result.ok) {
    setItems(result.data);
  } else {
    showError(result.error || "Load failed");
  }
  setLoading(false);
}, [book.id]);
```

## RESTful Conventions

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/[resource]` | List |
| GET | `/api/[resource]/[id]` | Get one |
| POST | `/api/[resource]` | Create |
| PATCH | `/api/[resource]/[id]` | Update |
| DELETE | `/api/[resource]/[id]` | Delete |

## Response Format

Success: `{ "success": true, "data": { ... } }`
Error: `{ "error": "CODE", "message": "description" }`

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 404 | Resource not found |
| 500 | Internal server error |

## Prohibitions

| Forbidden | Reason |
|-----------|--------|
| try/catch in hooks/components for API errors | Errors caught at Client layer |
| Throwing in API functions | All errors returned as Result<T> |
| `message.error()` / `message.success()` | Use `showError()` / `showSuccess()` |
| `ApiError` class | Removed — errors are plain strings |
| Business logic in route files | Routes are thin adapters only |
