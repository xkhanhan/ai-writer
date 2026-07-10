import type { WorldRuleCategory } from "@/app/types";

export const CATEGORY_META: Record<
  WorldRuleCategory,
  { label: string; limit: number | null; tagColor: string }
> = {
  global: { label: "全局规则", limit: 20, tagColor: "green" },
  writing: { label: "写作规则", limit: 20, tagColor: "blue" },
  setting: { label: "设定规则", limit: null, tagColor: "orange" },
};

export const SETTING_TYPE_LABELS: Record<string, string> = {
  text: "文本",
  select: "下拉选项",
  number: "数字范围",
};

export const SETTING_TYPE_COLORS: Record<string, string> = {
  text: "green",
  select: "blue",
  number: "orange",
};
