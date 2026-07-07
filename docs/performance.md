# Performance Standards

## 适用场景

本规范适用于 AI Writer 项目所有前端渲染、后端查询、资源加载及运行时性能优化。覆盖从开发阶段的性能预防到生产阶段的性能监控全流程。

---

## 一、性能预算

### 1.1 前端指标

| 指标 | 预算 | 度量方式 |
|------|------|---------|
| 首次内容绘制 (FCP) | < 1.5s | Lighthouse / Web Vitals |
| 最大内容绘制 (LCP) | < 2.5s | Web Vitals API |
| 累计布局偏移 (CLS) | < 0.1 | Web Vitals API |
| 交互到下一次绘制 (INP) | < 200ms | Web Vitals API |
| 首屏加载 (本地) | < 3s | `next build` 后 `next start` |
| 面板切换响应 | < 200ms | 用户操作到 UI 更新 |
| 列表渲染 (100项) | < 100ms | React DevTools Profiler |
| 搜索响应 (防抖后) | < 300ms | 用户输入到结果展示 |
| Bundle 大小 (JS) | < 500KB gzip | `next build` 输出分析 |

### 1.2 后端指标

| 指标 | 预算 | 度量方式 |
|------|------|---------|
| 单次 SQLite 查询 | < 50ms | `performance.now()` 计时 |
| 列表 API (50条) | < 100ms | API 路由计时日志 |
| 创建/更新操作 | < 50ms | API 路由计时日志 |
| AI 调用 | 30s 超时 | AbortController 超时控制 |
| 数据库迁移 | < 5s | 迁移函数计时 |

### 1.3 达不到预算时的排查路径

```
1. N+1 查询 → 改为 JOIN 或 IN 批量查询
2. 缺失索引 → EXPLAIN QUERY PLAN 分析 → 补充索引
3. 不必要的全量渲染 → React.memo / useMemo / 条件渲染
4. 大型组件同时渲染 → 懒加载 / 虚拟滚动 / 按需渲染
5. Bundle 过大 → 动态 import / tree-shaking / 依赖分析
6. 重复计算 → useMemo / useCallback / 模块级缓存
```

---

## 二、代码分割与懒加载

### 2.1 动态导入规则

**约束：** 以下模块必须使用 `next/dynamic` 懒加载：

| 模块类型 | 原因 | 示例 |
|---------|------|------|
| 编辑器组件 | 富文本编辑器体积大 | 正文写作编辑器 |
| AI 对话面板 | 非首屏必需 | AI 聊天弹窗 |
| 设置页面 | 低频访问 | Settings 全页面 |
| 大型可视化组件 | 图表/画布渲染开销 | 标签树可视化（未来） |

```typescript
// ✅ — 动态导入 + Loading 占位
import dynamic from "next/dynamic";

const AiChatPanel = dynamic(() => import("./ai-chat-panel"), {
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
  ssr: false, // 含浏览器 API 的组件
});

// ❌ — 静态导入大型组件
import AiChatPanel from "./ai-chat-panel"; // 所有 JS 一次性加载
```

### 2.2 路由级代码分割

Next.js App Router 默认按路由自动分割。确保：
- **禁止** 在 `layout.tsx` 中导入仅在特定页面使用的重型组件
- 页面级 `page.tsx` 自动按路由分割，无需额外配置

### 2.3 导出粒度

```typescript
// ✅ — barrel export 不影响分割（Next.js 会自动 tree-shake）
export { BaseModal } from "./base-modal";
export { SplitPanel } from "./split-panel";

// ❌ — 在 barrel 中产生副作用
import "./setup-globals"; // 会在任何导入时执行
```

---

## 三、React 渲染优化

### 3.1 React.memo 使用规则

**适用场景：** 列表项组件、频繁重渲染的纯展示组件。

**约束：**
- 仅在组件重渲染成本高（复杂布局/大量子组件）时使用
- 必须搭配 `React.memo` 的自定义比较函数或保证 props 引用稳定
- **禁止** 对所有组件无差别使用 `React.memo`（增加内存开销，收益为零）

```typescript
// ✅ — 列表项使用 memo（接收 index prop 导致每次重渲染）
const ChapterItem = React.memo(function ChapterItem({
  chapter,
  isActive,
  onSelect,
}: ChapterItemProps) {
  return (
    <div onClick={() => onSelect(chapter.id)}>
      {chapter.title}
    </div>
  );
});

// ✅ — 父组件中稳定回调引用
const onSelect = useCallback((id: string) => {
  setActiveId(id);
}, []);
// 传给 memo 子组件的 onSelect 引用不变，不会触发重渲染
```

