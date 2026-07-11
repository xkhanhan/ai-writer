# 提示词库功能重做 — 产品需求文档 (PRD)

> **版本：** v2.0\
> **状态：** 已评审\
> **最后更新：** 2026-07-11\
> **关联任务：** F-009, F-010, F-011, F-012, F-013\
> **视觉稿：** `docs/mockups/prompt-library-redesign.html` (v3)\
> **必读对象：** 开发工程师（开发前）、代码审计员（测试前）

***

## 一、背景

当前提示词库是两栏布局（函数列表 + 编辑器），进入页面空白无引导，变量信息不完整，没有预览能力，per-book override 增加不必要的复杂度。本次重做为三栏 IDE 风格布局，补齐变量体系和预览功能，移除 per-book。

***

## 二、术语表

| 术语                  | 含义                                                                  |
| ------------------- | ------------------------------------------------------------------- |
| **functionKey**     | AI 功能的唯一标识符，如 `content_generate`、`polish`。每个 functionKey 对应一种 AI 能力 |
| **workspace group** | 函数分组，按工作区模块归类（书籍信息、创作区等），一个 group 下有 1-N 个 functionKey              |
| **模板 (template)**   | 用户编辑的提示词文本，包含 `${variableName}` 占位符                                 |
| **系统默认模板**          | 由系统预设的模板，`isDefault=1, bookId=null`，用户不可删除，可复制                      |
| **自定义模板**           | 用户复制系统默认后创建的模板，`isDefault=0, bookId=null`，可编辑/删除                    |
| **激活 (activate)**   | 将某个模板标记为该 functionKey 的生效模板。一个 functionKey 最多激活一个模板                 |
| **${variableName}** | 变量占位符语法。前后端统一使用正则 `\$\{(\w+)\}` 解析                                  |

***

## 三、功能需求

### F-009：三栏布局重做

#### 3.1 整体布局

```
┌────────┬──────────────────┬──────────────────────────────────────┐
│ 活动栏  │  函数分组列表      │            内容区                      │
│(外层,  │ (232px, 左侧)    │                                      │
│ 56px)  │                  │  ┌─ 顶部工具栏 ─────────────────────┐ │
│        │  ▼ 书籍信息       │  │ 函数名 | 📖书选择器| 变量|操作|保存│ │
│  ⚙️    │    书籍简介扩写    │  ├─ 变量面板(可折叠,max200px) ─────┤ │
│  📝    │  ▼ 世界规则       │  │ ${name} 描述 复制 | ...          │ │
│        │    规则建议       │  ├──────────┬──────────────────────┤ │
│  ···   │  ▼ 创作区         │  │  编辑器    │  预览               │ │
│        │    内容生成       │  │  (IDE风格) │  (IDE风格)          │ │
│        │    润色          │  │  等宽字体   │  等宽字体,只读        │ │
│        │    ...          │  │  可滚动     │  可滚动              │ │
│        │  ▼ 事实库        │  │            │                     │ │
│  ←返回 │  ▼ 设定库        │  └──────────┴──────────────────────┘ │
│        │  ▼ 正文库        │                                      │
└────────┴──────────────────┴──────────────────────────────────────┘
```

**组件结构：**

| 组件                   | 文件                   | 职责                     |
| -------------------- | -------------------- | ---------------------- |
| `PromptLibrary`      | `index.tsx`          | 三栏容器，管理选中函数状态          |
| `PromptFunctionList` | `prompt-list.tsx`    | 左侧函数分组列表               |
| `PromptEditor`       | `prompt-editor.tsx`  | 编辑器区域（变量面板 + textarea） |
| `PromptPreview`      | `prompt-preview.tsx` | 预览区域（变量替换后的只读展示）       |
| `VariablePanel`      | `variable-panel.tsx` | 可折叠变量面板（2列网格 + 复制按钮）   |

#### 3.2 函数分组列表（左侧）

**数据源：** 硬编码的 6 个 workspace group，每个 group 包含 functionKey 列表：

