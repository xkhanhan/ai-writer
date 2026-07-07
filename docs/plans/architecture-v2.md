# 系统架构设计 V2 — 七大系统联动方案

> 最后更新：2026-07-06
> 状态：设计讨论中

---

## 一、系统全景

```
┌─────────────────────────────────────────────────────────────────┐
│                        提示词系统 (Settings)                      │
│  管理所有 AI 功能的提示词模板 + 变量定义 + 预览 + 防注入            │
└───────────┬───────────────────────────────────┬─────────────────┘
            │ 注入 prompt                        │ 注入 prompt
            ▼                                   ▼
┌───────────────────┐                   ┌───────────────────┐
│    世界规则库       │                   │     设定库         │
│ ┌───────────────┐ │    AI检查时引用    │ ┌───────────────┐ │
│ │ 全局规则(≤20) │ │◄─────────────────│ │ 人物/地点/势力  │ │
│ │ 写作规则(≤20) │ │                   │ │ 物品/其他       │ │
│ │ 设定规则(不限) │ │─────────────────►│ │ 基础+状态信息   │ │
│ └───────────────┘ │    规则约束设定    │ └───┬───┬───┬───┘ │
└───────────────────┘                   │     │   │   │     │
                                        │  ┌──▼───▼───▼──┐  │
┌───────────────────┐                   │  │  标签库      │  │
│    事实库          │                   │  │ (树状结构)    │  │
│ 记录已发生的事实   │                   │  └─────────────┘  │
│ AI生成时做事实核查  │                   └───────────────────┘
└───────┬───────────┘                           ▲
        │ 事实核查                               │ 设定状态变更
        ▼                                       │
┌───────────────────────────────────────────────┴───────────────┐
│                         创作台                                 │
│  ┌─────────┐    ┌─────────┐    ┌────────────┐                │
│  │  总 纲   │───►│  卷 纲   │───►│ 章纲 / 正文  │                │
│  │ 开头/结尾│    │ 梗概/阶段│    │ 场景/实体    │                │
│  │ 卷规划   │◄───│ 双向绑定 │    │ 伏笔/内容    │                │
│  └─────────┘    └─────────┘    └──────┬─────┘                │
│                                       │ 过审                   │
│                                       ▼                       │
│                          ┌──────────────────────┐             │
│     ┌────────────────────│  回滚信息记录          │             │
│     │                    │ (变更追踪 + 快照)      │             │
│     │                    └──────────┬───────────┘             │
│     ▼                               ▼                         │
│ ┌──────────┐              ┌──────────────────┐                │
│ │ 伏笔库    │              │    正文库         │                │
│ │ 纯展示    │              │ 过审后的正文存档   │                │
│ │ +分布图   │              │ 去AI味/润色       │                │
│ └──────────┘              └──────────────────┘                │
└───────────────────────────────────────────────────────────────┘
```

---

## 二、世界规则库

### 2.1 三大分类

| 分类 | 上限 | 内容上限 | 可否删除 | 说明 |
|------|------|---------|---------|------|
| **全局规则** | 20 条 | 300 字/条 | 固定条不可删 | 创作基石，所有内容必须遵守 |
| **写作规则** | 20 条 | 300 字/条 | 可增删 | AI 写作正文时的风格/文笔约束 |
| **设定规则** | 不限 | 不限 | 可增删 | 约束设定库的校验规则，支持多种字段类型 |

### 2.2 固定全局规则

系统预置，不可删除：

```
"本作品不包含政治敏感内容，不涉及真实政治人物、政治事件或政治立场的表达。"
```

### 2.3 设定规则字段类型

设定规则不仅限于文本，支持更丰富的字段类型：

| 字段类型 | 说明 | 示例 |
|---------|------|------|
| `text` | 纯文本 | "修仙者不可使用现代科技" |
| `select` | 下拉选项 | 力量体系类型：修仙/魔法/武道/科技 |
| `number` | 数值范围 | "单章字数: 2000-5000" |

### 2.4 数据模型

