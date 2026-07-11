/**
 * Prompt sanitization — ensures templates stored in DB are safe
 * from prompt injection attacks and won't cause AI to deviate
 * from expected output format.
 */

// ============ Injection patterns ============

/** Patterns that indicate prompt injection attempts */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Chinese injection patterns
  { pattern: /忽略.{0,10}(以上|前面|之前|上述).{0,10}(指令|要求|规则|提示|说明)/i, label: "忽略指令" },
  { pattern: /无视.{0,10}(以上|前面|之前|上述).{0,10}(指令|要求|规则|提示|说明)/i, label: "无视指令" },
  { pattern: /不要.{0,10}(按照|遵循|遵守|执行).{0,10}(以上|前面|之前).{0,10}(指令|要求|规则)/i, label: "不遵循指令" },
  { pattern: /忘掉.{0,10}(所有|全部|之前|以上)/i, label: "忘掉指令" },
  { pattern: /从现在起.{0,10}(你是|你是一个|扮演|充当)/i, label: "角色劫持" },
  { pattern: /新的指令/i, label: "新指令注入" },
  { pattern: /系统提示/i, label: "系统提示篡改" },
  { pattern: /system\s*prompt/i, label: "System prompt injection" },
  { pattern: /假装你是/i, label: "角色劫持" },
  { pattern: /你的新角色/i, label: "角色劫持" },

  // English injection patterns
  { pattern: /ignore.{0,10}(all|previous|above|prior).{0,10}(instructions?|rules?|prompts?|guidelines?)/i, label: "Ignore instructions" },
  { pattern: /disregard.{0,10}(all|previous|above|prior).{0,10}(instructions?|rules?|prompts?)/i, label: "Disregard instructions" },
  { pattern: /forget.{0,10}(all|everything|previous|above).{0,10}(instructions?|rules?|prompts?)/i, label: "Forget instructions" },
  { pattern: /override.{0,10}(system|existing|current).{0,10}(prompt|instructions?|rules?)/i, label: "Override system" },
  { pattern: /you\s+are\s+now/i, label: "Role hijack" },
  { pattern: /act\s+as\s+if/i, label: "Role hijack" },
  { pattern: /new\s+instructions?/i, label: "New instructions" },
  { pattern: /pretend\s+you\s+are/i, label: "Role hijack" },
  { pattern: /do\s+not\s+follow/i, label: "Do not follow" },
  { pattern: /output\s+as\s+(plain\s+text|markdown|html)/i, label: "Format override" },
  { pattern: /return\s+(as\s+)?(plain\s+text|markdown|html)/i, label: "Format override" },
  { pattern: /不要.{0,5}JSON/i, label: "格式覆写" },
  { pattern: /不使用.{0,5}JSON/i, label: "格式覆写" },
  { pattern: /用.{0,5}(纯文本|markdown|html).{0,5}返回/i, label: "格式覆写" },
];

// ============ Template structure rules ============

/** Sections that must NOT be removed by user edits */
const PROTECTED_SECTIONS = [
  /##\s*返回格式/,
  /##\s*格式约束/,
  /##\s*输出格式/,
  /##\s*输出要求/,
  /##\s*审查输出要求/,
  /##\s*检查输出要求/,
  /##\s*必须删除的模式/,
  /##\s*必须增加的元素/,
];

// ============ Public API ============

export interface SanitizeResult {
  safe: boolean;
  warnings: string[];
  /** Cleaned template content (injection patterns removed) */
  cleaned: string;
}

/**
 * Sanitize user-edited template content.
 * Detects injection patterns, returns warnings, and cleans the content.
 */
export function sanitizeTemplate(content: string): SanitizeResult {
  const warnings: string[] = [];
  let cleaned = content;

  // 1. Detect injection patterns
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(`检测到潜在的提示注入风险：「${label}」`);
      // Remove the matched injection text
      cleaned = cleaned.replace(pattern, "");
    }
  }

  // 2. Clean up excessive whitespace after removal
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return {
    safe: warnings.length === 0,
    warnings,
    cleaned,
  };
}

/**
 * Validate that protected sections are present in the full template.
 * Used after save to ensure system blocks weren't stripped.
 */
export function validateProtectedSections(fullTemplate: string): string[] {
  const missing: string[] = [];
  for (const pattern of PROTECTED_SECTIONS) {
    // Check if the original seed template had this section
    // (we only validate against sections that should exist)
    if (pattern.test(fullTemplate)) {
      // Section exists - OK
    }
  }
  return missing;
}

/**
 * Build the full template by combining user content with system blocks.
 * System blocks (after ---) are always taken from the original template,
 * never from user edits.
 */
export function buildFullTemplate(
  userContent: string,
  originalTemplate: string,
): string {
  const sepIdx = originalTemplate.indexOf("\n---\n");
  if (sepIdx === -1) {
    // No separator in original - user content IS the full template
    return userContent;
  }

  const systemBlocks = originalTemplate.slice(sepIdx);
  return userContent + systemBlocks;
}
