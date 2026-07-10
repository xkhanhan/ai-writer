import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type {
  PromptTemplate,
  UpdatePromptTemplateDTO,
} from "@/app/types";

export async function fetchTemplates(
  bookId: string,
): Promise<Result<PromptTemplate[]>> {
  const res = await client.get<{ templates: PromptTemplate[] }>(
    "/api/ai/templates",
    { bookId },
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.templates ?? [] };
}

export async function updateTemplate(
  id: string,
  data: UpdatePromptTemplateDTO,
): Promise<Result<PromptTemplate>> {
  const res = await client.put<{ template: PromptTemplate }>(
    `/api/ai/templates/${id}`,
    data,
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.template };
}

export async function deleteTemplate(
  id: string,
): Promise<Result<void>> {
  return client.delete(`/api/ai/templates/${id}`);
}

export async function copyGlobalToBook(
  bookId: string,
  functionKey: string,
): Promise<Result<PromptTemplate>> {
  const res = await client.post<{ template: PromptTemplate }>(
    "/api/ai/templates",
    { action: "copyGlobalToBook", bookId, functionKey },
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.template };
}

export async function deleteBookOverride(
  bookId: string,
  functionKey: string,
): Promise<Result<{ deleted: boolean }>> {
  return client.post("/api/ai/templates", {
    action: "deleteBookOverride",
    bookId,
    functionKey,
  });
}

export async function copyAsCustom(
  sourceTemplateId: string,
  bookId?: string | null,
): Promise<Result<PromptTemplate>> {
  const res = await client.post<{ template: PromptTemplate }>(
    "/api/ai/templates",
    { action: "copyAsCustom", sourceTemplateId, bookId: bookId ?? null },
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.template };
}

export async function getTemplateScope(
  bookId: string,
  functionKey: string,
): Promise<Result<"global" | "book">> {
  const res = await client.get<{ scope: "global" | "book" }>(
    "/api/ai/templates/scope",
    { bookId, functionKey },
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.scope };
}
