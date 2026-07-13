# AI Agent 智能体设计方案

## 一、核心理念

```
使用成熟框架：对话、流式、工具调用 → Vercel AI SDK
专注业务逻辑：场景配置、工具实现、结果渲染 → 我们自己做
```

**技术选型**：
- **Vercel AI SDK** - 对话管理、流式输出、工具调用
- **OpenAI Function Calling** - 结构化工具调用
- **React** - UI组件渲染

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (React)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    useChat (Vercel AI SDK)               │   │
│  │  • 自动管理 messages 状态                                 │   │
│  │  • 自动处理 streaming                                    │   │
│  │  • 自动处理 loading / error                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    我们的 UI 组件                         │   │
│  │  • SceneSelector - 场景选择                               │   │
│  │  • MessageList - 消息列表                                 │   │
│  │  • ToolCallCard - 工具调用卡片                            │   │
│  │  • PendingActions - 待处理操作                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端 (API Route)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              OpenAI SDK + Vercel AI SDK                  │   │
│  │  • 自动处理 streaming response                            │   │
│  │  • 自动处理 tool calls                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    我们的业务逻辑                         │   │
│  │  • SceneRegistry - 场景配置                               │   │
│  │  • ContextBuilder - 上下文构建                            │   │
│  │  • ToolHandlers - 工具实现                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           数据库                                 │
│  • books, outlines, chapters, characters (业务数据)             │
│  • conversations (可选：对话历史持久化)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、Vercel AI SDK 集成

### 3.1 安装依赖

```bash
npm install ai openai
```

### 3.2 前端 - useChat Hook

```typescript
'use client';

import { useChat } from 'ai/react';

interface AiPanelProps {
  sceneId: string;
  bookId: string;
}

export function AiPanel({ sceneId, bookId }: AiPanelProps) {
  const {
    messages,           // 消息列表（自动管理）
    input,              // 输入框状态
    handleInputChange,  // 输入变化处理
    handleSubmit,       // 表单提交处理
    isLoading,          // 加载状态
    error,              // 错误信息
    append,             // 追加消息（用于快捷按钮）
    reload,             // 重新生成
    stop,               // 停止生成
    setMessages,        // 手动设置消息
  } = useChat({
    api: '/api/ai/chat',
    body: {
      // 额外参数，会随请求发送
      sceneId,
      bookId,
    },
    onFinish: (message) => {
      // 消息完成回调
      console.log('Message finished:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // 快捷按钮点击
  const handleQuickAction = (prompt: string) => {
    append({ role: 'user', content: prompt });
  };

  return (
    <div className="ai-panel">
      {/* 场景快捷按钮 */}
      <QuickActions sceneId={sceneId} onAction={handleQuickAction} />

      {/* 消息列表 */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* 输入框 */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          发送
        </button>
        {isLoading && (
          <button type="button" onClick={stop}>
            停止
          </button>
        )}
      </form>
    </div>
  );
}
```

### 3.3 后端 - API Route

```typescript
// app/api/ai/chat/route.ts

import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getScene } from '@/server/ai/scenes';
import { buildContext } from '@/server/ai/context-builder';
import { toolDefinitions, executeTool } from '@/server/ai/tools';
import { getAiConfig } from '@/server/ai/config';
import { saveConversation, saveMessage } from '@/server/storage/conversation-store';

export async function POST(req: Request) {
  const { messages, sceneId, bookId, conversationId } = await req.json();

  // 1. 获取 AI 配置（支持自定义模型）
  const aiConfig = await getAiConfig();
  
  // 2. 创建 OpenAI 客户端（支持自定义 API 地址）
  const openai = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseUrl,  // 支持自定义 API 地址
  });

  // 3. 获取场景配置
  const scene = getScene(sceneId);

  // 4. 构建上下文
  const context = await buildContext(bookId, scene.contextType);

  // 5. 创建或获取会话
  let currentConversationId = conversationId;
  if (!currentConversationId) {
    currentConversationId = await saveConversation({
      bookId,
      sceneId,
    });
  }

  // 6. 保存用户消息
  await saveMessage({
    conversationId: currentConversationId,
    role: 'user',
    content: messages[messages.length - 1].content,
  });

  // 7. 调用 AI（支持自定义模型）
  const response = await openai.chat.completions.create({
    model: aiConfig.model,  // 从配置读取模型名称
    messages: [
      {
        role: 'system',
        content: scene.systemPrompt + '\n\n## 当前上下文\n' + context,
      },
      ...messages,
    ],
    tools: toolDefinitions,
    stream: true,
    temperature: aiConfig.temperature,
    max_tokens: aiConfig.maxTokens,
  });

  // 8. 处理流式响应和工具调用
  let assistantContent = '';
  const stream = OpenAIStream(response, {
    experimental_onToolCall: async (call, appendToolCallMessage) => {
      // 处理每个工具调用
      for (const toolCall of call.tools) {
        try {
          const result = await executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            { bookId, conversationId: currentConversationId }
          );

          // 将工具结果追加到消息
          appendToolCallMessage({
            tool_call_id: toolCall.id,
            result: JSON.stringify(result),
          });
        } catch (error) {
          appendToolCallMessage({
            tool_call_id: toolCall.id,
            result: JSON.stringify({ error: error.message }),
          });
        }
      }
    },
    onCompletion: async (completion) => {
      // 保存 AI 回复
      await saveMessage({
        conversationId: currentConversationId,
        role: 'assistant',
        content: completion,
      });
    },
  });

  // 9. 返回流式响应（包含 conversationId）
  return new StreamingTextResponse(stream, {
    headers: {
      'X-Conversation-Id': currentConversationId,
    },
  });
}
```

