"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Direction } from "./types";

interface UsePanelResizeOptions {
  direction: Direction;
  size: number;
  minSize: number;
  maxSize: number;
  onResize: (newSize: number) => void;
}

export function usePanelResize({
  direction,
  size,
  minSize,
  maxSize,
  onResize,
}: UsePanelResizeOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startSize = size;

      const handleDragMove = (ev: PointerEvent) => {
        const currentPos = direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = currentPos - startPos;
        const newSize = Math.min(maxSize, Math.max(minSize, startSize + delta));
        onResize(newSize);
      };

      const cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.cursor = cursor;
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", handleDragMove);
      document.addEventListener("pointerup", handleDragEnd);

      cleanupRef.current = () => {
        document.removeEventListener("pointermove", handleDragMove);
        document.removeEventListener("pointerup", handleDragEnd);
      };
    },
    [direction, size, minSize, maxSize, onResize, handleDragEnd]
  );

  const handleDoubleClick = useCallback(() => {
    onResize(size);
  }, [size, onResize]);

  return { isDragging, handleDragStart, handleDoubleClick };
}
