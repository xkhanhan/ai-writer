"use client";

import type { Direction } from "./types";
import { usePanelResize } from "./use-panel-resize";
import styles from "./index.module.css";

interface DividerProps {
  direction: Direction;
  size: number;
  minSize: number;
  maxSize: number;
  onResize: (newSize: number) => void;
  onDoubleClick?: () => void;
}

export function Divider({
  direction,
  size,
  minSize,
  maxSize,
  onResize,
  onDoubleClick,
}: DividerProps) {
  const { isDragging, handleDragStart, handleDoubleClick } = usePanelResize({
    direction,
    size,
    minSize,
    maxSize,
    onResize,
  });

  return (
    <div
      className={`${styles.divider} ${styles[direction]} ${isDragging ? styles.dragging : ""}`}
      onPointerDown={handleDragStart}
      onDoubleClick={onDoubleClick}
    />
  );
}