```typescript
type WorldRuleCategory = "global" | "writing" | "setting";

interface WorldRule {
  id: string;
  bookId: string;
  category: WorldRuleCategory;
  name: string;                    // 规则名称
  content: string;                 // 规则内容（文本类型）
  settingType?: "text" | "select" | "number";  // 仅设定规则
  selectOptions?: string[];        // 仅 select 类型
  numberMin?: number;              // 仅 number 类型
  numberMax?: number;              // 仅 number 类型
  isFixed?: boolean;              // 是否固定规则（全局规则专用）
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2.5 前端 UI

- SplitPanel 左右分栏
- 左侧：三个折叠分组（全局规则 / 写作规则 / 设定规则），每组带计数和新建按钮
- 右侧：选中规则的详情编辑

---

## 三、设定库

### 3.1 五大固定分类

| 分类 | key | 说明 |
|------|-----|------|
| 人物 | `character` | 角色、NPC、反派等 |
| 地点 | `location` | 宗门、秘境、城镇等 |
| 势力 | `faction` | 组织、家族、帝国等 |
| 物品 | `item` | 法宝、丹药、灵器等 |
| 其他 | `other` | 兜底分类 |

### 3.2 设定实体的两大信息块

每个设定实体由两部分组成：

#### 基础信息（不随正文变化）

固定结构字段，定义实体的基本属性：

| 字段 | 类型 | 适用分类 | 说明 |
|------|------|---------|------|
| 名称 | Input (必填) | 全部 | 实体名称 |
| 级别 | Select | 全部 | 核心 / 重要 / 一般 |
| 标签 | Tag (多选) | 全部 | 从标签库选取，上限 20 个 |
| 描述 | TextArea | 全部 | 基础描述 |

#### 状态信息（跟随正文变化）

动态字段，记录当前创作进度下的实时状态：

| 分类 | 状态字段 | 说明 |
|------|---------|------|
| 人物 | 性别、年龄、修炼境界、所属势力、当前状态 | "当前状态"如：存活/死亡/失踪/闭关 |
| 地点 | 地点类型、所属势力、当前状态 | 如：安全/被占/毁灭 |
| 势力 | 组织类型、势力规模、当前状态 | 如：鼎盛/衰落/覆灭 |
| 物品 | 品阶、当前持有者、当前状态 | 如：完好/损毁/遗失 |
| 其他 | 自由补充 | 由标签区分 |

> **关键原则**：状态信息只记录「当前快照」，不记录历史变更。历史变更由回滚信息记录。

### 3.3 设定 × 规则联动 — AI 检查

每个设定实体可触发 AI 规则检查：

```
用户点击「检查」按钮
    ↓
程序组装检查提示词 = 设定规则 + 实体信息 + 系统提示词
    ↓
调用 generateAiText()
    ↓
AI 返回：是否符合规则 + 问题说明 + 修改建议
    ↓
用户查看建议 → 一键修改
```

### 3.4 数据模型

```typescript
type SettingCategory = "character" | "location" | "faction" | "item" | "other";

interface SettingEntity {
  id: string;
  bookId: string;
  category: SettingCategory;

  // ── 基础信息（固定） ──
  name: string;
  level: "core" | "important" | "general";
  tagIds: string[];                 // 引用标签库 ID
  description: string;

