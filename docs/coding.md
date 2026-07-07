# Coding Standards

## TypeScript

- `strict: true` — 类型错误零容忍
- 缩进：2 空格，UTF-8，LF 换行
- **禁止 `any`**。例外：DB 查询使用 `as unknown as RowType`
- `interface` 用于对象形状；`type` 用于联合/交叉/条件类型
- 命名：class/interface PascalCase，function/variable camelCase，常量 UPPER_SNAKE_CASE

## React / Next.js

- 需要浏览器 API、状态或副作用的组件：`"use client"`
- 文件命名：组件 `kebab-case.tsx`，非组件 `kebab-case.ts`
- 导出组件名：PascalCase
- Props 接口：`ComponentNameProps` 后缀
- 自定义 hooks：`app/pages/{page}/hooks/use-xxx.ts`（跨页面放 `shared/hooks/`）
- 样式：优先 CSS Modules，禁止内联样式（微调布局除外）

## React Hooks 规则

### 状态管理

```typescript
// ✅ — 简单状态用 useState + useCallback
const [items, setItems] = useState<Item[]>([]);
const loadItems = useCallback(async () => {
  const result = await fetchItems(bookId);
  if (result.ok) setItems(result.data);
}, [bookId]);

// ✅ — 复杂联动状态用 useReducer
type State = { volumes: Volume[]; chapters: Map<string, Chapter[]>; view: ViewMode };
type Action = { type: "SET_VOLUMES"; volumes: Volume[] } | { type: "SET_VIEW"; view: ViewMode };
function reducer(state: State, action: Action): State { ... }
const [state, dispatch] = useReducer(reducer, initialState);
```

**何时用 useReducer：** 当一个 hook 管理 3 个以上相互关联的 useState，且更新逻辑涉及多个状态联动时。

### useEffect 规则

```typescript
// ✅ — 正确：异步操作在 effect 内部定义
useEffect(() => {
  let cancelled = false;
  async function load() {
    const result = await fetchItems(bookId);
    if (!cancelled && result.ok) setItems(result.data);
  }
  load();
  return () => { cancelled = true; };
}, [bookId]);

// ❌ — 错误：渲染期间调用 setState
if (id !== prevId) {
  setPrevId(id);      // 触发额外渲染
  setContent(data);   // 违反 React 规则
}

// ✅ — 修正：用 useEffect
useEffect(() => {
  setPrevId(id);
  setContent(data);
  setDirty(false);
}, [id]);
```

### setTimeout / setInterval

```typescript
// ✅ — 必须在 cleanup 中清除
useEffect(() => {
  const timer = setTimeout(() => { ... }, 500);
  return () => clearTimeout(timer);
}, [dependency]);
```

**禁止：** setTimeout 无 cleanup — 组件卸载后 timer 仍执行会导致已卸载组件的 setState。

### 依赖数组

```typescript
// ✅ — 包含所有引用的外部变量
const handleSave = useCallback(async () => {
  await saveChapter(chapter.id, content);
}, [chapter.id, content]);

// ❌ — 空依赖但内部使用了外部变量
const handleSave = useCallback(async () => {
  await saveChapter(chapter.id, content);  // chapter.id 和 content 可能过期
}, []);
```

**例外：** 如果回调只使用 `setState` 函数（稳定的引用）和模块级导入，空依赖是安全的。但应在注释中说明原因。

### 竞态条件

```typescript
// ✅ — 使用递增请求 ID 防止旧请求覆盖新请求
const requestIdRef = useRef(0);
const loadBook = useCallback(async (id: string) => {
  const requestId = ++requestIdRef.current;
  const result = await getBookById(id);
  if (requestId === requestIdRef.current && result.ok) {
    setBook(result.data);
  }
}, []);
```

## CSS Modules

- 文件名：`index.module.css`，与组件同目录
- 类名：camelCase（`.cardTitle` 不是 `.card-title`）
- **禁止硬编码颜色** — 使用 CSS 变量（见 [visual.md](./visual.md)）
- 响应式断点：`@media (max-width: 768px)` 为主，`480px` 和 `1024px` 为辅
- **禁止** `!important`（通过类嵌套提升优先级）
- **禁止** `:global(.ant-xxx)` 覆盖 antd 样式（使用 ConfigProvider tokens）

## Error Boundary

项目**必须**有全局 Error Boundary。当组件运行时错误发生时，提供恢复机制而非白屏。

```typescript
// app/error.tsx — Next.js App Router 约定的错误边界
"use client";
export default function ErrorBoundary({ error, reset }) {
  return (
    <div>
      <h2>出错了</h2>
      <p>{error.message}</p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}
```

## API 路由编码

路由文件是薄适配器 — 解析请求 → 调用 server/ 函数 → 返回 JSON。

```typescript
// ✅
import { jsonSuccess, jsonError } from "@/app/api/utils";
export async function GET() {
  try {
    const books = await listBooks();
    return jsonSuccess({ books });
  } catch (e) {
    return jsonError("INTERNAL_ERROR", "加载失败", 500);
  }
}

// ❌ 路由中包含业务逻辑
export async function GET() {
  const db = getDb();
  const books = db.prepare("SELECT * FROM books").all();
  return Response.json(books);
}
```

## Store 编码

- 每张表一个 `*-store.ts`，导出独立函数（不使用 class）
- 使用 `getDb()` 获取连接（禁止自行创建）
- SQL 必须参数化：

```typescript
// ✅
db.prepare("SELECT * FROM books WHERE id = ?").get(id) as unknown as BookRow;

// ❌ 字符串拼接
db.prepare(`SELECT * FROM books WHERE id = '${id}'`).get();
```

- Update 函数使用 map 驱动模式（避免大量 if-push）：

```typescript
// ✅ — map 驱动
const fieldMap: Record<string, string> = { title: "title", summary: "summary" };
for (const [key, col] of Object.entries(fieldMap)) {
  if (data[key] !== undefined) { fields.push(`${col} = ?`); values.push(data[key]); }
}

// ❌ — 逐字段 if-push（冗长且易遗漏）
if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
if (data.summary !== undefined) { fields.push("summary = ?"); values.push(data.summary); }
```

## 验证（每次提交前必须）

| 命令 | 用途 |
|------|------|
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码质量 |
| `npm run build` | 生产构建验证 |

三项全部通过，无例外。

## 包管理

- **仅 npm** — 禁止混合使用 yarn / pnpm
- `package-lock.json` 必须提交
- 新依赖评估：必要性 → 包大小 → 维护性 → 安全性
