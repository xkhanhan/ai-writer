/**
 * Constants for the Settings Library feature.
 */

import {
  UserOutlined,
  EnvironmentOutlined,
  BankOutlined,
  GiftOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  EyeOutlined,
  StarOutlined,
  ThunderboltOutlined,
  FallOutlined,
} from "@ant-design/icons";
import type {
  SettingCategory,
  SettingLevel,
  SettingEntity,
} from "@/app/types";

export const CAT_META: Record<
  SettingCategory,
  { label: string; icon: React.ReactNode }
> = {
  character: { label: "人物", icon: <UserOutlined /> },
  location: { label: "地点", icon: <EnvironmentOutlined /> },
  faction: { label: "势力", icon: <BankOutlined /> },
  item: { label: "物品", icon: <GiftOutlined /> },
  other: { label: "其他", icon: <AppstoreOutlined /> },
};

export const LEVEL_MAP: Record<
  SettingLevel,
  { label: string; color: string }
> = {
  core: { label: "核心", color: "green" },
  important: { label: "重要", color: "orange" },
  general: { label: "一般", color: "" },
};

export const CAT_ORDER: SettingCategory[] = [
  "character",
  "location",
  "faction",
  "item",
  "other",
];

export const INFO_FIELDS: {
  key: keyof Pick<
    SettingEntity,
    "description" | "appearance" | "traits" | "background" | "abilities" | "weaknesses"
  >;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "description", label: "描述", icon: <BulbOutlined /> },
  { key: "appearance", label: "外观", icon: <EyeOutlined /> },
  { key: "traits", label: "特点", icon: <StarOutlined /> },
  { key: "background", label: "背景", icon: <InfoCircleOutlined /> },
  { key: "abilities", label: "能力", icon: <ThunderboltOutlined /> },
  { key: "weaknesses", label: "弱点", icon: <FallOutlined /> },
];
