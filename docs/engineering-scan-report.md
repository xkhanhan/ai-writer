# 工程扫描问题报告

> 扫描日期：2026-07-08  
> 范围：前端、后端 API、数据库/持久化、工程校验  
> 原则：只记录会影响功能、数据可靠性、潜在风险、用户体验或后续维护成本的问题；不记录单纯格式、换行、临时审美偏好。

## 当前状态

当前工程可以正常通过基础校验：

```powershell
npm run typecheck
npm run lint
npm run build
```

工作区扫描时无未提交变更。此前工作台 `activeId/onActiveChange` 引发的构建阻断已修复。

## 问题分级

| 级别 | 含义 | 处理建议 |
|------|------|----------|
| P0 | 已阻断构建、核心流程不可用、可能造成明显数据损坏 | 立即修复 |
| P1 | 影响数据可靠性、保存一致性、跨页面同步、主要用户体验 | 优先排期 |
| P2 | 不一定马上出错，但会放大维护成本或埋下后续风险 | 随功能迭代修复 |
| P3 | 体验优化、规范收敛、可读性提升 | 有余力时处理 |

## 前端扫描

### P1：文件自动保存可能串写到错误文件

位置：

- `app/pages/books/hooks/use-folder-file-editor.ts`

现象：

文件编辑器的自动保存使用 500ms 定时器。定时器执行时用 `selectedFileRef.current?.id` 获取当前选中文件，但保存内容来自触发输入时的旧闭包。

业务影响：

用户在 A 文件输入后马上切到 B 文件，存在把 A 的内容保存到 B 文件的风险。这个问题会直接影响资料库内容可信度。

建议修复：

- 创建定时器时同时捕获 `fileId` 和 `content`。
- 切换文件时取消旧文件 pending save，或先 flush 旧文件保存。
- 保存完成前不要使用“当前选中文件”作为保存目标。

### P1：标签库更新后，设定库可能继续显示旧标签

位置：

- `shared/hooks/use-tag-tree.ts`
- `app/pages/books/components/tag-library/`
- `app/pages/books/components/settings-library/`

现象：

`useTagTree` 使用模块级 `Map` 做缓存。标签库调用 `refresh()` 后，只更新当前 hook 实例，不会通知其他已经挂载的使用方。

业务影响：

用户在标签库改名、删除标签后，设定库里的标签映射可能不刷新，造成“标签已改，但其他页面仍显示旧内容”的体验。

建议修复：

- 建立轻量订阅机制，让同一 `bookId` 的所有 `useTagTree` 实例同步更新。
- 或移除全局缓存，改为每个页面按需拉取。
- 如果保留缓存，至少提供 `invalidateTagTree(bookId)` 并在 CRUD 后广播。

### P1：保存失败可能被提示为成功

位置：

- `app/pages/books/components/creation-zone/components/volume-form/index.tsx`
- `app/pages/books/components/creation-zone/components/chapter-form/index.tsx`
- `app/pages/books/components/creation-zone/components/content-editor/index.tsx`
- `app/pages/books/components/creation-zone/components/navigation-tree/index.tsx`

现象：

部分表单只要 `await onSave()` 没抛异常就显示成功，但底层保存函数失败时可能返回 `null` 或 `false`。

业务影响：

用户会看到“保存成功”，实际数据未落盘。后续返回页面时发现内容没有保存，信任感会下降。

建议修复：

- 统一约定：业务 hook 失败时抛错，组件用 `try/catch`。
- 或统一返回 `Result<T>`，组件必须检查 `ok` 后才能提示成功。
- 禁止组件忽略 `null/false` 保存结果。

### P1：卷纲/章纲表单切换对象时可能残留旧输入

位置：

- `app/pages/books/components/creation-zone/index.tsx`
- `app/pages/books/components/creation-zone/components/volume-form/index.tsx`
- `app/pages/books/components/creation-zone/components/chapter-form/index.tsx`

现象：

`VolumeForm` 和 `ChapterForm` 使用 props 初始化本地 state，但父组件渲染时未设置稳定 `key`。当用户在同一个表单组件实例内切换编辑对象时，可能保留上一个对象的输入状态。

业务影响：

用户编辑第二个卷/章时看到第一个卷/章的内容，容易误改或覆盖错误对象。

建议修复：

- 给 `VolumeForm` 加 `key={view.volumeId ?? "new-volume"}`。
- 给 `ChapterForm` 加 `key={view.chapterId ?? `new-${view.volumeId}`}`。
- 或在组件内部用 `useEffect` 监听 id 变化并重置表单 state。

### P2：shared 层反向依赖 app 层

位置：

- `shared/hooks/use-tag-tree.ts`

现象：

`shared/hooks/use-tag-tree.ts` 从 `@/app/api-client/tags` 导入 API helper。按四层架构，`shared` 应保持可复用、客户端安全，不应依赖 `app`。

业务影响：

短期不影响功能，但会让共享层越来越难复用，也会增加后续重构成本。

建议修复：

- 把 tag API helper 下沉到 `shared` 可依赖的位置。
- 或把 `useTagTree` 移到 `app/pages/books/hooks/`，承认它是业务 hook。

### P2：视觉和交互实现尚未完全收敛到设计系统

位置：

- 创作区表单、内容编辑器、部分空状态和按钮