| 分组 (panelKey)  | 分组名称   | functionKey            | 功能说明       |
| -------------- | ------ | ---------------------- | ---------- |
| `info`         | 书籍信息   | `book_info_suggest`    | 书籍简介扩写     |
| `world-rules`  | 世界规则   | `world_rule_suggest`   | 世界规则 AI 建议 |
| `creation`     | 创作区    | `content_generate`     | 内容生成       |
| <br />         | <br /> | `review_extract`       | 过审提取       |
| <br />         | <br /> | `polish`               | 润色         |
| <br />         | <br /> | `deslop`               | 去 AI 味     |
| <br />         | <br /> | `expand`               | 扩写         |
| `fact-library` | 事实库    | `fact_consistency`     | 事实一致性检查    |
| `settings`     | 设定库    | `character_audit`      | 角色审计       |
| `archive`      | 正文库    | `book_synopsis_expand` | 书籍简介扩写     |

**交互规则：**

| 行为      | 规则                                                 |
| ------- | -------------------------------------------------- |
| 分组折叠/展开 | 点击分组标题切换，默认全部展开                                    |
| 选中函数    | 点击 functionKey，左侧 border-left 2px jade 色高亮 + 背景色变化 |
| 模板类型标识  | 系统默认→显示"默认"标签（jade 色）；自定义激活→显示"自定义"标签（orange 色）    |
| 自动选中    | 进入页面时，自动选中第一个 group 的第一个 functionKey               |

#### 3.3 顶部工具栏

```
┌───────────────────────────────────────────────────────────────┐
│ [内容生成]  │  📖 [夜行 ▼]  │  变量  │  复制为自定义  │  激活  │  保存  │
└───────────────────────────────────────────────────────────────┘
```

| 按钮       | 显示条件       | 行为                                                  |
| -------- | ---------- | --------------------------------------------------- |
| 函数名称     | 始终         | 只读，显示当前选中函数的中文名                                     |
| 书籍选择器    | 始终         | Select 下拉，列出当前用户所有书籍，用于预览                           |
| 变量       | 始终         | 切换变量面板展开/收起                                         |
| 复制为自定义   | 当前是系统默认模板时 | 复制一份自定义模板并自动选中                                      |
| 激活       | 当前模板未激活时   | 将当前模板设为该 functionKey 的生效模板（自动取消同 functionKey 下其他激活） |
| 激活（已激活态） | 当前模板已激活时   | 灰色禁用，显示"已激活"                                        |
| 保存       | 有未保存修改时    | 高亮可点击；无修改时灰色禁用                                      |

#### 3.4 可折叠变量面板

**展开/收起：** 点击工具栏"变量"按钮切换。展开时有动画过渡。

**布局：** 2 列网格，max-height 200px，超出纵向滚动。变量列表从后端 API 动态获取（按当前 functionKey），非前端硬编码。

**每个变量项：**

```
┌──────────────────────────────────┐
│  ${bookTitle}    书籍名称   复制   │
│  ${bookGenre}    题材类型   复制   │
│  ${bookSynopsis} 书籍简介   复制   │
│  ...                            │
└──────────────────────────────────┘
```

**复制行为：** 点击任意变量项 → 复制 `${variableName}` 到系统剪贴板 → 显示"已复制"轻提示（1秒后消失）。

#### 3.5 编辑器（IDE 风格）

- **容器：** 全高（flex:1），无边框 textarea
- **字体：** 等宽字体（`JetBrains Mono, monospace`），13px，行高 1.75
- **背景：** `var(--panel)`（与页面背景一致）
- **内容：** 直接展示用户的完整提示词模板，无系统指令前缀分隔
- **滚动：** 原生 overflow:auto
- **聚焦态：** 无特殊边框（IDE 风格，融入背景）

**重要：** 编辑器中没有"系统指令（不可编辑）"区域。用户编写的就是完整提示词。系统内部处理（过滤、JSON格式拼接）对用户透明。

#### 3.6 预览面板（IDE 风格）

- **容器：** 与编辑器等宽并排（各 flex:1），中间 1px 分隔线
- **字体/背景：** 与编辑器一致（等宽字体，统一视觉）
- **内容：** 将模板中的 `${variableName}` 替换为选中书籍的真实数据
- **只读：** 不可编辑
- **无数据处理：** 若某变量在选中书中无值，显示 `[未设置]`
- **未选书时：** 显示居中提示文字 "请在顶部选择一本书以预览提示词"

**实时同步：** 编辑器内容变化时，预览自动更新（无需手动操作）。

***

### F-010：变量体系与校验

#### 3.7 变量语法

```
格式：${variableName}
正则：\$\{(\w+)\}
示例：本书名称：${bookTitle}，题材：${bookGenre}
```

- `${}` 边界清晰，不会与普通 `$` 符号冲突
- 前后端使用相同正则解析
- 变量名仅允许字母、数字、下划线（`\w+`）