### 3.4 AI 配置管理

```typescript
// server/ai/config.ts

export interface AiConfig {
  provider: 'openai' | 'azure' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// 默认配置
const defaultConfig: AiConfig = {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY || '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 4096,
};

// 从数据库或环境变量获取配置
export async function getAiConfig(): Promise<AiConfig> {
  // 优先从数据库读取用户自定义配置
  const savedConfig = await getSavedAiConfig();
  if (savedConfig) {
    return { ...defaultConfig, ...savedConfig };
  }
  
  return defaultConfig;
}

// 保存用户自定义配置
export async function saveAiConfig(config: Partial<AiConfig>): Promise<void> {
  await saveToDatabase('ai_config', config);
}
```

### 3.5 前端 - AI 配置面板

```typescript
// components/AiConfigPanel.tsx

export function AiConfigPanel() {
  const [config, setConfig] = useState<AiConfig | null>(null);

  useEffect(() => {
    fetchAiConfig().then(setConfig);
  }, []);

  const handleSave = async (newConfig: Partial<AiConfig>) => {
    await saveAiConfig(newConfig);
    setConfig({ ...config, ...newConfig });
  };

  return (
    <div className="ai-config-panel">
      <h3>AI 模型配置</h3>
      
      <div className="config-item">
        <label>模型提供商</label>
        <select
          value={config?.provider}
          onChange={(e) => handleSave({ provider: e.target.value })}
        >
          <option value="openai">OpenAI</option>
          <option value="azure">Azure OpenAI</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div className="config-item">
        <label>API 地址</label>
        <input
          value={config?.baseUrl}
          onChange={(e) => handleSave({ baseUrl: e.target.value })}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="config-item">
        <label>API Key</label>
        <input
          type="password"
          value={config?.apiKey}
          onChange={(e) => handleSave({ apiKey: e.target.value })}
        />
      </div>

      <div className="config-item">
        <label>模型名称</label>
        <input
          value={config?.model}
          onChange={(e) => handleSave({ model: e.target.value })}
          placeholder="gpt-4"
        />
      </div>

      <div className="config-item">
        <label>Temperature</label>
        <input
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={config?.temperature}
          onChange={(e) => handleSave({ temperature: parseFloat(e.target.value) })}
        />
      </div>

      <div className="config-item">
        <label>Max Tokens</label>
        <input
          type="number"
          min="1"
          max="128000"
          value={config?.maxTokens}
          onChange={(e) => handleSave({ maxTokens: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
}
```

---

## 四、工具系统设计

### 4.1 工具定义（OpenAI Function Calling 格式）

