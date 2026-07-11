import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type { PromptVariable } from "@/app/types";

export interface PreviewResult {
  resolved: string;
  variables: PromptVariable[];
  stats: {
    books: number;
    chapters: number;
    characters: number;
    worldRules: number;
    facts: number;
    foreshadows: number;
  };
}

/**
 * Call the backend preview API to resolve all variables in a template.
 */
export async function resolvePreview(
  template: string,
  bookId: string,
  functionKey: string,
): Promise<Result<PreviewResult>> {
  const res = await client.post<PreviewResult>("/api/ai/preview", {
    template,
    bookId,
    functionKey,
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data };
}
