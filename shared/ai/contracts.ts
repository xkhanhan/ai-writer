export type AiTextTaskInput = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  model?: string;
};

export type AiTextTaskSuccessResponse = {
  success: true;
  content: string;
};

export type AiTextTaskErrorResponse = {
  success: false;
  error: string;
};

export type AiTextTaskResponse =
  | AiTextTaskSuccessResponse
  | AiTextTaskErrorResponse;

export const defaultAiSystemPrompt =
  "You are a writing assistant. Complete only the current prompt and do not claim to maintain project state.";