  // ── 状态信息（动态） ──
  statusFields: Record<string, string>;  // key-value 动态字段

  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 3.5 前端 UI

- SplitPanel：左侧分类折叠列表（带 + 按钮），右侧详情
- 详情面板：基础信息展示 + 状态信息展示 + 操作栏（编辑 / 检查 / 删除）
- 编辑弹窗：基础信息字段 + 状态信息字段（根据分类动态渲染）+ 标签选择
- 检查弹窗：展示 AI 检查结果 + 建议修改 + 一键应用

---

## 四、创作台

### 4.1 三级结构：总纲 → 卷纲 → 章纲/正文

```
总纲 ──── 一本书一份，定义整体规划
 ├── 卷纲 1 ──── 一卷一份
 │    ├── 章纲 1 ── 正文 1
 │    ├── 章纲 2 ── 正文 2
 │    └── 章纲 3 ── 正文 3
 ├── 卷纲 2
 │    ├── 章纲 4 ── 正文 4
 │    └── ...
 └── ...
```

**卷的创建规则**：必须前一卷完结后才能创建下一卷，防止用户一次创建过多空卷。

### 4.2 总纲

```typescript
interface BookOutline {
  bookId: string;
  opening: string;          // 开头设定
  ending: string;           // 结尾设定
  volumes: VolumePlan[];    // 卷规划列表
  sellingPoint: string;     // 核心卖点
  updatedAt: string;
}

interface VolumePlan {
  title: string;            // 卷标题
  synopsis: string;         // 卷梗概
}
```

**AI 能力**：
- 输入文本 → AI 提取并建议 opening/ending/volumes/sellingPoint
- 一键生成到对应字段

### 4.3 卷纲

```typescript
interface VolumeOutline {
  id: string;
  bookId: string;
  title: string;              // 卷标题（与总纲 VolumePlan 双向绑定）
  synopsis: string;           // 卷梗概（与总纲 VolumePlan 双向绑定）
  stages: StagePlan[];        // 阶段规划
  coreConflict: string;       // 核心冲突
  developmentArc: string;     // 发展弧线
  highlights: string;         // 预计看点
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface StagePlan {
  name: string;               // 阶段名称
  chapterCount: number;       // 预计章节数
  description: string;        // 阶段描述
}
```

**双向绑定**：卷纲的 title/synopsis ↔ 总纲的 VolumePlan.title/synopsis，任一方修改会同步另一方。

**AI 能力**：
- 根据总纲生成卷纲
- 检查阶段规划是否合理（建议增减章节数）
- 检查卷纲是否与总纲一致

**卷检查按钮**：
- 检查卷规划与总纲的卷内容是否一致
- 检查是否与全局规则一致
- 内容变更后提醒用户重新检查

### 4.4 章纲

```typescript
interface ChapterOutline {
  id: string;
  volumeId: string;
  title: string;                // 章标题
  synopsis: string;             // 章梗概（与卷的阶段内容双向绑定）
  scenes: string[];             // 场景列表
  entities: ChapterEntity[];    // 关联实体（引用设定库 ID）
  keyPoints: string[];          // 重要内容（AI 必须写出来的）
  foreshadows: ChapterForeshadow[];  // 伏笔操作
  opening: ChapterOpeningEnding;      // 章节开头
  ending: ChapterOpeningEnding;       // 章节结尾
  supplements: string;          // 其他补充
  expectedWords: number;        // 目标字数
  note: string;                 // 写作备注
  sortOrder: number;
  status: "planned" | "writing" | "done";
  createdAt: string;
  updatedAt: string;
}

// 关联实体（从设定库选取）
interface ChapterEntity {
  entityId: string;             // 设定库实体 ID
  roleName?: string;            // 在本章中的角色描述
}

// 伏笔操作（埋下 / 回收）
interface ChapterForeshadow {
  foreshadowId?: string;        // 回收时引用伏笔库 ID
  action: "plant" | "reveal";   // 埋下 or 回收
  name: string;                 // 伏笔名称（埋下时新建）
  description?: string;         // 伏笔描述
}

// 章节开头/结尾
interface ChapterOpeningEnding {
  content: string;              // 内容
  isFixed: boolean;             // 是否固定（true: AI 严格按此写 / false: 表达同样意思即可）
}
```

### 4.5 章纲/正文双面板布局

```
┌─────────────────────────────────────────────────────────────┐
│ ┌── 章纲面板（左） ──────┐  ┌── 正文面板（右） ──────────┐  │
│ │                        │  │                             │  │
│ │ 章标题  [输入框]        │  │ [生成] / [重新生成]          │  │
│ │ 章梗概  [输入框]        │  │                             │  │
│ │ 场景    [列表]          │  │ ┌───────────────────────┐  │  │
│ │ 实体    [从设定库选择]   │  │ │                       │  │  │
│ │ 重要内容 [列表]         │  │ │   正文内容展示区       │  │  │
│ │ 伏笔    [埋下/回收]     │  │ │   可选中文本操作       │  │  │
│ │ 开头    [文本+固定开关]  │  │ │                       │  │  │
│ │ 结尾    [文本+固定开关]  │  │ │                       │  │  │
│ │ 补充    [文本域]         │  │ └───────────────────────┘  │  │
│ │                        │  │                             │  │
│ │ [保存]                  │  │ [去AI味] [润色] [过审]      │  │  │
│ └────────────────────────┘  │ 选中文本: [扩写][重写][润色] │  │
│                              └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 正文生成流程

```
点击「生成」
    ↓
组装提示词 = 提示词模板 + 章纲信息 + 实体设定 + 世界规则 + 写作规则 + 事实库 + 前文内容
    ↓
调用 AI API
    ↓
正文展示在右侧面板
    ↓
用户可选中文本 → 局部操作（扩写/去AI味/重写/润色）
```

### 4.7 过审流程（核心复杂流程）

```
用户点击「过审」
    │
    ├─ 1. 提取事实 ──────────► 写入事实库
    │     从正文中识别已发生的关键事实
    │
    ├─ 2. 变更设定状态 ──────► 更新设定库
    │     识别正文中角色状态变化（如：角色突破境界、角色死亡、物品易主）
    │     更新对应 SettingEntity 的 statusFields
    │
    ├─ 3. 处理伏笔 ──────────► 更新伏笔库
    │     埋下的伏笔 → 创建新伏笔记录（status: hidden）
    │     回收的伏笔 → 更新伏笔状态（status: revealed）
    │
    ├─ 4. 规则检查 ──────────► 验证一致性
    │     检查正文是否违反全局规则
    │     检查设定状态是否符合设定规则
    │
    ├─ 5. 记录回滚信息 ──────► 写入回滚快照
    │     记录所有变更的 before/after
    │     用于后续章节回退时恢复
    │
    ├─ 6. 写入正文库 ────────► 存档过审正文
    │     ArchivedChapter { chapterId, title, content, wordCount }
    │
    └─ 7. 更新章纲状态 ──────► status → "done"
          锁定当前章，进入下一章
```

### 4.8 章节回退机制

```
用户选择回到上一章
    │
    ├─ 1. 查找当前章的回滚快照
    │
    ├─ 2. 逆向还原所有变更：
    │     ├─ 删除本章新增的事实
    │     ├─ 还原设定库状态字段（before 值）
    │     ├─ 删除本章新增的伏笔 / 还原已回收伏笔状态
    │     └─ 删除正文库中的过审记录
    │
    ├─ 3. 恢复当前章状态
    │     ├─ 章纲 status → "writing"
    │     └─ 正文内容恢复
    │
    └─ 4. 锁定解除，用户可编辑上一章
```

---

## 五、伏笔库

### 5.1 定位

**纯展示，不可编辑**。伏笔的创建和状态变更完全由创作台的过审流程驱动。

### 5.2 数据模型

```typescript
interface Foreshadow {
  id: string;
  bookId: string;
  name: string;
  description: string;
  status: "hidden" | "revealed";    // 未揭晓 / 已揭晓
  plantChapterId: string;           // 埋下章节 ID
  revealChapterId?: string;         // 回收章节 ID
  createdAt: string;
  updatedAt: string;
}
```

### 5.3 前端 UI

- **伏笔分布数据图**：按卷/章展示伏笔埋下和回收的时间线
- **伏笔列表**：可按状态筛选（全部/未揭晓/已揭晓）
- **搜索**：按名称搜索
- 详情：展示伏笔描述 + 埋下/回收位置

---

## 六、正文库

### 6.1 定位

存放过审后的正文。**单向数据流**：章纲过审 → 写入正文库。正文库内容修改不影响章纲。

### 6.2 数据模型

```typescript
interface ArchivedChapter {
  id: string;
  bookId: string;
  chapterId: string;       // 关联章纲 ID（逻辑关联，非强约束）
  sortOrder: number;
  title: string;
  content: string;
  wordCount: number;
  archivedAt: string;      // 过审时间
}
```

### 6.3 前端 UI

- 按卷/章分组展示
- 每条：标题 + 字数 + 正文预览
- AI 操作：去 AI 味道 / 润色 / 扩写
- 支持正文导出（TXT）

---

## 七、事实库

### 7.1 定位

记录小说中已发生的确定事实。**AI 生成正文时读取事实库**，避免生成前后矛盾的内容。

### 7.2 数据模型

```typescript
interface StoryFact {
  id: string;
  bookId: string;
  content: string;              // 事实内容
  sourceChapterId: string;      // 产生该事实的章节 ID
  relatedEntityIds: string[];   // 关联的设定实体 ID
  relatedForeshadowIds: string[]; // 关联的伏笔 ID
  createdAt: string;
}
```

### 7.3 前端 UI

- 纯展示列表，不可编辑
- 按章节分组展示
- 搜索 / 筛选（按实体/伏笔关联）

---

## 八、标签库

### 8.1 定位

服务于设定库。设定不区分的细分属性由标签承载。**树状结构**，支持无限层级。

### 8.2 标签选择交互

设定库中选择标签时，展示完整路径：

```
标签：种族/人族/修仙者
标签：种族/妖/海妖/玄龟
标签：势力/正道/散修联盟
```

### 8.3 约束

- 设定实体标签上限：**20 个**
- 标签名称：文本规范，长度限制
- 标签说明：大文本域，详细描述标签含义

### 8.4 数据模型

```typescript
interface TagCategory {
  id: string;
  bookId: string;
  name: string;               // 标签名称
  parentId?: string;          // 父级标签 ID
  description: string;        // 标签说明（大文本）
  children?: TagCategory[];
}
```

---

## 九、提示词系统

### 9.1 定位

**不在创作区**，在 Settings 页面。管理所有 AI 功能的提示词模板。

### 9.2 AI 功能列表

| 功能名称 | 触发位置 | 输入参数 |
|---------|---------|---------|
| 总纲生成 | 创作台 → 总纲 | 输入文本 |
| 卷纲生成 | 创作台 → 卷纲 | 总纲信息 |
| 卷纲检查 | 创作台 → 卷纲 | 卷纲信息 + 全局规则 |
| 章纲正文生成 | 创作台 → 章纲 | 章纲信息 + 设定 + 规则 + 事实 |
| 选中文本扩写 | 创作台 → 正文 | 选中文本 + 上下文 |
| 选中文本润色 | 创作台 → 正文 | 选中文本 + 上下文 |
| 选中文本重写 | 创作台 → 正文 | 选中文本 + 上下文 |
| 全文去AI味 | 创作台/正文库 | 全文内容 |
| 全文润色 | 创作台/正文库 | 全文内容 |
| 设定规则检查 | 设定库 | 实体信息 + 设定规则 |
| 过审事实提取 | 过审流程 | 正文内容 |
| 过审状态变更 | 过审流程 | 正文内容 + 设定信息 |

### 9.3 提示词模板语法

使用 `$变量名` 占位符，程序运行时替换为实际值：

```
你是一位资深网络小说作家。请根据以下章纲信息撰写正文。

## 书籍信息
书名：$bookTitle
题材：$bookGenre

## 世界规则
$globalRules

## 写作规则
$writingRules

## 章纲信息
标题：$chapterTitle
梗概：$chapterSynopsis
场景：$chapterScenes

## 出场实体
$chapterEntities

## 事实记录
$facts

## 要求
- $chapterOpening（开头要求）
- $chapterKeyPoints（必须写出的重点）
- 目标字数：$expectedWords 字
```

### 9.4 系统功能

| 功能 | 说明 |
|------|------|
| 提示词编辑 | 可视化编辑提示词模板，支持 `$变量` 高亮 |
| 参数说明 | 每个变量附带说明文档，防止用户不会配置 |
| 变量校验 | 检测 `$引用了不存在的变量` 时报错 |
| 注入防护 | 防止用户在提示词中注入代码指令 |
| 预览 | 使用预设文本替换变量，展示最终发给 AI 的内容 |
| 测试生成 | 在预览基础上调用 AI，展示生成结果 |

### 9.5 数据模型

```typescript
interface PromptTemplate {
  id: string;
  functionKey: string;           // AI 功能标识（如 "chapter_generate"）
  displayName: string;           // 显示名称
  description: string;           // 功能说明
  template: string;              // 提示词模板（含 $变量）
  variables: PromptVariable[];   // 变量定义
  updatedAt: string;
}

interface PromptVariable {
  name: string;                  // 变量名（不含 $）
  description: string;           // 变量说明
  source: "book" | "outline" | "chapter" | "settings" | "rules" | "facts" | "foreshadows" | "text";
  required: boolean;
  defaultValue?: string;         // 预览用默认值
}
```

---

## 十、回滚快照（跨系统核心机制）

### 10.1 设计理念

每次过审是一次「事务」，记录所有副作用，支持完整回滚。

### 10.2 快照结构

```typescript
interface ApprovalSnapshot {
  id: string;
  bookId: string;
  chapterId: string;
  createdAt: string;

