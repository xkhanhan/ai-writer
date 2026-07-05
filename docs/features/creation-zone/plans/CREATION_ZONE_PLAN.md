# 创作区改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"内容区域"active 改造为"创作区"（两栏布局，卷纲/章纲/正文管理），新增"正文库"active（存稿备份），采用滚动规划型四层结构。

**Architecture:** 后端 SQLite 新增 4 张表（总纲/卷纲/章纲/存稿），新增 `outline-store.ts` 和对应 API 路由。前端用 antd 组件库实现创作区（左侧 Tree 导航 + 右侧多视图切换）和正文库。替换 `workspace-panels.tsx` 中的 `content` 面板，新增 `archive` 面板。

**Tech Stack:** Next.js App Router, TypeScript strict, SQLite (better-sqlite3), antd 5, @ant-design/icons

---

## 文件结构

### 后端（server/）

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/storage/db.ts` | 修改 | 新增 4 张表的建表语句 |
| `server/storage/outline-store.ts` | 新建 | 总纲/卷纲/章纲/存稿的 CRUD |

### API 路由（app/api/）

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/api/outline/route.ts` | 新建 | 总纲 GET/PUT（按 bookId） |
| `app/api/volumes/route.ts` | 新建 | 卷纲列表 GET / 新建 POST |
| `app/api/volumes/[id]/route.ts` | 新建 | 单卷 GET/PUT/DELETE |
| `app/api/chapters/route.ts` | 新建 | 章纲列表 GET / 新建 POST |
| `app/api/chapters/[id]/route.ts` | 新建 | 单章 GET/PUT/DELETE |
| `app/api/archive/route.ts` | 新建 | 存稿列表 GET |
| `app/api/archive/[id]/route.ts` | 新建 | 存稿 GET/DELETE |
| `app/api/archive/save/route.ts` | 新建 | 存稿 POST（从创作区存入） |

### 类型与前端配置

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/types/index.ts` | 修改 | ActivePanel 新增 `creation`/`archive`；新增数据类型 |
| `app/pages/books/api/creation.ts` | 新建 | 客户端 API 封装 |
| `app/pages/books/hooks/use-creation-zone.ts` | 新建 | 创作区状态管理 hook |
| `app/pages/books/config/workspace-panels.tsx` | 修改 | 替换 content 为 creation + 新增 archive |
| `app/constants/index.ts` | 修改 | WORKSPACE_PANELS 常量更新 |

### 前端组件（创作区）

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/pages/books/components/creation-zone/index.tsx` | 新建 | 创作区主容器（两栏布局 + 视图路由） |
| `app/pages/books/components/creation-zone/index.module.css` | 新建 | 创作区样式 |
| `app/pages/books/components/creation-zone/components/navigation-tree/index.tsx` | 新建 | 左侧导航树（总纲+卷折叠+章纲列表） |
| `app/pages/books/components/creation-zone/components/navigation-tree/index.module.css` | 新建 | 导航树样式 |
| `app/pages/books/components/creation-zone/components/outline-editor/index.tsx` | 新建 | 总纲编辑表单 |
| `app/pages/books/components/creation-zone/components/volume-view/index.tsx` | 新建 | 卷纲内容卡片（只读） |
| `app/pages/books/components/creation-zone/components/volume-form/index.tsx` | 新建 | 卷纲编辑表单 |
| `app/pages/books/components/creation-zone/components/chapter-view/index.tsx` | 新建 | 章纲内容卡片（只读） |
| `app/pages/books/components/creation-zone/components/chapter-form/index.tsx` | 新建 | 章纲编辑表单 |
| `app/pages/books/components/creation-zone/components/content-editor/index.tsx` | 新建 | 正文编辑器 |

### 前端组件（正文库）

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/pages/books/components/archive-view/index.tsx` | 新建 | 正文库主视图 |
| `app/pages/books/components/archive-view/index.module.css` | 新建 | 正文库样式 |

---

## Task 1: 数据库表结构

**Files:**
- Modify: `server/storage/db.ts`

- [ ] **Step 1: 在 `initializeTables` 函数末尾新增 4 张表**

在 `server/storage/db.ts` 的 `initializeTables` 函数中，在 `files` 表创建后追加：

```typescript
  // 创作区 - 卷纲
  db.exec(`
    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      core_conflict TEXT DEFAULT '',
      development_arc TEXT DEFAULT '',
      key_points TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_volumes_book_id ON volumes(book_id);
  `);

  // 创作区 - 章纲
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      volume_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      scenes TEXT DEFAULT '[]',
      characters TEXT DEFAULT '[]',
      key_events TEXT DEFAULT '[]',
      foreshadowings TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '',
      expected_words INTEGER DEFAULT 3000,
      note TEXT DEFAULT '',
      content TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_volume_id ON chapters(volume_id);
  `);

  // 创作区 - 总纲（每本书一条）
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_outlines (
      book_id TEXT PRIMARY KEY,
      direction TEXT DEFAULT '',
      stages TEXT DEFAULT '',
      selling_points TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  // 正文库 - 存稿
  db.exec(`
    CREATE TABLE IF NOT EXISTS archived_chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      archived_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_archive_book_id ON archived_chapters(book_id);
  `);
```

- [ ] **Step 2: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS（无类型错误）

- [ ] **Step 3: 验证 build 通过**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/storage/db.ts
git commit -m "feat(creation): add database tables for volumes, chapters, outlines, archive"
```

---

## Task 2: 类型定义

**Files:**
- Modify: `app/types/index.ts`

- [ ] **Step 1: 更新 ActivePanel 类型**

将 `app/types/index.ts` 第 114 行：

```typescript
export type ActivePanel = "info" | "world-rules" | "settings" | "content";
```

改为：

```typescript
export type ActivePanel = "info" | "world-rules" | "settings" | "creation" | "archive";
```

- [ ] **Step 2: 新增创作区数据类型**

在 `app/types/index.ts` 文件末尾追加：

```typescript
// 创作区数据类型
export interface BookOutline {
  bookId: string;
  direction: string;
  stages: string;
  sellingPoints: string;
  updatedAt: string;
}

export interface KeyPoint {
  chapter: string;
  description: string;
}

