/**
 * Agent Scene Registry — defines all AI agent scenes.
 *
 * Each scene specifies:
 * - System prompt
 * - Available tools
 * - Context builder
 */

import type { AiFunctionKey } from "../context-builder/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentSceneConfig {
  /** Scene ID, e.g. "outline_optimize" */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Icon (emoji or icon name) */
  icon: string;
  /** Maps to context-builder functionKey */
  functionKey: AiFunctionKey;
  /** System prompt for this scene */
  systemPrompt: string;
  /** Available tool names for this scene */
  availableTools: string[];
  /** Quick actions (buttons) */
  quickActions: QuickAction[];
}

export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

// ---------------------------------------------------------------------------
// Scene Registry
// ---------------------------------------------------------------------------

const sceneRegistry = new Map<string, AgentSceneConfig>();

export function registerScene(scene: AgentSceneConfig): void {
  sceneRegistry.set(scene.id, scene);
}

export function getScene(sceneId: string): AgentSceneConfig {
  const scene = sceneRegistry.get(sceneId);
  if (!scene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }
  return scene;
}

export function getAllScenes(): AgentSceneConfig[] {
  return Array.from(sceneRegistry.values());
}

export function getScenesForFunctionKey(
  functionKey: AiFunctionKey
): AgentSceneConfig[] {
  return Array.from(sceneRegistry.values()).filter(
    (s) => s.functionKey === functionKey
  );
}

// ---------------------------------------------------------------------------
// Built-in Scenes
// ---------------------------------------------------------------------------

/** Outline Optimize Scene */
const outlineOptimizeScene: AgentSceneConfig = {
  id: "outline_optimize",
  name: "总纲优化",
  description: "优化故事总纲的方向、阶段划分和核心卖点",
  icon: "📋",
  functionKey: "outline_optimize",
  availableTools: ["propose_outline_update", "add_suggestion", "show_evaluation"],
  quickActions: [
    {
      id: "full_optimize",
      name: "全面优化",
      description: "AI分析并优化总纲的所有方面",
      icon: "✨",
      prompt: "请全面分析并优化这个总纲",
    },
    {
      id: "consistency_check",
      name: "一致性检查",
      description: "检查总纲各部分是否逻辑一致",
      icon: "🔍",
      prompt: "请检查总纲各部分的逻辑一致性",
    },
    {
      id: "suggest_only",
      name: "给出建议",
      description: "只给出优化建议，不直接修改",
      icon: "💡",
      prompt: "请给出总纲的优化建议，不需要直接修改",
    },
  ],
  systemPrompt: `你是一位资深网络小说策划编辑，擅长分析和优化故事总纲。

## 工作方式

1. 先阅读和理解当前总纲内容
2. 评估总纲的质量
3. 根据评估结果决定行动：
   - 如果有明显问题 → 调用 propose_outline_update 建议修改
   - 如果基本完善 → 调用 add_suggestion 给出建议
   - 无论哪种情况 → 调用 show_evaluation 展示评估

## 重要原则

- 不要一次性修改所有字段，只修改确实需要改的
- 如果某个字段已经很好，不要为了"优化"而修改
- 建议要具体可操作，不要泛泛而谈
- 先用文字解释你的分析，再调用工具

## 评估标准

- 优秀（80-100分）：方向清晰、阶段合理、卖点明确
- 良好（60-79分）：基本完整，有优化空间
- 需改进（<60分）：有明显缺失或方向偏差`,
};

/** Volume Generate Scene */
const volumeGenerateScene: AgentSceneConfig = {
  id: "volume_generate",
  name: "卷纲生成",
  description: "根据总纲和已有卷纲，为当前卷生成核心冲突、发展弧线和看点",
  icon: "📚",
  functionKey: "volume_generate",
  availableTools: ["propose_volume_update", "add_suggestion"],
  quickActions: [
    {
      id: "generate_volume",
      name: "生成卷纲",
      description: "根据总纲生成当前卷的卷纲",
      icon: "✨",
      prompt: "请根据总纲和已有卷纲，为当前卷生成卷纲",
    },
    {
      id: "suggest_improvements",
      name: "优化建议",
      description: "对当前卷纲给出优化建议",
      icon: "💡",
      prompt: "请对当前卷纲给出优化建议",
    },
  ],
  systemPrompt: `你是一位资深网络小说策划编辑，擅长设计卷纲结构。

## 工作方式

1. 阅读总纲和已有卷纲，理解整体故事走向
2. 分析当前卷在整体故事中的位置和作用
3. 设计核心冲突、发展弧线和看点
4. 调用工具提供建议

## 重要原则

- 确保与总纲方向一致
- 与前序卷纲保持连贯
- 核心冲突要有张力
- 发展弧线要有起伏节奏
- 看点要能吸引读者继续阅读`,
};

