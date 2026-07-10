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

  // Initialize sizes from Panel defaultSize props
  const [sizes, setSizes] = useState<number[]>(() => {
    return childArray.map((child) => {
      if (child.type === Divider) return 4; // divider default size
      const props = child.props as Record<string, unknown>;
      return (props.defaultSize as number) ?? 280;
    });
  });

  const handleResize = useCallback((index: number, newSize: number) => {
    setSizes((prev) => {
      const next = [...prev];
      next[index] = newSize;
      return next;
    });
  }, []);

  // Count total panels (non-Divider children)
  const totalPanels = useMemo(
    () =>
      childArray.filter(
        (c) => isValidElement(c) && c.type !== Divider
      ).length,
    [childArray]
  );

  // Build panel elements with sizes and dividers
  const elements: ReactElement[] = useMemo(() => {
    const result: ReactElement[] = [];
    let panelIndex = 0;

    childArray.forEach((child, i) => {
      if (child.type === Divider) {
        const prevPanelIdx = panelIndex - 1;
        const prevPanel = childArray
          .filter((c) => c !== child && isValidElement(c) && c.type !== Divider)
          [prevPanelIdx];
        const prevProps = prevPanel?.props as Record<string, unknown> | undefined;
        const minSize = (prevProps?.minSize as number) ?? 100;
        const maxSize = (prevProps?.maxSize as number) ?? 800;

        result.push(
          <Divider
            key={`divider-${i}`}
            direction={direction}
            size={sizes[prevPanelIdx] ?? 280}
            minSize={minSize}
            maxSize={maxSize}
            onResize={(newSize) => handleResize(prevPanelIdx, newSize)}
          />
        );
      } else {
        const idx = panelIndex;
        const panelSize = sizes[idx] ?? 280;
        const isHorizontal = direction === "horizontal";
        const isLastPanel = panelIndex === totalPanels - 1;

        // Last panel in horizontal mode uses flex:1 to fill remaining space
        const style = isHorizontal
          ? isLastPanel
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
  }, [childArray, direction, sizes, totalPanels, handleResize]);

  return (
    <div className={`${styles.panelGroup} ${styles[direction]}`}>
      {elements}
    </div>
  );
});
