# 系统架构设计：七大模块关联关系

> 最后更新：2026-07-06
> 状态：设计讨论中

---

## 一、总体架构

```
                        ┌──────────────┐
                        │   AI 提示词   │  Setting 页面，管理所有 AI 功能的 prompt 模板
                        │   系统       │  变量替换 + 预览 + 注入防护
                        └──────┬───────┘
                               │ 提供 prompt 模板
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼──────┐    ┌───────▼───────┐    ┌───────▼──────┐
    │  世界规则   │    │    设定库     │    │   标签库     │
    │  三大类规则  │◄──►│  5 固定分类   │◄──►│  树状标签    │
    │            │    │  基础+状态信息 │    │  服务设定    │
    └─────┬──────┘    └──┬───┬───┬────┘    └──────────────┘
          │              │   │   │
          │ 检查依据     │   │   │ 设定实体关联
          │              │   │   │
    ┌─────▼──────────────▼───▼───▼─────────────┐
    │              创  作  台                    │
    │  总纲 ──► 卷纲 ──► 章纲/正文              │
    │  双向绑定    顺序生成    左右双面板        │
    └──────┬────────────────┬───────────────────┘
           │                │
     ┌─────▼─────┐   ┌─────▼─────┐
     │  伏笔库   │   │  事实库   │
     │  纯展示   │   │  纯展示   │
     │  分布图   │   │  AI参考   │
     └───────────┘   └───────────┘
           │
     ┌─────▼─────┐
     │  正文库   │  过审单向写入，不与创作区正文关联
     │  纯展示   │  支持 去AI味/润色
     └───────────┘
```

---

## 二、模块详细设计

### 2.1 世界规则

**定位**：全局基石，所有内容的检查依据。

#### 三大分类

| 分类 | 说明 | 上限 | 字段类型 | 能否删除 |
|------|------|------|---------|---------|
| **全局规则** | 所有内容的基石，后续所有生成内容都要用此检查 | 20 条 | 纯文本，每条 ≤300 字 | 系统预置规则不可删 |
| **写作规则** | AI 写作正文时的规则（文笔、文风等） | 20 条 | 纯文本，每条 ≤300 字 | 可删可改 |
| **设定规则** | 针对设定的校验规则（力量体系、境界上限等） | 不限 | 文本 / 下拉 / 数字 | 可删可改 |

#### 系统预置规则（全局规则，不可删除）

| 规则名 | 内容 |
|--------|------|
| 政治合规 | 作品不得包含政治敏感内容 |

#### 数据模型

```typescript
// 规则大类
type WorldRuleCategory = "global" | "writing" | "setting";

// 设定规则的值类型
type SettingRuleValueType = "text" | "select" | "number";

// 世界规则
interface WorldRule {
  id: string;              // 前缀 "wr_"
  bookId: string;
  category: WorldRuleCategory;
  name: string;            // 规则名称，≤60 字
  content: string;         // 纯文本内容，≤300 字
  deletable: boolean;      // false = 系统预置规则

  // 仅 category === "setting" 时使用
  valueType?: SettingRuleValueType;
  selectOptions?: string[]; // valueType === "select" 时的选项列表
  numberMin?: number;       // valueType === "number" 时的最小值
  numberMax?: number;       // valueType === "number" 时的最大值
  numberUnit?: string;      // valueType === "number" 时的单位（如"万字"）

  createdAt: string;
  updatedAt: string;
}
```

#### 设定规则示例

| 规则名 | valueType | 说明 | 示例值 |
|--------|-----------|------|--------|
| 力量体系 | text | 描述修炼境界划分 | "练气→筑基→金丹→元婴→化神→渡劫→大乘" |
| 境界上限 | number | 单卷内允许的最高境界跃迁数 | 2（单位：级） |
| 人物年龄范围 | number | 角色合理年龄区间 | 150（单位：岁） |
| 势力分类 | select | 允许的势力组织类型 | ["宗门", "家族", "帝国", "散修联盟"] |

#### 关联关系

```
世界规则 ──检查──► 设定库（设定规则校验每个设定实体）
世界规则 ──注入──► AI 提示词系统（全局规则 + 写作规则作为 AI 生成的上下文）
世界规则 ──检查──► 创作台（卷检查按钮 → 与全局规则一致性校验）
```

---

### 2.2 设定库

**定位**：世界观构建的基础实体库，为创作台和 AI 生成提供设定数据。所有设定实体以「书」为单位隔离。

#### 五大固定分类

| 分类 | key | 说明 | 创建后可改分类？ |
|------|-----|------|:---:|
| 人物 | `character` | 角色、NPC、反派等 | 否 |
| 地点 | `location` | 宗门、秘境、城镇等 | 否 |
| 势力 | `faction` | 组织、家族、帝国等 | 否 |
| 物品 | `item` | 法宝、丹药、灵器等 | 否 |
| 其他 | `other` | 兜底分类 | 否 |

#### 三层信息架构

每个设定实体由三层信息组成：

**第一层：通用固定字段（9 个，所有分类共有）**

不随正文变化，用户可随时编辑。