export interface VolumeOutline {
  id: string;
  bookId: string;
  title: string;
  coreConflict: string;
  developmentArc: string;
  keyPoints: KeyPoint[];
  highlights: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterOutline {
  id: string;
  volumeId: string;
  title: string;
  summary: string;
  scenes: string[];
  characters: string[];
  keyEvents: string[];
  foreshadowings: string[];
  highlights: string;
  expectedWords: number;
  note: string;
  content: string;
  sortOrder: number;
  status: 'planned' | 'writing' | 'done';
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedChapter {
  id: string;
  bookId: string;
  chapterId: string;
  sortOrder: number;
  title: string;
  content: string;
  wordCount: number;
  archivedAt: string;
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/types/index.ts
git commit -m "feat(creation): add type definitions for creation zone"
```

---

## Task 3: 存储层 outline-store.ts

**Files:**
- Create: `server/storage/outline-store.ts`

- [ ] **Step 1: 创建 outline-store.ts 完整实现**

创建文件 `server/storage/outline-store.ts`：

```typescript
import { randomUUID } from "crypto";
import { db } from "./db";

// ============ 总纲 ============

export interface BookOutlineRow {
  book_id: string;
  direction: string;
  stages: string;
  selling_points: string;
  updated_at: string;
}

export function getBookOutline(bookId: string): BookOutlineRow | null {
  const row = db
    .prepare("SELECT * FROM book_outlines WHERE book_id = ?")
    .get(bookId) as BookOutlineRow | undefined;
  return row ?? null;
}

export function upsertBookOutline(
  bookId: string,
  data: { direction: string; stages: string; sellingPoints: string }
): BookOutlineRow {
  const exists = getBookOutline(bookId);
  if (exists) {
    db.prepare(
      `UPDATE book_outlines SET direction = ?, stages = ?, selling_points = ?, updated_at = datetime('now') WHERE book_id = ?`
    ).run(data.direction, data.stages, data.sellingPoints, bookId);
  } else {
    db.prepare(
      `INSERT INTO book_outlines (book_id, direction, stages, selling_points) VALUES (?, ?, ?, ?)`
    ).run(bookId, data.direction, data.stages, data.sellingPoints);
  }
  return getBookOutline(bookId)!;
}

// ============ 卷纲 ============

export interface VolumeRow {
  id: string;
  book_id: string;
  title: string;
  core_conflict: string;
  development_arc: string;
  key_points: string;
  highlights: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function getVolumesByBookId(bookId: string): VolumeRow[] {
  return db
    .prepare("SELECT * FROM volumes WHERE book_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(bookId) as VolumeRow[];
}

export function getVolumeById(id: string): VolumeRow | null {
  const row = db.prepare("SELECT * FROM volumes WHERE id = ?").get(id) as VolumeRow | undefined;
  return row ?? null;
}

export function createVolume(
  bookId: string,
  data: {
    title: string;
    coreConflict?: string;
    developmentArc?: string;
    keyPoints?: string;
    highlights?: string;
    sortOrder?: number;
  }
): VolumeRow {
  const id = randomUUID();
  const sortOrder = data.sortOrder ?? 0;
  db.prepare(
    `INSERT INTO volumes (id, book_id, title, core_conflict, development_arc, key_points, highlights, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    bookId,
    data.title,
    data.coreConflict ?? "",
    data.developmentArc ?? "",
    data.keyPoints ?? "[]",
    data.highlights ?? "",
    sortOrder
  );
  return getVolumeById(id)!;
}

export function updateVolume(
  id: string,
  data: Partial<{
    title: string;
    coreConflict: string;
    developmentArc: string;
    keyPoints: string;
    highlights: string;
    sortOrder: number;
  }>
): VolumeRow | null {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.coreConflict !== undefined) { fields.push("core_conflict = ?"); values.push(data.coreConflict); }
  if (data.developmentArc !== undefined) { fields.push("development_arc = ?"); values.push(data.developmentArc); }
  if (data.keyPoints !== undefined) { fields.push("key_points = ?"); values.push(data.keyPoints); }
  if (data.highlights !== undefined) { fields.push("highlights = ?"); values.push(data.highlights); }
  if (data.sortOrder !== undefined) { fields.push("sort_order = ?"); values.push(data.sortOrder); }
  if (fields.length === 0) return getVolumeById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE volumes SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getVolumeById(id);
}

export function deleteVolume(id: string): void {
  db.prepare("DELETE FROM volumes WHERE id = ?").run(id);
}

// ============ 章纲 ============

export interface ChapterRow {
  id: string;
  volume_id: string;
  title: string;
  summary: string;
  scenes: string;
  characters: string;
  key_events: string;
  foreshadowings: string;
  highlights: string;
  expected_words: number;
  note: string;
  content: string;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function getChaptersByVolumeId(volumeId: string): ChapterRow[] {
  return db
    .prepare("SELECT * FROM chapters WHERE volume_id = ? ORDER BY sort_order ASC, created_at ASC")
    .all(volumeId) as ChapterRow[];
}

export function getChapterById(id: string): ChapterRow | null {
  const row = db.prepare("SELECT * FROM chapters WHERE id = ?").get(id) as ChapterRow | undefined;
  return row ?? null;
}

export function createChapter(
  volumeId: string,
  data: {
    title: string;
    summary?: string;
    scenes?: string;
    characters?: string;
    keyEvents?: string;
    foreshadowings?: string;
    highlights?: string;
    expectedWords?: number;
    note?: string;
    sortOrder?: number;
  }
): ChapterRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO chapters (id, volume_id, title, summary, scenes, characters, key_events, foreshadowings, highlights, expected_words, note, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`
  ).run(
    id,
    volumeId,
    data.title,
    data.summary ?? "",
    data.scenes ?? "[]",
    data.characters ?? "[]",
    data.keyEvents ?? "[]",
    data.foreshadowings ?? "[]",
    data.highlights ?? "",
    data.expectedWords ?? 3000,
    data.note ?? "",
    data.sortOrder ?? 0
  );
  return getChapterById(id)!;
}

export function updateChapter(
  id: string,
  data: Partial<{
    title: string;
    summary: string;
    scenes: string;
    characters: string;
    keyEvents: string;
    foreshadowings: string;
    highlights: string;
    expectedWords: number;
    note: string;
    content: string;
    sortOrder: number;
    status: string;
  }>
): ChapterRow | null {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  const map: Record<string, string> = {
    title: "title",
    summary: "summary",
    scenes: "scenes",
    characters: "characters",
    keyEvents: "key_events",
    foreshadowings: "foreshadowings",
    highlights: "highlights",
    expectedWords: "expected_words",
    note: "note",
    content: "content",
    sortOrder: "sort_order",
    status: "status",
  };
  for (const [key, col] of Object.entries(map)) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[key as keyof typeof data] as string | number);
    }
  }
  if (fields.length === 0) return getChapterById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE chapters SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getChapterById(id);
}

export function deleteChapter(id: string): void {
  db.prepare("DELETE FROM chapters WHERE id = ?").run(id);
}

// ============ 正文库存稿 ============

export interface ArchivedChapterRow {
  id: string;
  book_id: string;
  chapter_id: string;
  sort_order: number;
  title: string;
  content: string;
  word_count: number;
  archived_at: string;
}

export function getArchivedChaptersByBookId(bookId: string): ArchivedChapterRow[] {
  return db
    .prepare("SELECT * FROM archived_chapters WHERE book_id = ? ORDER BY sort_order ASC, archived_at DESC")
    .all(bookId) as ArchivedChapterRow[];
}

export function getArchivedChapterById(id: string): ArchivedChapterRow | null {
  const row = db.prepare("SELECT * FROM archived_chapters WHERE id = ?").get(id) as ArchivedChapterRow | undefined;
  return row ?? null;
}

export function saveArchivedChapter(
  bookId: string,
  data: { chapterId: string; sortOrder: number; title: string; content: string }
): ArchivedChapterRow {
  // 查找是否已存在同 chapter_id 的存稿
  const existing = db
    .prepare("SELECT id FROM archived_chapters WHERE book_id = ? AND chapter_id = ?")
    .get(bookId, data.chapterId) as { id: string } | undefined;

  const wordCount = data.content.replace(/\s/g, "").length;

  if (existing) {
    db.prepare(
      `UPDATE archived_chapters SET title = ?, content = ?, word_count = ?, sort_order = ?, archived_at = datetime('now') WHERE id = ?`
    ).run(data.title, data.content, wordCount, data.sortOrder, existing.id);
    return getArchivedChapterById(existing.id)!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO archived_chapters (id, book_id, chapter_id, sort_order, title, content, word_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, bookId, data.chapterId, data.sortOrder, data.title, data.content, wordCount);
  return getArchivedChapterById(id)!;
}

export function deleteArchivedChapter(id: string): void {
  db.prepare("DELETE FROM archived_chapters WHERE id = ?").run(id);
}
```

- [ ] **Step 2: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/storage/outline-store.ts
git commit -m "feat(creation): add outline store with CRUD for volumes, chapters, archive"
```

---

## Task 4: API 路由 - 总纲

**Files:**
- Create: `app/api/outline/route.ts`

- [ ] **Step 1: 创建总纲 API 路由**

创建 `app/api/outline/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBookOutline, upsertBookOutline } from "@/server/storage/outline-store";

export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }
  const outline = getBookOutline(bookId);
  return NextResponse.json({ outline });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { bookId, direction, stages, sellingPoints } = body;
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }
  const outline = upsertBookOutline(bookId, {
    direction: direction ?? "",
    stages: stages ?? "",
    sellingPoints: sellingPoints ?? "",
  });
  return NextResponse.json({ outline });
}
```

- [ ] **Step 2: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/outline/route.ts
git commit -m "feat(creation): add outline API route"
```

---

## Task 5: API 路由 - 卷纲

**Files:**
- Create: `app/api/volumes/route.ts`
- Create: `app/api/volumes/[id]/route.ts`

- [ ] **Step 1: 创建卷纲列表路由**

创建 `app/api/volumes/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getVolumesByBookId, createVolume } from "@/server/storage/outline-store";

export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }
  const volumes = getVolumesByBookId(bookId);
  return NextResponse.json({ volumes });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookId, title, coreConflict, developmentArc, keyPoints, highlights, sortOrder } = body;
  if (!bookId || !title) {
    return NextResponse.json({ error: "Missing bookId or title" }, { status: 400 });
  }
  const volume = createVolume(bookId, { title, coreConflict, developmentArc, keyPoints, highlights, sortOrder });
  return NextResponse.json({ volume }, { status: 201 });
}
```

- [ ] **Step 2: 创建单卷路由**

创建 `app/api/volumes/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getVolumeById, updateVolume, deleteVolume } from "@/server/storage/outline-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const volume = getVolumeById(params.id);
  if (!volume) {
    return NextResponse.json({ error: "Volume not found" }, { status: 404 });
  }
  return NextResponse.json({ volume });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const volume = updateVolume(params.id, body);
  if (!volume) {
    return NextResponse.json({ error: "Volume not found" }, { status: 404 });
  }
  return NextResponse.json({ volume });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteVolume(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/volumes/
git commit -m "feat(creation): add volumes API routes"
```

---

## Task 6: API 路由 - 章纲

**Files:**
- Create: `app/api/chapters/route.ts`
- Create: `app/api/chapters/[id]/route.ts`

- [ ] **Step 1: 创建章纲列表路由**

创建 `app/api/chapters/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getChaptersByVolumeId, createChapter } from "@/server/storage/outline-store";

