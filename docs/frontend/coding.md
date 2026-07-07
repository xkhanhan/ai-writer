# 前端代码规范

> TypeScript / React / CSS Modules 编码规范。违反任何条款的代码不予合并。

## 1. TypeScript

- `tsconfig.json` 已开启 `strict: true`，所有代码必须通过编译（`npm run typecheck` 零错误）。
- 缩进 2 空格，文件编码 UTF-8（无 BOM），行尾 LF。
- 禁止 `any`。唯一例外：数据库查询断言使用 `as unknown as RowType`。

  ```typescript
  // ✅
  const row = db.prepare("SELECT * FROM books").get(id) as unknown as BookRow;
  // ❌
  const row = db.prepare("SELECT * FROM books").get(id) as any;
  ```

- `interface` 用于对象形状；`type` 用于联合类型、交叉类型、条件类型。
- 命名：类/接口/PascalCase，函数/变量/camelCase，常量/UPPER_SNAKE_CASE。

## 2. React / Next.js

- 需要浏览器 API、状态管理或副作用的组件声明 `"use client"`。
- 文件命名：组件 `kebab-case.tsx`，导出名 PascalCase，非组件 `kebab-case.ts`。
- Props 接口使用 `组件名Props` 后缀。
- 自定义 Hook 放 `hooks/` 目录，文件名 `use-xxx.ts`。
- 优先 CSS Modules，禁止内联样式（布局微调除外）。

## 3. CSS Modules

- 统一命名 `index.module.css`。
- 类名使用 camelCase（`.cardTitle` 而非 `.card-title`）。
- 禁止硬编码颜色值，必须使用 CSS 变量（详见 [视觉规范](./visual.md)）。
- 响应式断点统一 `@media (max-width: 768px)`。

## 4. API 路由编码

API 路由（`app/api/*/route.ts`）保持精简：解析请求 → 调用 `server/` 函数 → 返回 JSON。

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
```

## 5. 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 组件文件 | `kebab-case.tsx` | `book-info-form.tsx` |
| 工具文件 | `kebab-case.ts` | `id-generator.ts` |
| 路由处理器 | `route.ts` | `app/api/books/route.ts` |
| 页面入口 | `page.tsx` | `app/page.tsx` |
| 类型名 | `PascalCase` | `Book`, `ChapterConfig` |
| 函数/变量 | `camelCase` | `getBookById` |
| CSS Module | `index.module.css` | 与组件同目录 |

## 6. 验证门禁

| 命令 | 用途 |
|------|------|
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码质量检查 |
| `npm run build` | 生产构建，捕获集成问题 |

提交前必须三项全部通过。