| # | 字段 | 类型 | 回答的问题 | 人物示例 | 地点示例 | 势力示例 | 物品示例 |
|---|------|------|----------|---------|---------|---------|---------|
| 1 | 名称 | Input（必填，≤60 字） | 它是谁/是什么？ | 李凡 | 落星渊 | 天魔宗 | 破妄玉佩 |
| 2 | 级别 | Select | 它有多重要？ | 核心 | 重要 | 重要 | 核心 |
| 3 | 描述 | TextArea（≤2000 字） | 它的基本介绍 | 山村少年，天赋平平 | 远古秘境，百年一开 | 魔道第一宗门 | 上古大能遗留 |
| 4 | 外观 | TextArea（≤1000 字） | 它长什么样？ | 身材瘦削，剑眉星目 | 幽深峡谷，星光点点 | 黑雾缭绕，魔气冲天 | 玉质温润，隐有光华 |
| 5 | 特点 | TextArea（≤1000 字） | 它有什么独特之处？ | 毅力过人，重情重义 | 阵法封锁，传承所在 | 吞噬功法，化神宗主 | 净化心魔，提升神识 |
| 6 | 背景 | TextArea（≤1000 字） | 它从哪来的？ | 出生偏远山村 | 远古修士开辟 | 千年前魔修创建 | 上古大能炼制 |
| 7 | 能力 | TextArea（≤1000 字） | 它能做什么？ | 修炼剑法，领悟天赋 | 灵气浓郁，利于修炼 | 掌控一域，资源丰富 | 净化心魔，识海增幅 |
| 8 | 弱点 | TextArea（≤1000 字） | 它的短板是什么？ | 性格冲动，修为尚浅 | 入口隐蔽，百年一开 | 内部派系斗争 | 需灵力激活 |
| 9 | 标签 | Tag 多选（上限 20 个） | 怎么分类？ | 种族/人族 | 地点/秘境 | 势力/宗门 | 物品/法宝 |

> **通用性验证**：9 个字段在所有 5 个分类中均有明确含义。「外观」对人物=外貌体型、地点=建筑环境、势力=总部形象、物品=材质形态；「能力」对人物=技能修为、地点=功效作用、势力=实力资源、物品=功效威力；「弱点」对人物=性格缺陷、地点=安全隐患、势力=内部矛盾、物品=使用限制。

**第二层：分类专属字段（JSON 存储）**

仅在特定分类下出现的固定字段：

| 分类 | 专属字段 | 说明 |
|------|---------|------|
| **人物** `character` | 性格（≤500 字） | 人物特有的心理特征维度 |
| 地点 `location` | 无 | 通用字段已覆盖 |
| 势力 `faction` | 无 | 通用字段已覆盖 |
| 物品 `item` | 无 | 通用字段已覆盖 |
| 其他 `other` | 无 | 兜底分类 |

> 分类专属字段存储在 `category_fields` JSON 列中，如人物：`{"性格": "坚韧内敛，不善言辞"}`。后续如需为其他分类增加专属字段，只需在此 JSON 中扩展，无需改表结构。

**第三层：状态信息（动态 key-value）**

创建时填写**初始状态**（可留空），后续由创作台「过审」流程自动更新为当前状态。

| 分类 | 预定义状态字段 | 说明 |
|------|-------------|------|
| **人物** | 性别、年龄、修炼境界、所属势力、当前状态 | "当前状态"如：存活/死亡/失踪/闭关 |
| **地点** | 地点类型、所属势力、当前状态 | 如：安全/被占/毁灭 |
| **势力** | 组织类型、势力规模、当前状态 | 如：鼎盛/衰落/覆灭 |
| **物品** | 品阶、当前持有者、当前状态 | 如：完好/损毁/遗失 |
| **其他** | 无预定义 | 用户按需 |

> **关键原则**：状态信息只记录「当前快照」，不记录历史变更。历史变更由创作台「过审」流程的回滚信息记录。创建时为「初始状态」，可留空，系统后续自动填充。状态字段均为文本 Input，不做下拉约束。

#### AI 规则检查

设定库中的每个实体可触发 AI 检查，校验设定与世界规则中「设定规则」的一致性：

```
触发：用户点击设定实体的「检查」按钮
    ↓
组装：设定规则（来自世界规则 category=setting）
    + 设定实体完整信息（基础信息 + 状态信息）
    + 提示词模板（来自 AI 提示词系统，key=setting_check）
    ↓
调用 AI 接口
    ↓
返回：是否符合规则 + 问题列表 + 修改建议
    ↓
操作：一键修改（将 AI 建议应用到设定实体）
```

#### 数据模型

