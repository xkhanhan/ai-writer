export { client } from "./client";
export type { Result, RequestConfig } from "./client";
export { fetchTagTree } from "@/shared/api/tags";
export {
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getTagRefCount,
} from "./tags";