export async function GET(request: NextRequest) {
  const volumeId = request.nextUrl.searchParams.get("volumeId");
  if (!volumeId) {
    return NextResponse.json({ error: "Missing volumeId" }, { status: 400 });
  }
  const chapters = getChaptersByVolumeId(volumeId);
  return NextResponse.json({ chapters });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { volumeId, title, summary, scenes, characters, keyEvents, foreshadowings, highlights, expectedWords, note, sortOrder } = body;
  if (!volumeId || !title) {
    return NextResponse.json({ error: "Missing volumeId or title" }, { status: 400 });
  }
  const chapter = createChapter(volumeId, {
    title, summary, scenes, characters, keyEvents, foreshadowings, highlights, expectedWords, note, sortOrder,
  });
  return NextResponse.json({ chapter }, { status: 201 });
}
```

- [ ] **Step 2: 创建单章路由**

创建 `app/api/chapters/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getChapterById, updateChapter, deleteChapter } from "@/server/storage/outline-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chapter = getChapterById(params.id);
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }
  return NextResponse.json({ chapter });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const chapter = updateChapter(params.id, body);
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }
  return NextResponse.json({ chapter });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteChapter(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/chapters/
git commit -m "feat(creation): add chapters API routes"
```

---

## Task 7: API 路由 - 正文库

**Files:**
- Create: `app/api/archive/route.ts`
- Create: `app/api/archive/[id]/route.ts`
- Create: `app/api/archive/save/route.ts`

- [ ] **Step 1: 创建存稿列表路由**

创建 `app/api/archive/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getArchivedChaptersByBookId } from "@/server/storage/outline-store";