```typescript
// ── 分类定义 ──

type SettingCategory = "character" | "location" | "faction" | "item" | "other";

type SettingLevel = "core" | "important" | "general";

// ── 各分类的状态字段模板 ──

const STATUS_FIELD_TEMPLATES: Record<SettingCategory, string[]> = {
  character: ["性别", "年龄", "修炼境界", "所属势力", "当前状态"],
  location:  ["地点类型", "所属势力", "当前状态"],
  faction:   ["组织类型", "势力规模", "当前状态"],
  item:      ["品阶", "当前持有者", "当前状态"],
  other:     [],
};

// ── 分类专属字段模板 ──

const CATEGORY_FIELD_TEMPLATES: Record<SettingCategory, string[]> = {
  character: ["性格"],
  location:  [],
  faction:   [],
  item:      [],
  other:     [],
};

// ── 核心实体 ──

interface SettingEntity {
  id: string;                          // UUID
  bookId: string;                      // 所属书籍
  category: SettingCategory;           // 分类（创建后不可改）

  // ── 通用固定字段（9 个，所有分类共有）──
  name: string;                        // ≤60 字
  level: SettingLevel;                 // 默认 "general"
  description: string;                 // ≤2000 字 — 它的基本介绍
  appearance: string;                  // ≤1000 字 — 它长什么样（外貌/建筑/总部/材质）
  traits: string;                      // ≤1000 字 — 它的独特之处
  background: string;                  // ≤1000 字 — 它从哪来的（身世/历史/起源）
  abilities: string;                   // ≤1000 字 — 它能做什么（技能/功效/实力）
  weaknesses: string;                  // ≤1000 字 — 它的短板（缺陷/隐患/限制）
  tagIds: string[];                    // 引用标签库 ID，上限 20 个

  // ── 分类专属字段（JSON）──
  categoryFields: Record<string, string>;
  // 人物示例：{ "性格": "坚韧内敛，不善言辞" }
  // 其他分类：{}

  // ── 状态信息（动态 key-value，初始值可留空）──
  statusFields: Record<string, string>;
  // 人物示例：{ "修炼境界": "练气三层", "所属势力": "青云宗", "当前状态": "存活" }
  // 物品示例：{ "品阶": "灵器", "当前持有者": "李凡", "当前状态": "完整" }

  deprecated: boolean;                 // 废弃标记
  createdAt: string;
  updatedAt: string;
}

// ── DTO ──

interface CreateSettingEntityDTO {
  category: SettingCategory;
  name: string;
  level?: SettingLevel;
  description?: string;
  appearance?: string;
  traits?: string;
  background?: string;
  abilities?: string;
  weaknesses?: string;
  tagIds?: string[];
  categoryFields?: Record<string, string>;
  statusFields?: Record<string, string>;
}

interface UpdateSettingEntityDTO {
  name?: string;
  level?: SettingLevel;
  description?: string;
  appearance?: string;
  traits?: string;
  background?: string;
  abilities?: string;
  weaknesses?: string;
  tagIds?: string[];
  categoryFields?: Record<string, string>;
  statusFields?: Record<string, string>;
  deprecated?: boolean;
}
```

#### 数据库表设计

```sql
CREATE TABLE IF NOT EXISTS setting_entities (
  id              TEXT PRIMARY KEY,
  book_id         TEXT NOT NULL,
  category        TEXT NOT NULL,          -- character | location | faction | item | other
  name            TEXT NOT NULL,
  level           TEXT NOT NULL DEFAULT 'general',  -- core | important | general

  -- 通用固定字段
  description     TEXT NOT NULL DEFAULT '',   -- ≤2000 字 — 基本介绍
  appearance      TEXT NOT NULL DEFAULT '',   -- ≤1000 字 — 外观
  traits          TEXT NOT NULL DEFAULT '',   -- ≤1000 字 — 特点
  background      TEXT NOT NULL DEFAULT '',   -- ≤1000 字 — 背景
  abilities       TEXT NOT NULL DEFAULT '',   -- ≤1000 字 — 能力
  weaknesses      TEXT NOT NULL DEFAULT '',   -- ≤1000 字 — 弱点
  tag_ids         TEXT NOT NULL DEFAULT '[]', -- JSON array of tag IDs

  -- 分类专属字段
  category_fields TEXT NOT NULL DEFAULT '{}', -- JSON { fieldName: value }

  -- 动态状态信息（初始值可留空，过审时系统更新）
  status_fields   TEXT NOT NULL DEFAULT '{}', -- JSON { fieldName: value }

  deprecated      INTEGER NOT NULL DEFAULT 0, -- 0=正常 1=已废弃
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_setting_entities_book_category
  ON setting_entities(book_id, category);
CREATE INDEX IF NOT EXISTS idx_setting_entities_book_level
  ON setting_entities(book_id, level);
```

#### 四层架构

遵循项目统一架构（参考 world-rules 实现），自底向上：

**1. 数据层** `server/storage/db.ts`

```sql
-- 在 initializeTables() 中创建 setting_entities 表（见上方建表语句）
-- 索引：(book_id, category) 加速分类查询，(book_id, level) 加速级别筛选
```

**2. 存储层** `server/storage/setting-entity-store.ts`

```
职责：Row 类型 (snake_case) ↔ TS 类型 (camelCase) 映射 + CRUD

导出函数：
├── getSettingEntitiesByBookId(bookId, category?)
│   按书查询，可选按分类筛选
│   排序：level ASC (core→important→general), created_at ASC
│
├── getSettingEntityById(id)
│   查询单条实体
│
├── createSettingEntity(bookId, data: CreateSettingEntityDTO)
│   创建实体，自动填充默认值（level=general, tagIds=[], categoryFields={}, statusFields={}）
│   tag_ids、category_fields、status_fields 存储为 JSON 字符串
│
├── updateSettingEntity(id, data: UpdateSettingEntityDTO)
│   动态字段更新，仅更新传入的字段
│   tag_ids、category_fields、status_fields 序列化为 JSON
│
└── deleteSettingEntity(id)
    物理删除（软删除通过 deprecated 字段实现）
```

> 参考实现：`server/storage/world-rule-store.ts`（Row 映射 + 动态字段更新模式）

**3. API 路由层**