  // 新增的事实（回滚时删除）
  addedFacts: string[];            // 事实 ID

  // 设定状态变更（回滚时还原）
  settingChanges: SettingChange[];

  // 伏笔变更（回滚时还原）
  foreshadowChanges: ForeshadowChange[];

  // 正文库记录（回滚时删除）
  archivedChapterId: string;
}

interface SettingChange {
  entityId: string;
  before: Record<string, string>;   // 变更前的状态字段
  after: Record<string, string>;    // 变更后的状态字段
}

interface ForeshadowChange {
  action: "create" | "reveal";
  foreshadowId: string;
  beforeStatus?: "hidden" | "revealed";  // reveal 时有值
  afterStatus: "hidden" | "revealed";
}
```

### 10.3 章节锁定规则

- 章纲 status 为 `done` 时，该章的章纲和正文**不可编辑**
- 要编辑已过审章节 → 必须先「回退」
- 回退时使用快照还原所有系统状态
- 最后一章始终可以编辑（除非主动过审）

---

## 十一、跨系统数据流总结

### 写入关系

| 源系统 | 目标系统 | 触发时机 | 数据 |
|--------|---------|---------|------|
| 创作台 → 伏笔库 | 过审时 | 埋下的伏笔创建新记录 |
| 创作台 → 事实库 | 过审时 | 提取正文中的事实 |
| 创作台 → 设定库 | 过审时 | 变更角色/物品的状态字段 |
| 创作台 → 正文库 | 过审时 | 存档过审正文 |
| 创作台 → 回滚快照 | 过审时 | 记录所有变更的 before/after |
| 标签库 → 设定库 | 编辑设定时 | 设定实体关联标签 ID |

### 读取关系（AI 组装提示词时）

| 读取源 | 用途 |
|--------|------|
| 世界规则（全局规则） | 所有 AI 生成必须遵守 |
| 世界规则（写作规则） | 正文生成时的风格约束 |
| 世界规则（设定规则） | 设定检查时的约束 |
| 设定库（实体信息） | 章纲关联的实体详情 |
| 标签库 | 设定实体的标签路径 |
| 事实库 | 防止生成矛盾内容 |
| 伏笔库 | 了解未回收伏笔（可选） |

---

## 十二、实施分阶段规划

### Phase 1：基础设施 + 数据持久化（前置）

> 所有系统必须先有后端存储，否则后续联动无法进行

- [ ] 世界规则库后端 CRUD + API
- [ ] 设定库后端 CRUD + API（含基础信息 + 状态信息）
- [ ] 标签库后端 CRUD + API
- [ ] 伏笔库后端 CRUD + API
- [ ] 事实库后端 CRUD + API
- [ ] 回滚快照后端存储

### Phase 2：设定库重构

> 设定库是联动枢纽，优先完善

- [ ] 5 分类表单重构（基础信息 + 状态信息分组）
- [ ] 标签库树状选择器（路径展示）
- [ ] 设定 × 规则 AI 检查功能

### Phase 3：创作台升级

> 核心创作流程

- [ ] 总纲重构（opening/ending/volumes）
- [ ] 卷纲重构（stages + 双向绑定）
- [ ] 章纲重构（实体选择 + 伏笔操作 + 开关固定）
- [ ] 双面板布局（章纲 + 正文）
- [ ] 卷创建锁定（前卷完结才能创建新卷）

### Phase 4：过审 + 回滚

> 最复杂的流程

- [ ] 过审全流程（事实提取 + 状态变更 + 伏笔处理 + 规则检查 + 快照 + 存档）
- [ ] 章节回退（快照还原）
- [ ] 章节锁定机制

### Phase 5：提示词系统

> AI 能力的基础

- [ ] 提示词模板管理页（Settings）
- [ ] 变量定义 + 校验 + 预览
- [ ] 注入防护
- [ ] 模板测试生成

### Phase 6：AI 功能接入

> 依赖提示词系统

- [ ] 总纲/卷纲 AI 生成
- [ ] 章纲正文 AI 生成
- [ ] 选中文本操作（扩写/润色/重写/去AI味）
- [ ] 过审 AI 辅助（事实提取 + 状态变更）
- [ ] 设定规则 AI 检查

### Phase 7：展示系统

> 伏笔/事实/正文库展示

- [ ] 伏笔分布数据图
- [ ] 伏笔列表 + 筛选
- [ ] 事实库展示
- [ ] 正文库 AI 操作
- [ ] 正文导出