```typescript
// server/ai/tools/definitions.ts

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'propose_update',
      description: '建议修改某个字段的内容。当判断需要修改时调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          target_type: {
            type: 'string',
            enum: ['outline', 'chapter', 'character'],
            description: '目标类型',
          },
          target_id: {
            type: 'string',
            description: '目标记录ID，通常为 "current" 表示当前编辑的内容',
          },
          field: {
            type: 'string',
            description: '要修改的字段名',
          },
          content: {
            type: 'string',
            description: '修改后的内容',
          },
          reason: {
            type: 'string',
            description: '修改原因，会展示给用户',
          },
        },
        required: ['target_type', 'field', 'content', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_suggestion',
      description: '添加一条优化建议。建议不会自动应用，需要用户确认。',
      parameters: {
        type: 'object',
        properties: {
          target_type: {
            type: 'string',
            enum: ['outline', 'chapter', 'character'],
            description: '目标类型',
          },
          suggestion: {
            type: 'string',
            description: '建议内容',
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: '建议优先级',
          },
        },
        required: ['target_type', 'suggestion'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'show_evaluation',
      description: '展示对当前内容的评估结果。',
      parameters: {
        type: 'object',
        properties: {
          score: {
            type: 'number',
            description: '评分 0-100',
          },
          summary: {
            type: 'string',
            description: '一句话总结',
          },
          highlights: {
            type: 'array',
            items: { type: 'string' },
            description: '亮点列表',
          },
          concerns: {
            type: 'array',
            items: { type: 'string' },
            description: '关注点列表',
          },
        },
        required: ['score', 'summary'],
      },
    },
  },
];
```

### 4.2 工具实现

```typescript
// server/ai/tools/handlers.ts

import { updateOutlineField } from '@/server/storage/outline-store';
import { savePendingAction } from '@/server/storage/pending-actions-store';

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: { bookId: string; conversationId?: string }
) {
  switch (toolName) {
    case 'propose_update':
      return handleProposeUpdate(args, context);
    
    case 'add_suggestion':
      return handleAddSuggestion(args, context);
    
    case 'show_evaluation':
      return handleShowEvaluation(args, context);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function handleProposeUpdate(
  args: {
    target_type: string;
    target_id: string;
    field: string;
    content: string;
    reason: string;
  },
  context: { bookId: string; conversationId?: string }
) {
  // 验证参数
  const validFields = ['direction', 'stages', 'sellingPoints'];
  if (!validFields.includes(args.field)) {
    return { success: false, error: `无效字段: ${args.field}` };
  }

  // 存储为待处理操作（不直接写入）
  if (context.conversationId) {
    await savePendingAction({
      conversationId: context.conversationId,
      actionType: 'propose_update',
      targetType: args.target_type,
      targetId: context.bookId,
      targetField: args.field,
      payload: { content: args.content },
      reason: args.reason,
    });
  }

  return {
    success: true,
    message: `已提出修改${args.field}的建议，等待用户确认`,
  };
}

async function handleAddSuggestion(
  args: {
    target_type: string;
    suggestion: string;
    priority?: string;
  },
  context: { bookId: string; conversationId?: string }
) {
  // 存储建议
  if (context.conversationId) {
    await savePendingAction({
      conversationId: context.conversationId,
      actionType: 'add_suggestion',
      targetType: args.target_type,
      targetId: context.bookId,
      payload: { suggestion: args.suggestion },
      reason: args.suggestion,
    });
  }

  return {
    success: true,
    message: '建议已添加',
  };
}

async function handleShowEvaluation(
  args: {
    score: number;
    summary: string;
    highlights?: string[];
    concerns?: string[];
  },
  context: { bookId: string }
) {
  // 评估结果直接返回，由前端渲染
  return {
    success: true,
    evaluation: {
      score: args.score,
      summary: args.summary,
      highlights: args.highlights || [],
      concerns: args.concerns || [],
    },
  };
}
```

### 4.3 工具调用渲染

```typescript
// components/ToolCallCard.tsx

interface ToolCallCardProps {
  toolCall: {
    function: {
      name: string;
      arguments: string;
    };
  };
  onAccept?: () => void;
  onReject?: () => void;
}

export function ToolCallCard({ toolCall, onAccept, onReject }: ToolCallCardProps) {
  const args = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case 'propose_update':
      return (
        <div className="tool-call-card propose-update">
          <h4>建议修改 {getFieldLabel(args.field)}</h4>
          <p className="reason">{args.reason}</p>
          <div className="preview">
            <DiffView original={getCurrentValue(args.field)} modified={args.content} />
          </div>
          <div className="actions">
            <button onClick={onAccept}>采纳</button>
            <button onClick={onReject}>拒绝</button>
          </div>
        </div>
      );

    case 'add_suggestion':
      return (
        <div className="tool-call-card suggestion">
          <h4>💡 建议</h4>
          <p>{args.suggestion}</p>
        </div>
      );

    case 'show_evaluation':
      return (
        <div className="tool-call-card evaluation">
          <h4>📊 评估结果</h4>
          <div className="score">评分: {args.score}/100</div>
          <p>{args.summary}</p>
          {args.highlights?.length > 0 && (
            <div className="highlights">
              <h5>亮点</h5>
              <ul>
                {args.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}
```

