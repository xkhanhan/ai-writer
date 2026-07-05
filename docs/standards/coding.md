# 编码规范

> AI 直接遵循。违反任何条款的代码不予合并。

---

## 1. TypeScript 规范

- **1.1** `tsconfig.json` 已开启 `strict: true`，所有代码必须在 strict 模式下通过编译（`npm run typecheck` 零错误）。

- **1.2** 缩进 2 空格，文件编码 UTF-8（无 BOM），行尾 LF。

- **1.3** 禁止 `any` 类型。唯一例外：数据库查询结果断言时使用 `as unknown as RowType`，不得使用 `as any`。

  ```typescript
  // ✅ 正确
  const row = db.prepare("SELECT * FROM books").get(id) as unknown as BookRow;

  // ❌ 错误
  const row = db.prepare("SELECT * FROM books").get(id) as any;
  ```

- **1.4** `interface` 用于对象形状（函数参数、返回值、组件 Props）；`type` 用于联合类型、交叉类型、条件类型。

  ```typescript
  // ✅ 对象形状用 interface
  interface BookCardProps {
    book: Book;
    onClick?: (id: string) => void;
  }

  // ✅ 联合类型用 type
  type BookStatus = "draft" | "archived";
  ```

- **1.5** 命名规范：类/接口/PascalCase，函数/变量/camelCase，常量/UPPER_SNAKE_CASE。

---

## 2. React / Next.js 规范

- **2.1** 需要浏览器 API、状态管理或副作用的组件，在文件顶部声明 `"use client"`。

  ```typescript
  "use client";

  import { useState } from "react";
  ```

- **2.2** 文件命名：组件文件 `kebab-case.tsx`，导出组件名 PascalCase，非组件文件 `kebab-case.ts`，CSS Module `index.module.css`。

  | 类型 | 命名 | 示例 |
  |------|------|------|
  | 组件文件 | `kebab-case.tsx` | `book-card.tsx` |
  | 导出组件名 | PascalCase | `BookCard` |
  | 非组件文件 | `kebab-case.ts` | `format-date.ts` |
  | Hook 文件 | `use-xxx.ts` | `use-books.ts` |

- **2.3** Props 接口使用 `组件名Props` 后缀。

  ```typescript
  // book-card.tsx
  interface BookCardProps {
    book: Book;
    onClick?: (id: string) => void;
  }

  export function BookCard({ book, onClick }: BookCardProps) { /* ... */ }
  ```

- **2.4** 自定义 Hook 放 `hooks/` 目录，文件名 `use-xxx.ts`，返回对象包含状态和方法。

  ```
  hooks/
  ├── use-books.ts
  ├── use-book.ts
  ├── use-creation-zone.ts
  └── use-ai-config.ts
  ```

- **2.5** 优先 CSS Modules，禁止内联样式（布局微调除外）。

  ```typescript
  // ✅ 正确
  import styles from "./index.module.css";
  return <div className={styles.card}>{title}</div>;

  // ❌ 错误
  return <div style={{ padding: "16px" }}>{title}</div>;
  ```

- **2.6** 页面入口 `index.tsx` 只负责组合，不包含复杂逻辑；复杂逻辑提取到 Hook 或子组件。

- **2.7** API 路由（`app/api/*/route.ts`）保持精简：解析请求 → 调用 `server/` 函数 → 返回 JSON。

  ```typescript
  // ✅ 正确模式
  export async function GET() {
    try {
      const books = await listBooks();
      return NextResponse.json({ success: true, books });
    } catch {
      return jsonError("数据读取失败。", 500);
    }
  }
  ```

---

## 3. CSS Modules 规范

- **3.1** 组件样式文件统一命名为 `index.module.css`。

- **3.2** CSS 类名使用 camelCase。

  ```css
  /* ✅ 正确 */
  .cardTitle { font-size: 16px; }

  /* ❌ 错误 */
  .card-title { }
  .card__title { }
  ```

- **3.3** 禁止硬编码颜色值，必须使用 CSS 变量。颜色、间距、字体等设计 Token 定义在 `app/globals.css`。

  ```css
  /* ✅ 正确 */
  .card {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  /* ❌ 错误 */
  .card {
    background: #ffffff;
    color: #1a1a1a;
    border: 1px solid #e8e8e8;
  }
  ```

- **3.4** 响应式断点统一使用 `@media (max-width: 768px)` 适配移动端。

