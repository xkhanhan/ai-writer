# 代码规范

本文档定义 novel-writer 项目的代码编写标准，所有贡献者必须遵守。

---

## 一、TypeScript 规范

### 1.1 Strict 模式

项目 `tsconfig.json` 开启了 `strict` 模式，所有代码必须在 strict 模式下通过编译。

### 1.2 格式要求

- 缩进：**2 个空格**，不使用 Tab
- 文件编码：**UTF-8**（无 BOM）
- 行尾：`LF`（Unix 换行符）

### 1.3 禁止 `any` 类型

```typescript
// ✅ 正确
function getBook(id: string): Promise<Book | null> {
  // ...
}

// ❌ 错误
function getBook(id: any): Promise<any> {
  // ...
}
```

> 唯一例外：在 Repository 层对数据库查询结果做类型断言时，可使用 `as unknown as Book`，不得使用 `as any`。

### 1.4 接口与类型的选择

| 场景 | 使用 |
|------|------|
| 描述对象形状（函数参数、返回值、API 响应等） | `interface` |
| 联合类型、交叉类型、条件类型 | `type` |

```typescript
// ✅ 对象形状用 interface
interface Book {
  id: string;
  title: string;
  description: string;
}

// ✅ 联合/交叉用 type
type BookGenre = '玄幻' | '都市' | '科幻' | '历史';
type CreateBookDTO = Pick<Book, 'title' | 'description'> & { genre: BookGenre };
```

### 1.5 命名规范

| 类别 | 风格 | 示例 |
|------|------|------|
| 类 | PascalCase | `BookService` |
| 接口 | PascalCase | `Book`, `CreateBookDTO` |
| 类型别名 | PascalCase | `BookGenre` |
| 函数 | camelCase | `getBooks`, `createBook` |
| 变量 | camelCase | `bookList`, `isLoading` |
| 常量 | UPPER_SNAKE_CASE | `MAX_BOOK_COUNT`, `DEFAULT_PAGE_SIZE` |

---

## 二、React / Next.js 规范

### 2.1 Client Components

需要浏览器 API、状态管理或副作用的组件必须在文件顶部声明：

```typescript
"use client";

import { useState } from "react";
```

### 2.2 文件命名

| 类型 | 命名 | 示例 |
|------|------|------|
| React 组件文件 | `kebab-case.tsx` | `book-card.tsx` |
| 导出组件名 | PascalCase | `BookCard` |
| 非组件文件 | `kebab-case.ts` | `format-date.ts` |
| CSS Module | `kebab-case.module.css` | `book-card.module.css` |

### 2.3 Props 定义

每个组件的 Props 接口使用 **组件名 + Props** 后缀：

```typescript
// book-card.tsx
interface BookCardProps {
  book: Book;
  onClick?: (id: string) => void;
}

export function BookCard({ book, onClick }: BookCardProps) {
  // ...
}
```

### 2.4 Hook 文件

自定义 Hook 统一放在 `hooks/` 目录下，文件名以 `use-` 开头：

```
hooks/
├── use-books.ts
├── use-book.ts
├── use-creation-zone.ts
└── use-ai-config.ts
```

### 2.5 样式规范

- **优先使用 CSS Modules**，避免内联样式
- 全局样式在 `app/globals.css` 中定义
- 组件样式在 `index.module.css` 中定义

```typescript
// ✅ 正确
import styles from './book-card.module.css';

export function BookCard({ book }: BookCardProps) {
  return <div className={styles.card}>{book.title}</div>;
}

// ❌ 错误：内联样式
export function BookCard({ book }: BookCardProps) {
  return <div style={{ padding: '16px' }}>{book.title}</div>;
}
```

---

## 三、CSS Modules 规范

### 3.1 文件格式

组件样式文件统一命名为 `index.module.css`。

### 3.2 类名命名

使用 **camelCase** 命名：

```css
/* ✅ 正确 */
.container {
  display: flex;
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
}

/* ❌ 错误：BEM 或 kebab-case */
.book-card__title { }
.book-card-title { }
```

### 3.3 CSS 变量

