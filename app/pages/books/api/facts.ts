import { client } from "@/app/api-client";
import type { Result } from "@/app/api-client";
import type {
  StoryFact,
  CreateStoryFactDTO,
  UpdateStoryFactDTO,
} from "@/app/types";

export async function fetchFacts(
  bookId: string
): Promise<Result<StoryFact[]>> {
  const res = await client.get<{ facts: StoryFact[] }>(
    `/api/books/${bookId}/facts`
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.facts ?? [] };
}

export async function createFact(
  bookId: string,
  data: CreateStoryFactDTO
): Promise<Result<StoryFact>> {
  const res = await client.post<{ fact: StoryFact }>(
    `/api/books/${bookId}/facts`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.fact };
}

export async function updateFact(
  bookId: string,
  factId: string,
  data: UpdateStoryFactDTO
): Promise<Result<StoryFact>> {
  const res = await client.patch<{ fact: StoryFact }, typeof data>(
    `/api/books/${bookId}/facts/${factId}`,
    data
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.fact };
}

export async function deleteFact(
  bookId: string,
  factId: string
): Promise<Result<void>> {
  return client.delete(`/api/books/${bookId}/facts/${factId}`);
}
