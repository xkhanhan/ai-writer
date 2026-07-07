# 数据库规范

> SQLite 数据库管理与数据持久化规范。

## 1. 技术选型

- 数据库：**SQLite**（`better-sqlite3`）
- 数据库文件：`data/novel-writer.db`
- 连接方式：`server/storage/db.ts` 的 `getDb()` 单例

## 2. 目录结构

```
server/storage/
├── db.ts              # 数据库连接与迁移
├── books-store.ts     # books 表 CRUD
├── settings-store.ts  # 设定实体 CRUD
├── rules-store.ts     # 世界规则 CRUD
├── folders-store.ts   # 文件夹 CRUD
├── files-store.ts     # 文件 CRUD
├── outline-store.ts   # 创作大纲 CRUD
└── ...
```

每个 `*-store.ts` 负责一张表的完整 CRUD 操作。

## 3. 编码规则

- 使用导出函数模式，每个 store 导出独立的异步函数。
- 所有 SQL 使用参数化查询，禁止字符串拼接。
- 数据库查询结果使用 `as unknown as RowType` 类型断言，禁止 `as any`。
- 迁移脚本放在 `server/storage/migrations/` 目录。

## 4. 数据文件管理

- SQLite 数据库和 JSON 数据文件统一放在 `data/` 目录。
- 禁止在代码中硬编码数据路径。
- `data/` 目录下的运行时数据文件禁止提交到 Git。

## 5. 数据模型

各表的 TypeScript 类型定义在 `app/types/` 目录，前后端共享。