export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }
  const archives = getArchivedChaptersByBookId(bookId);
  return NextResponse.json({ archives });
}
```

- [ ] **Step 2: 创建单条存稿路由**

创建 `app/api/archive/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getArchivedChapterById, deleteArchivedChapter } from "@/server/storage/outline-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const archive = getArchivedChapterById(params.id);
  if (!archive) {
    return NextResponse.json({ error: "Archive not found" }, { status: 404 });
  }
  return NextResponse.json({ archive });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteArchivedChapter(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 创建存稿保存路由**

创建 `app/api/archive/save/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { saveArchivedChapter } from "@/server/storage/outline-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookId, chapterId, sortOrder, title, content } = body;
  if (!bookId || !chapterId) {
    return NextResponse.json({ error: "Missing bookId or chapterId" }, { status: 400 });
  }
  const archive = saveArchivedChapter(bookId, {
    chapterId,
    sortOrder: sortOrder ?? 0,
    title: title ?? "",
    content: content ?? "",
  });
  return NextResponse.json({ archive }, { status: 201 });
}
```

- [ ] **Step 4: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/archive/
git commit -m "feat(creation): add archive API routes"
```

---

## Task 8: 客户端 API 封装

**Files:**
- Create: `app/pages/books/api/creation.ts`

- [ ] **Step 1: 创建客户端 API 封装**

创建 `app/pages/books/api/creation.ts`：

```typescript
import { client } from "@/app/api-client/client";
import type {
  BookOutline,
  VolumeOutline,
  ChapterOutline,
  ArchivedChapter,
  KeyPoint,
} from "@/app/types";

// ============ 类型映射 ============

function mapVolume(row: any): VolumeOutline {
  return {
    id: row.id,
    bookId: row.book_id,
    title: row.title,
    coreConflict: row.core_conflict,
    developmentArc: row.development_arc,
    keyPoints: JSON.parse(row.key_points || "[]") as KeyPoint[],
    highlights: row.highlights,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChapter(row: any): ChapterOutline {
  return {
    id: row.id,
    volumeId: row.volume_id,
    title: row.title,
    summary: row.summary,
    scenes: JSON.parse(row.scenes || "[]"),
    characters: JSON.parse(row.characters || "[]"),
    keyEvents: JSON.parse(row.key_events || "[]"),
    foreshadowings: JSON.parse(row.foreshadowings || "[]"),
    highlights: row.highlights,
    expectedWords: row.expected_words,
    note: row.note,
    content: row.content,
    sortOrder: row.sort_order,
    status: row.status as 'planned' | 'writing' | 'done',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutline(row: any): BookOutline {
  return {
    bookId: row.book_id,
    direction: row.direction,
    stages: row.stages,
    sellingPoints: row.selling_points,
    updatedAt: row.updated_at,
  };
}

function mapArchive(row: any): ArchivedChapter {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    sortOrder: row.sort_order,
    title: row.title,
    content: row.content,
    wordCount: row.word_count,
    archivedAt: row.archived_at,
  };
}

// ============ 总纲 ============

export async function fetchOutline(bookId: string): Promise<BookOutline | null> {
  const res = await client.get(`/api/outline?bookId=${bookId}`);
  if (!res.outline) return null;
  return mapOutline(res.outline);
}

export async function updateOutline(
  bookId: string,
  data: { direction: string; stages: string; sellingPoints: string }
): Promise<BookOutline> {
  const res = await client.put("/api/outline", { bookId, ...data });
  return mapOutline(res.outline);
}

// ============ 卷纲 ============

export async function fetchVolumes(bookId: string): Promise<VolumeOutline[]> {
  const res = await client.get(`/api/volumes?bookId=${bookId}`);
  return (res.volumes as any[]).map(mapVolume);
}

export async function createVolume(
  bookId: string,
  data: { title: string; coreConflict?: string; developmentArc?: string; keyPoints?: KeyPoint[]; highlights?: string }
): Promise<VolumeOutline> {
  const res = await client.post("/api/volumes", {
    bookId,
    ...data,
    keyPoints: data.keyPoints ? JSON.stringify(data.keyPoints) : undefined,
  });
  return mapVolume(res.volume);
}

export async function updateVolume(
  id: string,
  data: Partial<{ title: string; coreConflict: string; developmentArc: string; keyPoints: KeyPoint[]; highlights: string }>
): Promise<VolumeOutline> {
  const body: Record<string, any> = { ...data };
  if (data.keyPoints) body.keyPoints = JSON.stringify(data.keyPoints);
  const res = await client.put(`/api/volumes/${id}`, body);
  return mapVolume(res.volume);
}

export async function deleteVolume(id: string): Promise<void> {
  await client.delete(`/api/volumes/${id}`);
}

// ============ 章纲 ============

export async function fetchChapters(volumeId: string): Promise<ChapterOutline[]> {
  const res = await client.get(`/api/chapters?volumeId=${volumeId}`);
  return (res.chapters as any[]).map(mapChapter);
}

export async function createChapter(
  volumeId: string,
  data: { title: string; summary?: string; scenes?: string[]; characters?: string[]; keyEvents?: string[]; foreshadowings?: string[]; highlights?: string; expectedWords?: number; note?: string }
): Promise<ChapterOutline> {
  const res = await client.post("/api/chapters", {
    volumeId,
    ...data,
    scenes: data.scenes ? JSON.stringify(data.scenes) : undefined,
    characters: data.characters ? JSON.stringify(data.characters) : undefined,
    keyEvents: data.keyEvents ? JSON.stringify(data.keyEvents) : undefined,
    foreshadowings: data.foreshadowings ? JSON.stringify(data.foreshadowings) : undefined,
  });
  return mapChapter(res.chapter);
}

export async function updateChapter(
  id: string,
  data: Partial<{ title: string; summary: string; scenes: string[]; characters: string[]; keyEvents: string[]; foreshadowings: string[]; highlights: string; expectedWords: number; note: string; content: string; status: string }>
): Promise<ChapterOutline> {
  const body: Record<string, any> = { ...data };
  if (data.scenes) body.scenes = JSON.stringify(data.scenes);
  if (data.characters) body.characters = JSON.stringify(data.characters);
  if (data.keyEvents) body.keyEvents = JSON.stringify(data.keyEvents);
  if (data.foreshadowings) body.foreshadowings = JSON.stringify(data.foreshadowings);
  const res = await client.put(`/api/chapters/${id}`, body);
  return mapChapter(res.chapter);
}

export async function deleteChapter(id: string): Promise<void> {
  await client.delete(`/api/chapters/${id}`);
}

// ============ 正文库 ============

export async function fetchArchives(bookId: string): Promise<ArchivedChapter[]> {
  const res = await client.get(`/api/archive?bookId=${bookId}`);
  return (res.archives as any[]).map(mapArchive);
}

export async function getArchive(id: string): Promise<ArchivedChapter | null> {
  const res = await client.get(`/api/archive/${id}`);
  if (!res.archive) return null;
  return mapArchive(res.archive);
}

export async function saveArchive(
  bookId: string,
  data: { chapterId: string; sortOrder: number; title: string; content: string }
): Promise<ArchivedChapter> {
  const res = await client.post("/api/archive/save", { bookId, ...data });
  return mapArchive(res.archive);
}

export async function deleteArchive(id: string): Promise<void> {
  await client.delete(`/api/archive/${id}`);
}
```

- [ ] **Step 2: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/pages/books/api/creation.ts
git commit -m "feat(creation): add client API wrappers for creation zone"
```

---

## Task 9: 创作区状态管理 Hook

**Files:**
- Create: `app/pages/books/hooks/use-creation-zone.ts`

- [ ] **Step 1: 创建 use-creation-zone hook**

创建 `app/pages/books/hooks/use-creation-zone.ts`：

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import type { BookOutline, VolumeOutline, ChapterOutline } from "@/app/types";
import * as api from "../api/creation";

export type ViewMode =
  | { type: "empty" }
  | { type: "outline" }
  | { type: "volume-view"; volumeId: string }
  | { type: "volume-form"; volumeId?: string }
  | { type: "chapter-view"; volumeId: string; chapterId: string }
  | { type: "chapter-form"; volumeId: string; chapterId?: string }
  | { type: "content-editor"; volumeId: string; chapterId: string };

export function useCreationZone(bookId: string) {
  const [outline, setOutline] = useState<BookOutline | null>(null);
  const [volumes, setVolumes] = useState<VolumeOutline[]>([]);
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterOutline[]>>({});
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>({ type: "empty" });
  const [loading, setLoading] = useState(true);

  // 初始加载
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [out, vols] = await Promise.all([
        api.fetchOutline(bookId),
        api.fetchVolumes(bookId),
      ]);
      setOutline(out);
      setVolumes(vols);
      // 加载所有卷的章纲
      const chMap: Record<string, ChapterOutline[]> = {};
      await Promise.all(
        vols.map(async (v) => {
          chMap[v.id] = await api.fetchChapters(v.id);
        })
      );
      setChaptersMap(chMap);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 展开折叠卷
  const toggleVolume = useCallback((volumeId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) next.delete(volumeId);
      else next.add(volumeId);
      return next;
    });
  }, []);

  // 总纲操作
  const saveOutline = useCallback(async (data: { direction: string; stages: string; sellingPoints: string }) => {
    const updated = await api.updateOutline(bookId, data);
    setOutline(updated);
    return updated;
  }, [bookId]);

  // 卷纲操作
  const saveVolume = useCallback(async (data: { id?: string; title: string; coreConflict?: string; developmentArc?: string; keyPoints?: any[]; highlights?: string }) => {
    if (data.id) {
      const updated = await api.updateVolume(data.id, {
        title: data.title,
        coreConflict: data.coreConflict,
        developmentArc: data.developmentArc,
        keyPoints: data.keyPoints,
        highlights: data.highlights,
      });
      setVolumes((prev) => prev.map((v) => (v.id === data.id ? updated : v)));
      return updated;
    } else {
      const created = await api.createVolume(bookId, {
        title: data.title,
        coreConflict: data.coreConflict,
        developmentArc: data.developmentArc,
        keyPoints: data.keyPoints,
        highlights: data.highlights,
      });
      setVolumes((prev) => [...prev, created]);
      setChaptersMap((prev) => ({ ...prev, [created.id]: [] }));
      setExpandedVolumes((prev) => new Set(prev).add(created.id));
      return created;
    }
  }, [bookId]);

  const removeVolume = useCallback(async (volumeId: string) => {
    await api.deleteVolume(volumeId);
    setVolumes((prev) => prev.filter((v) => v.id !== volumeId));
    setChaptersMap((prev) => {
      const next = { ...prev };
      delete next[volumeId];
      return next;
    });
  }, []);

  // 章纲操作
  const refreshChapters = useCallback(async (volumeId: string) => {
    const chapters = await api.fetchChapters(volumeId);
    setChaptersMap((prev) => ({ ...prev, [volumeId]: chapters }));
    return chapters;
  }, []);

  const saveChapter = useCallback(async (volumeId: string, data: { id?: string; title: string; summary?: string; scenes?: string[]; characters?: string[]; keyEvents?: string[]; foreshadowings?: string[]; highlights?: string; expectedWords?: number; note?: string }) => {
    if (data.id) {
      const updated = await api.updateChapter(data.id, {
        title: data.title,
        summary: data.summary,
        scenes: data.scenes,
        characters: data.characters,
        keyEvents: data.keyEvents,
        foreshadowings: data.foreshadowings,
        highlights: data.highlights,
        expectedWords: data.expectedWords,
        note: data.note,
      });
      setChaptersMap((prev) => ({
        ...prev,
        [volumeId]: (prev[volumeId] || []).map((c) => (c.id === data.id ? updated : c)),
      }));
      return updated;
    } else {
      const created = await api.createChapter(volumeId, {
        title: data.title,
        summary: data.summary,
        scenes: data.scenes,
        characters: data.characters,
        keyEvents: data.keyEvents,
        foreshadowings: data.foreshadowings,
        highlights: data.highlights,
        expectedWords: data.expectedWords,
        note: data.note,
      });
      setChaptersMap((prev) => ({
        ...prev,
        [volumeId]: [...(prev[volumeId] || []), created],
      }));
      return created;
    }
  }, []);

  const removeChapter = useCallback(async (volumeId: string, chapterId: string) => {
    await api.deleteChapter(chapterId);
    setChaptersMap((prev) => ({
      ...prev,
      [volumeId]: (prev[volumeId] || []).filter((c) => c.id !== chapterId),
    }));
  }, []);

  // 正文操作
  const saveChapterContent = useCallback(async (chapterId: string, content: string, status?: string) => {
    const updated = await api.updateChapter(chapterId, { content, status });
    const volId = updated.volumeId;
    setChaptersMap((prev) => ({
      ...prev,
      [volId]: (prev[volId] || []).map((c) => (c.id === chapterId ? updated : c)),
    }));
    return updated;
  }, []);

  const saveToArchive = useCallback(async (chapterId: string, sortOrder: number, title: string, content: string) => {
    await api.saveArchive(bookId, { chapterId, sortOrder, title, content });
  }, [bookId]);

  return {
    outline,
    volumes,
    chaptersMap,
    expandedVolumes,
    view,
    loading,
    setView,
    toggleVolume,
    saveOutline,
    saveVolume,
    removeVolume,
    refreshChapters,
    saveChapter,
    removeChapter,
    saveChapterContent,
    saveToArchive,
    reload: loadAll,
  };
}
```

- [ ] **Step 2: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/pages/books/hooks/use-creation-zone.ts
git commit -m "feat(creation): add useCreationZone hook for state management"
```

---

## Task 10: 创作区主容器 + 样式

**Files:**
- Create: `app/pages/books/components/creation-zone/index.tsx`
- Create: `app/pages/books/components/creation-zone/index.module.css`

- [ ] **Step 1: 创建创作区主容器组件**

创建 `app/pages/books/components/creation-zone/index.tsx`：

```tsx
"use client";

import { BookOutlined } from "@ant-design/icons";
import { useCreationZone, ViewMode } from "../../hooks/use-creation-zone";
import { NavigationTree } from "./components/navigation-tree";
import { OutlineEditor } from "./components/outline-editor";
import { VolumeView } from "./components/volume-view";
import { VolumeForm } from "./components/volume-form";
import { ChapterView } from "./components/chapter-view";
import { ChapterForm } from "./components/chapter-form";
import { ContentEditor } from "./components/content-editor";
import styles from "./index.module.css";

interface CreationZoneProps {
  bookId: string;
}

export function CreationZone({ bookId }: CreationZoneProps) {
  const zone = useCreationZone(bookId);

  return (
    <div className={styles.container}>
      <div className={styles.navigation}>
        <NavigationTree zone={zone} />
      </div>
      <div className={styles.content}>
        {renderView(zone)}
      </div>
    </div>
  );
}

function renderView(zone: ReturnType<typeof useCreationZone>): React.ReactNode {
  const { view } = zone;
  switch (view.type) {
    case "empty":
      return <EmptyState zone={zone} />;
    case "outline":
      return <OutlineEditor outline={zone.outline} onSave={zone.saveOutline} onCancel={() => zone.setView({ type: "empty" })} />;
    case "volume-view":
      return <VolumeView volume={zone.volumes.find(v => v.id === (view as any).volumeId)!} onEdit={() => zone.setView({ type: "volume-form", volumeId: (view as any).volumeId })} />;
    case "volume-form":
      return <VolumeForm volume={zone.volumes.find(v => v.id === (view as any).volumeId)} onSave={zone.saveVolume} onCancel={() => zone.setView({ type: "empty" })} />;
    case "chapter-view":
      return <ChapterView volumeId={(view as any).volumeId} chapterId={(view as any).chapterId} zone={zone} />;
    case "chapter-form":
      return <ChapterForm volumeId={(view as any).volumeId} chapter={zone.chaptersMap[(view as any).volumeId]?.find(c => c.id === (view as any).chapterId)} onSave={(data) => zone.saveChapter((view as any).volumeId, data)} onCancel={() => zone.setView({ type: "empty" })} />;
    case "content-editor":
      return <ContentEditor volumeId={(view as any).volumeId} chapterId={(view as any).chapterId} zone={zone} />;
    default:
      return <EmptyState zone={zone} />;
  }
}

function EmptyState({ zone }: { zone: ReturnType<typeof useCreationZone> }) {
  return (
    <div className={styles.emptyState}>
      <BookOutlined className={styles.emptyIcon} />
      <h3 className={styles.emptyTitle}>开始你的创作</h3>
      <p className={styles.emptyDesc}>
        建议的创作流程：<br />
        1. 先写总纲（模糊的整体方向）<br />
        2. 新建第一卷，填写卷纲<br />
        3. 在卷下添加章纲<br />
        4. 根据章纲写正文
      </p>
      <div className={styles.emptyActions}>
        <button className={styles.btnSecondary} onClick={() => zone.setView({ type: "outline" })}>编辑总纲</button>
        <button className={styles.btnPrimary} onClick={() => zone.setView({ type: "volume-form" })}>新建第一卷</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建创作区样式**

创建 `app/pages/books/components/creation-zone/index.module.css`：

```css
.container {
  display: flex;
  height: 100%;
  background: var(--bg-paper);
}

.navigation {
  width: 280px;
  border-right: 1px solid var(--line);
  background: var(--bg-panel);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow: auto;
  background: var(--bg-panel);
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.emptyIcon {
  font-size: 48px;
  color: var(--ink-ter);
  opacity: 0.3;
  margin-bottom: 16px;
}

.emptyTitle {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--ink);
  margin: 0 0 12px;
}

.emptyDesc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.8;
  margin: 0 0 24px;
  max-width: 400px;
}