---

## 五、场景配置系统

### 5.1 场景配置接口

```typescript
// server/ai/scenes/types.ts

export interface SceneConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  contextType: string;  // outline, chapter, character

  // 快捷操作
  quickActions: QuickAction[];

  // 系统提示词
  systemPrompt: string;

  // 可用工具
  availableTools: string[];
}

export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}
```

### 5.2 场景注册表

```typescript
// server/ai/scenes/registry.ts

const sceneRegistry = new Map<string, SceneConfig>();

export function registerScene(scene: SceneConfig): void {
  sceneRegistry.set(scene.id, scene);
}

export function getScene(sceneId: string): SceneConfig {
  const scene = sceneRegistry.get(sceneId);
  if (!scene) throw new Error(`Scene ${sceneId} not found`);
  return scene;
}

export function getAllScenes(): SceneConfig[] {
  return Array.from(sceneRegistry.values());
}
```

### 5.3 总纲优化场景

```typescript
// server/ai/scenes/outline-scene.ts

export const outlineScene: SceneConfig = {
  id: 'outline_optimize',
  name: '总纲优化',
  description: '优化故事总纲的方向、阶段划分和核心卖点',
  icon: '📋',
  contextType: 'outline',

  quickActions: [
    {
      id: 'full_optimize',
      name: '全面优化',
      description: 'AI分析并优化总纲的所有方面',
      icon: '✨',
      prompt: '请全面分析并优化这个总纲',
    },
    {
      id: 'consistency_check',
      name: '一致性检查',
      description: '检查总纲各部分是否逻辑一致',
      icon: '🔍',
      prompt: '请检查总纲各部分的逻辑一致性',
    },
    {
      id: 'suggest_only',
      name: '给出建议',
      description: '只给出优化建议，不直接修改',
      icon: '💡',
      prompt: '请给出总纲的优化建议，不需要直接修改',
    },
  ],

  availableTools: ['propose_update', 'add_suggestion', 'show_evaluation'],

  systemPrompt: `你是一位资深网络小说策划编辑。

## 工作方式

1. 先阅读和理解当前总纲内容
2. 评估总纲的质量
3. 根据评估结果决定：
   - 如果有明显问题 → 调用 propose_update 建议修改
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

// 注册场景
registerScene(outlineScene);
```

---

## 六、上下文构建

### 6.1 上下文构建器

```typescript
// server/ai/context-builder/index.ts

export async function buildContext(
  bookId: string,
  contextType: string
): Promise<string> {
  switch (contextType) {
    case 'outline':
      return buildOutlineContext(bookId);
    case 'chapter':
      return buildChapterContext(bookId);
    case 'character':
      return buildCharacterContext(bookId);
    default:
      return '';
  }
}

