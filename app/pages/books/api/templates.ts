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