#### 3.8 变量体系设计

**核心原则：变量按 functionKey 动态定义，不由前端硬编码。**

每个 functionKey 拥有独立的变量 schema，定义该场景需要哪些变量、从哪里取数据。新增 AI 功能时，只需在后端注册新的 functionKey + 变量 schema，前端自动适配。

**变量数据来源分类：**

| 来源类别 | 说明 | 示例变量 |
|---------|------|---------|
| 书籍信息 | 从 book 表获取，所有 functionKey 共享 | `bookTitle`, `bookGenre`, `bookSynopsis`, `bookCoreSellingPoint`, `bookCharacterCount`, `userSupplement` |
| 章节信息 | 从 chapter 表获取，仅创作区相关 functionKey 使用 | `chapterTitle`, `chapterSummary`, `chapterScenes`, `chapterCharacters`, `chapterKeyEvents` |
| 角色信息 | 从 setting_entities 表获取，按章纲关联的角色ID查询 | `characterName`, `characterDescription`, `characterTraits` |
| 伏笔信息 | 从 foreshadows 表获取 | `foreshadowToRecover`, `foreshadowToPlant` |
| 事实信息 | 从 facts 表获取，按章节号查询前情 | `previousFacts` |
| 规则信息 | 从 world_rules 表获取 | `globalRules`, `writingRules` |
| 用户输入 | 由用户在运行时提供 | `selectedText`（润色时的选中文本）, `userSupplement` |
| 系统常量 | 由系统按 functionKey 内置，不可编辑 | `outputFormat` |

**变量定义存储（后端）：**

每个 functionKey 在后端注册时声明其变量列表：

```typescript
// 变量定义（后端维护）
interface VariableDefinition {
  name: string;           // 变量名，如 "chapterTitle"
  label: string;          // 显示名，如 "章节标题"
  description: string;    // 描述，如 "当前章节的标题"
  source: VariableSource; // 数据来源类型
  required: boolean;      // 是否必填
  editable: boolean;      // 用户是否可在变量面板查看（outputFormat=false）
}

type VariableSource = 'book' | 'chapter' | 'character' | 'foreshadow' | 'fact' | 'rule' | 'user' | 'constant';
```

**变量与 functionKey 的关系（示例）：**

| functionKey | 所需变量 | 说明 |
|-------------|---------|------|
| `book_info_suggest` | bookTitle, bookGenre, bookSynopsis, bookCoreSellingPoint, bookCharacterCount, userSupplement | 仅需书籍信息 |
| `content_generate` | bookTitle, bookGenre, bookSynopsis, chapterTitle, chapterSummary, chapterCharacters, previousFacts, foreshadowToRecover, globalRules, writingRules | 需要书籍+章节+角色+伏笔+事实+规则 |
| `polish` | bookTitle, bookGenre, bookCoreSellingPoint, selectedText, outputFormat | 需要书籍信息+用户选中文本 |
| `deslop` | bookTitle, bookGenre, selectedText | 需要书籍信息+用户选中文本 |
| `review_extract` | chapterTitle, chapterContent, characterList, foreshadowList | 需要章节内容+角色+伏笔 |
| `fact_consistency` | bookTitle, previousFacts, currentChapterFacts | 需要事实对比 |
| `character_audit` | characterName, characterDescription, characterTraits, globalRules | 需要角色+规则 |

> **注意：** 以上为示例映射，具体变量由后端 AI 功能注册时定义。开发时需查阅后端实际注册的 variableSchema。

**前端渲染规则：**

1. 选中 functionKey 后，调用 API 获取该 functionKey 的变量列表
2. 变量面板动态渲染：遍历变量列表，每个变量显示 `${name}` + label + description + 复制按钮
3. `editable=false` 的变量（如 `outputFormat`）显示为只读，不可点击复制
4. 若后端返回的变量列表为空（功能未注册），变量面板显示"暂无可用变量"

**预览渲染规则：**

1. 选中 functionKey + 选中书籍后，后端根据变量 schema 查询各数据源
2. 将查询结果填充到模板中对应的 `${variableName}` 位置
3. 若某变量在数据源中无值 → 替换为 `[未设置]`
4. 预览面板只读展示渲染后的完整提示词

**扩展方式：** 新增 AI 功能时，后端注册新的 functionKey + variableSchema，前端无需改动即可自动展示新变量。

