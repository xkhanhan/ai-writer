// 跨层共享的类型定义（app/ 和 server/ 都可以导入）

// ============ 通用 / UI 辅助 ============

export interface GenreTreeNode {
  value: string;
  label: string;
  children?: GenreTreeNode[];
}

// ============ Book ============

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

// ============ Folder / File ============

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

// ============ AI Config ============

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

// ============ 创作区数据类型 ============

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

// 创作区 DTOs

export interface CreateVolumeDTO {
  bookId: string;
  title: string;
  coreConflict?: string;
  stages?: string[];
  developmentArc?: string;
  keyPoints?: KeyPoint[];
  highlights?: string;
}

export interface UpdateVolumeDTO {
  title?: string;
  coreConflict?: string;
  stages?: string[];
  developmentArc?: string;
  keyPoints?: KeyPoint[];
  highlights?: string;
}

export interface CreateChapterDTO {
  volumeId: string;
  title: string;
  summary?: string;
  prevChapterLink?: string;
  nextChapterSuspense?: string;
  scenes?: string[];
  time?: string;
  moodTone?: string;
  characters?: string[];
  keyEvents?: string[];
  foreshadowings?: string[];
  highlights?: string;
  expectedWords?: number;
  note?: string;
}

export interface UpdateChapterDTO {
  title?: string;
  summary?: string;
  prevChapterLink?: string;
  nextChapterSuspense?: string;
  scenes?: string[];
  time?: string;
  moodTone?: string;
  characters?: string[];
  keyEvents?: string[];
  foreshadowings?: string[];
  highlights?: string;
  expectedWords?: number;
  note?: string;
  content?: string;
  status?: "planned" | "writing" | "done";
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

// 事实一致性库
export interface StoryFact {
  id: string;
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  content: string;
  relatedCharacterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoryFactDTO {
  chapterId: string;
  chapterNumber: number;
  content: string;
  relatedCharacterIds?: string[];
}

export interface UpdateStoryFactDTO {
  chapterId?: string;
  chapterNumber?: number;
  content?: string;
  relatedCharacterIds?: string[];
}

// 标签分类（支持无限层级）
export interface TagCategory {
  id: string;
  bookId: string;
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  sortOrder: number;
  children?: TagCategory[];
}

export interface CreateTagCategoryDTO {
  name: string;
  code?: string;
  parentId?: string;
  description?: string;
}

export interface UpdateTagCategoryDTO {
  name?: string;
  code?: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
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

// ============ AI 生成会话 ============

export interface AiGenerationSession {
  id: string;
  bookId: string;
  functionKey: string;
  chapterId: string | null;
  promptTemplateId: string | null;
  inputContext: string;
  userInput: string;
  rawOutput: string;
  adopted: boolean;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  createdAt: string;
}

export interface CreateGenerationSessionDTO {
  bookId: string;
  functionKey: string;
  chapterId?: string;
  promptTemplateId?: string;
  inputContext?: string;
  userInput?: string;
  model?: string;
}

// ============ AI 提示词模板 ============

export interface PromptTemplate {
  id: string;
  bookId: string | null;  // null = system-level template
  functionKey: string;
  displayName: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVariable {
  name: string;
  description: string;
  source: string;
  required: boolean;
}

export interface CreatePromptTemplateDTO {
  bookId?: string | null;  // optional, null for system-level templates
  functionKey: string;
  displayName: string;
  description?: string;
  template: string;
  variables?: PromptVariable[];
}

export interface UpdatePromptTemplateDTO {
  displayName?: string;
  description?: string;
  template?: string;
  variables?: PromptVariable[];
  isActive?: boolean;
}