### 3.2 useMemo 使用规则

**适用场景：** 计算开销大的派生数据（排序、过滤、树构建）。

**约束：**
- **禁止** 对简单计算使用 `useMemo`（如 `a + b`、字符串拼接）
- 列表过滤/排序：数据量 > 50 条时使用
- 树构建：必须使用（已在 `use-tag-tree` 中实现）

```typescript
// ✅ — 复杂过滤排序
const filteredChapters = useMemo(() => {
  return chapters
    .filter((ch) => ch.status === filterStatus)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}, [chapters, filterStatus]);

// ❌ — 简单计算
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
```

### 3.3 useCallback 使用规则

**约束：**
- 传给 `React.memo` 子组件的回调必须使用 `useCallback`
- 作为 `useEffect` 依赖的函数必须使用 `useCallback` 或定义在 effect 内部
- **禁止** 在渲染期间创建新函数作为 `useEffect` 的依赖

### 3.4 虚拟滚动

**触发条件：** 列表项 > 100 且每项高度固定或可估算。

**约束：**
- antd `TreeSelect` 已内置虚拟滚动（`virtual` 属性），确保大数据量时启用
- 自定义长列表使用 `react-window` 或 `@tanstack/react-virtual`
- 虚拟滚动组件必须设置固定高度或 `height: 100%`

---

## 四、数据获取与缓存

### 4.1 数据获取模式

当前项目使用自定义 API Client + hooks 模式。约束：

| 模式 | 适用场景 | 示例 |
|------|---------|------|
| 立即获取 | 页面/面板加载时 | `useEffect` + `loadData` |
| 懒获取 | 用户操作触发 | 按钮点击 → `loadDetail` |
| 轮询获取 | 实时性要求高 | AI 生成状态轮询（间隔 ≥ 2s） |

### 4.2 缓存策略

| 数据类型 | 缓存方式 | 失效策略 |
|---------|---------|---------|
| 标签树 | `use-tag-tree` 全局缓存 | 创建/更新/删除时 invalidate |
| 书籍列表 | 组件 state | 切换页面时重新获取 |
| AI 配置 | `book_options` 表 | 保存时更新 |
| 卷纲/章纲 | 组件 state | 切换卷/章时重新获取 |

**约束：**
- 缓存必须有失效机制（mutate / refetch / invalidation）
- 禁止无期限缓存频繁变化的数据
- 全局缓存（如标签树）必须支持按 bookId 隔离

### 4.3 防抖与节流

| 场景 | 方案 | 参数 |
|------|------|------|
| 搜索输入 | 防抖 (`useDebounce`) | 300ms |
| 自动保存 | 防抖 | 1000ms |
| 滚动事件 | 节流 | 100ms |
| 窗口 resize | 节流 | 150ms |
| AI 流式响应 | 无需防抖 | 直接更新 |

---

## 五、资源优化

### 5.1 字体加载

```css
/* ✅ — 使用 font-display: swap 避免 FOIT */
@font-face {
  font-family: 'Inter';
  font-display: swap;
}
```

**约束：**
- 优先使用系统字体栈作为 fallback（已在 `--font-body` 中定义）
- 自定义字体使用 `preload` link 标签
- 中文字体（Noto Sans SC）按需加载，避免全量下载

### 5.2 图片优化

**约束：**
- 使用 `next/image` 组件替代原生 `<img>`
- 设置 `width` + `height` 避免 CLS（布局偏移）
- 使用 `loading="lazy"` 实现懒加载（首屏图片除外）
- 使用 `sizes` 属性控制响应式图片尺寸

### 5.3 CSS 优化

- **禁止** 使用 `@import` 在 CSS 文件中导入其他 CSS（改为 `<link>` 或 JS import）
- CSS Modules 自动按组件分割，无需手动优化
- 避免深层嵌套选择器（≤ 3 层）

### 5.4 JavaScript 包分析

```bash
# 安装分析工具（一次性）
npm install -D @next/bundle-analyzer

# 分析 Bundle 构成
ANALYZE=true npm run build
```

**约束：** 新增第三方依赖前必须评估包大小。单个依赖 > 50KB gzip 需评估替代方案。

---

## 六、SQLite 查询优化

### 6.1 索引策略

```sql
-- ✅ — 外键列必须建索引
CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);

-- ✅ — 高频查询列建索引
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);

-- ✅ — 复合索引（过滤 + 排序）
CREATE INDEX IF NOT EXISTS idx_chapters_volume_status ON chapters(volume_id, status);
```