```
集合路由  app/api/setting-entities/route.ts
├── GET  ?bookId=xxx[&category=xxx]
│   返回该书所有设定实体，可按分类筛选
│
└── POST { bookId, ...CreateSettingEntityDTO }
    创建新设定实体

单条路由  app/api/setting-entities/[id]/route.ts
├── GET
│   返回单条实体完整信息
│
├── PUT { ...UpdateSettingEntityDTO }
│   更新实体（动态字段）
│
└── DELETE
    删除实体（物理删除）
```

> 参考实现：`app/api/world-rules/route.ts` + `app/api/world-rules/[id]/route.ts`

**4. 客户端 API helper** `app/pages/books/api/setting-entities.ts`

```typescript
import { client } from "@/app/api-client";
import type { SettingEntity, CreateSettingEntityDTO, UpdateSettingEntityDTO } from "@/app/types";

export async function fetchSettingEntities(bookId: string, category?: string): Promise<SettingEntity[]>
export async function getSettingEntity(id: string): Promise<SettingEntity>
export async function createSettingEntity(data: CreateSettingEntityDTO & { bookId: string }): Promise<SettingEntity>
export async function updateSettingEntity(id: string, data: UpdateSettingEntityDTO): Promise<SettingEntity>
export async function deleteSettingEntity(id: string): Promise<void>
```

> 参考实现：`app/pages/books/api/world-rules.ts`

**5. 前端组件** `app/pages/books/components/settings-library/`

```
组件结构：
├── index.tsx          主组件（SplitPanel 左右分栏）
├── index.module.css   样式

左侧面板（分类折叠列表）：
├── 5 个分类折叠组，每组显示实体数量
├── 每个分类右侧带「+」按钮，点击打开创建弹窗
├── 实体列表项显示：名称 + 级别 Tag
├── 已废弃实体显示为半透明
└── 选中态高亮 + 左侧蓝色边框

右侧面板（实体详情）：
├── 头部：名称 + 级别 Tag + 分类 Tag + 创建时间
├── 操作栏：编辑 / 废弃 / 检查（Phase 4）/ 删除
├── 通用信息区：描述 + 外观 + 特点 + 背景 + 能力 + 弱点
│   └── 每个字段独立卡片，空字段折叠/隐藏
├── 标签区：面包屑路径格式展示
├── 分类专属区：如人物显示「性格」
└── 状态信息区：动态字段 Key-Value 列表（2列网格）

弹窗（统一 Modal，新建/编辑共用）：
├── 基础信息区：名称*、级别选择器
├── 通用信息区：描述、外观、特点、背景、能力、弱点（6个 TextArea）
├── 标签选择器（从标签库选取）
├── 分类专属区：如人物显示「性格」输入框
├── 状态信息区：根据分类动态渲染初始状态字段
├── maskClosable={false} keyboard={false} closable={false}
└── 仅通过取消/保存按钮关闭
```

> 参考实现：`app/pages/books/components/world-rules/index.tsx`

#### 各分类字段模板（弹窗动态渲染依据）

**分类专属字段** — 创建/编辑弹窗根据分类动态展示：

| 分类 | 专属字段 | 字段类型 |
|------|---------|---------|
| **人物** `character` | 性格（≤500 字） | TextArea |
| **其他分类** | 无专属字段 | — |

**初始状态字段** — 创建/编辑弹窗根据分类动态渲染（可留空）：

| 分类 | 预定义状态字段 | 字段类型 |
|------|-------------|---------|
| **人物** `character` | 性别、年龄、修炼境界、所属势力、当前状态 | 全部 Input |
| **地点** `location` | 地点类型、所属势力、当前状态 | 全部 Input |
| **势力** `faction` | 组织类型、势力规模、当前状态 | 全部 Input |
| **物品** `item` | 品阶、当前持有者、当前状态 | 全部 Input |
| **其他** `other` | 无预定义字段 | — |

> 状态字段均为文本 Input，不做下拉约束（与世界规则中的设定规则结构化校验互补）。Phase 1 先用固定字段，后续可扩展为动态增删字段。

#### 关联关系

```
设定库 ◄──标签库（tagIds 引用标签库节点 ID，显示时展开为面包屑路径）
设定库 ──被引用──► 创作台章纲（章纲的「实体」字段从设定库选取，存储 entity ID）
设定库 ──被检查──► 世界规则（设定规则校验 + AI 检查）
设定库 ──被变更──► 创作台过审（过审时更新 statusFields）
设定库 ──被回滚──► 创作台回滚（回滚时恢复 statusFields）
设定库 ──注入──► AI 提示词（当前设定实体信息作为 AI 生成的上下文）
设定库 ──注入──► 创作台章纲（关联实体的基础信息注入 AI 生成上下文）
```

#### 现状 vs 目标