现象：

仍有较多内联样式和原生 `<button>`。项目规范要求 Ant Design v6、CSS Modules、CSS 变量和共享组件优先。

业务影响：

短期不阻断使用，但后续主题切换、移动端适配、按钮态统一会更难维护。

建议修复：

- 高复用表单布局抽到局部组件或 CSS Module。
- 原生按钮逐步替换为 Ant Design `Button`，除非确有样式定制理由。
- 空状态、删除确认、保存按钮继续复用 `shared/ui`。

## 后端/API 扫描

### P1：前端 API 客户端可能丢失服务端错误信息

位置：

- `app/api-client/client.ts`

现象：

`ApiClient` 在非 2xx 响应时只读取 `message` 字段，但多数 API 返回 `{ error }`。

业务影响：

用户可能只看到“请求失败: 400/500”，看不到具体原因。例如缺少参数、名称为空、实体不存在等信息不能准确反馈。

建议修复：

```ts
error: errorData.error || errorData.message || `请求失败: ${response.status}`
```

### P1：API 响应结构不统一

位置：

- `app/api/*`
- `app/api-client/*`
- `app/pages/*/api/*`

现象：

当前接口混用多种响应格式：

- 裸对象/裸数组
- `{ success: true, data }`
- `{ books }`、`{ rules }`、`{ entities }`
- `{ error }`
- `{ success: false, error }`
- AI 测试接口使用 `{ success, message }`

业务影响：

每个业务 API helper 都要手写适配逻辑，容易漏处理错误字段或误判成功。随着页面增多，接口维护成本会上升。

建议修复：

- 新接口统一使用 `jsonSuccess()` / `jsonError()`。
- 逐步统一为一种响应 envelope，例如：

```ts
type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };
```

- 老接口可分阶段迁移，不必一次性大改。

### P1：部分 PATCH/POST 入参校验仍偏弱

位置：

- `app/api/volumes/[id]/route.ts`
- `app/api/chapters/[id]/route.ts`
- `app/api/world-rules/[id]/route.ts`
- `app/api/setting-entities/[id]/route.ts`
- `app/api/tags/[id]/route.ts`

现象：

部分接口直接 `request.json()` 后传给 storage 层，只做了少量必填检查。

业务影响：

错误类型、非法枚举、空字符串、过长字段可能进入业务层。短期可能表现为保存失败，长期可能造成脏数据。

建议修复：

- 每个路由增加白名单 DTO 解析。
- 对枚举字段、数组字段、数字字段做类型检查。
- 非法字段直接忽略或返回 400，避免透传到 storage。

## 数据库/持久化扫描

### P1：删除关系的完整性需要继续核对

位置：

- `server/storage/db.ts`

现象：

项目依赖 SQLite 外键和 `ON DELETE CASCADE` 保证删除级联。部分表已定义外键，但需要持续核对所有业务实体是否完整声明关系，例如文件夹、归档正文、标签引用等。

业务影响：

如果缺少必要外键，删除书籍、章节、标签后可能留下孤儿数据，后续列表统计或引用计数会不准。

建议修复：

- 对所有 `book_id`、`folder_id`、`volume_id`、`chapter_id`、`tag_id` 关系建立清单。
- 明确哪些需要级联删除，哪些需要保留历史快照。
- 对缺失外键的表补迁移脚本，不直接破坏已有数据。

### P2：JSON 字段缺少更强的数据形状约束

位置：

- 卷纲/章纲/设定库/世界规则相关 store

现象：

多个字段以 JSON 字符串形式存储数组或对象，例如 `stages`、`key_points`、`tagIds`、`categoryFields`、`statusFields`。

业务影响：

如果 API 入参校验不足，错误 JSON 形状会被保存，前端解析时只能 fallback，用户可能看到字段丢失或空白。

建议修复：

- 在 API DTO 层先校验数组/对象形状。
- 在 storage 写入前做二次 normalize。
- 对读取 fallback 做日志或可诊断提示，避免静默吞数据问题。

## 工程建议

### P2：把扫描报告纳入固定流程

建议在重大功能合并前增加一次工程扫描，扫描时必须覆盖：

1. 前端：状态流、保存链路、跨组件同步、用户体验。
2. 后端：API 契约、入参校验、错误返回。
3. 数据库：关系完整性、级联删除、迁移安全、JSON 字段形状。
4. 工程：`typecheck`、`lint`、`build`。

### P2：扫描报告不要记录低价值噪音

不应记录：

- 纯换行、缩进、格式偏好。
- 不影响功能的命名喜好。
- 没有业务影响的审美差异。
- 未经证据支持的猜测。

应记录：

- 会导致保存错、显示错、删除错、同步错的问题。
- 用户会明显感知的体验问题。
- 会造成脏数据、孤儿数据、接口误判的问题。
- 会让后续开发明显变慢或风险变高的架构问题。

## 建议修复顺序

1. 修复文件自动保存串写风险。
2. 修复 API 客户端错误字段读取。
3. 统一保存失败语义，避免失败显示成功。
4. 修复标签树缓存跨组件同步。
5. 给卷纲/章纲表单补 key 或状态重置。
6. 梳理数据库关系和级联删除清单。
7. 逐步统一 API 响应格式和 DTO 校验。
8. 收敛内联样式和原生按钮。

