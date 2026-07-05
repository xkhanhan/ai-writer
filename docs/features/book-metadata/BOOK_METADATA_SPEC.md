# 书籍元信息扩展设计

> **状态：待实现**（2026-07-03）
>
> 为书籍工作台的"书籍信息"面板补充元信息字段，使后续 AI 生成更精准。首页创建书籍仍只保留书名/题材/平台/简介四个字段。

## 1. 目标

书籍信息越丰富，系统组装给 AI 的提示词越精准。本次在书籍工作台的书籍信息面板中扩展元信息字段，不动首页创建流程。

## 2. 存储设计

### 2.1 原则

- 全部独立列，不用 JSON。每个字段是 books 表的一个列，前端直接 `book.xxx` 读写。
- 旧数据不破坏：新列全部 `DEFAULT ''`，已有书籍自动兼容。

### 2.2 books 表新增列

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

### 2.3 字段说明

| 字段 | 列名 | 类型 | 控件 | 说明 |
|------|------|------|------|------|
| 子题材 | sub_genre | TEXT | Cascader 二级 | 题材树二级值，如"东方玄幻" |
| 标签关键词 | tags | TEXT | Input（逗号分隔） | 自由输入，如"系统流,重生,无敌流" |
| 写作风格 | writing_style | TEXT | Select | 热血爽快/轻松幽默/细腻深沉/简练利落/沉稳大气 |
| 叙事人称 | narrative_pov | TEXT | Select | 第一人称/第三人称限知/第三人称全知/多视角 |
| 目标读者 | target_audience | TEXT | Select | 男频/女频/全年龄 |
| 篇幅目标 | target_word_count | INTEGER | InputNumber（万字） | 100, 200, 300… |
| 结局导向 | ending_type | TEXT | Select | HE/BE/开放式/待定 |
| 参考作品 | reference_works | TEXT | Input | 自由输入 |
| 核心卖点 | selling_point | TEXT | TextArea | 自由输入 |

## 3. 枚举值管理

### 3.1 原则

所有枚举值由后端管理，前端通过接口拉取，不在前端硬编码。

### 3.2 book_options 表扩展

现有 `book_options` 表是 KV 结构（key + value JSON），直接扩展 key 即可，不改表结构：

| key | value 内容 | 说明 |
|-----|-----------|------|
| genres | 现有，保持不变 | 扁平一级题材列表（兼容首页创建） |
| **genre_tree** | 新增 | 完整树形题材数据，一次性返回 |
| **sub_genre_tree** | 新增 | 二级子题材映射 |
| writing_styles | 新增 | 写作风格枚举 |
| narrative_povs | 新增 | 叙事人称枚举 |
| target_audiences | 新增 | 目标读者枚举 |
| ending_types | 新增 | 结局导向枚举 |

`genre_tree` 结构示例（一次返回完整树，不做联级查询）：

```json
[
  { "value": "玄幻", "label": "玄幻", "children": [
    { "value": "东方玄幻", "label": "东方玄幻" },
    { "value": "异世大陆", "label": "异世大陆" },
    { "value": "王朝争霸", "label": "王朝争霸" },
    { "value": "高武世界", "label": "高武世界" },
    { "value": "远古神话", "label": "远古神话" }
  ]},
  { "value": "仙侠", "label": "仙侠", "children": [
    { "value": "修真文明", "label": "修真文明" },
    { "value": "幻想修仙", "label": "幻想修仙" },
    { "value": "现代修真", "label": "现代修真" },
    { "value": "古典仙侠", "label": "古典仙侠" }
  ]}
]
```

前端拿到后直接喂给 Cascader 的 `options`，无需额外请求。

## 4. 接口设计

### 4.1 修改现有接口

**GET /api/book-options**

扩展返回，新增 genre_tree 和各枚举字段：