async function buildOutlineContext(bookId: string): Promise<string> {
  const book = await getBook(bookId);
  const outline = await getOutline(bookId);

  return `
## 书籍信息
书名：${book.title}
题材：${book.genre}
风格：${book.style}

## 当前总纲
整体方向：${outline.direction || '尚未填写'}
阶段划分：${outline.stages || '尚未填写'}
核心卖点：${outline.sellingPoints || '尚未填写'}
`.trim();
}
```

---

## 七、数据库设计

### 7.1 AI 配置表

```sql
CREATE TABLE ai_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'openai',  -- openai, azure, custom
  api_key TEXT,
  base_url TEXT DEFAULT 'https://api.openai.com/v1',
  model TEXT DEFAULT 'gpt-4',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 7.2 对话表

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  summary TEXT,                 -- 对话摘要（用于上下文压缩）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_book ON conversations(book_id);
CREATE INDEX idx_conversations_scene ON conversations(scene_id);
```

### 7.3 消息表

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- user, assistant, system, tool
  content TEXT NOT NULL,        -- 消息内容
  tool_calls TEXT,              -- JSON: 工具调用列表
  tool_call_id TEXT,            -- 工具调用ID（用于工具结果消息）
  token_count INTEGER,          -- 估算的 token 数
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### 7.4 待处理操作表

```sql
CREATE TABLE pending_actions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id TEXT,              -- 关联的消息ID
  action_type TEXT NOT NULL,    -- propose_update, add_suggestion, show_evaluation
  target_type TEXT NOT NULL,    -- outline, chapter, character
  target_id TEXT NOT NULL,      -- 目标记录ID
  target_field TEXT,            -- 目标字段名
  payload TEXT NOT NULL,        -- JSON 数据（包含具体内容）
  reason TEXT,                  -- AI 给出的原因
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_pending_actions_status ON pending_actions(status);
CREATE INDEX idx_pending_actions_target ON pending_actions(target_type, target_id);
CREATE INDEX idx_pending_actions_conversation ON pending_actions(conversation_id);
```

---

## 八、完整流程示例

### 8.1 用户点击"全面优化"

```
1. 用户点击"全面优化"按钮
   ↓
2. 前端调用 append({ role: 'user', content: '请全面分析并优化这个总纲' })
   ↓
3. useChat 自动发送 POST /api/ai/chat
   Body: { messages: [...], sceneId: 'outline_optimize', bookId: 'xxx' }
   ↓
4. 后端处理
   a. 获取场景配置
   b. 构建上下文（书籍信息、当前总纲）
   c. 调用 OpenAI（带工具定义）
   ↓
5. AI 响应（流式）
   a. 输出文字："我来分析一下这个总纲..."
   b. 调用 show_evaluation 工具
   c. 输出文字："整体方向需要更聚焦..."
   d. 调用 propose_update 工具
   ↓
6. 前端处理
   a. 实时显示文字
   b. 渲染工具调用卡片
   ↓
7. 用户看到
   - AI的分析文字
   - 评估结果卡片（评分85分）
   - 修改建议卡片（带采纳/拒绝按钮）
   ↓
8. 用户点击"采纳"
   ↓
9. 前端调用 API 执行写入
   POST /api/ai/pending-actions/:id/accept
   ↓
10. 后端执行 updateOutlineField()
```

---

## 九、实施路线图

### 阶段1：基础集成（1周）

- [ ] 安装 Vercel AI SDK
- [ ] 创建 API Route
- [ ] 前端集成 useChat
- [ ] 基础对话功能

### 阶段2：工具系统（1周）

- [ ] 定义工具（propose_update, add_suggestion, show_evaluation）
- [ ] 实现工具处理器
- [ ] 工具调用渲染组件

### 阶段3：场景系统（1周）

- [ ] 场景配置接口
- [ ] 场景注册表
- [ ] 总纲优化场景
- [ ] 快捷按钮

### 阶段4：优化完善（持续）

- [ ] 更多场景（章纲、人物）
- [ ] 对话历史持久化
- [ ] UI优化

---

## 十、关键优势

### 对比自己实现

| 功能 | 自己实现 | Vercel AI SDK |
|------|---------|---------------|
| 对话管理 | 需要自己写 | useChat 自动处理 |
| 流式输出 | 需要处理SSE | 自动处理 |
| 工具调用 | 需要自己解析 | 自动处理 |
| Loading状态 | 需要自己管理 | isLoading 自动管理 |
| 错误处理 | 需要自己写 | error 自动捕获 |
| 消息存储 | 需要自己实现 | 可选集成 |

### 我们只需关注

1. **场景配置** - 提示词和快捷按钮
2. **工具定义** - 业务逻辑接口
3. **工具实现** - 数据库读写
4. **UI组件** - 渲染工具调用结果

---

## 十一、设计决策记录

### 已确认决策

| 问题 | 决策 | 说明 |
|------|------|------|
| **模型选择** | 支持自定义 | 通过 ai_config 表配置，支持 OpenAI / Azure / 自定义 API |
| **对话持久化** | 存储在数据库 | 使用 conversations + messages 表 |
| **工具调用方式** | 存入 pending_actions | 工具调用结果存入数据库，用户确认后才写入目标表 |
| **成本控制** | 暂不考虑 | 后续可扩展 token 统计和成本监控 |

### 待解决问题

1. **上下文窗口管理**：当对话历史过长时，如何压缩或截断？
   - 方案A：摘要压缩（调用 AI 生成摘要）
   - 方案B：滑动窗口（只保留最近 N 条消息）
   - 方案C：重要性筛选（保留关键消息）

2. **对话历史清理**：是否需要定期清理旧的对话历史？

---

## 十二、实际场景问题解决方案

### 12.1 浏览器刷新恢复

**问题**：用户刷新页面后，对话状态丢失

**解决方案**：URL参数 + 本地存储双重保障

```typescript
// hooks/useConversation.ts

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'ai_conversations';