.emptyActions {
  display: flex;
  gap: 12px;
}

.btnPrimary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
}

.btnPrimary:hover {
  opacity: 0.9;
}

.btnSecondary {
  background: var(--bg-panel);
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS（可能有子组件缺失的错误，先创建占位文件，后续 Task 实现）

- [ ] **Step 4: Commit**

```bash
git add app/pages/books/components/creation-zone/index.tsx app/pages/books/components/creation-zone/index.module.css
git commit -m "feat(creation): add creation zone main container"
```

---

## Task 11: 左侧导航树组件

**Files:**
- Create: `app/pages/books/components/creation-zone/components/navigation-tree/index.tsx`
- Create: `app/pages/books/components/creation-zone/components/navigation-tree/index.module.css`

- [ ] **Step 1: 创建导航树组件**

创建 `app/pages/books/components/creation-zone/components/navigation-tree/index.tsx`：

```tsx
"use client";

import { PlusOutlined, DownOutlined, RightOutlined, FileTextOutlined } from "@ant-design/icons";
import type { ChapterOutline } from "@/types";
import type { useCreationZone } from "../../../hooks/use-creation-zone";
import styles from "./index.module.css";

type Zone = ReturnType<typeof useCreationZone>;

export function NavigationTree({ zone }: { zone: Zone }) {
  const { outline, volumes, chaptersMap, expandedVolumes, setView, toggleVolume, loading } = zone;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>创作区</span>
      </div>

      <div className={styles.body}>
        {/* 总纲 */}
        <div
          className={`${styles.outlineItem} ${zone.view.type === "outline" ? styles.outlineActive : ""}`}
          onClick={() => setView({ type: "outline" })}
        >
          <FileTextOutlined className={styles.outlineIcon} />
          <div>
            <div className={styles.outlineTitle}>总纲</div>
            <div className={styles.outlineSub}>模糊方向</div>
          </div>
        </div>

        {/* 卷列表 */}
        {volumes.map((vol) => {
          const chapters = chaptersMap[vol.id] || [];
          const expanded = expandedVolumes.has(vol.id);
          const isActive = zone.view.type === "volume-view" && (zone.view as any).volumeId === vol.id;
          return (
            <div key={vol.id} className={styles.volumeGroup}>
              <div
                className={`${styles.volumeBar} ${isActive ? styles.volumeActive : ""}`}
                onClick={() => toggleVolume(vol.id)}
              >
                {expanded ? <DownOutlined className={styles.arrow} /> : <RightOutlined className={styles.arrow} />}
                <span className={styles.volumeTitle}>{vol.title}</span>
                <span className={styles.volumeCount}>{chapters.length}章</span>
              </div>
              {expanded && (
                <div className={styles.chapterList}>
                  {chapters.map((ch) => (
                    <ChapterItem
                      key={ch.id}
                      chapter={ch}
                      isActive={zone.view.type === "chapter-view" && (zone.view as any).chapterId === ch.id}
                      onClick={() => setView({ type: "chapter-view", volumeId: vol.id, chapterId: ch.id })}
                    />
                  ))}
                  <div
                    className={styles.addChapter}
                    onClick={() => setView({ type: "chapter-form", volumeId: vol.id })}
                  >
                    <PlusOutlined /> 添加章纲
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 新建卷 */}
        <div className={styles.addVolume} onClick={() => setView({ type: "volume-form" })}>
          <PlusOutlined /> 新建卷
        </div>
      </div>
    </div>
  );
}

function ChapterItem({ chapter, isActive, onClick }: { chapter: ChapterOutline; isActive: boolean; onClick: () => void }) {
  const statusClass =
    chapter.status === "done" ? styles.statusDone :
    chapter.status === "writing" ? styles.statusWriting :
    styles.statusPlanned;
  return (
    <div className={`${styles.chapterItem} ${statusClass} ${isActive ? styles.chapterActive : ""}`} onClick={onClick}>
      <span className={styles.chapterTitle}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
      <span className={styles.chapterStatus}>
        {chapter.status === "done" ? "✓" : chapter.status === "writing" ? "撰写中" : chapter.summary ? "已规划" : "待写"}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: 创建导航树样式**

创建 `app/pages/books/components/creation-zone/components/navigation-tree/index.module.css`：

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.title {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
  font-size: 14px;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 总纲 */
.outlineItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  cursor: pointer;
  background: var(--bg-soft);
  border-left: 3px solid var(--accent);
}

.outlineItem:hover {
  background: var(--bg-strong);
}

.outlineActive {
  background: var(--bg-strong);
}

.outlineIcon {
  color: var(--accent);
  font-size: 14px;
}

.outlineTitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
}

.outlineSub {
  font-size: 10px;
  color: var(--ink-ter);
  margin-top: 2px;
}

/* 卷 */
.volumeGroup {
  margin-bottom: 8px;
}

.volumeBar {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--line);
}

.volumeBar:hover {
  background: var(--bg-strong);
}

.volumeActive {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.volumeActive .volumeTitle,
.volumeActive .volumeCount {
  color: #fff;
}

.arrow {
  font-size: 10px;
  margin-right: 6px;
  color: var(--ink-ter);
}

.volumeTitle {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-sec);
}

.volumeCount {
  font-size: 10px;
  color: var(--ink-ter);
}

/* 章纲列表 */
.chapterList {
  padding: 4px 0 0 12px;
  margin-left: 10px;
  margin-top: 4px;
  border-left: 1px solid var(--line);
}

.chapterItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
  cursor: pointer;
  font-size: 11px;
  background: var(--bg-soft);
  border-left: 2px solid var(--ink-light);
}

.chapterItem:hover {
  background: var(--bg-strong);
}

.chapterActive {
  background: var(--bg-strong);
  box-shadow: 0 0 0 2px rgba(196, 30, 58, 0.15);
}

.statusDone {
  border-left-color: var(--jade);
}

.statusWriting {
  border-left-color: var(--gold);
}

.statusPlanned {
  border-left-color: var(--ink-light);
}

.chapterTitle {
  color: var(--ink-sec);
}

.chapterStatus {
  font-size: 10px;
  color: var(--ink-ter);
}

/* 添加按钮 */
.addChapter {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  color: var(--ink-ter);
  border: 1px dashed var(--line-strong);
  text-align: center;
  background: var(--bg-soft);
}

.addChapter:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.addVolume {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  color: var(--ink-ter);
  border: 1px dashed var(--line-strong);
  text-align: center;
  background: var(--bg-soft);
}

.addVolume:hover {
  color: var(--accent);
  border-color: var(--accent);
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/pages/books/components/creation-zone/components/navigation-tree/
git commit -m "feat(creation): add navigation tree component"
```

---

## Task 12: 总纲、卷纲视图、章纲视图组件（3 块）

**Files:**
- Create: `app/pages/books/components/creation-zone/components/outline-editor/index.tsx`
- Create: `app/pages/books/components/creation-zone/components/volume-view/index.tsx`
- Create: `app/pages/books/components/creation-zone/components/chapter-view/index.tsx`

- [ ] **Step 1: 创建总纲编辑器**

创建 `app/pages/books/components/creation-zone/components/outline-editor/index.tsx`：

```tsx
"use client";

import { useState } from "react";
import { Button, Input, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import type { BookOutline } from "@/types";

const { TextArea } = Input;

interface Props {
  outline: BookOutline | null;
  onSave: (data: { direction: string; stages: string; sellingPoints: string }) => Promise<BookOutline>;
  onCancel: () => void;
}

export function OutlineEditor({ outline, onSave, onCancel }: Props) {
  const [direction, setDirection] = useState(outline?.direction ?? "");
  const [stages, setStages] = useState(outline?.stages ?? "");
  const [sellingPoints, setSellingPoints] = useState(outline?.sellingPoints ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ direction, stages, sellingPoints });
      message.success("总纲已保存");
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", color: "var(--ink)", margin: 0 }}>总纲</h3>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
      </div>
      <div style={{ background: "var(--bg-soft)", padding: 12, borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent)", marginBottom: 16 }}>
        <span style={{ color: "var(--ink-ter)", fontSize: 12 }}>总纲保持模糊，随写作推进逐步细化。不需要写细节，只写方向。</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>整体方向</label>
        <TextArea value={direction} onChange={(e) => setDirection(e.target.value)} rows={3} placeholder="故事的大方向" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>阶段划分</label>
        <TextArea value={stages} onChange={(e) => setStages(e.target.value)} rows={5} placeholder="每个阶段的大致方向，每行一个阶段" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>核心卖点</label>
        <Input value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder="逗号分隔" />
      </div>
      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
```

- [ ] **Step 2: 创建卷纲内容视图**

创建 `app/pages/books/components/creation-zone/components/volume-view/index.tsx`：

```tsx
"use client";

import { Button, Tag, Empty } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { VolumeOutline } from "@/types";

interface Props {
  volume: VolumeOutline | undefined;
  onEdit: () => void;
}

export function VolumeView({ volume, onEdit }: Props) {
  if (!volume) return <Empty description="未找到卷纲" />;
  const highlights = volume.highlights ? volume.highlights.split(/[，,]/).filter(Boolean) : [];
  const arcSteps = volume.developmentArc ? volume.developmentArc.split("→").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink)" }}>{volume.title}</span>
          <Tag color="red">卷纲</Tag>
        </div>
        <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>编辑卷纲</Button>
      </div>

      {volume.coreConflict && (
        <div style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>核心冲突</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--ink)" }}>{volume.coreConflict}</div>
        </div>
      )}

      {arcSteps.length > 0 && (
        <div style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>发展弧线</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {arcSteps.map((step, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Tag>{step}</Tag>
                {i < arcSteps.length - 1 && <span style={{ color: "var(--accent)" }}>→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {volume.keyPoints.length > 0 && (
        <div style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>重要节点</div>
          {volume.keyPoints.map((kp, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
              <span style={{ color: "var(--jade)" }}>●</span> {kp.chapter}：{kp.description}
            </div>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <div style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--jade)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--jade)", marginBottom: 8 }}>预计看点</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {highlights.map((h, i) => <Tag key={i} color="green">{h}</Tag>)}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建章纲内容视图**

创建 `app/pages/books/components/creation-zone/components/chapter-view/index.tsx`：

```tsx
"use client";

import { Button, Tag, Empty } from "antd";
import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import type { useCreationZone } from "../../../hooks/use-creation-zone";

type Zone = ReturnType<typeof useCreationZone>;

interface Props {
  volumeId: string;
  chapterId: string;
  zone: Zone;
}

export function ChapterView({ volumeId, chapterId, zone }: Props) {
  const chapters = zone.chaptersMap[volumeId] || [];
  const chapter = chapters.find((c) => c.id === chapterId);

  if (!chapter) return <Empty description="未找到章纲" />;

  const statusTag = chapter.status === "done" ? { color: "green", text: "已完成" } :
    chapter.status === "writing" ? { color: "gold", text: "撰写中" } :
    { color: "default", text: "已规划" };

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink)" }}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
          <Tag color={statusTag.color}>{statusTag.text}</Tag>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<EditOutlined />} onClick={() => zone.setView({ type: "chapter-form", volumeId, chapterId })}>编辑章纲</Button>
          <Button type="primary" icon={<FileTextOutlined />} onClick={() => zone.setView({ type: "content-editor", volumeId, chapterId })}>写正文</Button>
        </div>
      </div>

      {chapter.summary && (
        <Card title="情节概要" color="accent">
          {chapter.summary}
        </Card>
      )}

      {chapter.scenes.length > 0 && (
        <Card title="场景设定" color="indigo">
          <TagList items={chapter.scenes} color="blue" />
        </Card>
      )}

      {chapter.characters.length > 0 && (
        <Card title="出场人物" color="jade">
          <TagList items={chapter.characters} color="green" />
        </Card>
      )}

      {chapter.keyEvents.length > 0 && (
        <Card title="重大事件" color="accent">
          {chapter.keyEvents.map((ev, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
              <span style={{ color: "var(--accent)" }}>●</span> {ev}
            </div>
          ))}
        </Card>
      )}

      {chapter.foreshadowings.length > 0 && (
        <Card title="伏笔铺设" color="gold">
          {chapter.foreshadowings.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
              <span style={{ color: "var(--gold)" }}>◆</span> {f}
            </div>
          ))}
        </Card>
      )}

      {chapter.highlights && (
        <Card title="预计看点" color="jade">
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--ink)" }}>{chapter.highlights}</div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "var(--ink-ter)" }}>预计字数：<span style={{ color: "var(--ink)" }}>{chapter.expectedWords}</span></div>
        {chapter.note && (
          <div style={{ fontSize: 12, color: "var(--ink-ter)" }}>备注：<span style={{ color: "var(--ink)" }}>{chapter.note}</span></div>
        )}
      </div>

      {chapter.content && (
        <Card title="已写正文" color="ink">
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-sec)", maxHeight: 200, overflow: "auto", margin: 0 }}>
            {chapter.content}
          </pre>
        </Card>
      )}
    </div>
  );
}

