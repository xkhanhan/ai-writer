/**
 * Seed data for prompt templates.
 * Each entry maps to a row in `prompt_templates` (book_id = NULL, is_default = 1).
 */

export type PromptTemplateSeed = {
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: string;
};

export const PROMPT_TEMPLATE_SEEDS: PromptTemplateSeed[] = [
  {
    functionKey: "content_generate",
    displayName: "正文生成",
    description: "根据章纲信息生成小说正文",
    template: `你是一位专注于网络小说创作的资深作家。请根据以下章纲信息撰写正文。

## 输出格式
- 直接输出正文，不加标题、注释或总结
- 目标字数：\${expectedWords} 字（允许 ±15%）

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
写作风格：\${bookStyle}

## 世界规则
\${worldRules}

## 写作规则
\${writingRules}

## 章纲信息
标题：\${chapterTitle}
摘要：\${chapterSummary}
场景：\${chapterScenes}
出场人物：\${chapterCharacters}
重要事件：\${chapterKeyEvents}

## 角色档案
\${characterProfiles}

## 事实记录
\${facts}

## 活跃伏笔
\${foreshadows}

## 前文衔接
\${previousEnding}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: true },
      { name: "bookStyle", description: "写作风格", source: "book", required: false },
      { name: "worldRules", description: "全局规则", source: "world_rules", required: false },
      { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
      { name: "chapterTitle", description: "章节标题", source: "chapter", required: true },
      { name: "chapterSummary", description: "章节摘要", source: "chapter", required: false },
      { name: "chapterScenes", description: "场景列表", source: "chapter", required: false },
      { name: "chapterCharacters", description: "出场人物", source: "chapter", required: false },
      { name: "chapterKeyEvents", description: "重要事件", source: "chapter", required: false },
      { name: "characterProfiles", description: "角色档案", source: "settings", required: false },
      { name: "facts", description: "事实记录", source: "facts", required: false },
      { name: "foreshadows", description: "活跃伏笔", source: "foreshadows", required: false },
      { name: "previousEnding", description: "前文结尾", source: "chapter", required: false },
      { name: "expectedWords", description: "目标字数", source: "chapter", required: true },
    ]),
  },
  {
    functionKey: "review_extract",
    displayName: "过审提取",
    description: "从章节正文中提取结构化数据（事实、伏笔、角色状态）",
    template: `你是一位小说数据提取专家。请从以下正文中提取结构化信息。

## 输出格式
请以 JSON 格式返回以下内容：

\`\`\`json
{
  "facts": [
    {"content": "事实描述", "chapterNumber": N, "relatedCharacters": ["角色名"]}
  ],
  "foreshadowChanges": [
    {"action": "plant"|"resolve", "name": "伏笔名称", "description": "描述"}
  ],
  "characterStates": [
    {"name": "角色名", "changes": {"location": "新位置", "knownInfo": ["新信息"], "relationship": "关系变化"}}
  ],
  "itemStates": [
    {"name": "物品名", "changes": {"status": "新状态"}}
  ]
}
\`\`\`

---

## 章纲信息
\${chapterInfo}

## 正文内容
\${chapterContent}

## 现有角色设定
\${existingCharacters}

## 现有伏笔
\${existingForeshadows}`,
    variables: JSON.stringify([
      { name: "chapterInfo", description: "章纲信息", source: "chapter", required: false },
      { name: "chapterContent", description: "正文内容", source: "chapter_content", required: true },
      { name: "existingCharacters", description: "现有角色设定", source: "settings", required: false },
      { name: "existingForeshadows", description: "现有伏笔", source: "foreshadows", required: false },
    ]),
  },
  {
    functionKey: "polish",
    displayName: "润色",
    description: "提升文字表现力和感染力",
    template: `你是一位资深网文编辑。请对以下文本进行润色。

## 输出格式
- 保持字数大致不变（±10%）
- 直接输出润色后的文本，不加注释或说明

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 目标字数
\${targetWords}

## 章节上下文
\${chapterContext}

## 原文
\${selectedText}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
      { name: "selectedText", description: "选中文本", source: "user_selection", required: true },
      { name: "targetWords", description: "目标字数", source: "user_input", required: false },
      { name: "chapterContext", description: "章纲背景", source: "chapter", required: false },
    ]),
  },
  {
    functionKey: "deslop",
    displayName: "去AI味",
    description: "去除AI生成痕迹，让文字更自然",
    template: `你是一位经验丰富的网文编辑。请对以下文本进行"去AI味"处理。

## 必须删除的模式
- "值得注意的是"、"让我们来看看"、"总而言之"
- "在这个..."开头的段落
- 过度使用排比句（3个以上并列）
- 每段开头都是主语+谓语的单调句式
- 过多的"的"字连用（3个以上）

## 必须增加的元素
- 口语化表达（根据人物身份）
- 不规则句式（短句、倒装、省略）
- 五感细节（至少2种感官）

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 目标字数
\${targetWords}

## 章节上下文
\${chapterContext}

## 原文
\${selectedText}`,
    variables: JSON.stringify([
      { name: "selectedText", description: "选中文本", source: "user_selection", required: true },
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
      { name: "targetWords", description: "目标字数", source: "user_input", required: false },
      { name: "chapterContext", description: "章纲背景", source: "chapter", required: false },
    ]),
  },
  {
    functionKey: "expand",
    displayName: "扩写",
    description: "丰富细节，扩展文本长度",
    template: `你是一位资深网络小说作家。请对以下片段进行扩写。

## 输出格式
- 在保持原有情节的基础上丰富细节
- 增加环境描写、心理活动、对话等
- 扩写到约 \${targetWords} 字

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 背景
\${chapterContext}

## 原文片段
\${selectedText}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
      { name: "selectedText", description: "选中文本", source: "user_selection", required: true },
      { name: "targetWords", description: "目标字数", source: "user_input", required: false },
      { name: "chapterContext", description: "章纲背景", source: "chapter", required: false },
    ]),
  },
  {
    functionKey: "character_audit",
    displayName: "角色一致性检查",
    description: "检查角色在已写章节中的表现是否符合设定",
    template: `你是一位小说角色一致性审查专家。请检查以下角色在已写章节中的表现是否符合设定。

## 审查输出要求
- 对比角色实际行为与角色设定
- 标注 OOC（Out of Character）片段
- 检查能力边界是否合理
- 检查人际关系是否连贯
- 给出修改建议

---

## 角色设定
\${characterProfile}

## 世界规则
\${worldRules}

## 相关事实记录
\${facts}

## 已写章节中该角色出现的片段
\${characterAppearances}`,
    variables: JSON.stringify([
      { name: "characterProfile", description: "角色设定", source: "settings", required: true },
      { name: "worldRules", description: "世界规则", source: "world_rules", required: false },
      { name: "facts", description: "相关事实", source: "facts", required: false },
      { name: "characterAppearances", description: "角色出场片段", source: "chapters", required: false },
    ]),
  },
  {
    functionKey: "fact_consistency",
    displayName: "事实一致性检查",
    description: "交叉验证已记录事实，检测矛盾",
    template: `你是一位小说事实一致性检查专家。请对已记录的事实进行交叉验证。

## 检查输出要求
- 检查事实之间是否存在矛盾
- 检查事实是否与世界规则冲突
- 标注时间线不一致的问题
- 标注角色信息不一致的问题
- 给出修复建议

---

## 世界规则
\${worldRules}

## 角色设定
\${characterSettings}

## 事实记录
\${facts}`,
    variables: JSON.stringify([
      { name: "worldRules", description: "世界规则", source: "world_rules", required: false },
      { name: "characterSettings", description: "角色设定", source: "settings", required: false },
      { name: "facts", description: "事实记录", source: "facts", required: true },
    ]),
  },
  {
    functionKey: "book_synopsis_expand",
    displayName: "书籍简介扩写",
    description: "扩写书籍简介，增加吸引力",
    template: `你是一位资深网络小说策划。请对以下书籍简介进行扩写。

## 输出要求
- 在保持核心卖点不变的前提下丰富细节
- 增加悬念和吸引力
- 控制在 \${targetWords} 字以内
- 适合在小说平台展示

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}

## 写作规则
\${writingRules}

## 原始简介
\${originalDescription}

## 核心卖点
\${sellingPoint}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "originalDescription", description: "原始简介", source: "book", required: true },
      { name: "sellingPoint", description: "核心卖点", source: "book", required: false },
      { name: "targetWords", description: "目标字数", source: "user_input", required: false },
      { name: "writingRules", description: "写作规则", source: "world_rules", required: false },
    ]),
  },
  {
    functionKey: "book_info_suggest",
    displayName: "书籍信息建议",
    description: "根据概念描述生成完整书籍信息",
    template: `你是一位资深网络小说策划。请根据用户提供的书籍概念，生成完整的书籍信息建议。

## 返回格式
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "title": "建议书名",
  "genre": "题材大类",
  "subGenre": "子题材",
  "platform": "推荐发布平台",
  "targetAudience": "目标受众",
  "tags": ["标签1", "标签2", "标签3"],
  "writingStyle": "推荐文风",
  "targetWordCount": 3000,
  "targetTotalWords": 200,
  "referenceWorks": "参考作品",
  "sellingPoint": "核心卖点",
  "description": "书籍简介"
}
\`\`\`

## 格式约束
- 所有字段都必须填写
- 标签 3-5 个，每标签不超过 4 个字
- 简介控制在 150 字以内
- 核心卖点控制在 50 字以内

---

## 用户概念
\${userConcept}

## 已有信息（如有）
书名：\${existingTitle}
题材：\${existingGenre}`,
    variables: JSON.stringify([
      { name: "userConcept", description: "用户概念描述", source: "user_input", required: true },
      { name: "existingTitle", description: "已有书名", source: "book", required: false },
      { name: "existingGenre", description: "已有题材", source: "book", required: false },
    ]),
  },
  {
    functionKey: "world_rule_suggest",
    displayName: "世界规则建议",
    description: "根据书籍信息和描述生成世界规则",
    template: `你是一位资深网络小说世界观架构师。请根据书籍信息和用户描述，生成一套完整的世界规则建议。

## 返回格式
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "global": [
    {"name": "规则名称", "content": "规则具体内容"}
  ],
  "writing": [
    {"name": "规则名称", "content": "规则具体内容"}
  ],
  "setting": [
    {"name": "规则名称", "content": "规则具体内容"}
  ]
}
\`\`\`

## 格式约束
- 分为三类：global（全局规则）、writing（写作规则）、setting（设定规则）
- 每条规则包含 name 和 content
- 全局规则 5-8 条，写作规则 3-5 条，设定规则 2-4 条
- 规则内容要具体可执行，不要太笼统
- 不要生成政治合规、审核相关的内容，这类规则由平台自动处理

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
卖点：\${bookSellingPoint}

## 用户描述
\${userConcept}

## 已有规则（如有）
\${existingRules}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "bookSellingPoint", description: "核心卖点", source: "book", required: false },
      { name: "userConcept", description: "用户概念描述", source: "user_input", required: true },
      { name: "existingRules", description: "已有规则", source: "world_rules", required: false },
    ]),
  },
  {
    functionKey: "outline_optimize",
    displayName: "总纲优化",
    description: "优化故事总纲的方向、阶段划分和核心卖点",
    template: `你是一位资深网络小说策划编辑。请根据当前总纲内容和书籍信息，对总纲进行诊断和优化。

## 输出要求
以 JSON 格式返回优化建议，不要包含其他内容：

\`\`\`json
{
  "diagnosis": {
    "direction": "对整体方向的诊断评价（1-2句话）",
    "stages": "对阶段划分的诊断评价（1-2句话）",
    "sellingPoints": "对核心卖点的诊断评价（1-2句话）"
  },
  "optimized": {
    "direction": "优化后的整体方向",
    "stages": "优化后的阶段划分",
    "sellingPoints": "优化后的核心卖点"
  },
  "suggestions": ["建议1", "建议2", "建议3"]
}
\`\`\`

## 格式约束
- diagnosis 为诊断评价，指出当前内容的问题或亮点
- optimized 为优化后的内容
- suggestions 为 1-3 条额外建议
- 如果某个字段当前为空（"尚未填写"），则由你根据书籍信息补全

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
风格：\${bookStyle}

## 当前总纲
整体方向：\${currentDirection}
阶段划分：\${currentStages}
核心卖点：\${currentSellingPoints}

## 补充说明
\${userInstruction}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "bookStyle", description: "写作风格", source: "book", required: false },
      { name: "currentDirection", description: "当前整体方向", source: "outline", required: false },
      { name: "currentStages", description: "当前阶段划分", source: "outline", required: false },
      { name: "currentSellingPoints", description: "当前核心卖点", source: "outline", required: false },
      { name: "userInstruction", description: "用户补充说明", source: "user_input", required: false },
    ]),
  },
  {
    functionKey: "volume_generate",
    displayName: "卷纲生成",
    description: "根据总纲和已有卷纲，为当前卷生成核心冲突、发展弧线和看点",
    template: `你是一位资深网络小说策划编辑。请根据总纲和已有卷纲信息，为当前卷生成卷纲。

## 输出要求
以 JSON 格式返回，不要包含其他内容：

\`\`\`json
{
  "coreConflict": "本卷的核心矛盾冲突（1-3句话）",
  "developmentArc": "情节发展走向，从本卷起点到终点（3-5句话）",
  "highlights": "本卷吸引读者继续阅读的钩子（2-3个要点）"
}
\`\`\`

## 格式约束
- coreConflict 是本卷的主要矛盾，要具体、有张力
- developmentArc 描述情节起伏，要有节奏感
- highlights 是读者读完本卷后会期待下一卷的理由
- 必须与总纲方向一致，与前序卷纲衔接连贯
- 如果用户指定了卷标题，围绕标题设计内容

---

## 书籍信息
书名：\${bookTitle}
题材：\${bookGenre}
风格：\${bookStyle}

## 总纲
整体方向：\${outlineDirection}
阶段划分：\${outlineStages}
核心卖点：\${outlineSellingPoints}

## 已有卷纲（保持连贯）
\${previousVolumes}

## 当前卷信息
卷标题：\${currentVolumeTitle}
用户已填内容：
核心冲突：\${currentVolumeConflict}
发展弧线：\${currentVolumeArc}
看点：\${currentVolumeHighlights}

## 补充说明
\${userInstruction}`,
    variables: JSON.stringify([
      { name: "bookTitle", description: "书名", source: "book", required: true },
      { name: "bookGenre", description: "题材", source: "book", required: false },
      { name: "bookStyle", description: "写作风格", source: "book", required: false },
      { name: "outlineDirection", description: "总纲-整体方向", source: "outline", required: false },
      { name: "outlineStages", description: "总纲-阶段划分", source: "outline", required: false },
      { name: "outlineSellingPoints", description: "总纲-核心卖点", source: "outline", required: false },
      { name: "previousVolumes", description: "前序卷纲摘要", source: "volumes", required: false },
      { name: "currentVolumeTitle", description: "当前卷标题", source: "volume", required: false },
      { name: "currentVolumeConflict", description: "当前卷核心冲突（已填）", source: "volume", required: false },
      { name: "currentVolumeArc", description: "当前卷发展弧线（已填）", source: "volume", required: false },
      { name: "currentVolumeHighlights", description: "当前卷看点（已填）", source: "volume", required: false },
      { name: "userInstruction", description: "用户补充说明", source: "user_input", required: false },
    ]),
  },
];