| 维度 | 当前状态 | 目标状态 | 差距 |
|------|---------|---------|------|
| **类型定义** | `SettingEntity` 仅 4 个字段（name/description/gender/personality/traits），缺少 level/statusFields/tagIds 以及新增的 appearance/background/abilities/weaknesses | 9 通用字段 + 分类专属 + 动态状态 | 重写 |
| **数据库** | 无 `setting_entities` 表 | SQLite 表（14 列 + 2 JSON）+ 索引 | 新建 |
| **存储层** | 不存在 | `setting-entity-store.ts` | 新建 |
| **API 路由** | 不存在 | `setting-entities/` 集合 + `[id]` 单条 | 新建 |
| **客户端 API** | 不存在 | `api/setting-entities.ts` | 新建 |
| **前端组件** | 纯前端 state，刷新丢失；仅人物有表单字段 | API 持久化 + 完整 CRUD + 三层信息架构 | 重写 |
| **标签** | 无标签字段（仅人物有 `tags` 自由文本） | 从标签库选择，存储 tagIds | 重写 |
| **状态信息** | 无 | 动态 key-value 字段（初始状态 → 系统更新） | 新建 |
| **AI 检查** | 不存在 | Phase 4 实现 | 待定 |

#### 实施计划

```
Phase 1（本次）  基础设施 + 数据持久化
  ├── [类型] 重写 SettingEntity（9 通用字段 + categoryFields + statusFields）
  ├── [DB]    新建 setting_entities 表（14 列 + 2 JSON + 索引）
  ├── [存储]  新建 setting-entity-store.ts
  ├── [API]   新建 setting-entities/ 路由
  ├── [Client] 新建 api/setting-entities.ts
  └── [前端]  重写 settings-library 组件（三层信息架构 + API 持久化）

Phase 2（后续）  关联打通
  ├── 设定库 ↔ 标签库关联（标签选择器从标签库读取）
  ├── 创作台章纲 ↔ 设定库关联（实体选择器）
  └── 章纲实体字段的展示与编辑

Phase 4（后续）  AI 集成
  └── 设定实体 AI 检查（设定规则 + 实体信息 → AI → 结果展示 → 一键修改）
```

---

### 2.3 标签库

**定位**：服务于设定库，提供树状分类标签，补充设定库无法通过固定字段表达的维度。

#### 标签展示规则

设定库中标签选择时展示为**面包屑路径格式**：

```
标签：种族/人族/修仙者
标签：种族/妖/海妖/玄龟
标签：势力/宗门/一品宗门
```

#### 限制

- 设定实体选择标签上限：**20 个**
- 每个标签名称和说明需符合文本规范
- 标签说明为**大文本域**

#### 数据模型

```typescript
interface TagNode {
  id: string;              // 前缀 "tn_"
  bookId: string;
  name: string;            // ≤60 字
  parentId?: string;       // 父级标签 ID，支持无限层级树形结构
  description: string;     // 大文本域
  children?: TagNode[];
}
```

#### 关联关系

```
标签库 ──被选择──► 设定库（设定实体的 tags 字段引用标签路径）
```

---

### 2.4 创作台

**定位**：核心创作工作流，从总纲到正文的层级结构。是所有模块的枢纽。

#### 层级结构

```
总纲（BookOutline）
 └── 卷纲（VolumeOutline）×N  [顺序生成，前卷完结才可建后卷]
      └── 章纲（ChapterOutline）×M  [双向绑定卷的阶段]
           ├── 左面板：章纲信息
           └── 右面板：正文内容 + AI 操作
```

#### 2.4.1 总纲

| 字段 | 类型 | 说明 |
|------|------|------|
| 开头 | TextArea | 故事的起始设定 |
| 结尾 | TextArea | 故事的结局走向 |
| 卷列表 | 动态数组 | 可添加/删除，后续卷纲生成的依据 |
| 核心卖点 | Input | 作品核心吸引力 |

- AI 可根据用户输入的文本提取信息，组装提示词，返回内容建议，用户一键生成
- 卷列表的修改会**双向同步**到对应的卷纲标题

#### 2.4.2 卷纲

| 字段 | 类型 | 说明 |
|------|------|------|
| 卷标题 | Input | 与总纲卷列表**双向绑定** |
| 卷梗概 | TextArea | 与总纲卷列表**双向绑定** |
| 阶段 | 动态数组 | 每个阶段：阶段名 + 预计章节数（可 AI 检查合理性） |

**生成规则**：
- 每个卷完结后才能生成下一个卷（防一次性建太多）
- 需要有总纲才能生成卷纲
- 卷内容可由 AI 生成

**检查按钮**：
- 检查卷规划与总纲卷内容是否一致
- 内容变更后提醒用户做检查
- 可检查是否与总纲、世界规则的全局规则一致

#### 2.4.3 章纲/正文（双面板布局）

**左面板 — 章纲信息**：

| 字段 | 类型 | 说明 |
|------|------|------|
| 章标题 | Input | 必填 |
| 章梗概 | TextArea | 与卷纲的阶段描述**双向绑定** |
| 场景 | TextArea | 本章的场景描述 |
| 实体 | 选择器 | **从设定库选取**，关联人物/地点/势力/物品 |
| 重要内容 | TextArea | AI 正文必须写出/表达的内容清单 |
| 伏笔 | 复合字段 | 埋下/回收伏笔（见下方伏笔联动） |
| 章节开头 | TextArea | 固定文本 or 意同即可 |
| 开头模式 | Switch | 固定 = AI 严格按此写 / 非固定 = AI 表达同样意思即可 |
| 章节结尾 | TextArea | 同上 |
| 其他补充 | TextArea | 自由补充 |

**右面板 — 正文内容**：