function Card({ title, color, children }: { title: string; color: "accent" | "jade" | "gold" | "indigo" | "ink"; children: React.ReactNode }) {
  const colorVar = `var(--${color === "ink" ? "ink-sec" : color})`;
  return (
    <div style={{ background: "var(--bg-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: `3px solid ${colorVar}` }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: colorVar, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map((it, i) => <Tag key={i} color={color}>{it}</Tag>)}
    </div>
  );
}
```

- [ ] **Step 4: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/books/components/creation-zone/components/outline-editor/ app/pages/books/components/creation-zone/components/volume-view/ app/pages/books/components/creation-zone/components/chapter-view/
git commit -m "feat(creation): add outline editor, volume view, chapter view components"
```

---

## Task 13: 卷纲编辑表单

**Files:**
- Create: `app/pages/books/components/creation-zone/components/volume-form/index.tsx`

- [ ] **Step 1: 创建卷纲编辑表单**

创建 `app/pages/books/components/creation-zone/components/volume-form/index.tsx`：

```tsx
"use client";

import { useState } from "react";
import { Button, Input, message } from "antd";
import { SaveOutlined, DeleteOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { VolumeOutline, KeyPoint } from "@/types";

const { TextArea } = Input;

interface Props {
  volume?: VolumeOutline;
  onSave: (data: { id?: string; title: string; coreConflict?: string; developmentArc?: string; keyPoints?: KeyPoint[]; highlights?: string }) => Promise<VolumeOutline>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

export function VolumeForm({ volume, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(volume?.title ?? "");
  const [coreConflict, setCoreConflict] = useState(volume?.coreConflict ?? "");
  const [developmentArc, setDevelopmentArc] = useState(volume?.developmentArc ?? "");
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>(volume?.keyPoints ?? []);
  const [highlights, setHighlights] = useState(volume?.highlights ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning("请输入卷标题");
      return;
    }
    setSaving(true);
    try {
      await onSave({ id: volume?.id, title, coreConflict, developmentArc, keyPoints, highlights });
      message.success(volume ? "卷纲已更新" : "卷纲已创建");
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!volume?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(volume.id);
      message.success("卷纲已删除");
    } catch {
      message.error("删除失败");
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", color: "var(--ink)", margin: 0 }}>{volume ? "编辑卷纲" : "新建卷纲"}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {volume?.id && onDelete && (
            <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={handleDelete}>删除</Button>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>卷标题</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：第一卷 风起" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>核心冲突</label>
        <TextArea value={coreConflict} onChange={(e) => setCoreConflict(e.target.value)} rows={3} placeholder="本卷的核心矛盾" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>发展弧线</label>
        <TextArea value={developmentArc} onChange={(e) => setDevelopmentArc(e.target.value)} rows={2} placeholder="用 → 分隔阶段，如：蓄势 → 爆发 → 逆转" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>重要节点</label>
        {keyPoints.map((kp, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Input style={{ width: 120 }} value={kp.chapter} placeholder="章节" onChange={(e) => {
              const next = [...keyPoints]; next[i] = { ...next[i], chapter: e.target.value }; setKeyPoints(next);
            }} />
            <Input value={kp.description} placeholder="节点描述" onChange={(e) => {
              const next = [...keyPoints]; next[i] = { ...next[i], description: e.target.value }; setKeyPoints(next);
            }} />
            <Button icon={<MinusCircleOutlined />} onClick={() => setKeyPoints(keyPoints.filter((_, idx) => idx !== i))} />
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => setKeyPoints([...keyPoints, { chapter: "", description: "" }])}>添加节点</Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>预计看点</label>
        <Input value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="用逗号分隔多个看点" />
      </div>

      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
```

- [ ] **Step 2: 在 useCreationZone 中补充 removeVolume 调用支持（已在 Task 9 提供）**

无需新增代码，Task 9 中 `removeVolume` 已实现。

- [ ] **Step 3: 在 CreationZone 主容器中调用 VolumeForm（已在 Task 10 完成）**

主容器已支持 `volume-form` 视图，但需要把 `onDelete` 传入。更新 `renderView` 中 `volume-form` 分支为：

```tsx
    case "volume-form":
      return <VolumeForm volume={zone.volumes.find(v => v.id === (view as any).volumeId)} onSave={zone.saveVolume} onDelete={zone.removeVolume} onCancel={() => zone.setView({ type: "empty" })} />;
```

- [ ] **Step 4: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/books/components/creation-zone/components/volume-form/ app/pages/books/components/creation-zone/index.tsx
git commit -m "feat(creation): add volume form component with key points editor"
```

---

## Task 14: 章纲编辑表单

**Files:**
- Create: `app/pages/books/components/creation-zone/components/chapter-form/index.tsx`

- [ ] **Step 1: 创建章纲编辑表单（丰富字段：场景、人物、事件、伏笔、看点、字数、备注）**

创建 `app/pages/books/components/creation-zone/components/chapter-form/index.tsx`：

```tsx
"use client";

import { useState } from "react";
import { Button, Input, InputNumber, message } from "antd";
import { SaveOutlined, DeleteOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { ChapterOutline } from "@/types";

const { TextArea } = Input;

interface Props {
  volumeId: string;
  chapter?: ChapterOutline;
  onSave: (data: { id?: string; title: string; summary?: string; scenes?: string[]; characters?: string[]; keyEvents?: string[]; foreshadowings?: string[]; highlights?: string; expectedWords?: number; note?: string }) => Promise<ChapterOutline>;
  onCancel: () => void;
  onDelete?: (volumeId: string, chapterId: string) => Promise<void>;
}

export function ChapterForm({ volumeId, chapter, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(chapter?.title ?? "");
  const [summary, setSummary] = useState(chapter?.summary ?? "");
  const [scenes, setScenes] = useState<string[]>(chapter?.scenes ?? []);
  const [characters, setCharacters] = useState<string[]>(chapter?.characters ?? []);
  const [keyEvents, setKeyEvents] = useState<string[]>(chapter?.keyEvents ?? []);
  const [foreshadowings, setForeshadowings] = useState<string[]>(chapter?.foreshadowings ?? []);
  const [highlights, setHighlights] = useState(chapter?.highlights ?? "");
  const [expectedWords, setExpectedWords] = useState(chapter?.expectedWords ?? 3000);
  const [note, setNote] = useState(chapter?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning("请输入章节标题");
      return;
    }
    setSaving(true);
    try {
      await onSave({ id: chapter?.id, title, summary, scenes, characters, keyEvents, foreshadowings, highlights, expectedWords, note });
      message.success(chapter ? "章纲已更新" : "章纲已创建");
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!chapter?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(volumeId, chapter.id);
      message.success("章纲已删除");
    } catch {
      message.error("删除失败");
      setDeleting(false);
    }
  };

  const renderStringListEditor = (label: string, items: string[], setItems: (v: string[]) => void) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>{label}</label>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input value={it} onChange={(e) => { const next = [...items]; next[i] = e.target.value; setItems(next); }} />
          <Button icon={<MinusCircleOutlined />} onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setItems([...items, ""])}>添加</Button>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 700, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", color: "var(--ink)", margin: 0 }}>{chapter ? "编辑章纲" : "新建章纲"}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {chapter?.id && onDelete && (
            <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={handleDelete}>删除</Button>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>章节标题</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：意外发现" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>情节概要</label>
        <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="本章主要情节" />
      </div>

      {renderStringListEditor("场景设定", scenes, setScenes)}
      {renderStringListEditor("出场人物", characters, setCharacters)}
      {renderStringListEditor("重大事件", keyEvents, setKeyEvents)}
      {renderStringListEditor("伏笔铺设", foreshadowings, setForeshadowings)}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>预计看点</label>
        <TextArea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={2} placeholder="本章的爽点或看点" />
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>预计字数</label>
          <InputNumber value={expectedWords} onChange={(v) => setExpectedWords(v ?? 3000)} min={100} step={500} style={{ width: 150 }} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 12, color: "var(--ink-sec)", marginBottom: 6 }}>备注</label>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="写作时的注意事项" />
      </div>

      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
```

- [ ] **Step 2: 在 CreationZone 主容器中调用 ChapterForm 时传入 onDelete**

更新 `renderView` 中 `chapter-form` 分支为：

```tsx
    case "chapter-form":
      return <ChapterForm volumeId={(view as any).volumeId} chapter={zone.chaptersMap[(view as any).volumeId]?.find(c => c.id === (view as any).chapterId)} onSave={(data) => zone.saveChapter((view as any).volumeId, data)} onDelete={zone.removeChapter} onCancel={() => zone.setView({ type: "empty" })} />;
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/pages/books/components/creation-zone/components/chapter-form/ app/pages/books/components/creation-zone/index.tsx
git commit -m "feat(creation): add chapter form with rich fields (scenes, characters, events, foreshadowings)"
```

---

## Task 15: 正文编辑器

**Files:**
- Create: `app/pages/books/components/creation-zone/components/content-editor/index.tsx`

- [ ] **Step 1: 创建正文编辑器组件**

创建 `app/pages/books/components/creation-zone/components/content-editor/index.tsx`：

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Input, Tag, message } from "antd";
import { SaveOutlined, InboxOutlined } from "@ant-design/icons";
import type { useCreationZone } from "../../../hooks/use-creation-zone";

const { TextArea } = Input;

type Zone = ReturnType<typeof useCreationZone>;

interface Props {
  volumeId: string;
  chapterId: string;
  zone: Zone;
}

export function ContentEditor({ volumeId, chapterId, zone }: Props) {
  const chapter = zone.chaptersMap[volumeId]?.find((c) => c.id === chapterId);
  const [content, setContent] = useState(chapter?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setContent(chapter?.content ?? "");
    setDirty(false);
  }, [chapterId, chapter?.content]);

  const wordCount = useMemo(() => content.replace(/\s/g, "").length, [content]);

  const handleSave = async (status?: string) => {
    setSaving(true);
    try {
      await zone.saveChapterContent(chapterId, content, status ?? chapter?.status);
      message.success("正文已保存");
      setDirty(false);
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!chapter) return;
    setArchiving(true);
    try {
      await zone.saveToArchive(chapterId, chapter.sortOrder, chapter.title, content);
      message.success("已存入正文库");
    } catch {
      message.error("存档失败");
    } finally {
      setArchiving(false);
    }
  };

  if (!chapter) return <div style={{ padding: 24 }}>未找到章节</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink)" }}>第{chapter.sortOrder + 1}章 {chapter.title}</span>
          <Tag color="red">正文</Tag>
          {dirty && <Tag color="gold">未保存</Tag>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<InboxOutlined />} loading={archiving} onClick={handleArchive}>存入正文库</Button>
          <Button onClick={() => handleSave("writing")}>保存为撰写中</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => handleSave("done")}>保存并完成</Button>
        </div>
      </div>

      {chapter.summary && (
        <div style={{ padding: "8px 24px", background: "var(--bg-soft)", fontSize: 12, color: "var(--ink-ter)", borderLeft: "3px solid var(--accent)" }}>
          情节概要：{chapter.summary}
        </div>
      )}

      <div style={{ flex: 1, padding: 24, overflow: "hidden" }}>
        <TextArea
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true); }}
          style={{ height: "100%", resize: "none", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.8 }}
          placeholder="在此撰写正文..."
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 24px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--ink-ter)" }}>
        <span>字数：{wordCount} / 预计 {chapter.expectedWords}</span>
        <span>目标完成度：{chapter.expectedWords > 0 ? Math.min(100, Math.round((wordCount / chapter.expectedWords) * 100)) : 0}%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/pages/books/components/creation-zone/components/content-editor/
git commit -m "feat(creation): add content editor with word count and archive action"
```

---

## Task 16: 正文库视图

**Files:**
- Create: `app/pages/books/components/archive-view/index.tsx`
- Create: `app/pages/books/components/archive-view/index.module.css`

- [ ] **Step 1: 创建正文库主视图**

创建 `app/pages/books/components/archive-view/index.tsx`：

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Empty, Modal, message, Tag } from "antd";
import { InboxOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { fetchArchives, deleteArchive, getArchive } from "../../api/creation";
import type { ArchivedChapter } from "@/types";
import styles from "./index.module.css";

interface Props {
  bookId: string;
}

export function ArchiveView({ bookId }: Props) {
  const [archives, setArchives] = useState<ArchivedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ArchivedChapter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArchives(await fetchArchives(bookId));
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后不可恢复，确定删除该存稿吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        await deleteArchive(id);
        message.success("已删除");
        load();
      },
    });
  };

  const handlePreview = async (id: string) => {
    const a = await getArchive(id);
    setPreview(a);
  };

  const totalWords = archives.reduce((sum, a) => sum + a.wordCount, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <InboxOutlined className={styles.headerIcon} />
          <span className={styles.title}>正文库</span>
          <Tag color="red">{archives.length} 章</Tag>
          <Tag color="green">{totalWords} 字</Tag>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>加载中...</div>
      ) : archives.length === 0 ? (
        <Empty className={styles.empty} description="还没有存稿，在创作区写完正文后可存入这里" />
      ) : (
        <div className={styles.list}>
          {archives.map((a) => (
            <div key={a.id} className={styles.item}>
              <div style={{ flex: 1 }}>
                <div className={styles.itemTitle}>第{a.sortOrder + 1}章 {a.title}</div>
                <div className={styles.itemMeta}>存档于 {a.archivedAt.replace("T", " ").slice(0, 16)} · {a.wordCount} 字</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(a.id)}>查看</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(a.id)}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        title={preview ? `第${preview.sortOrder + 1}章 ${preview.title}` : ""}
        onCancel={() => setPreview(null)}
        footer={[
          <Button key="close" onClick={() => setPreview(null)}>关闭</Button>,
        ]}
        width={720}
      >
        {preview && (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.8, maxHeight: "60vh", overflow: "auto", margin: 0 }}>
            {preview.content}
          </pre>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: 创建正文库样式**

创建 `app/pages/books/components/archive-view/index.module.css`：

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-panel);
}

