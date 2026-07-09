// Re-export all full-stack types from shared/types (canonical source of truth)
export type {
  // Book
  Book,
  BookOptions,
  CreateBookDTO,
  UpdateBookDTO,
  // Folder / File
  Folder,
  BookFile,
  CreateFolderDTO,
  CreateFileDTO,
  UpdateFileDTO,
  // AI Config
  AiConfig,
  SaveAiConfigDTO,
  // 创作区
  BookOutline,
  KeyPoint,
  VolumeOutline,
  ChapterOutline,
  CreateVolumeDTO,
  UpdateVolumeDTO,
  CreateChapterDTO,
  UpdateChapterDTO,
  ArchivedChapter,
  ChapterStatus,
  // 伏笔
  ForeshadowStatus,
  Foreshadow,
  // 事实一致性库
  StoryFact,
  CreateStoryFactDTO,
  UpdateStoryFactDTO,
  // 标签分类
  TagCategory,
  CreateTagCategoryDTO,
  UpdateTagCategoryDTO,
  // 世界规则
  WorldRuleCategory,
  SettingRuleValueType,
  WorldRule,
  CreateWorldRuleDTO,
  UpdateWorldRuleDTO,
  // 设定库
  SettingCategory,
  SettingLevel,
  SettingEntity,
  CreateSettingEntityDTO,
  UpdateSettingEntityDTO,
} from "@/shared/types";

// Re-export the GenreTreeNode that now lives in shared (used by BookOptions)
export type { GenreTreeNode } from "@/shared/types";

// ============ UI-only types (not used server-side) ============

export type ActivePanel = "info" | "world-rules" | "settings" | "tag-library" | "creation" | "foreshadow" | "archive" | "fact-library";

// 各分类的状态字段模板
export const STATUS_FIELD_TEMPLATES: Record<import("@/shared/types").SettingCategory, string[]> = {
  character: ["性别", "年龄", "修炼境界", "所属势力", "当前状态"],
  location: ["地点类型", "所属势力", "当前状态"],
  faction: ["组织类型", "势力规模", "当前状态"],
  item: ["品阶", "当前持有者", "当前状态"],
  other: [],
};

// 分类专属字段模板
export const CATEGORY_FIELD_TEMPLATES: Record<import("@/shared/types").SettingCategory, string[]> = {
  character: ["性格"],
  location: [],
  faction: [],
  item: [],
  other: [],
};