---

## 4. 文件组织（三层架构）

项目采用三层架构，旧的 `features/` 层已废弃，不再使用。

```
novel-writer/
├── app/          # 前端层：Next.js 入口、页面、API 路由（薄层）
├── server/       # 后端层：存储、AI Provider、工具函数
├── shared/       # 跨层复用：可复用 UI 组件、AI 合约类型
├── data/         # 运行时数据：SQLite 数据库、JSON 文件
└── docs/         # 项目文档
```

### 4.1 `app/` — 前端层

| 子目录 | 职责 |
|--------|------|
| `app/page.tsx`, `app/layout.tsx` | Next.js 根入口、布局 |
| `app/pages/{page}/` | 页面级组件、子组件、hooks、页面 API、配置 |
| `app/api/` | API 路由（`route.ts`），保持精简 |
| `app/components/` | 应用 Shell 级组件（`app-shell/`、`layout-shell.tsx`） |
| `app/types/` | 前端共享类型定义 |
| `app/utils/` | 客户端安全工具函数 |
| `app/api-client/` | 前端 HTTP 请求封装 |
| `app/globals.css` | 全局样式与 CSS 变量 |

### 4.2 `server/` — 后端层

| 子目录 | 职责 |
|--------|------|
| `server/storage/` | 数据持久化：SQLite（better-sqlite3）读写、数据库连接与迁移 |
| `server/ai/` | AI Provider 调用与配置持久化 |
| `server/utils/` | 服务端工具函数（如 ID 生成器） |

- `server/storage/` 使用导出函数模式（如 `listBooks()`、`createBook()`），每个 `*-store.ts` 负责一张表的 CRUD。
- 数据库连接通过 `getDb()` 获取（`server/storage/db.ts`），SQLite 数据库文件位于 `data/novel-writer.db`。
- 不存在 Service / Repository / Model 分层，不存在依赖注入，不存在 Zod 验证。

### 4.3 `shared/` — 跨层复用层

| 子目录 | 职责 |
|--------|------|
| `shared/ui/` | 可复用 UI 组件（`split-panel`、`empty-state`、`confirm-delete`、`save-button`、`ai-dropdown`、`array-input`、`theme`） |
| `shared/ai/` | AI 相关合约类型（配置接口、Provider 契约） |

### 4.4 `data/` — 运行时数据

SQLite 数据库文件和 JSON 数据文件存放于此，禁止在代码中硬编码数据路径。

### 4.5 依赖方向（不可违反）

```
app/    →  server/   ✅ 通过 API 路由调用
app/    →  shared/   ✅ 导入可复用组件和类型
server/ →  shared/   ✅ 导入共享类型
server/ →  data/     ✅ 读写数据库和文件

server/ →  app/      ❌ 禁止
shared/ →  app/      ❌ 禁止
shared/ →  server/   ❌ 禁止
app/  直接导入 server/storage/*  ❌ 禁止（必须通过 API 路由）
```

**核心原则：客户端组件永远不能直接导入 `server/` 下的代码。前后端通信只能通过 `app/api/` 路由。**

---

## 5. 组件设计模式

- **5.1** 单一职责：每个组件只做一件事，复杂逻辑提取到自定义 Hook。

  ```typescript
  // ✅ 组件只负责渲染，逻辑在 Hook 中
  export function BookList({ books, loading }: BookListProps) {
    if (loading) return <Loading />;
    return (
      <div>
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    );
  }
  ```

- **5.2** 跨页面复用的 UI 组件放 `shared/ui/`；单页面专用组件放 `app/pages/{page}/components/`。

- **5.3** 组合优于配置：优先使用组件组合（children / compound components），避免传递大量配置 props。

- **5.4** API 路由保持精简：解析请求参数 → 调用 `server/storage/*` 函数 → 返回统一 JSON 格式 `{ success: boolean, ... }`。

  ```typescript
  // API 响应统一格式
  return NextResponse.json({ success: true, data });  // 成功
  return NextResponse.json({ success: false, error }, { status: 400 });  // 失败
  ```

- **5.5** 页面与顶栏通信使用自定义事件（如 `navigate-settings`），不使用直接导入。

---

## 6. 代码验证（CI 门禁）

提交前必须通过以下验证，任一失败不予合并：

| 命令 | 用途 |
|------|------|
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码质量检查 |
| `npm run build` | 生产构建，捕获集成问题 |
