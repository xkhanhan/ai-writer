/**
 * ContextBuilder — multi-stage prompt assembly pipeline for AI features.
 *
 * Stages:
 *   1. Data Collection   — load raw data from DB stores
 *   2. Data Processing   — filter, sort, derive display strings
 *   3. Knowledge Injection — (placeholder for examples / writing guides)
 *   4. Template Rendering — $variable replacement in prompt templates
 *   5. Final Assembly     — system prompt + user prompt + token estimate
 */

import type { ContextInput, BuiltContext, AiFunctionKey } from "./types";
import { buildContentGenerationContext } from "./builders/content-generate";
import { buildReviewContext } from "./builders/deslop";
import { buildTextProcessingContext } from "./builders/polish";
import { buildBookInfoSuggestContext } from "./builders/fact-extract";
import { buildFactConsistencyContext } from "./builders/foreshadow-extract";
import { buildCharacterAuditContext } from "./builders/character-extract";
import { buildWorldRuleSuggestContext } from "./builders/world-rule-suggest";

export type { AiFunctionKey, ContextInput, BuiltContext } from "./types";

/**
 * Build the full AI context (system + user prompt) for a given function key.
 *
 * Routes to the appropriate builder based on `input.functionKey`:
 * - `content_generate`   → chapter generation with full world/character context
 * - `review_extract`     → structured data extraction from chapter content
 * - `polish` / `deslop` / `expand` → text processing with writing rules
 * - `character_audit`    → character consistency check
 * - `fact_consistency`   → cross-reference all facts for contradictions
 * - `book_synopsis_expand` → reuses text processing pipeline
 * - `book_info_suggest`  → book info suggestions based on user concept
 * - `world_rule_suggest` → world rule suggestions based on book info
 */
export async function buildContext(
  input: ContextInput,
): Promise<BuiltContext> {
  switch (input.functionKey) {
    case "content_generate":
      return buildContentGenerationContext(input);

    case "review_extract":
      return buildReviewContext(input);

    case "polish":
    case "deslop":
    case "expand":
    case "book_synopsis_expand":
      return buildTextProcessingContext(input);

    case "character_audit":
      return buildCharacterAuditContext(input);

    case "fact_consistency":
      return buildFactConsistencyContext(input);

    case "book_info_suggest":
      return buildBookInfoSuggestContext(input);

    case "world_rule_suggest":
      return buildWorldRuleSuggestContext(input);

    default:
      throw new Error(
        `不支持的 AI 功能：${input.functionKey satisfies never}`,
      );
  }
}
