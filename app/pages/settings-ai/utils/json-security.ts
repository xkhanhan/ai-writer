const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

const ALLOWED_CONFIG_KEYS = [
  "baseUrl",
  "model",
  "temperature",
  "topP",
  "maxTokens",
  "contextSize",
  "headers",
  "extraBody",
];

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return sanitizeJsonConfig(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeJsonConfig(json: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(json)) {
    if (DANGEROUS_KEYS.includes(key)) {
      continue;
    }

    if (ALLOWED_CONFIG_KEYS.includes(key)) {
      sanitized[key] = sanitizeValue(json[key]);
    }
  }

  return sanitized;
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return "••••••••";
  return apiKey.substring(0, 4) + "••••••••" + apiKey.substring(apiKey.length - 4);
}

export function validateJsonString(json: string): { valid: boolean; error?: string; data?: Record<string, unknown> } {
  if (!json.trim()) {
    return { valid: true, data: {} };
  }

  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: "JSON 必须是一个对象" };
    }

    const sanitized = sanitizeJsonConfig(parsed);
    return { valid: true, data: sanitized };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "JSON 格式错误",
    };
  }
}