| 操作 | 说明 |
|------|------|
| 生成 / 重新生成 | 首次点击「生成」，后续变为「重新生成」 |
| 去除 AI 味道 | 对全文/选中片段 |
| 润色 | 对全文/选中片段 |
| 扩写 | 选中片段后触发 |
| 重写 | 选中片段后触发 |
| 过审 | 触发复杂的过审流程（见下方） |

**章纲的实体字段**：从设定库中选取（非自由文本），选择后在章纲中以 Tag 形式展示。

#### 2.4.4 伏笔联动

章纲中的伏笔字段是一个**复合操作**：

| 操作 | 效果 |
|------|------|
| 埋下伏笔 | 伏笔库新增一条（状态 = hidden），章纲记录关联 |
| 回收伏笔 | 伏笔库对应伏笔状态变更为 revealed |

#### 2.4.5 过审流程（核心复杂逻辑）

过审按钮触发时，系统执行以下操作序列：

```
1. 提取事实
   └── 从正文中提取关键事实 → 写入事实库

2. 变更设定状态
   └── 根据正文内容，更新相关设定实体的状态信息字段
   └── 例：人物"李凡"在本章突破到筑基期 → statusFields["修炼境界"] = "筑基"

3. 检查一致性
   ├── 与世界规则全局规则校验
   ├── 与相关设定实体校验
   └── 不一致时提示用户

4. 记录回滚信息
   ├── 记录本章对设定库的所有变更（before → after）
   ├── 记录本章创建的新实体（人物、物品、伏笔等）
   ├── 记录本章对伏笔库的所有操作
   └── 以上信息用于后续回滚

5. 写入正文库
   └── 将过审的正文覆盖写入正文库（单向数据流）

6. 章节状态变更
   └── chapter.status → "done"
```

#### 2.4.6 章节锁定与回滚（极高复杂度）

**锁定规则**：
- 确定写下一章后，前面的章节**不允许操作**
- 如需回到上一章，正文库中该章信息会**被覆盖**

**回滚流程**（回到上一章时触发）：

```
1. 还原设定库
   ├── 删除本章创建的新实体（人物、物品等）
   └── 恢复本章变更的实体状态信息（before 值）

2. 还原伏笔库
   ├── 删除本章埋下的伏笔
   └── 恢复本章回收的伏笔状态（revealed → hidden）

3. 还原事实库
   └── 删除本章提取的事实

4. 清空正文库
   └── 删除本章写入的正文

5. 章节状态重置
   └── chapter.status → "writing" 或 "planned"
```

> **设计关键**：过审时记录的回滚信息（变更日志）是回滚的唯一依据。回滚信息的数据结构需要精心设计，确保每条变更可独立还原。

#### 数据模型

```typescript
interface BookOutline {
  bookId: string;
  opening: string;         // 开头
  ending: string;          // 结尾
  volumes: string[];       // 卷列表（与 VolumeOutline 标题双向绑定）
  sellingPoints: string;   // 核心卖点
  updatedAt: string;
}

interface VolumeOutline {
  id: string;
  bookId: string;
  title: string;           // 与总纲 volumes 双向绑定
  synopsis: string;        // 卷梗概，与总纲双向绑定
  stages: VolumeStage[];   // 阶段列表
  highlights: string;
  sortOrder: number;
  status: "locked" | "active" | "planned";
  createdAt: string;
  updatedAt: string;
}

interface VolumeStage {
  name: string;            // 阶段名
  expectedChapters: number;// 预计章节数
}

interface ChapterOutline {
  id: string;
  volumeId: string;
  title: string;
  synopsis: string;        // 章梗概，与卷阶段双向绑定
  scene: string;           // 场景
  entities: string[];      // 关联设定实体 ID（从设定库选取）
  keyPoints: string[];     // 重要内容（AI 必须写出）
  foreshadowings: ForeshadowAction[]; // 伏笔操作
  opening: string;         // 章节开头
  openingFixed: boolean;   // 开头是否固定
  ending: string;          // 章节结尾
  endingFixed: boolean;    // 结尾是否固定
  note: string;            // 其他补充
  content: string;         // 正文内容
  sortOrder: number;
  status: "planned" | "writing" | "done";
  createdAt: string;
  updatedAt: string;
}

// 伏笔操作
interface ForeshadowAction {
  foreshadowId?: string;   // 关联伏笔 ID（回收时必填）
  action: "plant" | "reveal"; // 埋下 or 回收
  name: string;            // 伏笔名称
  description?: string;    // 伏笔描述（埋下时填写）
}

// 过审回滚信息（存储在章纲中）
interface ApprovalRollback {
  chapterId: string;
  approvedAt: string;

  // 设定库变更
  settingChanges: {
    entityId: string;
    entityName: string;
    changeType: "created" | "status_changed";
    before?: Record<string, string>;  // 变更前状态
    after?: Record<string, string>;   // 变更后状态
  }[];

  // 伏笔库变更
  foreshadowChanges: {
    foreshadowId: string;
    changeType: "created" | "revealed";
    beforeStatus?: "hidden" | "revealed";
  }[];

  // 事实库变更
  factIds: string[];  // 本章创建的事实 ID
}
```

---

### 2.5 伏笔库

**定位**：纯展示，不可编辑。由创作台的章纲伏笔操作自动维护。

#### 功能

- 伏笔分布位置数据图（哪个章节埋下、哪个章节回收）
- 伏笔列表（按状态筛选：未揭晓 / 已揭晓）
- 伏笔查询
- **不可手动修改**，所有变更由创作台章纲的伏笔操作触发

