export interface PanelState {
  size: number;
  collapsed: boolean;
}

export interface PanelLayout {
  panels: Record<string, PanelState>;
}

export type Direction = "horizontal" | "vertical";