.header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.headerIcon {
  color: var(--accent);
  font-size: 16px;
}

.title {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
  font-size: 14px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ink-ter);
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  border-left: 3px solid var(--accent);
}

.item:hover {
  background: var(--bg-strong);
}

.itemTitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.itemMeta {
  font-size: 11px;
  color: var(--ink-ter);
  margin-top: 4px;
}
```

- [ ] **Step 3: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/pages/books/components/archive-view/
git commit -m "feat(archive): add archive view with preview and delete"
```

---

## Task 17: 工作区面板配置接入

**Files:**
- Modify: `app/pages/books/config/workspace-panels.tsx`
- Modify: `app/constants/index.ts`

- [ ] **Step 1: 更新 workspace-panels.tsx**

在 `app/pages/books/config/workspace-panels.tsx` 中：
1. 将 `content` 面板（原 `FolderFileEditor`）替换为 `creation` 面板，渲染 `<CreationZone bookId={bookId} />`
2. 新增 `archive` 面板，渲染 `<ArchiveView bookId={bookId} />`
3. 移除对 `FolderFileEditor` 的导入（除非其它地方仍使用）

替换原 `content` 面板配置为：

```tsx
  {
    key: "creation",
    label: "创作区",
    render: (bookId: string) => <CreationZone bookId={bookId} />,
  },
  {
    key: "archive",
    label: "正文库",
    render: (bookId: string) => <ArchiveView bookId={bookId} />,
  },
```