#### 数据模型

```typescript
type ForeshadowStatus = "hidden" | "revealed";

interface Foreshadow {
  id: string;              // 前缀 "fs_"
  bookId: string;
  name: string;
  description: string;
  status: ForeshadowStatus;
  plantedChapterId?: string;  // 埋下的章节 ID
  plantedAt?: string;
  revealedChapterId?: string; // 回收的章节 ID
  revealedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 关联关系

```
创作台章纲 ──埋下/回收──► 伏笔库（自动维护，不可手动编辑）
伏笔库 ◄──创作台回滚（回滚时还原状态或删除）
```

---

### 2.6 事实库

**定位**：纯展示，存储正文中已确定的事实。AI 生成内容时的参考依据。

#### 功能

- 存放已过审章节提取的事实
- 纯展示，不可手动编辑
- AI 生成内容时参考，防止生成与已有事实矛盾的内容

#### 数据模型

```typescript
interface StoryFact {
  id: string;              // 前缀 "sf_"
  bookId: string;
  chapterId: string;       // 来源章节
  content: string;         // 事实内容
  entities: string[];      // 关联的设定实体 ID
  createdAt: string;
}
```

#### 关联关系

```
创作台过审 ──提取──► 事实库（过审时自动提取）
事实库 ◄──创作台回滚（回滚时删除）
事实库 ──注入──► AI 提示词（作为 AI 生成的参考上下文）
```

---

### 2.7 AI 提示词系统

**定位**：独立于创作区，位于 Setting 页面。管理所有 AI 功能的 prompt 模板。

#### AI 功能清单

| 功能名 | 触发位置 | 输入参数 | 说明 |
|--------|---------|---------|------|
| 正文生成 | 创作台右面板 | 章纲标题、书籍信息、设定实体、世界规则、事实、前文 | 根据章纲生成正文 |
| 重新生成 | 创作台右面板 | 同上 + 原正文 | 重新生成正文 |
| 去 AI 味道 | 创作台右面板 / 正文库 | 选中文本或全文 | 降低 AI 写作痕迹 |
| 润色 | 创作台右面板 / 正文库 | 选中文本或全文 | 提升文字质量 |
| 扩写 | 创作台右面板 | 选中片段 | 扩展选中内容 |
| 重写 | 创作台右面板 | 选中片段 | 重写选中内容 |
| 设定检查 | 设定库实体 | 设定规则 + 设定实体信息 | 检查设定一致性 |
| 卷检查 | 创作台卷纲 | 总纲 + 全局规则 + 卷信息 | 检查卷规划合理性 |
| 卷生成 | 创作台卷纲 | 总纲 + 卷列表 | AI 生成卷纲内容 |
| 总纲生成 | 创作台总纲 | 用户输入文本 | AI 提取并生成总纲建议 |

#### 提示词模板语法

```
变量占位符：$变量名
示例：你是一个{文风}的网文作家，请根据以下章纲生成正文：

章标题：$chapterTitle
章梗概：$chapterSynopsis
出场人物：$entities
世界规则：$globalRules
写作规则：$writingRules
事实参考：$facts
前文内容：$previousContent
```

#### 系统要求

| 要求 | 说明 |
|------|------|
| 变量校验 | 用户编辑提示词时，检查 `$变量名` 是否为已定义的合法变量 |
| 注入防护 | 过滤用户输入中的代码注入（HTML 标签、script 等） |
| 错误检查 | 运行时校验所有变量是否有值，防止 undefined 报错 |
| 预览功能 | 点击「预览」，用预设文本替换变量，展示最终发送给 AI 的完整 prompt |
| AI 输出预览 | 预览区域展示 AI 根据该 prompt 生成的示例内容 |

#### 参数说明

每个输入参数需配置：

```typescript
interface PromptParameter {
  name: string;            // 变量名（如 chapterTitle）
  label: string;           // 显示名称（如"章纲标题"）
  description: string;     // 字段说明，帮助用户理解
  source: ParameterSource; // 数据来源
  required: boolean;
}

type ParameterSource =
  | "chapter.title"        // 章纲标题
  | "chapter.synopsis"     // 章纲梗概
  | "chapter.entities"     // 章纲关联实体
  | "book"                 // 书籍基本信息
  | "worldRules.global"    // 全局规则
  | "worldRules.writing"   // 写作规则
  | "facts"                // 事实库
  | "settings"             // 设定库（当前相关实体）
  | "outline"              // 总纲
  | "volume"               // 卷纲
  | "previousContent"      // 前文内容
  | "custom";              // 自定义输入
```

#### 数据模型

```typescript
interface AiFunction {
  id: string;              // 前缀 "af_"
  key: string;             // 功能标识（如 "generate_content", "remove_ai_smell"）
  name: string;            // 显示名称
  description: string;     // 功能说明
  promptTemplate: string;  // 提示词模板（含 $变量占位符）
  parameters: PromptParameter[]; // 参数列表
  isActive: boolean;       // 是否启用
  updatedAt: string;
}
```

---

## 三、数据流全景

### 3.1 正常创作流程

```
1. 创建书籍 → 填写元信息

2. 配置世界规则
   ├── 全局规则（预置"政治合规" + 用户自定义）
   ├── 写作规则（文笔、文风等）
   └── 设定规则（力量体系、境界上限等）