// 获取本地存储的场景对话映射
function getSceneConversations(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

// 保存场景对话映射
function saveSceneConversations(mapping: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
}

export function useConversation(sceneId: string, bookId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    // 1. 优先从 URL 参数获取
    const urlConversationId = searchParams.get('conversationId');
    if (urlConversationId) {
      setConversationId(urlConversationId);
      // 同步到本地存储
      const mapping = getSceneConversations();
      mapping[sceneId] = urlConversationId;
      saveSceneConversations(mapping);
      return;
    }

    // 2. 其次从本地存储获取
    const mapping = getSceneConversations();
    if (mapping[sceneId]) {
      setConversationId(mapping[sceneId]);
      // 同步到 URL
      router.replace(`?conversationId=${mapping[sceneId]}`, { scroll: false });
      return;
    }

    // 3. 都没有，等待创建新对话
    setConversationId(null);
  }, [sceneId, searchParams, router]);

  // 创建新对话时调用
  const handleConversationCreated = (newConversationId: string) => {
    setConversationId(newConversationId);
    
    // 保存到本地存储
    const mapping = getSceneConversations();
    mapping[sceneId] = newConversationId;
    saveSceneConversations(mapping);
    
    // 更新 URL
    router.replace(`?conversationId=${newConversationId}`, { scroll: false });
  };

  return { conversationId, handleConversationCreated };
}
```

### 12.2 场景切换并发控制

**问题**：用户在多个场景间切换，每个场景需要独立的对话

**解决方案**：每个场景独立维护 conversationId

```typescript
// 场景对话管理器

interface SceneConversationManager {
  // 场景 → 对话ID 映射
  conversations: Record<string, string>;
  
  // 获取指定场景的对话ID
  getConversationId(sceneId: string): string | null;
  
  // 设置指定场景的对话ID
  setConversationId(sceneId: string, conversationId: string): void;
  
  // 清除指定场景的对话
  clearConversation(sceneId: string): void;
}

// 实现
class LocalSceneConversationManager implements SceneConversationManager {
  private storageKey = 'ai_scene_conversations';
  
  get conversations(): Record<string, string> {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }
  
  getConversationId(sceneId: string): string | null {
    return this.conversations[sceneId] || null;
  }
  
  setConversationId(sceneId: string, conversationId: string): void {
    const mapping = this.conversations;
    mapping[sceneId] = conversationId;
    localStorage.setItem(this.storageKey, JSON.stringify(mapping));
  }
  
  clearConversation(sceneId: string): void {
    const mapping = this.conversations;
    delete mapping[sceneId];
    localStorage.setItem(this.storageKey, JSON.stringify(mapping));
  }
}