#### 3.9 变量校验（保存时）

**触发时机：** 用户点击"保存"按钮。

**校验逻辑：**

```
1. 获取当前 functionKey 的变量列表（从后端 API）
2. 用正则 \$\{(\w+)\} 扫描当前模板内容
3. 提取所有变量名
4. 与该 functionKey 的变量列表比对
5. 若存在未定义变量 → 弹窗：
   标题：「变量校验」
   内容：「以下变量不在系统支持列表中：${xxx}，保存后将无法替换为真实值，是否继续？」
   按钮：[继续保存] [返回修改]
6. 用户点"继续保存"→ 保存成功
7. 用户点"返回修改"→ 回到编辑器，不保存
8. 若所有变量均合法 → 直接保存
```

***

### F-011：预览

#### 3.10 预览渲染逻辑

```
输入：模板文本 + 选中的书籍 ID

步骤：
1. 获取选中书籍的完整数据（调用已有书籍 API）
2. 用正则 \$\{(\w+)\} 遍历模板中的所有变量
3. 将每个变量替换为书籍数据中对应的值：
   - ${bookTitle} → book.title
   - ${bookGenre} → book.genre
   - ...（按 §3.8 映射表）
   - ${outputFormat} → 该 functionKey 对应的格式要求常量
4. 若变量值为空/undefined → 替换为 "[未设置]"
5. 渲染到预览面板（只读 div）
```

**默认值：** 首次进入时，书籍选择器默认选中列表中的第一本书。

**同步机制：** 使用 React state 管理，编辑器 textarea 的 onChange 同时更新预览内容。

***

### F-012：移除 per-book 覆盖

#### 3.11 移除范围

| 删除项                      | 位置                                        | 说明                                            |
| ------------------------ | ----------------------------------------- | --------------------------------------------- |
| "为本书创建"按钮                | 前端 UI                                     | 从提示词库界面移除                                     |
| `copyGlobalToBook` API   | `app/api/ai/templates/route.ts`           | 移除该 action                                    |
| `deleteBookOverride` API | `app/api/ai/templates/route.ts`           | 移除该 action                                    |
| book\_scoped 查询          | `server/storage/prompt-template-store.ts` | `getPromptTemplatesByBook` 不再返回 book-scoped 行 |
| book\_id 字段              | DB 表                                      | 保留字段（不删列），但不再使用                               |

#### 3.12 激活逻辑（移除后）

移除 per-book 后的模板查找优先级：

| 优先级 | 条件                                                     | 说明             |
| --- | ------------------------------------------------------ | -------------- |
| 1   | `book_id IS NULL AND is_active = 1 AND is_default = 0` | 全局自定义（用户复制+激活） |
| 2   | `book_id IS NULL AND is_default = 1`                   | 系统默认（兜底）       |

**一个 functionKey 最多激活一个模板。** 激活新模板时，自动将同 functionKey 下其他已激活模板设为未激活。

***

### F-013：交互优化

#### 3.13 未保存修改保护

**dirty 状态判断：** 编辑器 textarea 的当前内容 ≠ 上次保存的内容。

**触发场景与行为：**

| 场景          | 条件         | 行为                                                           |
| ----------- | ---------- | ------------------------------------------------------------ |
| 切换函数        | dirty=true | `Modal.confirm` 弹窗："有未保存的修改，是否保存？" → \[保存并切换] \[不保存切换] \[取消] |
| 离开页面（切换活动项） | dirty=true | 同上弹窗                                                         |
| 复制为自定义      | dirty=true | 自动保存当前修改后再复制                                                 |
| 关闭浏览器/刷新    | dirty=true | 浏览器 `beforeunload` 事件提示                                      |

**弹窗按钮逻辑：**

- "保存并切换" → 调用保存 API → 成功后切换
- "不保存切换" → 丢弃修改 → 直接切换
- "取消" → 不做任何操作

#### 3.14 激活逻辑

| 场景                | 行为                                                   |
| ----------------- | ---------------------------------------------------- |
| 当前是系统默认，点"复制为自定义" | 复制模板 → 创建自定义模板 → 自动选中新模板 → 标记 dirty                  |
| 当前是自定义，点"激活"      | 调用 API 将该模板设为 active（同 functionKey 下其他模板设为 inactive） |
| 当前已激活             | 按钮禁用，显示"已激活"                                         |

***

## 四、验收标准

> 开发完成后逐条验证。每条包含具体操作步骤。

