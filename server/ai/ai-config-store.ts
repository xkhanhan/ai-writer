import fs from "node:fs";
import path from "node:path";
import {
  type AiAdvancedConfig,
  type PublicAiConfig,
  type SaveAiConfigInput,
  AI_CONFIG_DEFAULTS,
  sanitizeAdvancedConfig,
} from "@/shared/ai/config-contracts";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "ai-config.json");

export type AiConfigRecord = {
  providerId: string;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  contextSize: number;
  temperature: number;
  advanced: AiAdvancedConfig;
  updatedAt: string;
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readConfig(): AiConfigRecord | null {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as AiConfigRecord;
  } catch {
    return null;
  }
}

function writeConfig(record: AiConfigRecord): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(record, null, 2), "utf-8");
}

export function loadPublicAiConfig(): PublicAiConfig {
  const record = readConfig();
  const defaults = AI_CONFIG_DEFAULTS;

  if (!record) {
    return {
      providerId: "openai",
      hasApiKey: false,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      contextSize: defaults.contextSize,
      temperature: defaults.temperature,
      advancedConfig: defaults,
    };
  }

  const safeAdvanced = sanitizeAdvancedConfig(record.advanced ?? {});

  return {
    providerId: record.providerId ?? "openai",
    hasApiKey: Boolean(record.apiKey),
    baseUrl: record.baseUrl ?? safeAdvanced.baseUrl,
    model: record.model ?? safeAdvanced.model,
    contextSize: record.contextSize ?? safeAdvanced.contextSize,
    temperature: record.temperature ?? safeAdvanced.temperature,
    advancedConfig: safeAdvanced,
  };
}

export function loadInternalConfig(): AiConfigRecord {
  const record = readConfig();
  const defaults = AI_CONFIG_DEFAULTS;

  if (!record) {
    return {
      providerId: "openai",
      apiKey: null,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      contextSize: defaults.contextSize,
      temperature: defaults.temperature,
      advanced: defaults,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...record,
    providerId: record.providerId ?? "openai",
    apiKey: record.apiKey ?? null,
    baseUrl: record.baseUrl ?? defaults.baseUrl,
    model: record.model ?? defaults.model,
    contextSize: record.contextSize ?? defaults.contextSize,
    temperature: record.temperature ?? defaults.temperature,
    advanced: sanitizeAdvancedConfig(record.advanced ?? {}),
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  };
}

export function saveAiConfig(input: SaveAiConfigInput): PublicAiConfig {
  const current = readConfig();
  const defaults = AI_CONFIG_DEFAULTS;

  const safeAdvancedInput = input.advancedConfig ? sanitizeAdvancedConfig(input.advancedConfig) : undefined;
  const currentSafeAdvanced = sanitizeAdvancedConfig(current?.advanced ?? {});

  const advanced: AiAdvancedConfig = { ...defaults };
  const advancedKeys: Array<keyof AiAdvancedConfig> = [
    "baseUrl",
    "model",
    "temperature",
    "topP",
    "maxTokens",
    "contextSize",
    "headers",
    "extraBody",
  ];

  for (const key of advancedKeys) {
    const incomingValue = safeAdvancedInput?.[key];
    const currentValue = currentSafeAdvanced[key];

    if (incomingValue !== undefined) {
      advanced[key] = incomingValue as never;
    } else if (currentValue !== undefined && currentValue !== defaults[key]) {
      advanced[key] = currentValue as never;
    }
  }

  const providerChanged = Boolean(input.providerId) && input.providerId !== current?.providerId;
  const apiKey = Object.prototype.hasOwnProperty.call(input, "apiKey")
    ? (input.apiKey ?? null)
    : providerChanged
      ? null
      : (current?.apiKey ?? null);

  const nextRecord: AiConfigRecord = {
    providerId: input.providerId ?? current?.providerId ?? "openai",
    apiKey,
    baseUrl: input.baseUrl ?? current?.baseUrl ?? advanced.baseUrl,
    model: input.model ?? current?.model ?? advanced.model,
    contextSize: input.contextSize ?? current?.contextSize ?? advanced.contextSize,
    temperature: input.temperature ?? current?.temperature ?? advanced.temperature,
    advanced,
    updatedAt: new Date().toISOString(),
  };

  writeConfig(nextRecord);

  return {
    providerId: nextRecord.providerId,
    hasApiKey: Boolean(nextRecord.apiKey),
    baseUrl: nextRecord.baseUrl,
    model: nextRecord.model,
    contextSize: nextRecord.contextSize,
    temperature: nextRecord.temperature,
    advancedConfig: advanced,
  };
}
