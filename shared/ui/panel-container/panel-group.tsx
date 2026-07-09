"use client";

import {
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

export function PanelGroup({ direction, children }: PanelGroupProps) {
  const childArray = Children.toArray(children).filter(isValidElement);

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

  // Build panel elements with sizes and dividers
  const elements: ReactElement[] = [];
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

      elements.push(
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
      const style = isHorizontal
        ? { width: panelSize, minWidth: panelSize }
        : { height: panelSize, minHeight: panelSize };

      elements.push(
        <div key={`panel-${idx}`} className={styles.panelWrapper} style={style}>
          {cloneElement(child as ReactElement<Record<string, unknown>>)}
        </div>
      );
      panelIndex++;
    }
  });

  return (
    <div className={`${styles.panelGroup} ${styles[direction]}`}>
      {elements}
    </div>
  );
}
