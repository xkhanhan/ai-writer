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
  /** Single content mode: render children in a full-width panel */
  children: ReactNode;
  /** Split mode: left panel content */
  left?: ReactNode;
  /** Split mode: right panel content */
  right?: ReactNode;
  /** Split mode: right panel header */
  rightHeader?: ReactNode;
  /** Left panel title */
  leftTitle?: string;
  /** Left panel actions */
  leftActions?: ReactNode;
  /** Left panel default width */
  leftWidth?: number;
  /** Show left panel (split mode only) */
  showLeft?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Optional className for the outermost container */
  className?: string;
}

/**
 * WorkspacePanel provides a consistent layout wrapper for workspace panels.
 *
 * Supports two modes:
 * - **Single content mode** (default): renders `children` in a full-width PanelContainer.
 * - **Split mode**: renders a collapsible left panel + a right panel, separated by a draggable Divider.
 *
 * Panels that already use PanelContainer internally (fact-library, world-rules,
 * tag-library, settings-library) should NOT be wrapped with this component to
 * avoid double-nesting.
 */
export function WorkspacePanel({
  children,
  left,
  right,
  rightHeader,
  leftTitle,
  leftActions,
  leftWidth = 280,
  loading = false,
  className,
}: WorkspacePanelProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // Split mode: left + right panels
  if (left !== undefined && right !== undefined) {
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

  // Single content mode: full-width panel
  return (
    <PanelContainer className={className}>
      <PanelGroup direction="horizontal">
        <Panel id="workspace-content">{loading ? null : children}</Panel>
      </PanelGroup>
    </PanelContainer>
  );
}