| #     | 场景          | 操作步骤                                                 | 预期结果                                                  |
| ----- | ----------- | ---------------------------------------------------- | ----------------------------------------------------- |
| AC-1  | 三栏布局        | 进入设置页→点击活动栏"提示词库"                                    | 左侧函数列表 + 右侧内容区正确展示，中间无空白                              |
| AC-2  | 自动选中        | 进入提示词库页面                                             | 自动选中第一个 group 的第一个函数，编辑器有内容                           |
| AC-3  | 分组折叠        | 点击"创作区"分组标题                                          | 分组折叠，functionKey 隐藏；再次点击展开                            |
| AC-4  | 函数切换        | 在列表中点击"润色"                                           | 顶部工具栏显示"润色"，编辑器加载对应模板                                 |
| AC-5  | 变量面板展开      | 点击工具栏"变量"按钮                                          | 变量面板展开，显示当前 functionKey 的所有变量（动态，从后端获取），2列网格，最大高度 200px |
| AC-6  | 变量面板收起      | 再次点击"变量"按钮                                           | 变量面板收起                                                |
| AC-7  | 变量复制        | 点击变量面板中任意可复制变量                                      | 剪贴板内容为 `${variableName}`，显示"已复制"提示                    |
| AC-8  | 模板编辑        | 在编辑器 textarea 中修改内容                                  | 顶部"保存"按钮高亮可点击，"激活"按钮状态正确                              |
| AC-9  | 保存成功        | 编辑后点击"保存"                                            | 保存成功，"保存"按钮变灰，刷新页面后内容仍在                               |
| AC-10 | 变量校验-合法     | 模板中使用当前 functionKey 支持的变量 → 点击保存                      | 直接保存成功，无弹窗                                            |
| AC-11 | 变量校验-非法     | 模板中使用 `${invalidVar}` → 点击保存                         | 弹窗提醒"以下变量不在系统支持列表中：${invalidVar}"，可选继续/返回             |
| AC-12 | 复制为自定义      | 当前查看系统默认模板→点击"复制为自定义"                                | 列表中新增一条自定义模板，自动选中，编辑器内容与原模板相同                         |
| AC-13 | 激活模板        | 当前选中自定义模板→点击"激活"                                     | 按钮变为"已激活"（灰色禁用），列表中该函数显示"自定义"标签                       |
| AC-14 | 激活切换        | 有自定义模板A已激活→复制为自定义B→激活B                               | A 自动变为未激活，B 变为已激活                                     |
| AC-15 | 预览-选书       | 点击顶部书选择器→选择"夜行"                                      | 右侧预览面板显示完整提示词，变量已替换为"夜行"的真实数据                         |
| AC-16 | 预览-同步       | 编辑器中修改模板→查看预览                                        | 预览内容实时更新（无需手动操作）                                      |
| AC-17 | 预览-无数据      | 选中一本书，但该书某变量（如 userSupplement）为空                     | 预览中该变量位置显示 `[未设置]`                                    |
| AC-18 | 预览-未选书      | 未选择任何书籍时                                             | 预览面板居中显示"请在顶部选择一本书以预览提示词"                             |
| AC-19 | 未保存提醒-切函数   | 编辑模板后→点击另一个函数                                        | 弹窗提醒"有未保存的修改，是否保存？"                                   |
| AC-20 | 未保存提醒-离开页面  | 编辑模板后→点击活动栏切换到"AI配置"                                 | 同上弹窗提醒                                                |
| AC-21 | per-book 移除 | 检查代码和 UI                                             | 无"为本书创建"入口，API 中无 copyGlobalToBook/deleteBookOverride |
| AC-22 | 四套主题        | 切换 warm-paper / cool-gray / clean-white / dark       | 所有新组件视觉正常，无颜色冲突                                       |
| AC-23 | 构建验证        | `npm run typecheck && npm run lint && npm run build` | 全部通过                                                  |

***

## 五、依赖关系

```
F-008 (设置页活动栏) ──→ F-009 (三栏布局) ──→ F-011 (测试预览)
                                      ↑
F-010 (变量体系) ──────────────────────┘
F-012 (移除 per-book) —— 独立，可并行
F-013 (交互优化) —— 依赖 F-009
```

***

## 六、本期不做

- 内容过滤具体规则实现（提示词注入检测模式匹配）
- 用户自定义变量扩展
- 提示词版本历史
- 提示词导入/导出

