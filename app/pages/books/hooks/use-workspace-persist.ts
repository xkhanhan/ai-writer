"use client";

import { useCallback, useState } from "react";
import type { ActivePanel } from "@/app/types";
import { workspacePanels } from "../config/workspace-panels";

const STORAGE_PREFIX = "nw-ws-";
const VALID_PANELS = new Set(workspacePanels.map((p) => p.key));

interface WorkspaceState {
  activePanel: ActivePanel;
  panelSelections: Record<string, string>;
}

function storageKey(bookId: string) {
  return `${STORAGE_PREFIX}${bookId}`;
}

function load(bookId: string): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(storageKey(bookId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    const panel = parsed.activePanel ?? "info";
    return {
      activePanel: VALID_PANELS.has(panel as ActivePanel) ? (panel as ActivePanel) : "info",
      panelSelections: parsed.panelSelections ?? {},
    };
  } catch {
    return null;
  }
}

function save(bookId: string, state: WorkspaceState) {
  try {
    localStorage.setItem(storageKey(bookId), JSON.stringify(state));
  } catch {
    // ignore quota exceeded
  }
}

export function useWorkspacePersist(bookId: string) {
  const [activePanel, setActivePanelState] = useState<ActivePanel>(() => {
    return load(bookId)?.activePanel ?? "info";
  });

  const [panelSelections, setPanelSelections] = useState<Record<string, string>>(
    () => load(bookId)?.panelSelections ?? {}
  );

  const setActivePanel = useCallback(
    (panel: ActivePanel) => {
      setActivePanelState(panel);
      setPanelSelections((prev) => {
        save(bookId, { activePanel: panel, panelSelections: prev });
        return prev;
      });
    },
    [bookId]
  );

  const setPanelSelection = useCallback(
    (panelKey: string, id: string) => {
      setPanelSelections((prev) => {
        const next = { ...prev, [panelKey]: id };
        save(bookId, { activePanel, panelSelections: next });
        return next;
      });
    },
    [bookId, activePanel]
  );

  return {
    activePanel,
    setActivePanel,
    panelSelections,
    setPanelSelection,
  };
}
