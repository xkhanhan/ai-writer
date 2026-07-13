"use client";

import {
  memo,
  useMemo,
  useState,
  useCallback,
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { Divider } from "./divider";
import type { Direction } from "./types";
import styles from "./index.module.css";

interface PanelGroupProps {
  direction: Direction;
  children: ReactNode;
}

export const PanelGroup = memo(function PanelGroup({
  direction,
  children,
}: PanelGroupProps) {
  const childArray = useMemo(
    () => Children.toArray(children).filter(isValidElement),
    [children]
  );

  // Extract only panel children (non-Divider)
  const panels = useMemo(
    () => childArray.filter((c) => isValidElement(c) && c.type !== Divider),
    [childArray]
  );

  // Initialize panel sizes from defaultSize props (panel-only indices)
  const [panelSizes, setPanelSizes] = useState<number[]>(() =>
    panels.map((p) => ((p.props as Record<string, unknown>).defaultSize as number) ?? 280)
  );

  const handlePanelResize = useCallback((panelIdx: number, newSize: number) => {
    setPanelSizes((prev) => {
      const next = [...prev];
      next[panelIdx] = newSize;
      return next;
    });
  }, []);

  // Check if any panel has explicit flexible prop
  const hasFlexiblePanel = useMemo(
    () =>
      panels.some(
        (p) => (p.props as Record<string, unknown>).flexible === true
      ),
    [panels]
  );

  const totalPanels = panels.length;

  // Build panel elements with sizes and dividers
  const elements: ReactElement[] = useMemo(() => {
    const result: ReactElement[] = [];
    let panelIndex = 0;

    childArray.forEach((child, i) => {
      if (child.type === Divider) {
        const prevPanelIdx = panelIndex - 1;
        const prevPanel = panels[prevPanelIdx];
        const prevProps = prevPanel?.props as Record<string, unknown> | undefined;
        const minSize = (prevProps?.minSize as number) ?? 100;
        const maxSize = (prevProps?.maxSize as number) ?? 800;

        result.push(
          <Divider
            key={`divider-${i}`}
            direction={direction}
            size={panelSizes[prevPanelIdx] ?? 280}
            minSize={minSize}
            maxSize={maxSize}
            onResize={(newSize) => handlePanelResize(prevPanelIdx, newSize)}
          />
        );
      } else {
        const idx = panelIndex;
        const panelSize = panelSizes[idx] ?? 280;
        const isHorizontal = direction === "horizontal";
        const isLastPanel = panelIndex === totalPanels - 1;
        const isFlexible =
          ((child.props as Record<string, unknown>).flexible as boolean) ??
          false;

        // When explicit flexible panels exist, only those get flex:1;
        // otherwise fall back to last-panel behavior for backward compatibility
        const shouldBeFlexible = hasFlexiblePanel
          ? isFlexible
          : isLastPanel;

        const style = isHorizontal
          ? shouldBeFlexible
            ? { flex: 1, minWidth: 0 }
            : { width: panelSize, minWidth: panelSize, flexShrink: 0 }
          : { height: panelSize, minHeight: panelSize };

        result.push(
          <div key={`panel-${idx}`} className={styles.panelWrapper} style={style}>
            {cloneElement(child as ReactElement<Record<string, unknown>>)}
          </div>
        );
        panelIndex++;
      }
    });

    return result;
  }, [childArray, panels, direction, panelSizes, totalPanels, handlePanelResize, hasFlexiblePanel]);

  return (
    <div className={`${styles.panelGroup} ${styles[direction]}`}>
      {elements}
    </div>
  );
});