export const sceneConversationManager = new LocalSceneConversationManager();
```

**使用示例**：

```typescript
// 在 AiPanel 组件中
function AiPanel({ sceneId, bookId }: AiPanelProps) {
  const { conversationId, handleConversationCreated } = useConversation(sceneId, bookId);

  const { messages, append, isLoading } = useChat({
    api: '/api/ai/chat',
    body: {
      sceneId,
      bookId,
      conversationId,  // 传递当前场景的对话ID
    },
    onFinish: (message) => {
      // 如果是新对话，后端会返回新的 conversationId
      // 从响应头获取
      const newConversationId = message.annotations?.conversationId;
      if (newConversationId && !conversationId) {
        handleConversationCreated(newConversationId);
      }
    },
  });

  return (
    <div>
      {/* 对话界面 */}
      <MessageList messages={messages} />
      <InputBox onSubmit={append} isLoading={isLoading} />
    </div>
  );
}
```

### 12.3 工具调用失败处理

**问题**：工具执行失败时如何反馈给用户

**解决方案**：三层错误处理机制

```typescript
// server/ai/tools/handlers.ts

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: { bookId: string; conversationId?: string }
): Promise<ToolResult> {
  try {
    // 1. 参数验证
    const validation = validateToolArgs(toolName, args);
    if (!validation.valid) {
      return {
        success: false,
        error: `参数错误: ${validation.error}`,
        errorType: 'validation',
        retryable: false,
      };
    }

    // 2. 执行工具
    const result = await executeToolHandler(toolName, args, context);
    return result;

  } catch (error) {
    // 3. 异常处理
    console.error(`Tool execution failed: ${toolName}`, error);

    // 判断错误类型
    if (error.code === 'SQLITE_CONSTRAINT') {
      return {
        success: false,
        error: '数据冲突，请刷新后重试',
        errorType: 'conflict',
        retryable: true,
      };
    }

    if (error.code === 'NETWORK_ERROR') {
      return {
        success: false,
        error: '网络错误，请检查网络连接',
        errorType: 'network',
        retryable: true,
      };
    }

    return {
      success: false,
        error: `执行失败: ${error.message}`,
        errorType: 'unknown',
        retryable: false,
    };
  }
}

// 工具结果类型
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  errorType?: 'validation' | 'conflict' | 'network' | 'unknown';
  retryable?: boolean;
}
```

**前端错误展示**：

```typescript
// components/ToolCallCard.tsx

export function ToolCallCard({ toolCall, result, onRetry }: ToolCallCardProps) {
  if (!result.success) {
    return (
      <div className="tool-call-card error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{result.error}</div>
        {result.retryable && (
          <button onClick={onRetry} className="retry-button">
            重试
          </button>
        )}
      </div>
    );
  }

  // 正常渲染...
}
```

**AI 自动重试机制**：

```typescript
// 在 API Route 中
const stream = OpenAIStream(response, {
  experimental_onToolCall: async (call, appendToolCallMessage) => {
    for (const toolCall of call.tools) {
      const result = await executeTool(toolCall.function.name, args, context);

      if (!result.success && result.retryable) {
        // 告知 AI 工具执行失败，AI 可以决定是否重试
        appendToolCallMessage({
          tool_call_id: toolCall.id,
          result: JSON.stringify({
            error: result.error,
            hint: '你可以重试这个操作，或者给用户说明情况',
          }),
        });
      } else {
        appendToolCallMessage({
          tool_call_id: toolCall.id,
          result: JSON.stringify(result),
        });
      }
    }
  },
});
```

### 12.4 历史对话管理

**用户体验设计**：

```
┌─────────────────────────────────────────────────────────────┐
│                      AI 面板                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  当前对话                          [历史记录 ▼]       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  消息列表...                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  输入框                                    [发送]     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    历史对话抽屉                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📅 2024-01-15  总纲优化                              │   │
│  │  "请全面分析并优化这个总纲"                            │   │
│  │  [继续对话]  [删除]                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  📅 2024-01-14  章纲优化                              │   │
│  │  "第三章的节奏有点慢"                                 │   │
│  │  [继续对话]  [删除]                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**API 设计**：

```typescript
// 获取对话列表
GET /api/ai/conversations?bookId=xxx&sceneId=outline
Response: {
  conversations: [
    {
      id: 'conv-123',
      sceneId: 'outline',
      summary: '总纲优化：调整了阶段划分...',
      messageCount: 12,
      lastMessageAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:00:00Z',
    },
    // ...
  ]
}

// 获取对话详情
GET /api/ai/conversations/:id
Response: {
  id: 'conv-123',
  sceneId: 'outline',
  messages: [
    { role: 'user', content: '请优化总纲', timestamp: '...' },
    { role: 'assistant', content: '...', toolCalls: [...] },
    // ...
  ],
  pendingActions: [
    { id: 'action-1', status: 'pending', ... },
  ]
}

// 删除对话
DELETE /api/ai/conversations/:id
Response: { success: true }
```

**前端组件**：

