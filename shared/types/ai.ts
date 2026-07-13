// AI config and generation session types

export interface AiConfig {
  providerId: string;
  hasApiKey: boolean;
  baseUrl: string;
  model: string;
  contextSize: number;
  temperature: number;
  advancedConfig: Record<string, unknown>;
}

export interface SaveAiConfigDTO {
  providerId?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  contextSize?: number;
  temperature?: number;
  advancedConfig?: Record<string, unknown>;
}

export interface AiGenerationSession {
  id: string;
  bookId: string;
  functionKey: string;
  chapterId: string | null;
  promptTemplateId: string | null;
  inputContext: string;
  userInput: string;
  rawOutput: string;
  adopted: boolean;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  createdAt: string;
}

export interface CreateGenerationSessionDTO {
  bookId: string;
  functionKey: string;
  chapterId?: string;
  promptTemplateId?: string;
  inputContext?: string;
  userInput?: string;
  model?: string;
  rawOutput?: string;
  latencyMs?: number;
}