```json
{
  "success": true,
  "options": {
    "genres": ["玄幻", "都市", ...],
    "platforms": ["起点中文网", ...],
    "genreTree": [
      { "value": "玄幻", "label": "玄幻", "children": [...] },
      ...
    ],
    "writingStyles": ["热血爽快", "轻松幽默", ...],
    "narrativePovs": ["第一人称", "第三人称限知", ...],
    "targetAudiences": ["男频", "女频", "全年龄"],
    "endingTypes": ["HE", "BE", "开放式", "待定"]
  }
}
```

一次请求拿到所有枚举，前端不联级查询。

### 4.2 修改书籍接口

**GET /api/books/[id]**、**PATCH /api/books/[id]**

Book 对象新增 9 个字段：

```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "genre": "玄幻",
  "platform": "起点中文网",
  "subGenre": "东方玄幻",
  "tags": "系统流,重生",
  "writingStyle": "热血爽快",
  "narrativePov": "第三人称限知",
  "targetAudience": "男频",
  "targetWordCount": 200,
  "endingType": "HE",
  "referenceWorks": "凡人修仙传",
  "sellingPoint": "逆袭升级，智斗权谋",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**POST /api/books**（首页创建）：不接收新字段，保持原样。新书新列自动为默认值。

## 5. 前端设计

### 5.1 工作台书籍信息表单（BookInfoForm）

改造为分区表单，用 Ant Design Divider 分隔：

- **基础信息区**：书名、题材（Cascader，选后拆为 genre + subGenre）、平台、简介
- **创作风格区**：写作风格、叙事人称、目标读者、结局导向
- **商业信息区**：标签关键词、篇幅目标、参考作品、核心卖点

### 5.2 常量文件迁移

`app/constants/index.ts` 中的 `BOOK_GENRES` 和 `BOOK_PLATFORMS` 保留作为首页 fallback。工作台从 `/api/book-options` 拉取完整枚举。

### 5.3 类型定义

`app/types/index.ts` 的 Book 类型新增 9 个字段。后端 `book-store.ts` 的 Book 类型和 mapBookRow 同步更新。

## 6. 实施步骤

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

## 7. 测试用例

### 7.1 数据库迁移测试

| 编号 | 测试项 | 前置条件 | 预期结果 |
|------|--------|---------|---------|
| DB-1 | 旧数据库升级（已有书籍） | data/novel-writer.db 存在且 books 表无新列 | 启动后自动 ALTER TABLE，旧书籍记录的新列值为 `''` 和 `0`，不报错 |
| DB-2 | 全新数据库初始化 | data/ 不存在 db 文件 | 建表包含全部新列，默认值正确 |
| DB-3 | 重复执行迁移不报错 | 新列已存在 | ALTER TABLE 被跳过（PRAGMA 检查），无异常 |

### 7.2 枚举接口测试

| 编号 | 测试项 | 请求 | 预期结果 |
|------|--------|------|---------|
| API-1 | book-options 返回完整枚举 | GET /api/book-options | 返回 genreTree、writingStyles、narrativePovs、targetAudiences、endingTypes，全部非空数组 |
| API-2 | genreTree 结构正确 | GET /api/book-options | genreTree 每项含 value/label/children，children 非空 |
| API-3 | genreTree 一级与 genres 一致 | GET /api/book-options | genreTree 的一级 value 集合等于 genres 数组 |
| API-4 | genres 保持兼容 | GET /api/book-options | genres 仍为扁平字符串数组，首页创建不受影响 |

### 7.3 书籍接口测试

| 编号 | 测试项 | 请求 | 预期结果 |
|------|--------|------|---------|
| API-5 | 创建书籍不带新字段 | POST /api/books {title,genre,platform} | 201，返回 book 对象新字段全部为默认值（空串/0） |
| API-6 | 获取书籍返回新字段 | GET /api/books/{id} | 返回 subGenre、tags、writingStyle 等 9 个字段 |
| API-7 | PATCH 更新单个新字段 | PATCH /api/books/{id} {writingStyle:"热血爽快"} | 200，再次 GET 该字段已更新，其他字段不变 |
| API-8 | PATCH 更新全部新字段 | PATCH /api/books/{id} 含全部 9 字段 | 200，GET 验证全部字段持久化 |
| API-9 | PATCH targetWordCount 为 0 | PATCH /api/books/{id} {targetWordCount:0} | 200，存储为 0（不是空串） |
| API-10 | PATCH 传入空字符串 | PATCH /api/books/{id} {subGenre:""} | 200，字段清空为 '' |
| API-11 | 旧书籍 GET 不报错 | 已有不含新列数据的书籍 | GET 返回新字段默认值，不报错 |

### 7.4 前端表单测试

| 编号 | 测试项 | 操作 | 预期结果 |
|------|--------|------|---------|
| UI-1 | 表单加载已有数据 | 打开一本已填写元信息的书籍 | 各字段正确回显，Cascader 选中 genre+subGenre |
| UI-2 | Cascader 选择题材 | 选择 玄幻→东方玄幻 | genre="玄幻"，subGenre="东方玄幻" |
| UI-3 | Cascader 只选一级 | 选择 玄幻，不选二级 | genre="玄幻"，subGenre="" |
| UI-4 | 保存全部字段 | 填写所有新字段后点保存 | 保存成功，刷新页面数据不丢失 |
| UI-5 | 保存后部分修改 | 修改 writingStyle 后保存 | 仅 writingStyle 更新，其他字段不变 |
| UI-6 | 标签输入 | 输入"系统流,重生,无敌流" | tags 存为逗号分隔字符串 |
| UI-7 | 篇幅目标输入 | InputNumber 输入 200 | targetWordCount 存为 200 |
| UI-8 | 空字段保存 | 所有新字段留空，只填基础信息 | 保存成功，默认值持久化 |
| UI-9 | 首页创建不受影响 | 首页创建新书 | 创建弹窗仍只有书名/题材/平台/简介，无新字段 |

### 7.5 边界与安全测试

| 编号 | 测试项 | 操作 | 预期结果 |
|------|--------|------|---------|
| EDGE-1 | 超长 tags | 输入 500 字符的 tags | 保存成功（TEXT 无长度限制）或给出长度提示 |
| EDGE-2 | 超长 referenceWorks | 输入 500 字符 | 同上 |
| EDGE-3 | targetWordCount 负数 | PATCH {targetWordCount:-1} | 后端校验拒绝或存为 0 |
| EDGE-4 | targetWordCount 非数字 | PATCH {targetWordCount:"abc"} | 后端校验拒绝 |
| EDGE-5 | writingStyle 非法值 | PATCH {writingStyle:"不存在"} | 后端不校验枚举（自由文本），或校验拒绝 |
| EDGE-6 | 注入 __proto__ | PATCH {__proto__:{}} | 字段被过滤，不影响系统 |
| EDGE-7 | 并发保存 | 快速连续 PATCH 两次 | 后写入的为准，无数据错乱 |

### 7.6 回归测试

| 编号 | 测试项 | 预期结果 |
|------|--------|---------|
| REG-1 | typecheck | 无类型错误 |
| REG-2 | lint | 无 lint 错误 |
| REG-3 | build | 构建成功 |
| REG-4 | 首页书籍列表 | 正常展示，不受新字段影响 |
| REG-5 | 首页创建新书 | 正常创建，无新字段 |
| REG-6 | 工作台文件夹/文件管理 | 正常使用，不受影响 |
| REG-7 | AI 配置页面 | 正常使用，不受影响 |
| REG-8 | AI 连通性测试 | 正常工作，不受影响 |

## 8. 范围限定

- 本次只动书籍工作台的书籍信息面板
- 不动首页创建书籍流程
- 不动文件夹/文件管理
- 不动 AI 生成（后续阶段接入）