```typescript
// components/ConversationHistory.tsx

export function ConversationHistory({ 
  bookId, 
  sceneId, 
  onSelect,
  currentConversationId 
}: ConversationHistoryProps) {
  const { conversations, isLoading, mutate } = useSWR(
    `/api/ai/conversations?bookId=${bookId}&sceneId=${sceneId}`,
    fetcher
  );

  const handleDelete = async (conversationId: string) => {
    if (!confirm('确定删除这个对话吗？')) return;
    
    await fetch(`/api/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    
    mutate(); // 刷新列表
  };

  const handleContinue = (conversationId: string) => {
    onSelect(conversationId);
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="conversation-history">
      <h3>历史对话</h3>
      
      {conversations?.length === 0 ? (
        <div className="empty">暂无历史对话</div>
      ) : (
        <div className="conversation-list">
          {conversations?.map((conv) => (
            <div 
              key={conv.id} 
              className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
            >
              <div className="conversation-date">
                {new Date(conv.createdAt).toLocaleDateString()}
              </div>
              <div className="conversation-summary">
                {conv.summary || '新对话'}
              </div>
              <div className="conversation-meta">
                {conv.messageCount} 条消息
              </div>
              <div className="conversation-actions">
                <button onClick={() => handleContinue(conv.id)}>
                  继续对话
                </button>
                <button onClick={() => handleDelete(conv.id)} className="delete">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 12.5 上下文窗口管理

**问题**：对话历史过长，超出模型上下文限制

**解决方案**：自动摘要压缩

```typescript
// server/ai/context-manager.ts

interface ContextWindowConfig {
  maxMessages: number;        // 最大消息数
  maxTokens: number;          // 最大 token 数
  summaryTriggerCount: number; // 触发摘要的消息数
}

const defaultConfig: ContextWindowConfig = {
  maxMessages: 50,
  maxTokens: 8000,
  summaryTriggerCount: 40,
};

export async function manageContextWindow(
  messages: Message[],
  config: ContextWindowConfig = defaultConfig
): Promise<Message[]> {
  // 1. 如果消息数未超限，直接返回
  if (messages.length <= config.maxMessages) {
    return messages;
  }

  // 2. 找到需要压缩的消息范围
  const messagesToSummarize = messages.slice(0, -20); // 保留最近20条
  const recentMessages = messages.slice(-20);

  // 3. 生成摘要
  const summary = await generateSummary(messagesToSummarize);

  // 4. 返回摘要 + 最近消息
  return [
    {
      role: 'system',
      content: `以下是之前的对话摘要：\n${summary}`,
    },
    ...recentMessages,
  ];
}

// 生成对话摘要
async function generateSummary(messages: Message[]): Promise<string> {
  const openai = new OpenAI();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // 使用便宜的模型生成摘要
    messages: [
      {
        role: 'system',
        content: '请将以下对话总结为简洁的摘要，保留关键信息和决策。',
      },
      {
        role: 'user',
        content: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0].message.content || '';
}
```

**使用示例**：

```typescript
// 在 API Route 中
export async function POST(req: Request) {
  const { messages, sceneId, bookId, conversationId } = await req.json();

  // 1. 从数据库加载历史消息
  const historyMessages = conversationId 
    ? await getMessages(conversationId) 
    : [];

  // 2. 合并历史消息和新消息
  const allMessages = [...historyMessages, ...messages];

  // 3. 管理上下文窗口
  const contextMessages = await manageContextWindow(allMessages);

  // 4. 调用 AI
  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    messages: [
      { role: 'system', content: scene.systemPrompt },
      ...contextMessages,
    ],
    tools: toolDefinitions,
    stream: true,
  });

  // ...
}
```

---

## 十三、完整状态管理流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        页面加载                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  读取 URL 参数 ?conversationId=xxx                               │
│  读取本地存储 sceneConversations[sceneId]                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  conversationId 存在？│
                    └─────────────────────┘
                      │              │
                     是             否
                      │              │
                      ▼              ▼
            ┌─────────────┐  ┌─────────────┐
            │ 加载历史对话  │  │ 显示空对话   │
            │ 从数据库获取  │  │ 等待用户输入 │
            └─────────────┘  └─────────────┘
                      │              │
                      └──────┬───────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        用户交互                                   │
│  • 发送消息                                                      │
│  • 点击快捷按钮                                                  │
│  • 切换场景                                                      │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │     操作类型？        │
                    └─────────────────────┘
                      │        │        │
                   发送消息  切换场景  刷新页面
                      │        │        │
                      ▼        ▼        ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ 调用 API │ │ 保存当前 │ │ 重新加载 │
              │ 获取响应  │ │ 加载新  │ │ 从存储恢复│
              └─────────┘ └─────────┘ └─────────┘
```
