# 书籍元信息扩展

> **状态：待实现**（2026-07-03）

## 目标

在书籍工作台的"书籍信息"面板中扩展元信息字段，使 AI 生成更精准。首页创建书籍仍只保留书名/题材/平台/简介四个字段。

## 存储设计

### 原则

- 全部独立列，不用 JSON。每个字段是 books 表的一个列，前端直接 `book.xxx` 读写。
- 旧数据不破坏：新列全部 `DEFAULT ''`，已有书籍自动兼容。

### books 表新增列

```sql
ALTER TABLE books ADD COLUMN sub_genre        TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN tags             TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN writing_style    TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN narrative_pov    TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN target_audience  TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN target_word_count INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN ending_type      TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN reference_works  TEXT NOT NULL DEFAULT '';
ALTER TABLE books ADD COLUMN selling_point    TEXT NOT NULL DEFAULT '';
```

### 字段说明

| 字段 | 列名 | 类型 | 控件 | 说明 |
|------|------|------|------|------|
| 子题材 | sub_genre | TEXT | Cascader 二级 | 如"东方玄幻" |
| 标签关键词 | tags | TEXT | Input（逗号分隔） | 如"系统流,重生,无敌流" |
| 写作风格 | writing_style | TEXT | Select | 热血爽快/轻松幽默/细腻深沉/简练利落/沉稳大气 |
| 叙事人称 | narrative_pov | TEXT | Select | 第一人称/第三人称限知/第三人称全知/多视角 |
| 目标读者 | target_audience | TEXT | Select | 男频/女频/全年龄 |
| 篇幅目标 | target_word_count | INTEGER | InputNumber（万字） | 100, 200, 300… |
| 结局导向 | ending_type | TEXT | Select | HE/BE/开放式/待定 |
| 参考作品 | reference_works | TEXT | Input | 自由输入 |
| 核心卖点 | selling_point | TEXT | TextArea | 自由输入 |

## 枚举值管理

所有枚举值由后端管理，前端通过接口拉取，不在前端硬编码。在 `book_options` 表中扩展 key：

| key | 说明 |
|-----|------|
| genres | 现有，保持不变 |
| **genre_tree** | 新增，完整树形题材数据 |
| writing_styles | 新增 |
| narrative_povs | 新增 |
| target_audiences | 新增 |
| ending_types | 新增 |

## 接口设计

### GET /api/book-options（扩展）

返回 genreTree、writingStyles、narrativePovs、targetAudiences、endingTypes，一次请求拿到所有枚举。

### GET /api/books/[id] / PATCH /api/books/[id]

Book 对象新增 9 个字段（subGenre、tags、writingStyle、narrativePov、targetAudience、targetWordCount、endingType、referenceWorks、sellingPoint）。

### POST /api/books

不接收新字段，保持原样。新书新列自动为默认值。

## 前端设计

### 表单分区（BookInfoForm）

- **基础信息区**：书名、题材（Cascader）、平台、简介
- **创作风格区**：写作风格、叙事人称、目标读者、结局导向
- **商业信息区**：标签关键词、篇幅目标、参考作品、核心卖点

### 类型与常量

- `app/types/index.ts` 的 Book 类型新增 9 个字段
- `app/constants/index.ts` 中的 BOOK_GENRES 和 BOOK_PLATFORMS 保留作为首页 fallback

## 实施步骤

1. 后端：db.ts 加迁移逻辑（ALTER TABLE）
2. 后端：book-options-store.ts 扩展枚举数据和 genre_tree
3. 后端：book-store.ts 更新 Book 类型、mapBookRow、createBook、updateBook
4. 后端：/api/book-options route 返回新字段
5. 后端：/api/books/[id] GET/PATCH 适配新字段
6. 前端：types 更新 Book 类型
7. 前端：constants 扩展 genre tree（仅 fallback）
8. 前端：BookInfoForm 改造为分区表单 + Cascader + 新字段
9. 前端：use-book hook 适配新字段更新逻辑
10. 验证：typecheck + lint + build + 手动测试

## 测试要点

| 类别 | 关键用例 |
|------|---------|
| 数据库迁移 | 旧库升级兼容、全新初始化、重复迁移不报错 |
| 枚举接口 | genreTree 结构正确、genres 保持兼容 |
| 书籍接口 | 创建不带新字段、GET 返回新字段、PATCH 单字段/全字段更新 |
| 前端表单 | Cascader 选择、保存回显、空字段保存、首页不受影响 |
| 边界安全 | 超长输入、负数/非法类型、注入过滤、并发保存 |
| 回归 | typecheck + lint + build + 各页面功能不受影响 |

## 范围限定

- 只动书籍工作台的书籍信息面板
- 不动首页创建流程、文件夹/文件管理、AI 生成（后续阶段接入）
