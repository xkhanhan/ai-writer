export interface GenreTreeNode {
  value: string;
  label: string;
  children?: GenreTreeNode[];
}

export interface Book {
  id: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  subGenre: string;
  tags: string;
  writingStyle: string;
  narrativePov: string;
  targetAudience: string;
  targetWordCount: number;
  targetTotalWords: number;
  endingType: string;
  referenceWorks: string;
  sellingPoint: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookOptions {
  genres: string[];
  platforms: string[];
  genreTree: GenreTreeNode[];
  writingStyles: string[];
  narrativePovs: string[];
  targetAudiences: string[];
  endingTypes: string[];
}

export interface CreateBookDTO {
  title: string;
  description?: string;
  genre: string;
  platform: string;
}

export interface UpdateBookDTO {
  title?: string;
  description?: string;
  genre?: string;
  platform?: string;
  subGenre?: string;
  tags?: string;
  writingStyle?: string;
  narrativePov?: string;
  targetAudience?: string;
  targetWordCount?: number;
  targetTotalWords?: number;
  endingType?: string;
  referenceWorks?: string;
  sellingPoint?: string;
}

export interface Folder {
  id: string;
  bookId: string;
  category: string;
  name: string;
  files: BookFile[];
  createdAt: string;
  updatedAt: string;
}

export interface BookFile {
  id: string;
  folderId: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderDTO {
  bookId: string;
  category: string;
  name: string;
}

export interface CreateFileDTO {
  folderId: string;
  name: string;
}

export interface UpdateFileDTO {
  name?: string;
  content?: string;
}

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

export type ActivePanel = "info" | "world-rules" | "settings" | "tag-library" | "creation" | "foreshadow" | "archive";

// 创作区数据类型
export interface BookOutline {
  bookId: string;
  direction: string;
  stages: string;
  sellingPoints: string;
  updatedAt: string;
}

export interface KeyPoint {
  chapter: string;
  description: string;
}

export interface VolumeOutline {
  id: string;
  bookId: string;
  title: string;
  coreConflict: string;
  stages: string[];
  developmentArc: string;
  keyPoints: KeyPoint[];
  highlights: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterOutline {
  id: string;
  volumeId: string;
  title: string;
  summary: string;
  prevChapterLink: string;
  nextChapterSuspense: string;
  scenes: string[];
  time: string;
  moodTone: string;
  characters: string[];
  keyEvents: string[];
  foreshadowings: string[];
  highlights: string;
  expectedWords: number;
  note: string;
  content: string;
  sortOrder: number;
  status: "planned" | "writing" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedChapter {
  id: string;
  bookId: string;
  chapterId: string;
  sortOrder: number;
  title: string;
  content: string;
  wordCount: number;
  archivedAt: string;
}

// 章纲状态 — 系统维护，不可用户编辑
export type ChapterStatus = "draft" | "generated" | "approved";

// 伏笔状态
export type ForeshadowStatus = "hidden" | "revealed";

// 伏笔
export interface Foreshadow {
  id: string;
  bookId: string;
  name: string;
  description: string;
  status: ForeshadowStatus;
  chapterId?: string;
  chapterNumber?: number;
  volumeId?: string;
  createdAt: string;
  updatedAt: string;
}

// 标签分类（支持无限层级）
export interface TagCategory {
  id: string;
  bookId: string;
  name: string;
  parentId?: string;
  description?: string;
  children?: TagCategory[];
}

// 世界规则
export type WorldRuleCategory = "global" | "writing" | "setting";
export type SettingRuleValueType = "text" | "select" | "number";

export interface WorldRule {
  id: string;
  bookId: string;
  category: WorldRuleCategory;
  name: string;
  content: string;
  isFixed: boolean;
  settingType: SettingRuleValueType | "";
  selectOptions: string[];
  numberMin: number;
  numberMax: number;
  numberUnit: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorldRuleDTO {
  category: WorldRuleCategory;
  name: string;
  content?: string;
  isFixed?: boolean;
  settingType?: SettingRuleValueType | "";
  selectOptions?: string[];
  numberMin?: number;
  numberMax?: number;
  numberUnit?: string;
}

export interface UpdateWorldRuleDTO {
  name?: string;
  content?: string;
  isFixed?: boolean;
  settingType?: SettingRuleValueType | "";
  selectOptions?: string[];
  numberMin?: number;
  numberMax?: number;
  numberUnit?: string;
  sortOrder?: number;
}

// 设定库分类
export type SettingCategory = "character" | "item" | "location" | "faction" | "other";

export type SettingLevel = "core" | "important" | "general";

// 设定库实体
export interface SettingEntity {
  id: string;
  bookId: string;
  category: SettingCategory;
  name: string;
  level: SettingLevel;
  description: string;
  appearance: string;
  traits: string;
  background: string;
  abilities: string;
  weaknesses: string;
  tagIds: string[];
  categoryFields: Record<string, string>;
  statusFields: Record<string, string>;
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettingEntityDTO {
  category: SettingCategory;
  name: string;
  level?: SettingLevel;
  description?: string;
  appearance?: string;
  traits?: string;
  background?: string;
  abilities?: string;
  weaknesses?: string;
  tagIds?: string[];
  categoryFields?: Record<string, string>;
  statusFields?: Record<string, string>;
}

export interface UpdateSettingEntityDTO {
  name?: string;
  level?: SettingLevel;
  description?: string;
  appearance?: string;
  traits?: string;
  background?: string;
  abilities?: string;
  weaknesses?: string;
  tagIds?: string[];
  categoryFields?: Record<string, string>;
  statusFields?: Record<string, string>;
  deprecated?: boolean;
}

// 各分类的状态字段模板
export const STATUS_FIELD_TEMPLATES: Record<SettingCategory, string[]> = {
  character: ["性别", "年龄", "修炼境界", "所属势力", "当前状态"],
  location: ["地点类型", "所属势力", "当前状态"],
  faction: ["组织类型", "势力规模", "当前状态"],
  item: ["品阶", "当前持有者", "当前状态"],
  other: [],
};

// 分类专属字段模板
export const CATEGORY_FIELD_TEMPLATES: Record<SettingCategory, string[]> = {
  character: ["性格"],
  location: [],
  faction: [],
  item: [],
  other: [],
};
