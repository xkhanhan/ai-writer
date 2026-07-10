import { promises as fs } from "node:fs";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiConfigStatus = "idle" | "connected" | "error";

export type AiConfigRecord = {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  apiFormat: string;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  contextSize: number;
  temperature: number;
  advanced?: AiAdvancedConfig;
  status?: AiConfigStatus;
  updatedAt: string;
};

/** Shape of the old single-config file before F-008 migration. */
type LegacyAiConfigRecord = {
  providerId?: string;
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
  contextSize?: number;
  temperature?: number;
  advanced?: AiAdvancedConfig;
  updatedAt?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `cfg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Read the raw file and return an array of configs.
 * If the file contains a single object (old format), migrate it in-place.
 */
async function readConfigs(): Promise<AiConfigRecord[]> {
  await ensureDataDir();
  let raw: string;
  try {
    raw = await fs.readFile(CONFIG_FILE, "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  // Already an array — return as-is
  if (Array.isArray(parsed)) {
    return parsed as AiConfigRecord[];
  }

  // Single object (legacy format) — migrate to array
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const legacy = parsed as LegacyAiConfigRecord;
    const migrated: AiConfigRecord = {
      id: generateId(),
      name: "默认配置",
      provider: legacy.providerId ?? "openai",
      providerName: legacy.providerId ?? "OpenAI",
      apiFormat: "openai",
      baseUrl: legacy.baseUrl ?? AI_CONFIG_DEFAULTS.baseUrl,
      apiKey: legacy.apiKey ?? null,
      model: legacy.model ?? AI_CONFIG_DEFAULTS.model,
      contextSize: legacy.contextSize ?? AI_CONFIG_DEFAULTS.contextSize,
      temperature: legacy.temperature ?? AI_CONFIG_DEFAULTS.temperature,
      advanced: legacy.advanced,
      status: "idle",
      updatedAt: legacy.updatedAt ?? new Date().toISOString(),
    };

    // Write migrated format back to disk
    await writeConfigs([migrated]);
    return [migrated];
  }

  return [];
}

async function writeConfigs(configs: AiConfigRecord[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(configs, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// CRUD — multi-config
// ---------------------------------------------------------------------------

export async function getAiConfigs(): Promise<AiConfigRecord[]> {
  return readConfigs();
}

export async function getAiConfig(id: string): Promise<AiConfigRecord | null> {
  const configs = await readConfigs();
  return configs.find((c) => c.id === id) ?? null;
}

export async function createAiConfig(
  data: Omit<AiConfigRecord, "id" | "updatedAt">
): Promise<AiConfigRecord> {
  const configs = await readConfigs();
  const record: AiConfigRecord = {
    ...data,
    id: generateId(),
    updatedAt: new Date().toISOString(),
  };
  configs.push(record);
  await writeConfigs(configs);
  return record;
}

export async function updateAiConfig(
  id: string,
  data: Partial<Omit<AiConfigRecord, "id" | "updatedAt">>
): Promise<AiConfigRecord | null> {
  const configs = await readConfigs();
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  configs[idx] = {
    ...configs[idx],
    ...data,
    id, // never allow id override
    updatedAt: new Date().toISOString(),
  };
  await writeConfigs(configs);
  return configs[idx];
}

export async function deleteAiConfig(id: string): Promise<boolean> {
  const configs = await readConfigs();
  const next = configs.filter((c) => c.id !== id);
  if (next.length === configs.length) return false;
  await writeConfigs(next);
  return true;
}

// ---------------------------------------------------------------------------
// Legacy single-config API (kept for backward compat with AI generation)
// ---------------------------------------------------------------------------

/**
 * Return the "active" config as a public (safe) representation.
 * Uses the first config in the list as the active config.
 */
export async function loadPublicAiConfig(): Promise<PublicAiConfig> {
  const configs = await readConfigs();
  const record = configs[0] ?? null;
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
    providerId: record.provider ?? "openai",
    hasApiKey: Boolean(record.apiKey),
    baseUrl: record.baseUrl ?? safeAdvanced.baseUrl,
    model: record.model ?? safeAdvanced.model,
    contextSize: record.contextSize ?? safeAdvanced.contextSize,
    temperature: record.temperature ?? safeAdvanced.temperature,
    advancedConfig: safeAdvanced,
  };
}

/**
 * Return the "active" config with full internal fields (including apiKey).
 * Used by AI generation endpoints.
 */
export async function loadInternalConfig(): Promise<AiConfigRecord> {
  const configs = await readConfigs();
  const record = configs[0] ?? null;
  const defaults = AI_CONFIG_DEFAULTS;

  if (!record) {
    return {
      id: generateId(),
      name: "默认配置",
      provider: "openai",
      providerName: "OpenAI",
      apiFormat: "openai",
      baseUrl: defaults.baseUrl,
      apiKey: null,
      model: defaults.model,
      contextSize: defaults.contextSize,
      temperature: defaults.temperature,
      advanced: defaults,
      status: "idle",
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...record,
    provider: record.provider ?? "openai",
    apiKey: record.apiKey ?? null,
    baseUrl: record.baseUrl ?? defaults.baseUrl,
    model: record.model ?? defaults.model,
    contextSize: record.contextSize ?? defaults.contextSize,
    temperature: record.temperature ?? defaults.temperature,
    advanced: sanitizeAdvancedConfig(record.advanced ?? {}),
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * Save / update the first (active) config.
 * Kept for backward compat with existing save flow.
 */
export async function saveAiConfig(input: SaveAiConfigInput): Promise<PublicAiConfig> {
  const configs = await readConfigs();
  const current = configs[0] ?? null;
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

  const providerChanged = Boolean(input.providerId) && input.providerId !== current?.provider;
  const apiKey = Object.prototype.hasOwnProperty.call(input, "apiKey")
    ? (input.apiKey ?? null)
    : providerChanged
      ? null
      : (current?.apiKey ?? null);

  const nextRecord: AiConfigRecord = {
    id: current?.id ?? generateId(),
    name: current?.name ?? "默认配置",
    provider: input.providerId ?? current?.provider ?? "openai",
    providerName: current?.providerName ?? "OpenAI",
    apiFormat: current?.apiFormat ?? "openai",
    apiKey,
    baseUrl: input.baseUrl ?? current?.baseUrl ?? advanced.baseUrl,
    model: input.model ?? current?.model ?? advanced.model,
    contextSize: input.contextSize ?? current?.contextSize ?? advanced.contextSize,
    temperature: input.temperature ?? current?.temperature ?? advanced.temperature,
    advanced,
    updatedAt: new Date().toISOString(),
  };

  if (current) {
    configs[0] = nextRecord;
  } else {
    configs.push(nextRecord);
  }

  await writeConfigs(configs);

  return {
    providerId: nextRecord.provider,
    hasApiKey: Boolean(nextRecord.apiKey),
    baseUrl: nextRecord.baseUrl,
    model: nextRecord.model,
    contextSize: nextRecord.contextSize,
    temperature: nextRecord.temperature,
    advancedConfig: advanced,
  };
}
