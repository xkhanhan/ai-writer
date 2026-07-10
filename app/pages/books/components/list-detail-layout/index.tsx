"use client";

import React from "react";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";

interface ListDetailLayoutProps {
  /** Title shown in the left panel header */
  panelTitle: string;
  /** Content rendered in the left panel */
  leftContent: React.ReactNode;
  /** Content rendered in the right panel */
  rightContent: React.ReactNode;
  /** Title shown in the right panel header */
  rightTitle?: string;
  /** Actions rendered in the right panel header */
  rightActions?: React.ReactNode;
  /** Actions rendered in the left panel header */
  leftActions?: React.ReactNode;
  /** Left panel default size in pixels */
  leftDefaultSize?: number;
  /** Right panel default size in pixels */
  rightDefaultSize?: number;
}

/**
 * Reusable two-panel layout with a resizable left list panel,
 * a divider, and a right detail panel.
 *
 * Used by settings-library, world-rules, and similar list+detail pages.
 */
export function ListDetailLayout({
  panelTitle,
  leftContent,
  rightContent,
  rightTitle,
  rightActions,
  leftActions,
  leftDefaultSize = 280,
  rightDefaultSize = 600,
}: ListDetailLayoutProps) {
  return (
    <PanelContainer>
      <PanelGroup direction="horizontal">
        <Panel
          title={panelTitle}
          defaultSize={leftDefaultSize}
          minSize={200}
          maxSize={500}
          collapsible
          actions={leftActions}
        >
          {leftContent}
        </Panel>

        <Divider />

        <Panel
          title={rightTitle ?? panelTitle}
          defaultSize={rightDefaultSize}
          minSize={400}
          actions={rightActions}
        >
          {rightContent}
        </Panel>
      </PanelGroup>
    </PanelContainer>
  );
}
