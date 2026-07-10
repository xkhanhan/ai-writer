"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";

interface WorkspacePanelProps {
  /** Layout mode */
  mode?: "split" | "content" | "panel";

  // ---- Split mode ----
  /** Left panel content */
  left?: ReactNode;
  /** Right panel content */
  right?: ReactNode;
  /** Right panel header */
  rightHeader?: ReactNode;
  /** Left panel title */
  leftTitle?: string;
  /** Left panel actions */
  leftActions?: ReactNode;
  /** Left panel default width */
  leftWidth?: number;

  // ---- Content/Panel mode ----
  /** Children content (content mode: full-width; panel mode: inside Panel) */
  children?: ReactNode;

  // ---- Common ----
  /** Loading state */
  loading?: boolean;
  /** Panel title (panel mode only) */
  title?: string;
  /** Panel actions (panel mode only) */
  actions?: ReactNode;
  /** Panel is collapsible (panel mode only) */
  collapsible?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * WorkspacePanel — unified layout wrapper for all workspace panels.
 *
 * Three modes:
 * - **split**: Left list + right detail with draggable divider (fact-library, world-rules, etc.)
 * - **content**: Full-width container with no Panel chrome (book-info, creation-zone, etc.)
 * - **panel**: Single Panel with header/body (when you want Panel UI but no split)
 */
export function WorkspacePanel({
  mode = "content",
  left,
  right,
  rightHeader,
  leftTitle,
  leftActions,
  leftWidth = 280,
  children,
  loading = false,
  title,
  actions,
  collapsible = false,
  className,
}: WorkspacePanelProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // Split mode: left + right panels
  if (mode === "split" && left !== undefined && right !== undefined) {
    return (
      <PanelContainer className={className}>
        <PanelGroup direction="horizontal">
          <Panel
            id="workspace-left"
            title={leftTitle}
            actions={leftActions}
            collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed((prev) => !prev)}
            defaultSize={leftWidth}
            minSize={200}
            maxSize={500}
          >
            {loading ? null : left}
          </Panel>
          <Divider />
          <Panel id="workspace-right" title={rightHeader}>
            {loading ? null : right}
          </Panel>
        </PanelGroup>
      </PanelContainer>
    );
  }

  // Panel mode: single Panel with header
  if (mode === "panel") {
    return (
      <PanelContainer className={className}>
        <PanelGroup direction="horizontal">
          <Panel
            id="workspace-panel"
            title={title}
            actions={actions}
            collapsible={collapsible}
          >
            {loading ? null : children}
          </Panel>
        </PanelGroup>
      </PanelContainer>
    );
  }

  // Content mode: plain container, no Panel chrome
  return (
    <div
      className={`workspace-panel-content ${className ?? ""}`}
      style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {loading ? null : children}
    </div>
  );
}
