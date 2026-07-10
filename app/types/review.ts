/**
 * Shared types for AI review result panel.
 * Used by review-result-panel and content-editor's confirm handler.
 */

export interface ReviewFact {
  content: string;
  chapterNumber: number;
  relatedCharacters: string[];
}

export interface ReviewForeshadowChange {
  action: "plant" | "resolve";
  name: string;
  description: string;
}

export interface ReviewCharacterState {
  name: string;
  changes: {
    location?: string;
    knownInfo?: string[];
    relationship?: string;
  };
}

export interface ReviewItemState {
  name: string;
  changes: {
    status: string;
  };
}

export interface ReviewExtractedData {
  facts: ReviewFact[];
  foreshadowChanges: ReviewForeshadowChange[];
  characterStates: ReviewCharacterState[];
  itemStates: ReviewItemState[];
}

export interface ReviewMetadata {
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
}

export interface ReviewDebugContext {
  systemPrompt: string;
  userPrompt: string;
}

export interface ReviewConfirmData {
  facts: ReviewFact[];
  foreshadowChanges: ReviewForeshadowChange[];
  characterStates: ReviewCharacterState[];
  itemStates: ReviewItemState[];
}
