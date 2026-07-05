/**
 * 主题预设定义
 * 每个主题定义所有 CSS 变量对应的颜色值
 */

export interface ThemeColors {
  /* 背景层级 */
  bgPage: string;
  bgElevated: string;
  bgMuted: string;
  bgStrong: string;

  /* 文字层级 */
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textLight: string;

  /* 边框 */
  border: string;
  borderStrong: string;
  borderLight: string;

  /* 主色 */
  primary: string;
  primaryHover: string;

  /* 阴影 */
  shadow: string;
  shadowMd: string;

  /* 滚动条 */
  scrollbarThumb: string;
  scrollbarThumbHover: string;
}

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  colors: ThemeColors;
}

export const themes: ThemePreset[] = [
  {
    id: "warm-paper",
    label: "暖纸色",
    description: "温暖的纸张底色，护眼柔和",
    colors: {
      bgPage: "#f0ece4",
      bgElevated: "#faf8f4",
      bgMuted: "#f5f2ec",
      bgStrong: "#e8e4dc",
      textPrimary: "#1a1814",
      textSecondary: "#4a4640",
      textTertiary: "#807b74",
      textLight: "#b5b0a8",
      border: "#ddd8d0",
      borderStrong: "#c0bbb3",
      borderLight: "#ebe7e0",
      primary: "#2F5D50",
      primaryHover: "#1e4438",
      shadow: "0 1px 3px rgba(26, 24, 20, 0.06)",
      shadowMd: "0 4px 12px rgba(26, 24, 20, 0.10)",
      scrollbarThumb: "#c8c0b4",
      scrollbarThumbHover: "#a8a098",
    },
  },
  {
    id: "cool-gray",
    label: "冷灰调",
    description: "中性冷灰色系，简洁现代",
    colors: {
      bgPage: "#f0f1f3",
      bgElevated: "#f8f7f4",
      bgMuted: "#f2f1ed",
      bgStrong: "#e8e7e3",
      textPrimary: "#1a1b1e",
      textSecondary: "#43464d",
      textTertiary: "#72757e",
      textLight: "#b0b3bb",
      border: "#e0e1e5",
      borderStrong: "#c4c5ca",
      borderLight: "#ececee",
      primary: "#2F5D50",
      primaryHover: "#1e4438",
      shadow: "0 1px 3px rgba(26, 27, 30, 0.07)",
      shadowMd: "0 4px 12px rgba(26, 27, 30, 0.11)",
      scrollbarThumb: "#c5c6cb",
      scrollbarThumbHover: "#a5a6ab",
    },
  },
  {
    id: "clean-white",
    label: "纯白",
    description: "干净明亮，高对比度",
    colors: {
      bgPage: "#f5f6f8",
      bgElevated: "#ffffff",
      bgMuted: "#f8f9fa",
      bgStrong: "#edf0f2",
      textPrimary: "#181c22",
      textSecondary: "#414753",
      textTertiary: "#717785",
      textLight: "#c1c6d5",
      border: "#e2e4e8",
      borderStrong: "#c1c6d5",
      borderLight: "#eef0f3",
      primary: "#2F5D50",
      primaryHover: "#1e4438",
      shadow: "0 1px 3px rgba(24, 28, 34, 0.08)",
      shadowMd: "0 4px 12px rgba(24, 28, 34, 0.12)",
      scrollbarThumb: "#c8cdd5",
      scrollbarThumbHover: "#a8adb5",
    },
  },
  {
    id: "dark",
    label: "深色",
    description: "暗色主题，夜间护眼",
    colors: {
      bgPage: "#1a1b1e",
      bgElevated: "#242528",
      bgMuted: "#2a2b2e",
      bgStrong: "#353638",
      textPrimary: "#e4e5e7",
      textSecondary: "#a8aab0",
      textTertiary: "#6e7078",
      textLight: "#4a4c52",
      border: "#3a3b3e",
      borderStrong: "#4a4b4e",
      borderLight: "#2e2f32",
      primary: "#4a9e85",
      primaryHover: "#5cb89e",
      shadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      shadowMd: "0 4px 12px rgba(0, 0, 0, 0.4)",
      scrollbarThumb: "#4a4b4e",
      scrollbarThumbHover: "#5a5b5e",
    },
  },
];

export function getThemeById(id: string): ThemePreset {
  return themes.find((t) => t.id === id) ?? themes[0];
}
