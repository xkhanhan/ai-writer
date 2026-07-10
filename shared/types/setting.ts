// Setting entity domain types

export type SettingCategory = "character" | "item" | "location" | "faction" | "other";

export type SettingLevel = "core" | "important" | "general";

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
