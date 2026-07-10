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

import type { ContextInput, BuiltContext, StoreDeps } from "./types";
import { getBookById } from "@/server/storage/book-store";
import { getChapterById, getChaptersByVolumeId, getVolumesByBookId } from "@/server/storage/outline-store";
import { getWorldRulesByBookId } from "@/server/storage/world-rule-store";
import { getSettingEntitiesByBookId } from "@/server/storage/setting-entity-store";
import { getStoryFactsByBookId } from "@/server/storage/fact-store";
import { getActivePromptTemplate } from "@/server/storage/prompt-template-store";
import { buildContentGenerationContext } from "./builders/content-generate";
import { buildReviewContext } from "./builders/deslop";
import { buildTextProcessingContext } from "./builders/polish";
import { buildBookInfoSuggestContext } from "./builders/fact-extract";
import { buildFactConsistencyContext } from "./builders/foreshadow-extract";
import { buildCharacterAuditContext } from "./builders/character-extract";
import { buildWorldRuleSuggestContext } from "./builders/world-rule-suggest";

export type { AiFunctionKey, ContextInput, BuiltContext, StoreDeps } from "./types";

/** Default store dependencies wired to real DB stores. */
export const defaultStoreDeps: StoreDeps = {
  getBookById,
  getChapterById,
  getChaptersByVolumeId,
  getVolumesByBookId,
  getWorldRulesByBookId,
  getSettingEntitiesByBookId,
  getStoryFactsByBookId,
  getActivePromptTemplate,
};

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
  deps: StoreDeps = defaultStoreDeps,
): Promise<BuiltContext> {
  switch (input.functionKey) {
    case "content_generate":
      return buildContentGenerationContext(input, deps);

    case "review_extract":
      return buildReviewContext(input, deps);

    case "polish":
    case "deslop":
    case "expand":
    case "book_synopsis_expand":
      return buildTextProcessingContext(input, deps);

    case "character_audit":
      return buildCharacterAuditContext(input, deps);

    case "fact_consistency":
      return buildFactConsistencyContext(input, deps);

    case "book_info_suggest":
      return buildBookInfoSuggestContext(input, deps);

    case "world_rule_suggest":
      return buildWorldRuleSuggestContext(input, deps);

    default:
      throw new Error(
        `不支持的 AI 功能：${input.functionKey satisfies never}`,
      );
  }
}
