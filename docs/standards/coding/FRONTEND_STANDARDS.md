# 前端工程规范

## 目录结构

```
app/                                    # 前端根目录（Next.js）
├── (公共基座)
│   ├── api-client/                     # API 请求基座
│   │   ├── index.ts                    # 统一导出
│   │   ├── client.ts                   # 请求客户端实例
│   │   ├── interceptors.ts             # 请求/响应拦截器
│   │   └── error-handler.ts            # 统一错误处理
│   │
│   ├── components/                     # 公共组件库
│   │   └── 组件名/
│   │       ├── index.tsx               # 组件入口
│   │       ├── index.module.css        # 组件样式
│   │       └── components/             # 子组件（如需要）
│   │
│   ├── hooks/                          # 公共 Hooks
│   │   └── use-xxx.ts
│   │
│   ├── types/                          # 公共类型定义
│   │   └── index.ts
│   │
│   ├── utils/                          # 公共工具函数
│   │   └── xxx.ts
│   │
│   └── constants/                      # 公共常量
│       └── index.ts
│
├── api/                                # Next.js API 路由（BFF层）
│   └── [resource]/
│       ├── route.ts                    # 路由处理
│       └── [id]/
│           └── route.ts
│
├── layout.tsx                          # 根布局
├── page.tsx                            # 首页
├── globals.css                         # 全局样式
│
└── [page]/                             # 页面目录（业务单元）
    ├── index.tsx                       # 页面入口（保持干净）
    │
    ├── api/                            # 页面专属 API
    │   ├── index.ts                    # 统一导出
    │   ├── books-api.ts                # 具体 API 实现
    │   └── book-options-api.ts
    │
    ├── components/                     # 页面组件
    │   └── 组件名/
    │       ├── index.tsx               # 组件入口
    │       ├── index.module.css        # 组件样式
    │       └── components/             # 子组件
    │
    ├── hooks/                          # 页面专属 Hooks
    │   └── use-xxx.ts
    │
    ├── types/                          # 页面专属类型
    │   └── index.ts
    │
    ├── constants/                      # 页面专属常量
    │   └── index.ts
    │
    ├── config/                         # 页面专属配置
    │   └── xxx.ts
    │
    └── utils/                          # 页面专属工具
        └── xxx.ts
```

## 核心原则

### 1. 入口清晰干净

**index.tsx 只负责组合，不包含复杂逻辑：**

```typescript
// ✅ 正确
export default function BookPage() {
  return (
    <Layout>
      <BookHeader />
      <BookContent />
      <BookFooter />
    </Layout>
  );
}

// ❌ 错误
export default function BookPage() {
  const [data, setData] = useState();
  useEffect(() => { /* 复杂逻辑 */ }, []);
  return <div>...</div>;
}
```

### 2. API 原子化

**API 文件提供完整能力，页面只管调用：**

```typescript
// ✅ 正确：api/books.ts
import { client } from '@/app/api-client';

export async function getBooks(): Promise<Book[]> {
  return client.get('/api/books');
}

export async function createBook(data: CreateBookDTO): Promise<Book> {
  return client.post('/api/books', data);
}

// 页面调用
const books = await getBooks();

// ❌ 错误：API 只写路径
export const BOOKS_API = '/api/books';
// 页面自己处理请求
```

### 3. 组件原子化

**组件只负责渲染，逻辑通过 Hooks 抽离：**

```typescript
// ✅ 正确
// hooks/use-books.ts
export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getBooks().then(setBooks).finally(() => setLoading(false));
  }, []);
  
  return { books, loading };
}

// components/book-list/index.tsx
export function BookList() {
  const { books, loading } = useBooks();
  
  if (loading) return <Loading />;
  return <div>{books.map(book => <BookCard key={book.id} book={book} />)}</div>;
}

// ❌ 错误：组件包含请求逻辑
export function BookList() {
  const [books, setBooks] = useState([]);
  useEffect(() => {
    fetch('/api/books').then(res => res.json()).then(setBooks);
  }, []);
}
```

### 4. 代码边界清晰

```
api/        → 只负责请求，返回数据
hooks/      → 只负责逻辑，返回状态和方法
components/ → 只负责渲染，接收 props
utils/      → 只负责工具函数
types/      → 只负责类型定义
constants/  → 只负责常量定义
config/     → 只负责配置数据
```

## 命名规范

### 文件命名

- **组件文件夹**：`kebab-case`（如 `book-card`）
- **组件文件**：`index.tsx`
- **样式文件**：`index.module.css`
- **Hook 文件**：`use-xxx.ts`
- **工具文件**：`xxx.ts`（如 `format-date.ts`）
- **类型文件**：`index.ts` 或 `xxx.types.ts`
- **常量文件**：`index.ts` 或 `xxx.constants.ts`

### 变量命名

- **组件**：`PascalCase`（如 `BookCard`）
- **函数**：`camelCase`（如 `getBooks`）
- **常量**：`UPPER_SNAKE_CASE`（如 `MAX_BOOK_COUNT`）
- **类型/接口**：`PascalCase`（如 `Book`, `CreateBookDTO`）

## 样式规范

### 使用 CSS Modules

```typescript
// ✅ 正确
import styles from './index.module.css';

export function BookCard() {
  return <div className={styles.container}>...</div>;
}

// ❌ 错误：内联样式
export function BookCard() {
  return <div style={{ padding: '16px' }}>...</div>;
}
```

### CSS 变量

使用全局 CSS 变量保持一致性：

```css
:root {
  --bg: #fafafa;
  --panel: #ffffff;
  --text: #1a1a1a;
  --muted: #666666;
  --line: #e8e8e8;
  --accent: #1a1a1a;
  --danger: #ff4d4f;
}
```

## 组件设计模式

### 容器组件 vs 展示组件

```typescript
// 容器组件：负责逻辑
export function BookListContainer() {
  const { books, loading } = useBooks();
  return <BookList books={books} loading={loading} />;
}

// 展示组件：负责渲染
export function BookList({ books, loading }: BookListProps) {
  if (loading) return <Loading />;
  return <div>{books.map(book => <BookCard key={book.id} book={book} />)}</div>;
}
```

### 复合组件模式

```typescript
// 使用 Context 实现复合组件
export function Tabs({ children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panels = TabsPanels;
Tabs.Panel = TabPanel;
```

## 状态管理

### 本地状态

```typescript
// 组件内部状态
const [isOpen, setIsOpen] = useState(false);
```

### 共享状态

```typescript
// 使用 Context + Hooks
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

## 错误处理

### 统一错误处理

```typescript
// api-client/error-handler.ts
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
}
```

### 组件错误边界

```typescript
export class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

## 性能优化

### 懒加载

```typescript
const HeavyComponent = lazy(() => import('./heavy-component'));
```

### Memo 化

```typescript
export const BookCard = memo(function BookCard({ book }: BookCardProps) {
  return <div>{book.title}</div>;
});
```

### useCallback / useMemo

```typescript
const handleClick = useCallback(() => {
  // 处理点击
}, [dependencies]);

const filteredBooks = useMemo(() => {
  return books.filter(book => book.genre === genre);
}, [books, genre]);
```