/** Content Generate Scene */
const contentGenerateScene: AgentSceneConfig = {
  id: "content_generate",
  name: "正文生成",
  description: "根据章纲生成小说正文",
  icon: "✍️",
  functionKey: "content_generate",
  availableTools: ["generate_content", "add_suggestion"],
  quickActions: [
    {
      id: "generate_chapter",
      name: "生成正文",
      description: "根据章纲生成正文",
      icon: "✨",
      prompt: "请根据章纲生成正文",
    },
    {
      id: "expand_outline",
      name: "扩写大纲",
      description: "扩写章纲中的某个部分",
      icon: "📝",
      prompt: "请扩写章纲中的关键场景",
    },
  ],
  systemPrompt: `你是一位资深网络小说作家，擅长根据章纲创作引人入胜的正文。

## 工作方式

1. 阅读章纲、角色设定、世界规则
2. 理解章节在整体故事中的位置
3. 创作符合设定的正文内容
4. 确保人物性格一致、情节连贯

## 重要原则

- 保持人物性格一致
- 符合世界规则设定
- 情节发展自然流畅
- 对话要符合人物身份
- 描写要有画面感`,
};

/** Polish Scene */
const polishScene: AgentSceneConfig = {
  id: "polish",
  name: "润色",
  description: "提升文字表现力和感染力",
  icon: "💎",
  functionKey: "polish",
  availableTools: ["propose_content_update", "add_suggestion"],
  quickActions: [
    {
      id: "polish_text",
      name: "润色文字",
      description: "提升选中文字的表现力",
      icon: "✨",
      prompt: "请润色这段文字，提升表现力和感染力",
    },
  ],
  systemPrompt: `你是一位资深网文编辑，擅长润色文字。

## 工作方式

1. 分析原文的风格和问题
2. 保持原文风格的基础上提升表现力
3. 优化句式、用词、节奏

## 重要原则

- 保持原文风格
- 字数大致不变（±10%）
- 提升表现力和感染力
- 避免过度修饰`,
};

/** Deslop Scene */
const deslopScene: AgentSceneConfig = {
  id: "deslop",
  name: "去AI味",
  description: "去除AI生成痕迹，让文字更自然",
  icon: "🧹",
  functionKey: "deslop",
  availableTools: ["propose_content_update", "add_suggestion"],
  quickActions: [
    {
      id: "deslop_text",
      name: "去AI味",
      description: "去除文字中的AI痕迹",
      icon: "✨",
      prompt: "请去除这段文字中的AI痕迹，让文字更自然",
    },
  ],
  systemPrompt: `你是一位经验丰富的网文编辑，擅长去除AI生成痕迹。

## 必须删除的模式
- "值得注意的是"、"让我们来看看"、"总而言之"
- "在这个..."开头的段落
- 过度使用排比句（3个以上并列）
- 每段开头都是主语+谓语的单调句式
- 过多的"的"字连用（3个以上）

## 必须增加的元素
- 口语化表达（根据人物身份）
- 不规则句式（短句、倒装、省略）
- 五感细节（至少2种感官）`,
};

/** Expand Scene */
const expandScene: AgentSceneConfig = {
  id: "expand",
  name: "扩写",
  description: "丰富细节，扩展文本长度",
  icon: "📖",
  functionKey: "expand",
  availableTools: ["propose_content_update", "add_suggestion"],
  quickActions: [
    {
      id: "expand_text",
      name: "扩写",
      description: "扩写选中的文字",
      icon: "✨",
      prompt: "请扩写这段文字，丰富细节",
    },
  ],
  systemPrompt: `你是一位资深网络小说作家，擅长扩写文本。

## 工作方式

1. 分析原文的情节和结构
2. 在保持原有情节的基础上丰富细节
3. 增加环境描写、心理活动、对话等

## 重要原则

- 保持原有情节不变
- 增加的细节要符合故事背景
- 扩写要自然，不要生硬
- 注意节奏感`,
};

// Register all scenes
registerScene(outlineOptimizeScene);
registerScene(volumeGenerateScene);
registerScene(contentGenerateScene);
registerScene(polishScene);
registerScene(deslopScene);
registerScene(expandScene);