所有颜色、间距、字体等设计 Token 通过全局 CSS 变量引用，**严禁硬编码颜色值**：

```css
/* ✅ 正确：使用变量 */
.card {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
}

/* ❌ 错误：硬编码颜色 */
.card {
  background: #ffffff;
  color: #1a1a1a;
  border: 1px solid #e8e8e8;
}
```

### 3.4 响应式设计

使用 `max-width: 768px` 断点适配移动端：

```css
.container {
  padding: 24px;
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
}
```

---

## 四、文件组织规范

项目采用四层架构，每层有明确职责边界：

```
novel-writer/
├── app/          # Next.js 入口、布局、API 路由适配层
├── features/     # 业务模块（按功能拆分）
├── shared/       # 跨层复用的 UI、类型、工具（客户端安全）
├── server/       # 服务端逻辑（存储、密钥、AI Provider 调用）
├── data/         # 运行时数据
└── docs/         # 项目文档
```

### 4.1 app/ — 路由与入口

- 页面入口（`page.tsx`）只负责组合，不包含复杂逻辑
- API 路由（`route.ts`）保持精简：解析请求 → 调用 `server/` → 返回 JSON
- 布局组件（`layout.tsx`）只做页面骨架

### 4.2 features/ — 业务模块

每个业务模块内包含：

```
features/[module]/
├── components/    # 页面组件
├── hooks/         # 页面级自定义 Hook
├── api/           # 前端 API 封装
├── config/        # 模块配置
├── types/         # 模块类型定义
└── utils/         # 模块工具函数
```

### 4.3 shared/ — 公共复用层

- `shared/ui/`：可复用的 UI 组件（如 `ai-dropdown`、`empty-state`、`split-panel`）
- `shared/ai/`：AI 相关的共享合约与配置类型
- 可被 `app/` 和 `features/` 安全导入

### 4.4 server/ — 服务端逻辑

- `server/storage/`：数据持久化（数据库操作、文件存储）
- `server/ai/`：AI Provider 调用与配置
- `server/utils/`：服务端工具函数

### 4.5 依赖方向（不可违反）

```
app/   →  server/   ✅
app/   →  shared/   ✅
server/ → shared/   ✅

server/ → app/      ❌ 禁止
shared/ → app/      ❌ 禁止
shared/ → server/   ❌ 禁止
```

**核心原则：客户端组件永远不能直接导入 `server/` 下的代码。**

---

## 五、组件设计模式

### 5.1 单一职责

每个组件只做一件事，复杂逻辑抽取到自定义 Hook：

```typescript
// ✅ 正确：组件只负责渲染
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

### 5.2 提取可复用 UI 到 shared/ui/

当一个 UI 组件在多个页面中使用时，将其移至 `shared/ui/` 目录：

```
shared/ui/
├── empty-state/        # 空状态组件
├── save-button/        # 保存按钮组件
├── confirm-delete/     # 确认删除组件
├── split-panel/        # 分栏面板组件
└── ai-dropdown/        # AI 下拉菜单组件
```

### 5.3 组合优于配置

优先使用组件组合（Composition）而非传递大量配置项：

```typescript
// ✅ 正确：组合模式
<Panel>
  <Panel.Header>
    <Title text="设置" />
  </Panel.Header>
  <Panel.Body>
    <ConfigForm />
  </Panel.Body>
  <Panel.Footer>
    <SaveButton onClick={handleSave} />
  </Panel.Footer>
</Panel>

// ❌ 错误：配置模式
<Panel
  header="设置"
  showFooter={true}
  footerText="保存"
  onFooterClick={handleSave}
  body={<ConfigForm />}
/>
```

### 5.4 容器组件与展示组件分离

- **容器组件**：负责数据获取与业务逻辑
- **展示组件**：只接收 Props 并渲染 UI

```typescript
// 容器组件：获取数据
export function BookListContainer() {
  const { books, loading } = useBooks();
  return <BookList books={books} loading={loading} />;
}

// 展示组件：纯渲染
export function BookList({ books, loading }: BookListProps) {
  if (loading) return <Loading />;
  return <div>{books.map((book) => <BookCard key={book.id} book={book} />)}</div>;
}
```