**约束：**
- 所有外键列必须建索引
- 经常出现在 WHERE 子句中的列必须建索引
- ORDER BY 列与 WHERE 过滤列组合时使用复合索引
- **禁止** 过度索引（单表索引 ≤ 5 个，除非有明确性能需求）

### 6.2 查询优化规则

```typescript
// ✅ — JOIN 替代 N+1
const chapters = db.prepare(`
  SELECT c.*, v.title as volume_title
  FROM chapters c
  JOIN volumes v ON c.volume_id = v.id
  WHERE v.book_id = ?
`).all(bookId);

// ❌ — N+1 查询
const volumes = db.prepare("SELECT * FROM volumes WHERE book_id = ?").all(bookId);
for (const vol of volumes) {
  vol.chapters = db.prepare("SELECT * FROM chapters WHERE volume_id = ?").all(vol.id);
}
```

### 6.3 事务规则

- 多步写操作必须包裹在 `db.transaction()` 中
- 读多写少的场景不需要事务
- 事务中避免调用外部 API（防止长事务）

---

## 七、运行时性能

### 7.1 内存管理

| 风险 | 预防措施 |
|------|---------|
| 大列表未虚拟化 | 超 100 项使用虚拟滚动 |
| 事件监听未清理 | useEffect cleanup 中 removeEventListener |
| 定时器未清理 | useEffect cleanup 中 clearTimeout |
| 闭包持有旧引用 | 依赖数组正确 + cancelled flag |
| WebSocket 未关闭 | 组件卸载时 close |

### 7.2 避免内存泄漏

```typescript
// ✅ — 完整的资源清理模式
useEffect(() => {
  const controller = new AbortController();
  const timer = setInterval(() => { ... }, 5000);
  window.addEventListener("resize", handleResize);

  return () => {
    controller.abort();
    clearInterval(timer);
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

---

## 八、性能监控

### 8.1 开发阶段

| 工具 | 用途 | 使用时机 |
|------|------|---------|
| React DevTools Profiler | 组件渲染分析 | 性能问题排查 |
| Next.js Build Analysis | Bundle 大小分析 | 每次新增依赖后 |
| Chrome DevTools Performance | 运行时性能 | 页面卡顿排查 |
| Lighthouse | 综合性能评分 | 重大变更后 |

### 8.2 生产阶段

| 指标 | 工具 | 告警阈值 |
|------|------|---------|
| Core Web Vitals | Web Vitals API → 日志 | LCP > 2.5s, CLS > 0.1 |
| API 响应时间 | 服务端计时日志 | > 500ms |
| 内存使用 | Node.js process.memoryUsage | > 500MB |
| SQLite 查询慢日志 | 查询计时 | > 100ms |

### 8.3 性能回归预防

- 新增第三方依赖前：执行 `npm run build` 检查 Bundle 增量
- 新增 API 前：确保查询有索引覆盖
- 新增列表渲染前：评估数据量级决定是否需要虚拟化

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| P-1 | Bundle 总大小 < 500KB gzip | `next build` + 分析脚本 | — |
| P-2 | 无未使用的动态导入组件 | ESLint `@next/next/no-dynamic-import` | Code Review |
| P-3 | useEffect 有正确的 cleanup | ESLint `react-hooks/exhaustive-deps` | Code Review |
| P-4 | 列表 > 100 项使用虚拟滚动 | Code Review | 手动测试 |
| P-5 | SQLite 查询有索引覆盖 | `EXPLAIN QUERY PLAN` | Code Review |
| P-6 | 无 N+1 查询 | Code Review | 性能测试 |
| P-7 | 新增依赖 Bundle 增量 < 50KB | CI 构建分析 | — |
| P-8 | LCP < 2.5s, CLS < 0.1 | Lighthouse CI | — |

## 违规整改方案

| 违规 | 整改方式 | 时限 |
|------|---------|------|
| Bundle 超标 | 分析依赖树 → 替换/移除重型依赖 → 拆分动态导入 | 下次提交前 |
| 未使用 memo 导致卡顿 | Profiler 定位 → 添加 React.memo + 稳定 props | 当前迭代 |
| N+1 查询 | 重构为 JOIN 或批量查询 | 当前迭代 |
| 缺失索引 | 补充 CREATE INDEX 迁移 | 当前迭代 |
| useEffect 无 cleanup | 添加 cleanup 函数 | 立即修复 |
| LCP 超标 | 优化首屏加载路径 → 懒加载非关键资源 | 3 个工作日内 |
