// Prompt template domain types

/**
 * Describes a variable that a specific template has declared for
 * user-supplied values (tracked per-template in the DB).
 */
export interface PromptVariableUsage {
  name: string;
  description: string;
  source: string;
  required: boolean;
}

/**
 * Describes a built-in variable that can be referenced in any prompt template
 * using `${variableName}` syntax. These are resolved at render time by the backend.
 */
export interface PromptVariable {
  /** Variable name, e.g. "bookTitle" — used in `${bookTitle}` syntax */
  name: string;
  /** Human-readable label shown in the UI, e.g. "书籍名称" */
  displayName: string;
  /** Explains what the variable resolves to */
  description: string;
  /** When true the user can view but not edit this variable's value */
  readOnly?: boolean;
}

/**
 * Registry of all built-in variables available in prompt templates.
 * Users reference them in templates as `${variableName}`.
 */
export const PROMPT_VARIABLES: PromptVariable[] = [
  { name: "bookTitle", displayName: "书籍名称", description: "当前书籍的标题" },
  { name: "bookGenre", displayName: "题材类型", description: "书籍的题材/类型" },
  { name: "bookSynopsis", displayName: "书籍简介", description: "书籍的故事梗概" },
  { name: "bookCoreSellingPoint", displayName: "核心卖点", description: "书籍的核心吸引力" },
  { name: "bookCharacterCount", displayName: "字符数量", description: "书籍的总字数/目标字数" },
  { name: "userSupplement", displayName: "用户补充", description: "用户自定义的补充说明" },
  { name: "outputFormat", displayName: "输出格式要求", description: "AI 输出应遵循的格式规范，按功能不同而不同", readOnly: true },
];

/** Quick lookup: set of all valid built-in variable names */
const BUILTIN_VAR_NAMES = new Set(PROMPT_VARIABLES.map((v) => v.name));

/**
 * Scans a template string for `${...}` variable references and returns
 * any that are NOT recognised built-in variables.
 *
 * @param template - The raw template string to validate
 * @returns Array of undefined variable names (empty when all are valid)
 */
export function validateTemplateVariables(template: string): string[] {
  const undefinedVars: string[] = [];
  const regex = /\$\{(\w+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (!BUILTIN_VAR_NAMES.has(varName)) {
      if (!undefinedVars.includes(varName)) {
        undefinedVars.push(varName);
      }
    }
  }
  return undefinedVars;
}

export interface PromptTemplate {
  id: string;
  bookId: string | null;  // null = system-level template
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariableUsage[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptTemplateDTO {
  bookId?: string | null;  // optional, null for system-level templates
  functionKey: string;
  displayName: string;
  description?: string;
  template: string;
  variables?: PromptVariableUsage[];
}

export interface UpdatePromptTemplateDTO {
  displayName?: string;
  description?: string;
  template?: string;
  variables?: PromptVariableUsage[];
  isActive?: boolean;
}