并在顶部新增导入：

```tsx
import { CreationZone } from "../components/creation-zone";
import { ArchiveView } from "../components/archive-view";
```

原 `content` 面板的整段配置删除。

- [ ] **Step 2: 更新 constants/index.ts**

将 `app/constants/index.ts` 第 22-27 行的 `WORKSPACE_PANELS` 常量中的 `"content"` 替换为 `"creation"` 和 `"archive"`：

```typescript
export const WORKSPACE_PANELS = [
  { key: "info", label: "信息" },
  { key: "world-rules", label: "设定" },
  { key: "settings", label: "设置" },
  { key: "creation", label: "创作区" },
  { key: "archive", label: "正文库" },
] as const;
```

- [ ] **Step 3: 检查 app/pages/books/index.tsx 中的默认面板**

确认 `useState<ActivePanel>("info")` 不需要改动（默认仍是 info）。如有引用 `content` 的地方同步改为 `creation`。

- [ ] **Step 4: 验证 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: 验证 build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/pages/books/config/workspace-panels.tsx app/constants/index.ts
git commit -m "feat(creation): wire creation zone and archive panel into workspace"
```

---

## Task 18: 联调验证

**Files:** 无新文件

- [ ] **Step 1: 启动 dev 服务器**

Run: `npm run dev`
打开浏览器进入书籍工作区，切换到"创作区"标签。

- [ ] **Step 2: 验证无 AI 路径全流程**

1. 空状态显示 → 点击"编辑总纲" → 填写 → 保存 → 返回
2. 点击"新建卷" → 填写卷纲 → 保存 → 左侧树出现卷
3. 展开卷 → 点击"添加章纲" → 填写场景/人物/事件等 → 保存
4. 点击章纲 → 查看视图 → 点击"写正文" → 输入正文 → 保存
5. 切换到"正文库"标签 → 看到存稿 → 预览 → 删除
6. 编辑卷纲/章纲 → 删除测试

- [ ] **Step 3: 验证 lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: 最终 build 验证**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: 最终 commit（如有遗留）**

```bash
git add -A
git commit -m "feat(creation): finalize creation zone and archive integration"
```

---

## 完成标志

- [ ] 数据库 4 张表已建立
- [ ] 后端 store + API 路由全部可用
- [ ] 客户端 API 封装完整
- [ ] useCreationZone hook 工作正常
- [ ] 创作区 7 种视图全部可访问（empty/outline/volume-view/volume-form/chapter-view/chapter-form/content-editor）
- [ ] 正文库视图可查看/预览/删除存稿
- [ ] 工作区面板正确接入创作区与正文库
- [ ] typecheck / lint / build 全部 PASS
```

Plan file complete. Now let me read the key existing files to confirm the plan's assumptions before executing.<tool_call>Read<arg_key>file_path</arg_key><arg_value>c:\Users\14277\Desktop\novel-writer\server\storage\db.ts