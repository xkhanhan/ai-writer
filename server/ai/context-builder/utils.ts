import type { SettingEntity, StoryFact, WorldRule } from "@/shared/types";

/**
 * Rough token estimation.
 * CJK characters ~ 1 token per 3 chars; Latin/other ~ 1 token per 4 chars.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cjkCount = 0;
  let otherCount = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK Unified Ideographs + Extensions + Compatibility Ideographs
    if (code >= 0x4e00 && code <= 0x9fff) {
      cjkCount++;
    } else if (code >= 0x3400 && code <= 0x4dbf) {
      cjkCount++;
    } else if (code >= 0xf900 && code <= 0xfaff) {
      cjkCount++;
    } else if (code >= 0x20000 && code <= 0x2fa1f) {
      cjkCount++;
    } else {
      otherCount++;
    }
  }

  return Math.ceil(cjkCount / 3 + otherCount / 4);
}

/**
 * Replace $variable placeholders with values from the map.
 * Array values are joined with newlines for readability.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\$\{?(\w+)\}?/g, (_match, name: string) => {
    if (name in variables) {
      return variables[name];
    }
    // Leave unrecognized placeholders as-is
    return _match;
  });
}

/** Format a rules array into a numbered list string. */
export function formatRules(rules: WorldRule[]): string {
  if (rules.length === 0) return "（无）";
  return rules.map((r, i) => `${i + 1}. [${r.name}] ${r.content}`).join("\n");
}

/** Format setting entities (characters) into readable profiles. */
export function formatCharacterProfiles(entities: SettingEntity[]): string {
  if (entities.length === 0) return "（无角色设定）";
  return entities
    .map((e) => {
      const parts: string[] = [`### ${e.name}（${e.level}）`];
      if (e.description) parts.push(`描述：${e.description}`);
      if (e.appearance) parts.push(`外貌：${e.appearance}`);
      if (e.traits) parts.push(`性格：${e.traits}`);
      if (e.background) parts.push(`背景：${e.background}`);
      if (e.abilities) parts.push(`能力：${e.abilities}`);
      if (e.weaknesses) parts.push(`弱点：${e.weaknesses}`);
      const cfEntries = Object.entries(e.categoryFields);
      if (cfEntries.length > 0) {
        for (const [k, v] of cfEntries) {
          if (v) parts.push(`${k}：${v}`);
        }
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

/** Format facts into a readable list. */
export function formatFacts(facts: StoryFact[]): string {
  if (facts.length === 0) return "（无事实记录）";
  return facts
    .map((f) => `第${f.chapterNumber}章：${f.content}`)
    .join("\n");
}

/** Format a simple fact list for the character audit view. */
export function formatFactList(facts: StoryFact[]): string {
  if (facts.length === 0) return "（无相关事实记录）";
  return facts.map((f) => `- 第${f.chapterNumber}章：${f.content}`).join("\n");
}

/** Format setting entities for the fact consistency cross-reference. */
export function formatCharacterSettings(entities: SettingEntity[]): string {
  if (entities.length === 0) return "（无角色设定）";
  return entities
    .map((e) => {
      const parts: string[] = [`### ${e.name}`];
      if (e.description) parts.push(`描述：${e.description}`);
      if (e.traits) parts.push(`性格：${e.traits}`);
      if (e.abilities) parts.push(`能力：${e.abilities}`);
      if (e.weaknesses) parts.push(`弱点：${e.weaknesses}`);
      return parts.join("\n");
    })
    .join("\n\n");
}
