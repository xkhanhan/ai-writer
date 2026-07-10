// World rule domain types

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