3. 创建设定库
   ├── 创建人物、地点、势力、物品
   ├── 选择标签（从标签库）
   ├── 填写基础信息 + 状态信息
   └── 点击「检查」→ AI 校验设定规则一致性

4. 编写创作台
   ├── 总纲：开头、结尾、卷列表、核心卖点
   │   └── AI 辅助生成
   ├── 卷纲：依次生成（前卷完结 → 后卷）
   │   ├── 与总纲双向绑定
   │   ├── 阶段规划（AI 检查合理性）
   │   └── 卷检查按钮
   └── 章纲/正文：
       ├── 填写章纲信息
       ├── 关联设定实体（从设定库选取）
       ├── 埋下/回收伏笔（联动伏笔库）
       ├── 生成正文（AI + 提示词）
       ├── 去AI味道/润色/扩写/重写
       └── 过审：
           ├── 提取事实 → 事实库
           ├── 变更设定状态 → 设定库
           ├── 一致性检查
           ├── 记录回滚信息
           └── 写入正文库

5. 前进到下一章 → 前章锁定
```

### 3.2 回滚流程

```
用户选择"回到上一章"
│
├── 1. 删除本章创建的新实体（设定库）
├── 2. 恢复本章变更的实体状态（设定库）
├── 3. 删除本章埋下的伏笔 / 恢复回收的伏笔（伏笔库）
├── 4. 删除本章提取的事实（事实库）
├── 5. 清空正文库中本章内容
└── 6. 重置章节状态
```

### 3.3 AI 提示词组装流程

```
AI 功能触发（如"正文生成"）
│
├── 1. 获取 prompt 模板（从 AI 提示词系统）
├── 2. 收集所有参数值
│   ├── 章纲信息（标题、梗概、实体、伏笔等）
│   ├── 书籍信息
│   ├── 世界规则（全局规则 + 写作规则）
│   ├── 设定实体信息
│   ├── 事实库
│   └── 前文内容
├── 3. 变量替换（$变量名 → 实际值）
├── 4. 注入防护（过滤危险内容）
├── 5. 变量完整性校验
└── 6. 调用 AI API → 返回结果
```

---

## 四、模块依赖关系与实施优先级

### 4.1 依赖关系图

```
Phase 1（基础设施）：无依赖
  ├── 世界规则（持久化 + 三大分类）
  ├── 标签库（持久化 + 树状结构）
  └── 设定库（持久化 + 五大分类 + 基础/状态信息）

Phase 2（关联打通）：依赖 Phase 1
  ├── 设定库 ↔ 标签库关联
  ├── 创作台章纲 ↔ 设定库关联（实体选择器）
  ├── 创作台章纲 ↔ 伏笔库联动（埋下/回收）
  └── 创作台总纲/卷纲改造

Phase 3（核心流程）：依赖 Phase 2
  ├── 过审流程（提取事实 + 变更设定 + 记录回滚）
  ├── 回滚机制（还原所有变更）
  ├── 章节锁定逻辑
  └── 正文库（过审写入 + 去AI味/润色）

Phase 4（AI 集成）：依赖 Phase 1-3
  ├── AI 提示词系统（模板管理 + 变量替换 + 预览）
  ├── AI 正文生成（接入创作台）
  ├── AI 设定检查（接入设定库）
  ├── AI 卷生成/检查
  └── AI 辅助功能（去AI味/润色/扩写/重写）

Phase 5（展示完善）：依赖 Phase 1-3
  ├── 伏笔库（分布图 + 列表）
  ├── 事实库（纯展示）
  └── 各模块 UI 打磨
```

### 4.2 当前系统现状 vs 目标

| 模块 | 当前状态 | Phase 目标 | 差距 |
|------|---------|-----------|------|
| 世界规则 | 前端 state，单一分类 | 持久化，三大分类，设定规则 | 重写 |
| 设定库 | 前端 state，5分类，仅人物有字段 | 持久化，基础/状态信息，AI 检查 | 重写 |
| 标签库 | 前端 state，树状结构 | 持久化，与设定库关联 | 持久化 + 关联 |
| 创作台 | 有持久化，章纲用自由文本 | 关联设定实体，伏笔联动，总纲改造 | 大幅改造 |
| 伏笔库 | 前端 state，手动输入 | 被创作台自动维护，纯展示 | 重写 |
| 事实库 | 不存在 | 新建 | 全新 |
| 正文库 | 有持久化，与创作区弱关联 | 过审单向写入，AI 辅助 | 改造 |
| AI 提示词 | 不存在（仅有 AI 配置） | Setting 页面，模板管理 | 全新 |

---

## 五、待讨论问题

1. **状态信息字段的结构**：当前设计为 `Record<string, string>`，是否需要更结构化的定义（如预定义字段列表）？
2. **回滚信息的存储位置**：存在章纲中还是独立表？回滚信息的数据量可能较大。
3. **正文库与创作区正文的关系**：设计为"不关联但 ID 可关联"，过审时是"覆盖"还是"快照"？
4. **标签库的层级深度**：是否需要限制最大层级？
5. **设定规则的下拉类型**：selectOptions 是否需要独立管理界面？
6. **过审流程的 AI 参与度**：AI 检查是一键全自动还是分步确认？
